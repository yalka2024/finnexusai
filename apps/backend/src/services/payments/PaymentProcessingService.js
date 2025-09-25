/**
 * FinAI Nexus - Payment Processing Service
 *
 * Transaction fee system and comprehensive payment processing
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class PaymentProcessingService {
  constructor() {
    this.paymentMethods = new Map();
    this.transactions = new Map();
    this.feeStructures = new Map();
    this.paymentProviders = new Map();
    this.paymentMetrics = new Map();

    this.initializeFeeStructures();
    this.initializePaymentProviders();
    logger.info('PaymentProcessingService initialized');
  }

  /**
   * Initialize fee structures
   */
  initializeFeeStructures() {
    // Trading Fees
    this.feeStructures.set('trading', {
      id: 'trading',
      name: 'Trading Fees',
      description: 'Fees for executing trades and transactions',
      type: 'percentage',
      tiers: {
        free: {
          stockTrades: { fee: 0, freePerMonth: 10, additionalFee: 0.99 },
          cryptoTrades: { fee: 0.5, minimum: 0.99, maximum: 9.99 },
          forexTrades: { fee: 0.1, minimum: 1.99, maximum: 19.99 },
          optionsTrades: { fee: 0.65, perContract: 0.65 }
        },
        premium: {
          stockTrades: { fee: 0, freePerMonth: 100, additionalFee: 0.49 },
          cryptoTrades: { fee: 0.25, minimum: 0.49, maximum: 4.99 },
          forexTrades: { fee: 0.05, minimum: 0.99, maximum: 9.99 },
          optionsTrades: { fee: 0.50, perContract: 0.50 }
        },
        professional: {
          stockTrades: { fee: 0, freePerMonth: -1, additionalFee: 0 }, // Unlimited free
          cryptoTrades: { fee: 0.15, minimum: 0.25, maximum: 2.49 },
          forexTrades: { fee: 0.03, minimum: 0.49, maximum: 4.99 },
          optionsTrades: { fee: 0.35, perContract: 0.35 }
        },
        enterprise: {
          stockTrades: { fee: 0, freePerMonth: -1, additionalFee: 0 },
          cryptoTrades: { fee: 0.10, minimum: 0, maximum: 0 }, // Percentage only
          forexTrades: { fee: 0.02, minimum: 0, maximum: 0 },
          optionsTrades: { fee: 0.25, perContract: 0.25 }
        }
      }
    });

    // Subscription Fees
    this.feeStructures.set('subscription', {
      id: 'subscription',
      name: 'Subscription Fees',
      description: 'Monthly and annual subscription fees',
      type: 'fixed',
      tiers: {
        free: { monthly: 0, annual: 0, lifetime: 0 },
        premium: { monthly: 29.99, annual: 299.99, lifetime: 999.99 },
        professional: { monthly: 99.99, annual: 999.99, lifetime: 2999.99 },
        enterprise: { monthly: 499.99, annual: 4999.99, lifetime: 14999.99 }
      }
    });

    // Service Fees
    this.feeStructures.set('services', {
      id: 'services',
      name: 'Service Fees',
      description: 'Additional service and feature fees',
      type: 'mixed',
      fees: {
        aiAnalysis: { free: 0, premium: 0, professional: 0, enterprise: 0 },
        portfolioAnalysis: { free: 4.99, premium: 0, professional: 0, enterprise: 0 },
        customReports: { free: 9.99, premium: 4.99, professional: 0, enterprise: 0 },
        apiCalls: {
          free: { limit: 0, overage: 0.01 },
          premium: { limit: 1000, overage: 0.005 },
          professional: { limit: 10000, overage: 0.002 },
          enterprise: { limit: -1, overage: 0 }
        },
        dataExport: { free: 2.99, premium: 1.99, professional: 0.99, enterprise: 0 },
        prioritySupport: { free: 19.99, premium: 9.99, professional: 0, enterprise: 0 }
      }
    });

    // Withdrawal/Transfer Fees
    this.feeStructures.set('transfers', {
      id: 'transfers',
      name: 'Transfer & Withdrawal Fees',
      description: 'Fees for fund transfers and withdrawals',
      type: 'mixed',
      fees: {
        bankTransfer: { domestic: 0, international: 15.00 },
        wireTransfer: { domestic: 25.00, international: 45.00 },
        cryptoWithdrawal: {
          bitcoin: 0.0005,
          ethereum: 0.005,
          stablecoin: 1.00
        },
        instantTransfer: { fee: 1.5, minimum: 0.25, maximum: 5.00 } // Percentage
      }
    });
  }

  /**
   * Initialize payment providers
   */
  initializePaymentProviders() {
    this.paymentProviders.set('stripe', {
      id: 'stripe',
      name: 'Stripe',
      type: 'credit_card',
      supportedMethods: ['visa', 'mastercard', 'amex', 'discover', 'ach', 'sepa'],
      processingFee: 2.9, // Percentage
      fixedFee: 0.30, // Fixed amount
      currency: 'USD',
      status: 'active',
      capabilities: ['payments', 'subscriptions', 'refunds', 'disputes']
    });

    this.paymentProviders.set('paypal', {
      id: 'paypal',
      name: 'PayPal',
      type: 'digital_wallet',
      supportedMethods: ['paypal_account', 'credit_card', 'bank_account'],
      processingFee: 3.49, // Percentage
      fixedFee: 0.49,
      currency: 'USD',
      status: 'active',
      capabilities: ['payments', 'subscriptions', 'refunds']
    });

    this.paymentProviders.set('coinbase', {
      id: 'coinbase',
      name: 'Coinbase Commerce',
      type: 'cryptocurrency',
      supportedMethods: ['bitcoin', 'ethereum', 'litecoin', 'bitcoin_cash', 'usdc'],
      processingFee: 1.0, // Percentage
      fixedFee: 0,
      currency: 'USD',
      status: 'active',
      capabilities: ['payments', 'refunds']
    });

    this.paymentProviders.set('plaid', {
      id: 'plaid',
      name: 'Plaid ACH',
      type: 'bank_transfer',
      supportedMethods: ['ach', 'instant_verification'],
      processingFee: 0.5, // Percentage
      fixedFee: 0.25,
      currency: 'USD',
      status: 'active',
      capabilities: ['payments', 'verification', 'balance_check']
    });
  }

  /**
   * Process payment
   */
  async processPayment(paymentRequest) {
    const transactionId = uuidv4();
    const startTime = Date.now();

    try {
      const transaction = {
        id: transactionId,
        userId: paymentRequest.userId,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency || 'USD',
        type: paymentRequest.type || 'payment',
        description: paymentRequest.description,
        paymentMethodId: paymentRequest.paymentMethodId,
        providerId: paymentRequest.providerId,
        status: 'processing',
        timestamp: new Date(),
        fees: {},
        metadata: paymentRequest.metadata || {}
      };

      logger.info(`💳 Processing payment: $${transaction.amount} for user ${transaction.userId}`);

      // Calculate fees
      transaction.fees = await this.calculateFees(transaction);

      // Process with payment provider
      const result = await this.processWithProvider(transaction);

      // Update transaction status
      transaction.status = result.status;
      transaction.providerTransactionId = result.providerTransactionId;
      transaction.processingTime = Date.now() - startTime;

      this.transactions.set(transactionId, transaction);
      this.updatePaymentMetrics(transaction);

      logger.info(`✅ Payment processed successfully: ${transactionId}`);

      return transaction;
    } catch (error) {
      logger.error('Payment processing error:', error);

      const transaction = {
        id: transactionId,
        userId: paymentRequest.userId,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency || 'USD',
        type: paymentRequest.type,
        status: 'failed',
        error: error.message,
        timestamp: new Date(),
        processingTime: Date.now() - startTime
      };

      this.transactions.set(transactionId, transaction);
      throw error;
    }
  }

  /**
   * Calculate fees for transaction
   */
  async calculateFees(transaction) {
    const fees = {
      tradingFee: 0,
      serviceFee: 0,
      processingFee: 0,
      transferFee: 0,
      totalFees: 0
    };

    // Get user subscription tier
    const userTier = await this.getUserTier(transaction.userId);

    // Calculate trading fees
    if (transaction.type === 'trade') {
      fees.tradingFee = this.calculateTradingFee(transaction, userTier);
    }

    // Calculate service fees
    if (transaction.type === 'service') {
      fees.serviceFee = this.calculateServiceFee(transaction, userTier);
    }

    // Calculate processing fees
    fees.processingFee = this.calculateProcessingFee(transaction);

    // Calculate transfer fees
    if (transaction.type === 'transfer' || transaction.type === 'withdrawal') {
      fees.transferFee = this.calculateTransferFee(transaction);
    }

    fees.totalFees = fees.tradingFee + fees.serviceFee + fees.processingFee + fees.transferFee;

    return fees;
  }

  /**
   * Calculate trading fee
   */
  calculateTradingFee(transaction, userTier) {
    const feeStructure = this.feeStructures.get('trading');
    const tierFees = feeStructure.tiers[userTier];

    const tradeType = transaction.metadata.tradeType || 'stockTrades';
    const tradeFee = tierFees[tradeType];

    if (!tradeFee) return 0;

    let fee = 0;

    if (tradeFee.fee) {
      // Percentage fee
      fee = (transaction.amount * tradeFee.fee) / 100;
    }

    if (tradeFee.perContract && transaction.metadata.contracts) {
      // Per contract fee
      fee += tradeFee.perContract * transaction.metadata.contracts;
    }

    // Apply minimum and maximum
    if (tradeFee.minimum && fee < tradeFee.minimum) {
      fee = tradeFee.minimum;
    }

    if (tradeFee.maximum && fee > tradeFee.maximum) {
      fee = tradeFee.maximum;
    }

    return Math.round(fee * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate service fee
   */
  calculateServiceFee(transaction, userTier) {
    const feeStructure = this.feeStructures.get('services');
    const serviceType = transaction.metadata.serviceType;

    if (!serviceType || !feeStructure.fees[serviceType]) {
      return 0;
    }

    const serviceFee = feeStructure.fees[serviceType];

    if (typeof serviceFee === 'object' && serviceFee[userTier] !== undefined) {
      return serviceFee[userTier];
    }

    return serviceFee || 0;
  }

  /**
   * Calculate processing fee
   */
  calculateProcessingFee(transaction) {
    const provider = this.paymentProviders.get(transaction.providerId);
    if (!provider) return 0;

    const percentageFee = (transaction.amount * provider.processingFee) / 100;
    const totalFee = percentageFee + provider.fixedFee;

    return Math.round(totalFee * 100) / 100;
  }

  /**
   * Calculate transfer fee
   */
  calculateTransferFee(transaction) {
    const feeStructure = this.feeStructures.get('transfers');
    const transferType = transaction.metadata.transferType;

    if (!transferType || !feeStructure.fees[transferType]) {
      return 0;
    }

    const transferFee = feeStructure.fees[transferType];

    if (typeof transferFee === 'number') {
      return transferFee;
    }

    if (transferFee.fee) {
      // Percentage fee
      let fee = (transaction.amount * transferFee.fee) / 100;

      if (transferFee.minimum && fee < transferFee.minimum) {
        fee = transferFee.minimum;
      }

      if (transferFee.maximum && fee > transferFee.maximum) {
        fee = transferFee.maximum;
      }

      return Math.round(fee * 100) / 100;
    }

    return 0;
  }

  /**
   * Process with payment provider
   */
  async processWithProvider(transaction) {
    const provider = this.paymentProviders.get(transaction.providerId);
    if (!provider) {
      throw new Error(`Payment provider not found: ${transaction.providerId}`);
    }

    // Simulate processing delay
    await this.simulateDelay(1000, 3000);

    // Simulate success/failure (95% success rate)
    const success = Math.random() > 0.05;

    if (success) {
      return {
        status: 'completed',
        providerTransactionId: `${provider.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        processingFee: this.calculateProcessingFee(transaction)
      };
    } else {
      throw new Error('Payment processing failed at provider level');
    }
  }

  /**
   * Refund transaction
   */
  async refundTransaction(transactionId, refundAmount = null, reason = '') {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    if (transaction.status !== 'completed') {
      throw new Error('Can only refund completed transactions');
    }

    const refundId = uuidv4();
    const amount = refundAmount || transaction.amount;

    const refund = {
      id: refundId,
      originalTransactionId: transactionId,
      userId: transaction.userId,
      amount,
      currency: transaction.currency,
      reason,
      status: 'processing',
      timestamp: new Date(),
      processingFee: this.calculateProcessingFee({ ...transaction, amount })
    };

    // Simulate refund processing
    await this.simulateDelay(2000, 5000);

    refund.status = 'completed';
    refund.providerRefundId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Update original transaction
    transaction.refunded = true;
    transaction.refundAmount = amount;
    transaction.refundId = refundId;

    logger.info(`💰 Refund processed: $${amount} for transaction ${transactionId}`);

    return refund;
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(userId, filters = {}) {
    const userTransactions = Array.from(this.transactions.values())
      .filter(tx => tx.userId === userId);

    let filteredTransactions = userTransactions;

    // Apply filters
    if (filters.type) {
      filteredTransactions = filteredTransactions.filter(tx => tx.type === filters.type);
    }

    if (filters.status) {
      filteredTransactions = filteredTransactions.filter(tx => tx.status === filters.status);
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filteredTransactions = filteredTransactions.filter(tx => tx.timestamp >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      filteredTransactions = filteredTransactions.filter(tx => tx.timestamp <= endDate);
    }

    // Sort by timestamp (newest first)
    filteredTransactions.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      transactions: filteredTransactions.slice(startIndex, endIndex),
      totalTransactions: filteredTransactions.length,
      page,
      limit,
      totalPages: Math.ceil(filteredTransactions.length / limit)
    };
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(userId, paymentMethodData) {
    const paymentMethodId = uuidv4();

    const paymentMethod = {
      id: paymentMethodId,
      userId,
      type: paymentMethodData.type,
      providerId: paymentMethodData.providerId,
      last4: paymentMethodData.last4 || '****',
      expiryMonth: paymentMethodData.expiryMonth,
      expiryYear: paymentMethodData.expiryYear,
      brand: paymentMethodData.brand,
      isDefault: paymentMethodData.isDefault || false,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.paymentMethods.set(paymentMethodId, paymentMethod);

    logger.info(`💳 Payment method added for user ${userId}: ${paymentMethod.type} ending in ${paymentMethod.last4}`);

    return paymentMethod;
  }

  /**
   * Get user payment methods
   */
  async getUserPaymentMethods(userId) {
    return Array.from(this.paymentMethods.values())
      .filter(pm => pm.userId === userId && pm.status === 'active')
      .sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return b.createdAt - a.createdAt;
      });
  }

  /**
   * Get fee estimate
   */
  async getFeeEstimate(userId, transactionData) {
    const userTier = await this.getUserTier(userId);

    const mockTransaction = {
      userId,
      amount: transactionData.amount,
      type: transactionData.type,
      providerId: transactionData.providerId,
      metadata: transactionData.metadata || {}
    };

    const fees = await this.calculateFees(mockTransaction);

    return {
      amount: transactionData.amount,
      fees,
      totalAmount: transactionData.amount + fees.totalFees,
      userTier,
      breakdown: {
        subtotal: transactionData.amount,
        tradingFee: fees.tradingFee,
        serviceFee: fees.serviceFee,
        processingFee: fees.processingFee,
        transferFee: fees.transferFee,
        totalFees: fees.totalFees,
        total: transactionData.amount + fees.totalFees
      }
    };
  }

  /**
   * Get user tier (mock implementation)
   */
  async getUserTier(userId) {
    // In a real implementation, this would query the user's subscription
    const tiers = ['free', 'premium', 'professional', 'enterprise'];
    return tiers[Math.floor(Math.random() * tiers.length)];
  }

  /**
   * Get payment analytics
   */
  getPaymentAnalytics() {
    const transactions = Array.from(this.transactions.values());

    const analytics = {
      totalTransactions: transactions.length,
      completedTransactions: transactions.filter(t => t.status === 'completed').length,
      failedTransactions: transactions.filter(t => t.status === 'failed').length,
      totalVolume: transactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0),
      totalFees: transactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + (t.fees?.totalFees || 0), 0),
      averageTransactionAmount: 0,
      successRate: 0,
      popularPaymentMethods: this.getPopularPaymentMethods(),
      revenueByType: this.getRevenueByType(transactions)
    };

    if (analytics.completedTransactions > 0) {
      analytics.averageTransactionAmount = analytics.totalVolume / analytics.completedTransactions;
      analytics.successRate = (analytics.completedTransactions / analytics.totalTransactions) * 100;
    }

    return analytics;
  }

  /**
   * Get popular payment methods
   */
  getPopularPaymentMethods() {
    const methodCounts = {};

    for (const transaction of this.transactions.values()) {
      if (transaction.status === 'completed') {
        const providerId = transaction.providerId;
        methodCounts[providerId] = (methodCounts[providerId] || 0) + 1;
      }
    }

    return Object.entries(methodCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([providerId, count]) => ({
        providerId,
        providerName: this.paymentProviders.get(providerId)?.name || providerId,
        transactionCount: count
      }));
  }

  /**
   * Get revenue by transaction type
   */
  getRevenueByType(transactions) {
    const revenueByType = {};

    for (const transaction of transactions) {
      if (transaction.status === 'completed') {
        const type = transaction.type;
        if (!revenueByType[type]) {
          revenueByType[type] = { volume: 0, fees: 0, count: 0 };
        }

        revenueByType[type].volume += transaction.amount;
        revenueByType[type].fees += transaction.fees?.totalFees || 0;
        revenueByType[type].count += 1;
      }
    }

    return revenueByType;
  }

  /**
   * Simulate processing delay
   */
  async simulateDelay(minMs, maxMs) {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Update payment metrics
   */
  updatePaymentMetrics(transaction) {
    const metrics = this.paymentMetrics.get('payments') || {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      totalVolume: 0,
      totalFees: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0
    };

    metrics.totalTransactions++;
    metrics.totalProcessingTime += transaction.processingTime || 0;
    metrics.averageProcessingTime = metrics.totalProcessingTime / metrics.totalTransactions;

    if (transaction.status === 'completed') {
      metrics.successfulTransactions++;
      metrics.totalVolume += transaction.amount;
      metrics.totalFees += transaction.fees?.totalFees || 0;
    } else {
      metrics.failedTransactions++;
    }

    this.paymentMetrics.set('payments', metrics);
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const analytics = this.getPaymentAnalytics();

      return {
        status: 'healthy',
        service: 'payment-processing',
        metrics: {
          totalTransactions: analytics.totalTransactions,
          completedTransactions: analytics.completedTransactions,
          failedTransactions: analytics.failedTransactions,
          successRate: analytics.successRate,
          totalVolume: analytics.totalVolume,
          totalFees: analytics.totalFees,
          averageTransactionAmount: analytics.averageTransactionAmount,
          totalPaymentProviders: this.paymentProviders.size,
          totalFeeStructures: this.feeStructures.size
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'payment-processing',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = PaymentProcessingService;
