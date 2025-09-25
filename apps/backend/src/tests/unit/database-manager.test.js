/**
 * FinAI Nexus - Database Manager Unit Tests
 *
 * Comprehensive unit tests for database operations
 * Target: 95%+ code coverage
 */

const { jest, describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock dependencies
jest.mock('pg');
jest.mock('mongodb');
jest.mock('redis');

const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const Redis = require('redis');

describe('DatabaseManager', () => {
  let databaseManager;
  let mockPostgresPool;
  let mockMongoClient;
  let mockRedisClient;

  beforeEach(() => {
    // Mock PostgreSQL
    mockPostgresPool = {
      connect: jest.fn(),
      end: jest.fn(),
      query: jest.fn()
    };
    Pool.mockImplementation(() => mockPostgresPool);

    // Mock MongoDB
    mockMongoClient = {
      connect: jest.fn(),
      close: jest.fn(),
      db: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([])
          }),
          findOne: jest.fn().mockResolvedValue(null),
          insertOne: jest.fn().mockResolvedValue({ acknowledged: true, insertedId: 'test-id' }),
          insertMany: jest.fn().mockResolvedValue({ acknowledged: true, insertedIds: ['test-id'] }),
          updateOne: jest.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 }),
          updateMany: jest.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 2 }),
          deleteOne: jest.fn().mockResolvedValue({ acknowledged: true, deletedCount: 1 }),
          deleteMany: jest.fn().mockResolvedValue({ acknowledged: true, deletedCount: 2 })
        }),
        admin: jest.fn().mockReturnValue({
          ping: jest.fn().mockResolvedValue({ ok: 1 })
        })
      })
    };
    MongoClient.mockImplementation(() => mockMongoClient);

    // Mock Redis
    mockRedisClient = {
      on: jest.fn(),
      connect: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      setEx: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      ping: jest.fn().mockResolvedValue('PONG'),
      quit: jest.fn().mockResolvedValue('OK')
    };
    Redis.createClient.mockReturnValue(mockRedisClient);

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize all database connections successfully', async() => {
      // Mock successful connections
      mockPostgresPool.connect.mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
        release: jest.fn()
      });

      mockMongoClient.connect.mockResolvedValue();
      mockRedisClient.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 0);
        }
      });

      // Import and initialize
      const DatabaseManager = require('../../config/database');
      await DatabaseManager.initialize();

      expect(mockPostgresPool.connect).toHaveBeenCalled();
      expect(mockMongoClient.connect).toHaveBeenCalled();
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it('should handle PostgreSQL connection failure', async() => {
      mockPostgresPool.connect.mockRejectedValue(new Error('Connection failed'));

      const DatabaseManager = require('../../config/database');

      await expect(DatabaseManager.initialize()).rejects.toThrow('Connection failed');
    });

    it('should handle MongoDB connection failure gracefully', async() => {
      mockPostgresPool.connect.mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
        release: jest.fn()
      });

      mockMongoClient.connect.mockRejectedValue(new Error('MongoDB connection failed'));
      mockRedisClient.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 0);
        }
      });

      const DatabaseManager = require('../../config/database');
      await DatabaseManager.initialize();

      // Should not throw error, but log warning
      expect(mockPostgresPool.connect).toHaveBeenCalled();
      expect(mockMongoClient.connect).toHaveBeenCalled();
    });

    it('should handle Redis connection failure gracefully', async() => {
      mockPostgresPool.connect.mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
        release: jest.fn()
      });

      mockMongoClient.connect.mockResolvedValue();
      mockRedisClient.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Redis connection failed')), 0);
        }
      });

      const DatabaseManager = require('../../config/database');
      await DatabaseManager.initialize();

      // Should not throw error, but log warning
      expect(mockPostgresPool.connect).toHaveBeenCalled();
      expect(mockMongoClient.connect).toHaveBeenCalled();
    });
  });

  describe('PostgreSQL Operations', () => {
    beforeEach(async() => {
      mockPostgresPool.connect.mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
        release: jest.fn()
      });

      mockMongoClient.connect.mockResolvedValue();
      mockRedisClient.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 0);
        }
      });

      const DatabaseManager = require('../../config/database');
      await DatabaseManager.initialize();
    });

    it('should execute PostgreSQL query successfully', async() => {
      const mockResult = { rows: [{ id: 1, name: 'Test' }] };
      const mockClient = {
        query: jest.fn().mockResolvedValue(mockResult),
        release: jest.fn()
      };
      mockPostgresPool.connect.mockResolvedValue(mockClient);

      const DatabaseManager = require('../../config/database');
      const result = await DatabaseManager.queryPostgres('SELECT * FROM users WHERE id = $1', [1]);

      expect(result).toEqual(mockResult);
      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle PostgreSQL query error', async() => {
      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('Query failed')),
        release: jest.fn()
      };
      mockPostgresPool.connect.mockResolvedValue(mockClient);

      const DatabaseManager = require('../../config/database');

      await expect(DatabaseManager.queryPostgres('SELECT * FROM users', [])).rejects.toThrow('Query failed');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when PostgreSQL not initialized', async() => {
      // Create new instance without initialization
      const DatabaseManager = require('../../config/database');
      const newInstance = new DatabaseManager();

      await expect(newInstance.queryPostgres('SELECT * FROM users', [])).rejects.toThrow('PostgreSQL not initialized');
    });
  });

  describe('MongoDB Operations', () => {
    beforeEach(async() => {
      mockPostgresPool.connect.mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
        release: jest.fn()
      });

      mockMongoClient.connect.mockResolvedValue();
      mockRedisClient.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 0);
        }
      });

      const DatabaseManager = require('../../config/database');
      await DatabaseManager.initialize();
    });

    it('should execute MongoDB find operation successfully', async() => {
      const mockResult = [{ id: 1, name: 'Test' }];
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockResult)
        })
      };
      mockMongoClient.db().collection.mockReturnValue(mockCollection);

      const DatabaseManager = require('../../config/database');
      const result = await DatabaseManager.queryMongo('users', 'find', { name: 'Test' });

      expect(mockCollection.find).toHaveBeenCalledWith({ name: 'Test' });
      expect(result.toArray).toBeDefined();
    });

    it('should execute MongoDB insertOne operation successfully', async() => {
      const mockResult = { acknowledged: true, insertedId: 'test-id' };
      const mockCollection = {
        insertOne: jest.fn().mockResolvedValue(mockResult)
      };
      mockMongoClient.db().collection.mockReturnValue(mockCollection);

      const DatabaseManager = require('../../config/database');
      const result = await DatabaseManager.queryMongo('users', 'insertOne', { name: 'Test' });

      expect(result).toEqual(mockResult);
      expect(mockCollection.insertOne).toHaveBeenCalledWith({ name: 'Test' });
    });

    it('should handle MongoDB operation error', async() => {
      const mockCollection = {
        find: jest.fn().mockRejectedValue(new Error('MongoDB operation failed'))
      };
      mockMongoClient.db().collection.mockReturnValue(mockCollection);

      const DatabaseManager = require('../../config/database');
      const result = await DatabaseManager.queryMongo('users', 'find', {});

      // Should return fallback response
      expect(result).toBeDefined();
    });

    it('should handle MongoDB fallback when not available', async() => {
      // Create new instance without MongoDB
      const DatabaseManager = require('../../config/database');
      const newInstance = new DatabaseManager();
      newInstance.mongoClient = null;
      newInstance.mongoDatabase = null;

      const result = await newInstance.queryMongo('users', 'find', {});

      // Should return fallback response
      expect(result).toBeDefined();
    });
  });

  describe('Redis Operations', () => {
    beforeEach(async() => {
      mockPostgresPool.connect.mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
        release: jest.fn()
      });

      mockMongoClient.connect.mockResolvedValue();
      mockRedisClient.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 0);
        }
      });

      const DatabaseManager = require('../../config/database');
      await DatabaseManager.initialize();
    });

    it('should set cache value successfully', async() => {
      const DatabaseManager = require('../../config/database');
      await DatabaseManager.cacheSet('test-key', { data: 'test-value' }, 3600);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', 3600, JSON.stringify({ data: 'test-value' }));
    });

    it('should set cache value without TTL', async() => {
      const DatabaseManager = require('../../config/database');
      await DatabaseManager.cacheSet('test-key', { data: 'test-value' });

      expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', JSON.stringify({ data: 'test-value' }));
    });

    it('should get cache value successfully', async() => {
      const mockValue = JSON.stringify({ data: 'test-value' });
      mockRedisClient.get.mockResolvedValue(mockValue);

      const DatabaseManager = require('../../config/database');
      const result = await DatabaseManager.cacheGet('test-key');

      expect(result).toEqual({ data: 'test-value' });
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null for non-existent cache key', async() => {
      mockRedisClient.get.mockResolvedValue(null);

      const DatabaseManager = require('../../config/database');
      const result = await DatabaseManager.cacheGet('non-existent-key');

      expect(result).toBeNull();
    });

    it('should delete cache value successfully', async() => {
      const DatabaseManager = require('../../config/database');
      await DatabaseManager.cacheDelete('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });

    it('should throw error when Redis not initialized', async() => {
      const DatabaseManager = require('../../config/database');
      const newInstance = new DatabaseManager();

      await expect(newInstance.cacheSet('key', 'value')).rejects.toThrow('Redis not initialized');
    });
  });

  describe('Health Check', () => {
    beforeEach(async() => {
      mockPostgresPool.connect.mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
        release: jest.fn()
      });

      mockMongoClient.connect.mockResolvedValue();
      mockRedisClient.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 0);
        }
      });

      const DatabaseManager = require('../../config/database');
      await DatabaseManager.initialize();
    });

    it('should return healthy status for all databases', async() => {
      mockPostgresPool.connect.mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
        release: jest.fn()
      });

      mockMongoClient.db().admin().ping.mockResolvedValue({ ok: 1 });
      mockRedisClient.ping.mockResolvedValue('PONG');

      const DatabaseManager = require('../../config/database');
      const health = await DatabaseManager.healthCheck();

      expect(health).toEqual({
        postgres: true,
        mongodb: true,
        redis: true,
        overall: true
      });
    });

    it('should return unhealthy status for failed databases', async() => {
      mockPostgresPool.connect.mockResolvedValue({
        query: jest.fn().mockRejectedValue(new Error('PostgreSQL failed')),
        release: jest.fn()
      });

      mockMongoClient.db().admin().ping.mockRejectedValue(new Error('MongoDB failed'));
      mockRedisClient.ping.mockRejectedValue(new Error('Redis failed'));

      const DatabaseManager = require('../../config/database');
      const health = await DatabaseManager.healthCheck();

      expect(health).toEqual({
        postgres: false,
        mongodb: false,
        redis: false,
        overall: false
      });
    });
  });

  describe('Connection Cleanup', () => {
    beforeEach(async() => {
      mockPostgresPool.connect.mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
        release: jest.fn()
      });

      mockMongoClient.connect.mockResolvedValue();
      mockRedisClient.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(callback, 0);
        }
      });

      const DatabaseManager = require('../../config/database');
      await DatabaseManager.initialize();
    });

    it('should close all database connections successfully', async() => {
      mockPostgresPool.end.mockResolvedValue();
      mockMongoClient.close.mockResolvedValue();
      mockRedisClient.quit.mockResolvedValue('OK');

      const DatabaseManager = require('../../config/database');
      await DatabaseManager.close();

      expect(mockPostgresPool.end).toHaveBeenCalled();
      expect(mockMongoClient.close).toHaveBeenCalled();
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });

    it('should handle connection cleanup errors', async() => {
      mockPostgresPool.end.mockRejectedValue(new Error('PostgreSQL close failed'));
      mockMongoClient.close.mockRejectedValue(new Error('MongoDB close failed'));
      mockRedisClient.quit.mockRejectedValue(new Error('Redis close failed'));

      const DatabaseManager = require('../../config/database');

      await expect(DatabaseManager.close()).rejects.toThrow();
    });
  });

  describe('MongoDB Fallback Handling', () => {
    it('should handle fallback for find operations', async() => {
      const DatabaseManager = require('../../config/database');
      const newInstance = new DatabaseManager();
      newInstance.mongoClient = null;
      newInstance.mongoDatabase = null;

      const result = await newInstance.queryMongo('users', 'find', {});
      const arrayResult = await result.toArray();

      expect(arrayResult).toEqual([]);
    });

    it('should handle fallback for findOne operations', async() => {
      const DatabaseManager = require('../../config/database');
      const newInstance = new DatabaseManager();
      newInstance.mongoClient = null;
      newInstance.mongoDatabase = null;

      const result = await newInstance.queryMongo('users', 'findOne', {});

      expect(result).toBeNull();
    });

    it('should handle fallback for insert operations', async() => {
      const DatabaseManager = require('../../config/database');
      const newInstance = new DatabaseManager();
      newInstance.mongoClient = null;
      newInstance.mongoDatabase = null;

      const result = await newInstance.queryMongo('users', 'insertOne', { name: 'Test' });

      expect(result).toEqual({ acknowledged: false, insertedId: null });
    });

    it('should handle fallback for update operations', async() => {
      const DatabaseManager = require('../../config/database');
      const newInstance = new DatabaseManager();
      newInstance.mongoClient = null;
      newInstance.mongoDatabase = null;

      const result = await newInstance.queryMongo('users', 'updateOne', {}, { name: 'Updated' });

      expect(result).toEqual({ acknowledged: false, modifiedCount: 0 });
    });

    it('should handle fallback for delete operations', async() => {
      const DatabaseManager = require('../../config/database');
      const newInstance = new DatabaseManager();
      newInstance.mongoClient = null;
      newInstance.mongoDatabase = null;

      const result = await newInstance.queryMongo('users', 'deleteOne', { id: 1 });

      expect(result).toEqual({ acknowledged: false, deletedCount: 0 });
    });
  });
});


