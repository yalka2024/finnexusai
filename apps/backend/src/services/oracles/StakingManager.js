/**
 * FinAI Nexus - Staking Manager
 * 
 * Manages $NEXUS token staking for oracle participation:
 * - Token staking and unstaking
 * - Reward distribution
 * - Slashing for malicious behavior
 * - Staking pool management
 * - Governance participation
 */

import { BlockchainManager } from '../blockchain/BlockchainManager.js';
import { RewardCalculator } from './RewardCalculator.js';
import { SlashingManager } from './SlashingManager.js';
import { GovernanceManager } from './GovernanceManager.js';

export class StakingManager {
  constructor() {
    this.blockchain = new BlockchainManager();
    this.rewardCalculator = new RewardCalculator();
    this.slashingManager = new SlashingManager();
    this.governance = new GovernanceManager();
    
    this.stakingPools = new Map();
    this.stakingAccounts = new Map();
    this.rewardHistory = new Map();
    this.slashingHistory = new Map();
    
    this.stakingConfig = {
      minStake: 10000, // $NEXUS tokens
      maxStake: 1000000, // $NEXUS tokens
      rewardRate: 0.1, // 10% annual reward rate
      slashingRate: 0.05, // 5% slashing for malicious behavior
      unstakingPeriod: 7, // 7 days unstaking period
      maxValidators: 100,
      epochLength: 100, // blocks
      blockTime: 12 // seconds
    };
  }

  /**
   * Initialize staking account for a user
   * @param {string} userId - User ID
   * @param {Object} config - Staking configuration
   * @returns {Promise<Object>} Staking account
   */
  async initializeAccount(userId, config = {}) {
    try {
      // Create staking account
      const stakingAccount = {
        userId: userId,
        totalStaked: 0,
        availableBalance: 0,
        lockedBalance: 0,
        pendingUnstake: 0,
        totalRewards: 0,
        lastRewardClaim: new Date(),
        isActive: true,
        createdAt: new Date(),
        config: config
      };
      
      // Store account
      this.stakingAccounts.set(userId, stakingAccount);
      
      // Initialize blockchain staking contract
      await this.blockchain.initializeStakingContract(userId, config);
      
      return stakingAccount;
    } catch (error) {
      console.error('Staking account initialization failed:', error);
      throw new Error('Failed to initialize staking account');
    }
  }

  /**
   * Stake $NEXUS tokens
   * @param {string} userId - User ID
   * @param {number} amount - Amount to stake
   * @returns {Promise<Object>} Staking result
   */
  async stakeTokens(userId, amount) {
    try {
      const account = this.stakingAccounts.get(userId);
      if (!account) {
        throw new Error('Staking account not found');
      }
      
      // Validate stake amount
      await this.validateStakeAmount(amount);
      
      // Check user balance
      const userBalance = await this.getUserBalance(userId);
      if (userBalance < amount) {
        throw new Error('Insufficient balance');
      }
      
      // Execute staking transaction
      const stakingTx = await this.blockchain.stakeTokens(userId, amount);
      
      // Update account
      account.totalStaked += amount;
      account.availableBalance += amount;
      
      // Update staking pool
      await this.updateStakingPool(userId, amount);
      
      // Start reward calculation
      await this.startRewardCalculation(userId);
      
      return {
        success: true,
        transactionHash: stakingTx.hash,
        amount: amount,
        totalStaked: account.totalStaked,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Staking failed:', error);
      throw new Error('Failed to stake tokens');
    }
  }

  /**
   * Unstake $NEXUS tokens
   * @param {string} userId - User ID
   * @param {number} amount - Amount to unstake
   * @returns {Promise<Object>} Unstaking result
   */
  async unstakeTokens(userId, amount) {
    try {
      const account = this.stakingAccounts.get(userId);
      if (!account) {
        throw new Error('Staking account not found');
      }
      
      // Validate unstake amount
      if (amount > account.availableBalance) {
        throw new Error('Insufficient staked balance');
      }
      
      // Execute unstaking transaction
      const unstakingTx = await this.blockchain.unstakeTokens(userId, amount);
      
      // Update account
      account.totalStaked -= amount;
      account.availableBalance -= amount;
      account.pendingUnstake += amount;
      
      // Schedule unstaking completion
      await this.scheduleUnstakingCompletion(userId, amount);
      
      return {
        success: true,
        transactionHash: unstakingTx.hash,
        amount: amount,
        totalStaked: account.totalStaked,
        pendingUnstake: account.pendingUnstake,
        unstakingPeriod: this.stakingConfig.unstakingPeriod,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Unstaking failed:', error);
      throw new Error('Failed to unstake tokens');
    }
  }

  /**
   * Claim staking rewards
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Reward claim result
   */
  async claimRewards(userId) {
    try {
      const account = this.stakingAccounts.get(userId);
      if (!account) {
        throw new Error('Staking account not found');
      }
      
      // Calculate rewards
      const rewards = await this.calculateRewards(userId);
      
      if (rewards <= 0) {
        throw new Error('No rewards to claim');
      }
      
      // Execute reward claim transaction
      const claimTx = await this.blockchain.claimRewards(userId, rewards);
      
      // Update account
      account.totalRewards += rewards;
      account.lastRewardClaim = new Date();
      
      // Record reward history
      await this.recordRewardHistory(userId, rewards);
      
      return {
        success: true,
        transactionHash: claimTx.hash,
        rewards: rewards,
        totalRewards: account.totalRewards,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Reward claim failed:', error);
      throw new Error('Failed to claim rewards');
    }
  }

  /**
   * Slash tokens for malicious behavior
   * @param {string} userId - User ID
   * @param {number} amount - Amount to slash
   * @param {string} reason - Reason for slashing
   * @returns {Promise<Object>} Slashing result
   */
  async slashTokens(userId, amount, reason) {
    try {
      const account = this.stakingAccounts.get(userId);
      if (!account) {
        throw new Error('Staking account not found');
      }
      
      // Validate slash amount
      const maxSlash = account.totalStaked * this.stakingConfig.slashingRate;
      const slashAmount = Math.min(amount, maxSlash);
      
      // Execute slashing transaction
      const slashTx = await this.blockchain.slashTokens(userId, slashAmount);
      
      // Update account
      account.totalStaked -= slashAmount;
      account.availableBalance -= slashAmount;
      
      // Update staking pool
      await this.updateStakingPool(userId, -slashAmount);
      
      // Record slashing history
      await this.recordSlashingHistory(userId, slashAmount, reason);
      
      // Check if account should be deactivated
      if (account.totalStaked < this.stakingConfig.minStake) {
        await this.deactivateAccount(userId);
      }
      
      return {
        success: true,
        transactionHash: slashTx.hash,
        amount: slashAmount,
        reason: reason,
        totalStaked: account.totalStaked,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Slashing failed:', error);
      throw new Error('Failed to slash tokens');
    }
  }

  /**
   * Get staking account information
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Account information
   */
  async getAccountInfo(userId) {
    const account = this.stakingAccounts.get(userId);
    if (!account) {
      throw new Error('Staking account not found');
    }
    
    // Calculate current rewards
    const currentRewards = await this.calculateRewards(userId);
    
    // Get staking pool information
    const poolInfo = await this.getStakingPoolInfo();
    
    return {
      userId: userId,
      totalStaked: account.totalStaked,
      availableBalance: account.availableBalance,
      lockedBalance: account.lockedBalance,
      pendingUnstake: account.pendingUnstake,
      totalRewards: account.totalRewards,
      currentRewards: currentRewards,
      lastRewardClaim: account.lastRewardClaim,
      isActive: account.isActive,
      poolInfo: poolInfo,
      createdAt: account.createdAt
    };
  }

  /**
   * Get staking pool information
   * @returns {Promise<Object>} Pool information
   */
  async getStakingPoolInfo() {
    const totalStaked = Array.from(this.stakingAccounts.values())
      .reduce((sum, account) => sum + account.totalStaked, 0);
    
    const activeValidators = Array.from(this.stakingAccounts.values())
      .filter(account => account.isActive && account.totalStaked >= this.stakingConfig.minStake)
      .length;
    
    const totalRewards = Array.from(this.stakingAccounts.values())
      .reduce((sum, account) => sum + account.totalRewards, 0);
    
    return {
      totalStaked: totalStaked,
      activeValidators: activeValidators,
      totalRewards: totalRewards,
      rewardRate: this.stakingConfig.rewardRate,
      slashingRate: this.stakingConfig.slashingRate,
      minStake: this.stakingConfig.minStake,
      maxStake: this.stakingConfig.maxStake,
      maxValidators: this.stakingConfig.maxValidators
    };
  }

  /**
   * Calculate rewards for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Reward amount
   */
  async calculateRewards(userId) {
    const account = this.stakingAccounts.get(userId);
    if (!account) {
      return 0;
    }
    
    // Calculate time since last reward claim
    const timeSinceLastClaim = Date.now() - account.lastRewardClaim.getTime();
    const daysSinceLastClaim = timeSinceLastClaim / (1000 * 60 * 60 * 24);
    
    // Calculate annual reward rate
    const annualRewardRate = this.stakingConfig.rewardRate;
    const dailyRewardRate = annualRewardRate / 365;
    
    // Calculate rewards
    const rewards = account.totalStaked * dailyRewardRate * daysSinceLastClaim;
    
    return Math.max(0, rewards);
  }

  /**
   * Start reward calculation for a user
   */
  async startRewardCalculation(userId) {
    const account = this.stakingAccounts.get(userId);
    if (!account) {
      return;
    }
    
    // Start periodic reward calculation
    const rewardInterval = setInterval(async () => {
      try {
        const rewards = await this.calculateRewards(userId);
        
        // Auto-claim rewards if they exceed a threshold
        if (rewards > 100) { // 100 $NEXUS tokens
          await this.claimRewards(userId);
        }
      } catch (error) {
        console.error(`Reward calculation failed for user ${userId}:`, error);
      }
    }, 3600000); // Every hour
    
    // Store interval ID for cleanup
    account.rewardInterval = rewardInterval;
  }

  /**
   * Schedule unstaking completion
   */
  async scheduleUnstakingCompletion(userId, amount) {
    const completionTime = new Date(Date.now() + this.stakingConfig.unstakingPeriod * 24 * 60 * 60 * 1000);
    
    setTimeout(async () => {
      try {
        await this.completeUnstaking(userId, amount);
      } catch (error) {
        console.error(`Unstaking completion failed for user ${userId}:`, error);
      }
    }, this.stakingConfig.unstakingPeriod * 24 * 60 * 60 * 1000);
  }

  /**
   * Complete unstaking process
   */
  async completeUnstaking(userId, amount) {
    const account = this.stakingAccounts.get(userId);
    if (!account) {
      return;
    }
    
    // Execute unstaking completion transaction
    const completionTx = await this.blockchain.completeUnstaking(userId, amount);
    
    // Update account
    account.pendingUnstake -= amount;
    account.availableBalance += amount;
    
    return {
      success: true,
      transactionHash: completionTx.hash,
      amount: amount,
      timestamp: new Date()
    };
  }

  /**
   * Update staking pool
   */
  async updateStakingPool(userId, amount) {
    const pool = this.stakingPools.get('main') || {
      totalStaked: 0,
      validators: new Set(),
      lastUpdate: new Date()
    };
    
    pool.totalStaked += amount;
    pool.lastUpdate = new Date();
    
    if (amount > 0) {
      pool.validators.add(userId);
    } else if (amount < 0) {
      // Check if user still has stake
      const account = this.stakingAccounts.get(userId);
      if (account && account.totalStaked <= 0) {
        pool.validators.delete(userId);
      }
    }
    
    this.stakingPools.set('main', pool);
  }

  /**
   * Record reward history
   */
  async recordRewardHistory(userId, amount) {
    const history = this.rewardHistory.get(userId) || [];
    
    history.push({
      amount: amount,
      timestamp: new Date(),
      type: 'reward_claim'
    });
    
    this.rewardHistory.set(userId, history);
  }

  /**
   * Record slashing history
   */
  async recordSlashingHistory(userId, amount, reason) {
    const history = this.slashingHistory.get(userId) || [];
    
    history.push({
      amount: amount,
      reason: reason,
      timestamp: new Date(),
      type: 'slashing'
    });
    
    this.slashingHistory.set(userId, history);
  }

  /**
   * Deactivate account
   */
  async deactivateAccount(userId) {
    const account = this.stakingAccounts.get(userId);
    if (!account) {
      return;
    }
    
    // Deactivate account
    account.isActive = false;
    
    // Clear reward calculation interval
    if (account.rewardInterval) {
      clearInterval(account.rewardInterval);
    }
    
    // Remove from staking pool
    const pool = this.stakingPools.get('main');
    if (pool) {
      pool.validators.delete(userId);
    }
  }

  /**
   * Validate stake amount
   */
  async validateStakeAmount(amount) {
    if (amount < this.stakingConfig.minStake) {
      throw new Error(`Minimum stake is ${this.stakingConfig.minStake} $NEXUS tokens`);
    }
    
    if (amount > this.stakingConfig.maxStake) {
      throw new Error(`Maximum stake is ${this.stakingConfig.maxStake} $NEXUS tokens`);
    }
  }

  /**
   * Get user balance
   */
  async getUserBalance(userId) {
    // In real implementation, fetch from blockchain
    return 100000; // Mock balance
  }

  /**
   * Get staking statistics
   * @returns {Promise<Object>} Staking statistics
   */
  async getStakingStatistics() {
    const accounts = Array.from(this.stakingAccounts.values());
    
    const totalStaked = accounts.reduce((sum, account) => sum + account.totalStaked, 0);
    const activeAccounts = accounts.filter(account => account.isActive).length;
    const totalRewards = accounts.reduce((sum, account) => sum + account.totalRewards, 0);
    
    const avgStake = activeAccounts > 0 ? totalStaked / activeAccounts : 0;
    const avgRewards = activeAccounts > 0 ? totalRewards / activeAccounts : 0;
    
    return {
      totalStaked: totalStaked,
      activeAccounts: activeAccounts,
      totalRewards: totalRewards,
      avgStake: avgStake,
      avgRewards: avgRewards,
      rewardRate: this.stakingConfig.rewardRate,
      slashingRate: this.stakingConfig.slashingRate
    };
  }

  /**
   * Get reward history for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Reward history
   */
  async getRewardHistory(userId) {
    return this.rewardHistory.get(userId) || [];
  }

  /**
   * Get slashing history for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Slashing history
   */
  async getSlashingHistory(userId) {
    return this.slashingHistory.get(userId) || [];
  }
}

export default StakingManager;
