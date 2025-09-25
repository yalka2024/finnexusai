/**
 * Comprehensive Prometheus Metrics Collection
 * Enterprise-grade monitoring and alerting for production systems
 */

const promClient = require('prom-client');

class PrometheusMetrics {
  constructor() {
    this.registry = new promClient.Registry();
    this.initializeMetrics();
    this.setupDefaultMetrics();
  }

  /**
   * Initialize all custom metrics
   */
  initializeMetrics() {
    // HTTP request metrics
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code', 'environment'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });

    this.httpRequestsTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'environment']
    });

    this.httpRequestSize = new promClient.Histogram({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000]
    });

    this.httpResponseSize = new promClient.Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [100, 1000, 10000, 100000, 1000000]
    });

    // Database metrics
    this.databaseConnections = new promClient.Gauge({
      name: 'database_connections_active',
      help: 'Number of active database connections',
      labelNames: ['database', 'type']
    });

    this.databaseQueryDuration = new promClient.Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['database', 'query_type', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5]
    });

    this.databaseQueriesTotal = new promClient.Counter({
      name: 'database_queries_total',
      help: 'Total number of database queries',
      labelNames: ['database', 'query_type', 'status']
    });

    this.databaseConnectionsTotal = new promClient.Counter({
      name: 'database_connections_total',
      help: 'Total number of database connections',
      labelNames: ['database', 'type', 'status']
    });

    // Authentication metrics
    this.authAttemptsTotal = new promClient.Counter({
      name: 'auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['method', 'status', 'user_type']
    });

    this.authFailuresTotal = new promClient.Counter({
      name: 'auth_failures_total',
      help: 'Total number of authentication failures',
      labelNames: ['reason', 'ip_address']
    });

    this.activeSessions = new promClient.Gauge({
      name: 'active_sessions_total',
      help: 'Number of active user sessions',
      labelNames: ['user_type']
    });

    this.jwtTokensIssued = new promClient.Counter({
      name: 'jwt_tokens_issued_total',
      help: 'Total number of JWT tokens issued',
      labelNames: ['token_type']
    });

    // Trading metrics
    this.tradesTotal = new promClient.Counter({
      name: 'trades_total',
      help: 'Total number of trades executed',
      labelNames: ['symbol', 'type', 'status']
    });

    this.tradeVolume = new promClient.Counter({
      name: 'trade_volume_total',
      help: 'Total trading volume',
      labelNames: ['symbol', 'currency']
    });

    this.tradeValue = new promClient.Counter({
      name: 'trade_value_total',
      help: 'Total trading value',
      labelNames: ['symbol', 'currency']
    });

    this.activeOrders = new promClient.Gauge({
      name: 'active_orders_total',
      help: 'Number of active orders',
      labelNames: ['symbol', 'type']
    });

    this.orderExecutionTime = new promClient.Histogram({
      name: 'order_execution_time_seconds',
      help: 'Time to execute orders',
      labelNames: ['symbol', 'type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
    });

    // Portfolio metrics
    this.portfolioValue = new promClient.Gauge({
      name: 'portfolio_value_total',
      help: 'Total portfolio value',
      labelNames: ['currency']
    });

    this.portfolioPerformance = new promClient.Gauge({
      name: 'portfolio_performance_percent',
      help: 'Portfolio performance percentage',
      labelNames: ['timeframe']
    });

    this.assetAllocations = new promClient.Gauge({
      name: 'asset_allocation_percent',
      help: 'Asset allocation percentage',
      labelNames: ['asset', 'user_type']
    });

    // Security metrics
    this.securityEventsTotal = new promClient.Counter({
      name: 'security_events_total',
      help: 'Total number of security events',
      labelNames: ['event_type', 'severity', 'source']
    });

    this.failedLoginAttempts = new promClient.Counter({
      name: 'failed_login_attempts_total',
      help: 'Total number of failed login attempts',
      labelNames: ['ip_address', 'user_agent']
    });

    this.blockedRequests = new promClient.Counter({
      name: 'blocked_requests_total',
      help: 'Total number of blocked requests',
      labelNames: ['reason', 'ip_address']
    });

    this.rateLimitHits = new promClient.Counter({
      name: 'rate_limit_hits_total',
      help: 'Total number of rate limit hits',
      labelNames: ['endpoint', 'ip_address']
    });

    // Business metrics
    this.usersTotal = new promClient.Gauge({
      name: 'users_total',
      help: 'Total number of users',
      labelNames: ['status', 'type']
    });

    this.newUsersDaily = new promClient.Counter({
      name: 'new_users_daily_total',
      help: 'Daily new user registrations',
      labelNames: ['source']
    });

    this.revenueTotal = new promClient.Counter({
      name: 'revenue_total',
      help: 'Total revenue generated',
      labelNames: ['source', 'currency']
    });

    this.transactionFees = new promClient.Counter({
      name: 'transaction_fees_total',
      help: 'Total transaction fees collected',
      labelNames: ['type', 'currency']
    });

    // System metrics
    this.memoryUsage = new promClient.Gauge({
      name: 'nodejs_memory_usage_bytes',
      help: 'Node.js memory usage in bytes',
      labelNames: ['type']
    });

    this.cpuUsage = new promClient.Gauge({
      name: 'nodejs_cpu_usage_percent',
      help: 'Node.js CPU usage percentage'
    });

    this.eventLoopLag = new promClient.Histogram({
      name: 'nodejs_event_loop_lag_seconds',
      help: 'Node.js event loop lag in seconds',
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
    });

    this.gcDuration = new promClient.Histogram({
      name: 'nodejs_gc_duration_seconds',
      help: 'Node.js garbage collection duration',
      labelNames: ['type'],
      buckets: [0.001, 0.01, 0.1, 1, 10]
    });

    // API metrics
    this.apiResponseTime = new promClient.Histogram({
      name: 'api_response_time_seconds',
      help: 'API response time',
      labelNames: ['endpoint', 'method', 'version'],
      buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5]
    });

    this.apiErrorsTotal = new promClient.Counter({
      name: 'api_errors_total',
      help: 'Total number of API errors',
      labelNames: ['endpoint', 'error_code', 'error_type']
    });

    this.apiRequestsTotal = new promClient.Counter({
      name: 'api_requests_total',
      help: 'Total number of API requests',
      labelNames: ['endpoint', 'method', 'version', 'status']
    });

    // Blockchain metrics
    this.blockchainTransactions = new promClient.Counter({
      name: 'blockchain_transactions_total',
      help: 'Total blockchain transactions',
      labelNames: ['network', 'type', 'status']
    });

    this.blockchainGasUsed = new promClient.Counter({
      name: 'blockchain_gas_used_total',
      help: 'Total gas used in blockchain transactions',
      labelNames: ['network']
    });

    this.blockchainConfirmationTime = new promClient.Histogram({
      name: 'blockchain_confirmation_time_seconds',
      help: 'Blockchain transaction confirmation time',
      labelNames: ['network'],
      buckets: [1, 5, 10, 30, 60, 300, 600]
    });

    // Register all metrics
    this.registerMetrics();
  }

  /**
   * Register all metrics with the registry
   */
  registerMetrics() {
    const metrics = [
      this.httpRequestDuration,
      this.httpRequestsTotal,
      this.httpRequestSize,
      this.httpResponseSize,
      this.databaseConnections,
      this.databaseQueryDuration,
      this.databaseQueriesTotal,
      this.databaseConnectionsTotal,
      this.authAttemptsTotal,
      this.authFailuresTotal,
      this.activeSessions,
      this.jwtTokensIssued,
      this.tradesTotal,
      this.tradeVolume,
      this.tradeValue,
      this.activeOrders,
      this.orderExecutionTime,
      this.portfolioValue,
      this.portfolioPerformance,
      this.assetAllocations,
      this.securityEventsTotal,
      this.failedLoginAttempts,
      this.blockedRequests,
      this.rateLimitHits,
      this.usersTotal,
      this.newUsersDaily,
      this.revenueTotal,
      this.transactionFees,
      this.memoryUsage,
      this.cpuUsage,
      this.eventLoopLag,
      this.gcDuration,
      this.apiResponseTime,
      this.apiErrorsTotal,
      this.apiRequestsTotal,
      this.blockchainTransactions,
      this.blockchainGasUsed,
      this.blockchainConfirmationTime
    ];

    metrics.forEach(metric => {
      this.registry.register(metric);
    });
  }

  /**
   * Setup default Node.js metrics
   */
  setupDefaultMetrics() {
    // Collect default Node.js metrics
    promClient.collectDefaultMetrics({
      register: this.registry,
      prefix: 'finnexus_'
    });
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(req, res, duration) {
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode.toString(),
      environment: process.env.NODE_ENV || 'development'
    };

    this.httpRequestDuration.observe(labels, duration / 1000);
    this.httpRequestsTotal.inc(labels);

    if (req.headers['content-length']) {
      this.httpRequestSize.observe(
        { method: req.method, route: labels.route },
        parseInt(req.headers['content-length'])
      );
    }

    if (res.getHeader('content-length')) {
      this.httpResponseSize.observe(
        { method: req.method, route: labels.route, status_code: labels.status_code },
        parseInt(res.getHeader('content-length'))
      );
    }
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(database, queryType, table, duration, status = 'success') {
    const labels = {
      database: database,
      query_type: queryType,
      table: table
    };

    this.databaseQueryDuration.observe(labels, duration / 1000);
    this.databaseQueriesTotal.inc({ ...labels, status: status });
  }

  /**
   * Record authentication metrics
   */
  recordAuthAttempt(method, status, userType) {
    this.authAttemptsTotal.inc({
      method: method,
      status: status,
      user_type: userType
    });
  }

  /**
   * Record authentication failure
   */
  recordAuthFailure(reason, ipAddress) {
    this.authFailuresTotal.inc({
      reason: reason,
      ip_address: ipAddress
    });
  }

  /**
   * Record trading metrics
   */
  recordTrade(symbol, type, status, volume, value, currency = 'USD') {
    this.tradesTotal.inc({ symbol, type, status });
    this.tradeVolume.inc({ symbol, currency }, volume);
    this.tradeValue.inc({ symbol, currency }, value);
  }

  /**
   * Record security event
   */
  recordSecurityEvent(eventType, severity, source) {
    this.securityEventsTotal.inc({
      event_type: eventType,
      severity: severity,
      source: source
    });
  }

  /**
   * Record API metrics
   */
  recordApiRequest(endpoint, method, version, status, responseTime) {
    const labels = {
      endpoint: endpoint,
      method: method,
      version: version
    };

    this.apiRequestsTotal.inc({ ...labels, status: status.toString() });
    this.apiResponseTime.observe(labels, responseTime / 1000);
  }

  /**
   * Record API error
   */
  recordApiError(endpoint, errorCode, errorType) {
    this.apiErrorsTotal.inc({
      endpoint: endpoint,
      error_code: errorCode,
      error_type: errorType
    });
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics() {
    const memUsage = process.memoryUsage();

    this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
    this.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
    this.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
    this.memoryUsage.set({ type: 'external' }, memUsage.external);

    // CPU usage would require additional monitoring
    const cpuUsage = process.cpuUsage();
    this.cpuUsage.set(cpuUsage.user + cpuUsage.system);
  }

  /**
   * Get metrics registry
   */
  getRegistry() {
    return this.registry;
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics() {
    this.updateSystemMetrics();
    return this.registry.metrics();
  }

  /**
   * Get metrics as JSON
   */
  async getMetricsAsJSON() {
    this.updateSystemMetrics();
    return this.registry.getMetricsAsJSON();
  }

  /**
   * Create custom metric
   */
  createCustomMetric(type, name, help, labelNames = [], buckets = null) {
    let metric;

    switch (type) {
    case 'counter':
      metric = new promClient.Counter({ name, help, labelNames, registers: [this.registry] });
      break;
    case 'gauge':
      metric = new promClient.Gauge({ name, help, labelNames, registers: [this.registry] });
      break;
    case 'histogram':
      metric = new promClient.Histogram({ name, help, labelNames, buckets, registers: [this.registry] });
      break;
    case 'summary':
      metric = new promClient.Summary({ name, help, labelNames, registers: [this.registry] });
      break;
    default:
      throw new Error(`Unknown metric type: ${type}`);
    }

    return metric;
  }

  /**
   * Setup health check metrics
   */
  setupHealthChecks() {
    this.healthCheckStatus = new promClient.Gauge({
      name: 'health_check_status',
      help: 'Health check status (1 = healthy, 0 = unhealthy)',
      labelNames: ['service', 'check_type']
    });

    this.healthCheckDuration = new promClient.Histogram({
      name: 'health_check_duration_seconds',
      help: 'Health check duration in seconds',
      labelNames: ['service', 'check_type'],
      buckets: [0.01, 0.1, 0.5, 1, 5, 10]
    });

    this.registry.register(this.healthCheckStatus);
    this.registry.register(this.healthCheckDuration);
  }

  /**
   * Record health check result
   */
  recordHealthCheck(service, checkType, isHealthy, duration) {
    this.healthCheckStatus.set(
      { service, check_type: checkType },
      isHealthy ? 1 : 0
    );

    this.healthCheckDuration.observe(
      { service, check_type: checkType },
      duration / 1000
    );
  }

  /**
   * Setup alerting rules (for Prometheus Alertmanager)
   */
  getAlertingRules() {
    return `
groups:
  - name: finnexus-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }} seconds"

      - alert: DatabaseConnectionPoolExhausted
        expr: database_connections_active / database_connections_total > 0.8
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "{{ $value }}% of connections are active"

      - alert: HighMemoryUsage
        expr: nodejs_memory_usage_bytes{type="heapUsed"} / nodejs_memory_usage_bytes{type="heapTotal"} > 0.9
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is {{ $value }}%"

      - alert: AuthenticationFailures
        expr: rate(auth_failures_total[5m]) > 10
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "High number of authentication failures"
          description: "{{ $value }} failed attempts per second"

      - alert: SecurityEvents
        expr: rate(security_events_total[5m]) > 5
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "High number of security events"
          description: "{{ $value }} security events per second"
    `;
  }
}

module.exports = new PrometheusMetrics();
