/**
 * FinAI Nexus - Sample Data & Demo Scenarios Service
 *
 * Comprehensive sample data and demo scenarios for platform demonstration
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class SampleDataService {
  constructor() {
    this.demoUsers = new Map();
    this.demoPortfolios = new Map();
    this.demoTransactions = new Map();
    this.demoScenarios = new Map();
    this.demoAssets = new Map();
    this.demoAnalytics = new Map();

    this.initializeSampleData();
    logger.info('SampleDataService initialized');
  }

  /**
   * Initialize comprehensive sample data
   */
  initializeSampleData() {
    this.initializeDemoUsers();
    this.initializeDemoAssets();
    this.initializeDemoPortfolios();
    this.initializeDemoTransactions();
    this.initializeDemoScenarios();
    this.initializeDemoAnalytics();
  }

  /**
   * Initialize demo users with different profiles
   */
  initializeDemoUsers() {
    const userProfiles = [
      {
        id: 'demo-user-1',
        type: 'beginner',
        name: 'Alex Johnson',
        email: 'alex.johnson@demo.com',
        age: 28,
        riskTolerance: 'conservative',
        investmentGoals: ['retirement', 'emergency_fund'],
        experience: 'beginner',
        subscription: 'free',
        avatar: 'conservative_advisor',
        preferences: {
          language: 'en',
          theme: 'light',
          notifications: true,
          islamicMode: false
        },
        profile: {
          occupation: 'Software Developer',
          annualIncome: 75000,
          netWorth: 25000,
          timeHorizon: 'long_term',
          knowledge: ['basics', 'stocks']
        }
      },
      {
        id: 'demo-user-2',
        type: 'intermediate',
        name: 'Sarah Chen',
        email: 'sarah.chen@demo.com',
        age: 35,
        riskTolerance: 'moderate',
        investmentGoals: ['wealth_building', 'education'],
        experience: 'intermediate',
        subscription: 'premium',
        avatar: 'growth_mentor',
        preferences: {
          language: 'en',
          theme: 'dark',
          notifications: true,
          islamicMode: false
        },
        profile: {
          occupation: 'Marketing Manager',
          annualIncome: 95000,
          netWorth: 75000,
          timeHorizon: 'medium_term',
          knowledge: ['stocks', 'bonds', 'etfs', 'crypto']
        }
      },
      {
        id: 'demo-user-3',
        type: 'advanced',
        name: 'Ahmed Al-Rashid',
        email: 'ahmed.alrashid@demo.com',
        age: 42,
        riskTolerance: 'aggressive',
        investmentGoals: ['wealth_building', 'tax_optimization'],
        experience: 'advanced',
        subscription: 'professional',
        avatar: 'islamic_advisor',
        preferences: {
          language: 'ar',
          theme: 'light',
          notifications: true,
          islamicMode: true
        },
        profile: {
          occupation: 'Investment Banker',
          annualIncome: 180000,
          netWorth: 450000,
          timeHorizon: 'long_term',
          knowledge: ['stocks', 'bonds', 'etfs', 'crypto', 'options', 'futures', 'real_estate']
        }
      },
      {
        id: 'demo-user-4',
        type: 'enterprise',
        name: 'Maria Rodriguez',
        email: 'maria.rodriguez@enterprise.com',
        age: 38,
        riskTolerance: 'balanced',
        investmentGoals: ['institutional_investing', 'risk_management'],
        experience: 'expert',
        subscription: 'enterprise',
        avatar: 'institutional_advisor',
        preferences: {
          language: 'en',
          theme: 'auto',
          notifications: true,
          islamicMode: false
        },
        profile: {
          occupation: 'Portfolio Manager',
          annualIncome: 250000,
          netWorth: 1200000,
          timeHorizon: 'institutional',
          knowledge: ['all_asset_classes', 'derivatives', 'alternatives', 'quantitative_strategies']
        }
      }
    ];

    userProfiles.forEach(user => {
      this.demoUsers.set(user.id, user);
    });
  }

  /**
   * Initialize demo assets across different categories
   */
  initializeDemoAssets() {
    const assets = [
      // Stocks
      {
        id: 'AAPL',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        sector: 'technology',
        price: 175.43,
        change: 2.15,
        changePercent: 1.24,
        volume: 45234567,
        marketCap: 2750000000000,
        pe: 28.5,
        dividend: 0.96,
        description: 'Global technology company focusing on consumer electronics and software'
      },
      {
        id: 'TSLA',
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        type: 'stock',
        sector: 'automotive',
        price: 248.87,
        change: -5.23,
        changePercent: -2.06,
        volume: 89345678,
        marketCap: 785000000000,
        pe: 45.2,
        dividend: 0,
        description: 'Electric vehicle and clean energy company'
      },
      {
        id: 'JPM',
        symbol: 'JPM',
        name: 'JPMorgan Chase & Co.',
        type: 'stock',
        sector: 'financial',
        price: 156.78,
        change: 1.45,
        changePercent: 0.93,
        volume: 12345678,
        marketCap: 456000000000,
        pe: 12.8,
        dividend: 4.00,
        description: 'Leading global financial services firm'
      },
      // Crypto
      {
        id: 'BTC',
        symbol: 'BTC',
        name: 'Bitcoin',
        type: 'cryptocurrency',
        price: 43250.67,
        change: 1250.43,
        changePercent: 2.98,
        volume: 2345678901,
        marketCap: 845000000000,
        description: 'Decentralized digital currency'
      },
      {
        id: 'ETH',
        symbol: 'ETH',
        name: 'Ethereum',
        type: 'cryptocurrency',
        price: 2650.34,
        change: -45.67,
        changePercent: -1.69,
        volume: 1567890123,
        marketCap: 318000000000,
        description: 'Decentralized platform for smart contracts'
      },
      // ETFs
      {
        id: 'SPY',
        symbol: 'SPY',
        name: 'SPDR S&P 500 ETF Trust',
        type: 'etf',
        sector: 'diversified',
        price: 445.67,
        change: 2.34,
        changePercent: 0.53,
        volume: 45678901,
        marketCap: 385000000000,
        expenseRatio: 0.0945,
        description: 'Tracks the S&P 500 index'
      },
      {
        id: 'QQQ',
        symbol: 'QQQ',
        name: 'Invesco QQQ Trust',
        type: 'etf',
        sector: 'technology',
        price: 378.45,
        change: -1.23,
        changePercent: -0.32,
        volume: 34567890,
        marketCap: 195000000000,
        expenseRatio: 0.20,
        description: 'Tracks the NASDAQ-100 index'
      },
      // Bonds
      {
        id: 'TLT',
        symbol: 'TLT',
        name: 'iShares 20+ Year Treasury Bond ETF',
        type: 'bond_etf',
        sector: 'fixed_income',
        price: 98.45,
        change: 0.67,
        changePercent: 0.68,
        volume: 12345678,
        yield: 4.25,
        duration: 16.8,
        description: 'Long-term US Treasury bonds'
      },
      // Commodities
      {
        id: 'GLD',
        symbol: 'GLD',
        name: 'SPDR Gold Trust',
        type: 'commodity_etf',
        sector: 'commodities',
        price: 185.67,
        change: 1.23,
        changePercent: 0.67,
        volume: 8765432,
        description: 'Gold bullion ETF'
      },
      {
        id: 'USO',
        symbol: 'USO',
        name: 'United States Oil Fund',
        type: 'commodity_etf',
        sector: 'energy',
        price: 67.89,
        change: -0.45,
        changePercent: -0.66,
        volume: 23456789,
        description: 'Crude oil futures ETF'
      }
    ];

    assets.forEach(asset => {
      this.demoAssets.set(asset.id, asset);
    });
  }

  /**
   * Initialize demo portfolios for different user types
   */
  initializeDemoPortfolios() {
    const portfolios = [
      {
        id: 'portfolio-beginner-1',
        userId: 'demo-user-1',
        name: 'Conservative Growth',
        type: 'conservative',
        totalValue: 25000,
        totalGain: 1250,
        totalGainPercent: 5.26,
        riskLevel: 'low',
        diversification: 'high',
        holdings: [
          { assetId: 'SPY', shares: 45, value: 20055, gain: 945, gainPercent: 4.95 },
          { assetId: 'TLT', shares: 30, value: 2953.5, gain: 201, gainPercent: 7.31 },
          { assetId: 'GLD', shares: 5, value: 928.35, gain: 104, gainPercent: 12.61 }
        ],
        allocation: {
          stocks: 80.22,
          bonds: 11.81,
          commodities: 3.71,
          cash: 4.26
        },
        performance: {
          daily: 0.53,
          weekly: 2.15,
          monthly: 5.26,
          quarterly: 8.45,
          yearly: 12.34
        }
      },
      {
        id: 'portfolio-intermediate-1',
        userId: 'demo-user-2',
        name: 'Balanced Growth',
        type: 'balanced',
        totalValue: 75000,
        totalGain: 5625,
        totalGainPercent: 8.10,
        riskLevel: 'medium',
        diversification: 'high',
        holdings: [
          { assetId: 'AAPL', shares: 100, value: 17543, gain: 2150, gainPercent: 13.96 },
          { assetId: 'TSLA', shares: 50, value: 12443.5, gain: 1234, gainPercent: 11.02 },
          { assetId: 'SPY', shares: 80, value: 35653.6, gain: 1783, gainPercent: 5.27 },
          { assetId: 'QQQ', shares: 30, value: 11353.5, gain: 458, gainPercent: 4.20 }
        ],
        allocation: {
          stocks: 85.45,
          bonds: 8.20,
          crypto: 3.15,
          cash: 3.20
        },
        performance: {
          daily: 0.85,
          weekly: 3.42,
          monthly: 8.10,
          quarterly: 15.67,
          yearly: 24.89
        }
      },
      {
        id: 'portfolio-advanced-1',
        userId: 'demo-user-3',
        name: 'Islamic Growth Portfolio',
        type: 'islamic_balanced',
        totalValue: 450000,
        totalGain: 67500,
        totalGainPercent: 17.65,
        riskLevel: 'high',
        diversification: 'very_high',
        holdings: [
          { assetId: 'AAPL', shares: 500, value: 87715, gain: 10750, gainPercent: 13.96 },
          { assetId: 'JPM', shares: 800, value: 125424, gain: 11600, gainPercent: 10.19 },
          { assetId: 'SPY', shares: 400, value: 178268, gain: 8915, gainPercent: 5.27 },
          { assetId: 'BTC', shares: 2.5, value: 108126.68, gain: 31531.68, gainPercent: 41.15 },
          { assetId: 'ETH', shares: 10, value: 26503.4, gain: 4532.4, gainPercent: 20.64 }
        ],
        allocation: {
          stocks: 65.20,
          crypto: 29.90,
          bonds: 3.45,
          cash: 1.45
        },
        performance: {
          daily: 1.25,
          weekly: 5.67,
          monthly: 17.65,
          quarterly: 32.45,
          yearly: 58.90
        }
      },
      {
        id: 'portfolio-enterprise-1',
        userId: 'demo-user-4',
        name: 'Institutional Portfolio',
        type: 'institutional',
        totalValue: 1200000,
        totalGain: 180000,
        totalGainPercent: 17.65,
        riskLevel: 'balanced',
        diversification: 'maximum',
        holdings: [
          { assetId: 'AAPL', shares: 1500, value: 263145, gain: 32250, gainPercent: 13.96 },
          { assetId: 'TSLA', shares: 800, value: 199096, gain: 19744, gainPercent: 11.02 },
          { assetId: 'JPM', shares: 2000, value: 313560, gain: 29000, gainPercent: 10.19 },
          { assetId: 'SPY', shares: 1000, value: 445670, gain: 22285, gainPercent: 5.27 },
          { assetId: 'QQQ', shares: 500, value: 189225, gain: 7630, gainPercent: 4.20 },
          { assetId: 'BTC', shares: 5, value: 216253.35, gain: 63063.35, gainPercent: 41.15 },
          { assetId: 'ETH', shares: 20, value: 53006.8, gain: 9064.8, gainPercent: 20.64 },
          { assetId: 'TLT', shares: 200, value: 19690, gain: 1340, gainPercent: 7.31 }
        ],
        allocation: {
          stocks: 68.45,
          crypto: 22.45,
          bonds: 7.35,
          alternatives: 1.25,
          cash: 0.50
        },
        performance: {
          daily: 1.15,
          weekly: 5.23,
          monthly: 17.65,
          quarterly: 32.45,
          yearly: 58.90
        }
      }
    ];

    portfolios.forEach(portfolio => {
      this.demoPortfolios.set(portfolio.id, portfolio);
    });
  }

  /**
   * Initialize demo transactions
   */
  initializeDemoTransactions() {
    const transactions = [
      // Recent transactions for demo-user-1
      {
        id: 'tx-1',
        userId: 'demo-user-1',
        type: 'buy',
        assetId: 'SPY',
        shares: 10,
        price: 445.67,
        amount: 4456.7,
        fee: 4.46,
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        status: 'completed'
      },
      {
        id: 'tx-2',
        userId: 'demo-user-1',
        type: 'buy',
        assetId: 'TLT',
        shares: 5,
        price: 98.45,
        amount: 492.25,
        fee: 0.49,
        timestamp: new Date(Date.now() - 172800000), // 2 days ago
        status: 'completed'
      },
      // Recent transactions for demo-user-2
      {
        id: 'tx-3',
        userId: 'demo-user-2',
        type: 'buy',
        assetId: 'AAPL',
        shares: 20,
        price: 175.43,
        amount: 3508.6,
        fee: 0, // Premium subscription
        timestamp: new Date(Date.now() - 259200000), // 3 days ago
        status: 'completed'
      },
      {
        id: 'tx-4',
        userId: 'demo-user-2',
        type: 'sell',
        assetId: 'TSLA',
        shares: 10,
        price: 248.87,
        amount: 2488.7,
        fee: 0,
        timestamp: new Date(Date.now() - 345600000), // 4 days ago
        status: 'completed'
      },
      // Recent transactions for demo-user-3
      {
        id: 'tx-5',
        userId: 'demo-user-3',
        type: 'buy',
        assetId: 'BTC',
        shares: 0.5,
        price: 43250.67,
        amount: 21625.335,
        fee: 21.63,
        timestamp: new Date(Date.now() - 432000000), // 5 days ago
        status: 'completed'
      },
      {
        id: 'tx-6',
        userId: 'demo-user-3',
        type: 'buy',
        assetId: 'JPM',
        shares: 100,
        price: 156.78,
        amount: 15678,
        fee: 0, // Professional subscription
        timestamp: new Date(Date.now() - 518400000), // 6 days ago
        status: 'completed'
      }
    ];

    transactions.forEach(transaction => {
      this.demoTransactions.set(transaction.id, transaction);
    });
  }

  /**
   * Initialize demo scenarios
   */
  initializeDemoScenarios() {
    const scenarios = [
      {
        id: 'scenario-beginner-1',
        name: 'First Investment Journey',
        type: 'educational',
        targetUser: 'beginner',
        description: 'Learn the basics of investing with a conservative approach',
        steps: [
          {
            step: 1,
            title: 'Set Investment Goals',
            description: 'Define your financial objectives and time horizon',
            action: 'goal_setting',
            expectedOutcome: 'Clear investment goals defined'
          },
          {
            step: 2,
            title: 'Risk Assessment',
            description: 'Complete risk tolerance questionnaire',
            action: 'risk_assessment',
            expectedOutcome: 'Risk profile determined'
          },
          {
            step: 3,
            title: 'Portfolio Creation',
            description: 'Create your first diversified portfolio',
            action: 'portfolio_creation',
            expectedOutcome: 'Conservative portfolio created'
          },
          {
            step: 4,
            title: 'First Investment',
            description: 'Make your first investment in a low-risk ETF',
            action: 'first_investment',
            expectedOutcome: 'First investment completed'
          }
        ],
        successMetrics: {
          goalSetting: 100,
          riskAssessment: 100,
          portfolioCreated: 100,
          firstInvestment: 100
        }
      },
      {
        id: 'scenario-intermediate-1',
        name: 'Growth Portfolio Optimization',
        type: 'optimization',
        targetUser: 'intermediate',
        description: 'Optimize your portfolio for better returns while managing risk',
        steps: [
          {
            step: 1,
            title: 'Portfolio Analysis',
            description: 'Analyze current portfolio performance and allocation',
            action: 'portfolio_analysis',
            expectedOutcome: 'Portfolio insights generated'
          },
          {
            step: 2,
            title: 'AI Recommendations',
            description: 'Get AI-powered investment recommendations',
            action: 'ai_recommendations',
            expectedOutcome: 'Personalized recommendations received'
          },
          {
            step: 3,
            title: 'Rebalancing',
            description: 'Rebalance portfolio based on recommendations',
            action: 'portfolio_rebalancing',
            expectedOutcome: 'Portfolio rebalanced'
          },
          {
            step: 4,
            title: 'Performance Tracking',
            description: 'Monitor improved performance over time',
            action: 'performance_tracking',
            expectedOutcome: 'Performance improvements observed'
          }
        ],
        successMetrics: {
          analysisCompleted: 100,
          recommendationsReceived: 100,
          rebalancingDone: 100,
          performanceImproved: 85
        }
      },
      {
        id: 'scenario-advanced-1',
        name: 'Islamic Finance Portfolio',
        type: 'specialized',
        targetUser: 'advanced',
        description: 'Build a Shari\'ah-compliant investment portfolio',
        steps: [
          {
            step: 1,
            title: 'Shari\'ah Screening',
            description: 'Screen investments for Shari\'ah compliance',
            action: 'shariah_screening',
            expectedOutcome: 'Compliant investments identified'
          },
          {
            step: 2,
            title: 'Portfolio Construction',
            description: 'Build diversified Islamic portfolio',
            action: 'islamic_portfolio_construction',
            expectedOutcome: 'Islamic portfolio created'
          },
          {
            step: 3,
            title: 'Zakat Calculation',
            description: 'Calculate and set up Zakat payments',
            action: 'zakat_calculation',
            expectedOutcome: 'Zakat obligations calculated'
          },
          {
            step: 4,
            title: 'Performance Monitoring',
            description: 'Monitor Islamic portfolio performance',
            action: 'islamic_performance_monitoring',
            expectedOutcome: 'Shari\'ah-compliant performance tracking'
          }
        ],
        successMetrics: {
          screeningCompleted: 100,
          portfolioConstructed: 100,
          zakatCalculated: 100,
          monitoringActive: 100
        }
      },
      {
        id: 'scenario-enterprise-1',
        name: 'Institutional Portfolio Management',
        type: 'institutional',
        targetUser: 'enterprise',
        description: 'Manage large-scale institutional investment portfolio',
        steps: [
          {
            step: 1,
            title: 'Risk Management',
            description: 'Implement comprehensive risk management framework',
            action: 'risk_management_setup',
            expectedOutcome: 'Risk framework established'
          },
          {
            step: 2,
            title: 'Multi-Asset Allocation',
            description: 'Optimize allocation across multiple asset classes',
            action: 'multi_asset_allocation',
            expectedOutcome: 'Optimal allocation achieved'
          },
          {
            step: 3,
            title: 'Compliance Monitoring',
            description: 'Set up regulatory compliance monitoring',
            action: 'compliance_monitoring',
            expectedOutcome: 'Compliance systems active'
          },
          {
            step: 4,
            title: 'Performance Reporting',
            description: 'Generate institutional-grade performance reports',
            action: 'performance_reporting',
            expectedOutcome: 'Comprehensive reports generated'
          }
        ],
        successMetrics: {
          riskManagementActive: 100,
          allocationOptimized: 95,
          complianceActive: 100,
          reportingAutomated: 100
        }
      }
    ];

    scenarios.forEach(scenario => {
      this.demoScenarios.set(scenario.id, scenario);
    });
  }

  /**
   * Initialize demo analytics data
   */
  initializeDemoAnalytics() {
    const analytics = {
      marketOverview: {
        totalMarketCap: 125000000000000, // $125 trillion
        dailyVolume: 450000000000, // $450 billion
        marketTrend: 'bullish',
        volatilityIndex: 18.5,
        fearGreedIndex: 65, // Greed
        topGainers: ['AAPL', 'MSFT', 'GOOGL'],
        topLosers: ['TSLA', 'NVDA', 'AMZN'],
        sectorPerformance: {
          technology: 12.5,
          healthcare: 8.2,
          financial: 6.8,
          energy: -2.1,
          utilities: 4.5
        }
      },
      userMetrics: {
        totalUsers: 125000,
        activeUsers: 89000,
        premiumSubscribers: 45000,
        averagePortfolioValue: 125000,
        totalAssetsUnderManagement: 15625000000, // $15.6 billion
        userGrowthRate: 15.5,
        retentionRate: 87.3
      },
      performanceMetrics: {
        averageReturn: 12.8,
        bestPerformingStrategy: 'AI_Optimized_Balanced',
        worstPerformingStrategy: 'Conservative_Income',
        riskAdjustedReturn: 1.85,
        sharpeRatio: 1.42,
        maxDrawdown: -8.5,
        winRate: 68.5
      }
    };

    this.demoAnalytics.set('platform_analytics', analytics);
  }

  /**
   * Get demo user by ID
   */
  getDemoUser(userId) {
    return this.demoUsers.get(userId);
  }

  /**
   * Get demo users by type
   */
  getDemoUsersByType(type) {
    return Array.from(this.demoUsers.values())
      .filter(user => user.type === type);
  }

  /**
   * Get demo portfolio by user ID
   */
  getDemoPortfolio(userId) {
    return Array.from(this.demoPortfolios.values())
      .find(portfolio => portfolio.userId === userId);
  }

  /**
   * Get demo transactions by user ID
   */
  getDemoTransactions(userId, limit = 10) {
    return Array.from(this.demoTransactions.values())
      .filter(tx => tx.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get demo scenario by ID
   */
  getDemoScenario(scenarioId) {
    return this.demoScenarios.get(scenarioId);
  }

  /**
   * Get demo scenarios by user type
   */
  getDemoScenariosByUserType(userType) {
    return Array.from(this.demoScenarios.values())
      .filter(scenario => scenario.targetUser === userType);
  }

  /**
   * Get demo assets
   */
  getDemoAssets(filters = {}) {
    let assets = Array.from(this.demoAssets.values());

    if (filters.type) {
      assets = assets.filter(asset => asset.type === filters.type);
    }

    if (filters.sector) {
      assets = assets.filter(asset => asset.sector === filters.sector);
    }

    if (filters.limit) {
      assets = assets.slice(0, filters.limit);
    }

    return assets;
  }

  /**
   * Get platform analytics
   */
  getPlatformAnalytics() {
    return this.demoAnalytics.get('platform_analytics');
  }

  /**
   * Generate demo scenario execution
   */
  async executeDemoScenario(scenarioId, userId) {
    const scenario = this.demoScenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Demo scenario not found: ${scenarioId}`);
    }

    const executionId = uuidv4();
    const startTime = Date.now();

    const execution = {
      id: executionId,
      scenarioId,
      userId,
      status: 'running',
      startTime: new Date(),
      completedSteps: [],
      currentStep: 1,
      progress: 0,
      metrics: {}
    };

    logger.info(`🎯 Executing demo scenario: ${scenario.name} for user ${userId}`);

    // Simulate scenario execution
    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];

      // Simulate step execution delay
      await this.simulateDelay(1000, 3000);

      execution.completedSteps.push({
        step: step.step,
        title: step.title,
        status: 'completed',
        completedAt: new Date(),
        outcome: step.expectedOutcome
      });

      execution.currentStep = i + 2;
      execution.progress = Math.round(((i + 1) / scenario.steps.length) * 100);

      logger.info(`✅ Completed step ${step.step}: ${step.title}`);
    }

    execution.status = 'completed';
    execution.endTime = new Date();
    execution.duration = Date.now() - startTime;
    execution.progress = 100;

    logger.info(`🎉 Demo scenario completed in ${execution.duration}ms`);

    return execution;
  }

  /**
   * Get comprehensive demo data for a user
   */
  getDemoDataForUser(userId) {
    const user = this.getDemoUser(userId);
    if (!user) {
      throw new Error(`Demo user not found: ${userId}`);
    }

    const portfolio = this.getDemoPortfolio(userId);
    const transactions = this.getDemoTransactions(userId, 20);
    const scenarios = this.getDemoScenariosByUserType(user.type);
    const analytics = this.getPlatformAnalytics();

    return {
      user,
      portfolio,
      transactions,
      availableScenarios: scenarios,
      platformAnalytics: analytics,
      recommendations: this.generateDemoRecommendations(user, portfolio),
      insights: this.generateDemoInsights(user, portfolio, analytics)
    };
  }

  /**
   * Generate demo recommendations
   */
  generateDemoRecommendations(user, portfolio) {
    const recommendations = [];

    if (user.type === 'beginner') {
      recommendations.push({
        type: 'education',
        priority: 'high',
        title: 'Learn About Diversification',
        description: 'Consider adding more asset classes to reduce risk',
        action: 'educational_content',
        estimatedImpact: 'risk_reduction'
      });
    }

    if (portfolio && portfolio.totalGainPercent < 5) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        title: 'Portfolio Optimization',
        description: 'Your portfolio could benefit from AI-powered optimization',
        action: 'ai_optimization',
        estimatedImpact: 'performance_improvement'
      });
    }

    if (user.subscription === 'free' && portfolio && portfolio.totalValue > 10000) {
      recommendations.push({
        type: 'upgrade',
        priority: 'low',
        title: 'Upgrade to Premium',
        description: 'Unlock advanced features and reduce trading fees',
        action: 'subscription_upgrade',
        estimatedImpact: 'cost_savings'
      });
    }

    return recommendations;
  }

  /**
   * Generate demo insights
   */
  generateDemoInsights(user, portfolio, analytics) {
    const insights = [];

    if (portfolio) {
      insights.push({
        type: 'performance',
        title: 'Portfolio Performance',
        description: `Your portfolio has gained ${portfolio.totalGainPercent}% this year`,
        value: portfolio.totalGainPercent,
        comparison: analytics.performanceMetrics.averageReturn,
        trend: portfolio.totalGainPercent > analytics.performanceMetrics.averageReturn ? 'above_average' : 'below_average'
      });

      insights.push({
        type: 'diversification',
        title: 'Diversification Score',
        description: `Your portfolio has ${portfolio.diversification} diversification`,
        value: portfolio.diversification,
        recommendation: portfolio.diversification === 'high' ? 'excellent' : 'consider_improvement'
      });
    }

    insights.push({
      type: 'market',
      title: 'Market Sentiment',
      description: `Current market sentiment is ${analytics.marketOverview.marketTrend}`,
      value: analytics.marketOverview.fearGreedIndex,
      recommendation: analytics.marketOverview.fearGreedIndex > 70 ? 'consider_profit_taking' : 'opportunity_to_buy'
    });

    return insights;
  }

  /**
   * Simulate delay for demo purposes
   */
  async simulateDelay(minMs, maxMs) {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      return {
        status: 'healthy',
        service: 'sample-data-demo',
        metrics: {
          totalDemoUsers: this.demoUsers.size,
          totalDemoPortfolios: this.demoPortfolios.size,
          totalDemoTransactions: this.demoTransactions.size,
          totalDemoScenarios: this.demoScenarios.size,
          totalDemoAssets: this.demoAssets.size
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'sample-data-demo',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = SampleDataService;
