/**
 * Database Connection Pool Manager
 * Manages connection pools for PostgreSQL, MongoDB, and Redis with optimal configuration
 */

const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const Redis = require('redis');
const EventEmitter = require('events');
const logger = require('../../utils/logger');

class ConnectionPoolManager extends EventEmitter {
  constructor() {
    super();
    this.pools = {
      postgres: null,
      mongodb: null,
      redis: null
    };

    this.config = {
      postgres: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT) || 5432,
        database: process.env.POSTGRES_DB || 'fin_nexus_ai',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'password',
        ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,

        // Connection pool settings
        max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS) || 20,
        min: parseInt(process.env.POSTGRES_MIN_CONNECTIONS) || 5,
        idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT) || 30000,
        connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT) || 10000,
        acquireTimeoutMillis: parseInt(process.env.POSTGRES_ACQUIRE_TIMEOUT) || 60000,
        createTimeoutMillis: parseInt(process.env.POSTGRES_CREATE_TIMEOUT) || 30000,
        destroyTimeoutMillis: parseInt(process.env.POSTGRES_DESTROY_TIMEOUT) || 5000,
        reapIntervalMillis: parseInt(process.env.POSTGRES_REAP_INTERVAL) || 1000,
        createRetryIntervalMillis: parseInt(process.env.POSTGRES_CREATE_RETRY_INTERVAL) || 200,
        propagateCreateError: false,

        // Connection validation
        validate: (client) => {
          return client && !client._ending && !client._destroyed;
        },

        // Application name for monitoring
        application_name: 'FinNexusAI-Backend'
      },

      mongodb: {
        uri: process.env.MONGO_URI || 'mongodb://localhost:27017/finnexusai',
        options: {
          // Connection pool settings
          maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE) || 20,
          minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE) || 5,
          maxIdleTimeMS: parseInt(process.env.MONGO_MAX_IDLE_TIME) || 30000,
          serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT) || 10000,
          connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT) || 10000,
          socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT) || 30000,

          // Write concern
          writeConcern: {
            w: 'majority',
            j: true,
            wtimeout: 10000
          },

          // Read preference
          readPreference: 'primaryPreferred',

          // Retry settings
          retryWrites: true,
          retryReads: true,

          // Compression
          compressors: ['zlib'],

          // Authentication
          authSource: process.env.MONGO_AUTH_SOURCE || 'admin',

          // Application name
          appName: 'FinNexusAI-Backend'
        }
      },

      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        options: {
          // Connection pool settings
          maxMemoryPolicy: 'allkeys-lru',
          maxmemory: process.env.REDIS_MAX_MEMORY || '256mb',

          // Connection settings
          connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT) || 10000,
          commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT) || 5000,
          lazyConnect: true,
          keepAlive: true,

          // Retry settings
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          retryDelayOnClusterDown: 300,

          // Authentication
          password: process.env.REDIS_PASSWORD,

          // Database selection
          db: parseInt(process.env.REDIS_DB) || 0,

          // Application name
          name: 'FinNexusAI-Backend'
        }
      }
    };

    this.metrics = {
      postgres: {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingClients: 0,
        connectionErrors: 0,
        queryErrors: 0
      },
      mongodb: {
        totalConnections: 0,
        activeConnections: 0,
        connectionErrors: 0,
        operationErrors: 0
      },
      redis: {
        connected: false,
        connectionErrors: 0,
        commandErrors: 0
      }
    };

    this.isInitialized = false;
    this.healthCheckInterval = null;
  }

  /**
   * Initialize all connection pools
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        logger.info('⚠️ Connection pools already initialized');
        return { success: true, message: 'Connection pools already initialized' };
      }

      logger.info('🔄 Initializing database connection pools...');

      // Initialize PostgreSQL pool
      await this.initializePostgresPool();

      // Initialize MongoDB pool
      await this.initializeMongoPool();

      // Initialize Redis pool
      await this.initializeRedisPool();

      // Start health monitoring
      this.startHealthMonitoring();

      this.isInitialized = true;
      logger.info('✅ Database connection pools initialized successfully');

      return {
        success: true,
        message: 'Database connection pools initialized successfully',
        pools: {
          postgres: !!this.pools.postgres,
          mongodb: !!this.pools.mongodb,
          redis: !!this.pools.redis
        }
      };

    } catch (error) {
      logger.error('❌ Failed to initialize connection pools:', error);
      throw new Error(`Connection pool initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize PostgreSQL connection pool
   */
  async initializePostgresPool() {
    try {
      logger.info('🔄 Initializing PostgreSQL connection pool...');

      this.pools.postgres = new Pool(this.config.postgres);

      // Set up event handlers
      this.pools.postgres.on('connect', (client) => {
        this.metrics.postgres.totalConnections++;
        this.metrics.postgres.activeConnections++;
        this.emit('postgres:connect', { client });
      });

      this.pools.postgres.on('acquire', (client) => {
        this.metrics.postgres.activeConnections++;
        this.metrics.postgres.idleConnections = Math.max(0, this.metrics.postgres.idleConnections - 1);
        this.emit('postgres:acquire', { client });
      });

      this.pools.postgres.on('release', (client) => {
        this.metrics.postgres.activeConnections = Math.max(0, this.metrics.postgres.activeConnections - 1);
        this.metrics.postgres.idleConnections++;
        this.emit('postgres:release', { client });
      });

      this.pools.postgres.on('remove', (client) => {
        this.metrics.postgres.totalConnections = Math.max(0, this.metrics.postgres.totalConnections - 1);
        this.emit('postgres:remove', { client });
      });

      this.pools.postgres.on('error', (err, client) => {
        this.metrics.postgres.connectionErrors++;
        logger.error('❌ PostgreSQL pool error:', err);
        this.emit('postgres:error', { error: err, client });
      });

      // Test connection
      const client = await this.pools.postgres.connect();
      await client.query('SELECT NOW()');
      client.release();

      logger.info('✅ PostgreSQL connection pool initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize PostgreSQL pool:', error);
      throw error;
    }
  }

  /**
   * Initialize MongoDB connection pool
   */
  async initializeMongoPool() {
    try {
      logger.info('🔄 Initializing MongoDB connection pool...');

      this.pools.mongodb = new MongoClient(this.config.mongodb.uri, this.config.mongodb.options);

      // Set up event handlers
      this.pools.mongodb.on('connectionPoolCreated', (event) => {
        this.metrics.mongodb.totalConnections = event.connectionPool.totalConnectionCount;
        this.emit('mongodb:poolCreated', { event });
      });

      this.pools.mongodb.on('connectionPoolClosed', (event) => {
        this.emit('mongodb:poolClosed', { event });
      });

      this.pools.mongodb.on('connectionCreated', (event) => {
        this.metrics.mongodb.totalConnections++;
        this.metrics.mongodb.activeConnections++;
        this.emit('mongodb:connectionCreated', { event });
      });

      this.pools.mongodb.on('connectionClosed', (event) => {
        this.metrics.mongodb.totalConnections = Math.max(0, this.metrics.mongodb.totalConnections - 1);
        this.metrics.mongodb.activeConnections = Math.max(0, this.metrics.mongodb.activeConnections - 1);
        this.emit('mongodb:connectionClosed', { event });
      });

      this.pools.mongodb.on('error', (error) => {
        this.metrics.mongodb.connectionErrors++;
        logger.error('❌ MongoDB connection error:', error);
        this.emit('mongodb:error', { error });
      });

      // Connect to MongoDB
      await this.pools.mongodb.connect();

      // Test connection
      await this.pools.mongodb.db().admin().ping();

      logger.info('✅ MongoDB connection pool initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize MongoDB pool:', error);
      throw error;
    }
  }

  /**
   * Initialize Redis connection pool
   */
  async initializeRedisPool() {
    try {
      logger.info('🔄 Initializing Redis connection pool...');

      this.pools.redis = Redis.createClient({
        url: this.config.redis.url,
        ...this.config.redis.options
      });

      // Set up event handlers
      this.pools.redis.on('connect', () => {
        this.metrics.redis.connected = true;
        logger.info('✅ Redis connected');
        this.emit('redis:connect');
      });

      this.pools.redis.on('ready', () => {
        logger.info('✅ Redis ready');
        this.emit('redis:ready');
      });

      this.pools.redis.on('error', (error) => {
        this.metrics.redis.connectionErrors++;
        logger.error('❌ Redis connection error:', error);
        this.emit('redis:error', { error });
      });

      this.pools.redis.on('end', () => {
        this.metrics.redis.connected = false;
        logger.info('⚠️ Redis connection ended');
        this.emit('redis:end');
      });

      this.pools.redis.on('reconnecting', () => {
        logger.info('🔄 Redis reconnecting...');
        this.emit('redis:reconnecting');
      });

      // Connect to Redis
      await this.pools.redis.connect();

      // Test connection
      await this.pools.redis.ping();

      logger.info('✅ Redis connection pool initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Redis pool:', error);
      throw error;
    }
  }

  /**
   * Get PostgreSQL pool
   */
  getPostgresPool() {
    if (!this.pools.postgres) {
      throw new Error('PostgreSQL pool not initialized');
    }
    return this.pools.postgres;
  }

  /**
   * Get MongoDB client
   */
  getMongoClient() {
    if (!this.pools.mongodb) {
      throw new Error('MongoDB client not initialized');
    }
    return this.pools.mongodb;
  }

  /**
   * Get Redis client
   */
  getRedisClient() {
    if (!this.pools.redis) {
      throw new Error('Redis client not initialized');
    }
    return this.pools.redis;
  }

  /**
   * Execute PostgreSQL query with connection management
   */
  async executePostgresQuery(query, params = []) {
    const startTime = Date.now();
    let client;

    try {
      client = await this.pools.postgres.connect();
      const result = await client.query(query, params);
      return result;
    } catch (error) {
      this.metrics.postgres.queryErrors++;
      throw error;
    } finally {
      if (client) {
        client.release();
      }

      const duration = Date.now() - startTime;
      this.emit('postgres:query', { query, duration, error: null });
    }
  }

  /**
   * Execute MongoDB operation with connection management
   */
  async executeMongoOperation(operation) {
    const startTime = Date.now();

    try {
      const result = await operation(this.pools.mongodb);
      return result;
    } catch (error) {
      this.metrics.mongodb.operationErrors++;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.emit('mongodb:operation', { operation: operation.name, duration, error: null });
    }
  }

  /**
   * Execute Redis command with connection management
   */
  async executeRedisCommand(command, ...args) {
    const startTime = Date.now();

    try {
      const result = await this.pools.redis[command](...args);
      return result;
    } catch (error) {
      this.metrics.redis.commandErrors++;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.emit('redis:command', { command, duration, error: null });
    }
  }

  /**
   * Get connection pool metrics
   */
  getMetrics() {
    const postgresMetrics = this.pools.postgres ? {
      ...this.metrics.postgres,
      waitingClients: this.pools.postgres.waitingCount,
      idleConnections: this.pools.postgres.idleCount,
      totalConnections: this.pools.postgres.totalCount
    } : null;

    const mongodbMetrics = this.pools.mongodb ? {
      ...this.metrics.mongodb,
      serverInfo: this.pools.mongodb.topology?.s?.description?.servers
    } : null;

    const redisMetrics = this.pools.redis ? {
      ...this.metrics.redis,
      memoryUsage: this.pools.redis.memoryUsage,
      info: this.pools.redis.info
    } : null;

    return {
      postgres: postgresMetrics,
      mongodb: mongodbMetrics,
      redis: redisMetrics,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Health check for all connection pools
   */
  async healthCheck() {
    const health = {
      postgres: { status: 'unknown', latency: null, error: null },
      mongodb: { status: 'unknown', latency: null, error: null },
      redis: { status: 'unknown', latency: null, error: null },
      timestamp: new Date().toISOString()
    };

    // Check PostgreSQL
    if (this.pools.postgres) {
      try {
        const startTime = Date.now();
        const client = await this.pools.postgres.connect();
        await client.query('SELECT 1');
        client.release();
        health.postgres.status = 'healthy';
        health.postgres.latency = Date.now() - startTime;
      } catch (error) {
        health.postgres.status = 'unhealthy';
        health.postgres.error = error.message;
      }
    }

    // Check MongoDB
    if (this.pools.mongodb) {
      try {
        const startTime = Date.now();
        await this.pools.mongodb.db().admin().ping();
        health.mongodb.status = 'healthy';
        health.mongodb.latency = Date.now() - startTime;
      } catch (error) {
        health.mongodb.status = 'unhealthy';
        health.mongodb.error = error.message;
      }
    }

    // Check Redis
    if (this.pools.redis) {
      try {
        const startTime = Date.now();
        await this.pools.redis.ping();
        health.redis.status = 'healthy';
        health.redis.latency = Date.now() - startTime;
      } catch (error) {
        health.redis.status = 'unhealthy';
        health.redis.error = error.message;
      }
    }

    return health;
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async() => {
      try {
        const health = await this.healthCheck();

        // Check for unhealthy connections
        Object.entries(health).forEach(([db, status]) => {
          if (db !== 'timestamp' && status.status === 'unhealthy') {
            this.emit('health:unhealthy', { database: db, error: status.error });
          }
        });

        this.emit('health:check', health);
      } catch (error) {
        logger.error('❌ Health check failed:', error);
        this.emit('health:error', { error });
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Close all connection pools
   */
  async close() {
    try {
      logger.info('🔄 Closing database connection pools...');

      // Stop health monitoring
      this.stopHealthMonitoring();

      // Close PostgreSQL pool
      if (this.pools.postgres) {
        await this.pools.postgres.end();
        this.pools.postgres = null;
        logger.info('✅ PostgreSQL pool closed');
      }

      // Close MongoDB connection
      if (this.pools.mongodb) {
        await this.pools.mongodb.close();
        this.pools.mongodb = null;
        logger.info('✅ MongoDB connection closed');
      }

      // Close Redis connection
      if (this.pools.redis) {
        await this.pools.redis.quit();
        this.pools.redis = null;
        logger.info('✅ Redis connection closed');
      }

      this.isInitialized = false;
      logger.info('✅ All database connection pools closed');

    } catch (error) {
      logger.error('❌ Error closing connection pools:', error);
      throw error;
    }
  }

  /**
   * Get pool configuration
   */
  getConfiguration() {
    return {
      postgres: {
        host: this.config.postgres.host,
        port: this.config.postgres.port,
        database: this.config.postgres.database,
        maxConnections: this.config.postgres.max,
        minConnections: this.config.postgres.min,
        idleTimeout: this.config.postgres.idleTimeoutMillis,
        connectionTimeout: this.config.postgres.connectionTimeoutMillis
      },
      mongodb: {
        uri: this.config.mongodb.uri.replace(/\/\/.*@/, '//***:***@'), // Hide credentials
        maxPoolSize: this.config.mongodb.options.maxPoolSize,
        minPoolSize: this.config.mongodb.options.minPoolSize,
        maxIdleTime: this.config.mongodb.options.maxIdleTimeMS,
        serverSelectionTimeout: this.config.mongodb.options.serverSelectionTimeoutMS
      },
      redis: {
        url: this.config.redis.url.replace(/\/\/.*@/, '//***:***@'), // Hide credentials
        connectTimeout: this.config.redis.options.connectTimeout,
        commandTimeout: this.config.redis.options.commandTimeout,
        maxRetries: this.config.redis.options.maxRetriesPerRequest
      }
    };
  }

  /**
   * Update pool configuration (for dynamic tuning)
   */
  updateConfiguration(database, newConfig) {
    if (!this.isInitialized) {
      throw new Error('Connection pools not initialized');
    }

    switch (database) {
    case 'postgres':
      // Note: PostgreSQL pool configuration cannot be changed after creation
      logger.warn('⚠️ PostgreSQL pool configuration cannot be changed after initialization');
      break;

    case 'mongodb':
      // Note: MongoDB client configuration cannot be changed after creation
      logger.warn('⚠️ MongoDB client configuration cannot be changed after initialization');
      break;

    case 'redis':
      // Note: Redis client configuration cannot be changed after creation
      logger.warn('⚠️ Redis client configuration cannot be changed after initialization');
      break;

    default:
      throw new Error(`Unknown database: ${database}`);
    }
  }
}

module.exports = new ConnectionPoolManager();
