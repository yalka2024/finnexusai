const logger = require('../../utils/logger');
/**
 * FinAI Nexus - Learning Loop Service
 *
 * Continuous improvement through reinforcement learning:
 * - Agent performance monitoring
 * - Strategy optimization
 * - Behavior adaptation
 * - Reward calculation
 * - Model updates
 * - Performance feedback loops
 */

import { xAIGrokAPI } from '../ai/xAIGrokAPI.js';
import { ReinforcementLearningEngine } from './ReinforcementLearningEngine.js';
import { PerformanceAnalyzer } from './PerformanceAnalyzer.js';
import { StrategyOptimizer } from './StrategyOptimizer.js';
import { FeedbackProcessor } from './FeedbackProcessor.js';

export class LearningLoopService {
  constructor() {
    this.grokAPI = new xAIGrokAPI();
    this.rlEngine = new ReinforcementLearningEngine();
    this.performanceAnalyzer = new PerformanceAnalyzer();
    this.strategyOptimizer = new StrategyOptimizer();
    this.feedbackProcessor = new FeedbackProcessor();

    this.learningData = new Map();
    this.performanceHistory = new Map();
    this.strategyUpdates = new Map();
    this.rewardHistory = new Map();

    this.learningConfig = {
      learningRate: 0.01,
      discountFactor: 0.95,
      explorationRate: 0.1,
      updateFrequency: 1000, // 1 second
      batchSize: 32,
      maxMemorySize: 10000,
      performanceThreshold: 0.8,
      strategyUpdateThreshold: 0.05, // 5% improvement
      rewardFunction: 'sharpe_ratio',
      learningEnabled: true
    };
  }

  /**
   * Initialize learning loop service
   * @param {string} userId - User ID
   * @param {Object} config - Configuration
   * @returns {Promise<Object>} Initialization result
   */
  async initialize(userId, config = {}) {
    try {
      this.userId = userId;
      this.learningConfig = { ...this.learningConfig, ...config };

      // Initialize components
      await this.rlEngine.initialize(userId, config.rlEngine);
      await this.performanceAnalyzer.initialize(userId, config.performance);
      await this.strategyOptimizer.initialize(userId, config.strategy);
      await this.feedbackProcessor.initialize(userId, config.feedback);

      // Initialize learning data structures
      this.initializeLearningData(userId);

      // Start learning loop
      this.startLearningLoop(userId);

      return {
        status: 'initialized',
        userId: userId,
        config: this.learningConfig,
        learningEnabled: this.learningConfig.learningEnabled
      };
    } catch (error) {
      logger.error('Learning loop initialization failed:', error);
      throw new Error('Failed to initialize learning loop service');
    }
  }

  /**
   * Start portfolio learning
   * @param {string} userId - User ID
   * @param {Object} portfolioResult - Portfolio management result
   * @returns {Promise<Object>} Learning result
   */
  async startPortfolioLearning(userId, portfolioResult) {
    try {
      if (!this.learningConfig.learningEnabled) {
        return { status: 'disabled' };
      }

      // Analyze portfolio performance
      const performance = await this.performanceAnalyzer.analyzePortfolioPerformance(portfolioResult);

      // Calculate reward
      const reward = await this.calculateReward(performance, 'portfolio');

      // Store learning data
      await this.storeLearningData(userId, 'portfolio', {
        action: portfolioResult.action,
        state: portfolioResult.state,
        reward: reward,
        performance: performance,
        timestamp: new Date()
      });

      // Update RL model
      await this.updateRLModel(userId, 'portfolio', performance, reward);

      // Check for strategy updates
      await this.checkStrategyUpdates(userId, 'portfolio', performance);

      return {
        success: true,
        performance: performance,
        reward: reward,
        learningData: await this.getLearningData(userId, 'portfolio'),
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Portfolio learning failed:', error);
      throw new Error('Failed to start portfolio learning');
    }
  }

  /**
   * Update trading learning
   * @param {string} userId - User ID
   * @param {Object} tradeResult - Trading result
   * @returns {Promise<Object>} Learning result
   */
  async updateTradingLearning(userId, tradeResult) {
    try {
      if (!this.learningConfig.learningEnabled) {
        return { status: 'disabled' };
      }

      // Analyze trading performance
      const performance = await this.performanceAnalyzer.analyzeTradingPerformance(tradeResult);

      // Calculate reward
      const reward = await this.calculateReward(performance, 'trading');

      // Store learning data
      await this.storeLearningData(userId, 'trading', {
        action: tradeResult.action,
        state: tradeResult.state,
        reward: reward,
        performance: performance,
        timestamp: new Date()
      });

      // Update RL model
      await this.updateRLModel(userId, 'trading', performance, reward);

      // Check for strategy updates
      await this.checkStrategyUpdates(userId, 'trading', performance);

      return {
        success: true,
        performance: performance,
        reward: reward,
        learningData: await this.getLearningData(userId, 'trading'),
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Trading learning failed:', error);
      throw new Error('Failed to update trading learning');
    }
  }

  /**
   * Update compliance learning
   * @param {string} userId - User ID
   * @param {Object} complianceResult - Compliance result
   * @returns {Promise<Object>} Learning result
   */
  async updateComplianceLearning(userId, complianceResult) {
    try {
      if (!this.learningConfig.learningEnabled) {
        return { status: 'disabled' };
      }

      // Analyze compliance performance
      const performance = await this.performanceAnalyzer.analyzeCompliancePerformance(complianceResult);

      // Calculate reward
      const reward = await this.calculateReward(performance, 'compliance');

      // Store learning data
      await this.storeLearningData(userId, 'compliance', {
        action: complianceResult.action,
        state: complianceResult.state,
        reward: reward,
        performance: performance,
        timestamp: new Date()
      });

      // Update RL model
      await this.updateRLModel(userId, 'compliance', performance, reward);

      // Check for strategy updates
      await this.checkStrategyUpdates(userId, 'compliance', performance);

      return {
        success: true,
        performance: performance,
        reward: reward,
        learningData: await this.getLearningData(userId, 'compliance'),
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Compliance learning failed:', error);
      throw new Error('Failed to update compliance learning');
    }
  }

  /**
   * Update yield learning
   * @param {string} userId - User ID
   * @param {Object} yieldResult - Yield optimization result
   * @returns {Promise<Object>} Learning result
   */
  async updateYieldLearning(userId, yieldResult) {
    try {
      if (!this.learningConfig.learningEnabled) {
        return { status: 'disabled' };
      }

      // Analyze yield performance
      const performance = await this.performanceAnalyzer.analyzeYieldPerformance(yieldResult);

      // Calculate reward
      const reward = await this.calculateReward(performance, 'yield');

      // Store learning data
      await this.storeLearningData(userId, 'yield', {
        action: yieldResult.action,
        state: yieldResult.state,
        reward: reward,
        performance: performance,
        timestamp: new Date()
      });

      // Update RL model
      await this.updateRLModel(userId, 'yield', performance, reward);

      // Check for strategy updates
      await this.checkStrategyUpdates(userId, 'yield', performance);

      return {
        success: true,
        performance: performance,
        reward: reward,
        learningData: await this.getLearningData(userId, 'yield'),
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Yield learning failed:', error);
      throw new Error('Failed to update yield learning');
    }
  }

  /**
   * Calculate reward for performance
   * @param {Object} performance - Performance metrics
   * @param {string} agentType - Agent type
   * @returns {Promise<number>} Reward value
   */
  async calculateReward(performance, agentType) {
    try {
      let reward = 0;

      switch (this.learningConfig.rewardFunction) {
      case 'sharpe_ratio':
        reward = performance.sharpeRatio || 0;
        break;
      case 'profit':
        reward = performance.profit || 0;
        break;
      case 'accuracy':
        reward = performance.accuracy || 0;
        break;
      case 'composite':
        reward = this.calculateCompositeReward(performance, agentType);
        break;
      default:
        reward = performance.sharpeRatio || 0;
      }

      // Normalize reward to [-1, 1]
      reward = Math.max(-1, Math.min(1, reward));

      // Store reward history
      await this.storeRewardHistory(agentType, reward, performance);

      return reward;
    } catch (error) {
      logger.error('Reward calculation failed:', error);
      return 0;
    }
  }

  /**
   * Calculate composite reward
   * @param {Object} performance - Performance metrics
   * @param {string} agentType - Agent type
   * @returns {number} Composite reward
   */
  calculateCompositeReward(performance, agentType) {
    const weights = {
      portfolio: { sharpeRatio: 0.4, profit: 0.3, accuracy: 0.3 },
      trading: { accuracy: 0.5, profit: 0.3, efficiency: 0.2 },
      compliance: { accuracy: 0.6, violations: 0.2, efficiency: 0.2 },
      yield: { optimization: 0.5, profit: 0.3, risk: 0.2 }
    };

    const agentWeights = weights[agentType] || weights.portfolio;
    let reward = 0;

    for (const [metric, weight] of Object.entries(agentWeights)) {
      const value = performance[metric] || 0;
      reward += value * weight;
    }

    return reward;
  }

  /**
   * Update RL model
   * @param {string} userId - User ID
   * @param {string} agentType - Agent type
   * @param {Object} performance - Performance metrics
   * @param {number} reward - Reward value
   */
  async updateRLModel(userId, agentType, performance, reward) {
    try {
      // Get recent learning data
      const recentData = await this.getRecentLearningData(userId, agentType);

      if (recentData.length < this.learningConfig.batchSize) {
        return; // Not enough data for training
      }

      // Prepare training batch
      const trainingBatch = recentData.slice(-this.learningConfig.batchSize);

      // Update RL model
      await this.rlEngine.updateModel(userId, agentType, trainingBatch, {
        learningRate: this.learningConfig.learningRate,
        discountFactor: this.learningConfig.discountFactor
      });

      // Update performance history
      await this.updatePerformanceHistory(userId, agentType, performance);

    } catch (error) {
      logger.error('RL model update failed:', error);
    }
  }

  /**
   * Check for strategy updates
   * @param {string} userId - User ID
   * @param {string} agentType - Agent type
   * @param {Object} performance - Performance metrics
   */
  async checkStrategyUpdates(userId, agentType, performance) {
    try {
      // Get historical performance
      const historicalPerformance = await this.getPerformanceHistory(userId, agentType);

      if (historicalPerformance.length < 10) {
        return; // Not enough data for comparison
      }

      // Calculate performance improvement
      const recentPerformance = historicalPerformance.slice(-5);
      const olderPerformance = historicalPerformance.slice(-10, -5);

      const recentAvg = this.calculateAveragePerformance(recentPerformance);
      const olderAvg = this.calculateAveragePerformance(olderPerformance);

      const improvement = (recentAvg - olderAvg) / olderAvg;

      // Check if improvement exceeds threshold
      if (improvement > this.learningConfig.strategyUpdateThreshold) {
        // Optimize strategy
        const optimizedStrategy = await this.strategyOptimizer.optimizeStrategy(
          userId,
          agentType,
          performance,
          historicalPerformance
        );

        // Store strategy update
        await this.storeStrategyUpdate(userId, agentType, optimizedStrategy);

        logger.info(`Strategy updated for ${agentType} agent: ${improvement * 100}% improvement`);
      }

    } catch (error) {
      logger.error('Strategy update check failed:', error);
    }
  }

  /**
   * Start learning loop
   * @param {string} userId - User ID
   */
  startLearningLoop(userId) {
    const learningInterval = setInterval(async() => {
      try {
        if (!this.learningConfig.learningEnabled) {
          return;
        }

        // Update learning data
        await this.updateLearningData(userId);

        // Process feedback
        await this.processFeedback(userId);

        // Update models
        await this.updateAllModels(userId);

        // Clean up old data
        await this.cleanupOldData(userId);

      } catch (error) {
        logger.error(`Learning loop failed for user ${userId}:`, error);
      }
    }, this.learningConfig.updateFrequency);
  }

  /**
   * Update learning data
   * @param {string} userId - User ID
   */
  async updateLearningData(userId) {
    // This would update learning data from various sources
    // For now, it's a placeholder
  }

  /**
   * Process feedback
   * @param {string} userId - User ID
   */
  async processFeedback(userId) {
    try {
      const feedback = await this.feedbackProcessor.getFeedback(userId);

      if (feedback.length > 0) {
        await this.feedbackProcessor.processFeedback(userId, feedback);
      }
    } catch (error) {
      logger.error('Feedback processing failed:', error);
    }
  }

  /**
   * Update all models
   * @param {string} userId - User ID
   */
  async updateAllModels(userId) {
    const agentTypes = ['portfolio', 'trading', 'compliance', 'yield'];

    for (const agentType of agentTypes) {
      try {
        const recentData = await this.getRecentLearningData(userId, agentType);

        if (recentData.length >= this.learningConfig.batchSize) {
          await this.rlEngine.updateModel(userId, agentType, recentData, {
            learningRate: this.learningConfig.learningRate,
            discountFactor: this.learningConfig.discountFactor
          });
        }
      } catch (error) {
        logger.error(`Model update failed for ${agentType}:`, error);
      }
    }
  }

  /**
   * Clean up old data
   * @param {string} userId - User ID
   */
  async cleanupOldData(userId) {
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    const cutoffTime = new Date(Date.now() - maxAge);

    // Clean up learning data
    if (this.learningData.has(userId)) {
      const userData = this.learningData.get(userId);
      for (const [agentType, data] of Object.entries(userData)) {
        userData[agentType] = data.filter(entry => entry.timestamp > cutoffTime);
      }
    }

    // Clean up performance history
    if (this.performanceHistory.has(userId)) {
      const userHistory = this.performanceHistory.get(userId);
      for (const [agentType, history] of Object.entries(userHistory)) {
        userHistory[agentType] = history.filter(entry => entry.timestamp > cutoffTime);
      }
    }
  }

  /**
   * Store learning data
   * @param {string} userId - User ID
   * @param {string} agentType - Agent type
   * @param {Object} data - Learning data
   */
  async storeLearningData(userId, agentType, data) {
    if (!this.learningData.has(userId)) {
      this.learningData.set(userId, {
        portfolio: [],
        trading: [],
        compliance: [],
        yield: []
      });
    }

    const userData = this.learningData.get(userId);
    userData[agentType].push(data);

    // Keep only recent data
    if (userData[agentType].length > this.learningConfig.maxMemorySize) {
      userData[agentType] = userData[agentType].slice(-this.learningConfig.maxMemorySize);
    }
  }

  /**
   * Get learning data
   * @param {string} userId - User ID
   * @param {string} agentType - Agent type
   * @returns {Promise<Array>} Learning data
   */
  async getLearningData(userId, agentType) {
    const userData = this.learningData.get(userId);
    return userData ? userData[agentType] || [] : [];
  }

  /**
   * Get recent learning data
   * @param {string} userId - User ID
   * @param {string} agentType - Agent type
   * @returns {Promise<Array>} Recent learning data
   */
  async getRecentLearningData(userId, agentType) {
    const allData = await this.getLearningData(userId, agentType);
    return allData.slice(-this.learningConfig.batchSize);
  }

  /**
   * Store reward history
   * @param {string} agentType - Agent type
   * @param {number} reward - Reward value
   * @param {Object} performance - Performance metrics
   */
  async storeRewardHistory(agentType, reward, performance) {
    if (!this.rewardHistory.has(agentType)) {
      this.rewardHistory.set(agentType, []);
    }

    const history = this.rewardHistory.get(agentType);
    history.push({
      reward: reward,
      performance: performance,
      timestamp: new Date()
    });

    // Keep only recent data
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
  }

  /**
   * Update performance history
   * @param {string} userId - User ID
   * @param {string} agentType - Agent type
   * @param {Object} performance - Performance metrics
   */
  async updatePerformanceHistory(userId, agentType, performance) {
    if (!this.performanceHistory.has(userId)) {
      this.performanceHistory.set(userId, {
        portfolio: [],
        trading: [],
        compliance: [],
        yield: []
      });
    }

    const userHistory = this.performanceHistory.get(userId);
    userHistory[agentType].push({
      performance: performance,
      timestamp: new Date()
    });

    // Keep only recent data
    if (userHistory[agentType].length > 1000) {
      userHistory[agentType] = userHistory[agentType].slice(-1000);
    }
  }

  /**
   * Get performance history
   * @param {string} userId - User ID
   * @param {string} agentType - Agent type
   * @returns {Promise<Array>} Performance history
   */
  async getPerformanceHistory(userId, agentType) {
    const userHistory = this.performanceHistory.get(userId);
    return userHistory ? userHistory[agentType] || [] : [];
  }

  /**
   * Calculate average performance
   * @param {Array} performanceHistory - Performance history
   * @returns {number} Average performance
   */
  calculateAveragePerformance(performanceHistory) {
    if (performanceHistory.length === 0) return 0;

    const total = performanceHistory.reduce((sum, entry) => {
      return sum + (entry.performance.sharpeRatio || 0);
    }, 0);

    return total / performanceHistory.length;
  }

  /**
   * Store strategy update
   * @param {string} userId - User ID
   * @param {string} agentType - Agent type
   * @param {Object} strategy - Updated strategy
   */
  async storeStrategyUpdate(userId, agentType, strategy) {
    if (!this.strategyUpdates.has(userId)) {
      this.strategyUpdates.set(userId, {
        portfolio: [],
        trading: [],
        compliance: [],
        yield: []
      });
    }

    const userUpdates = this.strategyUpdates.get(userId);
    userUpdates[agentType].push({
      strategy: strategy,
      timestamp: new Date()
    });
  }

  /**
   * Get learning status
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Learning status
   */
  async getLearningStatus(userId) {
    const learningData = this.learningData.get(userId) || {};
    const performanceHistory = this.performanceHistory.get(userId) || {};
    const strategyUpdates = this.strategyUpdates.get(userId) || {};

    return {
      userId: userId,
      learningEnabled: this.learningConfig.learningEnabled,
      learningData: Object.keys(learningData).reduce((acc, key) => {
        acc[key] = learningData[key].length;
        return acc;
      }, {}),
      performanceHistory: Object.keys(performanceHistory).reduce((acc, key) => {
        acc[key] = performanceHistory[key].length;
        return acc;
      }, {}),
      strategyUpdates: Object.keys(strategyUpdates).reduce((acc, key) => {
        acc[key] = strategyUpdates[key].length;
        return acc;
      }, {}),
      config: this.learningConfig
    };
  }

  /**
   * Stop learning loop
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Stop result
   */
  async stop(userId) {
    return {
      success: true,
      userId: userId,
      timestamp: new Date()
    };
  }
}

export default LearningLoopService;
