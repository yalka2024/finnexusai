/**
 * Trading Engine - Complete Implementation
 * Handles all trading operations, order management, and execution
 *
 * @author FinNexusAI Development Team
 * @version 1.0.0
 * @date 2024-01-15
 */


const databaseManager = require('../../config/database');
const auditService = require('../security/AuditService');
const riskManager = require('./RiskManager');
const orderBookManager = require('./OrderBookManager');
const exchangeConnector = require('./ExchangeConnector');


class TradingEngine {
  constructor() {
    this.activeOrders = new Map();
    this.orderHistory = new Map();
    this.portfolioBalances = new Map();
    this.isInitialized = false;

    // Trading configuration
    this.config = {
      maxOrderSize: 1000000, // $1M max order
      minOrderSize: 10, // $10 min order
      maxDailyVolume: 10000000, // $10M daily volume limit
      slippageTolerance: 0.5, // 0.5% max slippage
      executionTimeout: 30000, // 30 seconds
      retryAttempts: 3
    };

    logger.info('TradingEngine initialized');
  }

  /**
     * Initialize trading engine
     * @returns {Promise<Object>} Initialization result
     */
  async initialize() {
    try {
      // Load active orders from database
      await this.loadActiveOrders();

      // Initialize exchange connections
      await exchangeConnector.initialize();

      // Start order monitoring
      this.startOrderMonitoring();

      // Start balance synchronization
      this.startBalanceSync();

      this.isInitialized = true;
      logger.info('TradingEngine initialized successfully');

      return {
        success: true,
        message: 'TradingEngine initialized successfully'
      };
    } catch (error) {
      logger.error('TradingEngine initialization failed:', error);
      return {
        success: false,
        message: 'TradingEngine initialization failed',
        error: error.message
      };
    }
  }

  /**
     * Place a new order
     * @param {Object} orderData - Order details
     * @returns {Promise<Object>} Order placement result
     */
  async placeOrder(orderData) {
    try {
      const {
        userId,
        portfolioId,
        assetId,
        side,
        type,
        quantity,
        price,
        stopPrice,
        timeInForce = 'GTC',
        strategyType = null,
        strategyId = null
      } = orderData;

      // Validate order data
      const validation = await this.validateOrder(orderData);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'INVALID_ORDER',
          message: 'Order validation failed',
          details: validation.errors
        };
      }

      // Check risk limits
      const riskCheck = await riskManager.checkOrderRisk(orderData);
      if (!riskCheck.approved) {
        return {
          success: false,
          error: 'RISK_LIMIT_EXCEEDED',
          message: 'Order exceeds risk limits',
          details: riskCheck.reasons
        };
      }

      // Check portfolio balance
      const balanceCheck = await this.checkPortfolioBalance(userId, portfolioId, assetId, side, quantity, price);
      if (!balanceCheck.sufficient) {
        return {
          success: false,
          error: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient balance for order',
          details: balanceCheck.details
        };
      }

      // Create order record
      const orderId = await this.createOrderRecord(orderData);

      // Submit to exchange
      const exchangeResult = await this.submitToExchange(orderData, orderId);

      if (exchangeResult.success) {
        // Update order status
        await this.updateOrderStatus(orderId, 'submitted', {
          exchangeOrderId: exchangeResult.exchangeOrderId,
          exchangeTimestamp: exchangeResult.timestamp
        });

        // Add to active orders
        this.activeOrders.set(orderId, {
          ...orderData,
          id: orderId,
          status: 'submitted',
          exchangeOrderId: exchangeResult.exchangeOrderId,
          createdAt: new Date()
        });

        // Log order placement
        await auditService.logEvent({
          userId: userId,
          event: 'ORDER_PLACED',
          details: {
            orderId: orderId,
            assetId: assetId,
            side: side,
            type: type,
            quantity: quantity,
            price: price,
            strategyType: strategyType
          }
        });

        logger.info(`Order placed successfully: ${orderId}`);

        return {
          success: true,
          message: 'Order placed successfully',
          order: {
            id: orderId,
            status: 'submitted',
            exchangeOrderId: exchangeResult.exchangeOrderId,
            submittedAt: new Date()
          }
        };
      } else {
        // Update order status to failed
        await this.updateOrderStatus(orderId, 'failed', {
          error: exchangeResult.error
        });

        return {
          success: false,
          error: 'EXCHANGE_ERROR',
          message: 'Failed to submit order to exchange',
          details: exchangeResult.error
        };
      }

    } catch (error) {
      logger.error('Order placement failed:', error);
      return {
        success: false,
        error: 'ORDER_PLACEMENT_FAILED',
        message: 'Order placement failed due to server error'
      };
    }
  }

  /**
     * Cancel an order
     * @param {string} orderId - Order ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Cancellation result
     */
  async cancelOrder(orderId, userId) {
    try {
      // Get order details
      const order = await this.getOrderById(orderId);
      if (!order) {
        return {
          success: false,
          error: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        };
      }

      // Check if user owns the order
      if (order.user_id !== userId) {
        return {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'You can only cancel your own orders'
        };
      }

      // Check if order can be cancelled
      if (!['pending', 'submitted', 'processing', 'partially_filled'].includes(order.status)) {
        return {
          success: false,
          error: 'ORDER_NOT_CANCELLABLE',
          message: 'Order cannot be cancelled in current status'
        };
      }

      // Cancel on exchange
      const cancelResult = await exchangeConnector.cancelOrder(order.exchange_order_id);

      if (cancelResult.success) {
        // Update order status
        await this.updateOrderStatus(orderId, 'cancelled', {
          cancelledAt: new Date()
        });

        // Remove from active orders
        this.activeOrders.delete(orderId);

        // Log cancellation
        await auditService.logEvent({
          userId: userId,
          event: 'ORDER_CANCELLED',
          details: {
            orderId: orderId,
            assetId: order.asset_id,
            side: order.side,
            quantity: order.quantity,
            filledQuantity: order.filled_quantity
          }
        });

        logger.info(`Order cancelled successfully: ${orderId}`);

        return {
          success: true,
          message: 'Order cancelled successfully'
        };
      } else {
        return {
          success: false,
          error: 'CANCELLATION_FAILED',
          message: 'Failed to cancel order on exchange'
        };
      }

    } catch (error) {
      logger.error('Order cancellation failed:', error);
      return {
        success: false,
        error: 'CANCELLATION_FAILED',
        message: 'Order cancellation failed'
      };
    }
  }

  /**
     * Get order details
     * @param {string} orderId - Order ID
     * @returns {Promise<Object>} Order details
     */
  async getOrder(orderId) {
    try {
      const order = await this.getOrderById(orderId);
      if (!order) {
        return {
          success: false,
          error: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        };
      }

      return {
        success: true,
        order: this.formatOrderResponse(order)
      };

    } catch (error) {
      logger.error('Get order failed:', error);
      return {
        success: false,
        error: 'GET_ORDER_FAILED',
        message: 'Failed to retrieve order'
      };
    }
  }

  /**
     * Get user's orders
     * @param {string} userId - User ID
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} User orders
     */
  async getUserOrders(userId, filters = {}) {
    try {
      const {
        status = null,
        assetId = null,
        side = null,
        type = null,
        limit = 50,
        offset = 0,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = filters;

      let query = `
                SELECT t.*, a.symbol, a.name as asset_name, p.name as portfolio_name
                FROM trades t
                JOIN assets a ON t.asset_id = a.id
                JOIN portfolios p ON t.portfolio_id = p.id
                WHERE t.user_id = $1
            `;

      const values = [userId];
      let paramIndex = 2;

      // Add filters
      if (status) {
        query += ` AND t.status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
      }

      if (assetId) {
        query += ` AND t.asset_id = $${paramIndex}`;
        values.push(assetId);
        paramIndex++;
      }

      if (side) {
        query += ` AND t.side = $${paramIndex}`;
        values.push(side);
        paramIndex++;
      }

      if (type) {
        query += ` AND t.type = $${paramIndex}`;
        values.push(type);
        paramIndex++;
      }

      // Add sorting
      query += ` ORDER BY t.${sortBy} ${sortOrder}`;

      // Add pagination
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      const result = await databaseManager.query(query, values);

      const orders = result.rows.map(order => this.formatOrderResponse(order));

      // Get total count
      const countQuery = `
                SELECT COUNT(*) as total
                FROM trades t
                WHERE t.user_id = $1
            `;
      const countResult = await databaseManager.query(countQuery, [userId]);
      const total = parseInt(countResult.rows[0].total);

      return {
        success: true,
        orders: orders,
        pagination: {
          total: total,
          limit: limit,
          offset: offset,
          hasMore: offset + limit < total
        }
      };

    } catch (error) {
      logger.error('Get user orders failed:', error);
      return {
        success: false,
        error: 'GET_ORDERS_FAILED',
        message: 'Failed to retrieve orders'
      };
    }
  }

  /**
     * Execute trade (for market orders)
     * @param {Object} tradeData - Trade execution data
     * @returns {Promise<Object>} Trade execution result
     */
  async executeTrade(tradeData) {
    try {
      const {
        userId,
        portfolioId,
        assetId,
        side,
        quantity,
        price,
        strategyType = 'manual'
      } = tradeData;

      // Get current market price if not provided
      let executionPrice = price;
      if (!executionPrice) {
        const marketData = await this.getMarketPrice(assetId);
        if (!marketData.success) {
          return {
            success: false,
            error: 'MARKET_DATA_ERROR',
            message: 'Failed to get market price'
          };
        }
        executionPrice = marketData.price;
      }

      // Calculate total value
      const totalValue = quantity * executionPrice;

      // Check portfolio balance
      const balanceCheck = await this.checkPortfolioBalance(userId, portfolioId, assetId, side, quantity, executionPrice);
      if (!balanceCheck.sufficient) {
        return {
          success: false,
          error: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient balance for trade'
        };
      }

      // Execute the trade
      const executionResult = await this.executeTradeOnExchange(tradeData, executionPrice);

      if (executionResult.success) {
        // Update portfolio holdings
        await this.updatePortfolioHoldings(portfolioId, assetId, side, quantity, executionPrice);

        // Create trade record
        const tradeId = await this.createTradeRecord({
          ...tradeData,
          executionPrice: executionPrice,
          totalValue: totalValue,
          status: 'filled',
          filledAt: new Date()
        });

        // Log trade execution
        await auditService.logEvent({
          userId: userId,
          event: 'TRADE_EXECUTED',
          details: {
            tradeId: tradeId,
            assetId: assetId,
            side: side,
            quantity: quantity,
            price: executionPrice,
            totalValue: totalValue,
            strategyType: strategyType
          }
        });

        logger.info(`Trade executed successfully: ${tradeId}`);

        return {
          success: true,
          message: 'Trade executed successfully',
          trade: {
            id: tradeId,
            assetId: assetId,
            side: side,
            quantity: quantity,
            price: executionPrice,
            totalValue: totalValue,
            executedAt: new Date()
          }
        };
      } else {
        return {
          success: false,
          error: 'EXECUTION_FAILED',
          message: 'Trade execution failed'
        };
      }

    } catch (error) {
      logger.error('Trade execution failed:', error);
      return {
        success: false,
        error: 'EXECUTION_FAILED',
        message: 'Trade execution failed'
      };
    }
  }

  // Helper Methods

  /**
     * Validate order data
     * @param {Object} orderData - Order data
     * @returns {Promise<Object>} Validation result
     */
  async validateOrder(orderData) {
    const errors = [];

    // Required fields
    if (!orderData.userId) errors.push('User ID is required');
    if (!orderData.portfolioId) errors.push('Portfolio ID is required');
    if (!orderData.assetId) errors.push('Asset ID is required');
    if (!orderData.side) errors.push('Order side is required');
    if (!orderData.quantity) errors.push('Quantity is required');

    // Validate side
    if (orderData.side && !['buy', 'sell'].includes(orderData.side)) {
      errors.push('Order side must be buy or sell');
    }

    // Validate quantity
    if (orderData.quantity && orderData.quantity <= 0) {
      errors.push('Quantity must be positive');
    }

    // Validate price for limit orders
    if (orderData.type === 'limit' && (!orderData.price || orderData.price <= 0)) {
      errors.push('Price is required for limit orders');
    }

    // Check asset exists and is tradable
    if (orderData.assetId) {
      const asset = await this.getAssetById(orderData.assetId);
      if (!asset) {
        errors.push('Asset not found');
      } else if (!asset.is_tradable) {
        errors.push('Asset is not tradable');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
     * Check portfolio balance
     * @param {string} userId - User ID
     * @param {string} portfolioId - Portfolio ID
     * @param {string} assetId - Asset ID
     * @param {string} side - Order side
     * @param {number} quantity - Quantity
     * @param {number} price - Price
     * @returns {Promise<Object>} Balance check result
     */
  async checkPortfolioBalance(userId, portfolioId, assetId, side, quantity, price) {
    try {
      // Get portfolio holdings
      const holdings = await this.getPortfolioHoldings(portfolioId);

      if (side === 'buy') {
        // Check if user has enough quote currency
        const quoteAsset = await this.getQuoteAsset(assetId);
        const requiredBalance = quantity * price;

        const quoteHolding = holdings.find(h => h.asset_id === quoteAsset.id);
        if (!quoteHolding || quoteHolding.quantity < requiredBalance) {
          return {
            sufficient: false,
            details: {
              required: requiredBalance,
              available: quoteHolding ? quoteHolding.quantity : 0,
              asset: quoteAsset.symbol
            }
          };
        }
      } else if (side === 'sell') {
        // Check if user has enough base asset
        const baseHolding = holdings.find(h => h.asset_id === assetId);
        if (!baseHolding || baseHolding.quantity < quantity) {
          return {
            sufficient: false,
            details: {
              required: quantity,
              available: baseHolding ? baseHolding.quantity : 0,
              asset: baseHolding ? baseHolding.symbol : 'Unknown'
            }
          };
        }
      }

      return { sufficient: true };

    } catch (error) {
      logger.error('Balance check failed:', error);
      return {
        sufficient: false,
        details: { error: 'Balance check failed' }
      };
    }
  }

  /**
     * Create order record in database
     * @param {Object} orderData - Order data
     * @returns {Promise<string>} Order ID
     */
  async createOrderRecord(orderData) {
    const orderId = require('crypto').randomUUID();
    const logger = require('../../utils/logger');

    const query = `
            INSERT INTO trades (
                id, user_id, portfolio_id, asset_id, side, type, quantity, price,
                stop_price, limit_price, time_in_force, expires_at, strategy_type,
                strategy_id, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING id
        `;

    const values = [
      orderId, orderData.userId, orderData.portfolioId, orderData.assetId,
      orderData.side, orderData.type, orderData.quantity, orderData.price,
      orderData.stopPrice, orderData.limitPrice, orderData.timeInForce,
      orderData.expiresAt, orderData.strategyType, orderData.strategyId,
      'pending', new Date(), new Date()
    ];

    const result = await databaseManager.query(query, values);
    return result.rows[0].id;
  }

  /**
     * Submit order to exchange
     * @param {Object} orderData - Order data
     * @param {string} orderId - Order ID
     * @returns {Promise<Object>} Exchange submission result
     */
  async submitToExchange(orderData, orderId) {
    try {
      const exchangeOrder = {
        symbol: orderData.symbol,
        side: orderData.side,
        type: orderData.type,
        quantity: orderData.quantity,
        price: orderData.price,
        stopPrice: orderData.stopPrice,
        timeInForce: orderData.timeInForce
      };

      const result = await exchangeConnector.placeOrder(exchangeOrder);

      return {
        success: result.success,
        exchangeOrderId: result.orderId,
        timestamp: result.timestamp,
        error: result.error
      };

    } catch (error) {
      logger.error('Exchange submission failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
     * Update order status
     * @param {string} orderId - Order ID
     * @param {string} status - New status
     * @param {Object} additionalData - Additional data to update
     * @returns {Promise<void>}
     */
  async updateOrderStatus(orderId, status, additionalData = {}) {
    const updateFields = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [status];
    let paramIndex = 2;

    if (additionalData.exchangeOrderId) {
      updateFields.push(`exchange_order_id = $${paramIndex}`);
      values.push(additionalData.exchangeOrderId);
      paramIndex++;
    }

    if (additionalData.exchangeTimestamp) {
      updateFields.push(`exchange_timestamp = $${paramIndex}`);
      values.push(additionalData.exchangeTimestamp);
      paramIndex++;
    }

    if (additionalData.filledQuantity) {
      updateFields.push(`filled_quantity = $${paramIndex}`);
      values.push(additionalData.filledQuantity);
      paramIndex++;
    }

    if (additionalData.averageFillPrice) {
      updateFields.push(`average_fill_price = $${paramIndex}`);
      values.push(additionalData.averageFillPrice);
      paramIndex++;
    }

    if (additionalData.cancelledAt) {
      updateFields.push(`cancelled_at = $${paramIndex}`);
      values.push(additionalData.cancelledAt);
      paramIndex++;
    }

    if (additionalData.filledAt) {
      updateFields.push(`filled_at = $${paramIndex}`);
      values.push(additionalData.filledAt);
      paramIndex++;
    }

    const query = `
            UPDATE trades 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
        `;

    values.push(orderId);
    await databaseManager.query(query, values);
  }

  /**
     * Load active orders from database
     * @returns {Promise<void>}
     */
  async loadActiveOrders() {
    try {
      const query = `
                SELECT * FROM trades 
                WHERE status IN ('pending', 'submitted', 'processing', 'partially_filled')
            `;

      const result = await databaseManager.query(query);

      result.rows.forEach(order => {
        this.activeOrders.set(order.id, order);
      });

      logger.info(`Loaded ${result.rows.length} active orders`);

    } catch (error) {
      logger.error('Failed to load active orders:', error);
    }
  }

  /**
     * Start order monitoring
     * @returns {void}
     */
  startOrderMonitoring() {
    setInterval(async() => {
      try {
        await this.monitorActiveOrders();
      } catch (error) {
        logger.error('Order monitoring error:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
     * Monitor active orders
     * @returns {Promise<void>}
     */
  async monitorActiveOrders() {
    for (const [orderId, order] of this.activeOrders) {
      try {
        const status = await exchangeConnector.getOrderStatus(order.exchange_order_id);

        if (status.success) {
          const orderStatus = status.orderStatus;

          if (orderStatus !== order.status) {
            await this.updateOrderStatus(orderId, orderStatus, {
              filledQuantity: status.filledQuantity,
              averageFillPrice: status.averageFillPrice,
              filledAt: orderStatus === 'filled' ? new Date() : null
            });

            // Update local order
            order.status = orderStatus;
            order.filled_quantity = status.filledQuantity;
            order.average_fill_price = status.averageFillPrice;

            // Remove from active orders if completed
            if (['filled', 'cancelled', 'rejected', 'expired', 'failed'].includes(orderStatus)) {
              this.activeOrders.delete(orderId);
            }

            // Log status change
            await auditService.logEvent({
              userId: order.user_id,
              event: 'ORDER_STATUS_CHANGED',
              details: {
                orderId: orderId,
                oldStatus: order.status,
                newStatus: orderStatus,
                filledQuantity: status.filledQuantity
              }
            });
          }
        }
      } catch (error) {
        logger.error(`Failed to monitor order ${orderId}:`, error);
      }
    }
  }

  /**
     * Format order response
     * @param {Object} order - Order object
     * @returns {Object} Formatted order
     */
  formatOrderResponse(order) {
    return {
      id: order.id,
      userId: order.user_id,
      portfolioId: order.portfolio_id,
      assetId: order.asset_id,
      symbol: order.symbol,
      assetName: order.asset_name,
      portfolioName: order.portfolio_name,
      side: order.side,
      type: order.type,
      status: order.status,
      quantity: order.quantity,
      price: order.price,
      stopPrice: order.stop_price,
      limitPrice: order.limit_price,
      filledQuantity: order.filled_quantity,
      remainingQuantity: order.remaining_quantity,
      averageFillPrice: order.average_fill_price,
      totalValue: order.total_value,
      commission: order.commission,
      totalFees: order.total_fees,
      timeInForce: order.time_in_force,
      strategyType: order.strategy_type,
      strategyId: order.strategy_id,
      submittedAt: order.submitted_at,
      filledAt: order.filled_at,
      cancelledAt: order.cancelled_at,
      createdAt: order.created_at,
      updatedAt: order.updated_at
    };
  }

  /**
     * Shutdown trading engine
     * @returns {Promise<Object>} Shutdown result
     */
  async shutdown() {
    try {
      // Cancel all active orders
      for (const [orderId, order] of this.activeOrders) {
        try {
          await exchangeConnector.cancelOrder(order.exchange_order_id);
        } catch (error) {
          logger.error(`Failed to cancel order ${orderId}:`, error);
        }
      }

      // Clear active orders
      this.activeOrders.clear();

      // Shutdown exchange connector
      await exchangeConnector.shutdown();

      this.isInitialized = false;
      logger.info('TradingEngine shut down successfully');

      return {
        success: true,
        message: 'TradingEngine shut down successfully'
      };

    } catch (error) {
      logger.error('TradingEngine shutdown failed:', error);
      return {
        success: false,
        message: 'TradingEngine shutdown failed',
        error: error.message
      };
    }
  }
}

module.exports = new TradingEngine();
