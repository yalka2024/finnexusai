/**
 * Input Validation Schemas using Joi
 * Comprehensive validation for all API endpoints
 */

const Joi = require('joi');

// Common validation patterns
const common = {
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    }),
  userId: Joi.string().uuid().required(),
  timestamp: Joi.date().iso().required(),
  pagination: {
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name', 'value').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }
};

// Authentication schemas
const auth = {
  login: Joi.object({
    email: common.email,
    password: Joi.string().required(),
    rememberMe: Joi.boolean().default(false),
    deviceFingerprint: Joi.string().optional()
  }),

  register: Joi.object({
    email: common.email,
    password: common.password,
    firstName: Joi.string().min(2).max(50).trim().required(),
    lastName: Joi.string().min(2).max(50).trim().required(),
    dateOfBirth: Joi.date().max('now').required(),
    phone: Joi.string().pattern(/^\+?[\d\s-()]+$/).optional(),
    country: Joi.string().length(2).uppercase().required(),
    termsAccepted: Joi.boolean().valid(true).required(),
    privacyAccepted: Joi.boolean().valid(true).required()
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required()
  }),

  resetPassword: Joi.object({
    email: common.email
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: common.password,
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
  }),

  forgotPassword: Joi.object({
    email: common.email
  }),

  resetPasswordWithToken: Joi.object({
    token: Joi.string().required(),
    newPassword: common.password,
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
  }),

  verifyEmail: Joi.object({
    token: Joi.string().required()
  }),

  resendVerification: Joi.object({
    type: Joi.string().valid('registration', 'email_change').default('registration')
  }),

  enable2FA: Joi.object({
    token: Joi.string().length(6).pattern(/^\d{6}$/).required()
  }),

  disable2FA: Joi.object({
    token: Joi.string().length(6).pattern(/^\d{6}$/).required()
  }),

  verify2FA: Joi.object({
    userId: common.userId,
    token: Joi.string().length(6).pattern(/^\d{6}$/).when('backupCode', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required()
    }),
    backupCode: Joi.string().length(8).pattern(/^[A-F0-9]{8}$/)
  }).or('token', 'backupCode'),

  regenerateBackupCodes: Joi.object({
    token: Joi.string().length(6).pattern(/^\d{6}$/).required()
  })
};

// Portfolio schemas
const portfolio = {
  getPortfolio: Joi.object({
    userId: common.userId,
    includeHistory: Joi.boolean().default(false),
    ...common.pagination
  }),

  updatePortfolio: Joi.object({
    name: Joi.string().min(2).max(100).trim().optional(),
    description: Joi.string().max(500).trim().optional(),
    riskTolerance: Joi.string().valid('conservative', 'moderate', 'aggressive').optional(),
    investmentGoal: Joi.string().valid('growth', 'income', 'preservation', 'speculation').optional()
  }),

  addAsset: Joi.object({
    symbol: Joi.string().length(3, 10).uppercase().required(),
    quantity: Joi.number().positive().required(),
    purchasePrice: Joi.number().positive().required(),
    purchaseDate: Joi.date().max('now').required(),
    assetType: Joi.string().valid('stock', 'bond', 'crypto', 'commodity', 'forex', 'derivative').required()
  }),

  removeAsset: Joi.object({
    assetId: Joi.string().uuid().required()
  })
};

// Trading schemas
const trading = {
  executeTrade: Joi.object({
    type: Joi.string().valid('buy', 'sell', 'short', 'cover').required(),
    symbol: Joi.string().length(3, 10).uppercase().required(),
    quantity: Joi.number().positive().required(),
    price: Joi.number().positive().when('type', {
      is: 'market',
      then: Joi.optional(),
      otherwise: Joi.required()
    }),
    orderType: Joi.string().valid('market', 'limit', 'stop', 'stop_limit').required(),
    stopPrice: Joi.number().positive().when('orderType', {
      is: Joi.string().valid('stop', 'stop_limit'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    timeInForce: Joi.string().valid('GTC', 'IOC', 'FOK', 'DAY').default('GTC'),
    clientOrderId: Joi.string().max(50).optional()
  }),

  cancelOrder: Joi.object({
    orderId: Joi.string().uuid().required()
  }),

  getOrders: Joi.object({
    status: Joi.string().valid('pending', 'filled', 'cancelled', 'rejected').optional(),
    symbol: Joi.string().length(3, 10).uppercase().optional(),
    ...common.pagination
  }),

  orderId: Joi.object({
    orderId: Joi.string().uuid().required()
  }),

  getPositions: Joi.object({
    symbol: Joi.string().length(3, 10).uppercase().optional(),
    ...common.pagination
  })
};

// Analytics schemas
const analytics = {
  getMarketData: Joi.object({
    symbols: Joi.array().items(Joi.string().length(3, 10).uppercase()).min(1).max(50).required(),
    timeframe: Joi.string().valid('1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M').default('1d'),
    limit: Joi.number().integer().min(1).max(1000).default(100)
  }),

  getAnalytics: Joi.object({
    type: Joi.string().valid('portfolio', 'market', 'risk', 'performance').required(),
    timeframe: Joi.string().valid('1d', '7d', '30d', '90d', '1y', 'all').default('30d'),
    includeBenchmarks: Joi.boolean().default(true)
  }),

  generateReport: Joi.object({
    reportType: Joi.string().valid('portfolio_summary', 'performance_analysis', 'risk_assessment', 'tax_report').required(),
    format: Joi.string().valid('pdf', 'csv', 'json').default('pdf'),
    dateRange: Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
    }).required()
  })
};

// Compliance schemas
const compliance = {
  checkCompliance: Joi.object({
    userId: common.userId,
    checkType: Joi.string().valid('kyc', 'aml', 'sanctions', 'pep').required(),
    jurisdiction: Joi.string().length(2).uppercase().optional()
  }),

  updateKYC: Joi.object({
    documentType: Joi.string().valid('passport', 'drivers_license', 'national_id').required(),
    documentNumber: Joi.string().max(50).required(),
    documentCountry: Joi.string().length(2).uppercase().required(),
    documentExpiry: Joi.date().min('now').required(),
    address: Joi.object({
      street: Joi.string().max(100).required(),
      city: Joi.string().max(50).required(),
      state: Joi.string().max(50).required(),
      postalCode: Joi.string().max(20).required(),
      country: Joi.string().length(2).uppercase().required()
    }).required()
  }),

  reportSuspiciousActivity: Joi.object({
    activityType: Joi.string().valid('unusual_transaction', 'suspicious_behavior', 'fraud_attempt', 'money_laundering').required(),
    description: Joi.string().min(10).max(1000).required(),
    amount: Joi.number().positive().optional(),
    transactionId: Joi.string().uuid().optional(),
    evidence: Joi.array().items(Joi.string()).max(5).optional()
  }),

  sanctionsCheck: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    jurisdiction: Joi.string().length(2).uppercase().optional()
  }),

  regulatoryReports: Joi.object({
    reportType: Joi.string().valid('transaction_report', 'suspicious_activity', 'regulatory_filing').optional(),
    jurisdiction: Joi.string().length(2).uppercase().optional(),
    dateRange: Joi.object({
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
    }).optional(),
    ...common.pagination
  })
};

// User management schemas
const user = {
  updateProfile: Joi.object({
    firstName: Joi.string().min(2).max(50).trim().optional(),
    lastName: Joi.string().min(2).max(50).trim().optional(),
    phone: Joi.string().pattern(/^\+?[\d\s-()]+$/).optional(),
    country: Joi.string().length(2).uppercase().optional(),
    timezone: Joi.string().max(50).optional(),
    language: Joi.string().length(2).lowercase().optional(),
    address: Joi.object({
      street: Joi.string().max(100).optional(),
      city: Joi.string().max(50).optional(),
      state: Joi.string().max(50).optional(),
      postalCode: Joi.string().max(20).optional(),
      country: Joi.string().length(2).uppercase().optional()
    }).optional(),
    preferences: Joi.object({
      language: Joi.string().valid('en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko').default('en'),
      timezone: Joi.string().max(50).default('UTC'),
      notifications: Joi.object({
        email: Joi.boolean().default(true),
        sms: Joi.boolean().default(false),
        push: Joi.boolean().default(true)
      }).default(),
      privacy: Joi.object({
        shareData: Joi.boolean().default(false),
        marketingEmails: Joi.boolean().default(false)
      }).default()
    }).optional()
  }),

  preferences: Joi.object({
    language: Joi.string().valid('en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko').optional(),
    timezone: Joi.string().max(50).optional(),
    currency: Joi.string().length(3).uppercase().optional(),
    theme: Joi.string().valid('light', 'dark', 'auto').optional(),
    notifications: Joi.object({
      email: Joi.boolean().optional(),
      sms: Joi.boolean().optional(),
      push: Joi.boolean().optional()
    }).optional(),
    privacy: Joi.object({
      shareData: Joi.boolean().optional(),
      marketingEmails: Joi.boolean().optional()
    }).optional()
  }),

  sessionId: Joi.object({
    sessionId: Joi.string().uuid().required()
  }),

  getUser: Joi.object({
    userId: common.userId
  }),

  deleteUser: Joi.object({
    userId: common.userId,
    reason: Joi.string().max(200).optional(),
    confirmDeletion: Joi.boolean().valid(true).required()
  })
};

// Admin schemas
const admin = {
  createUser: Joi.object({
    email: common.email,
    password: common.password,
    firstName: Joi.string().min(2).max(50).trim().required(),
    lastName: Joi.string().min(2).max(50).trim().required(),
    role: Joi.string().valid('user', 'trader', 'analyst', 'admin').default('user'),
    permissions: Joi.array().items(Joi.string()).optional()
  }),

  updateUser: Joi.object({
    userId: common.userId,
    role: Joi.string().valid('user', 'trader', 'analyst', 'admin').optional(),
    status: Joi.string().valid('active', 'suspended', 'banned').optional(),
    permissions: Joi.array().items(Joi.string()).optional()
  }),

  getAuditLogs: Joi.object({
    userId: Joi.string().uuid().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    minRiskScore: Joi.number().min(0).max(10).optional(),
    securityFlags: Joi.array().items(Joi.string()).optional(),
    ...common.pagination
  }),

  getSystemMetrics: Joi.object({
    timeframe: Joi.string().valid('1h', '24h', '7d', '30d').default('24h'),
    metrics: Joi.array().items(Joi.string().valid('users', 'trades', 'revenue', 'errors', 'performance')).default(['users', 'trades'])
  })
};

// File upload schemas
const upload = {
  uploadDocument: Joi.object({
    documentType: Joi.string().valid('kyc', 'proof_of_address', 'bank_statement', 'tax_document').required(),
    fileType: Joi.string().valid('pdf', 'jpg', 'jpeg', 'png').required(),
    fileSize: Joi.number().max(10 * 1024 * 1024).required() // 10MB max
  }),

  uploadAvatar: Joi.object({
    fileType: Joi.string().valid('jpg', 'jpeg', 'png', 'gif').required(),
    fileSize: Joi.number().max(5 * 1024 * 1024).required() // 5MB max
  })
};

// Notification schemas
const notifications = {
  createNotification: Joi.object({
    userId: common.userId,
    type: Joi.string().valid('info', 'warning', 'error', 'success').required(),
    title: Joi.string().max(100).required(),
    message: Joi.string().max(500).required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
    channels: Joi.array().items(Joi.string().valid('email', 'sms', 'push', 'in_app')).min(1).required(),
    scheduledFor: Joi.date().min('now').optional()
  }),

  getNotifications: Joi.object({
    userId: common.userId,
    status: Joi.string().valid('unread', 'read', 'archived').optional(),
    type: Joi.string().valid('info', 'warning', 'error', 'success').optional(),
    ...common.pagination
  }),

  markAsRead: Joi.object({
    notificationIds: Joi.array().items(Joi.string().uuid()).min(1).max(100).required()
  })
};

// Secrets management schemas
const secrets = {
  storeSecret: Joi.object({
    key: Joi.string().min(1).max(255).required(),
    value: Joi.string().min(1).required(),
    metadata: Joi.object().default({}),
    expiresAt: Joi.date().iso().optional()
  }),

  updateSecret: Joi.object({
    value: Joi.string().min(1).required(),
    metadata: Joi.object().default({}),
    expiresAt: Joi.date().iso().optional()
  }),

  secretKey: Joi.object({
    key: Joi.string().min(1).max(255).required()
  }),

  rotateSecret: Joi.object({
    type: Joi.string().valid('general', 'api_key', 'password', 'jwt_secret').default('general'),
    length: Joi.number().integer().min(8).max(128).default(32)
  }),

  generateSecret: Joi.object({
    type: Joi.string().valid('general', 'api_key', 'password', 'jwt_secret').required(),
    length: Joi.number().integer().min(8).max(128).default(32)
  }),

  validateSecret: Joi.object({
    secret: Joi.string().required(),
    type: Joi.string().valid('general', 'api_key', 'password', 'jwt_secret').required()
  })
};

// GDPR/CCPA compliance schemas
const gdpr = {
  recordConsent: Joi.object({
    consentType: Joi.string().valid('marketing', 'analytics', 'data_sharing', 'essential', 'third_party', 'profiling').required(),
    granted: Joi.boolean().required(),
    method: Joi.string().valid('explicit', 'opt_in', 'opt_out', 'implied').default('explicit'),
    consentText: Joi.string().optional(),
    version: Joi.string().default('1.0'),
    expiresAt: Joi.date().iso().optional()
  }),

  consentType: Joi.object({
    consentType: Joi.string().valid('marketing', 'analytics', 'data_sharing', 'essential', 'third_party', 'profiling').required()
  }),

  dataSubjectRequest: Joi.object({
    type: Joi.string().valid('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection').required(),
    dataCategories: Joi.array().items(Joi.string()).default([]),
    reason: Joi.string().max(500).optional()
  }),

  requestId: Joi.object({
    requestId: Joi.string().uuid().required()
  }),

  dataExport: Joi.object({
    format: Joi.string().valid('json', 'csv', 'pdf').default('json')
  }),

  verifyConsent: Joi.object({
    consentType: Joi.string().valid('marketing', 'analytics', 'data_sharing', 'essential', 'third_party', 'profiling').required()
  }),

  recordProcessingActivity: Joi.object({
    userId: Joi.string().uuid().required(),
    type: Joi.string().valid('collection', 'processing', 'sharing', 'storage', 'deletion', 'transfer').required(),
    purpose: Joi.string().min(10).max(500).required(),
    legalBasis: Joi.string().valid('consent', 'contract', 'legal_obligation', 'legitimate_interest', 'vital_interests', 'public_task').required(),
    dataCategories: Joi.array().items(Joi.string()).min(1).required(),
    thirdParties: Joi.array().items(Joi.string()).default([]),
    retentionPeriod: Joi.string().optional()
  })
};

// Database management schemas
const database = {
  getUserData: Joi.object({
    includeTrading: Joi.boolean().default(true),
    includePortfolio: Joi.boolean().default(true),
    includeCompliance: Joi.boolean().default(true)
  })
};

// API Key management schemas
const apiKeys = {
  generateAPIKey: Joi.object({
    permissions: Joi.array().items(
      Joi.string().valid('read', 'write', 'admin', 'trading', 'portfolio', 'compliance')
    ).min(1).required(),
    rateLimit: Joi.number().integer().min(1).max(10000).default(1000),
    ipWhitelist: Joi.array().items(Joi.string().ip()).optional(),
    expiresAt: Joi.date().iso().greater('now').optional(),
    metadata: Joi.object().optional()
  }),

  updateAPIKey: Joi.object({
    permissions: Joi.array().items(
      Joi.string().valid('read', 'write', 'admin', 'trading', 'portfolio', 'compliance')
    ).optional(),
    rateLimit: Joi.number().integer().min(1).max(10000).optional(),
    ipWhitelist: Joi.array().items(Joi.string().ip()).optional(),
    expiresAt: Joi.date().iso().greater('now').optional()
  }),

  getAPIKeys: Joi.object({
    includeInactive: Joi.boolean().default(false)
  }),

  keyId: Joi.object({
    keyId: Joi.string().uuid().required()
  }),

  validateAPIKey: Joi.object({
    apiKey: Joi.string().required(),
    apiSecret: Joi.string().required()
  })
};

module.exports = {
  common,
  auth,
  portfolio,
  trading,
  analytics,
  compliance,
  user,
  admin,
  upload,
  notifications,
  secrets,
  gdpr,
  database,
  apiKeys
};
