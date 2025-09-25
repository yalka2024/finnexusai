const { ethers } = require('ethers');
const NexusTokenABI = require('./abis/NexusToken.json');
const PoTTokenABI = require('./abis/PoTToken.json');
const DeFAIManagerABI = require('./abis/DeFAIManager.json');

/**
 * FinNexus AI Smart Contracts Integration Layer
 * Provides a unified interface for interacting with FinNexus AI contracts
 */
class FinNexusContracts {
  constructor(config) {
    this.config = {
      network: config.network || 'mainnet',
      rpcUrl: config.rpcUrl,
      privateKey: config.privateKey,
      contractAddresses: config.contractAddresses,
      ...config
    };

    // Initialize provider and signer
    this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    this.signer = new ethers.Wallet(this.config.privateKey, this.provider);

    // Initialize contracts
    this.initializeContracts();
  }

  initializeContracts() {
    const { nexusToken, potToken, deFAIManager } = this.config.contractAddresses;

    this.nexusToken = new ethers.Contract(nexusToken, NexusTokenABI, this.signer);
    this.potToken = new ethers.Contract(potToken, PoTTokenABI, this.signer);
    this.deFAIManager = new ethers.Contract(deFAIManager, DeFAIManagerABI, this.signer);

    logger.info('✅ FinNexus contracts initialized');
    logger.info(`📄 NexusToken: ${nexusToken}`);
    logger.info(`🏆 PoTToken: ${potToken}`);
    logger.info(`🤖 DeFAIManager: ${deFAIManager}`);
  }

  // ==================== NEXUS TOKEN OPERATIONS ====================

  /**
   * Get Nexus token balance for an address
   * @param {string} address - User address
   * @returns {Promise<string>} Balance in wei
   */
  async getNexusBalance(address) {
    try {
      const balance = await this.nexusToken.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (error) {
      logger.error('Error getting Nexus balance:', error);
      throw error;
    }
  }

  /**
   * Transfer Nexus tokens
   * @param {string} to - Recipient address
   * @param {string} amount - Amount in ETH units
   * @returns {Promise<Object>} Transaction receipt
   */
  async transferNexus(to, amount) {
    try {
      const tx = await this.nexusToken.transfer(to, ethers.parseEther(amount));
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      logger.error('Error transferring Nexus tokens:', error);
      throw error;
    }
  }

  /**
   * Get transfer fees for a given amount
   * @param {string} amount - Amount in ETH units
   * @returns {Promise<Object>} Fee breakdown
   */
  async getTransferFees(amount) {
    try {
      const [transferFee, burnFee, totalFees] = await this.nexusToken.getTransferFees(
        ethers.parseEther(amount)
      );
      return {
        transferFee: ethers.formatEther(transferFee),
        burnFee: ethers.formatEther(burnFee),
        totalFees: ethers.formatEther(totalFees)
      };
    } catch (error) {
      logger.error('Error getting transfer fees:', error);
      throw error;
    }
  }

  // ==================== POT TOKEN OPERATIONS ====================

  /**
   * Get PoT token balance for an address
   * @param {string} address - User address
   * @returns {Promise<string>} Balance in wei
   */
  async getPoTBalance(address) {
    try {
      const balance = await this.potToken.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (error) {
      logger.error('Error getting PoT balance:', error);
      throw error;
    }
  }

  /**
   * Get trust score for a user
   * @param {string} address - User address
   * @returns {Promise<Object>} Trust score data
   */
  async getTrustScore(address) {
    try {
      const trustScore = await this.potToken.trustScores(address);
      return {
        score: trustScore.score.toString(),
        lastUpdated: new Date(Number(trustScore.lastUpdated) * 1000),
        reason: trustScore.reason
      };
    } catch (error) {
      logger.error('Error getting trust score:', error);
      throw error;
    }
  }

  /**
   * Mint PoT tokens as reward
   * @param {string} to - Recipient address
   * @param {string} amount - Base amount in ETH units
   * @param {number} category - Reward category (0-4)
   * @param {string} reason - Reason for reward
   * @returns {Promise<Object>} Transaction receipt
   */
  async mintPoTReward(to, amount, category, reason) {
    try {
      const tx = await this.potToken.mintReward(
        to,
        ethers.parseEther(amount),
        category,
        reason
      );
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      logger.error('Error minting PoT reward:', error);
      throw error;
    }
  }

  /**
   * Apply penalty by burning PoT tokens
   * @param {string} from - Address to burn from
   * @param {string} amount - Amount to burn in ETH units
   * @param {string} reason - Reason for penalty
   * @returns {Promise<Object>} Transaction receipt
   */
  async applyPenalty(from, amount, reason) {
    try {
      const tx = await this.potToken.applyPenalty(
        from,
        ethers.parseEther(amount),
        reason
      );
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      logger.error('Error applying penalty:', error);
      throw error;
    }
  }

  // ==================== DEFAI MANAGER OPERATIONS ====================

  /**
   * Create a portfolio for a user
   * @param {string} user - User address
   * @param {string} initialValue - Initial portfolio value in ETH units
   * @returns {Promise<Object>} Transaction receipt
   */
  async createPortfolio(user, initialValue) {
    try {
      const tx = await this.deFAIManager.createPortfolio(
        user,
        ethers.parseEther(initialValue)
      );
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      logger.error('Error creating portfolio:', error);
      throw error;
    }
  }

  /**
   * Get portfolio information
   * @param {string} user - User address
   * @returns {Promise<Object>} Portfolio data
   */
  async getPortfolio(user) {
    try {
      const portfolio = await this.deFAIManager.portfolios(user);
      return {
        owner: portfolio.owner,
        totalValue: ethers.formatEther(portfolio.totalValue),
        lastRebalance: new Date(Number(portfolio.lastRebalance) * 1000),
        isActive: portfolio.isActive
      };
    } catch (error) {
      logger.error('Error getting portfolio:', error);
      throw error;
    }
  }

  /**
   * Optimize yield for a user
   * @param {string} user - User address
   * @param {string} amount - Amount to optimize in ETH units
   * @param {number} strategyId - Strategy ID to use
   * @returns {Promise<Object>} Transaction receipt
   */
  async optimizeYield(user, amount, strategyId) {
    try {
      // First, approve tokens for DeFAIManager
      const approveTx = await this.nexusToken.approve(
        this.config.contractAddresses.deFAIManager,
        ethers.parseEther(amount)
      );
      await approveTx.wait();

      // Then optimize yield
      const tx = await this.deFAIManager.optimizeYield(
        user,
        ethers.parseEther(amount),
        strategyId
      );
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      logger.error('Error optimizing yield:', error);
      throw error;
    }
  }

  /**
   * Get yield strategies
   * @param {number} strategyId - Strategy ID
   * @returns {Promise<Object>} Strategy data
   */
  async getYieldStrategy(strategyId) {
    try {
      const strategy = await this.deFAIManager.yieldStrategies(strategyId);
      return {
        strategyContract: strategy.strategyContract,
        name: strategy.name,
        isActive: strategy.isActive,
        minDeposit: ethers.formatEther(strategy.minDeposit),
        maxDeposit: ethers.formatEther(strategy.maxDeposit),
        currentAPY: strategy.currentAPY.toString(),
        totalDeposited: ethers.formatEther(strategy.totalDeposited)
      };
    } catch (error) {
      logger.error('Error getting yield strategy:', error);
      throw error;
    }
  }

  /**
   * Update user risk profile
   * @param {string} user - User address
   * @param {number} riskScore - Risk score (0-1000)
   * @param {number} maxLeverage - Maximum leverage
   * @param {string} maxSinglePosition - Maximum single position in ETH units
   * @param {boolean} isApproved - Whether profile is approved
   * @returns {Promise<Object>} Transaction receipt
   */
  async updateRiskProfile(user, riskScore, maxLeverage, maxSinglePosition, isApproved) {
    try {
      const tx = await this.deFAIManager.updateRiskProfile(
        user,
        riskScore,
        maxLeverage,
        ethers.parseEther(maxSinglePosition),
        isApproved
      );
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      logger.error('Error updating risk profile:', error);
      throw error;
    }
  }

  /**
   * Get user risk profile
   * @param {string} user - User address
   * @returns {Promise<Object>} Risk profile data
   */
  async getRiskProfile(user) {
    try {
      const riskProfile = await this.deFAIManager.riskProfiles(user);
      return {
        riskScore: riskProfile.riskScore.toString(),
        maxLeverage: riskProfile.maxLeverage.toString(),
        maxSinglePosition: ethers.formatEther(riskProfile.maxSinglePosition),
        isApproved: riskProfile.isApproved
      };
    } catch (error) {
      logger.error('Error getting risk profile:', error);
      throw error;
    }
  }

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Get current gas price
   * @returns {Promise<string>} Gas price in gwei
   */
  async getGasPrice() {
    try {
      const gasPrice = await this.provider.getFeeData();
      return ethers.formatUnits(gasPrice.gasPrice, 'gwei');
    } catch (error) {
      logger.error('Error getting gas price:', error);
      throw error;
    }
  }

  /**
   * Estimate gas for a transaction
   * @param {Object} txData - Transaction data
   * @returns {Promise<string>} Estimated gas
   */
  async estimateGas(txData) {
    try {
      const gasEstimate = await this.provider.estimateGas(txData);
      return gasEstimate.toString();
    } catch (error) {
      logger.error('Error estimating gas:', error);
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   * @param {string} txHash - Transaction hash
   * @param {number} confirmations - Number of confirmations to wait for
   * @returns {Promise<Object>} Transaction receipt
   */
  async waitForTransaction(txHash, confirmations = 1) {
    try {
      const receipt = await this.provider.waitForTransaction(txHash, confirmations);
      return receipt;
    } catch (error) {
      logger.error('Error waiting for transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction status
   * @param {string} txHash - Transaction hash
   * @returns {Promise<Object>} Transaction status
   */
  async getTransactionStatus(txHash) {
    try {
      const tx = await this.provider.getTransaction(txHash);
      const receipt = await this.provider.getTransactionReceipt(txHash);

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        gasPrice: ethers.formatUnits(tx.gasPrice, 'gwei'),
        gasLimit: tx.gasLimit.toString(),
        nonce: tx.nonce,
        status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
        blockNumber: receipt?.blockNumber,
        confirmations: receipt ? await receipt.confirmations() : 0
      };
    } catch (error) {
      logger.error('Error getting transaction status:', error);
      throw error;
    }
  }

  /**
   * Get contract events
   * @param {Object} contract - Contract instance
   * @param {string} eventName - Event name
   * @param {Object} filter - Event filter
   * @param {number} fromBlock - Starting block number
   * @returns {Promise<Array>} Event logs
   */
  async getContractEvents(contract, eventName, filter = {}, fromBlock = 0) {
    try {
      const events = await contract.queryFilter(
        contract.filters[eventName](...Object.values(filter)),
        fromBlock
      );
      return events;
    } catch (error) {
      logger.error('Error getting contract events:', error);
      throw error;
    }
  }

  // ==================== MONITORING FUNCTIONS ====================

  /**
   * Monitor contract for events
   * @param {Function} callback - Callback function for events
   */
  startEventMonitoring(callback) {
    logger.info('🔍 Starting event monitoring...');

    // Monitor NexusToken events
    this.nexusToken.on('Transfer', (from, to, value, event) => {
      callback('NexusToken', 'Transfer', {
        from,
        to,
        value: ethers.formatEther(value),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber
      });
    });

    // Monitor PoTToken events
    this.potToken.on('RewardMinted', (user, amount, category, reason, trustScore, event) => {
      callback('PoTToken', 'RewardMinted', {
        user,
        amount: ethers.formatEther(amount),
        category: category.toString(),
        reason,
        trustScore: trustScore.toString(),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber
      });
    });

    // Monitor DeFAIManager events
    this.deFAIManager.on('YieldOptimized', (user, amount, strategyId, event) => {
      callback('DeFAIManager', 'YieldOptimized', {
        user,
        amount: ethers.formatEther(amount),
        strategyId: strategyId.toString(),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber
      });
    });
  }

  /**
   * Stop event monitoring
   */
  stopEventMonitoring() {
    logger.info('🛑 Stopping event monitoring...');
    this.nexusToken.removeAllListeners();
    this.potToken.removeAllListeners();
    this.deFAIManager.removeAllListeners();
  }
}

module.exports = FinNexusContracts;
