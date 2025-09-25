const { MongoMemoryServer } = require('mongodb-memory-server');

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/finnexusai_test';
  process.env.REDIS_URL = 'redis://localhost:6379/1';
  
  // Mock external services
  jest.mock('axios');
  jest.mock('web3');
  jest.mock('@aws-sdk/client-s3');
  jest.mock('@elastic/elasticsearch');
});

afterAll(async () => {
  // Cleanup after all tests
  jest.clearAllMocks();
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

