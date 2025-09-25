/**
 * FinAI Nexus - Audit Service
 *
 * Comprehensive audit logging and monitoring featuring:
 * - Real-time audit logging
 * - Security event tracking
 * - Compliance reporting
 * - User activity monitoring
 * - System access logging
 * - Data access tracking
 * - Risk assessment and alerting
 */

// Optional imports - application will work without these dependencies
let uuidv4 = null;

try {
  const uuid = require('uuid');
  const logger = require('../../utils/logger');
  uuidv4 = uuid.v4;
} catch (error) {
  logger.info('⚠️ UUID not available - using fallback ID generation');
  uuidv4 = () => Math.random().toString(36).substr(2, 9);
}


class AuditService {
  constructor() {
    this.auditLogs = new Map(); // Store audit logs in memory
    this.securityEvents = new Map(); // Store security events
    this.userSessions = new Map(); // Track user sessions
    this.accessPatterns = new Map(); // Track access patterns
    this.riskScores = new Map(); // Store risk scores
    this.alertThresholds = {
      failedLogins: 5,
      suspiciousActivity: 3,
      dataAccess: 100,
      apiCalls: 1000
    };

    this.setupAuditCategories();
    this.startAuditProcessing();

    logger.info('AuditService initialized with comprehensive monitoring');
  }

  /**
   * Setup audit categories and their severity levels
   */
  setupAuditCategories() {
    this.auditCategories = {
      // Authentication & Authorization
      'auth.login': { severity: 'info', category: 'authentication' },
      'auth.logout': { severity: 'info', category: 'authentication' },
      'auth.login_failed': { severity: 'warning', category: 'authentication' },
      'auth.password_reset': { severity: 'info', category: 'authentication' },
      'auth.2fa_enabled': { severity: 'info', category: 'authentication' },
      'auth.2fa_disabled': { severity: 'warning', category: 'authentication' },
      'auth.session_expired': { severity: 'warning', category: 'authentication' },
      'auth.privilege_escalation': { severity: 'critical', category: 'authorization' },
      'auth.unauthorized_access': { severity: 'critical', category: 'authorization' },

      // Data Access
      'data.read': { severity: 'info', category: 'data_access' },
      'data.write': { severity: 'warning', category: 'data_access' },
      'data.delete': { severity: 'critical', category: 'data_access' },
      'data.export': { severity: 'warning', category: 'data_access' },
      'data.import': { severity: 'warning', category: 'data_access' },
      'data.pii_access': { severity: 'critical', category: 'data_access' },
      'data.sensitive_access': { severity: 'critical', category: 'data_access' },

      // Trading & Financial
      'trade.execute': { severity: 'info', category: 'trading' },
      'trade.cancel': { severity: 'warning', category: 'trading' },
      'trade.large_amount': { severity: 'warning', category: 'trading' },
      'trade.suspicious': { severity: 'critical', category: 'trading' },
      'portfolio.modify': { severity: 'info', category: 'portfolio' },
      'portfolio.delete': { severity: 'critical', category: 'portfolio' },
      'withdrawal.request': { severity: 'warning', category: 'financial' },
      'withdrawal.large': { severity: 'critical', category: 'financial' },

      // System Administration
      'admin.user_create': { severity: 'warning', category: 'administration' },
      'admin.user_delete': { severity: 'critical', category: 'administration' },
      'admin.role_change': { severity: 'warning', category: 'administration' },
      'admin.permission_change': { severity: 'critical', category: 'administration' },
      'admin.system_config': { severity: 'critical', category: 'administration' },
      'admin.security_config': { severity: 'critical', category: 'administration' },

      // API & Integration
      'api.call': { severity: 'info', category: 'api' },
      'api.rate_limit': { severity: 'warning', category: 'api' },
      'api.abuse': { severity: 'critical', category: 'api' },
      'integration.webhook': { severity: 'info', category: 'integration' },
      'integration.external_api': { severity: 'warning', category: 'integration' },

      // Security Events
      'security.breach_attempt': { severity: 'critical', category: 'security' },
      'security.malware_detected': { severity: 'critical', category: 'security' },
      'security.suspicious_ip': { severity: 'warning', category: 'security' },
      'security.geo_anomaly': { severity: 'warning', category: 'security' },
      'security.device_change': { severity: 'warning', category: 'security' },
      'security.fraud_detected': { severity: 'critical', category: 'security' },

      // Compliance
      'compliance.gdpr_access': { severity: 'info', category: 'compliance' },
      'compliance.gdpr_delete': { severity: 'warning', category: 'compliance' },
      'compliance.audit_trail': { severity: 'info', category: 'compliance' },
      'compliance.regulatory_report': { severity: 'warning', category: 'compliance' }
    };
  }

  /**
   * Start audit processing and monitoring
   */
  startAuditProcessing() {
    // Process audit logs every 5 seconds
    setInterval(() => {
      this.processAuditLogs();
    }, 5000);

    // Generate risk assessments every minute
    setInterval(() => {
      this.generateRiskAssessments();
    }, 60000);

    // Clean up old logs every hour
    setInterval(() => {
      this.cleanupOldLogs();
    }, 3600000);
  }

  /**
   * Log audit event
   */
  async logEvent(eventData) {
    const auditLog = {
      id: uuidv4(),
      timestamp: new Date(),
      event: eventData.event,
      userId: eventData.userId || 'system',
      sessionId: eventData.sessionId,
      ipAddress: eventData.ipAddress,
      userAgent: eventData.userAgent,
      resource: eventData.resource,
      action: eventData.action,
      details: eventData.details || {},
      severity: this.getEventSeverity(eventData.event),
      category: this.getEventCategory(eventData.event),
      status: eventData.status || 'success',
      riskScore: await this.calculateRiskScore(eventData),
      metadata: {
        location: eventData.location,
        device: eventData.device,
        browser: eventData.browser,
        os: eventData.os
      }
    };

    // Store audit log
    this.auditLogs.set(auditLog.id, auditLog);

    // Track user session
    if (eventData.userId && eventData.sessionId) {
      this.updateUserSession(eventData.userId, eventData.sessionId, auditLog);
    }

    // Track access patterns
    this.updateAccessPatterns(eventData.userId, eventData.resource, eventData.action);

    // Check for security alerts
    await this.checkSecurityAlerts(auditLog);

    logger.info(`Audit event logged: ${auditLog.event} for user ${auditLog.userId} (${auditLog.severity})`);

    return auditLog;
  }

  /**
   * Get event severity
   */
  getEventSeverity(event) {
    const category = this.auditCategories[event];
    return category ? category.severity : 'info';
  }

  /**
   * Get event category
   */
  getEventCategory(event) {
    const category = this.auditCategories[event];
    return category ? category.category : 'general';
  }

  /**
   * Calculate risk score for event
   */
  async calculateRiskScore(eventData) {
    let riskScore = 0;

    // Base risk based on event type
    const severity = this.getEventSeverity(eventData.event);
    switch (severity) {
    case 'critical': riskScore += 80; break;
    case 'warning': riskScore += 40; break;
    case 'info': riskScore += 10; break;
    default: riskScore += 5;
    }

    // Time-based risk (unusual hours)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 20;
    }

    // Geographic risk
    if (eventData.location && this.isHighRiskLocation(eventData.location)) {
      riskScore += 30;
    }

    // Device risk
    if (eventData.device && this.isNewDevice(eventData.userId, eventData.device)) {
      riskScore += 25;
    }

    // Behavioral risk
    if (eventData.userId && this.hasUnusualBehavior(eventData.userId, eventData.action)) {
      riskScore += 35;
    }

    // Amount-based risk for financial transactions
    if (eventData.details && eventData.details.amount) {
      const amount = parseFloat(eventData.details.amount);
      if (amount > 10000) riskScore += 20;
      if (amount > 100000) riskScore += 40;
    }

    return Math.min(riskScore, 100); // Cap at 100
  }

  /**
   * Check if location is high risk
   */
  isHighRiskLocation(location) {
    const highRiskCountries = ['XX', 'YY', 'ZZ']; // Placeholder for high-risk countries
    return highRiskCountries.includes(location.country);
  }

  /**
   * Check if device is new for user
   */
  isNewDevice(userId, device) {
    const userSessions = Array.from(this.userSessions.values())
      .filter(session => session.userId === userId);

    return !userSessions.some(session =>
      session.device === device.deviceId
    );
  }

  /**
   * Check for unusual behavior
   */
  hasUnusualBehavior(userId, action) {
    const userAccessPatterns = this.accessPatterns.get(userId);
    if (!userAccessPatterns) return false;

    const recentActions = userAccessPatterns.actions
      .slice(-10) // Last 10 actions
      .map(a => a.action);

    // Check if action is unusual based on user's history
    const actionFrequency = recentActions.filter(a => a === action).length;
    return actionFrequency === 0; // New action type
  }

  /**
   * Update user session tracking
   */
  updateUserSession(userId, sessionId, auditLog) {
    const sessionKey = `${userId}-${sessionId}`;

    if (!this.userSessions.has(sessionKey)) {
      this.userSessions.set(sessionKey, {
        userId,
        sessionId,
        startTime: auditLog.timestamp,
        lastActivity: auditLog.timestamp,
        ipAddress: auditLog.ipAddress,
        userAgent: auditLog.userAgent,
        device: auditLog.metadata.device,
        location: auditLog.metadata.location,
        events: []
      });
    }

    const session = this.userSessions.get(sessionKey);
    session.lastActivity = auditLog.timestamp;
    session.events.push({
      event: auditLog.event,
      timestamp: auditLog.timestamp,
      riskScore: auditLog.riskScore
    });

    // Calculate session risk score
    session.riskScore = this.calculateSessionRiskScore(session);
  }

  /**
   * Calculate session risk score
   */
  calculateSessionRiskScore(session) {
    const events = session.events;
    if (events.length === 0) return 0;

    const avgRiskScore = events.reduce((sum, event) => sum + event.riskScore, 0) / events.length;
    const criticalEvents = events.filter(e => e.riskScore > 70).length;
    const warningEvents = events.filter(e => e.riskScore > 40 && e.riskScore <= 70).length;

    let sessionRisk = avgRiskScore;
    sessionRisk += criticalEvents * 20;
    sessionRisk += warningEvents * 10;

    return Math.min(sessionRisk, 100);
  }

  /**
   * Update access patterns
   */
  updateAccessPatterns(userId, resource, action) {
    if (!this.accessPatterns.has(userId)) {
      this.accessPatterns.set(userId, {
        userId,
        actions: [],
        resources: new Set(),
        lastUpdated: new Date()
      });
    }

    const pattern = this.accessPatterns.get(userId);
    pattern.actions.push({
      action,
      resource,
      timestamp: new Date()
    });

    if (resource) {
      pattern.resources.add(resource);
    }

    // Keep only last 100 actions
    if (pattern.actions.length > 100) {
      pattern.actions = pattern.actions.slice(-100);
    }

    pattern.lastUpdated = new Date();
  }

  /**
   * Check for security alerts
   */
  async checkSecurityAlerts(auditLog) {
    const alerts = [];

    // High risk score alert
    if (auditLog.riskScore > 80) {
      alerts.push({
        type: 'high_risk_event',
        severity: 'critical',
        message: `High risk event detected: ${auditLog.event}`,
        eventId: auditLog.id,
        userId: auditLog.userId,
        riskScore: auditLog.riskScore
      });
    }

    // Failed login attempts
    if (auditLog.event === 'auth.login_failed') {
      const failedAttempts = this.getFailedLoginCount(auditLog.userId);
      if (failedAttempts >= this.alertThresholds.failedLogins) {
        alerts.push({
          type: 'brute_force_attempt',
          severity: 'critical',
          message: `Multiple failed login attempts detected for user ${auditLog.userId}`,
          eventId: auditLog.id,
          userId: auditLog.userId,
          count: failedAttempts
        });
      }
    }

    // Suspicious activity
    if (auditLog.event.includes('suspicious') || auditLog.event.includes('fraud')) {
      alerts.push({
        type: 'suspicious_activity',
        severity: 'critical',
        message: `Suspicious activity detected: ${auditLog.event}`,
        eventId: auditLog.id,
        userId: auditLog.userId,
        details: auditLog.details
      });
    }

    // Process alerts
    for (const alert of alerts) {
      await this.processSecurityAlert(alert);
    }
  }

  /**
   * Get failed login count for user
   */
  getFailedLoginCount(userId) {
    const recentLogs = Array.from(this.auditLogs.values())
      .filter(log =>
        log.userId === userId &&
        log.event === 'auth.login_failed' &&
        (new Date() - log.timestamp) < 3600000 // Last hour
      );

    return recentLogs.length;
  }

  /**
   * Process security alert
   */
  async processSecurityAlert(alert) {
    logger.info(`SECURITY ALERT: ${alert.type} - ${alert.message}`);

    // Store security event
    this.securityEvents.set(alert.eventId || uuidv4(), {
      ...alert,
      timestamp: new Date(),
      processed: false
    });

    // In a real implementation, this would:
    // - Send notifications to security team
    // - Trigger automated responses
    // - Update security dashboards
    // - Log to external SIEM systems
  }

  /**
   * Process audit logs
   */
  processAuditLogs() {
    // In a real implementation, this would:
    // - Send logs to external systems
    // - Generate compliance reports
    // - Update dashboards
    // - Archive old logs
  }

  /**
   * Generate risk assessments
   */
  generateRiskAssessments() {
    const users = new Set();

    // Collect all users from recent sessions
    for (const [sessionKey, session] of this.userSessions) {
      if ((new Date() - session.lastActivity) < 3600000) { // Last hour
        users.add(session.userId);
      }
    }

    // Generate risk assessment for each active user
    for (const userId of users) {
      const riskScore = this.calculateUserRiskScore(userId);
      this.riskScores.set(userId, {
        userId,
        riskScore,
        timestamp: new Date(),
        factors: this.getRiskFactors(userId)
      });
    }
  }

  /**
   * Calculate user risk score
   */
  calculateUserRiskScore(userId) {
    const sessions = Array.from(this.userSessions.values())
      .filter(session => session.userId === userId);

    if (sessions.length === 0) return 0;

    const avgSessionRisk = sessions.reduce((sum, session) => sum + session.riskScore, 0) / sessions.length;
    const recentEvents = Array.from(this.auditLogs.values())
      .filter(log =>
        log.userId === userId &&
        (new Date() - log.timestamp) < 86400000 // Last 24 hours
      );

    const avgEventRisk = recentEvents.length > 0 ?
      recentEvents.reduce((sum, event) => sum + event.riskScore, 0) / recentEvents.length : 0;

    return (avgSessionRisk + avgEventRisk) / 2;
  }

  /**
   * Get risk factors for user
   */
  getRiskFactors(userId) {
    const factors = [];

    const sessions = Array.from(this.userSessions.values())
      .filter(session => session.userId === userId);

    if (sessions.length > 3) {
      factors.push('Multiple concurrent sessions');
    }

    const recentEvents = Array.from(this.auditLogs.values())
      .filter(log =>
        log.userId === userId &&
        (new Date() - log.timestamp) < 3600000 // Last hour
      );

    const criticalEvents = recentEvents.filter(e => e.riskScore > 70).length;
    if (criticalEvents > 0) {
      factors.push(`${criticalEvents} high-risk events in last hour`);
    }

    return factors;
  }

  /**
   * Cleanup old logs
   */
  cleanupOldLogs() {
    const cutoffTime = new Date() - (7 * 24 * 60 * 60 * 1000); // 7 days ago

    // Cleanup audit logs
    for (const [id, log] of this.auditLogs) {
      if (log.timestamp < cutoffTime) {
        this.auditLogs.delete(id);
      }
    }

    // Cleanup user sessions
    for (const [key, session] of this.userSessions) {
      if (session.lastActivity < cutoffTime) {
        this.userSessions.delete(key);
      }
    }

    logger.info('Old audit logs cleaned up');
  }

  /**
   * Get audit logs with filters
   */
  getAuditLogs(filters = {}) {
    let logs = Array.from(this.auditLogs.values());

    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }

    if (filters.event) {
      logs = logs.filter(log => log.event === filters.event);
    }

    if (filters.severity) {
      logs = logs.filter(log => log.severity === filters.severity);
    }

    if (filters.category) {
      logs = logs.filter(log => log.category === filters.category);
    }

    if (filters.startDate) {
      logs = logs.filter(log => log.timestamp >= filters.startDate);
    }

    if (filters.endDate) {
      logs = logs.filter(log => log.timestamp <= filters.endDate);
    }

    if (filters.minRiskScore) {
      logs = logs.filter(log => log.riskScore >= filters.minRiskScore);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    return logs.slice(offset, offset + limit);
  }

  /**
   * Get security events
   */
  getSecurityEvents(filters = {}) {
    let events = Array.from(this.securityEvents.values());

    if (filters.severity) {
      events = events.filter(event => event.severity === filters.severity);
    }

    if (filters.type) {
      events = events.filter(event => event.type === filters.type);
    }

    if (filters.processed !== undefined) {
      events = events.filter(event => event.processed === filters.processed);
    }

    return events.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get user risk scores
   */
  getUserRiskScores() {
    return Array.from(this.riskScores.values())
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Get audit statistics
   */
  getAuditStats() {
    const logs = Array.from(this.auditLogs.values());
    const events = Array.from(this.securityEvents.values());

    const stats = {
      totalLogs: logs.length,
      totalSecurityEvents: events.length,
      severityBreakdown: {
        critical: logs.filter(l => l.severity === 'critical').length,
        warning: logs.filter(l => l.severity === 'warning').length,
        info: logs.filter(l => l.severity === 'info').length
      },
      categoryBreakdown: {},
      activeUsers: this.userSessions.size,
      highRiskUsers: Array.from(this.riskScores.values())
        .filter(r => r.riskScore > 70).length,
      unprocessedAlerts: events.filter(e => !e.processed).length
    };

    // Category breakdown
    for (const log of logs) {
      stats.categoryBreakdown[log.category] = (stats.categoryBreakdown[log.category] || 0) + 1;
    }

    return stats;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const stats = this.getAuditStats();

      return {
        status: 'healthy',
        service: 'audit',
        stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'audit',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = AuditService;
