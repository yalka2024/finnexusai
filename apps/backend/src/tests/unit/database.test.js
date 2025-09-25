/**
 * Database Manager Unit Tests
 *
 * Tests for database connection and query functionality
 */

// const DatabaseManager = require('../../config/database');

// Mock dependencies
jest.mock('pg');
jest.mock('mongodb');
jest.mock('redis');

describe('DatabaseManager', () => {
  let databaseManager;

  beforeEach(() => {
    // Reset the singleton instance for testing
    jest.clearAllMocks();
    databaseManager = require('../../config/database');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Database Initialization', () => {
    test('should initialize PostgreSQL connection successfully', async() => {
      const mockPool = {
        connect: jest.fn().mockResolvedValue({
          query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
          release: jest.fn()
        })
      };

      const { Pool } = require('pg');
      Pool.mockReturnValue(mockPool);

      await databaseManager.initializePostgreSQL();

      expect(Pool).toHaveBeenCalledWith(expect.objectContaining({
        host: expect.any(String),
        port: expect.any(Number),
        database: expect.any(String),
        user: expect.any(String),
        password: expect.any(String)
      }));

      expect(mockPool.connect).toHaveBeenCalled();
    });

    test('should handle MongoDB connection failure gracefully', async() => {
      const { MongoClient } = require('mongodb');
      const mockClient = {
        connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
        db: jest.fn(),
        close: jest.fn()
      };

      MongoClient.mockReturnValue(mockClient);

      // Should not throw error, but handle gracefully
      await expect(databaseManager.initializeMongoDB()).resolves.toBeUndefined();

      expect(databaseManager.mongoClient).toBeNull();
      expect(databaseManager.mongoDatabase).toBeNull();
    });

    test('should initialize Redis with proper configuration', async() => {
      const mockRedisClient = {
        on: jest.fn((event, callback) => {
          if (event === 'connect') {
            setTimeout(callback, 10); // Simulate async connection
          }
        }),
        connect: jest.fn()
      };

      const Redis = require('redis');
      Redis.createClient = jest.fn().mockReturnValue(mockRedisClient);

      await databaseManager.initializeRedis();

      expect(Redis.createClient).toHaveBeenCalledWith(expect.objectContaining({
        host: expect.any(String),
        port: expect.any(Number)
      }));
    });
  });

  describe('Database Operations', () => {
    test('should execute PostgreSQL queries successfully', async() => {
      const mockResult = { rows: [{ id: 1, name: 'test' }] };
      const mockClient = {
        query: jest.fn().mockResolvedValue(mockResult),
        release: jest.fn()
      };
      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient)
      };

      databaseManager.postgresPool = mockPool;

      const result = await databaseManager.queryPostgres('SELECT * FROM users', []);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM users', []);
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    test('should handle MongoDB queries with fallback', async() => {
      // Test with MongoDB not available
      databaseManager.mongoDatabase = null;

      const result = await databaseManager.queryMongo('users', 'find', {});

      expect(result).toEqual({ toArray: expect.any(Function) });

      const arrayResult = await result.toArray();
      expect(arrayResult).toEqual([]);
    });

    test('should handle Redis caching operations', async() => {
      const mockRedisClient = {
        setEx: jest.fn().mockResolvedValue('OK'),
        set: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue('{"test":"data"}'),
        del: jest.fn().mockResolvedValue(1)
      };

      databaseManager.redisClient = mockRedisClient;

      // Test cache set with TTL
      await databaseManager.cacheSet('test-key', { test: 'data' }, 3600);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', 3600, '{"test":"data"}');

      // Test cache get
      const result = await databaseManager.cacheGet('test-key');
      expect(result).toEqual({ test: 'data' });

      // Test cache delete
      await databaseManager.cacheDelete('test-key');
      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('Health Checks', () => {
    test('should perform comprehensive health check', async() => {
      // Mock successful connections
      databaseManager.postgresPool = {
        connect: jest.fn().mockResolvedValue({
          query: jest.fn().mockResolvedValue({ rows: [{ result: 1 }] }),
          release: jest.fn()
        })
      };

      databaseManager.mongoClient = {
        db: jest.fn().mockReturnValue({
          admin: jest.fn().mockReturnValue({
            ping: jest.fn().mockResolvedValue({ ok: 1 })
          })
        })
      };

      databaseManager.redisClient = {
        ping: jest.fn().mockResolvedValue('PONG')
      };

      const health = await databaseManager.healthCheck();

      expect(health).toEqual({
        postgres: true,
        mongodb: true,
        redis: true,
        overall: true
      });
    });

    test('should handle partial health check failures', async() => {
      // Mock PostgreSQL success, MongoDB failure, Redis success
      databaseManager.postgresPool = {
        connect: jest.fn().mockResolvedValue({
          query: jest.fn().mockResolvedValue({ rows: [{ result: 1 }] }),
          release: jest.fn()
        })
      };

      databaseManager.mongoClient = {
        db: jest.fn().mockReturnValue({
          admin: jest.fn().mockReturnValue({
            ping: jest.fn().mockRejectedValue(new Error('MongoDB unavailable'))
          })
        })
      };

      databaseManager.redisClient = {
        ping: jest.fn().mockResolvedValue('PONG')
      };

      const health = await databaseManager.healthCheck();

      expect(health).toEqual({
        postgres: true,
        mongodb: false,
        redis: true,
        overall: false // Overall false because MongoDB failed
      });
    });
  });

  describe('Connection Cleanup', () => {
    test('should close all database connections properly', async() => {
      const mockPostgresPool = {
        end: jest.fn().mockResolvedValue()
      };

      const mockMongoClient = {
        close: jest.fn().mockResolvedValue()
      };

      const mockRedisClient = {
        quit: jest.fn().mockResolvedValue()
      };

      databaseManager.postgresPool = mockPostgresPool;
      databaseManager.mongoClient = mockMongoClient;
      databaseManager.redisClient = mockRedisClient;

      await databaseManager.close();

      expect(mockPostgresPool.end).toHaveBeenCalled();
      expect(mockMongoClient.close).toHaveBeenCalled();
      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(databaseManager.isConnected).toBe(false);
    });
  });
});
