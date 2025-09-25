/**
 * Enhanced Error Handling System
 * Centralized error handling with logging, monitoring, and user-friendly responses
 */

const databaseManager = require('../config/database');

class CustomError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

class ErrorHandler {
  constructor() {
    this.errorTypes = {
      // Authentication errors
      AUTHENTICATION_FAILED: { status: 401, message: 'Authentication failed' },
      TOKEN_EXPIRED: { status: 401, message: 'Token has expired' },
      INVALID_TOKEN: { status: 401, message: 'Invalid token provided' },
      INSUFFICIENT_PERMISSIONS: { status: 403, message: 'Insufficient permissions' },

      // Validation errors
      VALIDATION_ERROR: { status: 400, message: 'Validation failed' },
      INVALID_INPUT: { status: 400, message: 'Invalid input provided' },
      MISSING_REQUIRED_FIELD: { status: 400, message: 'Required field is missing' },

      // Resource errors
      RESOURCE_NOT_FOUND: { status: 404, message: 'Resource not found' },
      RESOURCE_CONFLICT: { status: 409, message: 'Resource conflict' },
      RESOURCE_FORBIDDEN: { status: 403, message: 'Access to resource forbidden' },

      // Business logic errors
      INSUFFICIENT_FUNDS: { status: 400, message: 'Insufficient funds' },
      TRADE_FAILED: { status: 400, message: 'Trade execution failed' },
      PORTFOLIO_LIMIT_EXCEEDED: { status: 400, message: 'Portfolio limit exceeded' },

      // External service errors
      EXTERNAL_SERVICE_ERROR: { status: 502, message: 'External service unavailable' },
      BLOCKCHAIN_ERROR: { status: 502, message: 'Blockchain service error' },
      MARKET_DATA_ERROR: { status: 502, message: 'Market data service error' },

      // System errors
      DATABASE_ERROR: { status: 500, message: 'Database operation failed' },
      INTERNAL_SERVER_ERROR: { status: 500, message: 'Internal server error' },
      SERVICE_UNAVAILABLE: { status: 503, message: 'Service temporarily unavailable' }
    };

    this.logLevels = {
      ERROR: 'error',
      WARN: 'warn',
      INFO: 'info',
      DEBUG: 'debug'
    };
  }

  /**
   * Create a new custom error
   */
  createError(message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    return new CustomError(message, statusCode, code, isOperational);
  }

  /**
   * Handle errors from predefined types
   */
  createTypedError(errorType, customMessage = null, details = null) {
    const errorConfig = this.errorTypes[errorType];
    if (!errorConfig) {
      return this.createError('Unknown error type', 500, 'UNKNOWN_ERROR_TYPE');
    }

    const message = customMessage || errorConfig.message;
    const error = new CustomError(message, errorConfig.status, errorType, true);

    if (details) {
      error.details = details;
    }

    return error;
  }

  /**
   * Main error handling middleware
   */
  handleError(err, req, res, next) {
    let error = err;

    // Convert non-CustomError instances to CustomError
    if (!(err instanceof CustomError)) {
      error = this.convertToCustomError(err);
    }

    // Log the error
    this.logError(error, req);

    // Send error response
    this.sendErrorResponse(error, req, res);
  }

  /**
   * Convert various error types to CustomError
   */
  convertToCustomError(err) {
    // Joi validation errors
    if (err.isJoi) {
      return new CustomError(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        true
      );
    }

    // Database errors
    if (err.code === '23505') { // PostgreSQL unique violation
      return new CustomError(
        'Resource already exists',
        409,
        'RESOURCE_CONFLICT',
        true
      );
    }

    if (err.code === '23503') { // PostgreSQL foreign key violation
      return new CustomError(
        'Referenced resource not found',
        400,
        'INVALID_REFERENCE',
        true
      );
    }

    if (err.code === '23502') { // PostgreSQL not null violation
      return new CustomError(
        'Required field is missing',
        400,
        'MISSING_REQUIRED_FIELD',
        true
      );
    }

    // MongoDB errors
    if (err.name === 'MongoError' && err.code === 11000) {
      return new CustomError(
        'Resource already exists',
        409,
        'RESOURCE_CONFLICT',
        true
      );
    }

    if (err.name === 'ValidationError') {
      return new CustomError(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        true
      );
    }

    if (err.name === 'CastError') {
      return new CustomError(
        'Invalid data format',
        400,
        'INVALID_INPUT',
        true
      );
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      return new CustomError(
        'Invalid token',
        401,
        'INVALID_TOKEN',
        true
      );
    }

    if (err.name === 'TokenExpiredError') {
      return new CustomError(
        'Token has expired',
        401,
        'TOKEN_EXPIRED',
        true
      );
    }

    // Network errors
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return new CustomError(
        'External service unavailable',
        502,
        'EXTERNAL_SERVICE_ERROR',
        true
      );
    }

    if (err.code === 'ETIMEDOUT') {
      return new CustomError(
        'Request timeout',
        408,
        'REQUEST_TIMEOUT',
        true
      );
    }

    // Generic error fallback
    return new CustomError(
      err.message || 'Internal server error',
      err.statusCode || 500,
      'INTERNAL_SERVER_ERROR',
      false
    );
  }

  /**
   * Log error with context
   */
  async logError(error, req) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: this.getLogLevel(error.statusCode),
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack
      },
      request: {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        correlationId: req.correlationId,
        userId: req.user?.userId
      },
      environment: process.env.NODE_ENV || 'development'
    };

    // Console logging for development
    if (process.env.NODE_ENV !== 'production') {
      logger.error(`[ERROR] ${logEntry.timestamp} - ${error.code}: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
    }

    // Store in database for production
    try {
      await this.storeErrorLog(logEntry);
    } catch (dbError) {
      logger.error('Failed to store error log:', dbError);
    }

    // Send to monitoring service (Sentry, etc.)
    if (process.env.NODE_ENV === 'production' && !error.isOperational) {
      await this.sendToMonitoring(error, logEntry);
    }
  }

  /**
   * Store error log in database
   */
  async storeErrorLog(logEntry) {
    try {
      await databaseManager.queryPostgres(
        `INSERT INTO error_logs (
          timestamp, level, error_name, error_message, error_code, 
          status_code, stack_trace, request_method, request_url, 
          request_ip, user_agent, correlation_id, user_id, environment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          logEntry.timestamp,
          logEntry.level,
          logEntry.error.name,
          logEntry.error.message,
          logEntry.error.code,
          logEntry.error.statusCode,
          logEntry.error.stack,
          logEntry.request.method,
          logEntry.request.url,
          logEntry.request.ip,
          logEntry.request.userAgent,
          logEntry.request.correlationId,
          logEntry.request.userId,
          logEntry.environment
        ]
      );
    } catch (error) {
      logger.error('Failed to store error log in database:', error);
    }
  }

  /**
   * Send error to monitoring service
   */
  async sendToMonitoring(error, logEntry) {
    // In production, integrate with Sentry, DataDog, or similar
    logger.warn(`[MONITORING] Critical error detected: ${error.code} - ${error.message}`);

    // Store critical errors for alerting
    if (error.statusCode >= 500) {
      try {
        await databaseManager.queryPostgres(
          `INSERT INTO critical_errors (error_code, message, stack_trace, correlation_id, created_at) 
           VALUES ($1, $2, $3, $4, $5)`,
          [error.code, error.message, error.stack, logEntry.request.correlationId, new Date()]
        );
      } catch (dbError) {
        logger.error('Failed to store critical error:', dbError);
      }
    }
  }

  /**
   * Determine log level based on status code
   */
  getLogLevel(statusCode) {
    if (statusCode >= 500) return this.logLevels.ERROR;
    if (statusCode >= 400) return this.logLevels.WARN;
    return this.logLevels.INFO;
  }

  /**
   * Send error response to client
   */
  sendErrorResponse(error, req, res) {
    const response = {
      error: {
        message: error.message,
        code: error.code,
        timestamp: error.timestamp,
        correlationId: req.correlationId
      }
    };

    // Add details if available
    if (error.details) {
      response.error.details = error.details;
    }

    // Add validation errors for Joi
    if (error.isJoi && error.details) {
      response.error.validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
    }

    // Add stack trace in development
    if (process.env.NODE_ENV !== 'production') {
      response.error.stack = error.stack;
    }

    // Add helpful links for common errors
    if (this.getHelpLink(error.code)) {
      response.error.help = this.getHelpLink(error.code);
    }

    res.status(error.statusCode).json(response);
  }

  /**
   * Get help link for error code
   */
  getHelpLink(errorCode) {
    const helpLinks = {
      'VALIDATION_ERROR': '/docs/validation',
      'AUTHENTICATION_FAILED': '/docs/authentication',
      'INSUFFICIENT_PERMISSIONS': '/docs/authorization',
      'RESOURCE_NOT_FOUND': '/docs/api-reference',
      'RATE_LIMIT_EXCEEDED': '/docs/rate-limiting'
    };

    return helpLinks[errorCode];
  }

  /**
   * Async error wrapper for route handlers
   */
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Handle 404 errors
   */
  handleNotFound(req, res, next) {
    const error = this.createTypedError('RESOURCE_NOT_FOUND', `Route ${req.originalUrl} not found`);
    this.handleError(error, req, res, next);
  }

  /**
   * Handle unhandled promise rejections
   */
  handleUnhandledRejection(reason, promise) {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);

    // Log to database
    this.logError({
      message: reason.message || 'Unhandled promise rejection',
      stack: reason.stack,
      statusCode: 500,
      code: 'UNHANDLED_REJECTION'
    }, { method: 'SYSTEM', url: 'UNHANDLED_REJECTION' });
  }

  /**
   * Handle uncaught exceptions
   */
  handleUncaughtException(error) {
    logger.error('Uncaught Exception:', error);

    // Log to database
    this.logError({
      message: error.message,
      stack: error.stack,
      statusCode: 500,
      code: 'UNCAUGHT_EXCEPTION'
    }, { method: 'SYSTEM', url: 'UNCAUGHT_EXCEPTION' });

    // Exit process for uncaught exceptions
    process.exit(1);
  }

  /**
   * Get error statistics
   */
  async getErrorStats(timeframe = '24h') {
    try {
      const timeCondition = this.getTimeCondition(timeframe);

      const result = await databaseManager.queryPostgres(`
        SELECT 
          error_code,
          status_code,
          COUNT(*) as count,
          MAX(timestamp) as last_occurrence
        FROM error_logs 
        WHERE timestamp >= ${timeCondition}
        GROUP BY error_code, status_code
        ORDER BY count DESC
        LIMIT 20
      `);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get error statistics:', error);
      return [];
    }
  }

  /**
   * Get time condition for SQL queries
   */
  getTimeCondition(timeframe) {
    const conditions = {
      '1h': 'NOW() - INTERVAL \'1 hour\'',
      '24h': 'NOW() - INTERVAL \'24 hours\'',
      '7d': 'NOW() - INTERVAL \'7 days\'',
      '30d': 'NOW() - INTERVAL \'30 days\''
    };

    return conditions[timeframe] || conditions['24h'];
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Export error classes and handler
module.exports = {
  CustomError,
  ErrorHandler: errorHandler,
  createError: (message, statusCode, code) => errorHandler.createError(message, statusCode, code),
  createTypedError: (type, message, details) => errorHandler.createTypedError(type, message, details),
  asyncHandler: (fn) => errorHandler.asyncHandler(fn),
  handleNotFound: (req, res, next) => errorHandler.handleNotFound(req, res, next)
};
