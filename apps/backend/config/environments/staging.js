/**
 * Staging Environment Configuration
 * Staging settings for FinNexusAI backend (production-like environment)
 */

module.exports = {
  // Application settings
  app: {
    name: 'FinNexusAI Backend',
    version: process.env.npm_package_version || '1.0.0',
    port: process.env.PORT || 4000,
    environment: 'staging',
    debug: false,
    logLevel: 'warn'
  },

  // Database configurations
  database: {
    postgres: {
      host: process.env.POSTGRES_HOST || 'postgres-staging',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'finnexusai_staging',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD,
      ssl: {
        require: true,
        rejectUnauthorized: false
      },
      pool: {
        max: 15,
        min: 3,
        acquire: 30000,
        idle: 10000
      }
    },
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://mongodb-staging:27017/finnexusai_staging',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 15,
        serverSelectionTimeoutMS: 5000,
        ssl: true,
        sslValidate: false
      }
    },
    redis: {
      host: process.env.REDIS_HOST || 'redis-staging',
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
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },
    bcrypt: {
      saltRounds: 12
    },
    session: {
      secret: process.env.SESSION_SECRET,
      maxAge: 60 * 60 * 1000, // 1 hour
      secure: true,
      httpOnly: true,
      sameSite: 'strict'
    }
  },

  // Security settings
  security: {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://staging.finnexusai.com'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID']
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // Moderate limit for staging
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
      retries: 3
    },
    blockchain: {
      ethereum: {
        rpcUrl: process.env.ETHEREUM_RPC_URL,
        chainId: parseInt(process.env.ETHEREUM_CHAIN_ID) || 1
      },
      polygon: {
        rpcUrl: process.env.POLYGON_RPC_URL,
        chainId: parseInt(process.env.POLYGON_CHAIN_ID) || 137
      }
    },
    email: {
      provider: 'sendgrid',
      apiKey: process.env.SENDGRID_API_KEY,
      from: process.env.EMAIL_FROM || 'noreply@staging.finnexusai.com'
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
      environment: 'staging',
      tracesSampleRate: 0.5 // Higher sampling for staging
    },
    logging: {
      level: 'warn',
      format: 'json',
      file: {
        enabled: true,
        filename: 'logs/staging.log',
        maxSize: '50m',
        maxFiles: 5
      },
      console: {
        enabled: true
      }
    }
  },

  // Feature flags (staging allows testing new features)
  features: {
    registration: true,
    trading: true,
    portfolio: true,
    analytics: true,
    notifications: true,
    twoFactorAuth: process.env.FEATURE_2FA === 'true',
    biometricAuth: process.env.FEATURE_BIOMETRIC_AUTH === 'true',
    socialTrading: process.env.FEATURE_SOCIAL_TRADING === 'true',
    aiRecommendations: true,
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
      instances: parseInt(process.env.CLUSTER_INSTANCES) || 2
    }
  },

  // Compliance settings
  compliance: {
    gdpr: {
      enabled: true,
      dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS) || 90, // Shorter retention for staging
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

  // Backup settings (less frequent for staging)
  backup: {
    enabled: true,
    schedule: process.env.BACKUP_SCHEDULE || '0 3 * * *', // Daily at 3 AM
    retention: {
      daily: 7,
      weekly: 4,
      monthly: 3
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
      recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || ['staging-alerts@finnexusai.com']
    },
    slack: {
      enabled: true,
      webhook: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_ALERT_CHANNEL || '#staging-alerts'
    }
  },

  // Staging-specific settings
  staging: {
    enableGraphQLPlayground: true,
    enableSwaggerUI: true,
    seedDatabase: false,
    mockExternalAPIs: false,
    debugQueries: false,
    logSQLQueries: false
  }
};
