/**
 * Sentry Configuration for FinAI Nexus
 * Error tracking and performance monitoring
 */

let Sentry;
try {
  Sentry = require('@sentry/node');
} catch (error) {
  logger.info('⚠️ Sentry not available - continuing without error tracking');
  Sentry = null;
}

function initSentry() {
  if (Sentry && process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Filter sensitive data
      beforeSend(event) {
        // Remove sensitive headers
        if (event.request && event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
          delete event.request.headers['x-api-key'];
        }

        // Remove sensitive user data
        if (event.user) {
          delete event.user.email;
          delete event.user.password;
          delete event.user.creditCard;
        }

        // Remove sensitive extra data
        if (event.extra) {
          delete event.extra.password;
          delete event.extra.token;
          delete event.extra.apiKey;
        }

        return event;
      },

      // Custom tags
      initialScope: {
        tags: {
          service: 'finnexus-backend',
          version: process.env.npm_package_version || '1.0.0'
        }
      },

      // Performance monitoring
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app: require('express') }),
        new Sentry.Integrations.Postgres(),
        new Sentry.Integrations.Mongo()
      ]
    });

    logger.info('✅ Sentry initialized for error tracking');
  } else {
    logger.info('⚠️ Sentry not initialized (missing SENTRY_DSN or not in production)');
  }
}

// Sentry middleware for Express (with fallbacks)
const sentryMiddleware = {
  requestHandler: Sentry ? Sentry.requestHandler : (req, res, next) => next(),
  tracingHandler: Sentry ? Sentry.tracingHandler : (req, res, next) => next(),
  errorHandler: Sentry ? Sentry.errorHandler : (err, req, res, next) => next(err)
};

// Custom error reporting function
function reportError(error, context = {}) {
  if (Sentry && process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      // Add context information
      Object.keys(context).forEach(key => {
        scope.setTag(key, context[key]);
      });

      // Set user context if available
      if (context.userId) {
        scope.setUser({ id: context.userId });
      }

      // Report the error
      Sentry.captureException(error);
    });
  } else {
    // Log to console in development
    logger.error('Error reported:', error.message, context);
  }
}

// Custom performance monitoring
function trackPerformance(name, fn) {
  return async(...args) => {
    const start = Date.now();
    try {
      const result = await fn(...args);
      const duration = Date.now() - start;

      if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
        Sentry.addBreadcrumb({
          message: `Performance: ${name}`,
          level: 'info',
          data: { duration }
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;

      reportError(error, {
        operation: name,
        duration,
        performance: true
      });

      throw error;
    }
  };
}

module.exports = {
  initSentry,
  sentryMiddleware,
  reportError,
  trackPerformance,
  Sentry
};
