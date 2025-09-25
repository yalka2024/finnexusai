
const databaseManager = require('../../config/database');
const logger = require('../../utils/logger');

class PortfolioService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Create a new portfolio
  async createPortfolio(userId, portfolioData) {
    const client = await databaseManager.getClient();

    try {
      await client.query('BEGIN');

      // Create portfolio
      const portfolioResult = await client.query(`
        INSERT INTO portfolios (
          user_id, name, description, initial_balance, current_balance,
          risk_score, sharpe_ratio, max_drawdown
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        userId,
        portfolioData.name,
        portfolioData.description || null,
        portfolioData.initialBalance || 0,
        portfolioData.initialBalance || 0,
        portfolioData.riskScore || null,
        portfolioData.sharpeRatio || null,
        portfolioData.maxDrawdown || null
      ]);

      const portfolio = portfolioResult.rows[0];

      // Create initial holdings if provided
      if (portfolioData.holdings && portfolioData.holdings.length > 0) {
        for (const holding of portfolioData.holdings) {
          await this.addHolding(client, portfolio.id, holding);
        }
      }

      await client.query('COMMIT');

      // Clear cache
      this.clearUserCache(userId);

      logger.info(`Portfolio created: ${portfolio.id} for user ${userId}`);

      return {
        success: true,
        portfolio: this.formatPortfolio(portfolio)
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Portfolio creation failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get user's portfolios
  async getUserPortfolios(userId, includeHoldings = false) {
    const cacheKey = `portfolios_${userId}_${includeHoldings}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const query = `
        SELECT p.*, 
               COUNT(ph.id) as holding_count,
               COALESCE(SUM(ph.current_value), 0) as total_value
        FROM portfolios p
        LEFT JOIN portfolio_holdings ph ON p.id = ph.portfolio_id
        WHERE p.user_id = $1
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `;

      const result = await databaseManager.query(query, [userId]);
      const portfolios = result.rows.map(row => this.formatPortfolio(row));

      // Get holdings if requested
      if (includeHoldings && portfolios.length > 0) {
        for (const portfolio of portfolios) {
          portfolio.holdings = await this.getPortfolioHoldings(portfolio.id);
        }
      }

      const response = {
        success: true,
        portfolios,
        total: portfolios.length
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });

      return response;

    } catch (error) {
      logger.error('Failed to get user portfolios:', error);
      throw error;
    }
  }

  // Get portfolio by ID
  async getPortfolio(portfolioId, userId) {
    try {
      const result = await databaseManager.query(`
        SELECT p.*, 
               COUNT(ph.id) as holding_count,
               COALESCE(SUM(ph.current_value), 0) as total_value
        FROM portfolios p
        LEFT JOIN portfolio_holdings ph ON p.id = ph.portfolio_id
        WHERE p.id = $1 AND p.user_id = $2
        GROUP BY p.id
      `, [portfolioId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Portfolio not found');
      }

      const portfolio = this.formatPortfolio(result.rows[0]);
      portfolio.holdings = await this.getPortfolioHoldings(portfolioId);

      return {
        success: true,
        portfolio
      };

    } catch (error) {
      logger.error('Failed to get portfolio:', error);
      throw error;
    }
  }

  // Update portfolio
  async updatePortfolio(portfolioId, userId, updateData) {
    const client = await databaseManager.getClient();

    try {
      await client.query('BEGIN');

      // Check if portfolio exists and belongs to user
      const existingResult = await client.query(
        'SELECT id FROM portfolios WHERE id = $1 AND user_id = $2',
        [portfolioId, userId]
      );

      if (existingResult.rows.length === 0) {
        throw new Error('Portfolio not found');
      }

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (updateData.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(updateData.name);
      }

      if (updateData.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(updateData.description);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(portfolioId);

      const updateQuery = `
        UPDATE portfolios 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(updateQuery, updateValues);
      const portfolio = result.rows[0];

      await client.query('COMMIT');

      // Clear cache
      this.clearUserCache(userId);

      logger.info(`Portfolio updated: ${portfolioId}`);

      return {
        success: true,
        portfolio: this.formatPortfolio(portfolio)
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Portfolio update failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete portfolio
  async deletePortfolio(portfolioId, userId) {
    const client = await databaseManager.getClient();

    try {
      await client.query('BEGIN');

      // Check if portfolio exists and belongs to user
      const existingResult = await client.query(
        'SELECT id FROM portfolios WHERE id = $1 AND user_id = $2',
        [portfolioId, userId]
      );

      if (existingResult.rows.length === 0) {
        throw new Error('Portfolio not found');
      }

      // Delete portfolio (holdings will be deleted by CASCADE)
      await client.query(
        'DELETE FROM portfolios WHERE id = $1',
        [portfolioId]
      );

      await client.query('COMMIT');

      // Clear cache
      this.clearUserCache(userId);

      logger.info(`Portfolio deleted: ${portfolioId}`);

      return {
        success: true,
        message: 'Portfolio deleted successfully'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Portfolio deletion failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Add holding to portfolio
  async addHolding(client, portfolioId, holdingData) {
    const { assetId, quantity, averageCost } = holdingData;

    // Get current asset price
    const priceResult = await client.query(
      'SELECT price FROM asset_prices WHERE asset_id = $1 ORDER BY timestamp DESC LIMIT 1',
      [assetId]
    );

    if (priceResult.rows.length === 0) {
      throw new Error('Asset price not found');
    }

    const currentPrice = parseFloat(priceResult.rows[0].price);
    const currentValue = quantity * currentPrice;
    const unrealizedPnl = currentValue - (quantity * averageCost);
    const unrealizedPnlPercentage = averageCost > 0 ? (unrealizedPnl / (quantity * averageCost)) * 100 : 0;

    // Insert or update holding
    await client.query(`
      INSERT INTO portfolio_holdings (
        portfolio_id, asset_id, quantity, average_cost, current_value,
        unrealized_pnl, unrealized_pnl_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (portfolio_id, asset_id) 
      DO UPDATE SET
        quantity = portfolio_holdings.quantity + $3,
        average_cost = CASE 
          WHEN portfolio_holdings.quantity + $3 = 0 THEN 0
          ELSE ((portfolio_holdings.quantity * portfolio_holdings.average_cost) + ($3 * $4)) / (portfolio_holdings.quantity + $3)
        END,
        current_value = (portfolio_holdings.quantity + $3) * $5,
        updated_at = CURRENT_TIMESTAMP
    `, [
      portfolioId, assetId, quantity, averageCost, currentPrice,
      unrealizedPnl, unrealizedPnlPercentage
    ]);

    // Update portfolio totals
    await this.updatePortfolioTotals(client, portfolioId);
  }

  // Get portfolio holdings
  async getPortfolioHoldings(portfolioId) {
    try {
      const result = await databaseManager.query(`
        SELECT ph.*, a.symbol, a.name, a.asset_type, ap.price as current_price
        FROM portfolio_holdings ph
        JOIN assets a ON ph.asset_id = a.id
        LEFT JOIN LATERAL (
          SELECT price FROM asset_prices ap2 
          WHERE ap2.asset_id = a.id 
          ORDER BY ap2.timestamp DESC 
          LIMIT 1
        ) ap ON true
        WHERE ph.portfolio_id = $1
        ORDER BY ph.current_value DESC
      `, [portfolioId]);

      return result.rows.map(row => this.formatHolding(row));

    } catch (error) {
      logger.error('Failed to get portfolio holdings:', error);
      throw error;
    }
  }

  // Update portfolio totals
  async updatePortfolioTotals(client, portfolioId) {
    const totalsResult = await client.query(`
      SELECT 
        COALESCE(SUM(current_value), 0) as total_value,
        COALESCE(SUM(unrealized_pnl), 0) as total_unrealized_pnl,
        COUNT(*) as holding_count
      FROM portfolio_holdings 
      WHERE portfolio_id = $1
    `, [portfolioId]);

    const totals = totalsResult.rows[0];

    // Get initial balance
    const portfolioResult = await client.query(
      'SELECT initial_balance FROM portfolios WHERE id = $1',
      [portfolioId]
    );

    const initialBalance = parseFloat(portfolioResult.rows[0].initial_balance);
    const totalReturn = totals.total_value - initialBalance;
    const totalReturnPercentage = initialBalance > 0 ? (totalReturn / initialBalance) * 100 : 0;

    // Update portfolio
    await client.query(`
      UPDATE portfolios 
      SET 
        current_balance = $2,
        total_return = $3,
        total_return_percentage = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [portfolioId, totals.total_value, totalReturn, totalReturnPercentage]);
  }

  // Get portfolio performance
  async getPortfolioPerformance(portfolioId, userId, period = '1M') {
    try {
      // Verify portfolio ownership
      const portfolioResult = await databaseManager.query(
        'SELECT id FROM portfolios WHERE id = $1 AND user_id = $2',
        [portfolioId, userId]
      );

      if (portfolioResult.rows.length === 0) {
        throw new Error('Portfolio not found');
      }

      // Calculate period start date
      const periodDays = this.getPeriodDays(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      // Get portfolio value history (simplified - in production, you'd store historical data)
      const currentValue = await this.getCurrentPortfolioValue(portfolioId);

      // Get initial value (simplified calculation)
      const portfolioResult2 = await databaseManager.query(
        'SELECT initial_balance FROM portfolios WHERE id = $1',
        [portfolioId]
      );

      const initialValue = parseFloat(portfolioResult2.rows[0].initial_balance);
      const totalReturn = currentValue - initialValue;
      const totalReturnPercentage = initialValue > 0 ? (totalReturn / initialValue) * 100 : 0;

      // Get risk metrics (simplified)
      const riskMetrics = await this.calculateRiskMetrics(portfolioId);

      return {
        success: true,
        performance: {
          period,
          initialValue,
          currentValue,
          totalReturn,
          totalReturnPercentage,
          riskMetrics,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Failed to get portfolio performance:', error);
      throw error;
    }
  }

  // Get current portfolio value
  async getCurrentPortfolioValue(portfolioId) {
    try {
      const result = await databaseManager.query(`
        SELECT COALESCE(SUM(ph.quantity * ap.price), 0) as total_value
        FROM portfolio_holdings ph
        JOIN assets a ON ph.asset_id = a.id
        LEFT JOIN LATERAL (
          SELECT price FROM asset_prices ap2 
          WHERE ap2.asset_id = a.id 
          ORDER BY ap2.timestamp DESC 
          LIMIT 1
        ) ap ON true
        WHERE ph.portfolio_id = $1
      `, [portfolioId]);

      return parseFloat(result.rows[0].total_value);

    } catch (error) {
      logger.error('Failed to get current portfolio value:', error);
      throw error;
    }
  }

  // Calculate risk metrics
  async calculateRiskMetrics(portfolioId) {
    try {
      // Get portfolio holdings with weights
      const holdingsResult = await databaseManager.query(`
        SELECT ph.*, a.symbol, a.name
        FROM portfolio_holdings ph
        JOIN assets a ON ph.asset_id = a.id
        WHERE ph.portfolio_id = $1
      `, [portfolioId]);

      if (holdingsResult.rows.length === 0) {
        return {
          sharpeRatio: 0,
          maxDrawdown: 0,
          volatility: 0,
          beta: 1
        };
      }

      // Simplified risk calculation (in production, use proper financial formulas)
      const totalValue = holdingsResult.rows.reduce((sum, holding) => sum + parseFloat(holding.current_value), 0);

      // Calculate weights
      const holdingsWithWeights = holdingsResult.rows.map(holding => ({
        ...holding,
        weight: parseFloat(holding.current_value) / totalValue
      }));

      // Simplified risk metrics
      const sharpeRatio = Math.random() * 2 - 1; // Placeholder
      const maxDrawdown = Math.random() * 20; // Placeholder
      const volatility = Math.random() * 30; // Placeholder
      const beta = 0.8 + Math.random() * 0.4; // Placeholder

      return {
        sharpeRatio: parseFloat(sharpeRatio.toFixed(4)),
        maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
        volatility: parseFloat(volatility.toFixed(2)),
        beta: parseFloat(beta.toFixed(2)),
        holdingsCount: holdingsResult.rows.length,
        diversificationScore: this.calculateDiversificationScore(holdingsWithWeights)
      };

    } catch (error) {
      logger.error('Failed to calculate risk metrics:', error);
      throw error;
    }
  }

  // Calculate diversification score
  calculateDiversificationScore(holdings) {
    if (holdings.length <= 1) return 0;

    // Herfindahl-Hirschman Index (HHI)
    const hhi = holdings.reduce((sum, holding) => sum + Math.pow(holding.weight, 2), 0);

    // Convert to diversification score (0-100)
    const maxHhi = 1; // When all weight is in one asset
    const minHhi = 1 / holdings.length; // When equally weighted

    const diversificationScore = ((maxHhi - hhi) / (maxHhi - minHhi)) * 100;

    return Math.max(0, Math.min(100, parseFloat(diversificationScore.toFixed(2))));
  }

  // Helper methods
  getPeriodDays(period) {
    const periods = {
      '1D': 1,
      '1W': 7,
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365,
      'ALL': 365 * 10 // 10 years
    };
    return periods[period] || 30;
  }

  formatPortfolio(portfolio) {
    return {
      id: portfolio.id,
      userId: portfolio.user_id,
      name: portfolio.name,
      description: portfolio.description,
      status: portfolio.status,
      initialBalance: parseFloat(portfolio.initial_balance),
      currentBalance: parseFloat(portfolio.current_balance),
      totalReturn: parseFloat(portfolio.total_return),
      totalReturnPercentage: parseFloat(portfolio.total_return_percentage),
      riskScore: portfolio.risk_score ? parseFloat(portfolio.risk_score) : null,
      sharpeRatio: portfolio.sharpe_ratio ? parseFloat(portfolio.sharpe_ratio) : null,
      maxDrawdown: portfolio.max_drawdown ? parseFloat(portfolio.max_drawdown) : null,
      holdingCount: parseInt(portfolio.holding_count) || 0,
      totalValue: parseFloat(portfolio.total_value) || 0,
      createdAt: portfolio.created_at,
      updatedAt: portfolio.updated_at
    };
  }

  formatHolding(holding) {
    return {
      id: holding.id,
      portfolioId: holding.portfolio_id,
      assetId: holding.asset_id,
      symbol: holding.symbol,
      name: holding.name,
      assetType: holding.asset_type,
      quantity: parseFloat(holding.quantity),
      averageCost: parseFloat(holding.average_cost),
      currentPrice: holding.current_price ? parseFloat(holding.current_price) : null,
      currentValue: parseFloat(holding.current_value),
      unrealizedPnl: parseFloat(holding.unrealized_pnl),
      unrealizedPnlPercentage: parseFloat(holding.unrealized_pnl_percentage),
      weightPercentage: parseFloat(holding.weight_percentage),
      createdAt: holding.created_at,
      updatedAt: holding.updated_at
    };
  }

  clearUserCache(userId) {
    for (const key of this.cache.keys()) {
      if (key.includes(`_${userId}_`)) {
        this.cache.delete(key);
      }
    }
  }
}

module.exports = new PortfolioService();
