/**
 * FinAI Nexus - Application Performance Monitoring (APM) Service
 *
 * Advanced APM featuring:
 * - Real-time performance metrics
 * - Database query monitoring
 * - API response time tracking
 * - Memory and CPU usage monitoring
 * - Error tracking and alerting
 * - Custom performance markers
 * - Business transaction monitoring
 * - Performance regression detection
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class APMService {
  constructor() {
    this.metrics = new Map();
    this.transactions = new Map();
    this.errors = new Map();
    this.customMarkers = new Map();
    this.performanceThresholds = {
      apiResponseTime: 1000, // 1 second
      databaseQueryTime: 500, // 500ms
      memoryUsage: 512 * 1024 * 1024, // 512MB
      cpuUsage: 80, // 80%
      errorRate: 5 // 5%
    };

    this.setupPerformanceMonitoring();
    this.startMetricsCollection();

    logger.info('APMService initialized with comprehensive monitoring');
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    // Monitor memory usage
    this.memoryUsage = process.memoryUsage();

    // Monitor CPU usage
    this.cpuUsage = process.cpuUsage();
    this.lastCpuCheck = Date.now();

    // Performance metrics
    this.metrics.set('api_calls', {
      total: 0,
      successful: 0,
      failed: 0,
      avgResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      responseTimeHistory: []
    });

    this.metrics.set('database_queries', {
      total: 0,
      successful: 0,
      failed: 0,
      avgQueryTime: 0,
      minQueryTime: Infinity,
      maxQueryTime: 0,
      queryTimeHistory: []
    });

    this.metrics.set('memory_usage', {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0,
      history: []
    });

    this.metrics.set('cpu_usage', {
      user: 0,
      system: 0,
      percent: 0,
      history: []
    });

    this.metrics.set('active_connections', {
      http: 0,
      websocket: 0,
      database: 0,
      redis: 0
    });

    this.metrics.set('business_transactions', {
      trades: 0,
      portfolio_updates: 0,
      ai_requests: 0,
      notifications: 0,
      total_value: 0
    });
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    // Collect system metrics every 5 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 5000);

    // Collect performance metrics every 10 seconds
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 10000);

    // Clean up old data every minute
    setInterval(() => {
      this.cleanupOldData();
    }, 60000);

    // Check performance thresholds every 30 seconds
    setInterval(() => {
      this.checkPerformanceThresholds();
    }, 30000);
  }

  /**
   * Start transaction monitoring
   */
  startTransaction(transactionName, metadata = {}) {
    const transactionId = uuidv4();
    const startTime = process.hrtime.bigint();

    const transaction = {
      id: transactionId,
      name: transactionName,
      startTime: startTime,
      metadata: metadata,
      markers: new Map(),
      errors: [],
      status: 'running'
    };

    this.transactions.set(transactionId, transaction);

    return transactionId;
  }

  /**
   * End transaction monitoring
   */
  endTransaction(transactionId, status = 'completed', error = null) {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      return null;
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - transaction.startTime) / 1000000; // Convert to milliseconds

    transaction.endTime = endTime;
    transaction.duration = duration;
    transaction.status = status;

    if (error) {
      transaction.errors.push({
        error: error.message,
        stack: error.stack,
        timestamp: new Date()
      });
      transaction.status = 'failed';
    }

    // Update metrics based on transaction type
    this.updateTransactionMetrics(transaction);

    // Remove from active transactions
    this.transactions.delete(transactionId);

    return transaction;
  }

  /**
   * Add custom marker to transaction
   */
  addMarker(transactionId, markerName, metadata = {}) {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      return false;
    }

    const currentTime = process.hrtime.bigint();
    const markerTime = Number(currentTime - transaction.startTime) / 1000000;

    transaction.markers.set(markerName, {
      name: markerName,
      timestamp: markerTime,
      metadata: metadata
    });

    return true;
  }

  /**
   * Record API call performance
   */
  recordAPICall(endpoint, method, statusCode, responseTime, metadata = {}) {
    const apiMetric = this.metrics.get('api_calls');

    apiMetric.total++;
    apiMetric.responseTimeHistory.push(responseTime);

    // Keep only last 1000 response times
    if (apiMetric.responseTimeHistory.length > 1000) {
      apiMetric.responseTimeHistory = apiMetric.responseTimeHistory.slice(-1000);
    }

    if (statusCode >= 200 && statusCode < 300) {
      apiMetric.successful++;
    } else {
      apiMetric.failed++;
    }

    // Update response time statistics
    apiMetric.minResponseTime = Math.min(apiMetric.minResponseTime, responseTime);
    apiMetric.maxResponseTime = Math.max(apiMetric.maxResponseTime, responseTime);

    const totalTime = apiMetric.responseTimeHistory.reduce((sum, time) => sum + time, 0);
    apiMetric.avgResponseTime = totalTime / apiMetric.responseTimeHistory.length;

    // Record slow API calls
    if (responseTime > this.performanceThresholds.apiResponseTime) {
      this.recordPerformanceIssue('slow_api_call', {
        endpoint,
        method,
        responseTime,
        threshold: this.performanceThresholds.apiResponseTime,
        metadata
      });
    }

    // Record failed API calls
    if (statusCode >= 400) {
      this.recordError('api_error', {
        endpoint,
        method,
        statusCode,
        responseTime,
        metadata
      });
    }
  }

  /**
   * Record database query performance
   */
  recordDatabaseQuery(query, operation, queryTime, success, metadata = {}) {
    const dbMetric = this.metrics.get('database_queries');

    dbMetric.total++;
    dbMetric.queryTimeHistory.push(queryTime);

    // Keep only last 1000 query times
    if (dbMetric.queryTimeHistory.length > 1000) {
      dbMetric.queryTimeHistory = dbMetric.queryTimeHistory.slice(-1000);
    }

    if (success) {
      dbMetric.successful++;
    } else {
      dbMetric.failed++;
    }

    // Update query time statistics
    dbMetric.minQueryTime = Math.min(dbMetric.minQueryTime, queryTime);
    dbMetric.maxQueryTime = Math.max(dbMetric.maxQueryTime, queryTime);

    const totalTime = dbMetric.queryTimeHistory.reduce((sum, time) => sum + time, 0);
    dbMetric.avgQueryTime = totalTime / dbMetric.queryTimeHistory.length;

    // Record slow database queries
    if (queryTime > this.performanceThresholds.databaseQueryTime) {
      this.recordPerformanceIssue('slow_database_query', {
        query: query.substring(0, 200), // Truncate long queries
        operation,
        queryTime,
        threshold: this.performanceThresholds.databaseQueryTime,
        metadata
      });
    }

    // Record failed database queries
    if (!success) {
      this.recordError('database_error', {
        query: query.substring(0, 200),
        operation,
        queryTime,
        metadata
      });
    }
  }

  /**
   * Record business transaction
   */
  recordBusinessTransaction(type, value, metadata = {}) {
    const businessMetric = this.metrics.get('business_transactions');

    switch (type) {
    case 'trade':
      businessMetric.trades++;
      businessMetric.total_value += value || 0;
      break;
    case 'portfolio_update':
      businessMetric.portfolio_updates++;
      break;
    case 'ai_request':
      businessMetric.ai_requests++;
      break;
    case 'notification':
      businessMetric.notifications++;
      break;
    }

    // Record high-value transactions
    if (value && value > 100000) { // $100k+
      this.recordPerformanceIssue('high_value_transaction', {
        type,
        value,
        metadata
      });
    }
  }

  /**
   * Record error
   */
  recordError(type, error, metadata = {}) {
    const errorId = uuidv4();
    const errorRecord = {
      id: errorId,
      type,
      error: error.message || error,
      stack: error.stack,
      timestamp: new Date(),
      metadata,
      severity: this.getErrorSeverity(type, error)
    };

    this.errors.set(errorId, errorRecord);

    // Keep only last 1000 errors
    if (this.errors.size > 1000) {
      const oldestError = Array.from(this.errors.keys())[0];
      this.errors.delete(oldestError);
    }

    logger.error(`APM Error Recorded: ${type}`, errorRecord);

    return errorId;
  }

  /**
   * Record performance issue
   */
  recordPerformanceIssue(type, details) {
    const issueId = uuidv4();
    const issue = {
      id: issueId,
      type,
      details,
      timestamp: new Date(),
      severity: 'warning'
    };

    logger.warn(`APM Performance Issue: ${type}`, details);

    return issueId;
  }

  /**
   * Get error severity
   */
  getErrorSeverity(type, error) {
    if (type.includes('critical') || type.includes('fatal')) {
      return 'critical';
    } else if (type.includes('error') || type.includes('exception')) {
      return 'error';
    } else if (type.includes('warning')) {
      return 'warning';
    } else {
      return 'info';
    }
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    // Memory usage
    const memoryUsage = process.memoryUsage();
    const memoryMetric = this.metrics.get('memory_usage');

    memoryMetric.heapUsed = memoryUsage.heapUsed;
    memoryMetric.heapTotal = memoryUsage.heapTotal;
    memoryMetric.external = memoryUsage.external;
    memoryMetric.rss = memoryUsage.rss;

    memoryMetric.history.push({
      timestamp: new Date(),
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss
    });

    // Keep only last 100 memory readings
    if (memoryMetric.history.length > 100) {
      memoryMetric.history = memoryMetric.history.slice(-100);
    }

    // Check memory threshold
    if (memoryUsage.heapUsed > this.performanceThresholds.memoryUsage) {
      this.recordPerformanceIssue('high_memory_usage', {
        heapUsed: memoryUsage.heapUsed,
        threshold: this.performanceThresholds.memoryUsage,
        percent: (memoryUsage.heapUsed / this.performanceThresholds.memoryUsage) * 100
      });
    }

    // CPU usage
    const currentCpuUsage = process.cpuUsage(this.cpuUsage);
    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastCpuCheck;

    const cpuMetric = this.metrics.get('cpu_usage');

    cpuMetric.user = currentCpuUsage.user;
    cpuMetric.system = currentCpuUsage.system;
    cpuMetric.percent = ((currentCpuUsage.user + currentCpuUsage.system) / 1000000) / (timeDiff / 1000) * 100;

    cpuMetric.history.push({
      timestamp: new Date(),
      user: currentCpuUsage.user,
      system: currentCpuUsage.system,
      percent: cpuMetric.percent
    });

    // Keep only last 100 CPU readings
    if (cpuMetric.history.length > 100) {
      cpuMetric.history = cpuMetric.history.slice(-100);
    }

    // Check CPU threshold
    if (cpuMetric.percent > this.performanceThresholds.cpuUsage) {
      this.recordPerformanceIssue('high_cpu_usage', {
        percent: cpuMetric.percent,
        threshold: this.performanceThresholds.cpuUsage
      });
    }

    this.cpuUsage = currentCpuUsage;
    this.lastCpuCheck = currentTime;
  }

  /**
   * Collect performance metrics
   */
  collectPerformanceMetrics() {
    const apiMetric = this.metrics.get('api_calls');
    const dbMetric = this.metrics.get('database_queries');

    // Calculate error rates
    const apiErrorRate = apiMetric.total > 0 ? (apiMetric.failed / apiMetric.total) * 100 : 0;
    const dbErrorRate = dbMetric.total > 0 ? (dbMetric.failed / dbMetric.total) * 100 : 0;

    // Check error rate thresholds
    if (apiErrorRate > this.performanceThresholds.errorRate) {
      this.recordPerformanceIssue('high_api_error_rate', {
        errorRate: apiErrorRate,
        threshold: this.performanceThresholds.errorRate,
        totalCalls: apiMetric.total,
        failedCalls: apiMetric.failed
      });
    }

    if (dbErrorRate > this.performanceThresholds.errorRate) {
      this.recordPerformanceIssue('high_database_error_rate', {
        errorRate: dbErrorRate,
        threshold: this.performanceThresholds.errorRate,
        totalQueries: dbMetric.total,
        failedQueries: dbMetric.failed
      });
    }
  }

  /**
   * Check performance thresholds
   */
  checkPerformanceThresholds() {
    const apiMetric = this.metrics.get('api_calls');
    const dbMetric = this.metrics.get('database_queries');
    const memoryMetric = this.metrics.get('memory_usage');
    const cpuMetric = this.metrics.get('cpu_usage');

    // Check API response time
    if (apiMetric.avgResponseTime > this.performanceThresholds.apiResponseTime) {
      this.recordPerformanceIssue('high_api_response_time', {
        avgResponseTime: apiMetric.avgResponseTime,
        threshold: this.performanceThresholds.apiResponseTime,
        maxResponseTime: apiMetric.maxResponseTime
      });
    }

    // Check database query time
    if (dbMetric.avgQueryTime > this.performanceThresholds.databaseQueryTime) {
      this.recordPerformanceIssue('high_database_query_time', {
        avgQueryTime: dbMetric.avgQueryTime,
        threshold: this.performanceThresholds.databaseQueryTime,
        maxQueryTime: dbMetric.maxQueryTime
      });
    }

    // Check memory usage
    if (memoryMetric.heapUsed > this.performanceThresholds.memoryUsage) {
      this.recordPerformanceIssue('high_memory_usage', {
        heapUsed: memoryMetric.heapUsed,
        threshold: this.performanceThresholds.memoryUsage
      });
    }

    // Check CPU usage
    if (cpuMetric.percent > this.performanceThresholds.cpuUsage) {
      this.recordPerformanceIssue('high_cpu_usage', {
        percent: cpuMetric.percent,
        threshold: this.performanceThresholds.cpuUsage
      });
    }
  }

  /**
   * Cleanup old data
   */
  cleanupOldData() {
    const oneHourAgo = new Date() - 3600000;

    // Clean up old errors
    for (const [errorId, error] of this.errors) {
      if (error.timestamp < oneHourAgo) {
        this.errors.delete(errorId);
      }
    }

    // Clean up old custom markers
    for (const [markerId, marker] of this.customMarkers) {
      if (marker.timestamp < oneHourAgo) {
        this.customMarkers.delete(markerId);
      }
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const apiMetric = this.metrics.get('api_calls');
    const dbMetric = this.metrics.get('database_queries');
    const memoryMetric = this.metrics.get('memory_usage');
    const cpuMetric = this.metrics.get('cpu_usage');
    const businessMetric = this.metrics.get('business_transactions');

    return {
      timestamp: new Date().toISOString(),
      api: {
        totalCalls: apiMetric.total,
        successful: apiMetric.successful,
        failed: apiMetric.failed,
        errorRate: apiMetric.total > 0 ? (apiMetric.failed / apiMetric.total) * 100 : 0,
        avgResponseTime: apiMetric.avgResponseTime,
        minResponseTime: apiMetric.minResponseTime === Infinity ? 0 : apiMetric.minResponseTime,
        maxResponseTime: apiMetric.maxResponseTime
      },
      database: {
        totalQueries: dbMetric.total,
        successful: dbMetric.successful,
        failed: dbMetric.failed,
        errorRate: dbMetric.total > 0 ? (dbMetric.failed / dbMetric.total) * 100 : 0,
        avgQueryTime: dbMetric.avgQueryTime,
        minQueryTime: dbMetric.minQueryTime === Infinity ? 0 : dbMetric.minQueryTime,
        maxQueryTime: dbMetric.maxQueryTime
      },
      system: {
        memory: {
          heapUsed: memoryMetric.heapUsed,
          heapTotal: memoryMetric.heapTotal,
          external: memoryMetric.external,
          rss: memoryMetric.rss
        },
        cpu: {
          user: cpuMetric.user,
          system: cpuMetric.system,
          percent: cpuMetric.percent
        }
      },
      business: {
        trades: businessMetric.trades,
        portfolioUpdates: businessMetric.portfolio_updates,
        aiRequests: businessMetric.ai_requests,
        notifications: businessMetric.notifications,
        totalValue: businessMetric.total_value
      },
      errors: {
        total: this.errors.size,
        recent: Array.from(this.errors.values())
          .filter(error => (new Date() - error.timestamp) < 300000) // Last 5 minutes
          .length
      },
      activeTransactions: this.transactions.size
    };
  }

  /**
   * Get detailed metrics
   */
  getDetailedMetrics() {
    return {
      metrics: Object.fromEntries(this.metrics),
      errors: Object.fromEntries(this.errors),
      customMarkers: Object.fromEntries(this.customMarkers),
      activeTransactions: Object.fromEntries(this.transactions),
      performanceThresholds: this.performanceThresholds
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const summary = this.getPerformanceSummary();

      // Determine health status based on metrics
      let status = 'healthy';
      const issues = [];

      if (summary.api.errorRate > this.performanceThresholds.errorRate) {
        status = 'warning';
        issues.push('High API error rate');
      }

      if (summary.database.errorRate > this.performanceThresholds.errorRate) {
        status = 'warning';
        issues.push('High database error rate');
      }

      if (summary.system.memory.heapUsed > this.performanceThresholds.memoryUsage) {
        status = 'warning';
        issues.push('High memory usage');
      }

      if (summary.system.cpu.percent > this.performanceThresholds.cpuUsage) {
        status = 'warning';
        issues.push('High CPU usage');
      }

      return {
        status,
        service: 'apm',
        summary,
        issues,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'apm',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = APMService;
