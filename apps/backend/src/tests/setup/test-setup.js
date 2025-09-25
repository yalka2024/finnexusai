/**
 * Test Setup and Configuration
 * Comprehensive testing framework setup for FinNexusAI backend
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const { Pool } = require('pg');
const Redis = require('redis');

// Test configuration
const testConfig = {
  database: {
    postgres: {
      host: process.env.TEST_POSTGRES_HOST || 'localhost',
      port: process.env.TEST_POSTGRES_PORT || 5433,
      database: process.env.TEST_POSTGRES_DB || 'finnexusai_test',
      user: process.env.TEST_POSTGRES_USER || 'test_user',
      password: process.env.TEST_POSTGRES_PASSWORD || 'test_password'
    },
    mongodb: {
      uri: process.env.TEST_MONGODB_URI || 'mongodb://localhost:27018/finnexusai_test'
    },
    redis: {
      host: process.env.TEST_REDIS_HOST || 'localhost',
      port: process.env.TEST_REDIS_PORT || 6380,
      password: process.env.TEST_REDIS_PASSWORD || null
    }
  },
  jwt: {
    secret: 'test_jwt_secret_key_for_testing_only',
    expiresIn: '1h'
  },
  encryption: {
    key: 'test_encryption_key_32_bytes_long!'
  }
};

class TestEnvironment {
  constructor() {
    this.mongoServer = null;
    this.postgresPool = null;
    this.redisClient = null;
    this.isSetup = false;
  }

  /**
   * Setup test environment
   */
  async setup() {
    if (this.isSetup) return;

    logger.info('🔧 Setting up test environment...');

    try {
      // Setup MongoDB in-memory server
      await this.setupMongoDB();

      // Setup PostgreSQL test database
      await this.setupPostgreSQL();

      // Setup Redis test instance
      await this.setupRedis();

      // Set test environment variables
      this.setTestEnvironmentVariables();

      this.isSetup = true;
      logger.info('✅ Test environment setup completed');

    } catch (error) {
      logger.error('❌ Test environment setup failed:', error);
      throw error;
    }
  }

  /**
   * Setup MongoDB in-memory server
   */
  async setupMongoDB() {
    try {
      this.mongoServer = new MongoMemoryServer({
        instance: {
          port: 27018,
          dbName: 'finnexusai_test'
        }
      });

      await this.mongoServer.start();
      const uri = this.mongoServer.getUri();

      logger.info(`✅ MongoDB test server started: ${uri}`);

    } catch (error) {
      logger.error('❌ MongoDB test setup failed:', error);
      throw error;
    }
  }

  /**
   * Setup PostgreSQL test database
   */
  async setupPostgreSQL() {
    try {
      this.postgresPool = new Pool(testConfig.database.postgres);

      // Test connection
      const client = await this.postgresPool.connect();
      await client.query('SELECT NOW()');
      client.release();

      logger.info('✅ PostgreSQL test database connected');

    } catch (error) {
      logger.error('❌ PostgreSQL test setup failed:', error);
      throw error;
    }
  }

  /**
   * Setup Redis test instance
   */
  async setupRedis() {
    try {
      this.redisClient = Redis.createClient({
        host: testConfig.database.redis.host,
        port: testConfig.database.redis.port,
        password: testConfig.database.redis.password
      });

      await this.redisClient.connect();
      await this.redisClient.ping();

      logger.info('✅ Redis test instance connected');

    } catch (error) {
      logger.error('❌ Redis test setup failed:', error);
      throw error;
    }
  }

  /**
   * Set test environment variables
   */
  setTestEnvironmentVariables() {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = testConfig.jwt.secret;
    process.env.JWT_EXPIRES_IN = testConfig.jwt.expiresIn;
    process.env.POSTGRES_HOST = testConfig.database.postgres.host;
    process.env.POSTGRES_PORT = testConfig.database.postgres.port;
    process.env.POSTGRES_DB = testConfig.database.postgres.database;
    process.env.POSTGRES_USER = testConfig.database.postgres.user;
    process.env.POSTGRES_PASSWORD = testConfig.database.postgres.password;
    process.env.MONGODB_URI = this.mongoServer?.getUri() || testConfig.database.mongodb.uri;
    process.env.REDIS_HOST = testConfig.database.redis.host;
    process.env.REDIS_PORT = testConfig.database.redis.port;
    process.env.REDIS_PASSWORD = testConfig.database.redis.password;
  }

  /**
   * Cleanup test environment
   */
  async cleanup() {
    if (!this.isSetup) return;

    logger.info('🧹 Cleaning up test environment...');

    try {
      // Cleanup Redis
      if (this.redisClient) {
        await this.redisClient.flushAll();
        await this.redisClient.quit();
        logger.info('✅ Redis test cleanup completed');
      }

      // Cleanup PostgreSQL
      if (this.postgresPool) {
        await this.postgresPool.end();
        logger.info('✅ PostgreSQL test cleanup completed');
      }

      // Cleanup MongoDB
      if (this.mongoServer) {
        await this.mongoServer.stop();
        logger.info('✅ MongoDB test cleanup completed');
      }

      this.isSetup = false;
      logger.info('✅ Test environment cleanup completed');

    } catch (error) {
      logger.error('❌ Test environment cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Get test database connections
   */
  getTestConnections() {
    return {
      postgres: this.postgresPool,
      mongodb: this.mongoServer,
      redis: this.redisClient
    };
  }

  /**
   * Create test user data
   */
  async createTestUser(userData = {}) {
    const defaultUser = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1990-01-01',
      country: 'US',
      role: 'user',
      status: 'active'
    };

    const user = { ...defaultUser, ...userData };

    // Hash password
    const bcrypt = require('bcrypt');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(user.password, saltRounds);

    // Insert into test database
    const client = await this.postgresPool.connect();
    try {
      const result = await client.query(`
        INSERT INTO users (
          email, password_hash, salt, first_name, last_name, 
          date_of_birth, country, role, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, email, first_name, last_name, role, status, created_at
      `, [
        user.email, passwordHash, 'test_salt', user.firstName, user.lastName,
        user.dateOfBirth, user.country, user.role, user.status
      ]);

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Create test portfolio
   */
  async createTestPortfolio(userId, portfolioData = {}) {
    const defaultPortfolio = {
      name: 'Test Portfolio',
      description: 'Test portfolio description',
      riskTolerance: 'moderate',
      investmentGoal: 'growth'
    };

    const portfolio = { ...defaultPortfolio, ...portfolioData };

    const client = await this.postgresPool.connect();
    try {
      const result = await client.query(`
        INSERT INTO portfolios (
          user_id, name, description, risk_tolerance, investment_goal
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, description, risk_tolerance, investment_goal, created_at
      `, [
        userId, portfolio.name, portfolio.description,
        portfolio.riskTolerance, portfolio.investmentGoal
      ]);

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Create test trade
   */
  async createTestTrade(userId, tradeData = {}) {
    const defaultTrade = {
      symbol: 'BTC',
      tradeType: 'buy',
      orderType: 'market',
      quantity: 0.1,
      price: 50000,
      status: 'filled'
    };

    const trade = { ...defaultTrade, ...tradeData };

    const client = await this.postgresPool.connect();
    try {
      const result = await client.query(`
        INSERT INTO trading_orders (
          user_id, symbol, trade_type, order_type, quantity, price, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, symbol, trade_type, order_type, quantity, price, status, created_at
      `, [
        userId, trade.symbol, trade.tradeType, trade.orderType,
        trade.quantity, trade.price, trade.status
      ]);

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Generate JWT token for testing
   */
  generateTestToken(userData = {}) {
    const jwt = require('jsonwebtoken');

    const defaultPayload = {
      userId: 'test-user-id',
      email: 'test@example.com',
      role: 'user',
      permissions: ['read:own_portfolio', 'write:own_profile']
    };

    const payload = { ...defaultPayload, ...userData };

    return jwt.sign(payload, testConfig.jwt.secret, {
      expiresIn: testConfig.jwt.expiresIn
    });
  }

  /**
   * Wait for async operations
   */
  async waitFor(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Mock external API calls
   */
  mockExternalAPIs() {
    const axios = require('axios');
    const MockAdapter = require('axios-mock-adapter');
    const logger = require('../../utils/logger');

    this.mockAdapter = new MockAdapter(axios);

    // Mock market data API
    this.mockAdapter.onGet(/market-data/).reply(200, {
      symbol: 'BTC',
      price: 50000,
      volume: 1000000,
      change24h: 500,
      changePercent24h: 1.01
    });

    // Mock blockchain API
    this.mockAdapter.onPost(/blockchain/).reply(200, {
      success: true,
      txHash: '0x1234567890abcdef',
      blockNumber: 12345678
    });

    // Mock KYC API
    this.mockAdapter.onPost(/kyc/).reply(200, {
      success: true,
      verificationId: 'kyc-123',
      status: 'approved'
    });

    logger.info('✅ External APIs mocked for testing');
  }

  /**
   * Cleanup mocked APIs
   */
  cleanupMockedAPIs() {
    if (this.mockAdapter) {
      this.mockAdapter.restore();
      logger.info('✅ Mocked APIs cleaned up');
    }
  }
}

// Global test environment instance
let testEnvironment = null;

/**
 * Setup tests before all test suites
 */
async function setupTests() {
  if (!testEnvironment) {
    testEnvironment = new TestEnvironment();
    await testEnvironment.setup();
    testEnvironment.mockExternalAPIs();
  }
  return testEnvironment;
}

/**
 * Cleanup tests after all test suites
 */
async function cleanupTests() {
  if (testEnvironment) {
    testEnvironment.cleanupMockedAPIs();
    await testEnvironment.cleanup();
    testEnvironment = null;
  }
}

/**
 * Get current test environment
 */
function getTestEnvironment() {
  if (!testEnvironment) {
    throw new Error('Test environment not initialized. Call setupTests() first.');
  }
  return testEnvironment;
}

/**
 * Test utilities
 */
const testUtils = {
  /**
   * Create authenticated request headers
   */
  createAuthHeaders(token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Test-Request': 'true'
    };
  },

  /**
   * Create test request object
   */
  createTestRequest(data = {}) {
    return {
      body: {},
      query: {},
      params: {},
      headers: {},
      user: null,
      ip: '127.0.0.1',
      method: 'GET',
      path: '/test',
      correlationId: 'test-correlation-id',
      ...data
    };
  },

  /**
   * Create test response object
   */
  createTestResponse() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      get: jest.fn().mockReturnValue('test-content-length')
    };
    return res;
  },

  /**
   * Assert database record exists
   */
  async assertRecordExists(table, conditions) {
    const testEnv = getTestEnvironment();
    const client = await testEnv.postgresPool.connect();

    try {
      const whereClause = Object.keys(conditions)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(' AND ');

      const result = await client.query(
        `SELECT * FROM ${table} WHERE ${whereClause}`,
        Object.values(conditions)
      );

      expect(result.rows.length).toBeGreaterThan(0);
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  /**
   * Assert database record does not exist
   */
  async assertRecordNotExists(table, conditions) {
    const testEnv = getTestEnvironment();
    const client = await testEnv.postgresPool.connect();

    try {
      const whereClause = Object.keys(conditions)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(' AND ');

      const result = await client.query(
        `SELECT * FROM ${table} WHERE ${whereClause}`,
        Object.values(conditions)
      );

      expect(result.rows.length).toBe(0);
    } finally {
      client.release();
    }
  }
};

module.exports = {
  TestEnvironment,
  setupTests,
  cleanupTests,
  getTestEnvironment,
  testUtils,
  testConfig
};
