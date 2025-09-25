/**
 * Prometheus Metrics Collection
 * Comprehensive monitoring and metrics for FinNexusAI backend
 */

const promClient = require('prom-client');
const databaseManager = require('../config/database');

// Enable default metrics collection
promClient.collectDefaultMetrics({
  timeout: 5000,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  eventLoopMonitoringPrecision: 10
});

class MetricsCollector {
  constructor() {
    this.registry = new promClient.Registry();
    this.registry.setDefaultLabels({ app: 'finnexusai-backend' });
    promClient.register.clear();
    promClient.register = this.registry;

    this.initializeMetrics();
    this.startCollectionInterval();
  }

  /**
   * Initialize all custom metrics
   */
  initializeMetrics() {
    // HTTP request metrics
    this.httpRequestsTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'user_agent_type'],
      registers: [this.registry]
    });

    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry]
    });

    this.httpRequestSize = new promClient.Histogram({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry]
    });

    this.httpResponseSize = new promClient.Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry]
    });

    // Authentication metrics
    this.authAttempts = new promClient.Counter({
      name: 'auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['result', 'method'],
      registers: [this.registry]
    });

    this.activeSessions = new promClient.Gauge({
      name: 'active_sessions_total',
      help: 'Total number of active user sessions',
      labelNames: ['user_role'],
      registers: [this.registry]
    });

    // Trading metrics
    this.tradesExecuted = new promClient.Counter({
      name: 'trades_executed_total',
      help: 'Total number of trades executed',
      labelNames: ['type', 'symbol', 'status'],
      registers: [this.registry]
    });

    this.tradeVolume = new promClient.Counter({
      name: 'trade_volume_usd_total',
      help: 'Total trade volume in USD',
      labelNames: ['symbol', 'type'],
      registers: [this.registry]
    });

    this.tradeLatency = new promClient.Histogram({
      name: 'trade_execution_latency_seconds',
      help: 'Trade execution latency in seconds',
      labelNames: ['symbol', 'type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry]
    });

    // Portfolio metrics
    this.portfolioValue = new promClient.Gauge({
      name: 'portfolio_value_usd',
      help: 'Portfolio value in USD',
      labelNames: ['user_id', 'portfolio_id'],
      registers: [this.registry]
    });

    this.portfolioCount = new promClient.Gauge({
      name: 'portfolios_total',
      help: 'Total number of portfolios',
      labelNames: ['status'],
      registers: [this.registry]
    });

    // Database metrics
    this.dbConnections = new promClient.Gauge({
      name: 'database_connections_total',
      help: 'Number of database connections',
      labelNames: ['database', 'state'],
      registers: [this.registry]
    });

    this.dbQueryDuration = new promClient.Histogram({
      name: 'database_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['database', 'operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry]
    });

    this.dbQueryErrors = new promClient.Counter({
      name: 'database_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['database', 'operation', 'error_type'],
      registers: [this.registry]
    });

    // Cache metrics
    this.cacheHits = new promClient.Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type', 'key_pattern'],
      registers: [this.registry]
    });

    this.cacheMisses = new promClient.Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type', 'key_pattern'],
      registers: [this.registry]
    });

    this.cacheSize = new promClient.Gauge({
      name: 'cache_size_bytes',
      help: 'Cache size in bytes',
      labelNames: ['cache_type'],
      registers: [this.registry]
    });

    // Business metrics
    this.activeUsers = new promClient.Gauge({
      name: 'active_users_total',
      help: 'Total number of active users',
      labelNames: ['user_type'],
      registers: [this.registry]
    });

    this.revenue = new promClient.Counter({
      name: 'revenue_usd_total',
      help: 'Total revenue in USD',
      labelNames: ['source'],
      registers: [this.registry]
    });

    this.kycCompletions = new promClient.Counter({
      name: 'kyc_completions_total',
      help: 'Total number of KYC completions',
      labelNames: ['status'],
      registers: [this.registry]
    });

    // Security metrics
    this.securityAlerts = new promClient.Counter({
      name: 'security_alerts_total',
      help: 'Total number of security alerts',
      labelNames: ['alert_type', 'severity'],
      registers: [this.registry]
    });

    this.failedLoginAttempts = new promClient.Counter({
      name: 'failed_login_attempts_total',
      help: 'Total number of failed login attempts',
      labelNames: ['ip_address', 'user_agent'],
      registers: [this.registry]
    });

    this.rateLimitHits = new promClient.Counter({
      name: 'rate_limit_hits_total',
      help: 'Total number of rate limit hits',
      labelNames: ['endpoint', 'ip_address'],
      registers: [this.registry]
    });

    // System health metrics
    this.systemHealth = new promClient.Gauge({
      name: 'system_health_status',
      help: 'System health status (1 = healthy, 0 = unhealthy)',
      labelNames: ['component'],
      registers: [this.registry]
    });

    this.errorRate = new promClient.Gauge({
      name: 'error_rate_percentage',
      help: 'Error rate percentage',
      labelNames: ['error_type'],
      registers: [this.registry]
    });

    // Market data metrics
    this.marketDataUpdates = new promClient.Counter({
      name: 'market_data_updates_total',
      help: 'Total number of market data updates',
      labelNames: ['symbol', 'source'],
      registers: [this.registry]
    });

    this.marketDataLatency = new promClient.Histogram({
      name: 'market_data_latency_seconds',
      help: 'Market data update latency in seconds',
      labelNames: ['symbol', 'source'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry]
    });
  }

  /**
   * Start periodic metrics collection
   */
  startCollectionInterval() {
    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
      this.collectDatabaseMetrics();
      this.collectBusinessMetrics();
    }, 30000);
  }

  /**
   * Collect system health metrics
   */
  async collectSystemMetrics() {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      this.systemHealth.set({ component: 'memory' }, memUsage.heapUsed < 1024 * 1024 * 1024 ? 1 : 0); // 1GB threshold

      // CPU usage
      const cpuUsage = process.cpuUsage();
      this.systemHealth.set({ component: 'cpu' }, cpuUsage.user < 1000000000 ? 1 : 0); // 1 second threshold

      // Database health
      try {
        await databaseManager.healthCheck();
        this.systemHealth.set({ component: 'database' }, 1);
      } catch (error) {
        this.systemHealth.set({ component: 'database' }, 0);
      }

    } catch (error) {
      logger.error('Failed to collect system metrics:', error);
    }
  }

  /**
   * Collect database metrics
   */
  async collectDatabaseMetrics() {
    try {
      // PostgreSQL connection metrics
      const pgPool = databaseManager.getPostgresPool();
      this.dbConnections.set({ database: 'postgresql', state: 'total' }, pgPool.totalCount);
      this.dbConnections.set({ database: 'postgresql', state: 'idle' }, pgPool.idleCount);
      this.dbConnections.set({ database: 'postgresql', state: 'waiting' }, pgPool.waitingCount);

      // MongoDB connection metrics (if available)
      const mongoClient = databaseManager.getMongoClient();
      if (mongoClient) {
        this.dbConnections.set({ database: 'mongodb', state: 'connected' }, 1);
      } else {
        this.dbConnections.set({ database: 'mongodb', state: 'connected' }, 0);
      }

      // Redis connection metrics (if available)
      const redisClient = databaseManager.getRedisClient();
      if (redisClient) {
        this.dbConnections.set({ database: 'redis', state: 'connected' }, 1);
      } else {
        this.dbConnections.set({ database: 'redis', state: 'connected' }, 0);
      }

    } catch (error) {
      logger.error('Failed to collect database metrics:', error);
    }
  }

  /**
   * Collect business metrics
   */
  async collectBusinessMetrics() {
    try {
      // Active users count
      const activeUsersResult = await databaseManager.queryPostgres(`
        SELECT role, COUNT(*) as count 
        FROM users 
        WHERE status = 'active' AND last_login_at >= NOW() - INTERVAL '24 hours'
        GROUP BY role
      `);

      activeUsersResult.rows.forEach(row => {
        this.activeUsers.set({ user_type: row.role }, parseInt(row.count));
      });

      // Portfolio count
      const portfolioResult = await databaseManager.queryPostgres(`
        SELECT is_active, COUNT(*) as count 
        FROM portfolios 
        GROUP BY is_active
      `);

      portfolioResult.rows.forEach(row => {
        this.portfolioCount.set({ status: row.is_active ? 'active' : 'inactive' }, parseInt(row.count));
      });

      // KYC completions
      const kycResult = await databaseManager.queryPostgres(`
        SELECT kyc_status, COUNT(*) as count 
        FROM users 
        WHERE kyc_status != 'not_started'
        GROUP BY kyc_status
      `);

      kycResult.rows.forEach(row => {
        this.kycCompletions.inc({ status: row.kyc_status }, parseInt(row.count));
      });

    } catch (error) {
      logger.error('Failed to collect business metrics:', error);
    }
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(req, res, duration) {
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode;
    const userAgentType = this.categorizeUserAgent(req.get('User-Agent'));

    this.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode,
      user_agent_type: userAgentType
    });

    this.httpRequestDuration.observe({
      method,
      route,
      status_code: statusCode
    }, duration / 1000);

    const requestSize = parseInt(req.get('Content-Length') || '0');
    if (requestSize > 0) {
      this.httpRequestSize.observe({ method, route }, requestSize);
    }

    const responseSize = res.get('Content-Length');
    if (responseSize) {
      this.httpResponseSize.observe({
        method,
        route,
        status_code: statusCode
      }, parseInt(responseSize));
    }
  }

  /**
   * Record authentication metrics
   */
  recordAuthAttempt(result, method = 'password') {
    this.authAttempts.inc({ result, method });
  }

  /**
   * Record trading metrics
   */
  recordTradeExecution(tradeData) {
    this.tradesExecuted.inc({
      type: tradeData.type,
      symbol: tradeData.symbol,
      status: tradeData.status
    });

    if (tradeData.volume) {
      this.tradeVolume.inc({
        symbol: tradeData.symbol,
        type: tradeData.type
      }, tradeData.volume);
    }

    if (tradeData.latency) {
      this.tradeLatency.observe({
        symbol: tradeData.symbol,
        type: tradeData.type
      }, tradeData.latency);
    }
  }

  /**
   * Record database query metrics
   */
  recordDbQuery(database, operation, table, duration, error = null) {
    if (error) {
      this.dbQueryErrors.inc({
        database,
        operation,
        error_type: error.name || 'unknown'
      });
    } else {
      this.dbQueryDuration.observe({
        database,
        operation,
        table
      }, duration / 1000);
    }
  }

  /**
   * Record cache metrics
   */
  recordCacheHit(cacheType, keyPattern) {
    this.cacheHits.inc({ cache_type: cacheType, key_pattern: keyPattern });
  }

  recordCacheMiss(cacheType, keyPattern) {
    this.cacheMisses.inc({ cache_type: cacheType, key_pattern: keyPattern });
  }

  /**
   * Record security metrics
   */
  recordSecurityAlert(alertType, severity) {
    this.securityAlerts.inc({ alert_type: alertType, severity });
  }

  recordFailedLogin(ipAddress, userAgent) {
    this.failedLoginAttempts.inc({ ip_address: ipAddress, user_agent: userAgent });
  }

  recordRateLimitHit(endpoint, ipAddress) {
    this.rateLimitHits.inc({ endpoint, ip_address: ipAddress });
  }

  /**
   * Record market data metrics
   */
  recordMarketDataUpdate(symbol, source, latency) {
    this.marketDataUpdates.inc({ symbol, source });

    if (latency) {
      this.marketDataLatency.observe({ symbol, source }, latency);
    }
  }

  /**
   * Categorize user agent
   */
  categorizeUserAgent(userAgent) {
    if (!userAgent) return 'unknown';

    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    } else if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) {
      return 'bot';
    } else if (ua.includes('postman') || ua.includes('curl') || ua.includes('wget')) {
      return 'api_client';
    } else {
      return 'browser';
    }
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics() {
    return this.registry.metrics();
  }

  /**
   * Get health check data
   */
  async getHealthData() {
    try {
      const dbHealth = await databaseManager.healthCheck();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: dbHealth,
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
          },
          cpu: {
            usage: process.cpuUsage()
          }
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

// Create singleton instance
const metricsCollector = new MetricsCollector();

module.exports = metricsCollector;
