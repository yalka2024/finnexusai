/**
 * FinAI Nexus - Interactive Tutorials & Guided Tours Service
 *
 * Comprehensive tutorial system with guided tours and interactive learning
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class InteractiveTutorialService {
  constructor() {
    this.tutorials = new Map();
    this.tourSteps = new Map();
    this.userProgress = new Map();
    this.tutorialSessions = new Map();
    this.learningPaths = new Map();
    this.achievements = new Map();

    this.initializeTutorials();
    this.initializeLearningPaths();
    this.initializeAchievements();
    logger.info('InteractiveTutorialService initialized');
  }

  /**
   * Initialize comprehensive tutorials
   */
  initializeTutorials() {
    const tutorials = [
      {
        id: 'getting-started',
        title: 'Getting Started with FinAI Nexus',
        description: 'Complete beginner guide to using the platform',
        category: 'onboarding',
        difficulty: 'beginner',
        duration: '15-20 minutes',
        prerequisites: [],
        steps: [
          {
            id: 'welcome',
            title: 'Welcome to FinAI Nexus',
            type: 'information',
            content: {
              text: 'Welcome to the future of AI-powered financial management! This tutorial will guide you through the essential features of our platform.',
              media: 'welcome_video.mp4',
              highlights: ['AI-powered insights', 'Real-time portfolio tracking', 'Educational content']
            },
            action: 'display_welcome',
            target: 'main_dashboard',
            validation: 'user_acknowledgment'
          },
          {
            id: 'account-setup',
            title: 'Complete Your Profile',
            type: 'interactive',
            content: {
              text: 'Let\'s set up your investment profile to get personalized recommendations.',
              form: 'profile_setup',
              fields: ['risk_tolerance', 'investment_goals', 'time_horizon', 'experience_level']
            },
            action: 'open_profile_form',
            target: 'profile_settings',
            validation: 'profile_completed'
          },
          {
            id: 'first-portfolio',
            title: 'Create Your First Portfolio',
            type: 'guided_action',
            content: {
              text: 'Now let\'s create your first investment portfolio with our AI recommendations.',
              guide: 'portfolio_creation',
              recommendations: true
            },
            action: 'create_portfolio',
            target: 'portfolio_creation_page',
            validation: 'portfolio_created'
          },
          {
            id: 'make-first-investment',
            title: 'Make Your First Investment',
            type: 'guided_action',
            content: {
              text: 'Ready to invest? Let\'s make your first investment with our guided process.',
              guide: 'investment_process',
              demoMode: true
            },
            action: 'start_investment',
            target: 'trading_interface',
            validation: 'investment_completed'
          },
          {
            id: 'explore-dashboard',
            title: 'Explore Your Dashboard',
            type: 'guided_tour',
            content: {
              text: 'Let\'s explore your dashboard and understand all the features available to you.',
              tour: 'dashboard_tour',
              highlights: ['portfolio_overview', 'market_data', 'ai_insights', 'learning_center']
            },
            action: 'start_dashboard_tour',
            target: 'dashboard',
            validation: 'tour_completed'
          }
        ],
        completionReward: {
          type: 'achievement',
          name: 'First Steps',
          points: 100,
          badge: 'beginner_badge'
        }
      },
      {
        id: 'ai-features',
        title: 'Mastering AI-Powered Features',
        description: 'Learn how to leverage AI for better investment decisions',
        category: 'ai_tools',
        difficulty: 'intermediate',
        duration: '25-30 minutes',
        prerequisites: ['getting-started'],
        steps: [
          {
            id: 'ai-insights',
            title: 'Understanding AI Insights',
            type: 'information',
            content: {
              text: 'Our AI analyzes market data, news, and your portfolio to provide actionable insights.',
              examples: ['market_trends', 'risk_alerts', 'opportunity_identification'],
              interactive: 'ai_demo'
            },
            action: 'show_ai_insights',
            target: 'ai_insights_panel',
            validation: 'insights_viewed'
          },
          {
            id: 'emotion-detection',
            title: 'Emotion-Aware Trading',
            type: 'interactive',
            content: {
              text: 'Our emotion detection helps you make rational investment decisions.',
              demo: 'emotion_detection_demo',
              scenarios: ['fear_based_selling', 'greed_based_buying', 'panic_trading']
            },
            action: 'demo_emotion_detection',
            target: 'emotion_interface',
            validation: 'emotion_demo_completed'
          },
          {
            id: 'ai-recommendations',
            title: 'AI Investment Recommendations',
            type: 'guided_action',
            content: {
              text: 'Learn how to interpret and act on AI recommendations.',
              guide: 'recommendation_analysis',
              examples: ['buy_signals', 'sell_signals', 'hold_recommendations']
            },
            action: 'analyze_recommendations',
            target: 'recommendations_page',
            validation: 'recommendations_analyzed'
          },
          {
            id: 'ai-portfolio-optimization',
            title: 'AI Portfolio Optimization',
            type: 'guided_action',
            content: {
              text: 'Use AI to optimize your portfolio allocation for better returns.',
              guide: 'portfolio_optimization',
              simulation: true
            },
            action: 'optimize_portfolio',
            target: 'portfolio_optimization_tool',
            validation: 'optimization_completed'
          }
        ],
        completionReward: {
          type: 'achievement',
          name: 'AI Master',
          points: 250,
          badge: 'ai_expert_badge'
        }
      },
      {
        id: 'advanced-trading',
        title: 'Advanced Trading Strategies',
        description: 'Master advanced trading techniques and strategies',
        category: 'trading',
        difficulty: 'advanced',
        duration: '35-40 minutes',
        prerequisites: ['getting-started', 'ai-features'],
        steps: [
          {
            id: 'technical-analysis',
            title: 'Technical Analysis Tools',
            type: 'interactive',
            content: {
              text: 'Learn to use our advanced technical analysis tools.',
              tools: ['chart_patterns', 'indicators', 'trend_analysis'],
              practice: 'technical_analysis_practice'
            },
            action: 'open_technical_analysis',
            target: 'technical_analysis_tools',
            validation: 'technical_analysis_practiced'
          },
          {
            id: 'options-trading',
            title: 'Options Trading Basics',
            type: 'educational',
            content: {
              text: 'Understand options trading strategies and risk management.',
              concepts: ['calls_puts', 'strike_price', 'expiration', 'greeks'],
              simulation: 'options_simulator'
            },
            action: 'start_options_tutorial',
            target: 'options_trading_interface',
            validation: 'options_concepts_learned'
          },
          {
            id: 'crypto-trading',
            title: 'Cryptocurrency Trading',
            type: 'guided_action',
            content: {
              text: 'Navigate the world of cryptocurrency trading safely.',
              topics: ['crypto_fundamentals', 'defi_protocols', 'risk_management'],
              demo: 'crypto_trading_demo'
            },
            action: 'explore_crypto_trading',
            target: 'crypto_trading_platform',
            validation: 'crypto_demo_completed'
          },
          {
            id: 'risk-management',
            title: 'Advanced Risk Management',
            type: 'educational',
            content: {
              text: 'Master advanced risk management techniques.',
              strategies: ['stop_losses', 'position_sizing', 'diversification', 'hedging'],
              calculator: 'risk_calculator'
            },
            action: 'open_risk_management',
            target: 'risk_management_tools',
            validation: 'risk_management_learned'
          }
        ],
        completionReward: {
          type: 'achievement',
          name: 'Trading Expert',
          points: 500,
          badge: 'trading_master_badge'
        }
      },
      {
        id: 'islamic-finance',
        title: 'Islamic Finance Principles',
        description: 'Learn Shari\'ah-compliant investment strategies',
        category: 'specialized',
        difficulty: 'intermediate',
        duration: '30-35 minutes',
        prerequisites: ['getting-started'],
        steps: [
          {
            id: 'shariah-principles',
            title: 'Understanding Shari\'ah Principles',
            type: 'educational',
            content: {
              text: 'Learn the fundamental principles of Islamic finance.',
              principles: ['no_riba', 'no_gharar', 'no_maysir', 'halal_business'],
              examples: 'shariah_examples'
            },
            action: 'learn_shariah_principles',
            target: 'islamic_finance_education',
            validation: 'principles_understood'
          },
          {
            id: 'shariah-screening',
            title: 'Shari\'ah Screening Process',
            type: 'interactive',
            content: {
              text: 'Understand how investments are screened for Shari\'ah compliance.',
              process: 'screening_process',
              criteria: 'screening_criteria',
              demo: 'screening_demo'
            },
            action: 'demo_shariah_screening',
            target: 'shariah_screening_tool',
            validation: 'screening_demo_completed'
          },
          {
            id: 'islamic-portfolio',
            title: 'Building Islamic Portfolio',
            type: 'guided_action',
            content: {
              text: 'Create a diversified Shari\'ah-compliant portfolio.',
              guide: 'islamic_portfolio_construction',
              assets: 'halal_assets'
            },
            action: 'build_islamic_portfolio',
            target: 'islamic_portfolio_builder',
            validation: 'islamic_portfolio_created'
          },
          {
            id: 'zakat-calculation',
            title: 'Zakat Calculation and Payment',
            type: 'interactive',
            content: {
              text: 'Learn to calculate and manage your Zakat obligations.',
              calculator: 'zakat_calculator',
              guidelines: 'zakat_guidelines'
            },
            action: 'open_zakat_calculator',
            target: 'zakat_calculation_tool',
            validation: 'zakat_calculated'
          }
        ],
        completionReward: {
          type: 'achievement',
          name: 'Islamic Finance Scholar',
          points: 300,
          badge: 'islamic_finance_badge'
        }
      }
    ];

    tutorials.forEach(tutorial => {
      this.tutorials.set(tutorial.id, tutorial);
    });
  }

  /**
   * Initialize learning paths
   */
  initializeLearningPaths() {
    const learningPaths = [
      {
        id: 'beginner-path',
        name: 'Beginner Investor Path',
        description: 'Complete learning path for new investors',
        duration: '2-3 hours',
        difficulty: 'beginner',
        tutorials: ['getting-started', 'ai-features'],
        prerequisites: [],
        outcomes: [
          'Understand basic investment concepts',
          'Create and manage a portfolio',
          'Use AI-powered insights effectively',
          'Make informed investment decisions'
        ],
        certification: 'Beginner Investor Certificate'
      },
      {
        id: 'intermediate-path',
        name: 'Intermediate Investor Path',
        description: 'Advanced strategies for experienced investors',
        duration: '4-5 hours',
        difficulty: 'intermediate',
        tutorials: ['getting-started', 'ai-features', 'advanced-trading'],
        prerequisites: ['beginner-path'],
        outcomes: [
          'Master advanced trading strategies',
          'Implement sophisticated risk management',
          'Use technical analysis effectively',
          'Optimize portfolio performance'
        ],
        certification: 'Intermediate Investor Certificate'
      },
      {
        id: 'islamic-path',
        name: 'Islamic Finance Specialist Path',
        description: 'Specialized path for Islamic finance principles',
        duration: '3-4 hours',
        difficulty: 'intermediate',
        tutorials: ['getting-started', 'islamic-finance'],
        prerequisites: [],
        outcomes: [
          'Understand Islamic finance principles',
          'Build Shari\'ah-compliant portfolios',
          'Calculate and manage Zakat',
          'Navigate Islamic investment options'
        ],
        certification: 'Islamic Finance Specialist Certificate'
      },
      {
        id: 'expert-path',
        name: 'Expert Investor Path',
        description: 'Comprehensive path for investment experts',
        duration: '6-8 hours',
        difficulty: 'expert',
        tutorials: ['getting-started', 'ai-features', 'advanced-trading', 'islamic-finance'],
        prerequisites: ['beginner-path', 'intermediate-path'],
        outcomes: [
          'Master all platform features',
          'Implement advanced strategies',
          'Lead investment education',
          'Mentor other investors'
        ],
        certification: 'Expert Investor Certificate'
      }
    ];

    learningPaths.forEach(path => {
      this.learningPaths.set(path.id, path);
    });
  }

  /**
   * Initialize achievements system
   */
  initializeAchievements() {
    const achievements = [
      {
        id: 'first-steps',
        name: 'First Steps',
        description: 'Complete your first tutorial',
        icon: 'beginner_badge',
        points: 100,
        rarity: 'common',
        category: 'onboarding'
      },
      {
        id: 'ai-master',
        name: 'AI Master',
        description: 'Master AI-powered features',
        icon: 'ai_expert_badge',
        points: 250,
        rarity: 'uncommon',
        category: 'ai_tools'
      },
      {
        id: 'trading-expert',
        name: 'Trading Expert',
        description: 'Complete advanced trading tutorial',
        icon: 'trading_master_badge',
        points: 500,
        rarity: 'rare',
        category: 'trading'
      },
      {
        id: 'islamic-scholar',
        name: 'Islamic Finance Scholar',
        description: 'Complete Islamic finance tutorial',
        icon: 'islamic_finance_badge',
        points: 300,
        rarity: 'uncommon',
        category: 'specialized'
      },
      {
        id: 'learning-champion',
        name: 'Learning Champion',
        description: 'Complete 5 tutorials',
        icon: 'learning_champion_badge',
        points: 750,
        rarity: 'rare',
        category: 'milestone'
      },
      {
        id: 'knowledge-master',
        name: 'Knowledge Master',
        description: 'Complete all tutorials',
        icon: 'knowledge_master_badge',
        points: 1500,
        rarity: 'legendary',
        category: 'milestone'
      }
    ];

    achievements.forEach(achievement => {
      this.achievements.set(achievement.id, achievement);
    });
  }

  /**
   * Start tutorial for user
   */
  async startTutorial(userId, tutorialId) {
    const tutorial = this.tutorials.get(tutorialId);
    if (!tutorial) {
      throw new Error(`Tutorial not found: ${tutorialId}`);
    }

    // Check prerequisites
    const userProgress = this.getUserProgress(userId);
    for (const prerequisite of tutorial.prerequisites) {
      if (!userProgress.completedTutorials.includes(prerequisite)) {
        throw new Error(`Prerequisites not met. Complete ${prerequisite} first.`);
      }
    }

    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      userId,
      tutorialId,
      startTime: new Date(),
      status: 'active',
      currentStep: 0,
      completedSteps: [],
      progress: 0,
      timeSpent: 0,
      interactions: []
    };

    this.tutorialSessions.set(sessionId, session);
    this.updateUserProgress(userId, 'tutorial_started', tutorialId);

    logger.info(`🎓 Tutorial started: ${tutorial.title} for user ${userId}`);

    return session;
  }

  /**
   * Complete tutorial step
   */
  async completeTutorialStep(sessionId, stepId, validationData = {}) {
    const session = this.tutorialSessions.get(sessionId);
    if (!session) {
      throw new Error(`Tutorial session not found: ${sessionId}`);
    }

    const tutorial = this.tutorials.get(session.tutorialId);
    const step = tutorial.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Tutorial step not found: ${stepId}`);
    }

    // Validate step completion
    const isValid = await this.validateStepCompletion(step, validationData);
    if (!isValid) {
      throw new Error(`Step validation failed: ${stepId}`);
    }

    // Update session
    session.completedSteps.push({
      stepId,
      completedAt: new Date(),
      validationData,
      timeSpent: Date.now() - session.startTime
    });

    session.currentStep++;
    session.progress = Math.round((session.completedSteps.length / tutorial.steps.length) * 100);

    // Record interaction
    session.interactions.push({
      type: 'step_completed',
      stepId,
      timestamp: new Date(),
      data: validationData
    });

    logger.info(`✅ Tutorial step completed: ${step.title}`);

    return session;
  }

  /**
   * Complete tutorial
   */
  async completeTutorial(sessionId) {
    const session = this.tutorialSessions.get(sessionId);
    if (!session) {
      throw new Error(`Tutorial session not found: ${sessionId}`);
    }

    const tutorial = this.tutorials.get(session.tutorialId);

    // Check if all steps are completed
    if (session.completedSteps.length !== tutorial.steps.length) {
      throw new Error('Not all tutorial steps have been completed');
    }

    // Update session
    session.status = 'completed';
    session.endTime = new Date();
    session.progress = 100;
    session.timeSpent = session.endTime - session.startTime;

    // Update user progress
    this.updateUserProgress(session.userId, 'tutorial_completed', tutorial.id);

    // Award completion reward
    if (tutorial.completionReward) {
      this.awardAchievement(session.userId, tutorial.completionReward);
    }

    logger.info(`🎉 Tutorial completed: ${tutorial.title} in ${session.timeSpent}ms`);

    return session;
  }

  /**
   * Get tutorial by ID
   */
  getTutorial(tutorialId) {
    return this.tutorials.get(tutorialId);
  }

  /**
   * Get tutorials by category
   */
  getTutorialsByCategory(category) {
    return Array.from(this.tutorials.values())
      .filter(tutorial => tutorial.category === category);
  }

  /**
   * Get tutorials for user based on progress
   */
  getAvailableTutorials(userId) {
    const userProgress = this.getUserProgress(userId);
    const completedTutorials = userProgress.completedTutorials;

    return Array.from(this.tutorials.values()).map(tutorial => ({
      ...tutorial,
      available: tutorial.prerequisites.every(prereq => completedTutorials.includes(prereq)),
      completed: completedTutorials.includes(tutorial.id),
      progress: userProgress.tutorialProgress[tutorial.id] || 0
    }));
  }

  /**
   * Get learning path by ID
   */
  getLearningPath(pathId) {
    return this.learningPaths.get(pathId);
  }

  /**
   * Get learning paths for user
   */
  getAvailableLearningPaths(userId) {
    const userProgress = this.getUserProgress(userId);
    const completedTutorials = userProgress.completedTutorials;

    return Array.from(this.learningPaths.values()).map(path => ({
      ...path,
      available: path.prerequisites.every(prereq => completedTutorials.includes(prereq)),
      completed: path.tutorials.every(tutorialId => completedTutorials.includes(tutorialId)),
      progress: this.calculatePathProgress(path, completedTutorials)
    }));
  }

  /**
   * Get user progress
   */
  getUserProgress(userId) {
    if (!this.userProgress.has(userId)) {
      this.userProgress.set(userId, {
        userId,
        completedTutorials: [],
        tutorialProgress: {},
        achievements: [],
        totalPoints: 0,
        learningStreak: 0,
        lastLearningDate: null,
        timeSpent: 0
      });
    }

    return this.userProgress.get(userId);
  }

  /**
   * Update user progress
   */
  updateUserProgress(userId, action, data) {
    const progress = this.getUserProgress(userId);

    switch (action) {
    case 'tutorial_started':
      progress.tutorialProgress[data] = 0;
      break;
    case 'tutorial_completed':
      if (!progress.completedTutorials.includes(data)) {
        progress.completedTutorials.push(data);
      }
      progress.tutorialProgress[data] = 100;
      break;
    case 'step_completed':
      const tutorial = this.tutorials.get(data.tutorialId);
      const progressPercent = Math.round((data.stepIndex + 1) / tutorial.steps.length * 100);
      progress.tutorialProgress[data.tutorialId] = progressPercent;
      break;
    }

    this.userProgress.set(userId, progress);
  }

  /**
   * Award achievement
   */
  awardAchievement(userId, achievementData) {
    const progress = this.getUserProgress(userId);
    const achievement = this.achievements.get(achievementData.name.toLowerCase().replace(/\s+/g, '-'));

    if (achievement && !progress.achievements.includes(achievement.id)) {
      progress.achievements.push(achievement.id);
      progress.totalPoints += achievement.points;

      logger.info(`🏆 Achievement unlocked: ${achievement.name} (+${achievement.points} points)`);

      return achievement;
    }

    return null;
  }

  /**
   * Get user achievements
   */
  getUserAchievements(userId) {
    const progress = this.getUserProgress(userId);
    return progress.achievements.map(achievementId => this.achievements.get(achievementId));
  }

  /**
   * Calculate learning path progress
   */
  calculatePathProgress(path, completedTutorials) {
    const completedInPath = path.tutorials.filter(tutorialId => completedTutorials.includes(tutorialId));
    return Math.round((completedInPath.length / path.tutorials.length) * 100);
  }

  /**
   * Validate step completion
   */
  async validateStepCompletion(step, validationData) {
    switch (step.validation) {
    case 'user_acknowledgment':
      return validationData.acknowledged === true;
    case 'profile_completed':
      return validationData.profileCompleted === true;
    case 'portfolio_created':
      return validationData.portfolioId !== undefined;
    case 'investment_completed':
      return validationData.transactionId !== undefined;
    case 'tour_completed':
      return validationData.tourCompleted === true;
    default:
      return true; // Default to valid for demo purposes
    }
  }

  /**
   * Start guided tour
   */
  async startGuidedTour(userId, tourType, targetElement = null) {
    const tourId = uuidv4();

    const tourSteps = this.getTourSteps(tourType);
    if (!tourSteps) {
      throw new Error(`Tour type not found: ${tourType}`);
    }

    const tour = {
      id: tourId,
      userId,
      type: tourType,
      startTime: new Date(),
      status: 'active',
      currentStep: 0,
      steps: tourSteps,
      targetElement
    };

    this.tourSteps.set(tourId, tour);

    logger.info(`🎯 Guided tour started: ${tourType} for user ${userId}`);

    return tour;
  }

  /**
   * Get tour steps by type
   */
  getTourSteps(tourType) {
    const tourSteps = {
      'dashboard_tour': [
        {
          id: 'portfolio_overview',
          title: 'Portfolio Overview',
          description: 'Here you can see your total portfolio value, gains/losses, and performance metrics.',
          target: '#portfolio-overview',
          position: 'bottom',
          action: 'highlight_element'
        },
        {
          id: 'market_data',
          title: 'Market Data',
          description: 'Real-time market data and news to help you make informed decisions.',
          target: '#market-data',
          position: 'left',
          action: 'highlight_element'
        },
        {
          id: 'ai_insights',
          title: 'AI Insights',
          description: 'AI-powered insights and recommendations based on your portfolio and market conditions.',
          target: '#ai-insights',
          position: 'right',
          action: 'highlight_element'
        },
        {
          id: 'learning_center',
          title: 'Learning Center',
          description: 'Access tutorials, courses, and educational content to improve your investing skills.',
          target: '#learning-center',
          position: 'top',
          action: 'highlight_element'
        }
      ],
      'portfolio_tour': [
        {
          id: 'portfolio_holdings',
          title: 'Your Holdings',
          description: 'View all your investments, their current value, and performance.',
          target: '#portfolio-holdings',
          position: 'bottom',
          action: 'highlight_element'
        },
        {
          id: 'allocation_chart',
          title: 'Asset Allocation',
          description: 'See how your investments are distributed across different asset classes.',
          target: '#allocation-chart',
          position: 'left',
          action: 'highlight_element'
        },
        {
          id: 'performance_chart',
          title: 'Performance Chart',
          description: 'Track your portfolio performance over time.',
          target: '#performance-chart',
          position: 'right',
          action: 'highlight_element'
        }
      ],
      'trading_tour': [
        {
          id: 'trading_interface',
          title: 'Trading Interface',
          description: 'Buy and sell investments with our intuitive trading interface.',
          target: '#trading-interface',
          position: 'bottom',
          action: 'highlight_element'
        },
        {
          id: 'order_book',
          title: 'Order Book',
          description: 'View pending orders and order history.',
          target: '#order-book',
          position: 'left',
          action: 'highlight_element'
        },
        {
          id: 'market_orders',
          title: 'Market Orders',
          description: 'Execute trades at current market prices.',
          target: '#market-orders',
          position: 'right',
          action: 'highlight_element'
        }
      ]
    };

    return tourSteps[tourType];
  }

  /**
   * Get tutorial analytics
   */
  getTutorialAnalytics() {
    const sessions = Array.from(this.tutorialSessions.values());
    const userProgress = Array.from(this.userProgress.values());

    return {
      totalTutorials: this.tutorials.size,
      totalSessions: sessions.length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      averageCompletionRate: sessions.length > 0 ?
        (sessions.filter(s => s.status === 'completed').length / sessions.length) * 100 : 0,
      averageTimeSpent: sessions.length > 0 ?
        sessions.reduce((sum, s) => sum + s.timeSpent, 0) / sessions.length : 0,
      popularTutorials: this.getPopularTutorials(sessions),
      userEngagement: {
        totalUsers: userProgress.length,
        activeLearners: userProgress.filter(u => u.completedTutorials.length > 0).length,
        averageProgress: userProgress.length > 0 ?
          userProgress.reduce((sum, u) => sum + u.completedTutorials.length, 0) / userProgress.length : 0
      }
    };
  }

  /**
   * Get popular tutorials
   */
  getPopularTutorials(sessions) {
    const tutorialCounts = {};

    sessions.forEach(session => {
      tutorialCounts[session.tutorialId] = (tutorialCounts[session.tutorialId] || 0) + 1;
    });

    return Object.entries(tutorialCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tutorialId, count]) => ({
        tutorialId,
        title: this.tutorials.get(tutorialId)?.title || tutorialId,
        sessionCount: count
      }));
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      return {
        status: 'healthy',
        service: 'interactive-tutorials',
        metrics: {
          totalTutorials: this.tutorials.size,
          totalLearningPaths: this.learningPaths.size,
          totalAchievements: this.achievements.size,
          activeSessions: Array.from(this.tutorialSessions.values()).filter(s => s.status === 'active').length,
          totalUsers: this.userProgress.size
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'interactive-tutorials',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = InteractiveTutorialService;
