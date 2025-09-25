/**
 * FinAI Nexus - Cache Service
 *
 * Advanced caching system featuring:
 * - Redis-based distributed caching
 * - Multi-tier caching strategy
 * - Cache invalidation and warming
 * - Performance monitoring and analytics
 * - Smart cache optimization
 */

const Redis = require('redis');
const databaseManager = require('../../config/database');
const logger = require('../../utils/logger');

class CacheService {
  constructor() {
    this.db = databaseManager;
    this.redisClient = null;
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
    this.cacheConfig = {
      defaultTTL: 3600, // 1 hour
      maxTTL: 86400, // 24 hours
      minTTL: 60, // 1 minute
      maxMemory: '512mb',
      evictionPolicy: 'allkeys-lru'
    };
    this.cachePrefixes = {
      user: 'user:',
      portfolio: 'portfolio:',
      market: 'market:',
      ai: 'ai:',
      analytics: 'analytics:',
      session: 'session:',
      rateLimit: 'ratelimit:'
    };
  }

  /**
   * Initialize cache service
   */
  async initialize() {
    try {
      await this.connectRedis();
      await this.setupCacheConfiguration();
      await this.startCacheMonitoring();
      logger.info('Cache service initialized');
    } catch (error) {
      logger.error('Error initializing cache service:', error);
    }
  }

  /**
   * Connect to Redis
   */
  async connectRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.redisClient = Redis.createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.info('Redis max retry attempts reached, using fallback mode');
              return false; // Stop retrying
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.redisClient.on('error', (error) => {
        logger.error('Redis client error:', error);
        this.cacheStats.errors++;
      });

      this.redisClient.on('connect', () => {
        logger.info('Connected to Redis');
      });

      await this.redisClient.connect();
      logger.info('Connected to Redis successfully');
    } catch (error) {
      logger.error('Error connecting to Redis, using fallback mode:', error);
      this.redisClient = null; // Use fallback mode
      logger.info('Cache service running in fallback mode (no Redis)');
    }
  }

  /**
   * Get data from cache
   */
  async get(key, options = {}) {
    try {
      const {
        prefix = '',
        deserialize = true,
        checkExpiry = true
      } = options;

      // Fallback mode - return null if Redis is not available
      if (!this.redisClient) {
        this.cacheStats.misses++;
        return null;
      }

      const cacheKey = this.buildCacheKey(key, prefix);
      const cachedData = await this.redisClient.get(cacheKey);

      if (cachedData) {
        this.cacheStats.hits++;

        if (deserialize) {
          try {
            return JSON.parse(cachedData);
          } catch (error) {
            logger.error('Error deserializing cached data:', error);
            return cachedData;
          }
        }

        return cachedData;
      } else {
        this.cacheStats.misses++;
        return null;
      }
    } catch (error) {
      logger.error('Error getting from cache:', error);
      this.cacheStats.errors++;
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set(key, value, options = {}) {
    try {
      const {
        prefix = '',
        ttl = this.cacheConfig.defaultTTL,
        serialize = true,
        condition = null
      } = options;

      // Fallback mode - return false if Redis is not available
      if (!this.redisClient) {
        this.cacheStats.errors++;
        return false;
      }

      const cacheKey = this.buildCacheKey(key, prefix);

      // Validate TTL
      const validTTL = Math.min(Math.max(ttl, this.cacheConfig.minTTL), this.cacheConfig.maxTTL);

      // Serialize data if needed
      const dataToStore = serialize ? JSON.stringify(value) : value;

      // Set with condition if specified
      if (condition === 'nx') {
        // Only set if key doesn't exist
        const result = await this.redisClient.setNX(cacheKey, dataToStore);
        if (result) {
          await this.redisClient.expire(cacheKey, validTTL);
          this.cacheStats.sets++;
          return true;
        }
        return false;
      } else if (condition === 'xx') {
        // Only set if key exists
        const result = await this.redisClient.setXX(cacheKey, dataToStore);
        if (result) {
          await this.redisClient.expire(cacheKey, validTTL);
          this.cacheStats.sets++;
          return true;
        }
        return false;
      } else {
        // Normal set operation
        await this.redisClient.setEx(cacheKey, validTTL, dataToStore);
        this.cacheStats.sets++;
        return true;
      }
    } catch (error) {
      logger.error('Error setting cache:', error);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Delete data from cache
   */
  async delete(key, options = {}) {
    try {
      const { prefix = '' } = options;
      const cacheKey = this.buildCacheKey(key, prefix);

      const result = await this.redisClient.del(cacheKey);
      this.cacheStats.deletes++;

      return result > 0;
    } catch (error) {
      logger.error('Error deleting from cache:', error);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet(key, fetchFunction, options = {}) {
    try {
      const {
        prefix = '',
        ttl = this.cacheConfig.defaultTTL,
        fallback = true
      } = options;

      // Try to get from cache first
      const cachedData = await this.get(key, { prefix });

      if (cachedData !== null) {
        return cachedData;
      }

      // If not in cache, fetch from source
      try {
        const freshData = await fetchFunction();

        if (freshData !== null && freshData !== undefined) {
          // Store in cache
          await this.set(key, freshData, { prefix, ttl });
          return freshData;
        } else if (fallback) {
          // Return fallback value if fetch fails
          return null;
        } else {
          throw new Error('Failed to fetch data and fallback disabled');
        }
      } catch (fetchError) {
        logger.error('Error fetching data for cache:', fetchError);

        if (fallback) {
          return null;
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      logger.error('Error in getOrSet:', error);
      this.cacheStats.errors++;
      return null;
    }
  }

  /**
   * Cache user data
   */
  async cacheUserData(userId, userData, ttl = 1800) {
    try {
      const key = `${this.cachePrefixes.user}${userId}`;
      await this.set(key, userData, { ttl });

      // Also cache user session data
      if (userData.session) {
        await this.cacheSessionData(userId, userData.session);
      }

      return true;
    } catch (error) {
      logger.error('Error caching user data:', error);
      return false;
    }
  }

  /**
   * Get cached user data
   */
  async getCachedUserData(userId) {
    try {
      const key = `${this.cachePrefixes.user}${userId}`;
      return await this.get(key);
    } catch (error) {
      logger.error('Error getting cached user data:', error);
      return null;
    }
  }

  /**
   * Cache portfolio data
   */
  async cachePortfolioData(userId, portfolioData, ttl = 600) {
    try {
      const key = `${this.cachePrefixes.portfolio}${userId}`;
      await this.set(key, portfolioData, { ttl });
      return true;
    } catch (error) {
      logger.error('Error caching portfolio data:', error);
      return false;
    }
  }

  /**
   * Get cached portfolio data
   */
  async getCachedPortfolioData(userId) {
    try {
      const key = `${this.cachePrefixes.portfolio}${userId}`;
      return await this.get(key);
    } catch (error) {
      logger.error('Error getting cached portfolio data:', error);
      return null;
    }
  }

  /**
   * Cache market data
   */
  async cacheMarketData(symbol, marketData, ttl = 300) {
    try {
      const key = `${this.cachePrefixes.market}${symbol}`;
      await this.set(key, marketData, { ttl });
      return true;
    } catch (error) {
      logger.error('Error caching market data:', error);
      return false;
    }
  }

  /**
   * Get cached market data
   */
  async getCachedMarketData(symbol) {
    try {
      const key = `${this.cachePrefixes.market}${symbol}`;
      return await this.get(key);
    } catch (error) {
      logger.error('Error getting cached market data:', error);
      return null;
    }
  }

  /**
   * Cache AI analysis results
   */
  async cacheAIAnalysis(analysisId, analysisData, ttl = 3600) {
    try {
      const key = `${this.cachePrefixes.ai}${analysisId}`;
      await this.set(key, analysisData, { ttl });
      return true;
    } catch (error) {
      logger.error('Error caching AI analysis:', error);
      return false;
    }
  }

  /**
   * Get cached AI analysis
   */
  async getCachedAIAnalysis(analysisId) {
    try {
      const key = `${this.cachePrefixes.ai}${analysisId}`;
      return await this.get(key);
    } catch (error) {
      logger.error('Error getting cached AI analysis:', error);
      return null;
    }
  }

  /**
   * Cache session data
   */
  async cacheSessionData(userId, sessionData, ttl = 7200) {
    try {
      const key = `${this.cachePrefixes.session}${userId}`;
      await this.set(key, sessionData, { ttl });
      return true;
    } catch (error) {
      logger.error('Error caching session data:', error);
      return false;
    }
  }

  /**
   * Get cached session data
   */
  async getCachedSessionData(userId) {
    try {
      const key = `${this.cachePrefixes.session}${userId}`;
      return await this.get(key);
    } catch (error) {
      logger.error('Error getting cached session data:', error);
      return null;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern, options = {}) {
    try {
      const { prefix = '' } = options;
      const searchPattern = this.buildCacheKey(pattern, prefix);

      const keys = await this.redisClient.keys(searchPattern);

      if (keys.length > 0) {
        const result = await this.redisClient.del(keys);
        this.cacheStats.deletes += result;
        return result;
      }

      return 0;
    } catch (error) {
      logger.error('Error invalidating cache pattern:', error);
      this.cacheStats.errors++;
      return 0;
    }
  }

  /**
   * Warm up cache
   */
  async warmupCache(options = {}) {
    try {
      const {
        userIds = [],
        symbols = [],
        forceRefresh = false
      } = options;

      const warmupResults = {
        users: 0,
        markets: 0,
        portfolios: 0,
        errors: 0
      };

      // Warm up user data
      for (const userId of userIds) {
        try {
          const userData = await this.db.queryMongo('users', 'findOne', { _id: userId });
          if (userData) {
            await this.cacheUserData(userId, userData);
            warmupResults.users++;
          }
        } catch (error) {
          logger.error(`Error warming up user ${userId}:`, error);
          warmupResults.errors++;
        }
      }

      // Warm up market data
      for (const symbol of symbols) {
        try {
          // This would fetch from market data API
          const marketData = { symbol, price: Math.random() * 1000, timestamp: new Date() };
          await this.cacheMarketData(symbol, marketData);
          warmupResults.markets++;
        } catch (error) {
          logger.error(`Error warming up market data for ${symbol}:`, error);
          warmupResults.errors++;
        }
      }

      // Warm up portfolio data
      for (const userId of userIds) {
        try {
          const portfolioData = await this.db.queryMongo('portfolios', 'findOne', { userId: userId });
          if (portfolioData) {
            await this.cachePortfolioData(userId, portfolioData);
            warmupResults.portfolios++;
          }
        } catch (error) {
          logger.error(`Error warming up portfolio for user ${userId}:`, error);
          warmupResults.errors++;
        }
      }

      return warmupResults;
    } catch (error) {
      logger.error('Error warming up cache:', error);
      throw new Error('Failed to warm up cache');
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const redisInfo = await this.redisClient.info('memory');
      const dbSize = await this.redisClient.dbSize();

      const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0
        ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) * 100
        : 0;

      return {
        stats: this.cacheStats,
        hitRate: hitRate.toFixed(2),
        dbSize: dbSize,
        memoryInfo: redisInfo,
        config: this.cacheConfig,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return {
        stats: this.cacheStats,
        hitRate: 0,
        dbSize: 0,
        error: error.message
      };
    }
  }

  /**
   * Clear all cache
   */
  async clearAllCache() {
    try {
      await this.redisClient.flushAll();
      this.cacheStats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0
      };
      return true;
    } catch (error) {
      logger.error('Error clearing cache:', error);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Setup cache configuration
   */
  async setupCacheConfiguration() {
    try {
      // Set Redis configuration
      await this.redisClient.configSet('maxmemory', this.cacheConfig.maxMemory);
      await this.redisClient.configSet('maxmemory-policy', this.cacheConfig.evictionPolicy);

      logger.info('Cache configuration set successfully');
    } catch (error) {
      logger.error('Error setting up cache configuration:', error);
    }
  }

  /**
   * Start cache monitoring
   */
  async startCacheMonitoring() {
    try {
      // Monitor cache performance every 5 minutes
      setInterval(async() => {
        try {
          const stats = await this.getCacheStats();
          logger.info(`Cache Stats - Hit Rate: ${stats.hitRate}%, DB Size: ${stats.dbSize}`);

          // Store stats in database for analysis
          await this.storeCacheStats(stats);
        } catch (error) {
          logger.error('Error in cache monitoring:', error);
        }
      }, 5 * 60 * 1000); // 5 minutes
    } catch (error) {
      logger.error('Error starting cache monitoring:', error);
    }
  }

  /**
   * Build cache key
   */
  buildCacheKey(key, prefix) {
    return prefix ? `${prefix}${key}` : key;
  }

  /**
   * Store cache statistics
   */
  async storeCacheStats(stats) {
    try {
      await this.db.queryMongo(
        'cache_stats',
        'insertOne',
        {
          ...stats,
          timestamp: new Date()
        }
      );
    } catch (error) {
      logger.error('Error storing cache stats:', error);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const pingResult = await this.redisClient.ping();
      const stats = await this.getCacheStats();

      return {
        status: pingResult === 'PONG' ? 'healthy' : 'unhealthy',
        redis: pingResult === 'PONG' ? 'connected' : 'disconnected',
        stats: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        redis: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = CacheService;
