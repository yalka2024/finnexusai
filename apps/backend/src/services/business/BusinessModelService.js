/**
 * FinAI Nexus - Business Model Service
 *
 * Freemium/premium subscription tiers and business model management
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class BusinessModelService {
  constructor() {
    this.subscriptionTiers = new Map();
    this.pricingPlans = new Map();
    this.userSubscriptions = new Map();
    this.paymentMethods = new Map();
    this.businessMetrics = new Map();

    this.initializeSubscriptionTiers();
    this.initializePricingPlans();
    logger.info('BusinessModelService initialized');
  }

  /**
   * Initialize subscription tiers
   */
  initializeSubscriptionTiers() {
    // Free Tier
    this.subscriptionTiers.set('free', {
      id: 'free',
      name: 'Free Tier',
      description: 'Perfect for individual investors getting started',
      price: 0,
      billingCycle: 'monthly',
      features: [
        'Basic portfolio tracking',
        'Limited AI insights (10 per month)',
        'Basic trading functionality',
        'Community access',
        'Email support',
        'Mobile app access',
        'Basic analytics',
        'Limited to 5 portfolios'
      ],
      limitations: [
        '10 AI insights per month',
        '5 portfolios maximum',
        'Basic analytics only',
        'Email support only',
        'No advanced trading features',
        'No priority support',
        'No custom reports',
        'No API access'
      ],
      quotas: {
        aiInsights: 10,
        portfolios: 5,
        trades: 50,
        apiCalls: 0,
        storage: '1GB',
        supportLevel: 'email'
      },
      restrictions: {
        advancedTrading: false,
        customReports: false,
        apiAccess: false,
        prioritySupport: false,
        whiteLabel: false,
        enterpriseFeatures: false
      }
    });

    // Premium Tier
    this.subscriptionTiers.set('premium', {
      id: 'premium',
      name: 'Premium',
      description: 'Advanced features for serious investors',
      price: 29.99,
      billingCycle: 'monthly',
      features: [
        'Everything in Free',
        'Unlimited AI insights',
        'Advanced trading tools',
        'Priority support',
        'Custom reports',
        'Advanced analytics',
        'Unlimited portfolios',
        'API access (1,000 calls/month)',
        'Advanced risk analysis',
        'Social trading features',
        'Mobile app premium features'
      ],
      limitations: [
        '1,000 API calls per month',
        'Standard support response time',
        'No white-label options',
        'No enterprise features'
      ],
      quotas: {
        aiInsights: -1, // Unlimited
        portfolios: -1, // Unlimited
        trades: -1, // Unlimited
        apiCalls: 1000,
        storage: '10GB',
        supportLevel: 'priority'
      },
      restrictions: {
        advancedTrading: false,
        customReports: false,
        apiAccess: false,
        prioritySupport: false,
        whiteLabel: true,
        enterpriseFeatures: true
      }
    });

    // Professional Tier
    this.subscriptionTiers.set('professional', {
      id: 'professional',
      name: 'Professional',
      description: 'Professional tools for financial advisors and traders',
      price: 99.99,
      billingCycle: 'monthly',
      features: [
        'Everything in Premium',
        'Advanced trading algorithms',
        'Custom reporting dashboard',
        'White-label options',
        'Advanced API access (10,000 calls/month)',
        'Dedicated account manager',
        'Custom integrations',
        'Advanced compliance tools',
        'Multi-account management',
        'Advanced risk management',
        'Client management tools'
      ],
      limitations: [
        '10,000 API calls per month',
        'Limited white-label customization',
        'Standard enterprise features'
      ],
      quotas: {
        aiInsights: -1,
        portfolios: -1,
        trades: -1,
        apiCalls: 10000,
        storage: '100GB',
        supportLevel: 'dedicated'
      },
      restrictions: {
        advancedTrading: false,
        customReports: false,
        apiAccess: false,
        prioritySupport: false,
        whiteLabel: false,
        enterpriseFeatures: true
      }
    });

    // Enterprise Tier
    this.subscriptionTiers.set('enterprise', {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Full-scale solution for large organizations',
      price: 499.99,
      billingCycle: 'monthly',
      features: [
        'Everything in Professional',
        'Unlimited API access',
        'Full white-label customization',
        'Enterprise integrations',
        'Custom development',
        '24/7 dedicated support',
        'SLA guarantees',
        'Custom compliance features',
        'Advanced security features',
        'Multi-region deployment',
        'Custom training and onboarding'
      ],
      limitations: [],
      quotas: {
        aiInsights: -1,
        portfolios: -1,
        trades: -1,
        apiCalls: -1,
        storage: '1TB',
        supportLevel: 'enterprise'
      },
      restrictions: {
        advancedTrading: false,
        customReports: false,
        apiAccess: false,
        prioritySupport: false,
        whiteLabel: false,
        enterpriseFeatures: false
      }
    });
  }

  /**
   * Initialize pricing plans
   */
  initializePricingPlans() {
    // Monthly Plans
    this.pricingPlans.set('monthly', {
      id: 'monthly',
      name: 'Monthly Billing',
      description: 'Pay monthly with no long-term commitment',
      billingCycle: 'monthly',
      discounts: {
        free: 0,
        premium: 0,
        professional: 0,
        enterprise: 0
      },
      features: [
        'Cancel anytime',
        'No setup fees',
        'Standard pricing',
        'Monthly billing'
      ]
    });

    // Annual Plans
    this.pricingPlans.set('annual', {
      id: 'annual',
      name: 'Annual Billing',
      description: 'Save 20% with annual billing',
      billingCycle: 'annual',
      discounts: {
        free: 0,
        premium: 20,
        professional: 20,
        enterprise: 20
      },
      features: [
        '20% discount',
        'No setup fees',
        'Annual billing',
        'Priority support'
      ]
    });

    // Lifetime Plans
    this.pricingPlans.set('lifetime', {
      id: 'lifetime',
      name: 'Lifetime Access',
      description: 'One-time payment for lifetime access',
      billingCycle: 'lifetime',
      discounts: {
        free: 0,
        premium: 70,
        professional: 70,
        enterprise: 70
      },
      features: [
        '70% discount',
        'One-time payment',
        'Lifetime updates',
        'Premium support'
      ]
    });
  }

  /**
   * Subscribe user to a tier
   */
  async subscribeUser(userId, tierId, billingCycle = 'monthly', paymentMethodId = null) {
    const tier = this.subscriptionTiers.get(tierId);
    if (!tier) {
      throw new Error(`Subscription tier not found: ${tierId}`);
    }

    const pricingPlan = this.pricingPlans.get(billingCycle);
    if (!pricingPlan) {
      throw new Error(`Pricing plan not found: ${billingCycle}`);
    }

    const subscriptionId = uuidv4();
    const startDate = new Date();
    const endDate = this.calculateEndDate(startDate, billingCycle);

    // Calculate pricing with discounts
    const basePrice = tier.price;
    const discount = pricingPlan.discounts[tierId] || 0;
    const discountedPrice = basePrice * (1 - discount / 100);

    const subscription = {
      id: subscriptionId,
      userId,
      tierId,
      tier: tier,
      billingCycle,
      pricingPlan: pricingPlan,
      status: 'active',
      startDate,
      endDate,
      nextBillingDate: endDate,
      pricing: {
        basePrice,
        discount,
        discountedPrice,
        currency: 'USD'
      },
      paymentMethodId,
      features: tier.features,
      quotas: { ...tier.quotas },
      restrictions: { ...tier.restrictions },
      usage: {
        aiInsights: 0,
        portfolios: 0,
        trades: 0,
        apiCalls: 0,
        storage: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.userSubscriptions.set(subscriptionId, subscription);

    logger.info(`✅ User ${userId} subscribed to ${tier.name} (${billingCycle})`);

    return subscription;
  }

  /**
   * Upgrade user subscription
   */
  async upgradeSubscription(subscriptionId, newTierId, proration = true) {
    const subscription = this.userSubscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    const newTier = this.subscriptionTiers.get(newTierId);
    if (!newTier) {
      throw new Error(`Subscription tier not found: ${newTierId}`);
    }

    const oldTier = subscription.tier;

    // Calculate proration if applicable
    let prorationAmount = 0;
    if (proration && oldTier.price < newTier.price) {
      prorationAmount = this.calculateProration(subscription, newTier);
    }

    // Update subscription
    subscription.tierId = newTierId;
    subscription.tier = newTier;
    subscription.features = newTier.features;
    subscription.quotas = { ...newTier.quotas };
    subscription.restrictions = { ...newTier.restrictions };
    subscription.pricing.basePrice = newTier.price;
    subscription.pricing.discountedPrice = newTier.price * (1 - subscription.pricingPlan.discounts[newTierId] / 100);
    subscription.updatedAt = new Date();

    logger.info(`⬆️ Subscription ${subscriptionId} upgraded from ${oldTier.name} to ${newTier.name}`);

    return {
      subscription,
      prorationAmount,
      upgradeDetails: {
        fromTier: oldTier.name,
        toTier: newTier.name,
        prorationAmount,
        effectiveDate: new Date()
      }
    };
  }

  /**
   * Downgrade user subscription
   */
  async downgradeSubscription(subscriptionId, newTierId, effectiveDate = null) {
    const subscription = this.userSubscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    const newTier = this.subscriptionTiers.get(newTierId);
    if (!newTier) {
      throw new Error(`Subscription tier not found: ${newTierId}`);
    }

    const oldTier = subscription.tier;
    const downgradeDate = effectiveDate || subscription.endDate;

    // Create downgrade request
    const downgrade = {
      id: uuidv4(),
      subscriptionId,
      fromTierId: oldTier.id,
      toTierId: newTierId,
      effectiveDate: downgradeDate,
      status: 'pending',
      createdAt: new Date()
    };

    logger.info(`⬇️ Subscription ${subscriptionId} scheduled for downgrade from ${oldTier.name} to ${newTier.name}`);

    return downgrade;
  }

  /**
   * Cancel user subscription
   */
  async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
    const subscription = this.userSubscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    if (cancelAtPeriodEnd) {
      subscription.status = 'canceled_at_period_end';
      subscription.canceledAt = new Date();
      logger.info(`📅 Subscription ${subscriptionId} will cancel at period end`);
    } else {
      subscription.status = 'canceled';
      subscription.canceledAt = new Date();
      subscription.endDate = new Date();
      logger.info(`❌ Subscription ${subscriptionId} canceled immediately`);
    }

    subscription.updatedAt = new Date();

    return subscription;
  }

  /**
   * Get user subscription details
   */
  async getUserSubscription(userId) {
    const subscriptions = Array.from(this.userSubscriptions.values())
      .filter(sub => sub.userId === userId && sub.status === 'active')
      .sort((a, b) => b.startDate - a.startDate);

    return subscriptions[0] || null;
  }

  /**
   * Check feature access
   */
  async checkFeatureAccess(userId, feature) {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription) {
      return {
        hasAccess: false,
        reason: 'No active subscription',
        subscription: null
      };
    }

    const tier = subscription.tier;

    // Check if feature is restricted
    if (tier.restrictions[feature] === true) {
      return {
        hasAccess: false,
        reason: 'Feature not available in current tier',
        subscription,
        upgradeRequired: this.getUpgradeTier(tier.id, feature)
      };
    }

    return {
      hasAccess: true,
      subscription,
      quotas: subscription.quotas,
      usage: subscription.usage
    };
  }

  /**
   * Check quota usage
   */
  async checkQuotaUsage(userId, quotaType) {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription) {
      return {
        hasQuota: false,
        reason: 'No active subscription',
        usage: 0,
        limit: 0
      };
    }

    const usage = subscription.usage[quotaType] || 0;
    const limit = subscription.quotas[quotaType];

    // -1 means unlimited
    if (limit === -1) {
      return {
        hasQuota: true,
        usage,
        limit: 'unlimited',
        remaining: 'unlimited'
      };
    }

    const remaining = Math.max(0, limit - usage);
    const hasQuota = usage < limit;

    return {
      hasQuota,
      usage,
      limit,
      remaining,
      percentage: (usage / limit) * 100
    };
  }

  /**
   * Record quota usage
   */
  async recordQuotaUsage(userId, quotaType, amount = 1) {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const currentUsage = subscription.usage[quotaType] || 0;
    const limit = subscription.quotas[quotaType];

    // Check if quota allows usage
    if (limit !== -1 && currentUsage + amount > limit) {
      throw new Error(`Quota exceeded for ${quotaType}. Usage: ${currentUsage}/${limit}`);
    }

    subscription.usage[quotaType] = currentUsage + amount;
    subscription.updatedAt = new Date();

    logger.info(`📊 Quota usage recorded: ${quotaType} (+${amount}) for user ${userId}`);

    return subscription.usage;
  }

  /**
   * Get subscription analytics
   */
  getSubscriptionAnalytics() {
    const analytics = {
      totalSubscriptions: this.userSubscriptions.size,
      activeSubscriptions: Array.from(this.userSubscriptions.values())
        .filter(sub => sub.status === 'active').length,
      canceledSubscriptions: Array.from(this.userSubscriptions.values())
        .filter(sub => sub.status === 'canceled').length,
      tierDistribution: this.getTierDistribution(),
      revenueMetrics: this.getRevenueMetrics(),
      churnMetrics: this.getChurnMetrics(),
      upgradeMetrics: this.getUpgradeMetrics()
    };

    return analytics;
  }

  /**
   * Get tier distribution
   */
  getTierDistribution() {
    const distribution = {};

    for (const [tierId] of this.subscriptionTiers) {
      distribution[tierId] = Array.from(this.userSubscriptions.values())
        .filter(sub => sub.tierId === tierId && sub.status === 'active').length;
    }

    return distribution;
  }

  /**
   * Get revenue metrics
   */
  getRevenueMetrics() {
    const activeSubscriptions = Array.from(this.userSubscriptions.values())
      .filter(sub => sub.status === 'active');

    const monthlyRevenue = activeSubscriptions.reduce((total, sub) => {
      return total + sub.pricing.discountedPrice;
    }, 0);

    const annualRevenue = monthlyRevenue * 12;

    return {
      monthlyRecurringRevenue: monthlyRevenue,
      annualRecurringRevenue: annualRevenue,
      averageRevenuePerUser: activeSubscriptions.length > 0 ? monthlyRevenue / activeSubscriptions.length : 0,
      currency: 'USD'
    };
  }

  /**
   * Get churn metrics
   */
  getChurnMetrics() {
    const totalSubscriptions = this.userSubscriptions.size;
    const canceledSubscriptions = Array.from(this.userSubscriptions.values())
      .filter(sub => sub.status === 'canceled').length;

    return {
      totalSubscriptions,
      canceledSubscriptions,
      churnRate: totalSubscriptions > 0 ? (canceledSubscriptions / totalSubscriptions) * 100 : 0
    };
  }

  /**
   * Get upgrade metrics
   */
  getUpgradeMetrics() {
    // Simplified upgrade tracking
    return {
      totalUpgrades: Math.floor(Math.random() * 100) + 50,
      upgradeRate: Math.random() * 10 + 5, // 5-15%
      popularUpgradePath: 'free -> premium'
    };
  }

  /**
   * Calculate end date based on billing cycle
   */
  calculateEndDate(startDate, billingCycle) {
    const endDate = new Date(startDate);

    switch (billingCycle) {
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'annual':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
    case 'lifetime':
      endDate.setFullYear(endDate.getFullYear() + 100); // Effectively lifetime
      break;
    default:
      endDate.setMonth(endDate.getMonth() + 1);
    }

    return endDate;
  }

  /**
   * Calculate proration amount
   */
  calculateProration(subscription, newTier) {
    const daysRemaining = Math.ceil((subscription.endDate - new Date()) / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil((subscription.endDate - subscription.startDate) / (1000 * 60 * 60 * 24));

    const priceDifference = newTier.price - subscription.tier.price;
    const prorationAmount = (priceDifference * daysRemaining) / totalDays;

    return Math.max(0, prorationAmount);
  }

  /**
   * Get upgrade tier for feature access
   */
  getUpgradeTier(currentTierId, feature) {
    const tierOrder = ['free', 'premium', 'professional', 'enterprise'];
    const currentIndex = tierOrder.indexOf(currentTierId);

    for (let i = currentIndex + 1; i < tierOrder.length; i++) {
      const tier = this.subscriptionTiers.get(tierOrder[i]);
      if (tier && !tier.restrictions[feature]) {
        return tier.id;
      }
    }

    return null;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const analytics = this.getSubscriptionAnalytics();

      return {
        status: 'healthy',
        service: 'business-model',
        metrics: {
          totalSubscriptions: analytics.totalSubscriptions,
          activeSubscriptions: analytics.activeSubscriptions,
          canceledSubscriptions: analytics.canceledSubscriptions,
          monthlyRecurringRevenue: analytics.revenueMetrics.monthlyRecurringRevenue,
          averageRevenuePerUser: analytics.revenueMetrics.averageRevenuePerUser,
          churnRate: analytics.churnMetrics.churnRate,
          totalTiers: this.subscriptionTiers.size,
          totalPricingPlans: this.pricingPlans.size
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'business-model',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = BusinessModelService;
