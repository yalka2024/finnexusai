/**
 * FinAI Nexus - User Onboarding Service
 *
 * Interactive tutorials, guided tours, and user education system
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class UserOnboardingService {
  constructor() {
    this.tutorials = new Map();
    this.onboardingFlows = new Map();
    this.userProgress = new Map();
    this.interactiveTours = new Map();
    this.onboardingMetrics = new Map();

    this.initializeTutorials();
    this.initializeOnboardingFlows();
    this.initializeInteractiveTours();
    logger.info('UserOnboardingService initialized');
  }

  /**
   * Initialize tutorials
   */
  initializeTutorials() {
    // Platform Overview Tutorial
    this.tutorials.set('platform-overview', {
      id: 'platform-overview',
      title: 'Welcome to FinAI Nexus',
      description: 'Get started with the basics of our AI-powered financial platform',
      category: 'getting-started',
      difficulty: 'beginner',
      estimatedTime: '10 minutes',
      steps: [
        {
          step: 1,
          title: 'Welcome Message',
          content: 'Welcome to FinAI Nexus! Your AI-powered financial companion.',
          type: 'text',
          interactive: false,
          highlight: 'header'
        },
        {
          step: 2,
          title: 'Dashboard Overview',
          content: 'Your main dashboard shows portfolio, AI insights, and trading tools.',
          type: 'highlight',
          interactive: true,
          highlight: 'dashboard',
          action: 'showDashboard'
        },
        {
          step: 3,
          title: 'AI Avatar Introduction',
          content: 'Meet your personal AI financial advisor and trading mentor.',
          type: 'interactive',
          interactive: true,
          highlight: 'ai-avatar',
          action: 'introduceAvatar'
        },
        {
          step: 4,
          title: 'Portfolio Setup',
          content: 'Set up your investment portfolio with AI recommendations.',
          type: 'guided-action',
          interactive: true,
          highlight: 'portfolio-setup',
          action: 'setupPortfolio'
        },
        {
          step: 5,
          title: 'Trading Interface',
          content: 'Learn how to execute trades using our advanced trading tools.',
          type: 'highlight',
          interactive: true,
          highlight: 'trading-interface',
          action: 'showTrading'
        }
      ],
      prerequisites: [],
      rewards: {
        points: 100,
        badge: 'welcome-badge',
        achievement: 'Platform Explorer'
      }
    });

    // AI Features Tutorial
    this.tutorials.set('ai-features', {
      id: 'ai-features',
      title: 'AI-Powered Features',
      description: 'Discover how AI enhances your financial decisions',
      category: 'ai-features',
      difficulty: 'intermediate',
      estimatedTime: '15 minutes',
      steps: [
        {
          step: 1,
          title: 'AI Analysis',
          content: 'AI analyzes market trends and provides investment insights.',
          type: 'demo',
          interactive: true,
          highlight: 'ai-analysis',
          action: 'runAIAnalysis'
        },
        {
          step: 2,
          title: 'Emotion Detection',
          content: 'Our system detects your emotional state to provide personalized advice.',
          type: 'interactive',
          interactive: true,
          highlight: 'emotion-detection',
          action: 'detectEmotion'
        },
        {
          step: 3,
          title: 'Predictive Analytics',
          content: 'AI predicts market movements and portfolio performance.',
          type: 'visualization',
          interactive: true,
          highlight: 'predictions',
          action: 'showPredictions'
        },
        {
          step: 4,
          title: 'Risk Assessment',
          content: 'AI evaluates investment risks and suggests diversification.',
          type: 'guided-action',
          interactive: true,
          highlight: 'risk-assessment',
          action: 'assessRisk'
        }
      ],
      prerequisites: ['platform-overview'],
      rewards: {
        points: 200,
        badge: 'ai-expert-badge',
        achievement: 'AI Navigator'
      }
    });

    // Trading Tutorial
    this.tutorials.set('trading-basics', {
      id: 'trading-basics',
      title: 'Trading Fundamentals',
      description: 'Learn the basics of trading on our platform',
      category: 'trading',
      difficulty: 'beginner',
      estimatedTime: '20 minutes',
      steps: [
        {
          step: 1,
          title: 'Market Overview',
          content: 'Understand market dynamics and trading opportunities.',
          type: 'text',
          interactive: false,
          highlight: 'market-data'
        },
        {
          step: 2,
          title: 'Order Types',
          content: 'Learn about market orders, limit orders, and stop-loss orders.',
          type: 'interactive',
          interactive: true,
          highlight: 'order-types',
          action: 'explainOrderTypes'
        },
        {
          step: 3,
          title: 'Portfolio Management',
          content: 'Manage your investments with AI-powered recommendations.',
          type: 'guided-action',
          interactive: true,
          highlight: 'portfolio-management',
          action: 'managePortfolio'
        },
        {
          step: 4,
          title: 'Risk Management',
          content: 'Implement risk management strategies for safer trading.',
          type: 'demo',
          interactive: true,
          highlight: 'risk-management',
          action: 'setupRiskManagement'
        }
      ],
      prerequisites: ['platform-overview'],
      rewards: {
        points: 300,
        badge: 'trader-badge',
        achievement: 'Trading Novice'
      }
    });
  }

  /**
   * Initialize onboarding flows
   */
  initializeOnboardingFlows() {
    // New User Flow
    this.onboardingFlows.set('new-user', {
      id: 'new-user',
      name: 'New User Onboarding',
      description: 'Complete onboarding flow for new users',
      steps: [
        {
          step: 1,
          title: 'Account Setup',
          description: 'Complete your profile and preferences',
          component: 'profile-setup',
          required: true,
          estimatedTime: '5 minutes'
        },
        {
          step: 2,
          title: 'Financial Goals',
          description: 'Define your investment objectives',
          component: 'goals-setup',
          required: true,
          estimatedTime: '3 minutes'
        },
        {
          step: 3,
          title: 'Risk Assessment',
          description: 'Complete risk tolerance questionnaire',
          component: 'risk-assessment',
          required: true,
          estimatedTime: '7 minutes'
        },
        {
          step: 4,
          title: 'Portfolio Initialization',
          description: 'Set up your initial portfolio',
          component: 'portfolio-init',
          required: true,
          estimatedTime: '10 minutes'
        },
        {
          step: 5,
          title: 'Tutorial Selection',
          description: 'Choose tutorials to get started',
          component: 'tutorial-selection',
          required: false,
          estimatedTime: '2 minutes'
        }
      ],
      completionReward: {
        points: 500,
        badge: 'onboarded-user',
        achievement: 'FinAI Nexus Member'
      }
    });

    // Returning User Flow
    this.onboardingFlows.set('returning-user', {
      id: 'returning-user',
      name: 'Returning User Welcome',
      description: 'Welcome back flow for returning users',
      steps: [
        {
          step: 1,
          title: 'Portfolio Update',
          description: 'Review and update your portfolio',
          component: 'portfolio-update',
          required: false,
          estimatedTime: '5 minutes'
        },
        {
          step: 2,
          title: 'New Features',
          description: 'Discover new features and improvements',
          component: 'feature-highlights',
          required: false,
          estimatedTime: '3 minutes'
        },
        {
          step: 3,
          title: 'Performance Review',
          description: 'Review your investment performance',
          component: 'performance-review',
          required: false,
          estimatedTime: '5 minutes'
        }
      ],
      completionReward: {
        points: 100,
        badge: 'welcome-back',
        achievement: 'Active Member'
      }
    });
  }

  /**
   * Initialize interactive tours
   */
  initializeInteractiveTours() {
    // Dashboard Tour
    this.interactiveTours.set('dashboard-tour', {
      id: 'dashboard-tour',
      title: 'Dashboard Walkthrough',
      description: 'Interactive tour of the main dashboard',
      duration: '8 minutes',
      steps: [
        {
          step: 1,
          title: 'Navigation Menu',
          content: 'Access all platform features from this navigation menu.',
          target: '.navigation-menu',
          position: 'right',
          action: 'highlight'
        },
        {
          step: 2,
          title: 'Portfolio Overview',
          content: 'Your portfolio performance and holdings are displayed here.',
          target: '.portfolio-overview',
          position: 'top',
          action: 'highlight'
        },
        {
          step: 3,
          title: 'AI Insights',
          content: 'Get AI-powered insights and recommendations.',
          target: '.ai-insights',
          position: 'left',
          action: 'highlight'
        },
        {
          step: 4,
          title: 'Trading Panel',
          content: 'Execute trades and manage your investments.',
          target: '.trading-panel',
          position: 'bottom',
          action: 'highlight'
        },
        {
          step: 5,
          title: 'Market Data',
          content: 'Real-time market data and news updates.',
          target: '.market-data',
          position: 'right',
          action: 'highlight'
        }
      ]
    });

    // AI Features Tour
    this.interactiveTours.set('ai-features-tour', {
      id: 'ai-features-tour',
      title: 'AI Features Discovery',
      description: 'Explore AI-powered features',
      duration: '12 minutes',
      steps: [
        {
          step: 1,
          title: 'AI Avatar',
          content: 'Interact with your personal AI financial advisor.',
          target: '.ai-avatar',
          position: 'left',
          action: 'highlight'
        },
        {
          step: 2,
          title: 'Emotion Detection',
          content: 'Our system adapts to your emotional state.',
          target: '.emotion-detection',
          position: 'top',
          action: 'highlight'
        },
        {
          step: 3,
          title: 'Predictive Analytics',
          content: 'AI predicts market trends and opportunities.',
          target: '.predictions',
          position: 'right',
          action: 'highlight'
        },
        {
          step: 4,
          title: 'Risk Assessment',
          content: 'Automated risk analysis and recommendations.',
          target: '.risk-assessment',
          position: 'bottom',
          action: 'highlight'
        }
      ]
    });
  }

  /**
   * Start onboarding flow for user
   */
  async startOnboardingFlow(userId, flowId) {
    const flow = this.onboardingFlows.get(flowId);
    if (!flow) {
      throw new Error(`Onboarding flow not found: ${flowId}`);
    }

    const onboardingId = uuidv4();
    const startTime = Date.now();

    const onboarding = {
      id: onboardingId,
      userId,
      flowId,
      flow: flow,
      status: 'in-progress',
      startTime: new Date(),
      endTime: null,
      duration: 0,
      currentStep: 0,
      completedSteps: [],
      skippedSteps: [],
      progress: 0,
      rewards: {
        pointsEarned: 0,
        badgesEarned: [],
        achievementsUnlocked: []
      }
    };

    // Initialize user progress
    this.userProgress.set(userId, {
      userId,
      onboarding,
      tutorials: new Map(),
      tours: new Map(),
      totalPoints: 0,
      badges: [],
      achievements: [],
      lastActive: new Date()
    });

    logger.info(`🚀 Started onboarding flow: ${flow.name} for user: ${userId}`);

    return onboarding;
  }

  /**
   * Complete onboarding step
   */
  async completeOnboardingStep(userId, stepIndex, stepData = {}) {
    const userProgress = this.userProgress.get(userId);
    if (!userProgress) {
      throw new Error(`User progress not found: ${userId}`);
    }

    const onboarding = userProgress.onboarding;
    const step = onboarding.flow.steps[stepIndex];

    if (!step) {
      throw new Error(`Step not found: ${stepIndex}`);
    }

    const completedStep = {
      stepIndex,
      step: step,
      completedAt: new Date(),
      data: stepData,
      timeSpent: Date.now() - onboarding.startTime.getTime()
    };

    onboarding.completedSteps.push(completedStep);
    onboarding.currentStep = stepIndex + 1;
    onboarding.progress = (onboarding.completedSteps.length / onboarding.flow.steps.length) * 100;

    // Award points for step completion
    const points = Math.floor(step.estimatedTime * 10); // 10 points per minute
    onboarding.rewards.pointsEarned += points;
    userProgress.totalPoints += points;

    logger.info(`✅ Completed step: ${step.title} for user: ${userId}`);

    // Check if onboarding is complete
    if (onboarding.currentStep >= onboarding.flow.steps.length) {
      await this.completeOnboarding(userId);
    }

    return {
      completedStep,
      progress: onboarding.progress,
      pointsEarned: points,
      nextStep: onboarding.flow.steps[onboarding.currentStep] || null
    };
  }

  /**
   * Complete onboarding
   */
  async completeOnboarding(userId) {
    const userProgress = this.userProgress.get(userId);
    if (!userProgress) {
      throw new Error(`User progress not found: ${userId}`);
    }

    const onboarding = userProgress.onboarding;

    onboarding.status = 'completed';
    onboarding.endTime = new Date();
    onboarding.duration = onboarding.endTime.getTime() - onboarding.startTime.getTime();

    // Award completion rewards
    const completionReward = onboarding.flow.completionReward;
    onboarding.rewards.pointsEarned += completionReward.points;
    onboarding.rewards.badgesEarned.push(completionReward.badge);
    onboarding.rewards.achievementsUnlocked.push(completionReward.achievement);

    userProgress.totalPoints += completionReward.points;
    userProgress.badges.push(completionReward.badge);
    userProgress.achievements.push(completionReward.achievement);

    logger.info(`🎉 Onboarding completed for user: ${userId}`);

    return onboarding;
  }

  /**
   * Start tutorial for user
   */
  async startTutorial(userId, tutorialId) {
    const tutorial = this.tutorials.get(tutorialId);
    if (!tutorial) {
      throw new Error(`Tutorial not found: ${tutorialId}`);
    }

    const tutorialSession = {
      id: uuidv4(),
      userId,
      tutorialId,
      tutorial: tutorial,
      status: 'in-progress',
      startTime: new Date(),
      endTime: null,
      currentStep: 0,
      completedSteps: [],
      progress: 0
    };

    const userProgress = this.userProgress.get(userId);
    if (userProgress) {
      userProgress.tutorials.set(tutorialId, tutorialSession);
    }

    logger.info(`📚 Started tutorial: ${tutorial.title} for user: ${userId}`);

    return tutorialSession;
  }

  /**
   * Complete tutorial step
   */
  async completeTutorialStep(userId, tutorialId, stepIndex, interactionData = {}) {
    const userProgress = this.userProgress.get(userId);
    if (!userProgress) {
      throw new Error(`User progress not found: ${userId}`);
    }

    const tutorialSession = userProgress.tutorials.get(tutorialId);
    if (!tutorialSession) {
      throw new Error(`Tutorial session not found: ${tutorialId}`);
    }

    const step = tutorialSession.tutorial.steps[stepIndex];
    if (!step) {
      throw new Error(`Tutorial step not found: ${stepIndex}`);
    }

    const completedStep = {
      stepIndex,
      step: step,
      completedAt: new Date(),
      interactionData,
      timeSpent: Date.now() - tutorialSession.startTime.getTime()
    };

    tutorialSession.completedSteps.push(completedStep);
    tutorialSession.currentStep = stepIndex + 1;
    tutorialSession.progress = (tutorialSession.completedSteps.length / tutorialSession.tutorial.steps.length) * 100;

    logger.info(`✅ Completed tutorial step: ${step.title}`);

    // Check if tutorial is complete
    if (tutorialSession.currentStep >= tutorialSession.tutorial.steps.length) {
      await this.completeTutorial(userId, tutorialId);
    }

    return {
      completedStep,
      progress: tutorialSession.progress,
      nextStep: tutorialSession.tutorial.steps[tutorialSession.currentStep] || null
    };
  }

  /**
   * Complete tutorial
   */
  async completeTutorial(userId, tutorialId) {
    const userProgress = this.userProgress.get(userId);
    if (!userProgress) {
      throw new Error(`User progress not found: ${userId}`);
    }

    const tutorialSession = userProgress.tutorials.get(tutorialId);
    if (!tutorialSession) {
      throw new Error(`Tutorial session not found: ${tutorialId}`);
    }

    tutorialSession.status = 'completed';
    tutorialSession.endTime = new Date();

    // Award tutorial rewards
    const rewards = tutorialSession.tutorial.rewards;
    userProgress.totalPoints += rewards.points;
    userProgress.badges.push(rewards.badge);
    userProgress.achievements.push(rewards.achievement);

    logger.info(`🎓 Tutorial completed: ${tutorialSession.tutorial.title}`);

    return tutorialSession;
  }

  /**
   * Start interactive tour
   */
  async startTour(userId, tourId) {
    const tour = this.interactiveTours.get(tourId);
    if (!tour) {
      throw new Error(`Interactive tour not found: ${tourId}`);
    }

    const tourSession = {
      id: uuidv4(),
      userId,
      tourId,
      tour: tour,
      status: 'in-progress',
      startTime: new Date(),
      endTime: null,
      currentStep: 0,
      completedSteps: [],
      progress: 0
    };

    const userProgress = this.userProgress.get(userId);
    if (userProgress) {
      userProgress.tours.set(tourId, tourSession);
    }

    logger.info(`🗺️ Started tour: ${tour.title} for user: ${userId}`);

    return tourSession;
  }

  /**
   * Get user onboarding progress
   */
  async getUserProgress(userId) {
    const userProgress = this.userProgress.get(userId);
    if (!userProgress) {
      return {
        userId,
        status: 'not-started',
        onboarding: null,
        tutorials: [],
        tours: [],
        totalPoints: 0,
        badges: [],
        achievements: []
      };
    }

    return {
      userId,
      status: userProgress.onboarding?.status || 'not-started',
      onboarding: userProgress.onboarding,
      tutorials: Array.from(userProgress.tutorials.values()),
      tours: Array.from(userProgress.tours.values()),
      totalPoints: userProgress.totalPoints,
      badges: userProgress.badges,
      achievements: userProgress.achievements,
      lastActive: userProgress.lastActive
    };
  }

  /**
   * Get recommended tutorials
   */
  async getRecommendedTutorials(userId) {
    const userProgress = this.userProgress.get(userId);
    const completedTutorials = userProgress ? Array.from(userProgress.tutorials.keys()) : [];

    const recommendations = [];

    for (const [id, tutorial] of this.tutorials) {
      if (!completedTutorials.includes(id)) {
        // Check prerequisites
        const prerequisitesMet = tutorial.prerequisites.every(prereq =>
          completedTutorials.includes(prereq)
        );

        if (prerequisitesMet) {
          recommendations.push({
            ...tutorial,
            recommendationScore: this.calculateRecommendationScore(tutorial, userProgress)
          });
        }
      }
    }

    return recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);
  }

  /**
   * Calculate recommendation score
   */
  calculateRecommendationScore(tutorial, userProgress) {
    let score = 0;

    // Base score by category
    switch (tutorial.category) {
    case 'getting-started': score += 100; break;
    case 'ai-features': score += 80; break;
    case 'trading': score += 70; break;
    default: score += 50;
    }

    // Difficulty preference
    if (userProgress && userProgress.totalPoints < 500) {
      score += tutorial.difficulty === 'beginner' ? 30 : -10;
    }

    // Time preference
    score += tutorial.estimatedTime < 15 ? 20 : 0;

    return score;
  }

  /**
   * Get onboarding analytics
   */
  getOnboardingAnalytics() {
    const analytics = {
      totalUsers: this.userProgress.size,
      onboardingFlows: Object.fromEntries(this.onboardingFlows),
      tutorials: Object.fromEntries(this.tutorials),
      interactiveTours: Object.fromEntries(this.interactiveTours),
      completionRates: this.calculateCompletionRates(),
      popularTutorials: this.getPopularTutorials(),
      userEngagement: this.calculateUserEngagement()
    };

    return analytics;
  }

  /**
   * Calculate completion rates
   */
  calculateCompletionRates() {
    const rates = {
      onboarding: 0,
      tutorials: 0,
      tours: 0
    };

    let totalOnboarding = 0;
    let completedOnboarding = 0;
    let totalTutorials = 0;
    let completedTutorials = 0;
    let totalTours = 0;
    let completedTours = 0;

    for (const userProgress of this.userProgress.values()) {
      totalOnboarding++;
      if (userProgress.onboarding?.status === 'completed') {
        completedOnboarding++;
      }

      totalTutorials += userProgress.tutorials.size;
      completedTutorials += Array.from(userProgress.tutorials.values())
        .filter(t => t.status === 'completed').length;

      totalTours += userProgress.tours.size;
      completedTours += Array.from(userProgress.tours.values())
        .filter(t => t.status === 'completed').length;
    }

    rates.onboarding = totalOnboarding > 0 ? (completedOnboarding / totalOnboarding) * 100 : 0;
    rates.tutorials = totalTutorials > 0 ? (completedTutorials / totalTutorials) * 100 : 0;
    rates.tours = totalTours > 0 ? (completedTours / totalTours) * 100 : 0;

    return rates;
  }

  /**
   * Get popular tutorials
   */
  getPopularTutorials() {
    const tutorialStats = new Map();

    for (const userProgress of this.userProgress.values()) {
      for (const tutorialSession of userProgress.tutorials.values()) {
        const tutorialId = tutorialSession.tutorialId;
        const stats = tutorialStats.get(tutorialId) || {
          id: tutorialId,
          title: tutorialSession.tutorial.title,
          starts: 0,
          completions: 0,
          averageTime: 0
        };

        stats.starts++;
        if (tutorialSession.status === 'completed') {
          stats.completions++;
          stats.averageTime = (stats.averageTime + tutorialSession.endTime.getTime() - tutorialSession.startTime.getTime()) / 2;
        }

        tutorialStats.set(tutorialId, stats);
      }
    }

    return Array.from(tutorialStats.values())
      .sort((a, b) => b.starts - a.starts)
      .slice(0, 5);
  }

  /**
   * Calculate user engagement
   */
  calculateUserEngagement() {
    const engagement = {
      averagePoints: 0,
      averageTutorials: 0,
      averageTours: 0,
      activeUsers: 0
    };

    let totalPoints = 0;
    let totalTutorials = 0;
    let totalTours = 0;
    let activeUsers = 0;
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    for (const userProgress of this.userProgress.values()) {
      totalPoints += userProgress.totalPoints;
      totalTutorials += userProgress.tutorials.size;
      totalTours += userProgress.tours.size;

      if (userProgress.lastActive.getTime() > oneWeekAgo) {
        activeUsers++;
      }
    }

    const userCount = this.userProgress.size;
    if (userCount > 0) {
      engagement.averagePoints = totalPoints / userCount;
      engagement.averageTutorials = totalTutorials / userCount;
      engagement.averageTours = totalTours / userCount;
      engagement.activeUsers = activeUsers;
    }

    return engagement;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const analytics = this.getOnboardingAnalytics();

      return {
        status: 'healthy',
        service: 'user-onboarding',
        metrics: {
          totalUsers: analytics.totalUsers,
          totalTutorials: Object.keys(analytics.tutorials).length,
          totalTours: Object.keys(analytics.interactiveTours).length,
          onboardingCompletionRate: analytics.completionRates.onboarding,
          tutorialCompletionRate: analytics.completionRates.tutorials,
          averageUserPoints: analytics.userEngagement.averagePoints,
          activeUsers: analytics.userEngagement.activeUsers
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'user-onboarding',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = UserOnboardingService;
