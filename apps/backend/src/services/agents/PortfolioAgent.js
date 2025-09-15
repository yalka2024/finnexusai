/**
 * FinAI Nexus - Portfolio Agent
 * 
 * Autonomous portfolio management agent with:
 * - Real-time portfolio monitoring
 * - Automated rebalancing
 * - Risk management
 * - Performance optimization
 * - Voice command execution
 * - Learning and adaptation
 */

import { PortfolioAnalyzer } from '../portfolio/PortfolioAnalyzer.js';
import { RiskManager } from '../risk/RiskManager.js';
import { RebalancingEngine } from '../rebalancing/RebalancingEngine.js';
import { PerformanceOptimizer } from '../performance/PerformanceOptimizer.js';
import { xAIGrokAPI } from '../ai/xAIGrokAPI.js';

export class PortfolioAgent {
  constructor() {
    this.analyzer = new PortfolioAnalyzer();
    this.riskManager = new RiskManager();
    this.rebalancingEngine = new RebalancingEngine();
    this.performanceOptimizer = new PerformanceOptimizer();
    this.grokAPI = new xAIGrokAPI();
    
    this.isActive = false;
    this.portfolio = null;
    this.objectives = null;
    this.strategies = new Map();
    this.performanceHistory = [];
    this.learningData = [];
    
    this.agentConfig = {
      rebalancingThreshold: 0.05, // 5% deviation triggers rebalancing
      riskThreshold: 0.8, // 80% of max risk
      performanceThreshold: 0.02, // 2% underperformance triggers optimization
      updateFrequency: 5000, // 5 seconds
      learningRate: 0.01,
      maxStrategies: 10,
      voiceCommands: true
    };
  }

  /**
   * Initialize portfolio agent
   * @param {string} userId - User ID
   * @param {Object} config - Agent configuration
   * @returns {Promise<Object>} Initialization result
   */
  async initialize(userId, config = {}) {
    try {
      this.userId = userId;
      this.agentConfig = { ...this.agentConfig, ...config };
      
      // Initialize components
      await this.analyzer.initialize(userId, config.analyzer);
      await this.riskManager.initialize(userId, config.risk);
      await this.rebalancingEngine.initialize(userId, config.rebalancing);
      await this.performanceOptimizer.initialize(userId, config.performance);
      
      // Initialize strategies
      await this.initializeStrategies();
      
      return {
        status: 'initialized',
        userId: userId,
        config: this.agentConfig,
        strategies: Array.from(this.strategies.keys())
      };
    } catch (error) {
      console.error('Portfolio agent initialization failed:', error);
      throw new Error('Failed to initialize portfolio agent');
    }
  }

  /**
   * Start portfolio management
   * @param {Object} portfolio - Portfolio data
   * @param {Object} objectives - Management objectives
   * @returns {Promise<Object>} Management result
   */
  async startManagement(portfolio, objectives) {
    try {
      this.portfolio = portfolio;
      this.objectives = objectives;
      this.isActive = true;
      
      // Analyze current portfolio
      const analysis = await this.analyzer.analyzePortfolio(portfolio);
      
      // Assess risk
      const riskAssessment = await this.riskManager.assessRisk(portfolio, objectives);
      
      // Select optimal strategy
      const strategy = await this.selectOptimalStrategy(analysis, riskAssessment);
      
      // Start monitoring
      this.startMonitoring();
      
      return {
        success: true,
        portfolio: portfolio,
        objectives: objectives,
        analysis: analysis,
        riskAssessment: riskAssessment,
        strategy: strategy,
        isActive: this.isActive,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Portfolio management start failed:', error);
      throw new Error('Failed to start portfolio management');
    }
  }

  /**
   * Start portfolio monitoring
   */
  startMonitoring() {
    const monitoringInterval = setInterval(async () => {
      try {
        if (!this.isActive) {
          clearInterval(monitoringInterval);
          return;
        }
        
        // Update portfolio analysis
        await this.updatePortfolioAnalysis();
        
        // Check for rebalancing needs
        await this.checkRebalancingNeeds();
        
        // Check risk levels
        await this.checkRiskLevels();
        
        // Check performance
        await this.checkPerformance();
        
        // Update learning data
        await this.updateLearningData();
        
      } catch (error) {
        console.error('Portfolio monitoring failed:', error);
      }
    }, this.agentConfig.updateFrequency);
  }

  /**
   * Update portfolio analysis
   */
  async updatePortfolioAnalysis() {
    if (!this.portfolio) return;
    
    const analysis = await this.analyzer.analyzePortfolio(this.portfolio);
    this.portfolio.analysis = analysis;
    
    // Store performance history
    this.performanceHistory.push({
      timestamp: new Date(),
      analysis: analysis,
      portfolio: { ...this.portfolio }
    });
    
    // Keep only last 1000 entries
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-1000);
    }
  }

  /**
   * Check rebalancing needs
   */
  async checkRebalancingNeeds() {
    if (!this.portfolio || !this.objectives) return;
    
    const currentWeights = this.portfolio.weights;
    const targetWeights = this.objectives.targetWeights;
    
    // Calculate deviation
    const deviation = this.calculateWeightDeviation(currentWeights, targetWeights);
    
    if (deviation > this.agentConfig.rebalancingThreshold) {
      // Trigger rebalancing
      await this.executeRebalancing();
    }
  }

  /**
   * Execute rebalancing
   */
  async executeRebalancing() {
    try {
      const rebalancingPlan = await this.rebalancingEngine.createRebalancingPlan(
        this.portfolio,
        this.objectives
      );
      
      // Execute rebalancing trades
      const rebalancingResult = await this.rebalancingEngine.executeRebalancing(rebalancingPlan);
      
      // Update portfolio
      this.portfolio = rebalancingResult.updatedPortfolio;
      
      // Log rebalancing
      console.log(`Portfolio rebalancing executed for user ${this.userId}:`, rebalancingResult);
      
    } catch (error) {
      console.error('Rebalancing execution failed:', error);
    }
  }

  /**
   * Check risk levels
   */
  async checkRiskLevels() {
    if (!this.portfolio || !this.objectives) return;
    
    const riskAssessment = await this.riskManager.assessRisk(this.portfolio, this.objectives);
    
    if (riskAssessment.riskLevel > this.agentConfig.riskThreshold) {
      // Trigger risk reduction
      await this.executeRiskReduction(riskAssessment);
    }
  }

  /**
   * Execute risk reduction
   */
  async executeRiskReduction(riskAssessment) {
    try {
      const riskReductionPlan = await this.riskManager.createRiskReductionPlan(
        this.portfolio,
        riskAssessment
      );
      
      // Execute risk reduction trades
      const riskReductionResult = await this.riskManager.executeRiskReduction(riskReductionPlan);
      
      // Update portfolio
      this.portfolio = riskReductionResult.updatedPortfolio;
      
      // Log risk reduction
      console.log(`Risk reduction executed for user ${this.userId}:`, riskReductionResult);
      
    } catch (error) {
      console.error('Risk reduction execution failed:', error);
    }
  }

  /**
   * Check performance
   */
  async checkPerformance() {
    if (!this.portfolio || !this.objectives) return;
    
    const performance = await this.performanceOptimizer.analyzePerformance(
      this.portfolio,
      this.objectives
    );
    
    if (performance.underperformance > this.agentConfig.performanceThreshold) {
      // Trigger performance optimization
      await this.executePerformanceOptimization(performance);
    }
  }

  /**
   * Execute performance optimization
   */
  async executePerformanceOptimization(performance) {
    try {
      const optimizationPlan = await this.performanceOptimizer.createOptimizationPlan(
        this.portfolio,
        performance
      );
      
      // Execute optimization trades
      const optimizationResult = await this.performanceOptimizer.executeOptimization(optimizationPlan);
      
      // Update portfolio
      this.portfolio = optimizationResult.updatedPortfolio;
      
      // Log optimization
      console.log(`Performance optimization executed for user ${this.userId}:`, optimizationResult);
      
    } catch (error) {
      console.error('Performance optimization execution failed:', error);
    }
  }

  /**
   * Execute voice command
   * @param {string} action - Command action
   * @param {Object} parameters - Command parameters
   * @returns {Promise<Object>} Command execution result
   */
  async executeCommand(action, parameters) {
    try {
      switch (action) {
        case 'rebalance':
          return await this.executeRebalancing();
        case 'optimize':
          return await this.executePerformanceOptimization(parameters.performance);
        case 'reduce_risk':
          return await this.executeRiskReduction(parameters.riskAssessment);
        case 'change_strategy':
          return await this.changeStrategy(parameters.strategy);
        case 'pause_management':
          return await this.pauseManagement();
        case 'resume_management':
          return await this.resumeManagement();
        case 'get_status':
          return await this.getStatus();
        case 'get_performance':
          return await this.getPerformanceMetrics();
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error(`Command execution failed: ${action}`, error);
      throw new Error(`Failed to execute command: ${action}`);
    }
  }

  /**
   * Change portfolio strategy
   * @param {string} strategyName - Strategy name
   * @returns {Promise<Object>} Strategy change result
   */
  async changeStrategy(strategyName) {
    try {
      if (!this.strategies.has(strategyName)) {
        throw new Error(`Strategy not found: ${strategyName}`);
      }
      
      const strategy = this.strategies.get(strategyName);
      await strategy.initialize(this.portfolio, this.objectives);
      
      // Update objectives with new strategy
      this.objectives.strategy = strategyName;
      
      return {
        success: true,
        strategy: strategyName,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Strategy change failed:', error);
      throw new Error('Failed to change strategy');
    }
  }

  /**
   * Pause portfolio management
   * @returns {Promise<Object>} Pause result
   */
  async pauseManagement() {
    this.isActive = false;
    
    return {
      success: true,
      isActive: false,
      timestamp: new Date()
    };
  }

  /**
   * Resume portfolio management
   * @returns {Promise<Object>} Resume result
   */
  async resumeManagement() {
    this.isActive = true;
    
    return {
      success: true,
      isActive: true,
      timestamp: new Date()
    };
  }

  /**
   * Get agent status
   * @returns {Promise<Object>} Agent status
   */
  async getStatus() {
    return {
      isActive: this.isActive,
      portfolio: this.portfolio,
      objectives: this.objectives,
      strategies: Array.from(this.strategies.keys()),
      performanceHistory: this.performanceHistory.length,
      config: this.agentConfig
    };
  }

  /**
   * Get performance metrics
   * @returns {Promise<Object>} Performance metrics
   */
  async getPerformanceMetrics() {
    if (this.performanceHistory.length === 0) {
      return {
        accuracy: 0,
        profit: 0,
        trades: 0,
        sharpeRatio: 0,
        maxDrawdown: 0
      };
    }
    
    const recentPerformance = this.performanceHistory.slice(-100);
    const accuracy = this.calculateAccuracy(recentPerformance);
    const profit = this.calculateProfit(recentPerformance);
    const trades = this.calculateTradeCount(recentPerformance);
    const sharpeRatio = this.calculateSharpeRatio(recentPerformance);
    const maxDrawdown = this.calculateMaxDrawdown(recentPerformance);
    
    return {
      accuracy: accuracy,
      profit: profit,
      trades: trades,
      sharpeRatio: sharpeRatio,
      maxDrawdown: maxDrawdown
    };
  }

  /**
   * Update learning data
   */
  async updateLearningData() {
    if (this.performanceHistory.length < 2) return;
    
    const recentData = this.performanceHistory.slice(-10);
    const learningData = {
      portfolio: this.portfolio,
      performance: recentData,
      timestamp: new Date()
    };
    
    this.learningData.push(learningData);
    
    // Keep only last 1000 entries
    if (this.learningData.length > 1000) {
      this.learningData = this.learningData.slice(-1000);
    }
  }

  /**
   * Initialize portfolio strategies
   */
  async initializeStrategies() {
    const strategies = [
      'conservative',
      'balanced',
      'aggressive',
      'momentum',
      'mean_reversion',
      'risk_parity',
      'black_litterman',
      'ml_optimized'
    ];
    
    for (const strategyName of strategies) {
      const strategy = await this.createStrategy(strategyName);
      this.strategies.set(strategyName, strategy);
    }
  }

  /**
   * Create portfolio strategy
   * @param {string} strategyName - Strategy name
   * @returns {Promise<Object>} Strategy object
   */
  async createStrategy(strategyName) {
    const strategyConfig = {
      conservative: {
        riskTolerance: 0.3,
        rebalancingFrequency: 'monthly',
        diversification: 'high'
      },
      balanced: {
        riskTolerance: 0.5,
        rebalancingFrequency: 'weekly',
        diversification: 'medium'
      },
      aggressive: {
        riskTolerance: 0.8,
        rebalancingFrequency: 'daily',
        diversification: 'low'
      },
      momentum: {
        riskTolerance: 0.6,
        rebalancingFrequency: 'daily',
        diversification: 'medium',
        momentumPeriod: 20
      },
      mean_reversion: {
        riskTolerance: 0.4,
        rebalancingFrequency: 'weekly',
        diversification: 'high',
        reversionPeriod: 30
      },
      risk_parity: {
        riskTolerance: 0.5,
        rebalancingFrequency: 'weekly',
        diversification: 'high',
        riskTarget: 'equal'
      },
      black_litterman: {
        riskTolerance: 0.5,
        rebalancingFrequency: 'monthly',
        diversification: 'medium',
        views: 'market_implied'
      },
      ml_optimized: {
        riskTolerance: 0.6,
        rebalancingFrequency: 'daily',
        diversification: 'adaptive',
        mlModel: 'neural_network'
      }
    };
    
    return {
      name: strategyName,
      config: strategyConfig[strategyName] || strategyConfig.balanced,
      initialize: async (portfolio, objectives) => {
        // Initialize strategy-specific parameters
        console.log(`Initializing ${strategyName} strategy`);
      },
      optimize: async (portfolio, objectives) => {
        // Strategy-specific optimization logic
        console.log(`Optimizing with ${strategyName} strategy`);
      }
    };
  }

  /**
   * Select optimal strategy
   * @param {Object} analysis - Portfolio analysis
   * @param {Object} riskAssessment - Risk assessment
   * @returns {Promise<Object>} Selected strategy
   */
  async selectOptimalStrategy(analysis, riskAssessment) {
    // Use AI to select optimal strategy
    const prompt = `Select the optimal portfolio strategy based on:
    Portfolio Analysis: ${JSON.stringify(analysis)}
    Risk Assessment: ${JSON.stringify(riskAssessment)}
    Available Strategies: ${Array.from(this.strategies.keys())}
    
    Return the best strategy name and reasoning.`;
    
    const aiResponse = await this.grokAPI.generateResponse(prompt);
    const strategyName = this.extractStrategyName(aiResponse);
    
    return this.strategies.get(strategyName) || this.strategies.get('balanced');
  }

  /**
   * Extract strategy name from AI response
   * @param {string} response - AI response
   * @returns {string} Strategy name
   */
  extractStrategyName(response) {
    const strategies = Array.from(this.strategies.keys());
    for (const strategy of strategies) {
      if (response.toLowerCase().includes(strategy.toLowerCase())) {
        return strategy;
      }
    }
    return 'balanced';
  }

  /**
   * Calculate weight deviation
   * @param {Array} currentWeights - Current weights
   * @param {Array} targetWeights - Target weights
   * @returns {number} Deviation
   */
  calculateWeightDeviation(currentWeights, targetWeights) {
    if (!currentWeights || !targetWeights) return 0;
    
    let deviation = 0;
    for (let i = 0; i < currentWeights.length; i++) {
      deviation += Math.abs(currentWeights[i] - targetWeights[i]);
    }
    
    return deviation / currentWeights.length;
  }

  /**
   * Calculate accuracy
   * @param {Array} performanceHistory - Performance history
   * @returns {number} Accuracy
   */
  calculateAccuracy(performanceHistory) {
    if (performanceHistory.length < 2) return 0;
    
    let correctPredictions = 0;
    let totalPredictions = 0;
    
    for (let i = 1; i < performanceHistory.length; i++) {
      const current = performanceHistory[i];
      const previous = performanceHistory[i - 1];
      
      if (current.analysis && previous.analysis) {
        const predictedDirection = current.analysis.expectedReturn > 0 ? 1 : -1;
        const actualDirection = current.analysis.actualReturn > 0 ? 1 : -1;
        
        if (predictedDirection === actualDirection) {
          correctPredictions++;
        }
        totalPredictions++;
      }
    }
    
    return totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
  }

  /**
   * Calculate profit
   * @param {Array} performanceHistory - Performance history
   * @returns {number} Profit
   */
  calculateProfit(performanceHistory) {
    if (performanceHistory.length < 2) return 0;
    
    const first = performanceHistory[0];
    const last = performanceHistory[performanceHistory.length - 1];
    
    if (first.portfolio && last.portfolio) {
      return last.portfolio.totalValue - first.portfolio.totalValue;
    }
    
    return 0;
  }

  /**
   * Calculate trade count
   * @param {Array} performanceHistory - Performance history
   * @returns {number} Trade count
   */
  calculateTradeCount(performanceHistory) {
    // Count rebalancing events
    return performanceHistory.filter(entry => entry.rebalancing).length;
  }

  /**
   * Calculate Sharpe ratio
   * @param {Array} performanceHistory - Performance history
   * @returns {number} Sharpe ratio
   */
  calculateSharpeRatio(performanceHistory) {
    if (performanceHistory.length < 2) return 0;
    
    const returns = performanceHistory
      .map(entry => entry.analysis?.actualReturn || 0)
      .filter(return_ => return_ !== 0);
    
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, return_) => sum + Math.pow(return_ - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? avgReturn / stdDev : 0;
  }

  /**
   * Calculate maximum drawdown
   * @param {Array} performanceHistory - Performance history
   * @returns {number} Maximum drawdown
   */
  calculateMaxDrawdown(performanceHistory) {
    if (performanceHistory.length < 2) return 0;
    
    let maxValue = 0;
    let maxDrawdown = 0;
    
    for (const entry of performanceHistory) {
      if (entry.portfolio && entry.portfolio.totalValue) {
        maxValue = Math.max(maxValue, entry.portfolio.totalValue);
        const drawdown = (maxValue - entry.portfolio.totalValue) / maxValue;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }
    
    return maxDrawdown;
  }

  /**
   * Stop agent
   * @returns {Promise<Object>} Stop result
   */
  async stop() {
    this.isActive = false;
    
    return {
      success: true,
      isActive: false,
      timestamp: new Date()
    };
  }
}

export default PortfolioAgent;
