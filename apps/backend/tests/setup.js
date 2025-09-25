/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

const { TextEncoder, TextDecoder } = require('util');
const logger = require('../src/utils/logger');

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/finnexus_test';
process.env.MONGODB_URL = 'mongodb://localhost:27017/finnexus_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.API_BASE_URL = 'http://localhost:3001';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Mock external services
jest.mock('../src/services/external/EmailService');
jest.mock('../src/services/external/SMSService');
jest.mock('../src/services/external/PushNotificationService');
jest.mock('../src/services/external/PaymentService');

// Mock blockchain services
jest.mock('../src/services/blockchain/Web3Service');
jest.mock('../src/services/blockchain/EthereumService');
jest.mock('../src/services/blockchain/DeFiService');

// Mock monitoring services
jest.mock('../src/services/monitoring/LogAggregationService');
jest.mock('../src/services/monitoring/TracingService');
jest.mock('../src/services/monitoring/AlertService');

// Mock security services
jest.mock('../src/services/security/SSLManager');
jest.mock('../src/services/security/DatabaseEncryption');
jest.mock('../src/services/security/AuditService');

// Global test utilities
global.testUtils = {
  // Generate test user data
  generateTestUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    isEmailVerified: true,
    is2FAEnabled: false,
    role: 'user',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  // Generate test portfolio data
  generateTestPortfolio: (overrides = {}) => ({
    id: 'test-portfolio-id',
    userId: 'test-user-id',
    name: 'Test Portfolio',
    description: 'Test portfolio description',
    totalValue: 10000,
    totalReturn: 500,
    totalReturnPercentage: 5.0,
    riskLevel: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  // Generate test trading data
  generateTestTrade: (overrides = {}) => ({
    id: 'test-trade-id',
    userId: 'test-user-id',
    portfolioId: 'test-portfolio-id',
    symbol: 'BTC/USDT',
    side: 'buy',
    type: 'market',
    quantity: 0.1,
    price: 45000,
    value: 4500,
    status: 'completed',
    executedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  // Generate test market data
  generateTestMarketData: (overrides = {}) => ({
    symbol: 'BTC/USDT',
    price: 45000,
    change24h: 2.5,
    volume24h: 1000000,
    marketCap: 850000000000,
    timestamp: new Date(),
    ...overrides
  }),

  // Generate test API key
  generateTestApiKey: (overrides = {}) => ({
    id: 'test-api-key-id',
    userId: 'test-user-id',
    name: 'Test API Key',
    keyHash: 'test-key-hash',
    permissions: ['read', 'write'],
    isActive: true,
    lastUsedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  // Mock database responses
  mockDatabaseResponse: (data) => ({
    rows: Array.isArray(data) ? data : [data],
    rowCount: Array.isArray(data) ? data.length : 1,
    command: 'SELECT'
  }),

  // Mock error responses
  mockErrorResponse: (message, code = 500) => ({
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString()
  }),

  // Mock success responses
  mockSuccessResponse: (data, message = 'Success') => ({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }),

  // Wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate random test data
  randomString: (length = 10) => Math.random().toString(36).substring(2, length + 2),
  randomEmail: () => `${Math.random().toString(36).substring(2)}@example.com`,
  randomNumber: (min = 0, max = 100) => Math.floor(Math.random() * (max - min + 1)) + min,
  randomDate: (start = new Date(2020, 0, 1), end = new Date()) =>
    new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())),

  // Mock JWT token
  mockJwtToken: (payload = {}) => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify({
      sub: 'test-user-id',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...payload
    })).toString('base64url');
    const signature = 'mock-signature';
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  },

  // Mock request object
  mockRequest: (overrides = {}) => ({
    user: { id: 'test-user-id', role: 'user' },
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: '127.0.0.1',
    correlationId: 'test-correlation-id',
    ...overrides
  }),

  // Mock response object
  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    return res;
  },

  // Mock next function
  mockNext: () => jest.fn(),

  // Clean up database
  cleanupDatabase: async() => {
    // Mock database cleanup
    logger.info('🧹 Cleaning up test database...');
  },

  // Setup test database
  setupTestDatabase: async() => {
    // Mock database setup
    logger.info('🗄️ Setting up test database...');
  }
};

// Global test hooks
beforeAll(async() => {
  logger.info('🚀 Starting test suite...');
  await global.testUtils.setupTestDatabase();
});

afterAll(async() => {
  logger.info('🏁 Test suite completed');
  await global.testUtils.cleanupDatabase();
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Suppress console logs during tests unless in debug mode
if (process.env.NODE_ENV === 'test' && !process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}

// Export test utilities for use in test files
module.exports = {
  testUtils: global.testUtils
};
