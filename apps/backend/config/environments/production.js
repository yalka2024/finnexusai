/**
 * Production Environment Configuration
 * Production settings for FinNexusAI backend
 */

module.exports = {
  // Application settings
  app: {
    name: 'FinNexusAI Backend',
    version: process.env.npm_package_version || '1.0.0',
    port: process.env.PORT || 4000,
    environment: 'production',
    debug: false,
    logLevel: 'info'
  },

  // Database configurations
  database: {
    postgres: {
      host: process.env.POSTGRES_HOST || 'postgres',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'finnexusai',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD,
      ssl: {
        require: true,
        rejectUnauthorized: false
      },
      pool: {
        max: 20,
        min: 5,
        acquire: 30000,
        idle: 10000
      }
    },
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://mongodb:27017/finnexusai',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 5000,
        ssl: true,
        sslValidate: false
      }
    },
    redis: {
      host: process.env.REDIS_HOST || 'redis',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined
    }
  },

  // Authentication settings
  auth: {
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },
    bcrypt: {
      saltRounds: 12
    },
    session: {
      secret: process.env.SESSION_SECRET,
      maxAge: 15 * 60 * 1000, // 15 minutes
      secure: true,
      httpOnly: true,
      sameSite: 'strict'
    }
  },

  // Security settings
  security: {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://finnexusai.com'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID']
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Strict limit for production
      message: 'Too many requests from this IP, please try again later',
      skipSuccessfulRequests: false
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ['\'self\''],
          styleSrc: ['\'self\'', '\'unsafe-inline\''],
          scriptSrc: ['\'self\''],
          imgSrc: ['\'self\'', 'data:', 'https:'],
          connectSrc: ['\'self\''],
          fontSrc: ['\'self\''],
          objectSrc: ['\'none\''],
          mediaSrc: ['\'self\''],
          frameSrc: ['\'none\'']
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }
  },

  // External API configurations
  external: {
    marketData: {
      baseUrl: process.env.MARKET_DATA_API_URL || 'https://api.coingecko.com/api/v3',
      apiKey: process.env.MARKET_DATA_API_KEY,
      timeout: 15000,
      retries: 5
    },
    blockchain: {
      ethereum: {
        rpcUrl: process.env.ETHEREUM_RPC_URL,
        chainId: parseInt(process.env.ETHEREUM_CHAIN_ID) || 1
      },
      polygon: {
        rpcUrl: process.env.POLYGON_RPC_URL,
        chainId: parseInt(process.env.POLYGON_CHAIN_ID) || 137
      },
      bsc: {
        rpcUrl: process.env.BSC_RPC_URL,
        chainId: parseInt(process.env.BSC_CHAIN_ID) || 56
      }
    },
    email: {
      provider: 'sendgrid',
      apiKey: process.env.SENDGRID_API_KEY,
      from: process.env.EMAIL_FROM || 'noreply@finnexusai.com'
    },
    sms: {
      provider: 'twilio',
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      from: process.env.TWILIO_PHONE_NUMBER
    }
  },

  // Monitoring and logging
  monitoring: {
    prometheus: {
      enabled: true,
      port: 9090,
      path: '/metrics'
    },
    sentry: {
      enabled: true,
      dsn: process.env.SENTRY_DSN,
      environment: 'production',
      tracesSampleRate: 0.1
    },
    datadog: {
      enabled: process.env.DATADOG_ENABLED === 'true',
      apiKey: process.env.DATADOG_API_KEY,
      service: 'finnexusai-backend'
    },
    logging: {
      level: 'info',
      format: 'json',
      file: {
        enabled: true,
        filename: 'logs/production.log',
        maxSize: '100m',
        maxFiles: 10
      },
      console: {
        enabled: true
      }
    }
  },

  // Feature flags
  features: {
    registration: process.env.FEATURE_REGISTRATION !== 'false',
    trading: process.env.FEATURE_TRADING !== 'false',
    portfolio: process.env.FEATURE_PORTFOLIO !== 'false',
    analytics: process.env.FEATURE_ANALYTICS !== 'false',
    notifications: process.env.FEATURE_NOTIFICATIONS !== 'false',
    twoFactorAuth: process.env.FEATURE_2FA === 'true',
    biometricAuth: process.env.FEATURE_BIOMETRIC_AUTH === 'true',
    socialTrading: process.env.FEATURE_SOCIAL_TRADING === 'true',
    aiRecommendations: process.env.FEATURE_AI_RECOMMENDATIONS !== 'false',
    arIntegration: process.env.FEATURE_AR_INTEGRATION === 'true',
    quantumOptimization: process.env.FEATURE_QUANTUM_OPTIMIZATION === 'true'
  },

  // Performance settings
  performance: {
    compression: {
      enabled: true,
      level: 6,
      threshold: 1024
    },
    caching: {
      enabled: true,
      ttl: {
        default: 300, // 5 minutes
        marketData: 60, // 1 minute
        userData: 600, // 10 minutes
        static: 3600 // 1 hour
      }
    },
    clustering: {
      enabled: process.env.CLUSTERING_ENABLED === 'true',
      instances: parseInt(process.env.CLUSTER_INSTANCES) || require('os').cpus().length
    }
  },

  // Compliance settings
  compliance: {
    gdpr: {
      enabled: true,
      dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS) || 2555, // 7 years
      rightToErasure: true,
      dataPortability: true
    },
    pci: {
      enabled: process.env.PCI_COMPLIANCE_ENABLED === 'true',
      encryptionLevel: 'AES-256'
    },
    sox: {
      enabled: process.env.SOX_COMPLIANCE_ENABLED === 'true',
      auditTrail: true
    }
  },

  // Backup settings
  backup: {
    enabled: true,
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    retention: {
      daily: 30,
      weekly: 12,
      monthly: 12
    },
    storage: {
      type: process.env.BACKUP_STORAGE_TYPE || 's3',
      bucket: process.env.BACKUP_S3_BUCKET,
      region: process.env.BACKUP_S3_REGION || 'us-east-1'
    }
  },

  // Alert settings
  alerts: {
    email: {
      enabled: true,
      recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || ['alerts@finnexusai.com']
    },
    slack: {
      enabled: true,
      webhook: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_ALERT_CHANNEL || '#alerts'
    },
    pagerduty: {
      enabled: process.env.PAGERDUTY_ENABLED === 'true',
      integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY
    }
  }
};
