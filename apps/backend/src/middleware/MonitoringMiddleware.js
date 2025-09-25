/**
 * Monitoring Middleware
 * Integrates Prometheus metrics collection with Express application
 */

const metrics = require('../monitoring/PrometheusMetrics');
const databaseManager = require('../config/database');

class MonitoringMiddleware {
  constructor() {
    this.setupMetrics();
  }

  /**
   * Setup metrics collection
   */
  setupMetrics() {
    // Setup health check metrics
    metrics.setupHealthChecks();

    // Start system metrics collection
    this.startSystemMetricsCollection();

    // Setup database metrics collection
    this.setupDatabaseMetrics();
  }

  /**
   * HTTP request monitoring middleware
   */
  httpMonitoring() {
    return (req, res, next) => {
      const startTime = Date.now();

      // Add correlation ID for tracing
      req.correlationId = req.correlationId || this.generateCorrelationId();
      res.setHeader('X-Correlation-ID', req.correlationId);

      // Override res.end to capture response metrics
      const originalEnd = res.end;
      res.end = function(chunk, encoding) {
        const duration = Date.now() - startTime;

        // Record HTTP metrics
        metrics.recordHttpRequest(req, res, duration);

        // Call original end
        originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }

  /**
   * API monitoring middleware
   */
  apiMonitoring() {
    return (req, res, next) => {
      const startTime = Date.now();

      // Override res.json to capture API metrics
      const originalJson = res.json;
      res.json = function(obj) {
        const duration = Date.now() - startTime;

        // Record API metrics
        const endpoint = req.route?.path || req.path;
        const version = req.path.split('/')[2] || 'v1'; // Extract API version

        metrics.recordApiRequest(
          endpoint,
          req.method,
          version,
          res.statusCode,
          duration
        );

        // Call original json
        return originalJson.call(this, obj);
      };

      next();
    };
  }

  /**
   * Database monitoring middleware
   */
  databaseMonitoring() {
    return (req, res, next) => {
      // Override database query methods
      this.instrumentDatabaseQueries();
      next();
    };
  }

  /**
   * Security monitoring middleware
   */
  securityMonitoring() {
    return (req, res, next) => {
      // Monitor for security events
      req.on('error', (error) => {
        if (this.isSecurityEvent(error)) {
          metrics.recordSecurityEvent(
            'request_error',
            'medium',
            'middleware'
          );
        }
      });

      // Monitor request patterns
      this.monitorRequestPatterns(req);

      next();
    };
  }

  /**
   * Health check monitoring
   */
  healthCheckMonitoring() {
    return async(req, res, next) => {
      if (req.path.includes('/health') || req.path.includes('/status')) {
        const startTime = Date.now();

        try {
          await next();

          const duration = Date.now() - startTime;
          metrics.recordHealthCheck(
            'api',
            'http_endpoint',
            res.statusCode < 400,
            duration
          );
        } catch (error) {
          const duration = Date.now() - startTime;
          metrics.recordHealthCheck(
            'api',
            'http_endpoint',
            false,
            duration
          );
          throw error;
        }
      } else {
        next();
      }
    };
  }

  /**
   * Start system metrics collection
   */
  startSystemMetricsCollection() {
    // Update system metrics every 30 seconds
    setInterval(() => {
      metrics.updateSystemMetrics();
    }, 30000);

    // Monitor event loop lag
    this.monitorEventLoopLag();

    // Monitor garbage collection
    this.monitorGarbageCollection();
  }

  /**
   * Monitor event loop lag
   */
  monitorEventLoopLag() {
    const start = process.hrtime.bigint();

    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
      metrics.eventLoopLag.observe(lag / 1000); // Convert to seconds
    });

    setTimeout(() => this.monitorEventLoopLag(), 1000);
  }

  /**
   * Monitor garbage collection
   */
  monitorGarbageCollection() {
    if (typeof process.gc === 'function') {
      const gc = require('gc-stats')();

      gc.on('stats', (stats) => {
        metrics.gcDuration.observe(
          { type: stats.gctype },
          stats.pause / 1000000 // Convert nanoseconds to seconds
        );
      });
    }
  }

  /**
   * Setup database metrics collection
   */
  setupDatabaseMetrics() {
    // Override database connection methods
    this.instrumentDatabaseConnections();

    // Monitor connection pool
    setInterval(() => {
      this.updateDatabaseConnectionMetrics();
    }, 30000);
  }

  /**
   * Instrument database connections
   */
  instrumentDatabaseConnections() {
    const postgres = databaseManager.getPostgresPool();
    const redis = databaseManager.getRedisClient();

    // Monitor PostgreSQL connections
    if (postgres) {
      const originalQuery = postgres.query;
      postgres.query = function(text, values, callback) {
        const startTime = Date.now();

        const wrappedCallback = function(err, result) {
          const duration = Date.now() - startTime;

          // Extract query type and table from SQL
          const queryInfo = MonitoringMiddleware.extractQueryInfo(text);

          metrics.recordDatabaseQuery(
            'postgresql',
            queryInfo.type,
            queryInfo.table,
            duration,
            err ? 'error' : 'success'
          );

          if (callback) callback(err, result);
        };

        return originalQuery.call(this, text, values, wrappedCallback);
      };
    }

    // Monitor Redis connections
    if (redis) {
      const originalCommand = redis.sendCommand;
      redis.sendCommand = function(command, args, callback) {
        const startTime = Date.now();

        const wrappedCallback = function(err, result) {
          const duration = Date.now() - startTime;

          metrics.recordDatabaseQuery(
            'redis',
            command.name || command,
            'cache',
            duration,
            err ? 'error' : 'success'
          );

          if (callback) callback(err, result);
        };

        return originalCommand.call(this, command, args, wrappedCallback);
      };
    }
  }

  /**
   * Extract query information from SQL
   */
  static extractQueryInfo(sql) {
    const normalizedSql = sql.toLowerCase().trim();

    let type = 'unknown';
    let table = 'unknown';

    // Extract query type
    if (normalizedSql.startsWith('select')) type = 'select';
    else if (normalizedSql.startsWith('insert')) type = 'insert';
    else if (normalizedSql.startsWith('update')) type = 'update';
    else if (normalizedSql.startsWith('delete')) type = 'delete';
    else if (normalizedSql.startsWith('create')) type = 'create';
    else if (normalizedSql.startsWith('drop')) type = 'drop';
    else if (normalizedSql.startsWith('alter')) type = 'alter';

    // Extract table name (simplified regex)
    const tableMatch = normalizedSql.match(/(?:from|into|update|table)\s+(\w+)/);
    if (tableMatch) {
      table = tableMatch[1];
    }

    return { type, table };
  }

  /**
   * Update database connection metrics
   */
  updateDatabaseConnectionMetrics() {
    const postgres = databaseManager.getPostgresPool();
    const redis = databaseManager.getRedisClient();

    // PostgreSQL connection metrics
    if (postgres) {
      metrics.databaseConnections.set(
        { database: 'postgresql', type: 'active' },
        postgres.totalCount - postgres.idleCount
      );

      metrics.databaseConnections.set(
        { database: 'postgresql', type: 'idle' },
        postgres.idleCount
      );

      metrics.databaseConnections.set(
        { database: 'postgresql', type: 'total' },
        postgres.totalCount
      );
    }

    // Redis connection metrics
    if (redis && redis.status === 'ready') {
      metrics.databaseConnections.set(
        { database: 'redis', type: 'active' },
        1
      );
    }
  }

  /**
   * Monitor request patterns for security
   */
  monitorRequestPatterns(req) {
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\.\./,  // Path traversal
      /<script/i,  // XSS attempts
      /union.*select/i,  // SQL injection
      /eval\s*\(/i,  // Code injection
      /base64/i  // Encoded payloads
    ];

    const url = req.url.toLowerCase();
    const userAgent = req.headers['user-agent'] || '';

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url) || pattern.test(userAgent)) {
        metrics.recordSecurityEvent(
          'suspicious_request',
          'high',
          'pattern_detection'
        );

        metrics.blockedRequests.inc({
          reason: 'suspicious_pattern',
          ip_address: req.ip
        });

        break;
      }
    }
  }

  /**
   * Check if error is a security event
   */
  isSecurityEvent(error) {
    const securityErrors = [
      'UNAUTHORIZED',
      'FORBIDDEN',
      'RATE_LIMIT_EXCEEDED',
      'INVALID_TOKEN',
      'SUSPICIOUS_ACTIVITY'
    ];

    return securityErrors.some(securityError =>
      error.message?.includes(securityError) || error.code?.includes(securityError)
    );
  }

  /**
   * Generate correlation ID
   */
  generateCorrelationId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get metrics endpoint handler
   */
  getMetricsHandler() {
    return async(req, res) => {
      try {
        const metricsData = await metrics.getMetrics();
        res.set('Content-Type', metrics.getRegistry().contentType);
        res.end(metricsData);
      } catch (error) {
        logger.error('Metrics collection error:', error);
        res.status(500).json({ error: 'Failed to collect metrics' });
      }
    };
  }

  /**
   * Get health check handler
   */
  getHealthCheckHandler() {
    return async(req, res) => {
      const startTime = Date.now();
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        services: {}
      };

      try {
        // Check database connections
        const dbHealth = await this.checkDatabaseHealth();
        health.services.database = dbHealth;

        // Check Redis connection
        const redisHealth = await this.checkRedisHealth();
        health.services.redis = redisHealth;

        // Check memory usage
        const memUsage = process.memoryUsage();
        health.services.memory = {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024)
        };

        // Check CPU usage
        health.services.cpu = {
          load: process.cpuUsage()
        };

        // Determine overall health
        const allServicesHealthy = Object.values(health.services).every(
          service => service.overall !== false
        );

        if (!allServicesHealthy) {
          health.status = 'degraded';
          res.status(503);
        }

        const duration = Date.now() - startTime;
        metrics.recordHealthCheck('api', 'comprehensive', allServicesHealthy, duration);

        res.json(health);
      } catch (error) {
        health.status = 'unhealthy';
        health.error = error.message;

        const duration = Date.now() - startTime;
        metrics.recordHealthCheck('api', 'comprehensive', false, duration);

        res.status(503).json(health);
      }
    };
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    try {
      const postgres = databaseManager.getPostgresPool();
      const startTime = Date.now();

      await postgres.query('SELECT 1');

      return {
        overall: true,
        postgresql: {
          status: 'connected',
          responseTime: Date.now() - startTime,
          connections: {
            active: postgres.totalCount - postgres.idleCount,
            idle: postgres.idleCount,
            total: postgres.totalCount
          }
        }
      };
    } catch (error) {
      return {
        overall: false,
        postgresql: {
          status: 'disconnected',
          error: error.message
        }
      };
    }
  }

  /**
   * Check Redis health
   */
  async checkRedisHealth() {
    try {
      const redis = databaseManager.getRedisClient();
      const startTime = Date.now();

      await redis.ping();

      return {
        overall: true,
        redis: {
          status: 'connected',
          responseTime: Date.now() - startTime
        }
      };
    } catch (error) {
      return {
        overall: false,
        redis: {
          status: 'disconnected',
          error: error.message
        }
      };
    }
  }

  /**
   * Get all monitoring middlewares
   */
  getAllMiddlewares() {
    return [
      this.httpMonitoring(),
      this.apiMonitoring(),
      this.databaseMonitoring(),
      this.securityMonitoring(),
      this.healthCheckMonitoring()
    ];
  }
}

module.exports = new MonitoringMiddleware();
