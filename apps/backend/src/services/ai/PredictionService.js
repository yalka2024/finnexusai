
const databaseManager = require('../../config/database');
const logger = require('../../utils/logger');

class PredictionService {
  constructor() {
    this.models = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      await this.loadModels();
      this.isInitialized = true;
      logger.info('AI Prediction Service initialized');
      return { success: true, message: 'AI Prediction Service initialized' };
    } catch (error) {
      logger.error('AI Prediction Service initialization failed:', error);
      throw error;
    }
  }

  async shutdown() {
    try {
      this.models.clear();
      this.isInitialized = false;
      logger.info('AI Prediction Service shut down');
      return { success: true, message: 'AI Prediction Service shut down' };
    } catch (error) {
      logger.error('AI Prediction Service shutdown failed:', error);
      throw error;
    }
  }

  // Load AI models
  async loadModels() {
    // Initialize different prediction models
    this.models.set('price_prediction', new PricePredictionModel());
    this.models.set('sentiment_analysis', new SentimentAnalysisModel());
    this.models.set('risk_assessment', new RiskAssessmentModel());
    this.models.set('portfolio_optimization', new PortfolioOptimizationModel());
  }

  // Predict asset price
  async predictPrice(assetId, timeframe = '1h') {
    try {
      const model = this.models.get('price_prediction');
      if (!model) {
        throw new Error('Price prediction model not available');
      }

      // Get historical data
      const historicalData = await this.getHistoricalData(assetId, timeframe);

      // Make prediction
      const prediction = await model.predict(historicalData);

      // Store prediction
      await this.storePrediction(assetId, 'price_prediction', prediction);

      return {
        success: true,
        prediction: {
          assetId,
          currentPrice: prediction.currentPrice,
          predictedPrice: prediction.predictedPrice,
          confidence: prediction.confidence,
          timeframe,
          direction: prediction.direction,
          timestamp: new Date()
        }
      };
    } catch (error) {
      logger.error('Price prediction failed:', error);
      throw error;
    }
  }

  // Analyze market sentiment
  async analyzeSentiment(assetId, textData) {
    try {
      const model = this.models.get('sentiment_analysis');
      if (!model) {
        throw new Error('Sentiment analysis model not available');
      }

      const sentiment = await model.analyze(textData);

      return {
        success: true,
        sentiment: {
          assetId,
          score: sentiment.score,
          magnitude: sentiment.magnitude,
          label: sentiment.label,
          confidence: sentiment.confidence,
          timestamp: new Date()
        }
      };
    } catch (error) {
      logger.error('Sentiment analysis failed:', error);
      throw error;
    }
  }

  // Assess portfolio risk
  async assessRisk(portfolioId) {
    try {
      const model = this.models.get('risk_assessment');
      if (!model) {
        throw new Error('Risk assessment model not available');
      }

      // Get portfolio data
      const portfolioData = await this.getPortfolioData(portfolioId);

      // Assess risk
      const riskAssessment = await model.assess(portfolioData);

      return {
        success: true,
        riskAssessment: {
          portfolioId,
          overallRisk: riskAssessment.overallRisk,
          var95: riskAssessment.var95,
          var99: riskAssessment.var99,
          sharpeRatio: riskAssessment.sharpeRatio,
          maxDrawdown: riskAssessment.maxDrawdown,
          volatility: riskAssessment.volatility,
          correlationMatrix: riskAssessment.correlationMatrix,
          timestamp: new Date()
        }
      };
    } catch (error) {
      logger.error('Risk assessment failed:', error);
      throw error;
    }
  }

  // Optimize portfolio
  async optimizePortfolio(portfolioId, constraints = {}) {
    try {
      const model = this.models.get('portfolio_optimization');
      if (!model) {
        throw new Error('Portfolio optimization model not available');
      }

      // Get portfolio data
      const portfolioData = await this.getPortfolioData(portfolioId);

      // Optimize portfolio
      const optimization = await model.optimize(portfolioData, constraints);

      return {
        success: true,
        optimization: {
          portfolioId,
          optimizedWeights: optimization.weights,
          expectedReturn: optimization.expectedReturn,
          expectedRisk: optimization.expectedRisk,
          sharpeRatio: optimization.sharpeRatio,
          recommendations: optimization.recommendations,
          timestamp: new Date()
        }
      };
    } catch (error) {
      logger.error('Portfolio optimization failed:', error);
      throw error;
    }
  }

  // Get historical data for predictions
  async getHistoricalData(assetId, timeframe) {
    try {
      const result = await databaseManager.query(`
        SELECT price, volume_24h, timestamp
        FROM asset_prices 
        WHERE asset_id = $1 
        ORDER BY timestamp DESC 
        LIMIT 100
      `, [assetId]);

      return result.rows.map(row => ({
        price: parseFloat(row.price),
        volume: parseFloat(row.volume_24h),
        timestamp: row.timestamp
      }));
    } catch (error) {
      logger.error('Failed to get historical data:', error);
      throw error;
    }
  }

  // Get portfolio data for analysis
  async getPortfolioData(portfolioId) {
    try {
      const result = await databaseManager.query(`
        SELECT 
          ph.asset_id, ph.quantity, ph.average_cost,
          a.symbol, a.name, a.asset_type
        FROM portfolio_holdings ph
        JOIN assets a ON ph.asset_id = a.id
        WHERE ph.portfolio_id = $1
      `, [portfolioId]);

      return result.rows.map(row => ({
        assetId: row.asset_id,
        symbol: row.symbol,
        name: row.name,
        assetType: row.asset_type,
        quantity: parseFloat(row.quantity),
        averageCost: parseFloat(row.average_cost)
      }));
    } catch (error) {
      logger.error('Failed to get portfolio data:', error);
      throw error;
    }
  }

  // Store prediction results
  async storePrediction(assetId, modelName, prediction) {
    try {
      await databaseManager.query(`
        INSERT INTO ai_predictions (
          asset_id, model_name, prediction_type, predicted_price,
          predicted_direction, confidence_score, prediction_horizon
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        assetId,
        modelName,
        'price_prediction',
        prediction.predictedPrice,
        prediction.direction,
        prediction.confidence,
        60 // 1 hour horizon
      ]);
    } catch (error) {
      logger.error('Failed to store prediction:', error);
    }
  }

  // Get prediction history
  async getPredictionHistory(assetId, limit = 50) {
    try {
      const result = await databaseManager.query(`
        SELECT 
          model_name, prediction_type, predicted_price, predicted_direction,
          confidence_score, actual_price, accuracy_score, created_at
        FROM ai_predictions 
        WHERE asset_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `, [assetId, limit]);

      return result.rows.map(row => ({
        modelName: row.model_name,
        predictionType: row.prediction_type,
        predictedPrice: row.predicted_price ? parseFloat(row.predicted_price) : null,
        predictedDirection: row.predicted_direction,
        confidenceScore: row.confidence_score ? parseFloat(row.confidence_score) : null,
        actualPrice: row.actual_price ? parseFloat(row.actual_price) : null,
        accuracyScore: row.accuracy_score ? parseFloat(row.accuracy_score) : null,
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Failed to get prediction history:', error);
      throw error;
    }
  }
}

// AI Model Implementations
class PricePredictionModel {
  async predict(historicalData) {
    // Simple moving average-based prediction
    const prices = historicalData.map(d => d.price);
    const sma10 = this.calculateSMA(prices, 10);
    const sma30 = this.calculateSMA(prices, 30);

    const currentPrice = prices[0];
    const trend = sma10 > sma30 ? 'bullish' : 'bearish';

    // Simple prediction based on trend and volatility
    const volatility = this.calculateVolatility(prices.slice(0, 20));
    const priceChange = volatility * (trend === 'bullish' ? 1 : -1);
    const predictedPrice = currentPrice * (1 + priceChange);

    return {
      currentPrice,
      predictedPrice,
      direction: trend,
      confidence: Math.max(0.5, 1 - volatility),
      trend,
      volatility
    };
  }

  calculateSMA(prices, period) {
    const recentPrices = prices.slice(0, period);
    return recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
  }

  calculateVolatility(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i - 1] - prices[i]) / prices[i]);
    }
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }
}

class SentimentAnalysisModel {
  async analyze(textData) {
    // Simple keyword-based sentiment analysis
    const positiveWords = ['bullish', 'moon', 'pump', 'buy', 'up', 'rise', 'gain', 'profit'];
    const negativeWords = ['bearish', 'dump', 'crash', 'sell', 'down', 'fall', 'loss', 'drop'];

    const text = textData.toLowerCase();
    const positiveCount = positiveWords.reduce((count, word) => count + (text.split(word).length - 1), 0);
    const negativeCount = negativeWords.reduce((count, word) => count + (text.split(word).length - 1), 0);

    const totalWords = positiveCount + negativeCount;
    if (totalWords === 0) {
      return { score: 0, magnitude: 0, label: 'neutral', confidence: 0.5 };
    }

    const score = (positiveCount - negativeCount) / totalWords;
    const magnitude = totalWords / 10; // Normalize magnitude

    let label = 'neutral';
    if (score > 0.1) label = 'positive';
    else if (score < -0.1) label = 'negative';

    return {
      score,
      magnitude: Math.min(magnitude, 1),
      label,
      confidence: Math.min(totalWords / 5, 1)
    };
  }
}

class RiskAssessmentModel {
  async assess(portfolioData) {
    // Simple risk assessment based on portfolio composition
    const assetTypes = portfolioData.map(asset => asset.assetType);
    const cryptoCount = assetTypes.filter(type => type === 'cryptocurrency').length;
    const totalAssets = portfolioData.length;

    // Higher risk for crypto-heavy portfolios
    const cryptoWeight = cryptoCount / totalAssets;
    const baseRisk = 0.3; // 30% base risk
    const cryptoRiskBonus = cryptoWeight * 0.4; // Up to 40% additional risk

    const overallRisk = Math.min(baseRisk + cryptoRiskBonus, 0.8); // Max 80% risk

    return {
      overallRisk,
      var95: overallRisk * 0.95,
      var99: overallRisk * 0.99,
      sharpeRatio: 1.2 - (overallRisk * 0.5),
      maxDrawdown: overallRisk * 0.6,
      volatility: overallRisk * 0.4,
      correlationMatrix: this.generateCorrelationMatrix(portfolioData)
    };
  }

  generateCorrelationMatrix(portfolioData) {
    const matrix = {};
    for (let i = 0; i < portfolioData.length; i++) {
      matrix[portfolioData[i].symbol] = {};
      for (let j = 0; j < portfolioData.length; j++) {
        if (i === j) {
          matrix[portfolioData[i].symbol][portfolioData[j].symbol] = 1;
        } else {
          // Simple correlation based on asset type
          const correlation = portfolioData[i].assetType === portfolioData[j].assetType ? 0.7 : 0.3;
          matrix[portfolioData[i].symbol][portfolioData[j].symbol] = correlation;
        }
      }
    }
    return matrix;
  }
}

class PortfolioOptimizationModel {
  async optimize(portfolioData, constraints = {}) {
    // Simple portfolio optimization using equal weight as baseline
    const weights = {};
    const equalWeight = 1 / portfolioData.length;

    portfolioData.forEach(asset => {
      weights[asset.symbol] = equalWeight;
    });

    // Apply constraints if provided
    if (constraints.maxWeight) {
      Object.keys(weights).forEach(symbol => {
        if (weights[symbol] > constraints.maxWeight) {
          weights[symbol] = constraints.maxWeight;
        }
      });
    }

    // Normalize weights
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    Object.keys(weights).forEach(symbol => {
      weights[symbol] = weights[symbol] / totalWeight;
    });

    return {
      weights,
      expectedReturn: 0.12, // 12% expected return
      expectedRisk: 0.15,   // 15% expected risk
      sharpeRatio: 0.8,
      recommendations: [
        'Consider diversifying across asset types',
        'Monitor correlation between holdings',
        'Rebalance quarterly'
      ]
    };
  }
}

module.exports = new PredictionService();

