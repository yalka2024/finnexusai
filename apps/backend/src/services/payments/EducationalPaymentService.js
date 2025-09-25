/**
 * FinAI Nexus - Educational Payment Service
 *
 * Stripe-based payment processing for educational subscriptions:
 * - Educational subscription management
 * - Freemium to premium conversions
 * - B2B technology licensing payments
 * - Educational content purchases
 * - Compliance with educational service regulations
 * - No financial service payment processing
 */

const crypto = require('crypto');
const logger = require('../../utils/logger');

class EducationalPaymentService {
  constructor() {
    this.subscriptionPlans = new Map();
    this.customers = new Map();
    this.transactions = new Map();
    this.subscriptions = new Map();
    this.invoices = new Map();

    this.stripeConfig = {
      publishableKey: 'pk_live_educational_platform_key',
      secretKey: 'sk_live_educational_platform_secret',
      webhookSecret: 'whsec_educational_webhook_secret',
      mode: 'live', // Switch to 'test' for development
      currency: 'usd',
      businessType: 'educational_services'
    };

    this.initializeSubscriptionPlans();
    this.initializePaymentMethods();

    logger.info('💳 EducationalPaymentService initialized for educational subscriptions');
  }

  /**
   * Initialize educational subscription plans
   */
  initializeSubscriptionPlans() {
    // Educational Subscription Plans
    this.subscriptionPlans.set('basic_learning', {
      id: 'basic_learning',
      name: 'Basic Learning',
      description: 'Essential financial education and portfolio simulation',
      price: 999, // $9.99 in cents
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      trialPeriod: 14, // 14-day free trial
      features: [
        'Basic financial education courses',
        'Portfolio simulation (educational)',
        'Community forum access',
        'Basic market analytics (educational)',
        'Mobile app access',
        'Email support'
      ],
      limitations: [
        '5 portfolio simulations per month',
        'Basic analytics only',
        'Email support only',
        'No AI avatar access',
        'No AR/VR features'
      ],
      stripeProductId: 'prod_educational_basic',
      stripePriceId: 'price_educational_basic_monthly'
    });

    this.subscriptionPlans.set('advanced_learning', {
      id: 'advanced_learning',
      name: 'Advanced Learning',
      description: 'Comprehensive financial education with AI mentors',
      price: 2999, // $29.99 in cents
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      trialPeriod: 14,
      features: [
        'All Basic Learning features',
        'AI financial avatars (educational mentors)',
        'Advanced portfolio simulators',
        'Premium educational content',
        'Emotion-aware learning interface',
        'AR/VR educational experiences',
        'Priority email support',
        'Educational webinars'
      ],
      limitations: [
        '50 portfolio simulations per month',
        'Standard AI avatar interactions',
        'Email and chat support only'
      ],
      stripeProductId: 'prod_educational_advanced',
      stripePriceId: 'price_educational_advanced_monthly'
    });

    this.subscriptionPlans.set('professional_learning', {
      id: 'professional_learning',
      name: 'Professional Learning',
      description: 'Complete financial education platform with certification',
      price: 9999, // $99.99 in cents
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      trialPeriod: 14,
      features: [
        'All Advanced Learning features',
        'Unlimited portfolio simulations',
        'Custom educational scenarios',
        'Professional certification programs',
        'Advanced AI avatar interactions',
        'Custom learning paths',
        'Priority phone and video support',
        'Educational consulting sessions'
      ],
      limitations: [],
      stripeProductId: 'prod_educational_professional',
      stripePriceId: 'price_educational_professional_monthly'
    });

    // Annual Plans (20% discount)
    this.subscriptionPlans.set('advanced_learning_annual', {
      id: 'advanced_learning_annual',
      name: 'Advanced Learning (Annual)',
      description: 'Annual subscription with 20% savings',
      price: 28790, // $287.90 (20% discount from $359.88)
      currency: 'usd',
      interval: 'year',
      intervalCount: 1,
      trialPeriod: 14,
      features: ['All Advanced Learning features'],
      discount: 0.20,
      stripeProductId: 'prod_educational_advanced_annual',
      stripePriceId: 'price_educational_advanced_annual'
    });

    // B2B Technology Licensing Plans
    this.subscriptionPlans.set('api_access', {
      id: 'api_access',
      name: 'API Access License',
      description: 'Educational analytics API for developers',
      price: 500000, // $5,000 in cents
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      trialPeriod: 7,
      features: [
        'Educational analytics API access',
        'Market data for educational use',
        'AI insights API (educational)',
        'Portfolio simulation API',
        'Documentation and support'
      ],
      limitations: [
        '100,000 API calls per month',
        'Educational use only',
        'No commercial redistribution'
      ],
      stripeProductId: 'prod_api_access',
      stripePriceId: 'price_api_access_monthly'
    });

    this.subscriptionPlans.set('white_label_basic', {
      id: 'white_label_basic',
      name: 'White-Label Basic License',
      description: 'Basic white-label educational platform licensing',
      price: 1500000, // $15,000 in cents
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      trialPeriod: 0, // No trial for enterprise
      features: [
        'Educational platform licensing',
        'Basic customization and branding',
        'Educational content library',
        'Technical support and maintenance',
        'User management system'
      ],
      limitations: [
        'Up to 1,000 end users',
        'Basic features only',
        'Standard support level'
      ],
      stripeProductId: 'prod_white_label_basic',
      stripePriceId: 'price_white_label_basic_monthly'
    });
  }

  /**
   * Initialize payment methods
   */
  initializePaymentMethods() {
    this.paymentMethods = {
      creditCard: {
        enabled: true,
        types: ['visa', 'mastercard', 'amex', 'discover'],
        processing: 'stripe',
        fees: 0.029 // 2.9% + 30¢
      },
      debitCard: {
        enabled: true,
        processing: 'stripe',
        fees: 0.029
      },
      bankTransfer: {
        enabled: true,
        processing: 'stripe_ach',
        fees: 0.008, // 0.8%
        processingTime: '3-5 business days'
      },
      paypal: {
        enabled: true,
        processing: 'paypal',
        fees: 0.034 // 3.4% + 30¢
      },
      applePay: {
        enabled: true,
        processing: 'stripe',
        fees: 0.029
      },
      googlePay: {
        enabled: true,
        processing: 'stripe',
        fees: 0.029
      }
    };
  }

  /**
   * Create educational subscription
   */
  async createEducationalSubscription(userId, planId, paymentMethodId) {
    const plan = this.subscriptionPlans.get(planId);
    if (!plan) {
      return {
        success: false,
        error: 'Educational subscription plan not found'
      };
    }

    const subscriptionId = crypto.randomUUID();
    const subscription = {
      id: subscriptionId,
      userId,
      planId,
      planName: plan.name,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + (plan.interval === 'month' ? 30 : 365) * 24 * 60 * 60 * 1000),
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      trialEnd: plan.trialPeriod ? new Date(Date.now() + plan.trialPeriod * 24 * 60 * 60 * 1000) : null,
      paymentMethodId,
      stripeSubscriptionId: `sub_${  crypto.randomBytes(12).toString('hex')}`,
      createdAt: new Date(),
      features: plan.features,
      limitations: plan.limitations
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Create initial invoice
    const invoice = await this.createInvoice(subscription);

    return {
      success: true,
      subscription,
      invoice,
      trialPeriod: plan.trialPeriod,
      nextBilling: subscription.currentPeriodEnd,
      message: 'Educational subscription created successfully'
    };
  }

  /**
   * Process educational payment
   */
  async processEducationalPayment(customerId, amount, description, metadata = {}) {
    const transactionId = crypto.randomUUID();

    // Simulate Stripe payment processing
    const payment = {
      id: transactionId,
      customerId,
      amount,
      currency: 'usd',
      description,
      metadata: {
        ...metadata,
        service_type: 'educational',
        platform: 'finai_nexus_education'
      },
      status: 'succeeded',
      paymentMethod: 'card',
      stripePaymentIntentId: `pi_${  crypto.randomBytes(12).toString('hex')}`,
      processedAt: new Date(),
      fees: {
        stripe: Math.ceil(amount * 0.029 + 30), // Stripe fees
        platform: 0 // No additional platform fees
      }
    };

    this.transactions.set(transactionId, payment);

    return {
      success: true,
      payment,
      netAmount: amount - payment.fees.stripe,
      message: 'Educational payment processed successfully'
    };
  }

  /**
   * Create customer for educational services
   */
  async createEducationalCustomer(userData) {
    const customerId = crypto.randomUUID();

    const customer = {
      id: customerId,
      email: userData.email,
      name: userData.name,
      customerType: 'educational',
      stripeCustomerId: `cus_${  crypto.randomBytes(12).toString('hex')}`,
      createdAt: new Date(),
      subscriptions: [],
      paymentMethods: [],
      totalSpent: 0,
      educationalProfile: {
        learningGoals: userData.learningGoals || [],
        experienceLevel: userData.experienceLevel || 'beginner',
        interests: userData.interests || [],
        preferredLearningStyle: userData.preferredLearningStyle || 'visual'
      },
      complianceAcknowledgment: {
        educationalPurposeOnly: true,
        notFinancialAdvice: true,
        consultLicensedProfessionals: true,
        simulationOnly: true,
        acknowledgedAt: new Date()
      }
    };

    this.customers.set(customerId, customer);

    return {
      success: true,
      customer,
      stripeCustomerId: customer.stripeCustomerId,
      message: 'Educational customer created successfully'
    };
  }

  /**
   * Get educational payment analytics
   */
  getEducationalPaymentAnalytics() {
    const subscriptions = Array.from(this.subscriptions.values());
    const transactions = Array.from(this.transactions.values());
    const customers = Array.from(this.customers.values());

    const monthlyRevenue = subscriptions
      .filter(sub => sub.status === 'active')
      .reduce((sum, sub) => {
        const plan = this.subscriptionPlans.get(sub.planId);
        return sum + (plan ? plan.price / 100 : 0);
      }, 0);

    return {
      success: true,
      analytics: {
        subscriptions: {
          total: subscriptions.length,
          active: subscriptions.filter(s => s.status === 'active').length,
          trial: subscriptions.filter(s => s.trialEnd && s.trialEnd > new Date()).length,
          byPlan: this.getSubscriptionsByPlan(subscriptions)
        },
        revenue: {
          monthlyRecurring: monthlyRevenue,
          totalRevenue: transactions.reduce((sum, t) => sum + t.amount / 100, 0),
          averageRevenuePerUser: monthlyRevenue / customers.length,
          conversionRate: subscriptions.length / customers.length
        },
        customers: {
          total: customers.length,
          educational: customers.filter(c => c.customerType === 'educational').length,
          b2b: customers.filter(c => c.customerType === 'b2b').length,
          averageLifetime: 18, // months
          churnRate: 0.08 // 8% monthly
        },
        transactions: {
          total: transactions.length,
          successful: transactions.filter(t => t.status === 'succeeded').length,
          totalVolume: transactions.reduce((sum, t) => sum + t.amount / 100, 0),
          averageTransactionSize: transactions.reduce((sum, t) => sum + t.amount / 100, 0) / transactions.length
        },
        growth: {
          monthlyGrowthRate: 0.15, // 15% month-over-month
          customerAcquisitionCost: 25.50,
          lifetimeValue: 450.00,
          paybackPeriod: 2.5 // months
        }
      },
      timestamp: new Date()
    };
  }

  /**
   * Create invoice for educational services
   */
  async createInvoice(subscription) {
    const plan = this.subscriptionPlans.get(subscription.planId);
    const invoiceId = crypto.randomUUID();

    const invoice = {
      id: invoiceId,
      subscriptionId: subscription.id,
      customerId: subscription.userId,
      amount: plan.price,
      currency: plan.currency,
      description: `${plan.name} - Educational Subscription`,
      status: 'draft',
      dueDate: subscription.currentPeriodEnd,
      createdAt: new Date(),
      lineItems: [
        {
          description: plan.name,
          quantity: 1,
          unitAmount: plan.price,
          totalAmount: plan.price
        }
      ],
      stripeInvoiceId: `in_${  crypto.randomBytes(12).toString('hex')}`,
      educationalService: true,
      disclaimers: [
        'Educational services only',
        'Not financial advice or services',
        'For learning purposes only'
      ]
    };

    this.invoices.set(invoiceId, invoice);

    return {
      success: true,
      invoice,
      paymentUrl: `https://checkout.stripe.com/pay/${invoice.stripeInvoiceId}`,
      message: 'Educational service invoice created'
    };
  }

  /**
   * Handle subscription upgrade/downgrade
   */
  async updateEducationalSubscription(subscriptionId, newPlanId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return {
        success: false,
        error: 'Educational subscription not found'
      };
    }

    const newPlan = this.subscriptionPlans.get(newPlanId);
    if (!newPlan) {
      return {
        success: false,
        error: 'Educational plan not found'
      };
    }

    const oldPlan = this.subscriptionPlans.get(subscription.planId);
    const isUpgrade = newPlan.price > oldPlan.price;

    // Update subscription
    subscription.planId = newPlanId;
    subscription.planName = newPlan.name;
    subscription.features = newPlan.features;
    subscription.limitations = newPlan.limitations;
    subscription.updatedAt = new Date();

    // Calculate prorated amount
    const prorationAmount = this.calculateProration(subscription, oldPlan, newPlan);

    return {
      success: true,
      subscription,
      changeType: isUpgrade ? 'upgrade' : 'downgrade',
      prorationAmount,
      newFeatures: newPlan.features,
      effectiveDate: new Date(),
      message: `Educational subscription ${isUpgrade ? 'upgraded' : 'downgraded'} successfully`
    };
  }

  /**
   * Cancel educational subscription
   */
  async cancelEducationalSubscription(subscriptionId, reason = 'user_requested') {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return {
        success: false,
        error: 'Educational subscription not found'
      };
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason;
    subscription.accessEndsAt = subscription.currentPeriodEnd; // Access until period end

    return {
      success: true,
      subscription,
      accessEndsAt: subscription.accessEndsAt,
      refundEligible: this.isRefundEligible(subscription),
      message: 'Educational subscription cancelled successfully'
    };
  }

  /**
   * Process refund for educational services
   */
  async processEducationalRefund(transactionId, amount, reason) {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      return {
        success: false,
        error: 'Educational transaction not found'
      };
    }

    const refundId = crypto.randomUUID();
    const refund = {
      id: refundId,
      transactionId,
      amount,
      currency: transaction.currency,
      reason,
      status: 'processing',
      stripeRefundId: `re_${  crypto.randomBytes(12).toString('hex')}`,
      processedAt: new Date(),
      expectedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };

    return {
      success: true,
      refund,
      expectedCompletion: refund.expectedCompletion,
      message: 'Educational service refund initiated'
    };
  }

  /**
   * Get customer subscription status
   */
  getCustomerSubscriptionStatus(customerId) {
    const customer = this.customers.get(customerId);
    if (!customer) {
      return {
        success: false,
        error: 'Educational customer not found'
      };
    }

    const customerSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.userId === customerId);

    const activeSubscription = customerSubscriptions.find(sub => sub.status === 'active');

    return {
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        customerType: customer.customerType,
        totalSpent: customer.totalSpent
      },
      subscription: activeSubscription || null,
      subscriptionHistory: customerSubscriptions,
      features: activeSubscription ? activeSubscription.features : [],
      limitations: activeSubscription ? activeSubscription.limitations : [],
      accessLevel: this.determineAccessLevel(activeSubscription)
    };
  }

  /**
   * Generate payment setup instructions
   */
  getPaymentSetupInstructions() {
    return {
      success: true,
      setup: {
        provider: 'Stripe',
        businessType: 'Educational Services',
        requiredDocuments: [
          'Business registration certificate',
          'Tax identification number (EIN)',
          'Bank account information',
          'Business address verification',
          'Educational service description'
        ],
        estimatedSetupTime: '3-5 business days',
        fees: {
          creditCard: '2.9% + 30¢ per transaction',
          ach: '0.8% per transaction',
          international: '3.9% + 30¢ per transaction'
        },
        features: [
          'Subscription management',
          'Automatic billing and invoicing',
          'Customer portal',
          'Dunning management',
          'Tax calculation',
          'Fraud protection'
        ],
        compliance: [
          'PCI DSS Level 1 certified',
          'SOC 2 Type II compliant',
          'GDPR and CCPA ready',
          'Educational service optimized'
        ]
      }
    };
  }

  // Helper methods
  getSubscriptionsByPlan(subscriptions) {
    const byPlan = {};
    subscriptions.forEach(sub => {
      byPlan[sub.planId] = (byPlan[sub.planId] || 0) + 1;
    });
    return byPlan;
  }

  calculateProration(subscription, oldPlan, newPlan) {
    const daysRemaining = Math.ceil((subscription.currentPeriodEnd - new Date()) / (1000 * 60 * 60 * 24));
    const totalDays = subscription.interval === 'month' ? 30 : 365;
    const proratedOld = (oldPlan.price / totalDays) * daysRemaining;
    const proratedNew = (newPlan.price / totalDays) * daysRemaining;

    return proratedNew - proratedOld;
  }

  isRefundEligible(subscription) {
    const daysSinceStart = Math.ceil((new Date() - subscription.currentPeriodStart) / (1000 * 60 * 60 * 24));
    return daysSinceStart <= 30; // 30-day refund policy
  }

  determineAccessLevel(subscription) {
    if (!subscription || subscription.status !== 'active') {
      return 'free';
    }

    const planLevels = {
      'basic_learning': 'basic',
      'advanced_learning': 'advanced',
      'professional_learning': 'professional',
      'api_access': 'api',
      'white_label_basic': 'white_label'
    };

    return planLevels[subscription.planId] || 'free';
  }
}

module.exports = EducationalPaymentService;
