/**
 * APM Middleware
 *
 * Express middleware for application performance monitoring
 */

const APMService = require('../services/monitoring/APMService');

// Create APM service instance
const apmService = new APMService();

/**
 * APM middleware for Express
 */
const apmMiddleware = (req, res, next) => {
  // Start transaction
  const transactionId = apmService.startTransaction(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id
  });

  // Store transaction ID in request for use in other middleware
  req.apmTransactionId = transactionId;

  const startTime = Date.now();

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Record API call
    apmService.recordAPICall(
      req.path,
      req.method,
      res.statusCode,
      responseTime,
      {
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        contentLength: res.get('Content-Length') || 0
      }
    );

    // End transaction
    apmService.endTransaction(transactionId, 'completed');

    // Call original end
    originalEnd.call(this, chunk, encoding);
  };

  // Handle errors
  const originalError = res.error;
  res.error = function(error) {
    // Record error
    apmService.recordError('api_error', error, {
      method: req.method,
      path: req.path,
      userId: req.user?.id,
      ip: req.ip
    });

    // End transaction with error
    apmService.endTransaction(transactionId, 'failed', error);

    // Call original error handler
    if (originalError) {
      originalError.call(this, error);
    }
  };

  next();
};

/**
 * Database monitoring middleware
 */
const databaseAPMMiddleware = (req, res, next) => {
  // Store original database methods
  const originalQuery = req.db?.query;
  const originalQueryMongo = req.db?.queryMongo;

  if (originalQuery) {
    req.db.query = function(sql, params) {
      const startTime = Date.now();

      return originalQuery.call(this, sql, params)
        .then(result => {
          const queryTime = Date.now() - startTime;
          apmService.recordDatabaseQuery(sql, 'query', queryTime, true, {
            userId: req.user?.id,
            resultCount: Array.isArray(result) ? result.length : 1
          });
          return result;
        })
        .catch(error => {
          const queryTime = Date.now() - startTime;
          apmService.recordDatabaseQuery(sql, 'query', queryTime, false, {
            userId: req.user?.id,
            error: error.message
          });
          throw error;
        });
    };
  }

  if (originalQueryMongo) {
    req.db.queryMongo = function(collection, operation, query, options) {
      const startTime = Date.now();

      return originalQueryMongo.call(this, collection, operation, query, options)
        .then(result => {
          const queryTime = Date.now() - startTime;
          apmService.recordDatabaseQuery(
            `${operation} ${collection}`,
            operation,
            queryTime,
            true,
            {
              userId: req.user?.id,
              collection,
              resultCount: Array.isArray(result) ? result.length : 1
            }
          );
          return result;
        })
        .catch(error => {
          const queryTime = Date.now() - startTime;
          apmService.recordDatabaseQuery(
            `${operation} ${collection}`,
            operation,
            queryTime,
            false,
            {
              userId: req.user?.id,
              collection,
              error: error.message
            }
          );
          throw error;
        });
    };
  }

  next();
};

/**
 * Business transaction monitoring middleware
 */
const businessTransactionMiddleware = (req, res, next) => {
  // Monitor business transactions
  if (req.path.includes('/trade') && req.method === 'POST') {
    req.on('data', (chunk) => {
      try {
        const tradeData = JSON.parse(chunk);
        apmService.recordBusinessTransaction('trade', tradeData.amount, {
          userId: req.user?.id,
          asset: tradeData.asset,
          type: tradeData.type
        });
      } catch (error) {
        // Ignore parsing errors
      }
    });
  }

  if (req.path.includes('/portfolio') && req.method === 'PUT') {
    apmService.recordBusinessTransaction('portfolio_update', null, {
      userId: req.user?.id
    });
  }

  if (req.path.includes('/ai/') && req.method === 'POST') {
    apmService.recordBusinessTransaction('ai_request', null, {
      userId: req.user?.id,
      endpoint: req.path
    });
  }

  if (req.path.includes('/notifications') && req.method === 'POST') {
    apmService.recordBusinessTransaction('notification', null, {
      userId: req.user?.id,
      endpoint: req.path
    });
  }

  next();
};

/**
 * Custom performance marker middleware
 */
const performanceMarkerMiddleware = (markerName) => {
  return (req, res, next) => {
    if (req.apmTransactionId) {
      apmService.addMarker(req.apmTransactionId, markerName, {
        timestamp: new Date(),
        userId: req.user?.id,
        path: req.path
      });
    }
    next();
  };
};

/**
 * Error tracking middleware
 */
const errorTrackingMiddleware = (req, res, next) => {
  // Track unhandled errors
  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode >= 400 && req.apmTransactionId) {
      apmService.recordError('http_error', {
        message: `HTTP ${res.statusCode}`,
        statusCode: res.statusCode,
        path: req.path,
        method: req.method
      }, {
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      apmService.endTransaction(req.apmTransactionId, 'failed', new Error(`HTTP ${res.statusCode}`));
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Combined APM middleware
 */
const combinedAPMMiddleware = [
  apmMiddleware,
  databaseAPMMiddleware,
  businessTransactionMiddleware,
  errorTrackingMiddleware
];

module.exports = {
  apmMiddleware,
  databaseAPMMiddleware,
  businessTransactionMiddleware,
  performanceMarkerMiddleware,
  errorTrackingMiddleware,
  combinedAPMMiddleware,
  apmService
};
