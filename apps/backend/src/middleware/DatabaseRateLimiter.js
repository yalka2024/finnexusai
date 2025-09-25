/**
 * Database Rate Limiter
 * Prevents DoS attacks by limiting database operations per user/IP
 */

const rateLimit = require('express-rate-limit');
const Redis = require('redis');
const { CustomError } = require('../errors/ErrorHandler');

class DatabaseRateLimiter {
  constructor() {
    this.redis = null;
    this.config = {
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      defaultWindowMs: parseInt(process.env.DB_RATE_LIMIT_WINDOW) || 60000, // 1 minute
      defaultMax: parseInt(process.env.DB_RATE_LIMIT_MAX) || 100, // 100 operations per minute
      skipSuccessfulRequests: process.env.DB_RATE_LIMIT_SKIP_SUCCESS === 'true',
      skipFailedRequests: process.env.DB_RATE_LIMIT_SKIP_FAILED === 'false',
      keyGenerator: this.generateKey,
      onLimitReached: this.onLimitReached,
      standardHeaders: true,
      legacyHeaders: false
    };

    this.rateLimiters = new Map();
    this.operationLimits = {
      // Read operations (less restrictive)
      'SELECT': { windowMs: 60000, max: 500 },
      'SHOW': { windowMs: 60000, max: 100 },
      'EXPLAIN': { windowMs: 60000, max: 50 },

      // Write operations (more restrictive)
      'INSERT': { windowMs: 60000, max: 100 },
      'UPDATE': { windowMs: 60000, max: 100 },
      'DELETE': { windowMs: 60000, max: 50 },

      // Administrative operations (very restrictive)
      'CREATE': { windowMs: 60000, max: 10 },
      'DROP': { windowMs: 60000, max: 5 },
      'ALTER': { windowMs: 60000, max: 10 },
      'TRUNCATE': { windowMs: 60000, max: 5 },

      // MongoDB operations
      'FIND': { windowMs: 60000, max: 500 },
      'AGGREGATE': { windowMs: 60000, max: 100 },
      'COUNT': { windowMs: 60000, max: 200 },
      'INSERTONE': { windowMs: 60000, max: 100 },
      'UPDATEMANY': { windowMs: 60000, max: 50 },
      'DELETEMANY': { windowMs: 60000, max: 50 },

      // Redis operations
      'GET': { windowMs: 60000, max: 1000 },
      'SET': { windowMs: 60000, max: 500 },
      'DEL': { windowMs: 60000, max: 200 },
      'EXISTS': { windowMs: 60000, max: 1000 }
    };
  }

  /**
   * Initialize the database rate limiter
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing database rate limiter...');

      // Initialize Redis client for rate limiting
      this.redis = Redis.createClient({
        url: this.config.redisUrl,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      });

      this.redis.on('error', (error) => {
        logger.error('❌ Redis rate limiter error:', error);
      });

      await this.redis.connect();

      // Create rate limiters for different operations
      await this.createRateLimiters();

      logger.info('✅ Database rate limiter initialized successfully');

      return {
        success: true,
        message: 'Database rate limiter initialized successfully',
        operationLimits: Object.keys(this.operationLimits).length
      };

    } catch (error) {
      logger.error('❌ Failed to initialize database rate limiter:', error);
      throw new Error(`Database rate limiter initialization failed: ${error.message}`);
    }
  }

  /**
   * Create rate limiters for different database operations
   */
  async createRateLimiters() {
    for (const [operation, limits] of Object.entries(this.operationLimits)) {
      const rateLimiter = rateLimit({
        windowMs: limits.windowMs,
        max: limits.max,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => this.generateKey(req, operation),
        handler: (req, res) => this.onLimitReached(req, res, operation),
        skip: (req) => this.shouldSkipRequest(req),
        store: new RedisStore({
          sendCommand: (...args) => this.redis.sendCommand(args)
        })
      });

      this.rateLimiters.set(operation, rateLimiter);
    }
  }

  /**
   * Generate rate limit key
   */
  generateKey(req, operation = 'default') {
    const userId = req.user?.userId || 'anonymous';
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'unknown';

    // Create a hash of the user agent for better key distribution
    const userAgentHash = this.hashString(userAgent).substring(0, 8);

    return `db_rate_limit:${operation}:${userId}:${ip}:${userAgentHash}`;
  }

  /**
   * Hash string for consistent key generation
   */
  hashString(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Handle rate limit exceeded
   */
  onLimitReached(req, res, operation) {
    const userId = req.user?.userId || 'anonymous';
    const ip = req.ip || req.connection.remoteAddress;

    // Log the rate limit violation
    logger.warn(`⚠️ Database rate limit exceeded for ${operation}:`, {
      userId,
      ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      operation
    });

    // Emit rate limit event for monitoring
    this.emit('rateLimitExceeded', {
      operation,
      userId,
      ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    res.status(429).json({
      success: false,
      error: 'Database rate limit exceeded',
      message: `Too many ${operation} operations. Please try again later.`,
      retryAfter: this.getRetryAfter(req),
      operation
    });
  }

  /**
   * Get retry after time
   */
  getRetryAfter(req) {
    // This would typically come from the rate limiter store
    // For now, return a default value
    return 60; // seconds
  }

  /**
   * Check if request should be skipped
   */
  shouldSkipRequest(req) {
    // Skip rate limiting for health checks
    if (req.path === '/health' || req.path === '/api/v1/health') {
      return true;
    }

    // Skip rate limiting for admin users (if configured)
    if (req.user?.role === 'admin' && process.env.SKIP_RATE_LIMIT_FOR_ADMINS === 'true') {
      return true;
    }

    // Skip rate limiting for internal services
    if (req.get('X-Internal-Service') === 'true') {
      return true;
    }

    return false;
  }

  /**
   * Get rate limiter for specific operation
   */
  getRateLimiter(operation) {
    return this.rateLimiters.get(operation.toUpperCase()) || this.rateLimiters.get('SELECT');
  }

  /**
   * Middleware for database operation rate limiting
   */
  rateLimitMiddleware(operation) {
    const rateLimiter = this.getRateLimiter(operation);

    return (req, res, next) => {
      // Add operation to request for logging
      req.dbOperation = operation;

      rateLimiter(req, res, (err) => {
        if (err) {
          logger.error('❌ Rate limiter error:', err);
          return next(new CustomError('Rate limiter error', 500, 'RATE_LIMITER_ERROR'));
        }
        next();
      });
    };
  }

  /**
   * Check rate limit for specific operation without middleware
   */
  async checkRateLimit(operation, key) {
    try {
      const limits = this.operationLimits[operation.toUpperCase()];
      if (!limits) {
        return { allowed: true, remaining: Infinity };
      }

      const current = await this.redis.incr(key);

      if (current === 1) {
        await this.redis.expire(key, Math.ceil(limits.windowMs / 1000));
      }

      const remaining = Math.max(0, limits.max - current);
      const allowed = current <= limits.max;

      return { allowed, remaining, limit: limits.max, resetTime: Date.now() + limits.windowMs };
    } catch (error) {
      logger.error('❌ Rate limit check error:', error);
      // Allow request if rate limiting fails
      return { allowed: true, remaining: Infinity };
    }
  }

  /**
   * Reset rate limit for specific key
   */
  async resetRateLimit(key) {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error('❌ Rate limit reset error:', error);
      return false;
    }
  }

  /**
   * Get rate limit status for user
   */
  async getRateLimitStatus(userId, ip, operation = 'SELECT') {
    const key = `db_rate_limit:${operation}:${userId}:${ip}:unknown`;
    const limits = this.operationLimits[operation.toUpperCase()];

    if (!limits) {
      return null;
    }

    try {
      const current = await this.redis.get(key);
      const count = current ? parseInt(current) : 0;

      return {
        operation,
        current: count,
        limit: limits.max,
        remaining: Math.max(0, limits.max - count),
        resetTime: Date.now() + limits.windowMs,
        windowMs: limits.windowMs
      };
    } catch (error) {
      logger.error('❌ Rate limit status error:', error);
      return null;
    }
  }

  /**
   * Update rate limit configuration
   */
  updateOperationLimit(operation, newLimits) {
    const upperOperation = operation.toUpperCase();

    if (!this.operationLimits[upperOperation]) {
      throw new Error(`Unknown operation: ${operation}`);
    }

    this.operationLimits[upperOperation] = {
      ...this.operationLimits[upperOperation],
      ...newLimits
    };

    logger.info(`✅ Updated rate limit for ${upperOperation}:`, this.operationLimits[upperOperation]);
  }

  /**
   * Add new operation rate limit
   */
  addOperationLimit(operation, limits) {
    const upperOperation = operation.toUpperCase();

    if (this.operationLimits[upperOperation]) {
      throw new Error(`Rate limit for ${operation} already exists`);
    }

    this.operationLimits[upperOperation] = limits;
    logger.info(`✅ Added rate limit for ${upperOperation}:`, limits);
  }

  /**
   * Remove operation rate limit
   */
  removeOperationLimit(operation) {
    const upperOperation = operation.toUpperCase();

    if (!this.operationLimits[upperOperation]) {
      throw new Error(`Rate limit for ${operation} does not exist`);
    }

    delete this.operationLimits[upperOperation];
    logger.info(`✅ Removed rate limit for ${upperOperation}`);
  }

  /**
   * Get all rate limit configurations
   */
  getRateLimitConfigurations() {
    return {
      defaultConfig: this.config,
      operationLimits: this.operationLimits,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get rate limiting statistics
   */
  async getStatistics() {
    try {
      const stats = {
        totalOperations: Object.keys(this.operationLimits).length,
        activeRateLimiters: this.rateLimiters.size,
        redisConnected: this.redis?.isOpen || false,
        timestamp: new Date().toISOString()
      };

      // Get Redis memory usage
      if (this.redis?.isOpen) {
        try {
          const info = await this.redis.info('memory');
          const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
          if (memoryMatch) {
            stats.redisMemoryUsage = memoryMatch[1];
          }
        } catch (error) {
          logger.warn('⚠️ Could not get Redis memory info:', error.message);
        }
      }

      return stats;
    } catch (error) {
      logger.error('❌ Error getting rate limiting statistics:', error);
      return null;
    }
  }

  /**
   * Cleanup expired rate limit keys
   */
  async cleanupExpiredKeys() {
    try {
      const pattern = 'db_rate_limit:*';
      const keys = await this.redis.keys(pattern);

      let cleanedCount = 0;
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) { // No expiration set
          await this.redis.del(key);
          cleanedCount++;
        }
      }

      logger.info(`🧹 Cleaned up ${cleanedCount} expired rate limit keys`);
      return cleanedCount;
    } catch (error) {
      logger.error('❌ Error cleaning up rate limit keys:', error);
      return 0;
    }
  }

  /**
   * Shutdown rate limiter
   */
  async shutdown() {
    try {
      if (this.redis) {
        await this.redis.quit();
        this.redis = null;
      }

      this.rateLimiters.clear();
      logger.info('✅ Database rate limiter shutdown completed');
    } catch (error) {
      logger.error('❌ Error shutting down rate limiter:', error);
    }
  }
}

// Redis store for express-rate-limit
class RedisStore {
  constructor(options) {
    this.sendCommand = options.sendCommand;
  }

  async increment(key, cb) {
    try {
      const current = await this.sendCommand('INCR', key);

      if (current === 1) {
        await this.sendCommand('EXPIRE', key, 60); // 1 minute default
      }

      const result = {
        totalHits: current,
        resetTime: new Date(Date.now() + 60000) // 1 minute from now
      };

      cb(null, result);
    } catch (error) {
      cb(error);
    }
  }

  async decrement(key) {
    try {
      await this.sendCommand('DECR', key);
    } catch (error) {
      logger.error('❌ Redis store decrement error:', error);
    }
  }

  async resetKey(key) {
    try {
      await this.sendCommand('DEL', key);
    } catch (error) {
      logger.error('❌ Redis store reset error:', error);
    }
  }
}

module.exports = new DatabaseRateLimiter();
