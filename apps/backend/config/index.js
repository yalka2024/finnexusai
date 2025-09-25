/**
 * Configuration Loader
 * Loads environment-specific configurations for FinNexusAI backend
 */

const path = require('path');
const fs = require('fs');
const logger = require('../src/utils/logger');

class ConfigLoader {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.config = null;
  }

  /**
   * Load configuration based on environment
   */
  load() {
    if (this.config) {
      return this.config;
    }

    try {
      // Load base configuration
      const baseConfig = this.loadBaseConfig();

      // Load environment-specific configuration
      const envConfig = this.loadEnvironmentConfig();

      // Merge configurations
      this.config = this.mergeConfigs(baseConfig, envConfig);

      // Validate configuration
      this.validateConfig(this.config);

      // Apply environment variables overrides
      this.applyEnvironmentOverrides(this.config);

      logger.info(`✅ Configuration loaded for environment: ${this.environment}`);
      return this.config;

    } catch (error) {
      logger.error('❌ Failed to load configuration:', error);
      throw error;
    }
  }

  /**
   * Load base configuration
   */
  loadBaseConfig() {
    return {
      // Default configuration that applies to all environments
      app: {
        name: 'FinNexusAI Backend',
        version: process.env.npm_package_version || '1.0.0'
      },
      security: {
        encryption: {
          algorithm: 'aes-256-gcm',
          keyLength: 32
        }
      },
      monitoring: {
        healthCheck: {
          enabled: true,
          interval: 30000 // 30 seconds
        }
      }
    };
  }

  /**
   * Load environment-specific configuration
   */
  loadEnvironmentConfig() {
    const configPath = path.join(__dirname, 'environments', `${this.environment}.js`);

    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found for environment: ${this.environment}`);
    }

    // Clear require cache to ensure fresh config
    delete require.cache[require.resolve(configPath)];

    return require(configPath);
  }

  /**
   * Merge configurations with proper deep merging
   */
  mergeConfigs(base, env) {
    const result = { ...base };

    for (const key in env) {
      if (Object.prototype.hasOwnProperty.call(env, key)) {
        if (typeof env[key] === 'object' && env[key] !== null && !Array.isArray(env[key])) {
          result[key] = { ...result[key], ...env[key] };
        } else {
          result[key] = env[key];
        }
      }
    }

    return result;
  }

  /**
   * Validate configuration
   */
  validateConfig(config) {
    const required = [
      'app.name',
      'app.port',
      'database.postgres.host',
      'database.postgres.database',
      'database.postgres.user',
      'auth.jwt.secret'
    ];

    for (const path of required) {
      if (!this.getNestedValue(config, path)) {
        throw new Error(`Required configuration missing: ${path}`);
      }
    }

    // Validate JWT secrets in production
    if (this.environment === 'production') {
      if (config.auth.jwt.secret === 'dev_jwt_secret_key_change_in_production') {
        throw new Error('JWT secret must be changed from default value in production');
      }
      if (config.auth.jwt.refreshSecret === 'dev_refresh_secret_key_change_in_production') {
        throw new Error('JWT refresh secret must be changed from default value in production');
      }
    }

    // Validate database passwords in production
    if (this.environment === 'production') {
      if (!config.database.postgres.password) {
        throw new Error('PostgreSQL password is required in production');
      }
      if (!config.database.mongodb.uri.includes('://') || !config.database.mongodb.uri.includes('@')) {
        throw new Error('MongoDB URI must include authentication in production');
      }
    }

    logger.info('✅ Configuration validation passed');
  }

  /**
   * Apply environment variable overrides
   */
  applyEnvironmentOverrides(config) {
    // Override with environment variables if they exist
    const overrides = {
      'app.port': process.env.PORT,
      'database.postgres.host': process.env.POSTGRES_HOST,
      'database.postgres.port': process.env.POSTGRES_PORT,
      'database.postgres.database': process.env.POSTGRES_DB,
      'database.postgres.user': process.env.POSTGRES_USER,
      'database.postgres.password': process.env.POSTGRES_PASSWORD,
      'database.mongodb.uri': process.env.MONGODB_URI,
      'database.redis.host': process.env.REDIS_HOST,
      'database.redis.port': process.env.REDIS_PORT,
      'database.redis.password': process.env.REDIS_PASSWORD,
      'auth.jwt.secret': process.env.JWT_SECRET,
      'auth.jwt.refreshSecret': process.env.JWT_REFRESH_SECRET,
      'external.marketData.apiKey': process.env.MARKET_DATA_API_KEY,
      'external.email.apiKey': process.env.SENDGRID_API_KEY,
      'external.sms.accountSid': process.env.TWILIO_ACCOUNT_SID,
      'external.sms.authToken': process.env.TWILIO_AUTH_TOKEN,
      'monitoring.sentry.dsn': process.env.SENTRY_DSN
    };

    for (const [path, value] of Object.entries(overrides)) {
      if (value !== undefined) {
        this.setNestedValue(config, path, value);
      }
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Get configuration value by path
   */
  get(path) {
    if (!this.config) {
      this.load();
    }
    return this.getNestedValue(this.config, path);
  }

  /**
   * Check if configuration has a value
   */
  has(path) {
    return this.get(path) !== undefined;
  }

  /**
   * Get all configuration
   */
  getAll() {
    if (!this.config) {
      this.load();
    }
    return this.config;
  }

  /**
   * Get environment name
   */
  getEnvironment() {
    return this.environment;
  }

  /**
   * Check if running in production
   */
  isProduction() {
    return this.environment === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment() {
    return this.environment === 'development';
  }

  /**
   * Check if running in staging
   */
  isStaging() {
    return this.environment === 'staging';
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig() {
    return this.get('database');
  }

  /**
   * Get authentication configuration
   */
  getAuthConfig() {
    return this.get('auth');
  }

  /**
   * Get security configuration
   */
  getSecurityConfig() {
    return this.get('security');
  }

  /**
   * Get monitoring configuration
   */
  getMonitoringConfig() {
    return this.get('monitoring');
  }

  /**
   * Get feature flags
   */
  getFeatures() {
    return this.get('features');
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(featureName) {
    return this.get(`features.${featureName}`) === true;
  }

  /**
   * Get external API configuration
   */
  getExternalConfig() {
    return this.get('external');
  }

  /**
   * Reload configuration (useful for testing)
   */
  reload() {
    this.config = null;
    return this.load();
  }

  /**
   * Get configuration summary (safe for logging)
   */
  getSummary() {
    const config = this.getAll();
    return {
      environment: this.environment,
      app: {
        name: config.app?.name,
        version: config.app?.version,
        port: config.app?.port
      },
      database: {
        postgres: {
          host: config.database?.postgres?.host,
          port: config.database?.postgres?.port,
          database: config.database?.postgres?.database
        },
        mongodb: {
          uri: config.database?.mongodb?.uri ? 'configured' : 'not configured'
        },
        redis: {
          host: config.database?.redis?.host,
          port: config.database?.redis?.port
        }
      },
      features: config.features,
      monitoring: {
        prometheus: config.monitoring?.prometheus?.enabled,
        sentry: config.monitoring?.sentry?.enabled
      }
    };
  }
}

// Create singleton instance
const configLoader = new ConfigLoader();

// Load configuration immediately
const config = configLoader.load();

module.exports = {
  config,
  configLoader,
  // Convenience methods
  get: (path) => configLoader.get(path),
  has: (path) => configLoader.has(path),
  getAll: () => configLoader.getAll(),
  getEnvironment: () => configLoader.getEnvironment(),
  isProduction: () => configLoader.isProduction(),
  isDevelopment: () => configLoader.isDevelopment(),
  isStaging: () => configLoader.isStaging(),
  isFeatureEnabled: (featureName) => configLoader.isFeatureEnabled(featureName),
  getDatabaseConfig: () => configLoader.getDatabaseConfig(),
  getAuthConfig: () => configLoader.getAuthConfig(),
  getSecurityConfig: () => configLoader.getSecurityConfig(),
  getMonitoringConfig: () => configLoader.getMonitoringConfig(),
  getFeatures: () => configLoader.getFeatures(),
  getExternalConfig: () => configLoader.getExternalConfig(),
  getSummary: () => configLoader.getSummary()
};
