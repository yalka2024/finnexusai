/**
 * Request Logger Middleware
 *
 * Logs all incoming requests with detailed information
 */


const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Skip logging for health checks and static files
  if (req.path === '/health' || req.path.startsWith('/static/')) {
    return next();
  }

  // Log request details
  const requestInfo = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    userId: req.user ? req.user.id : null,
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    referer: req.get('Referer')
  };

  // Log query parameters (sanitized)
  if (Object.keys(req.query).length > 0) {
    requestInfo.query = req.query;
  }

  // Log request body for POST/PUT/PATCH (sanitized)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const sanitizedBody = { ...req.body };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'privateKey'];
    sensitiveFields.forEach(field => {
      if (sanitizedBody[field]) {
        sanitizedBody[field] = '[REDACTED]';
      }
    });

    requestInfo.body = sanitizedBody;
  }

  logger.info('Incoming request', requestInfo);

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;

    const responseInfo = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      userId: req.user ? req.user.id : null,
      contentLength: res.get('Content-Length'),
      contentType: res.get('Content-Type')
    };

    // Log response details
    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', responseInfo);
    } else {
      logger.info('Request completed successfully', responseInfo);
    }

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = requestLogger;

