/**
 * FinAI Nexus - Staking Rewards Service
 *
 * This service manages advanced staking rewards including:
 * - Multi-tier reward structures
 * - Compound staking mechanisms
 * - Bonus rewards and promotions
 * - NFT rewards and achievements
 * - Cross-pool reward optimization
 * - Dynamic APY adjustments
 */

const crypto = require('crypto');

class StakingRewardsService {
  constructor() {
    this.rewardTiers = new Map([
      ['bronze', {
        id: 'bronze',
        name: 'Bronze Tier',
        minStake: 1000,
        multiplier: 1.0,
        bonusFeatures: ['basic_rewards', 'governance_voting'],
        nftRewards: ['bronze_badge'],
        specialBonuses: []
      }],
      ['silver', {
        id: 'silver',
        name: 'Silver Tier',
        minStake: 10000,
        multiplier: 1.2,
        bonusFeatures: ['enhanced_rewards', 'priority_support', 'early_access'],
        nftRewards: ['silver_badge', 'silver_avatar'],
        specialBonuses: ['weekly_bonus']
      }],
      ['gold', {
        id: 'gold',
        name: 'Gold Tier',
        minStake: 50000,
        multiplier: 1.5,
        bonusFeatures: ['premium_rewards', 'exclusive_events', 'custom_avatars'],
        nftRewards: ['gold_badge', 'gold_avatar', 'gold_background'],
        specialBonuses: ['weekly_bonus', 'monthly_airdrop']
      }],
      ['platinum', {
        id: 'platinum',
        name: 'Platinum Tier',
        minStake: 100000,
        multiplier: 2.0,
        bonusFeatures: ['maximum_rewards', 'vip_support', 'beta_features'],
        nftRewards: ['platinum_badge', 'platinum_avatar', 'platinum_background', 'exclusive_nft'],
        specialBonuses: ['weekly_bonus', 'monthly_airdrop', 'quarterly_rewards']
      }],
      ['diamond', {
        id: 'diamond',
        name: 'Diamond Tier',
        minStake: 500000,
        multiplier: 3.0,
        bonusFeatures: ['ultimate_rewards', 'white_glove_support', 'exclusive_access'],
        nftRewards: ['diamond_badge', 'diamond_avatar', 'diamond_background', 'legendary_nft'],
        specialBonuses: ['daily_bonus', 'weekly_bonus', 'monthly_airdrop', 'quarterly_rewards', 'annual_rewards']
      }]
    ]);

    this.bonusEvents = new Map([
      ['new_year', {
        id: 'new_year',
        name: 'New Year Staking Bonus',
        multiplier: 1.5,
        duration: 30, // days
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        conditions: ['min_stake_1000', 'active_staking']
      }],
      ['valentines', {
        id: 'valentines',
        name: 'Valentine\'s Day Love Bonus',
        multiplier: 1.25,
        duration: 14,
        startDate: new Date('2024-02-10'),
        endDate: new Date('2024-02-24'),
        conditions: ['min_stake_5000', 'couple_staking']
      }],
      ['summer', {
        id: 'summer',
        name: 'Summer Solstice Bonus',
        multiplier: 1.3,
        duration: 60,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-07-31'),
        conditions: ['min_stake_25000', 'long_term_staking']
      }],
      ['anniversary', {
        id: 'anniversary',
        name: 'Platform Anniversary',
        multiplier: 2.0,
        duration: 7,
        startDate: new Date('2024-12-15'),
        endDate: new Date('2024-12-22'),
        conditions: ['early_adopter', 'min_stake_10000']
      }]
    ]);

    this.nftRewards = new Map([
      ['bronze_badge', {
        id: 'bronze_badge',
        name: 'Bronze Staking Badge',
        tier: 'bronze',
        rarity: 'common',
        attributes: {
          staking_duration: '30_days',
          multiplier: 1.0,
          special_power: 'basic_governance'
        },
        mintCost: 1000,
        maxSupply: 10000
      }],
      ['silver_badge', {
        id: 'silver_badge',
        name: 'Silver Staking Badge',
        tier: 'silver',
        rarity: 'uncommon',
        attributes: {
          staking_duration: '90_days',
          multiplier: 1.2,
          special_power: 'enhanced_rewards'
        },
        mintCost: 10000,
        maxSupply: 5000
      }],
      ['gold_badge', {
        id: 'gold_badge',
        name: 'Gold Staking Badge',
        tier: 'gold',
        rarity: 'rare',
        attributes: {
          staking_duration: '180_days',
          multiplier: 1.5,
          special_power: 'premium_features'
        },
        mintCost: 50000,
        maxSupply: 1000
      }],
      ['platinum_badge', {
        id: 'platinum_badge',
        name: 'Platinum Staking Badge',
        tier: 'platinum',
        rarity: 'epic',
        attributes: {
          staking_duration: '365_days',
          multiplier: 2.0,
          special_power: 'vip_access'
        },
        mintCost: 100000,
        maxSupply: 500
      }],
      ['diamond_badge', {
        id: 'diamond_badge',
        name: 'Diamond Staking Badge',
        tier: 'diamond',
        rarity: 'legendary',
        attributes: {
          staking_duration: '730_days',
          multiplier: 3.0,
          special_power: 'ultimate_privileges'
        },
        mintCost: 500000,
        maxSupply: 100
      }]
    ]);

    this.compoundStaking = {
      enabled: true,
      minimumCompound: 100,
      compoundFrequency: 'daily',
      compoundBonus: 0.1, // 10% bonus for compounding
      maxCompounds: 365
    };

    this.referralProgram = {
      enabled: true,
      referrerReward: 0.05, // 5% of referred user's rewards
      refereeBonus: 0.02, // 2% bonus for referee
      maxReferralDepth: 3,
      referralTiers: [
        { level: 1, reward: 0.05 },
        { level: 2, reward: 0.03 },
        { level: 3, reward: 0.01 }
      ]
    };
  }

  // Calculate comprehensive staking rewards
  calculateStakingRewards(userId, stakeAmount, poolId, duration, tier = 'bronze') {
    const baseAPY = this.getBaseAPY(poolId);
    const tierMultiplier = this.getTierMultiplier(tier);
    const bonusMultiplier = this.getActiveBonusMultiplier();
    const compoundBonus = this.getCompoundBonus();

    const effectiveAPY = baseAPY * tierMultiplier * bonusMultiplier * compoundBonus;

    const dailyReward = (stakeAmount * effectiveAPY / 100) / 365;
    const totalRewards = dailyReward * duration;

    return {
      baseAPY,
      effectiveAPY,
      tierMultiplier,
      bonusMultiplier,
      compoundBonus,
      dailyReward,
      totalRewards,
      breakdown: {
        baseRewards: (stakeAmount * baseAPY / 100) / 365 * duration,
        tierBonus: (stakeAmount * baseAPY * (tierMultiplier - 1) / 100) / 365 * duration,
        eventBonus: (stakeAmount * baseAPY * (bonusMultiplier - 1) / 100) / 365 * duration,
        compoundBonus: (stakeAmount * baseAPY * (compoundBonus - 1) / 100) / 365 * duration
      }
    };
  }

  // Get user's reward tier based on total staked amount
  getUserRewardTier(totalStaked) {
    const tiers = Array.from(this.rewardTiers.values()).reverse();

    for (const tier of tiers) {
      if (totalStaked >= tier.minStake) {
        return tier;
      }
    }

    return this.rewardTiers.get('bronze');
  }

  // Calculate compound staking rewards
  calculateCompoundRewards(initialStake, apy, duration, compoundFrequency = 'daily') {
    const periods = this.getCompoundPeriods(duration, compoundFrequency);
    const rate = apy / 100;

    let compoundAmount = initialStake;
    const rewards = [];

    for (let i = 0; i < periods; i++) {
      const periodReward = compoundAmount * (rate / periods);
      compoundAmount += periodReward;

      rewards.push({
        period: i + 1,
        reward: periodReward,
        totalAmount: compoundAmount,
        cumulativeReward: compoundAmount - initialStake
      });
    }

    return {
      initialStake,
      finalAmount: compoundAmount,
      totalRewards: compoundAmount - initialStake,
      effectiveAPY: ((compoundAmount / initialStake) ** (365 / duration) - 1) * 100,
      rewards
    };
  }

  // Get NFT rewards for staking tier
  getNFTRewards(tierId) {
    const tier = this.rewardTiers.get(tierId);
    if (!tier) return [];

    return tier.nftRewards.map(nftId => this.nftRewards.get(nftId));
  }

  // Calculate referral rewards
  calculateReferralRewards(referrerId, refereeId, refereeRewards) {
    const referralRewards = {
      referrer: {
        userId: referrerId,
        reward: refereeRewards * this.referralProgram.referrerReward,
        type: 'referral_commission'
      },
      referee: {
        userId: refereeId,
        reward: refereeRewards * this.referralProgram.refereeBonus,
        type: 'referral_bonus'
      }
    };

    return referralRewards;
  }

  // Get active bonus events
  getActiveBonusEvents() {
    const now = new Date();
    const activeEvents = [];

    for (const event of this.bonusEvents.values()) {
      if (now >= event.startDate && now <= event.endDate) {
        activeEvents.push(event);
      }
    }

    return activeEvents;
  }

  // Calculate loyalty rewards
  calculateLoyaltyRewards(userId, stakingHistory) {
    const loyaltyMultiplier = this.calculateLoyaltyMultiplier(stakingHistory);
    const loyaltyBonuses = this.getLoyaltyBonuses(stakingHistory);

    return {
      multiplier: loyaltyMultiplier,
      bonuses: loyaltyBonuses,
      nextMilestone: this.getNextLoyaltyMilestone(stakingHistory)
    };
  }

  // Get staking leaderboard
  getStakingLeaderboard(period = 'monthly') {
    return {
      success: true,
      leaderboard: [
        {
          rank: 1,
          userId: 'user_001',
          totalStaked: 2500000,
          rewards: 125000,
          tier: 'diamond',
          nftCount: 15
        },
        {
          rank: 2,
          userId: 'user_002',
          totalStaked: 1800000,
          rewards: 95000,
          tier: 'platinum',
          nftCount: 12
        },
        {
          rank: 3,
          userId: 'user_003',
          totalStaked: 1200000,
          rewards: 75000,
          tier: 'platinum',
          nftCount: 10
        },
        {
          rank: 4,
          userId: 'user_004',
          totalStaked: 950000,
          rewards: 60000,
          tier: 'gold',
          nftCount: 8
        },
        {
          rank: 5,
          userId: 'user_005',
          totalStaked: 750000,
          rewards: 45000,
          tier: 'gold',
          nftCount: 6
        }
      ],
      period,
      totalParticipants: 1250,
      totalRewardsDistributed: 2500000
    };
  }

  // Get reward analytics
  getRewardAnalytics() {
    return {
      success: true,
      analytics: {
        totalRewardsDistributed: 12500000,
        averageAPY: 18.5,
        topTier: 'gold',
        mostPopularPool: 'premium',
        nftMints: {
          total: 2500,
          byTier: {
            bronze: 1000,
            silver: 800,
            gold: 500,
            platinum: 150,
            diamond: 50
          }
        },
        bonusEvents: {
          active: this.getActiveBonusEvents().length,
          total: this.bonusEvents.size,
          averageMultiplier: 1.5
        },
        compoundStaking: {
          enabled: this.compoundStaking.enabled,
          participationRate: 0.65,
          averageCompoundBonus: 0.1
        },
        referralProgram: {
          activeReferrals: 2500,
          totalCommissionsPaid: 125000,
          averageReferralReward: 50
        }
      }
    };
  }

  // Helper methods
  getBaseAPY(poolId) {
    const apyMap = {
      'basic': 12.5,
      'premium': 18.5,
      'enterprise': 25.0,
      'validator': 35.0
    };
    return apyMap[poolId] || 12.5;
  }

  getTierMultiplier(tier) {
    const tierMultipliers = {
      'bronze': 1.0,
      'silver': 1.2,
      'gold': 1.5,
      'platinum': 2.0,
      'diamond': 3.0
    };
    return tierMultipliers[tier] || 1.0;
  }

  getActiveBonusMultiplier() {
    const activeEvents = this.getActiveBonusEvents();
    if (activeEvents.length === 0) return 1.0;

    // Return the highest multiplier from active events
    return Math.max(...activeEvents.map(event => event.multiplier));
  }

  getCompoundBonus() {
    return this.compoundStaking.enabled ? (1 + this.compoundStaking.compoundBonus) : 1.0;
  }

  getCompoundPeriods(duration, frequency) {
    const frequencyMap = {
      'daily': 365,
      'weekly': 52,
      'monthly': 12,
      'quarterly': 4,
      'yearly': 1
    };

    const periodsPerYear = frequencyMap[frequency] || 365;
    return Math.floor((duration / 365) * periodsPerYear);
  }

  calculateLoyaltyMultiplier(stakingHistory) {
    const totalDays = stakingHistory.reduce((sum, stake) => {
      const days = (stake.endDate - stake.startDate) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);

    if (totalDays >= 730) return 1.5; // 2+ years
    if (totalDays >= 365) return 1.3; // 1+ year
    if (totalDays >= 180) return 1.2; // 6+ months
    if (totalDays >= 90) return 1.1; // 3+ months

    return 1.0;
  }

  getLoyaltyBonuses(stakingHistory) {
    const bonuses = [];
    const totalStaked = stakingHistory.reduce((sum, stake) => sum + stake.amount, 0);

    if (totalStaked >= 1000000) bonuses.push({ name: 'Millionaire Club', reward: 5000 });
    if (totalStaked >= 500000) bonuses.push({ name: 'Half Million Club', reward: 2500 });
    if (totalStaked >= 100000) bonuses.push({ name: 'Century Club', reward: 1000 });

    return bonuses;
  }

  getNextLoyaltyMilestone(stakingHistory) {
    const totalStaked = stakingHistory.reduce((sum, stake) => sum + stake.amount, 0);

    if (totalStaked < 100000) return { milestone: 'Century Club', target: 100000, reward: 1000 };
    if (totalStaked < 500000) return { milestone: 'Half Million Club', target: 500000, reward: 2500 };
    if (totalStaked < 1000000) return { milestone: 'Millionaire Club', target: 1000000, reward: 5000 };

    return { milestone: 'Legend', target: 2000000, reward: 10000 };
  }
}

module.exports = StakingRewardsService;
