/**
 * Development Environment Configuration
 * Local development settings for FinNexusAI backend
 */

module.exports = {
  // Application settings
  app: {
    name: 'FinNexusAI Backend',
    version: process.env.npm_package_version || '1.0.0',
    port: process.env.PORT || 4000,
    environment: 'development',
    debug: true,
    logLevel: 'debug'
  },

  // Database configurations
  database: {
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'finnexusai_dev',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'password',
      ssl: false,
      pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000
      }
    },
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/finnexusai_dev',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000
      }
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || null,
      db: 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null
    }
  },

  // Authentication settings
  auth: {
    jwt: {
      secret: process.env.JWT_SECRET || 'dev_jwt_secret_key_change_in_production',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_key_change_in_production',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },
    bcrypt: {
      saltRounds: 10
    },
    session: {
      secret: process.env.SESSION_SECRET || 'dev_session_secret_change_in_production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  },

  // Security settings
  security: {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID']
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Higher limit for development
      message: 'Too many requests from this IP, please try again later'
    },
    helmet: {
      contentSecurityPolicy: false, // Disabled for development
      crossOriginEmbedderPolicy: false
    }
  },

  // External API configurations
  external: {
    marketData: {
      baseUrl: process.env.MARKET_DATA_API_URL || 'https://api.coingecko.com/api/v3',
      apiKey: process.env.MARKET_DATA_API_KEY || null,
      timeout: 10000,
      retries: 3
    },
    blockchain: {
      ethereum: {
        rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/your_project_id',
        chainId: 1
      },
      polygon: {
        rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
        chainId: 137
      }
    },
    email: {
      provider: 'sendgrid',
      apiKey: process.env.SENDGRID_API_KEY || null,
      from: process.env.EMAIL_FROM || 'noreply@finnexusai.com'
    },
    sms: {
      provider: 'twilio',
      accountSid: process.env.TWILIO_ACCOUNT_SID || null,
      authToken: process.env.TWILIO_AUTH_TOKEN || null,
      from: process.env.TWILIO_PHONE_NUMBER || null
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
      enabled: false, // Disabled for development
      dsn: process.env.SENTRY_DSN || null
    },
    logging: {
      level: 'debug',
      format: 'combined',
      file: {
        enabled: true,
        filename: 'logs/development.log',
        maxSize: '10m',
        maxFiles: 5
      }
    }
  },

  // Feature flags
  features: {
    registration: true,
    trading: true,
    portfolio: true,
    analytics: true,
    notifications: true,
    twoFactorAuth: false,
    biometricAuth: false,
    socialTrading: false,
    aiRecommendations: true,
    arIntegration: false,
    quantumOptimization: false
  },

  // Development-specific settings
  development: {
    seedDatabase: true,
    mockExternalAPIs: true,
    enableGraphQLPlayground: true,
    enableSwaggerUI: true,
    hotReload: true,
    debugQueries: true,
    logSQLQueries: true
  },

  // Testing configuration
  testing: {
    database: {
      postgres: {
        database: 'finnexusai_test',
        dropSchema: true
      },
      mongodb: {
        uri: 'mongodb://localhost:27017/finnexusai_test'
      },
      redis: {
        db: 1
      }
    },
    mockServices: {
      marketData: true,
      blockchain: true,
      email: true,
      sms: true
    }
  }
};
