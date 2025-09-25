/**
 * Validation Middleware using Joi
 * Provides request validation for all API endpoints
 */

// const Joi = require('joi');
const schemas = require('./schemas');

class ValidationMiddleware {
  /**
   * Generic validation middleware factory
   */
  validate(schema, source = 'body') {
    return (req, res, next) => {
      try {
        const data = req[source];

        // Validate the data
        const { error, value } = schema.validate(data, {
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });

        if (error) {
          const validationErrors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));

          return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: validationErrors,
            message: 'Please check your input and try again'
          });
        }

        // Replace the original data with validated and sanitized data
        req[source] = value;
        next();
      } catch (validationError) {
        logger.error('Validation middleware error:', validationError);
        return res.status(500).json({
          error: 'Validation system error',
          code: 'VALIDATION_SYSTEM_ERROR'
        });
      }
    };
  }

  /**
   * Validate request body
   */
  validateBody(schema) {
    return this.validate(schema, 'body');
  }

  /**
   * Validate query parameters
   */
  validateQuery(schema) {
    return this.validate(schema, 'query');
  }

  /**
   * Validate URL parameters
   */
  validateParams(schema) {
    return this.validate(schema, 'params');
  }

  /**
   * Validate headers
   */
  validateHeaders(schema) {
    return this.validate(schema, 'headers');
  }

  /**
   * Custom validation for specific use cases
   */
  validateFileUpload(req, res, next) {
    if (!req.file && !req.files) {
      return res.status(400).json({
        error: 'No file uploaded',
        code: 'NO_FILE_UPLOADED'
      });
    }

    const file = req.file || req.files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type',
        code: 'INVALID_FILE_TYPE',
        allowedTypes: ['jpeg', 'png', 'gif', 'pdf']
      });
    }

    if (file.size > maxSize) {
      return res.status(400).json({
        error: 'File too large',
        code: 'FILE_TOO_LARGE',
        maxSize: '10MB'
      });
    }

    next();
  }

  /**
   * Validate pagination parameters
   */
  validatePagination(req, res, next) {
    const { limit, offset, sortBy, sortOrder } = req.query;

    // Set defaults
    req.query.limit = parseInt(limit) || 20;
    req.query.offset = parseInt(offset) || 0;
    req.query.sortBy = sortBy || 'createdAt';
    req.query.sortOrder = sortOrder || 'desc';

    // Validate limits
    if (req.query.limit < 1 || req.query.limit > 100) {
      return res.status(400).json({
        error: 'Invalid limit parameter',
        code: 'INVALID_LIMIT',
        message: 'Limit must be between 1 and 100'
      });
    }

    if (req.query.offset < 0) {
      return res.status(400).json({
        error: 'Invalid offset parameter',
        code: 'INVALID_OFFSET',
        message: 'Offset must be non-negative'
      });
    }

    next();
  }

  /**
   * Validate date range
   */
  validateDateRange(req, res, next) {
    const { startDate, endDate } = req.query;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          error: 'Invalid date format',
          code: 'INVALID_DATE_FORMAT',
          message: 'Dates must be in ISO format (YYYY-MM-DD)'
        });
      }

      if (start > end) {
        return res.status(400).json({
          error: 'Invalid date range',
          code: 'INVALID_DATE_RANGE',
          message: 'Start date must be before end date'
        });
      }

      // Check if date range is not too large (max 1 year)
      const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
      if (end - start > maxRange) {
        return res.status(400).json({
          error: 'Date range too large',
          code: 'DATE_RANGE_TOO_LARGE',
          message: 'Maximum date range is 1 year'
        });
      }
    }

    next();
  }

  /**
   * Validate UUID parameters
   */
  validateUUID(paramName) {
    return (req, res, next) => {
      const value = req.params[paramName];
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(value)) {
        return res.status(400).json({
          error: 'Invalid UUID format',
          code: 'INVALID_UUID',
          field: paramName,
          message: `${paramName} must be a valid UUID`
        });
      }

      next();
    };
  }

  /**
   * Validate email format
   */
  validateEmail(req, res, next) {
    const { email } = req.body;

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Invalid email format',
          code: 'INVALID_EMAIL',
          message: 'Please provide a valid email address'
        });
      }
    }

    next();
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(req, res, next) {
    const { password } = req.body;

    if (password) {
      const minLength = 8;
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChar = /[@$!%*?&]/.test(password);

      const errors = [];

      if (password.length < minLength) {
        errors.push(`Password must be at least ${minLength} characters long`);
      }
      if (!hasUpperCase) {
        errors.push('Password must contain at least one uppercase letter');
      }
      if (!hasLowerCase) {
        errors.push('Password must contain at least one lowercase letter');
      }
      if (!hasNumbers) {
        errors.push('Password must contain at least one number');
      }
      if (!hasSpecialChar) {
        errors.push('Password must contain at least one special character (@$!%*?&)');
      }

      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Password does not meet requirements',
          code: 'WEAK_PASSWORD',
          requirements: errors
        });
      }
    }

    next();
  }

  /**
   * Validate API key format
   */
  validateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];

    if (apiKey) {
      // Remove 'Bearer ' prefix if present
      const key = apiKey.replace(/^Bearer\s+/i, '');

      // Check if it looks like a valid API key (alphanumeric with dashes, 32+ chars)
      const apiKeyRegex = /^[a-zA-Z0-9-]{32,}$/;

      if (!apiKeyRegex.test(key)) {
        return res.status(401).json({
          error: 'Invalid API key format',
          code: 'INVALID_API_KEY'
        });
      }

      req.apiKey = key;
    }

    next();
  }

  /**
   * Validate rate limit headers
   */
  validateRateLimit(req, res, next) {
    const rateLimitInfo = req.rateLimitInfo;

    if (rateLimitInfo && rateLimitInfo.remaining === 0) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(rateLimitInfo.resetTime / 1000)
      });
    }

    next();
  }

  /**
   * Validate content type for file uploads
   */
  validateContentType(allowedTypes = ['application/json']) {
    return (req, res, next) => {
      const contentType = req.get('Content-Type');

      if (!contentType) {
        return res.status(400).json({
          error: 'Content-Type header required',
          code: 'MISSING_CONTENT_TYPE'
        });
      }

      const isValidType = allowedTypes.some(type =>
        contentType.toLowerCase().includes(type.toLowerCase())
      );

      if (!isValidType) {
        return res.status(415).json({
          error: 'Unsupported media type',
          code: 'UNSUPPORTED_MEDIA_TYPE',
          allowedTypes
        });
      }

      next();
    };
  }

  /**
   * Validate request size
   */
  validateRequestSize(maxSize = 1024 * 1024) { // 1MB default
    return (req, res, next) => {
      const contentLength = parseInt(req.get('Content-Length') || '0');

      if (contentLength > maxSize) {
        return res.status(413).json({
          error: 'Request entity too large',
          code: 'REQUEST_TOO_LARGE',
          maxSize: `${maxSize / (1024 * 1024)}MB`
        });
      }

      next();
    };
  }
}

// Create singleton instance
const validationMiddleware = new ValidationMiddleware();

// Export convenience functions
const {
  validateBody,
  validateQuery,
  validateParams,
  validateHeaders,
  validateFileUpload,
  validatePagination,
  validateDateRange,
  validateUUID,
  validateEmail,
  validatePasswordStrength,
  validateApiKey,
  validateRateLimit,
  validateContentType,
  validateRequestSize
} = validationMiddleware;

module.exports = {
  validationMiddleware,
  validateBody,
  validateQuery,
  validateParams,
  validateHeaders,
  validateFileUpload,
  validatePagination,
  validateDateRange,
  validateUUID,
  validateEmail,
  validatePasswordStrength,
  validateApiKey,
  validateRateLimit,
  validateContentType,
  validateRequestSize,
  schemas
};
