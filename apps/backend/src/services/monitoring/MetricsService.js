/**
 * FinAI Nexus - Metrics Service
 *
 * Advanced monitoring and metrics collection featuring:
 * - Prometheus metrics collection
 * - Custom business metrics
 * - Performance monitoring
 * - Error tracking and alerting
 * - Grafana dashboard integration
 */

const client = require('prom-client');

class MetricsService {
  constructor() {
    this.registry = new client.Registry();
    this.metrics = new Map();
    this.collectors = new Map();

    // Default metrics
    this.setupDefaultMetrics();

    // Custom metrics
    this.setupCustomMetrics();

    // Business metrics
    this.setupBusinessMetrics();

    // Performance metrics
    this.setupPerformanceMetrics();
  }

  /**
   * Setup default Prometheus metrics
   */
  setupDefaultMetrics() {
    // Collect default metrics (CPU, memory, etc.)
    client.collectDefaultMetrics({ register: this.registry });

    // HTTP request metrics
    this.metrics.set('httpRequestsTotal', new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry]
    }));

    this.metrics.set('httpRequestDuration', new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry]
    }));

    // Database metrics
    this.metrics.set('databaseConnections', new client.Gauge({
      name: 'database_connections_active',
      help: 'Number of active database connections',
      labelNames: ['database', 'state'],
      registers: [this.registry]
    }));

    this.metrics.set('databaseQueriesTotal', new client.Counter({
      name: 'database_queries_total',
      help: 'Total number of database queries',
      labelNames: ['database', 'operation', 'status'],
      registers: [this.registry]
    }));

    this.metrics.set('databaseQueryDuration', new client.Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['database', 'operation'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [this.registry]
    }));
  }

  /**
   * Setup custom application metrics
   */
  setupCustomMetrics() {
    // User metrics
    this.metrics.set('usersTotal', new client.Counter({
      name: 'users_total',
      help: 'Total number of users',
      labelNames: ['status'],
      registers: [this.registry]
    }));

    this.metrics.set('activeUsers', new client.Gauge({
      name: 'users_active',
      help: 'Number of active users',
      labelNames: ['period'],
      registers: [this.registry]
    }));

    // Trading metrics
    this.metrics.set('tradesTotal', new client.Counter({
      name: 'trades_total',
      help: 'Total number of trades executed',
      labelNames: ['type', 'symbol', 'status'],
      registers: [this.registry]
    }));

    this.metrics.set('tradeVolume', new client.Counter({
      name: 'trade_volume_total',
      help: 'Total trading volume',
      labelNames: ['symbol', 'type'],
      registers: [this.registry]
    }));

    this.metrics.set('tradeValue', new client.Counter({
      name: 'trade_value_total',
      help: 'Total trade value in USD',
      labelNames: ['symbol', 'type'],
      registers: [this.registry]
    }));

    // Portfolio metrics
    this.metrics.set('portfolioValue', new client.Gauge({
      name: 'portfolio_value_total',
      help: 'Total portfolio value',
      labelNames: ['user_id', 'currency'],
      registers: [this.registry]
    }));

    this.metrics.set('portfolioCount', new client.Gauge({
      name: 'portfolios_total',
      help: 'Total number of portfolios',
      labelNames: ['status'],
      registers: [this.registry]
    }));

    // AI service metrics
    this.metrics.set('aiRequestsTotal', new client.Counter({
      name: 'ai_requests_total',
      help: 'Total number of AI requests',
      labelNames: ['service', 'model', 'status'],
      registers: [this.registry]
    }));

    this.metrics.set('aiRequestDuration', new client.Histogram({
      name: 'ai_request_duration_seconds',
      help: 'Duration of AI requests in seconds',
      labelNames: ['service', 'model'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry]
    }));

    this.metrics.set('aiTokensUsed', new client.Counter({
      name: 'ai_tokens_used_total',
      help: 'Total AI tokens used',
      labelNames: ['service', 'model', 'type'],
      registers: [this.registry]
    }));

    // Fraud detection metrics
    this.metrics.set('fraudDetectionsTotal', new client.Counter({
      name: 'fraud_detections_total',
      help: 'Total fraud detection attempts',
      labelNames: ['type', 'result'],
      registers: [this.registry]
    }));

    this.metrics.set('fraudScore', new client.Histogram({
      name: 'fraud_score',
      help: 'Fraud detection scores',
      labelNames: ['type'],
      buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
      registers: [this.registry]
    }));

    // Cache metrics
    this.metrics.set('cacheHitsTotal', new client.Counter({
      name: 'cache_hits_total',
      help: 'Total cache hits',
      labelNames: ['cache_type', 'key_pattern'],
      registers: [this.registry]
    }));

    this.metrics.set('cacheMissesTotal', new client.Counter({
      name: 'cache_misses_total',
      help: 'Total cache misses',
      labelNames: ['cache_type', 'key_pattern'],
      registers: [this.registry]
    }));

    this.metrics.set('cacheOperationsTotal', new client.Counter({
      name: 'cache_operations_total',
      help: 'Total cache operations',
      labelNames: ['operation', 'status'],
      registers: [this.registry]
    }));

    // WebSocket metrics
    this.metrics.set('websocketConnections', new client.Gauge({
      name: 'websocket_connections_active',
      help: 'Number of active WebSocket connections',
      labelNames: ['room', 'status'],
      registers: [this.registry]
    }));

    this.metrics.set('websocketMessagesTotal', new client.Counter({
      name: 'websocket_messages_total',
      help: 'Total WebSocket messages',
      labelNames: ['type', 'room'],
      registers: [this.registry]
    }));
  }

  /**
   * Setup business metrics
   */
  setupBusinessMetrics() {
    // Revenue metrics
    this.metrics.set('revenueTotal', new client.Counter({
      name: 'revenue_total',
      help: 'Total revenue in USD',
      labelNames: ['source', 'currency'],
      registers: [this.registry]
    }));

    this.metrics.set('transactionFeesTotal', new client.Counter({
      name: 'transaction_fees_total',
      help: 'Total transaction fees collected',
      labelNames: ['type', 'currency'],
      registers: [this.registry]
    }));

    // User engagement metrics
    this.metrics.set('userSessions', new client.Gauge({
      name: 'user_sessions_active',
      help: 'Number of active user sessions',
      labelNames: ['session_type'],
      registers: [this.registry]
    }));

    this.metrics.set('userActionsTotal', new client.Counter({
      name: 'user_actions_total',
      help: 'Total user actions',
      labelNames: ['action_type', 'user_type'],
      registers: [this.registry]
    }));

    // Feature usage metrics
    this.metrics.set('featureUsageTotal', new client.Counter({
      name: 'feature_usage_total',
      help: 'Total feature usage',
      labelNames: ['feature', 'user_type'],
      registers: [this.registry]
    }));

    // Subscription metrics
    this.metrics.set('subscriptionsTotal', new client.Gauge({
      name: 'subscriptions_total',
      help: 'Total active subscriptions',
      labelNames: ['plan', 'status'],
      registers: [this.registry]
    }));

    // API usage metrics
    this.metrics.set('apiUsageTotal', new client.Counter({
      name: 'api_usage_total',
      help: 'Total API usage',
      labelNames: ['endpoint', 'method', 'user_type'],
      registers: [this.registry]
    }));
  }

  /**
   * Setup performance metrics
   */
  setupPerformanceMetrics() {
    // Response time metrics
    this.metrics.set('responseTime', new client.Histogram({
      name: 'response_time_seconds',
      help: 'Response time in seconds',
      labelNames: ['service', 'operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
      registers: [this.registry]
    }));

    // Memory usage metrics
    this.metrics.set('memoryUsage', new client.Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
      registers: [this.registry]
    }));

    // CPU usage metrics
    this.metrics.set('cpuUsage', new client.Gauge({
      name: 'cpu_usage_percent',
      help: 'CPU usage percentage',
      labelNames: ['type'],
      registers: [this.registry]
    }));

    // Queue metrics
    this.metrics.set('queueSize', new client.Gauge({
      name: 'queue_size',
      help: 'Queue size',
      labelNames: ['queue_name'],
      registers: [this.registry]
    }));

    this.metrics.set('queueProcessingTime', new client.Histogram({
      name: 'queue_processing_time_seconds',
      help: 'Queue processing time in seconds',
      labelNames: ['queue_name'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
      registers: [this.registry]
    }));
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method, route, statusCode, duration) {
    const labels = { method, route, status_code: statusCode };

    this.metrics.get('httpRequestsTotal').inc(labels);
    this.metrics.get('httpRequestDuration').observe(labels, duration);
  }

  /**
   * Record database operation metrics
   */
  recordDatabaseOperation(database, operation, status, duration) {
    const queryLabels = { database, operation, status };
    const durationLabels = { database, operation };

    this.metrics.get('databaseQueriesTotal').inc(queryLabels);
    this.metrics.get('databaseQueryDuration').observe(durationLabels, duration);
  }

  /**
   * Record user metrics
   */
  recordUserAction(action, userType = 'regular') {
    this.metrics.get('userActionsTotal').inc({ action_type: action, user_type: userType });
  }

  recordUserRegistration(status = 'success') {
    this.metrics.get('usersTotal').inc({ status });
  }

  updateActiveUsers(count, period = 'current') {
    this.metrics.get('activeUsers').set({ period }, count);
  }

  /**
   * Record trading metrics
   */
  recordTrade(type, symbol, status, volume, value) {
    const labels = { type, symbol, status };
    const volumeLabels = { symbol, type };
    const valueLabels = { symbol, type };

    this.metrics.get('tradesTotal').inc(labels);
    this.metrics.get('tradeVolume').inc(volumeLabels, volume);
    this.metrics.get('tradeValue').inc(valueLabels, value);
  }

  /**
   * Record portfolio metrics
   */
  updatePortfolioValue(userId, currency, value) {
    this.metrics.get('portfolioValue').set({ user_id: userId, currency }, value);
  }

  updatePortfolioCount(status, count) {
    this.metrics.get('portfolioCount').set({ status }, count);
  }

  /**
   * Record AI service metrics
   */
  recordAIRequest(service, model, status, duration, tokensUsed = 0) {
    const requestLabels = { service, model, status };
    const durationLabels = { service, model };
    const tokenLabels = { service, model, type: 'total' };

    this.metrics.get('aiRequestsTotal').inc(requestLabels);
    this.metrics.get('aiRequestDuration').observe(durationLabels, duration);
    this.metrics.get('aiTokensUsed').inc(tokenLabels, tokensUsed);
  }

  /**
   * Record fraud detection metrics
   */
  recordFraudDetection(type, result, score) {
    const labels = { type, result };
    const scoreLabels = { type };

    this.metrics.get('fraudDetectionsTotal').inc(labels);
    this.metrics.get('fraudScore').observe(scoreLabels, score);
  }

  /**
   * Record cache metrics
   */
  recordCacheOperation(operation, status, cacheType = 'redis', keyPattern = 'unknown') {
    const labels = { operation, status };
    const hitLabels = { cache_type: cacheType, key_pattern: keyPattern };
    const missLabels = { cache_type: cacheType, key_pattern: keyPattern };

    this.metrics.get('cacheOperationsTotal').inc(labels);

    if (operation === 'get' && status === 'hit') {
      this.metrics.get('cacheHitsTotal').inc(hitLabels);
    } else if (operation === 'get' && status === 'miss') {
      this.metrics.get('cacheMissesTotal').inc(missLabels);
    }
  }

  /**
   * Record WebSocket metrics
   */
  updateWebSocketConnections(room, status, count) {
    this.metrics.get('websocketConnections').set({ room, status }, count);
  }

  recordWebSocketMessage(type, room) {
    this.metrics.get('websocketMessagesTotal').inc({ type, room });
  }

  /**
   * Record business metrics
   */
  recordRevenue(source, currency, amount) {
    this.metrics.get('revenueTotal').inc({ source, currency }, amount);
  }

  recordTransactionFee(type, currency, amount) {
    this.metrics.get('transactionFeesTotal').inc({ type, currency }, amount);
  }

  recordFeatureUsage(feature, userType) {
    this.metrics.get('featureUsageTotal').inc({ feature, user_type: userType });
  }

  updateSubscriptions(plan, status, count) {
    this.metrics.get('subscriptionsTotal').set({ plan, status }, count);
  }

  recordAPIUsage(endpoint, method, userType) {
    this.metrics.get('apiUsageTotal').inc({ endpoint, method, user_type: userType });
  }

  /**
   * Record performance metrics
   */
  recordResponseTime(service, operation, duration) {
    this.metrics.get('responseTime').observe({ service, operation }, duration);
  }

  updateMemoryUsage(type, bytes) {
    this.metrics.get('memoryUsage').set({ type }, bytes);
  }

  updateCPUUsage(type, percent) {
    this.metrics.get('cpuUsage').set({ type }, percent);
  }

  updateQueueSize(queueName, size) {
    this.metrics.get('queueSize').set({ queue_name: queueName }, size);
  }

  recordQueueProcessingTime(queueName, duration) {
    this.metrics.get('queueProcessingTime').observe({ queue_name: queueName }, duration);
  }

  /**
   * Get metrics as Prometheus format
   */
  async getMetrics() {
    return this.registry.metrics();
  }

  /**
   * Get specific metric
   */
  getMetric(name) {
    return this.metrics.get(name);
  }

  /**
   * Register custom metric
   */
  registerMetric(name, metric) {
    this.metrics.set(name, metric);
    this.registry.register(metric);
  }

  /**
   * Remove metric
   */
  removeMetric(name) {
    const metric = this.metrics.get(name);
    if (metric) {
      this.registry.unregister(metric);
      this.metrics.delete(name);
    }
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics.forEach(metric => {
      if (metric.reset) {
        metric.reset();
      }
    });
  }

  /**
   * Get metrics summary
   */
  async getMetricsSummary() {
    const metrics = await this.registry.metrics();
    const summary = {
      timestamp: new Date().toISOString(),
      totalMetrics: this.metrics.size,
      registry: 'prometheus',
      metrics: {}
    };

    // Parse metrics and create summary
    const lines = metrics.split('\n');
    const currentMetric = null;

    for (const line of lines) {
      if (line.startsWith('# HELP') || line.startsWith('# TYPE')) {
        continue;
      }

      if (line.includes('{') || line.includes(' ')) {
        const parts = line.split(' ');
        if (parts.length >= 2) {
          const metricName = parts[0];
          const value = parseFloat(parts[1]);

          if (!summary.metrics[metricName]) {
            summary.metrics[metricName] = [];
          }

          summary.metrics[metricName].push({
            value: value,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return summary;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const metrics = await this.getMetrics();

      return {
        status: 'healthy',
        service: 'metrics',
        registry: 'prometheus',
        totalMetrics: this.metrics.size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'metrics',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = MetricsService;
