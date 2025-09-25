/**
 * Enhanced Audit Logging System
 * Comprehensive logging for compliance, security, and monitoring
 */

const crypto = require('crypto');
const databaseManager = require('./config/database');

class AuditLogger {
  constructor() {
    this.sensitiveEndpoints = [
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/trade',
      '/api/v1/portfolio',
      '/api/v1/admin',
      '/api/v1/user'
    ];

    this.sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'credit_card'];
    this.auditLevels = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4
    };
  }

  /**
   * Main audit middleware
   */
  auditMiddleware(req, res, next) {
    const startTime = Date.now();
    const auditId = this.generateAuditId();

    // Store original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    // Override response methods to capture response data
    res.send = function(data) {
      res.auditData = data;
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      res.auditData = data;
      return originalJson.call(this, data);
    };

    res.end = function(data) {
      res.auditData = data;
      return originalEnd.call(this, data);
    };

    // Log request
    req.auditId = auditId;
    req.auditStartTime = startTime;

    // Log audit entry after response
    res.on('finish', () => {
      this.logAuditEntry(req, res, auditId, startTime);
    });

    next();
  }

  /**
   * Generate unique audit ID
   */
  generateAuditId() {
    return `AUDIT-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Log audit entry
   */
  async logAuditEntry(req, res, auditId, startTime) {
    try {
      const endTime = Date.now();
      const duration = endTime - startTime;

      const auditEntry = {
        auditId,
        timestamp: new Date().toISOString(),
        userId: req.user?.userId || 'anonymous',
        userRole: req.user?.role || 'guest',
        ip: this.getClientIP(req),
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        query: this.sanitizeData(req.query),
        body: this.sanitizeData(req.body),
        params: this.sanitizeData(req.params),
        statusCode: res.statusCode,
        responseTime: duration,
        responseSize: this.getResponseSize(res.auditData),
        auditLevel: this.getAuditLevel(req),
        riskScore: this.calculateRiskScore(req, res),
        sessionId: req.sessionID,
        correlationId: req.headers['x-correlation-id'],
        referer: req.get('Referer'),
        country: req.headers['x-country-code'],
        deviceFingerprint: this.generateDeviceFingerprint(req),
        securityFlags: this.getSecurityFlags(req, res),
        complianceFlags: this.getComplianceFlags(req, res),
        metadata: {
          apiVersion: req.headers['x-api-version'],
          clientVersion: req.headers['x-client-version'],
          requestId: req.headers['x-request-id']
        }
      };

      // Store in database
      await this.storeAuditEntry(auditEntry);

      // Log to console for development
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`[AUDIT] ${auditEntry.auditId} - ${auditEntry.userId} - ${auditEntry.method} ${auditEntry.path} - ${auditEntry.statusCode} - ${auditEntry.duration}ms`);
      }

      // Send alerts for high-risk activities
      if (auditEntry.riskScore > 7) {
        await this.sendSecurityAlert(auditEntry);
      }

    } catch (error) {
      logger.error('Audit logging error:', error);
    }
  }

  /**
   * Sanitize sensitive data
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = JSON.parse(JSON.stringify(data));

    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (this.sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  /**
   * Get client IP address
   */
  getClientIP(req) {
    return req.ip ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           'unknown';
  }

  /**
   * Get response size
   */
  getResponseSize(data) {
    if (!data) return 0;
    return Buffer.byteLength(JSON.stringify(data), 'utf8');
  }

  /**
   * Determine audit level based on request
   */
  getAuditLevel(req) {
    const path = req.path.toLowerCase();
    const method = req.method.toUpperCase();

    // Critical operations
    if (path.includes('admin') || path.includes('delete') || path.includes('reset')) {
      return this.auditLevels.CRITICAL;
    }

    // High-risk operations
    if (path.includes('trade') || path.includes('transfer') || path.includes('payment')) {
      return this.auditLevels.HIGH;
    }

    // Medium-risk operations
    if (path.includes('portfolio') || path.includes('analytics') || method === 'POST') {
      return this.auditLevels.MEDIUM;
    }

    // Low-risk operations
    return this.auditLevels.LOW;
  }

  /**
   * Calculate risk score for the request
   */
  calculateRiskScore(req, res) {
    let score = 0;

    // Authentication risk
    if (!req.user) score += 2;
    if (req.user?.role === 'guest') score += 1;

    // Endpoint risk
    if (this.sensitiveEndpoints.some(endpoint => req.path.includes(endpoint))) {
      score += 3;
    }

    // Method risk
    if (req.method === 'DELETE') score += 3;
    if (req.method === 'PUT' || req.method === 'PATCH') score += 2;

    // Response risk
    if (res.statusCode >= 400) score += 1;
    if (res.statusCode >= 500) score += 2;

    // IP risk (could be enhanced with IP reputation service)
    const ip = this.getClientIP(req);
    if (ip === 'unknown' || ip.includes('::1')) score += 1;

    // Rate limiting risk (if implemented)
    if (req.rateLimitInfo && req.rateLimitInfo.remaining < 10) {
      score += 2;
    }

    return Math.min(score, 10); // Cap at 10
  }

  /**
   * Get security flags
   */
  getSecurityFlags(req, res) {
    const flags = [];

    if (!req.user) flags.push('UNAUTHENTICATED');
    if (res.statusCode === 401) flags.push('AUTH_FAILURE');
    if (res.statusCode === 403) flags.push('AUTHORIZATION_FAILURE');
    if (req.method === 'DELETE') flags.push('DESTRUCTIVE_ACTION');
    if (this.sensitiveEndpoints.some(endpoint => req.path.includes(endpoint))) {
      flags.push('SENSITIVE_ENDPOINT');
    }
    if (req.headers['x-forwarded-for']) flags.push('PROXY_REQUEST');
    if (!req.headers['user-agent']) flags.push('NO_USER_AGENT');

    return flags;
  }

  /**
   * Get compliance flags
   */
  getComplianceFlags(req, res) {
    const flags = [];

    if (req.user?.role === 'admin') flags.push('ADMIN_ACCESS');
    if (req.path.includes('personal-data')) flags.push('PII_ACCESS');
    if (req.path.includes('financial-data')) flags.push('FINANCIAL_DATA_ACCESS');
    if (req.method === 'POST' && req.path.includes('user')) flags.push('USER_CREATION');
    if (req.method === 'DELETE' && req.path.includes('user')) flags.push('USER_DELETION');

    return flags;
  }

  /**
   * Generate device fingerprint
   */
  generateDeviceFingerprint(req) {
    const components = [
      req.get('User-Agent'),
      req.get('Accept-Language'),
      req.get('Accept-Encoding'),
      req.ip
    ].filter(Boolean);

    return crypto.createHash('sha256')
      .update(components.join('|'))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Store audit entry in database
   */
  async storeAuditEntry(auditEntry) {
    try {
      // Store in PostgreSQL for structured queries
      await databaseManager.queryPostgres(
        `INSERT INTO audit_logs (
          audit_id, timestamp, user_id, user_role, ip, user_agent,
          method, path, original_url, query, body, params,
          status_code, response_time, response_size, audit_level,
          risk_score, session_id, correlation_id, referer, country,
          device_fingerprint, security_flags, compliance_flags, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
        [
          auditEntry.auditId, auditEntry.timestamp, auditEntry.userId,
          auditEntry.userRole, auditEntry.ip, auditEntry.userAgent,
          auditEntry.method, auditEntry.path, auditEntry.originalUrl,
          JSON.stringify(auditEntry.query), JSON.stringify(auditEntry.body),
          JSON.stringify(auditEntry.params), auditEntry.statusCode,
          auditEntry.responseTime, auditEntry.responseSize, auditEntry.auditLevel,
          auditEntry.riskScore, auditEntry.sessionId, auditEntry.correlationId,
          auditEntry.referer, auditEntry.country, auditEntry.deviceFingerprint,
          JSON.stringify(auditEntry.securityFlags), JSON.stringify(auditEntry.complianceFlags),
          JSON.stringify(auditEntry.metadata)
        ]
      );

      // Also store in MongoDB for flexible queries
      await databaseManager.queryMongo(
        'audit_logs',
        'insertOne',
        auditEntry
      );

    } catch (error) {
      logger.error('Failed to store audit entry:', error);
      // Fallback to console logging
      logger.info(`[AUDIT-FALLBACK] ${JSON.stringify(auditEntry)}`);
    }
  }

  /**
   * Send security alert for high-risk activities
   */
  async sendSecurityAlert(auditEntry) {
    try {
      // In production, integrate with alerting systems (Slack, PagerDuty, etc.)
      logger.warn('[SECURITY-ALERT] High-risk activity detected:', {
        auditId: auditEntry.auditId,
        userId: auditEntry.userId,
        riskScore: auditEntry.riskScore,
        action: `${auditEntry.method} ${auditEntry.path}`,
        ip: auditEntry.ip,
        securityFlags: auditEntry.securityFlags
      });

      // Store alert in database
      await databaseManager.queryPostgres(
        `INSERT INTO security_alerts (audit_id, user_id, risk_score, alert_type, details, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          auditEntry.auditId,
          auditEntry.userId,
          auditEntry.riskScore,
          'HIGH_RISK_ACTIVITY',
          JSON.stringify({
            method: auditEntry.method,
            path: auditEntry.path,
            ip: auditEntry.ip,
            securityFlags: auditEntry.securityFlags
          }),
          new Date()
        ]
      );

    } catch (error) {
      logger.error('Failed to send security alert:', error);
    }
  }

  /**
   * Query audit logs
   */
  async queryAuditLogs(filters = {}, limit = 100, offset = 0) {
    try {
      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const params = [];
      let paramCount = 0;

      // Add filters
      if (filters.userId) {
        query += ` AND user_id = $${++paramCount}`;
        params.push(filters.userId);
      }

      if (filters.startDate) {
        query += ` AND timestamp >= $${++paramCount}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND timestamp <= $${++paramCount}`;
        params.push(filters.endDate);
      }

      if (filters.minRiskScore) {
        query += ` AND risk_score >= $${++paramCount}`;
        params.push(filters.minRiskScore);
      }

      if (filters.securityFlags) {
        query += ` AND security_flags::jsonb ? $${++paramCount}`;
        params.push(filters.securityFlags);
      }

      // Add ordering and pagination
      query += ` ORDER BY timestamp DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      params.push(limit, offset);

      const result = await databaseManager.queryPostgres(query, params);
      return result.rows;

    } catch (error) {
      logger.error('Failed to query audit logs:', error);
      throw error;
    }
  }
}

// Create singleton instance
const auditLogger = new AuditLogger();

// Export middleware function for backward compatibility
const auditMiddleware = (req, res, next) => auditLogger.auditMiddleware(req, res, next);

module.exports = auditMiddleware;
module.exports.AuditLogger = auditLogger;
