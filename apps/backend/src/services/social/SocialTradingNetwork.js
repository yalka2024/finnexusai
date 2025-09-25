/**
 * Social Trading Network - Revolutionary DAO-Governed Trading Community
 *
 * Implements a decentralized social trading platform with DAO governance,
 * copy trading, leaderboards, and community-driven investment strategies
 */

const EventEmitter = require('events');
// const databaseManager = require('../../config/database');
const logger = require('../../utils/logger');

class SocialTradingNetwork extends EventEmitter {
  constructor() {
    super();
    this.isInitialized = false;
    this.tradingStrategies = new Map();
    this.copyTraders = new Map();
    this.leaderboards = new Map();
    this.daoGovernance = new Map();
    this.communityPools = new Map();
    this.socialFeatures = new Map();
    this.reputationSystem = new Map();
  }

  async initialize() {
    try {
      logger.info('👥 Initializing Social Trading Network...');

      // Initialize trading strategies
      await this.initializeTradingStrategies();

      // Initialize copy trading system
      await this.initializeCopyTrading();

      // Initialize leaderboards
      await this.initializeLeaderboards();

      // Initialize DAO governance
      await this.initializeDAOGovernance();

      // Initialize community pools
      await this.initializeCommunityPools();

      // Initialize social features
      await this.initializeSocialFeatures();

      // Initialize reputation system
      await this.initializeReputationSystem();

      this.isInitialized = true;
      logger.info('✅ Social Trading Network initialized successfully');
      return { success: true, message: 'Social Trading Network initialized' };
    } catch (error) {
      logger.error('Social Trading Network initialization failed:', error);
      throw error;
    }
  }

  async shutdown() {
    try {
      this.isInitialized = false;
      logger.info('Social Trading Network shut down');
      return { success: true, message: 'Social Trading Network shut down' };
    } catch (error) {
      logger.error('Social Trading Network shutdown failed:', error);
      throw error;
    }
  }

  // Initialize trading strategies
  async initializeTradingStrategies() {
    try {
      // Momentum Strategy
      this.tradingStrategies.set('momentum', {
        id: 'momentum',
        name: 'Momentum Trading Strategy',
        description: 'Follows price momentum and trend continuation patterns',
        riskLevel: 'medium',
        minCapital: 1000,
        maxDrawdown: 0.15,
        expectedReturn: 0.12,
        sharpeRatio: 1.2,
        winRate: 0.65,
        avgTradeDuration: '5 days',
        creator: 'system',
        followers: 0,
        totalCopied: 0,
        performance: {
          totalReturn: 0,
          monthlyReturn: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          winRate: 0,
          totalTrades: 0
        },
        isPublic: true,
        createdAt: new Date()
      });

      // Mean Reversion Strategy
      this.tradingStrategies.set('mean_reversion', {
        id: 'mean_reversion',
        name: 'Mean Reversion Strategy',
        description: 'Trades against price extremes and expects reversion to mean',
        riskLevel: 'low',
        minCapital: 500,
        maxDrawdown: 0.10,
        expectedReturn: 0.08,
        sharpeRatio: 1.5,
        winRate: 0.70,
        avgTradeDuration: '3 days',
        creator: 'system',
        followers: 0,
        totalCopied: 0,
        performance: {
          totalReturn: 0,
          monthlyReturn: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          winRate: 0,
          totalTrades: 0
        },
        isPublic: true,
        createdAt: new Date()
      });

      // Arbitrage Strategy
      this.tradingStrategies.set('arbitrage', {
        id: 'arbitrage',
        name: 'Cross-Exchange Arbitrage',
        description: 'Exploits price differences between exchanges',
        riskLevel: 'low',
        minCapital: 2000,
        maxDrawdown: 0.05,
        expectedReturn: 0.06,
        sharpeRatio: 2.0,
        winRate: 0.85,
        avgTradeDuration: '1 hour',
        creator: 'system',
        followers: 0,
        totalCopied: 0,
        performance: {
          totalReturn: 0,
          monthlyReturn: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          winRate: 0,
          totalTrades: 0
        },
        isPublic: true,
        createdAt: new Date()
      });

      // AI-Powered Strategy
      this.tradingStrategies.set('ai_powered', {
        id: 'ai_powered',
        name: 'AI-Powered Trading Strategy',
        description: 'Uses machine learning for market prediction and trade execution',
        riskLevel: 'high',
        minCapital: 5000,
        maxDrawdown: 0.20,
        expectedReturn: 0.18,
        sharpeRatio: 1.8,
        winRate: 0.60,
        avgTradeDuration: '2 days',
        creator: 'system',
        followers: 0,
        totalCopied: 0,
        performance: {
          totalReturn: 0,
          monthlyReturn: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          winRate: 0,
          totalTrades: 0
        },
        isPublic: true,
        createdAt: new Date()
      });

      logger.info(`✅ Initialized ${this.tradingStrategies.size} trading strategies`);
    } catch (error) {
      logger.error('Failed to initialize trading strategies:', error);
      throw error;
    }
  }

  // Initialize copy trading system
  async initializeCopyTrading() {
    try {
      this.copyTraders.set('copy_trading_rules', {
        maxCopyAmount: 10000, // Maximum amount that can be copied
        minCopyAmount: 100,   // Minimum amount for copy trading
        maxNumberOfCopies: 5, // Maximum number of strategies to copy
        riskManagement: {
          stopLoss: 0.05,     // 5% stop loss
          takeProfit: 0.10,   // 10% take profit
          maxDrawdown: 0.15   // 15% maximum drawdown
        },
        fees: {
          copyFee: 0.02,      // 2% fee on profits
          performanceFee: 0.15 // 15% performance fee
        }
      });

      logger.info('✅ Copy trading system initialized');
    } catch (error) {
      logger.error('Failed to initialize copy trading system:', error);
      throw error;
    }
  }

  // Initialize leaderboards
  async initializeLeaderboards() {
    try {
      // Monthly Performance Leaderboard
      this.leaderboards.set('monthly_performance', {
        id: 'monthly_performance',
        name: 'Monthly Performance Leaders',
        period: 'monthly',
        metric: 'total_return',
        rankings: [],
        lastUpdate: new Date(),
        rewards: {
          first: 1000,  // Virtual currency
          second: 500,
          third: 250
        }
      });

      // Risk-Adjusted Returns Leaderboard
      this.leaderboards.set('risk_adjusted', {
        id: 'risk_adjusted',
        name: 'Risk-Adjusted Returns Leaders',
        period: 'quarterly',
        metric: 'sharpe_ratio',
        rankings: [],
        lastUpdate: new Date(),
        rewards: {
          first: 750,
          second: 375,
          third: 150
        }
      });

      // Consistency Leaderboard
      this.leaderboards.set('consistency', {
        id: 'consistency',
        name: 'Most Consistent Traders',
        period: 'yearly',
        metric: 'win_rate',
        rankings: [],
        lastUpdate: new Date(),
        rewards: {
          first: 500,
          second: 250,
          third: 100
        }
      });

      // Community Favorites Leaderboard
      this.leaderboards.set('community_favorites', {
        id: 'community_favorites',
        name: 'Community Favorite Strategies',
        period: 'weekly',
        metric: 'followers',
        rankings: [],
        lastUpdate: new Date(),
        rewards: {
          first: 300,
          second: 150,
          third: 75
        }
      });

      logger.info(`✅ Initialized ${this.leaderboards.size} leaderboards`);
    } catch (error) {
      logger.error('Failed to initialize leaderboards:', error);
      throw error;
    }
  }

  // Initialize DAO governance
  async initializeDAOGovernance() {
    try {
      // DAO Structure
      this.daoGovernance.set('dao_structure', {
        name: 'FinNexus Trading DAO',
        description: 'Decentralized governance for the social trading platform',
        token: 'FNT', // FinNexus Token
        totalSupply: 10000000,
        circulatingSupply: 7500000,
        governanceMechanism: 'token_weighted_voting',
        votingPower: {
          minTokens: 100,     // Minimum tokens to vote
          maxVotingPower: 5,  // Maximum 5% of total supply
          delegation: true    // Allow token delegation
        }
      });

      // Governance Proposals
      this.daoGovernance.set('proposals', {
        categories: [
          'platform_updates',
          'fee_changes',
          'new_features',
          'strategy_approvals',
          'community_fund'
        ],
        requirements: {
          minTokens: 1000,    // Minimum tokens to create proposal
          minSupport: 0.05,   // 5% minimum support to pass
          votingPeriod: 7,    // 7 days voting period
          executionDelay: 2   // 2 days execution delay
        },
        activeProposals: [],
        executedProposals: []
      });

      // Treasury Management
      this.daoGovernance.set('treasury', {
        totalFunds: 500000,   // $500K treasury
        allocation: {
          development: 0.4,   // 40% for development
          marketing: 0.2,     // 20% for marketing
          rewards: 0.2,       // 20% for rewards
          reserves: 0.2       // 20% for reserves
        },
        monthlyBudget: 50000, // $50K monthly budget
        approvedExpenses: []
      });

      logger.info('✅ DAO governance initialized');
    } catch (error) {
      logger.error('Failed to initialize DAO governance:', error);
      throw error;
    }
  }

  // Initialize community pools
  async initializeCommunityPools() {
    try {
      // Community Investment Pool
      this.communityPools.set('investment_pool', {
        id: 'investment_pool',
        name: 'Community Investment Pool',
        description: 'Pooled funds managed by top-performing traders',
        totalValue: 1000000,  // $1M initial pool
        participants: 0,
        managers: [],
        performance: {
          totalReturn: 0,
          monthlyReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0
        },
        allocation: {
          equities: 0.4,
          bonds: 0.2,
          crypto: 0.2,
          alternatives: 0.1,
          cash: 0.1
        },
        fees: {
          managementFee: 0.01,    // 1% annual management fee
          performanceFee: 0.15    // 15% performance fee
        },
        isActive: true,
        createdAt: new Date()
      });

      // Risk Sharing Pool
      this.communityPools.set('risk_sharing', {
        id: 'risk_sharing',
        name: 'Risk Sharing Pool',
        description: 'Insurance-like pool for risk mitigation',
        totalValue: 250000,   // $250K initial pool
        participants: 0,
        coverage: {
          maxCoverage: 0.1,   // 10% of portfolio value
          deductible: 0.02,   // 2% deductible
          premium: 0.005      // 0.5% annual premium
        },
        claims: [],
        reserves: 250000,
        isActive: true,
        createdAt: new Date()
      });

      // Educational Fund
      this.communityPools.set('educational_fund', {
        id: 'educational_fund',
        name: 'Educational Fund',
        description: 'Fund for trading education and research',
        totalValue: 100000,   // $100K initial fund
        participants: 0,
        grants: [],
        research: [],
        education: [],
        isActive: true,
        createdAt: new Date()
      });

      logger.info(`✅ Initialized ${this.communityPools.size} community pools`);
    } catch (error) {
      logger.error('Failed to initialize community pools:', error);
      throw error;
    }
  }

  // Initialize social features
  async initializeSocialFeatures() {
    try {
      // Social Feed
      this.socialFeatures.set('social_feed', {
        id: 'social_feed',
        name: 'Trading Social Feed',
        description: 'Real-time feed of trading activities and insights',
        features: [
          'trade_announcements',
          'market_insights',
          'strategy_updates',
          'performance_sharing',
          'community_discussions'
        ],
        moderation: {
          autoModeration: true,
          communityModeration: true,
          reportSystem: true,
          contentFiltering: true
        },
        engagement: {
          likes: true,
          comments: true,
          shares: true,
          follows: true
        }
      });

      // Discussion Forums
      this.socialFeatures.set('discussion_forums', {
        id: 'discussion_forums',
        name: 'Trading Discussion Forums',
        description: 'Topic-based discussion forums for traders',
        categories: [
          'general_trading',
          'strategy_discussion',
          'market_analysis',
          'risk_management',
          'newbie_help',
          'advanced_topics'
        ],
        features: [
          'threaded_discussions',
          'expert_verification',
          'topic_subscriptions',
          'search_functionality'
        ]
      });

      // Mentorship Program
      this.socialFeatures.set('mentorship', {
        id: 'mentorship',
        name: 'Trading Mentorship Program',
        description: 'Connect experienced traders with beginners',
        features: [
          'mentor_matching',
          'progress_tracking',
          'skill_assessment',
          'certification_program'
        ],
        rewards: {
          mentorReward: 100,   // Virtual currency per mentee
          menteeDiscount: 0.1  // 10% discount on fees
        }
      });

      logger.info(`✅ Initialized ${this.socialFeatures.size} social features`);
    } catch (error) {
      logger.error('Failed to initialize social features:', error);
      throw error;
    }
  }

  // Initialize reputation system
  async initializeReputationSystem() {
    try {
      this.reputationSystem.set('reputation_rules', {
        reputationFactors: [
          {
            factor: 'trading_performance',
            weight: 0.4,
            description: 'Historical trading performance and returns'
          },
          {
            factor: 'risk_management',
            weight: 0.2,
            description: 'Ability to manage risk and avoid large losses'
          },
          {
            factor: 'community_contribution',
            weight: 0.2,
            description: 'Contributions to community knowledge and discussions'
          },
          {
            factor: 'consistency',
            weight: 0.1,
            description: 'Consistency in trading performance over time'
          },
          {
            factor: 'transparency',
            weight: 0.1,
            description: 'Transparency in sharing trading activities and results'
          }
        ],
        reputationLevels: [
          { level: 'rookie', minScore: 0, maxScore: 100, benefits: [] },
          { level: 'trader', minScore: 100, maxScore: 500, benefits: ['basic_analytics'] },
          { level: 'expert', minScore: 500, maxScore: 1000, benefits: ['advanced_analytics', 'mentor_eligible'] },
          { level: 'master', minScore: 1000, maxScore: 2500, benefits: ['premium_features', 'dao_voting'] },
          { level: 'legend', minScore: 2500, maxScore: 9999, benefits: ['all_features', 'governance_rights'] }
        ],
        reputationDecay: {
          decayRate: 0.01,    // 1% decay per month
          minScore: 0,        // Minimum reputation score
          activityBonus: 0.05 // 5% bonus for active trading
        }
      });

      logger.info('✅ Reputation system initialized');
    } catch (error) {
      logger.error('Failed to initialize reputation system:', error);
      throw error;
    }
  }

  // Create trading strategy
  async createTradingStrategy(userId, strategyData) {
    try {
      const strategyId = `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const strategy = {
        id: strategyId,
        name: strategyData.name,
        description: strategyData.description,
        riskLevel: strategyData.riskLevel,
        minCapital: strategyData.minCapital || 1000,
        maxDrawdown: strategyData.maxDrawdown || 0.15,
        expectedReturn: strategyData.expectedReturn || 0.10,
        sharpeRatio: 0,
        winRate: 0,
        avgTradeDuration: strategyData.avgTradeDuration || '5 days',
        creator: userId,
        followers: 0,
        totalCopied: 0,
        performance: {
          totalReturn: 0,
          monthlyReturn: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          winRate: 0,
          totalTrades: 0
        },
        isPublic: strategyData.isPublic || false,
        createdAt: new Date()
      };

      this.tradingStrategies.set(strategyId, strategy);

      logger.info(`✅ Created trading strategy: ${strategy.name} by user ${userId}`);

      return {
        success: true,
        strategyId,
        strategy,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error(`Failed to create trading strategy for user ${userId}:`, error);
      throw error;
    }
  }

  // Copy trading strategy
  async copyTradingStrategy(userId, strategyId, copyAmount) {
    try {
      const strategy = this.tradingStrategies.get(strategyId);
      if (!strategy) {
        throw new Error(`Trading strategy ${strategyId} not found`);
      }

      const copyRules = this.copyTraders.get('copy_trading_rules');

      // Validate copy amount
      if (copyAmount < copyRules.minCopyAmount) {
        throw new Error(`Copy amount too small. Minimum: ${copyRules.minCopyAmount}`);
      }
      if (copyAmount > copyRules.maxCopyAmount) {
        throw new Error(`Copy amount too large. Maximum: ${copyRules.maxCopyAmount}`);
      }

      // Create copy trading relationship
      const copyId = `copy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const copyRelationship = {
        id: copyId,
        userId,
        strategyId,
        strategyName: strategy.name,
        copyAmount,
        startDate: new Date(),
        riskManagement: {
          stopLoss: copyRules.riskManagement.stopLoss,
          takeProfit: copyRules.riskManagement.takeProfit,
          maxDrawdown: copyRules.riskManagement.maxDrawdown
        },
        fees: {
          copyFee: copyRules.fees.copyFee,
          performanceFee: copyRules.fees.performanceFee
        },
        performance: {
          totalReturn: 0,
          currentValue: copyAmount,
          tradesCopied: 0,
          feesPaid: 0
        },
        status: 'active'
      };

      this.copyTraders.set(copyId, copyRelationship);

      // Update strategy statistics
      strategy.totalCopied++;
      strategy.followers++;

      logger.info(`✅ User ${userId} started copying strategy ${strategy.name} with $${copyAmount}`);

      return {
        success: true,
        copyId,
        copyRelationship,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error(`Failed to copy trading strategy for user ${userId}:`, error);
      throw error;
    }
  }

  // Update leaderboards
  async updateLeaderboards() {
    try {
      for (const [leaderboardId, leaderboard] of this.leaderboards) {
        const rankings = await this.calculateRankings(leaderboardId);
        leaderboard.rankings = rankings;
        leaderboard.lastUpdate = new Date();

        // Distribute rewards to top performers
        await this.distributeLeaderboardRewards(leaderboardId, rankings);
      }

      logger.info('✅ Leaderboards updated');
    } catch (error) {
      logger.error('Failed to update leaderboards:', error);
    }
  }

  // Calculate rankings
  async calculateRankings(leaderboardId) {
    try {
      const leaderboard = this.leaderboards.get(leaderboardId);
      const rankings = [];

      // Get all trading strategies
      for (const [strategyId, strategy] of this.tradingStrategies) {
        if (!strategy.isPublic) continue;

        let score = 0;
        switch (leaderboard.metric) {
        case 'total_return':
          score = strategy.performance.totalReturn;
          break;
        case 'sharpe_ratio':
          score = strategy.performance.sharpeRatio;
          break;
        case 'win_rate':
          score = strategy.performance.winRate;
          break;
        case 'followers':
          score = strategy.followers;
          break;
        }

        rankings.push({
          strategyId,
          strategyName: strategy.name,
          creator: strategy.creator,
          score,
          performance: strategy.performance
        });
      }

      // Sort by score (descending)
      rankings.sort((a, b) => b.score - a.score);

      return rankings.slice(0, 100); // Top 100

    } catch (error) {
      logger.error(`Failed to calculate rankings for leaderboard ${leaderboardId}:`, error);
      return [];
    }
  }

  // Distribute leaderboard rewards
  async distributeLeaderboardRewards(leaderboardId, rankings) {
    try {
      const leaderboard = this.leaderboards.get(leaderboardId);
      const rewards = leaderboard.rewards;

      // Distribute rewards to top 3
      for (let i = 0; i < Math.min(3, rankings.length); i++) {
        const ranking = rankings[i];
        const rewardAmount = rewards[['first', 'second', 'third'][i]];

        // In a real implementation, this would update user balances
        logger.info(`🏆 Distributed ${rewardAmount} reward to ${ranking.strategyName} (${ranking.creator})`);
      }

    } catch (error) {
      logger.error(`Failed to distribute rewards for leaderboard ${leaderboardId}:`, error);
    }
  }

  // Create DAO proposal
  async createDAOProposal(userId, proposalData) {
    try {
      const _daoStructure = this.daoGovernance.get('dao_structure');
      const proposalRules = this.daoGovernance.get('proposals');

      // Check if user has enough tokens to create proposal
      const userTokens = await this.getUserTokenBalance(userId);
      if (userTokens < proposalRules.requirements.minTokens) {
        throw new Error(`Insufficient tokens to create proposal. Required: ${proposalRules.requirements.minTokens}`);
      }

      const proposalId = `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const proposal = {
        id: proposalId,
        title: proposalData.title,
        description: proposalData.description,
        category: proposalData.category,
        proposer: userId,
        status: 'active',
        votes: {
          for: 0,
          against: 0,
          abstain: 0
        },
        votingPower: {
          total: 0,
          required: proposalRules.requirements.minSupport
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + proposalRules.requirements.votingPeriod * 24 * 60 * 60 * 1000),
        executionDate: null,
        executed: false
      };

      proposalRules.activeProposals.push(proposal);

      logger.info(`✅ Created DAO proposal: ${proposal.title} by user ${userId}`);

      return {
        success: true,
        proposalId,
        proposal,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error(`Failed to create DAO proposal for user ${userId}:`, error);
      throw error;
    }
  }

  // Vote on DAO proposal
  async voteOnProposal(userId, proposalId, vote, votingPower) {
    try {
      const proposalRules = this.daoGovernance.get('proposals');
      const proposal = proposalRules.activeProposals.find(p => p.id === proposalId);

      if (!proposal) {
        throw new Error(`Proposal ${proposalId} not found`);
      }

      if (proposal.status !== 'active') {
        throw new Error(`Proposal ${proposalId} is not active`);
      }

      if (new Date() > proposal.endDate) {
        throw new Error(`Voting period has ended for proposal ${proposalId}`);
      }

      // Add vote
      proposal.votes[vote] += votingPower;
      proposal.votingPower.total += votingPower;

      // Check if proposal has enough support
      const totalTokens = this.daoGovernance.get('dao_structure').totalSupply;
      const supportPercentage = proposal.votingPower.total / totalTokens;

      if (supportPercentage >= proposalRules.requirements.minSupport) {
        proposal.status = 'passed';
        proposal.executionDate = new Date(Date.now() + proposalRules.requirements.executionDelay * 24 * 60 * 60 * 1000);
      }

      logger.info(`✅ User ${userId} voted ${vote} on proposal ${proposalId} with ${votingPower} voting power`);

      return {
        success: true,
        proposalId,
        vote,
        votingPower,
        totalVotes: proposal.votes,
        supportPercentage,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error(`Failed to vote on proposal ${proposalId} for user ${userId}:`, error);
      throw error;
    }
  }

  // Join community pool
  async joinCommunityPool(userId, poolId, contributionAmount) {
    try {
      const pool = this.communityPools.get(poolId);
      if (!pool) {
        throw new Error(`Community pool ${poolId} not found`);
      }

      if (!pool.isActive) {
        throw new Error(`Community pool ${poolId} is not active`);
      }

      // Add participant to pool
      const participantId = `participant_${userId}_${poolId}`;
      const participant = {
        id: participantId,
        userId,
        poolId,
        contributionAmount,
        joinDate: new Date(),
        currentValue: contributionAmount,
        performance: {
          totalReturn: 0,
          monthlyReturn: 0,
          feesPaid: 0
        },
        status: 'active'
      };

      pool.participants++;
      pool.totalValue += contributionAmount;

      logger.info(`✅ User ${userId} joined community pool ${pool.name} with $${contributionAmount}`);

      return {
        success: true,
        participantId,
        participant,
        pool: {
          totalValue: pool.totalValue,
          participants: pool.participants
        },
        timestamp: new Date()
      };

    } catch (error) {
      logger.error(`Failed to join community pool for user ${userId}:`, error);
      throw error;
    }
  }

  // Update user reputation
  async updateUserReputation(userId, reputationFactors) {
    try {
      const reputationRules = this.reputationSystem.get('reputation_rules');

      let totalScore = 0;
      for (const factor of reputationRules.reputationFactors) {
        const factorScore = reputationFactors[factor.factor] || 0;
        totalScore += factorScore * factor.weight;
      }

      // Apply activity bonus
      if (reputationFactors.activityBonus) {
        totalScore += totalScore * reputationRules.reputationDecay.activityBonus;
      }

      // Apply decay
      totalScore = totalScore * (1 - reputationRules.reputationDecay.decayRate);

      // Ensure minimum score
      totalScore = Math.max(totalScore, reputationRules.reputationDecay.minScore);

      // Determine reputation level
      let reputationLevel = 'rookie';
      for (const level of reputationRules.reputationLevels) {
        if (totalScore >= level.minScore && totalScore <= level.maxScore) {
          reputationLevel = level.level;
          break;
        }
      }

      const reputation = {
        userId,
        score: totalScore,
        level: reputationLevel,
        factors: reputationFactors,
        lastUpdate: new Date()
      };

      this.reputationSystem.set(`reputation_${userId}`, reputation);

      logger.info(`✅ Updated reputation for user ${userId}: ${reputationLevel} (${totalScore.toFixed(2)})`);

      return {
        success: true,
        reputation,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error(`Failed to update reputation for user ${userId}:`, error);
      throw error;
    }
  }

  // Get social trading status
  getSocialTradingStatus() {
    const status = {
      isInitialized: this.isInitialized,
      tradingStrategies: {},
      leaderboards: {},
      daoGovernance: {},
      communityPools: {},
      socialFeatures: {},
      reputationSystem: {}
    };

    // Add trading strategies information
    for (const [id, strategy] of this.tradingStrategies) {
      status.tradingStrategies[id] = {
        name: strategy.name,
        creator: strategy.creator,
        riskLevel: strategy.riskLevel,
        followers: strategy.followers,
        totalCopied: strategy.totalCopied,
        performance: strategy.performance,
        isPublic: strategy.isPublic
      };
    }

    // Add leaderboard information
    for (const [id, leaderboard] of this.leaderboards) {
      status.leaderboards[id] = {
        name: leaderboard.name,
        period: leaderboard.period,
        metric: leaderboard.metric,
        rankings: leaderboard.rankings.slice(0, 10), // Top 10
        lastUpdate: leaderboard.lastUpdate
      };
    }

    // Add DAO governance information
    const daoStructure = this.daoGovernance.get('dao_structure');
    const proposals = this.daoGovernance.get('proposals');
    const treasury = this.daoGovernance.get('treasury');

    status.daoGovernance = {
      name: daoStructure.name,
      totalSupply: daoStructure.totalSupply,
      circulatingSupply: daoStructure.circulatingSupply,
      activeProposals: proposals.activeProposals.length,
      executedProposals: proposals.executedProposals.length,
      treasuryFunds: treasury.totalFunds
    };

    // Add community pools information
    for (const [id, pool] of this.communityPools) {
      status.communityPools[id] = {
        name: pool.name,
        totalValue: pool.totalValue,
        participants: pool.participants,
        performance: pool.performance,
        isActive: pool.isActive
      };
    }

    // Add social features information
    for (const [id, feature] of this.socialFeatures) {
      status.socialFeatures[id] = {
        name: feature.name,
        features: feature.features
      };
    }

    // Add reputation system information
    const reputationRules = this.reputationSystem.get('reputation_rules');
    status.reputationSystem = {
      factors: reputationRules.reputationFactors.length,
      levels: reputationRules.reputationLevels.length,
      totalUsers: Array.from(this.reputationSystem.keys()).filter(key => key.startsWith('reputation_')).length
    };

    return status;
  }

  // Helper methods
  async getUserTokenBalance(_userId) {
    // This would integrate with the user's token balance
    return 1000; // Mock balance
  }
}

module.exports = new SocialTradingNetwork();
