/**
 * Metrics Middleware
 *
 * Express middleware for collecting Prometheus metrics
 */

const MetricsService = require('../services/monitoring/MetricsService');

// Create metrics service instance
const metricsService = new MetricsService();

/**
 * HTTP request metrics middleware
 */
const httpMetricsMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = (Date.now() - startTime) / 1000;

    // Record metrics
    metricsService.recordHttpRequest(
      req.method,
      req.route ? req.route.path : req.path,
      res.statusCode,
      duration
    );

    // Record API usage
    metricsService.recordAPIUsage(
      req.path,
      req.method,
      req.user ? req.user.role : 'anonymous'
    );

    // Call original end
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Database query metrics middleware
 */
const databaseMetricsMiddleware = (req, res, next) => {
  // Store original database methods
  const originalQuery = req.db?.query;
  const originalQueryMongo = req.db?.queryMongo;

  if (originalQuery) {
    req.db.query = function(sql, params) {
      const startTime = Date.now();

      return originalQuery.call(this, sql, params)
        .then(result => {
          const duration = (Date.now() - startTime) / 1000;
          metricsService.recordDatabaseOperation('postgres', 'query', 'success', duration);
          return result;
        })
        .catch(error => {
          const duration = (Date.now() - startTime) / 1000;
          metricsService.recordDatabaseOperation('postgres', 'query', 'error', duration);
          throw error;
        });
    };
  }

  if (originalQueryMongo) {
    req.db.queryMongo = function(collection, operation, query, options) {
      const startTime = Date.now();

      return originalQueryMongo.call(this, collection, operation, query, options)
        .then(result => {
          const duration = (Date.now() - startTime) / 1000;
          metricsService.recordDatabaseOperation('mongodb', operation, 'success', duration);
          return result;
        })
        .catch(error => {
          const duration = (Date.now() - startTime) / 1000;
          metricsService.recordDatabaseOperation('mongodb', operation, 'error', duration);
          throw error;
        });
    };
  }

  next();
};

/**
 * User action metrics middleware
 */
const userActionMetricsMiddleware = (req, res, next) => {
  const originalJson = res.json;

  res.json = function(data) {
    // Record user actions based on endpoint
    if (req.user && req.path) {
      const action = getActionFromPath(req.path, req.method);
      const userType = req.user.role || 'regular';

      if (action) {
        metricsService.recordUserAction(action, userType);
      }

      // Record feature usage
      const feature = getFeatureFromPath(req.path);
      if (feature) {
        metricsService.recordFeatureUsage(feature, userType);
      }
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Performance monitoring middleware
 */
const performanceMonitoringMiddleware = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - startTime) / 1000000; // Convert to milliseconds

    // Record response time
    const service = getServiceFromPath(req.path);
    const operation = getOperationFromPath(req.path, req.method);

    metricsService.recordResponseTime(service, operation, duration / 1000);

    // Update memory usage
    const memUsage = process.memoryUsage();
    metricsService.updateMemoryUsage('heap_used', memUsage.heapUsed);
    metricsService.updateMemoryUsage('heap_total', memUsage.heapTotal);
    metricsService.updateMemoryUsage('external', memUsage.external);

    // Update CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    metricsService.updateCPUUsage('process', cpuPercent);
  });

  next();
};

/**
 * Helper function to extract action from path
 */
function getActionFromPath(path, method) {
  const pathSegments = path.split('/').filter(Boolean);

  if (pathSegments.includes('auth')) {
    if (pathSegments.includes('login')) return 'login';
    if (pathSegments.includes('logout')) return 'logout';
    if (pathSegments.includes('register')) return 'register';
    return 'auth';
  }

  if (pathSegments.includes('trade')) {
    return method === 'POST' ? 'trade_execute' : 'trade_view';
  }

  if (pathSegments.includes('portfolio')) {
    return 'portfolio_view';
  }

  if (pathSegments.includes('analytics')) {
    return 'analytics_view';
  }

  return null;
}

/**
 * Helper function to extract feature from path
 */
function getFeatureFromPath(path) {
  const pathSegments = path.split('/').filter(Boolean);

  if (pathSegments.includes('ai')) return 'ai_services';
  if (pathSegments.includes('quantum')) return 'quantum_optimization';
  if (pathSegments.includes('metaverse')) return 'metaverse';
  if (pathSegments.includes('avatars')) return 'synthetic_avatars';
  if (pathSegments.includes('agents')) return 'autonomous_agents';
  if (pathSegments.includes('emotion')) return 'emotion_detection';
  if (pathSegments.includes('fraud')) return 'fraud_detection';
  if (pathSegments.includes('social')) return 'social_trading';
  if (pathSegments.includes('islamic')) return 'islamic_finance';

  return null;
}

/**
 * Helper function to extract service from path
 */
function getServiceFromPath(path) {
  const pathSegments = path.split('/').filter(Boolean);
  return pathSegments[0] || 'unknown';
}

/**
 * Helper function to extract operation from path
 */
function getOperationFromPath(path, method) {
  const pathSegments = path.split('/').filter(Boolean);
  const endpoint = pathSegments[pathSegments.length - 1] || 'unknown';
  return `${method.toLowerCase()}_${endpoint}`;
}

/**
 * Combined metrics middleware
 */
const metricsMiddleware = [
  httpMetricsMiddleware,
  databaseMetricsMiddleware,
  userActionMetricsMiddleware,
  performanceMonitoringMiddleware
];

module.exports = {
  metricsMiddleware,
  httpMetricsMiddleware,
  databaseMetricsMiddleware,
  userActionMetricsMiddleware,
  performanceMonitoringMiddleware,
  metricsService
};
