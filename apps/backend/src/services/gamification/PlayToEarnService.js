/**
 * Play-to-Earn Gamification Service - Revolutionary NFT-Based Trading Rewards
 *
 * Implements comprehensive gamification system with NFT achievements,
 * trading challenges, leaderboards, and play-to-earn mechanics
 */

const EventEmitter = require('events');

const databaseManager = require('../../config/database');
const logger = require('../../utils/logger');

class PlayToEarnService extends EventEmitter {
  constructor() {
    super();
    this.isInitialized = false;
    this.nftAchievements = new Map();
    this.tradingChallenges = new Map();
    this.gamificationMechanics = new Map();
    this.userProfiles = new Map();
    this.leaderboards = new Map();
    this.rewardsSystem = new Map();
    this.nftMarketplace = new Map();
  }

  async initialize() {
    try {
      logger.info('🎮 Initializing Play-to-Earn Gamification Service...');

      // Initialize NFT achievements
      await this.initializeNFTAchievements();

      // Initialize trading challenges
      await this.initializeTradingChallenges();

      // Initialize gamification mechanics
      await this.initializeGamificationMechanics();

      // Initialize rewards system
      await this.initializeRewardsSystem();

      // Initialize NFT marketplace
      await this.initializeNFTMarketplace();

      this.isInitialized = true;
      logger.info('✅ Play-to-Earn Gamification Service initialized successfully');
      return { success: true, message: 'Play-to-Earn Gamification Service initialized' };
    } catch (error) {
      logger.error('Play-to-Earn Gamification Service initialization failed:', error);
      throw error;
    }
  }

  async shutdown() {
    try {
      this.isInitialized = false;
      logger.info('Play-to-Earn Gamification Service shut down');
      return { success: true, message: 'Play-to-Earn Gamification Service shut down' };
    } catch (error) {
      logger.error('Play-to-Earn Gamification Service shutdown failed:', error);
      throw error;
    }
  }

  // Initialize NFT achievements
  async initializeNFTAchievements() {
    try {
      // Trading Performance Achievements
      this.nftAchievements.set('first_trade', {
        id: 'first_trade',
        name: 'First Trade',
        description: 'Complete your first trade on FinNexusAI',
        category: 'trading',
        rarity: 'common',
        requirements: {
          trades: 1,
          minAmount: 0
        },
        rewards: {
          experience: 100,
          tokens: 50,
          badge: 'first_trader'
        },
        metadata: {
          image: 'https://api.finnexusai.com/nft/first_trade.png',
          attributes: [
            { trait_type: 'Category', value: 'Trading' },
            { trait_type: 'Rarity', value: 'Common' },
            { trait_type: 'Experience', value: 100 }
          ]
        },
        minted: 0,
        maxSupply: 10000
      });

      this.nftAchievements.set('profit_master', {
        id: 'profit_master',
        name: 'Profit Master',
        description: 'Achieve $10,000 in total trading profits',
        category: 'trading',
        rarity: 'rare',
        requirements: {
          totalProfit: 10000,
          winRate: 0.6
        },
        rewards: {
          experience: 1000,
          tokens: 500,
          badge: 'profit_master',
          title: 'Profit Master'
        },
        metadata: {
          image: 'https://api.finnexusai.com/nft/profit_master.png',
          attributes: [
            { trait_type: 'Category', value: 'Trading' },
            { trait_type: 'Rarity', value: 'Rare' },
            { trait_type: 'Experience', value: 1000 },
            { trait_type: 'Profit Required', value: 10000 }
          ]
        },
        minted: 0,
        maxSupply: 1000
      });

      this.nftAchievements.set('risk_tamer', {
        id: 'risk_tamer',
        name: 'Risk Tamer',
        description: 'Maintain less than 5% drawdown for 30 consecutive days',
        category: 'risk_management',
        rarity: 'epic',
        requirements: {
          maxDrawdown: 0.05,
          consecutiveDays: 30,
          minTrades: 50
        },
        rewards: {
          experience: 2500,
          tokens: 1000,
          badge: 'risk_tamer',
          title: 'Risk Tamer',
          specialPower: 'risk_reduction_10'
        },
        metadata: {
          image: 'https://api.finnexusai.com/nft/risk_tamer.png',
          attributes: [
            { trait_type: 'Category', value: 'Risk Management' },
            { trait_type: 'Rarity', value: 'Epic' },
            { trait_type: 'Experience', value: 2500 },
            { trait_type: 'Special Power', value: 'Risk Reduction 10%' }
          ]
        },
        minted: 0,
        maxSupply: 100
      });

      // Portfolio Management Achievements
      this.nftAchievements.set('diversification_expert', {
        id: 'diversification_expert',
        name: 'Diversification Expert',
        description: 'Hold positions in 10+ different assets simultaneously',
        category: 'portfolio_management',
        rarity: 'rare',
        requirements: {
          simultaneousAssets: 10,
          minValue: 5000
        },
        rewards: {
          experience: 1500,
          tokens: 750,
          badge: 'diversification_expert',
          title: 'Diversification Expert'
        },
        metadata: {
          image: 'https://api.finnexusai.com/nft/diversification_expert.png',
          attributes: [
            { trait_type: 'Category', value: 'Portfolio Management' },
            { trait_type: 'Rarity', value: 'Rare' },
            { trait_type: 'Experience', value: 1500 },
            { trait_type: 'Assets Required', value: 10 }
          ]
        },
        minted: 0,
        maxSupply: 500
      });

      // Social Trading Achievements
      this.nftAchievements.set('social_influencer', {
        id: 'social_influencer',
        name: 'Social Influencer',
        description: 'Gain 100+ followers for your trading strategies',
        category: 'social_trading',
        rarity: 'epic',
        requirements: {
          followers: 100,
          strategyPerformance: 0.15
        },
        rewards: {
          experience: 3000,
          tokens: 1500,
          badge: 'social_influencer',
          title: 'Social Influencer',
          specialPower: 'copy_trading_boost'
        },
        metadata: {
          image: 'https://api.finnexusai.com/nft/social_influencer.png',
          attributes: [
            { trait_type: 'Category', value: 'Social Trading' },
            { trait_type: 'Rarity', value: 'Epic' },
            { trait_type: 'Experience', value: 3000 },
            { trait_type: 'Special Power', value: 'Copy Trading Boost' }
          ]
        },
        minted: 0,
        maxSupply: 50
      });

      // AI Trading Achievements
      this.nftAchievements.set('ai_master', {
        id: 'ai_master',
        name: 'AI Master',
        description: 'Successfully use AI trading agents for 100+ trades',
        category: 'ai_trading',
        rarity: 'legendary',
        requirements: {
          aiTrades: 100,
          aiAccuracy: 0.7
        },
        rewards: {
          experience: 5000,
          tokens: 2500,
          badge: 'ai_master',
          title: 'AI Master',
          specialPower: 'ai_accuracy_boost',
          exclusiveAccess: 'premium_ai_models'
        },
        metadata: {
          image: 'https://api.finnexusai.com/nft/ai_master.png',
          attributes: [
            { trait_type: 'Category', value: 'AI Trading' },
            { trait_type: 'Rarity', value: 'Legendary' },
            { trait_type: 'Experience', value: 5000 },
            { trait_type: 'Special Power', value: 'AI Accuracy Boost' },
            { trait_type: 'Exclusive Access', value: 'Premium AI Models' }
          ]
        },
        minted: 0,
        maxSupply: 25
      });

      // Quantum Trading Achievements
      this.nftAchievements.set('quantum_trader', {
        id: 'quantum_trader',
        name: 'Quantum Trader',
        description: 'Use quantum computing simulations for portfolio optimization',
        category: 'quantum_trading',
        rarity: 'mythic',
        requirements: {
          quantumSimulations: 50,
          quantumAccuracy: 0.8
        },
        rewards: {
          experience: 10000,
          tokens: 5000,
          badge: 'quantum_trader',
          title: 'Quantum Trader',
          specialPower: 'quantum_insights',
          exclusiveAccess: 'quantum_trading_floor'
        },
        metadata: {
          image: 'https://api.finnexusai.com/nft/quantum_trader.png',
          attributes: [
            { trait_type: 'Category', value: 'Quantum Trading' },
            { trait_type: 'Rarity', value: 'Mythic' },
            { trait_type: 'Experience', value: 10000 },
            { trait_type: 'Special Power', value: 'Quantum Insights' },
            { trait_type: 'Exclusive Access', value: 'Quantum Trading Floor' }
          ]
        },
        minted: 0,
        maxSupply: 10
      });

      // Metaverse Achievements
      this.nftAchievements.set('metaverse_explorer', {
        id: 'metaverse_explorer',
        name: 'Metaverse Explorer',
        description: 'Complete 10+ trading sessions in virtual worlds',
        category: 'metaverse',
        rarity: 'rare',
        requirements: {
          metaverseSessions: 10,
          virtualWorlds: 3
        },
        rewards: {
          experience: 2000,
          tokens: 1000,
          badge: 'metaverse_explorer',
          title: 'Metaverse Explorer',
          specialPower: 'virtual_trading_boost'
        },
        metadata: {
          image: 'https://api.finnexusai.com/nft/metaverse_explorer.png',
          attributes: [
            { trait_type: 'Category', value: 'Metaverse' },
            { trait_type: 'Rarity', value: 'Rare' },
            { trait_type: 'Experience', value: 2000 },
            { trait_type: 'Special Power', value: 'Virtual Trading Boost' }
          ]
        },
        minted: 0,
        maxSupply: 200
      });

      logger.info(`✅ Initialized ${this.nftAchievements.size} NFT achievements`);
    } catch (error) {
      logger.error('Failed to initialize NFT achievements:', error);
      throw error;
    }
  }

  // Initialize trading challenges
  async initializeTradingChallenges() {
    try {
      // Daily Challenges
      this.tradingChallenges.set('daily_profit_challenge', {
        id: 'daily_profit_challenge',
        name: 'Daily Profit Challenge',
        description: 'Make a profit of at least 2% in a single day',
        type: 'daily',
        difficulty: 'medium',
        requirements: {
          dailyProfit: 0.02,
          minTrades: 1
        },
        rewards: {
          experience: 200,
          tokens: 100,
          streakBonus: true
        },
        duration: 24, // hours
        cooldown: 0,
        isActive: true
      });

      this.tradingChallenges.set('daily_volume_challenge', {
        id: 'daily_volume_challenge',
        name: 'Daily Volume Challenge',
        description: 'Achieve $5,000 in daily trading volume',
        type: 'daily',
        difficulty: 'hard',
        requirements: {
          dailyVolume: 5000,
          minTrades: 5
        },
        rewards: {
          experience: 300,
          tokens: 150,
          streakBonus: true
        },
        duration: 24,
        cooldown: 0,
        isActive: true
      });

      // Weekly Challenges
      this.tradingChallenges.set('weekly_sharpe_challenge', {
        id: 'weekly_sharpe_challenge',
        name: 'Weekly Sharpe Challenge',
        description: 'Achieve a Sharpe ratio of 1.5+ for the week',
        type: 'weekly',
        difficulty: 'hard',
        requirements: {
          sharpeRatio: 1.5,
          minTrades: 20,
          minReturn: 0.05
        },
        rewards: {
          experience: 1000,
          tokens: 500,
          nftChance: 0.1
        },
        duration: 168, // hours (7 days)
        cooldown: 0,
        isActive: true
      });

      // Monthly Challenges
      this.tradingChallenges.set('monthly_consistency_challenge', {
        id: 'monthly_consistency_challenge',
        name: 'Monthly Consistency Challenge',
        description: 'Maintain positive returns for 20+ days in a month',
        type: 'monthly',
        difficulty: 'epic',
        requirements: {
          positiveDays: 20,
          totalDays: 30,
          minReturn: 0.001
        },
        rewards: {
          experience: 2500,
          tokens: 1250,
          nftChance: 0.25,
          exclusiveTitle: 'Consistency Master'
        },
        duration: 720, // hours (30 days)
        cooldown: 0,
        isActive: true
      });

      // Special Event Challenges
      this.tradingChallenges.set('bull_market_master', {
        id: 'bull_market_master',
        name: 'Bull Market Master',
        description: 'Capitalize on a bull market with 50%+ returns',
        type: 'special',
        difficulty: 'legendary',
        requirements: {
          totalReturn: 0.5,
          marketCondition: 'bull',
          minDuration: 7
        },
        rewards: {
          experience: 5000,
          tokens: 2500,
          nftChance: 0.5,
          exclusiveNFT: 'bull_market_master_nft',
          specialPower: 'bull_market_boost'
        },
        duration: 168, // 7 days
        cooldown: 720, // 30 days cooldown
        isActive: false // Only active during bull markets
      });

      logger.info(`✅ Initialized ${this.tradingChallenges.size} trading challenges`);
    } catch (error) {
      logger.error('Failed to initialize trading challenges:', error);
      throw error;
    }
  }

  // Initialize gamification mechanics
  async initializeGamificationMechanics() {
    try {
      // Experience System
      this.gamificationMechanics.set('experience_system', {
        name: 'Experience System',
        description: 'Gain experience points for trading activities',
        mechanics: {
          tradeExecution: 10,
          profitableTrade: 25,
          dailyLogin: 5,
          challengeCompletion: 100,
          achievementUnlock: 50,
          socialInteraction: 15
        },
        levels: [
          { level: 1, experience: 0, rewards: ['basic_analytics'] },
          { level: 5, experience: 500, rewards: ['advanced_analytics', 'custom_avatar'] },
          { level: 10, experience: 1500, rewards: ['premium_features', 'exclusive_challenges'] },
          { level: 20, experience: 5000, rewards: ['vip_support', 'early_access'] },
          { level: 50, experience: 25000, rewards: ['legendary_status', 'governance_rights'] }
        ]
      });

      // Streak System
      this.gamificationMechanics.set('streak_system', {
        name: 'Streak System',
        description: 'Reward consistent daily activity',
        mechanics: {
          dailyLogin: true,
          dailyTrading: true,
          streakMultiplier: 1.5,
          maxStreak: 365
        },
        rewards: {
          7: { experience: 100, tokens: 50 },
          30: { experience: 500, tokens: 250, badge: 'monthly_streak' },
          100: { experience: 2000, tokens: 1000, badge: 'centurion_streak' },
          365: { experience: 10000, tokens: 5000, badge: 'yearly_streak', title: 'Streak Master' }
        }
      });

      // Badge System
      this.gamificationMechanics.set('badge_system', {
        name: 'Badge System',
        description: 'Collectible badges for various achievements',
        categories: [
          'trading',
          'risk_management',
          'portfolio_management',
          'social_trading',
          'ai_trading',
          'quantum_trading',
          'metaverse',
          'community'
        ],
        rarities: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'],
        effects: {
          trading_boost: 0.05,
          risk_reduction: 0.02,
          experience_bonus: 0.1,
          token_bonus: 0.15
        }
      });

      // Leaderboard System
      this.gamificationMechanics.set('leaderboard_system', {
        name: 'Leaderboard System',
        description: 'Competitive rankings for various metrics',
        categories: [
          'total_return',
          'sharpe_ratio',
          'win_rate',
          'experience_points',
          'badges_collected',
          'challenges_completed'
        ],
        periods: ['daily', 'weekly', 'monthly', 'yearly', 'all_time'],
        rewards: {
          top1: { experience: 1000, tokens: 500, badge: 'champion' },
          top3: { experience: 500, tokens: 250, badge: 'podium' },
          top10: { experience: 250, tokens: 125, badge: 'top_ten' },
          top100: { experience: 100, tokens: 50 }
        }
      });

      logger.info(`✅ Initialized ${this.gamificationMechanics.size} gamification mechanics`);
    } catch (error) {
      logger.error('Failed to initialize gamification mechanics:', error);
      throw error;
    }
  }

  // Initialize rewards system
  async initializeRewardsSystem() {
    try {
      // Token Economy
      this.rewardsSystem.set('token_economy', {
        name: 'FinNexus Token (FNT)',
        symbol: 'FNT',
        totalSupply: 100000000,
        distribution: {
          trading_rewards: 0.4,
          challenge_rewards: 0.2,
          achievement_rewards: 0.15,
          social_rewards: 0.1,
          referral_rewards: 0.1,
          staking_rewards: 0.05
        },
        utilities: [
          'fee_discounts',
          'premium_features',
          'nft_purchases',
          'governance_voting',
          'staking_rewards'
        ]
      });

      // Reward Multipliers
      this.rewardsSystem.set('reward_multipliers', {
        vip_status: {
          bronze: 1.1,
          silver: 1.2,
          gold: 1.3,
          platinum: 1.5,
          diamond: 2.0
        },
        streak_bonus: {
          active: 1.5,
          max: 3.0
        },
        weekend_bonus: 1.2,
        holiday_bonus: 2.0
      });

      // Staking Rewards
      this.rewardsSystem.set('staking_rewards', {
        pools: [
          {
            name: 'Basic Staking',
            minAmount: 1000,
            apy: 0.1,
            lockPeriod: 30
          },
          {
            name: 'Premium Staking',
            minAmount: 10000,
            apy: 0.15,
            lockPeriod: 90
          },
          {
            name: 'Elite Staking',
            minAmount: 100000,
            apy: 0.25,
            lockPeriod: 365
          }
        ]
      });

      logger.info('✅ Rewards system initialized');
    } catch (error) {
      logger.error('Failed to initialize rewards system:', error);
      throw error;
    }
  }

  // Initialize NFT marketplace
  async initializeNFTMarketplace() {
    try {
      this.nftMarketplace.set('marketplace_rules', {
        fees: {
          listingFee: 0.025, // 2.5%
          transactionFee: 0.025, // 2.5%
          royaltyFee: 0.05 // 5% to original creator
        },
        tradingPairs: ['FNT', 'ETH', 'USDC'],
        rarityMultipliers: {
          common: 1.0,
          uncommon: 1.5,
          rare: 2.0,
          epic: 3.0,
          legendary: 5.0,
          mythic: 10.0
        }
      });

      logger.info('✅ NFT marketplace initialized');
    } catch (error) {
      logger.error('Failed to initialize NFT marketplace:', error);
      throw error;
    }
  }

  // Award achievement
  async awardAchievement(userId, achievementId, tradeData = null) {
    try {
      const achievement = this.nftAchievements.get(achievementId);
      if (!achievement) {
        throw new Error(`Achievement ${achievementId} not found`);
      }

      // Check if user already has this achievement
      const userAchievements = await this.getUserAchievements(userId);
      if (userAchievements.includes(achievementId)) {
        throw new Error(`User ${userId} already has achievement ${achievementId}`);
      }

      // Check if achievement requirements are met
      const requirementsMet = await this.checkAchievementRequirements(userId, achievement, tradeData);
      if (!requirementsMet) {
        throw new Error(`Requirements not met for achievement ${achievementId}`);
      }

      // Mint NFT achievement
      const nftId = await this.mintNFTAchievement(userId, achievement);

      // Award rewards
      await this.awardRewards(userId, achievement.rewards);

      // Update user profile
      await this.updateUserProfile(userId, {
        achievements: [...userAchievements, achievementId],
        experience: achievement.rewards.experience,
        tokens: achievement.rewards.tokens
      });

      logger.info(`🏆 Awarded achievement ${achievement.name} to user ${userId}`);

      return {
        success: true,
        userId,
        achievementId,
        nftId,
        rewards: achievement.rewards,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error(`Failed to award achievement ${achievementId} to user ${userId}:`, error);
      throw error;
    }
  }

  // Complete trading challenge
  async completeTradingChallenge(userId, challengeId, challengeData) {
    try {
      const challenge = this.tradingChallenges.get(challengeId);
      if (!challenge) {
        throw new Error(`Challenge ${challengeId} not found`);
      }

      if (!challenge.isActive) {
        throw new Error(`Challenge ${challengeId} is not active`);
      }

      // Check if challenge requirements are met
      const requirementsMet = await this.checkChallengeRequirements(userId, challenge, challengeData);
      if (!requirementsMet) {
        throw new Error(`Requirements not met for challenge ${challengeId}`);
      }

      // Check cooldown
      const cooldownCheck = await this.checkChallengeCooldown(userId, challenge);
      if (!cooldownCheck) {
        throw new Error(`Challenge ${challengeId} is on cooldown`);
      }

      // Award challenge rewards
      await this.awardChallengeRewards(userId, challenge);

      // Update challenge completion
      await this.updateChallengeCompletion(userId, challengeId);

      logger.info(`🎯 User ${userId} completed challenge ${challenge.name}`);

      return {
        success: true,
        userId,
        challengeId,
        challengeName: challenge.name,
        rewards: challenge.rewards,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error(`Failed to complete challenge ${challengeId} for user ${userId}:`, error);
      throw error;
    }
  }

  // Update user experience
  async updateUserExperience(userId, activity, amount = 1) {
    try {
      const experienceSystem = this.gamificationMechanics.get('experience_system');
      const baseExperience = experienceSystem.mechanics[activity] || 0;

      // Apply multipliers
      const multiplier = await this.calculateExperienceMultiplier(userId);
      const totalExperience = Math.floor(baseExperience * amount * multiplier);

      // Update user profile
      const userProfile = await this.getUserProfile(userId);
      userProfile.experience += totalExperience;
      userProfile.level = this.calculateUserLevel(userProfile.experience);

      // Check for level up rewards
      const levelUpRewards = await this.checkLevelUpRewards(userId, userProfile.level);
      if (levelUpRewards.length > 0) {
        await this.awardLevelUpRewards(userId, levelUpRewards);
      }

      await this.updateUserProfile(userId, userProfile);

      logger.info(`📈 User ${userId} gained ${totalExperience} experience (${activity})`);

      return {
        success: true,
        userId,
        activity,
        experienceGained: totalExperience,
        newLevel: userProfile.level,
        levelUpRewards,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error(`Failed to update experience for user ${userId}:`, error);
      throw error;
    }
  }

  // Update user streak
  async updateUserStreak(userId) {
    try {
      const streakSystem = this.gamificationMechanics.get('streak_system');
      const userProfile = await this.getUserProfile(userId);

      const today = new Date().toDateString();
      const lastActiveDate = userProfile.lastActiveDate;

      if (lastActiveDate === today) {
        // User already active today
        return {
          success: true,
          userId,
          currentStreak: userProfile.streak,
          message: 'Already active today'
        };
      }

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

      if (lastActiveDate === yesterday) {
        // Streak continues
        userProfile.streak++;
      } else {
        // Streak broken
        userProfile.streak = 1;
      }

      userProfile.lastActiveDate = today;

      // Check for streak rewards
      const streakRewards = await this.checkStreakRewards(userId, userProfile.streak);
      if (streakRewards) {
        await this.awardStreakRewards(userId, streakRewards);
      }

      await this.updateUserProfile(userId, userProfile);

      logger.info(`🔥 User ${userId} streak updated to ${userProfile.streak} days`);

      return {
        success: true,
        userId,
        currentStreak: userProfile.streak,
        streakRewards,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error(`Failed to update streak for user ${userId}:`, error);
      throw error;
    }
  }

  // Get play-to-earn status
  getPlayToEarnStatus() {
    const status = {
      isInitialized: this.isInitialized,
      nftAchievements: {},
      tradingChallenges: {},
      gamificationMechanics: {},
      rewardsSystem: {},
      nftMarketplace: {}
    };

    // Add NFT achievements information
    for (const [id, achievement] of this.nftAchievements) {
      status.nftAchievements[id] = {
        name: achievement.name,
        category: achievement.category,
        rarity: achievement.rarity,
        minted: achievement.minted,
        maxSupply: achievement.maxSupply,
        rewards: achievement.rewards
      };
    }

    // Add trading challenges information
    for (const [id, challenge] of this.tradingChallenges) {
      status.tradingChallenges[id] = {
        name: challenge.name,
        type: challenge.type,
        difficulty: challenge.difficulty,
        rewards: challenge.rewards,
        isActive: challenge.isActive
      };
    }

    // Add gamification mechanics information
    for (const [id, mechanic] of this.gamificationMechanics) {
      status.gamificationMechanics[id] = {
        name: mechanic.name,
        description: mechanic.description
      };
    }

    // Add rewards system information
    const tokenEconomy = this.rewardsSystem.get('token_economy');
    const rewardMultipliers = this.rewardsSystem.get('reward_multipliers');
    const stakingRewards = this.rewardsSystem.get('staking_rewards');

    status.rewardsSystem = {
      token: tokenEconomy.name,
      symbol: tokenEconomy.symbol,
      totalSupply: tokenEconomy.totalSupply,
      utilities: tokenEconomy.utilities,
      stakingPools: stakingRewards.pools.length
    };

    // Add NFT marketplace information
    const marketplaceRules = this.nftMarketplace.get('marketplace_rules');
    status.nftMarketplace = {
      fees: marketplaceRules.fees,
      tradingPairs: marketplaceRules.tradingPairs,
      rarityMultipliers: marketplaceRules.rarityMultipliers
    };

    return status;
  }

  // Helper methods
  async getUserAchievements(userId) {
    const userProfile = await this.getUserProfile(userId);
    return userProfile.achievements || [];
  }

  async getUserProfile(userId) {
    let userProfile = this.userProfiles.get(userId);
    if (!userProfile) {
      userProfile = {
        userId,
        level: 1,
        experience: 0,
        tokens: 0,
        streak: 0,
        lastActiveDate: null,
        achievements: [],
        badges: [],
        challengesCompleted: [],
        nftCollection: []
      };
      this.userProfiles.set(userId, userProfile);
    }
    return userProfile;
  }

  async updateUserProfile(userId, profile) {
    this.userProfiles.set(userId, profile);
  }

  async checkAchievementRequirements(userId, achievement, tradeData) {
    // Simplified requirement checking
    // In a real implementation, this would check against actual user data
    return true;
  }

  async checkChallengeRequirements(userId, challenge, challengeData) {
    // Simplified requirement checking
    return true;
  }

  async checkChallengeCooldown(userId, challenge) {
    // Simplified cooldown checking
    return true;
  }

  async mintNFTAchievement(userId, achievement) {
    const nftId = `nft_${achievement.id}_${userId}_${Date.now()}`;
    achievement.minted++;

    // In a real implementation, this would mint an actual NFT on blockchain
    logger.info(`🎨 Minted NFT ${nftId} for achievement ${achievement.name}`);

    return nftId;
  }

  async awardRewards(userId, rewards) {
    // In a real implementation, this would update user balances
    logger.info(`💰 Awarded rewards to user ${userId}:`, rewards);
  }

  async awardChallengeRewards(userId, challenge) {
    // In a real implementation, this would award challenge rewards
    logger.info(`🎁 Awarded challenge rewards to user ${userId}:`, challenge.rewards);
  }

  async updateChallengeCompletion(userId, challengeId) {
    const userProfile = await this.getUserProfile(userId);
    if (!userProfile.challengesCompleted.includes(challengeId)) {
      userProfile.challengesCompleted.push(challengeId);
      await this.updateUserProfile(userId, userProfile);
    }
  }

  async calculateExperienceMultiplier(userId) {
    // In a real implementation, this would calculate based on VIP status, streak, etc.
    return 1.0;
  }

  calculateUserLevel(experience) {
    const experienceSystem = this.gamificationMechanics.get('experience_system');
    let level = 1;

    for (const levelData of experienceSystem.levels) {
      if (experience >= levelData.experience) {
        level = levelData.level;
      } else {
        break;
      }
    }

    return level;
  }

  async checkLevelUpRewards(userId, newLevel) {
    const experienceSystem = this.gamificationMechanics.get('experience_system');
    const rewards = [];

    for (const levelData of experienceSystem.levels) {
      if (levelData.level === newLevel) {
        rewards.push(...levelData.rewards);
      }
    }

    return rewards;
  }

  async awardLevelUpRewards(userId, rewards) {
    // In a real implementation, this would award level up rewards
    logger.info(`🎉 Awarded level up rewards to user ${userId}:`, rewards);
  }

  async checkStreakRewards(userId, streak) {
    const streakSystem = this.gamificationMechanics.get('streak_system');
    return streakSystem.rewards[streak] || null;
  }

  async awardStreakRewards(userId, rewards) {
    // In a real implementation, this would award streak rewards
    logger.info(`🔥 Awarded streak rewards to user ${userId}:`, rewards);
  }
}

module.exports = new PlayToEarnService();

