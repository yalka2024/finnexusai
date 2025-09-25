/**
 * FinAI Nexus - Jest Setup
 *
 * Global test setup and configuration
 */

const { jest } = require('@jest/globals');
const logger = require('../../utils/logger');

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.DB_URI = 'mongodb://localhost:27017/finnexusai-test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.VAULT_ADDR = 'http://localhost:8200';
process.env.VAULT_TOKEN = 'test-vault-token';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Keep error and warn for debugging
  error: jest.fn(),
  warn: jest.fn(),
  // Mock info and log to reduce noise
  info: jest.fn(),
  log: jest.fn(),
  debug: jest.fn()
};

// Mock external dependencies
jest.mock('axios');
jest.mock('redis');
jest.mock('mongodb');
jest.mock('pg');

// Mock Vault service
jest.mock('../../services/security/VaultService', () => ({
  VaultService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(true),
    getSecret: jest.fn().mockResolvedValue({ data: { test: 'value' } }),
    storeSecret: jest.fn().mockResolvedValue(true),
    getStatus: jest.fn().mockResolvedValue({ initialized: true })
  })),
  VaultManager: jest.fn().mockImplementation(() => ({
    getVaultService: jest.fn().mockReturnValue({
      initialize: jest.fn().mockResolvedValue(true),
      getSecret: jest.fn().mockResolvedValue({ data: { test: 'value' } }),
      storeSecret: jest.fn().mockResolvedValue(true),
      getStatus: jest.fn().mockResolvedValue({ initialized: true })
    }),
    initializeAll: jest.fn().mockResolvedValue({}),
    getAllStatus: jest.fn().mockResolvedValue({})
  })),
  vaultManager: {
    getVaultService: jest.fn().mockReturnValue({
      initialize: jest.fn().mockResolvedValue(true),
      getSecret: jest.fn().mockResolvedValue({ data: { test: 'value' } }),
      storeSecret: jest.fn().mockResolvedValue(true),
      getStatus: jest.fn().mockResolvedValue({ initialized: true })
    }),
    initializeAll: jest.fn().mockResolvedValue({}),
    getAllStatus: jest.fn().mockResolvedValue({})
  }
}));

// Mock database manager
jest.mock('../../config/database', () => ({
  initialize: jest.fn().mockResolvedValue(true),
  healthCheck: jest.fn().mockResolvedValue({
    postgres: true,
    mongodb: true,
    redis: true,
    overall: true
  }),
  queryPostgres: jest.fn().mockResolvedValue({ rows: [] }),
  queryMongo: jest.fn().mockResolvedValue([]),
  cacheSet: jest.fn().mockResolvedValue(true),
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheDelete: jest.fn().mockResolvedValue(true),
  close: jest.fn().mockResolvedValue(true)
}));

// Mock health check service
jest.mock('../../services/health/HealthCheckService', () => ({
  HealthCheckService: jest.fn().mockImplementation(() => ({
    registerCheck: jest.fn(),
    runAllChecks: jest.fn().mockResolvedValue({
      status: 'healthy',
      checks: {},
      duration: 100,
      timestamp: Date.now(),
      uptime: 3600000
    }),
    getQuickHealth: jest.fn().mockResolvedValue({
      status: 'healthy',
      checks: {},
      timestamp: Date.now(),
      uptime: 3600000
    }),
    getHealthReport: jest.fn().mockResolvedValue({
      status: 'healthy',
      checks: {},
      system: {},
      circuitBreakers: {},
      environment: {}
    })
  })),
  healthCheckService: {
    registerCheck: jest.fn(),
    runAllChecks: jest.fn().mockResolvedValue({
      status: 'healthy',
      checks: {},
      duration: 100,
      timestamp: Date.now(),
      uptime: 3600000
    }),
    getQuickHealth: jest.fn().mockResolvedValue({
      status: 'healthy',
      checks: {},
      timestamp: Date.now(),
      uptime: 3600000
    }),
    getHealthReport: jest.fn().mockResolvedValue({
      status: 'healthy',
      checks: {},
      system: {},
      circuitBreakers: {},
      environment: {}
    })
  }
}));

// Mock circuit breaker service
jest.mock('../../services/resilience/CircuitBreakerService', () => ({
  CircuitBreakerService: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({ success: true }),
    getHealth: jest.fn().mockReturnValue({
      state: 'CLOSED',
      successRate: 100,
      failureRate: 0,
      isHealthy: true
    }),
    getStats: jest.fn().mockReturnValue({
      totalRequests: 100,
      successfulRequests: 100,
      failedRequests: 0
    })
  })),
  CircuitBreakerManager: jest.fn().mockImplementation(() => ({
    getBreaker: jest.fn().mockReturnValue({
      execute: jest.fn().mockResolvedValue({ success: true }),
      getHealth: jest.fn().mockReturnValue({
        state: 'CLOSED',
        successRate: 100,
        failureRate: 0,
        isHealthy: true
      }),
      getStats: jest.fn().mockReturnValue({
        totalRequests: 100,
        successfulRequests: 100,
        failedRequests: 0
      })
    }),
    getAllHealth: jest.fn().mockResolvedValue({}),
    getAllStats: jest.fn().mockResolvedValue({})
  })),
  circuitBreakerManager: {
    getBreaker: jest.fn().mockReturnValue({
      execute: jest.fn().mockResolvedValue({ success: true }),
      getHealth: jest.fn().mockReturnValue({
        state: 'CLOSED',
        successRate: 100,
        failureRate: 0,
        isHealthy: true
      }),
      getStats: jest.fn().mockReturnValue({
        totalRequests: 100,
        successfulRequests: 100,
        failedRequests: 0
      })
    }),
    getAllHealth: jest.fn().mockResolvedValue({}),
    getAllStats: jest.fn().mockResolvedValue({})
  }
}));

// Global test utilities
global.testUtils = {
  // Mock user data
  mockUser: {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // Mock portfolio data
  mockPortfolio: {
    id: 'test-portfolio-id',
    userId: 'test-user-id',
    name: 'Test Portfolio',
    totalValue: 10000,
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // Mock transaction data
  mockTransaction: {
    id: 'test-transaction-id',
    userId: 'test-user-id',
    portfolioId: 'test-portfolio-id',
    type: 'buy',
    asset: 'AAPL',
    quantity: 10,
    price: 150.00,
    total: 1500.00,
    timestamp: new Date()
  },

  // Mock AI interaction data
  mockAIInteraction: {
    id: 'test-ai-interaction-id',
    userId: 'test-user-id',
    type: 'chat',
    message: 'Test message',
    response: 'Test response',
    timestamp: new Date()
  },

  // Mock JWT token
  mockJWT: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE2MzQ1Njc2MDAsImV4cCI6MTYzNDU3MTIwMH0.test-signature',

  // Mock request object
  mockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: global.testUtils.mockUser,
    ...overrides
  }),

  // Mock response object
  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  },

  // Mock next function
  mockNext: jest.fn(),

  // Wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate random data
  generateRandomId: () => Math.random().toString(36).substr(2, 9),
  generateRandomEmail: () => `test-${Math.random().toString(36).substr(2, 5)}@example.com`,
  generateRandomString: (length = 10) => Math.random().toString(36).substr(2, length)
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

logger.info('✅ Jest setup completed successfully');


