const logger = require('../../utils/logger');
/**
 * Jest Test Setup
 *
 * Global test configuration and setup
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DB_URI = 'mongodb://localhost:27017/finnexusai_test';
process.env.REDIS_URL = 'redis://localhost:6379';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test utilities
global.testUtils = {
  generateMockUser: () => ({
    id: 'test-user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }),

  generateMockPortfolio: (userId = 'test-user-123') => ({
    userId: userId,
    assets: [
      { symbol: 'BTC', amount: 0.5, value: 22500 },
      { symbol: 'ETH', amount: 2.0, value: 6400 }
    ],
    totalValue: 28900,
    riskScore: 0.7,
    lastUpdated: new Date()
  }),

  generateMockTransaction: (userId = 'test-user-123') => ({
    id: 'test-tx-123',
    userId: userId,
    type: 'buy',
    symbol: 'BTC',
    amount: 0.1,
    price: 45000,
    total: 4500,
    timestamp: new Date(),
    status: 'completed'
  }),

  generateMockMarketData: () => ({
    BTC: { price: 45000, change: 2.5, volume: 1000000 },
    ETH: { price: 3200, change: -1.2, volume: 800000 },
    BNB: { price: 300, change: 0.8, volume: 500000 }
  }),

  generateMockAIResponse: () => ({
    analysis: 'Market shows bullish sentiment with strong technical indicators',
    confidence: 0.85,
    recommendations: ['Consider increasing BTC allocation', 'Monitor ETH resistance levels'],
    riskFactors: ['High volatility expected', 'Regulatory concerns'],
    timestamp: new Date()
  }),

  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  createMockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides
  }),

  createMockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    return res;
  }
};

// Cleanup after each test
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
  process.exit(1);
});
