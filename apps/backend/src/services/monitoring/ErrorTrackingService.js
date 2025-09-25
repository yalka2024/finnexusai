/**
 * FinAI Nexus - Error Tracking and Alerting Service
 *
 * Comprehensive error tracking featuring:
 * - Real-time error monitoring
 * - Intelligent alerting system
 * - Error classification and prioritization
 * - Integration with external monitoring tools
 * - Performance impact analysis
 * - Automated error recovery
 * - User notification system
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class ErrorTrackingService {
  constructor() {
    this.errors = new Map();
    this.alerts = new Map();
    this.errorPatterns = new Map();
    this.alertRules = new Map();
    this.notificationChannels = new Map();

    this.initializeAlertRules();
    this.initializeNotificationChannels();
    this.startErrorAnalysis();

    logger.info('ErrorTrackingService initialized with intelligent monitoring');
  }

  /**
   * Initialize alert rules
   */
  initializeAlertRules() {
    // Critical error rules
    this.alertRules.set('critical_errors', {
      id: 'critical_errors',
      name: 'Critical Errors',
      condition: 'error.severity === "critical"',
      threshold: 1,
      timeWindow: 60, // seconds
      channels: ['email', 'slack', 'sms'],
      enabled: true
    });

    // High error rate
    this.alertRules.set('high_error_rate', {
      id: 'high_error_rate',
      name: 'High Error Rate',
      condition: 'errorRate > 0.05', // 5% error rate
      threshold: 1,
      timeWindow: 300, // 5 minutes
      channels: ['slack', 'email'],
      enabled: true
    });

    // API timeout errors
    this.alertRules.set('api_timeouts', {
      id: 'api_timeouts',
      name: 'API Timeout Errors',
      condition: 'error.type === "timeout" && error.endpoint.includes("/api/")',
      threshold: 5,
      timeWindow: 300,
      channels: ['slack'],
      enabled: true
    });

    // Database connection errors
    this.alertRules.set('database_errors', {
      id: 'database_errors',
      name: 'Database Connection Errors',
      condition: 'error.type === "database" || error.message.includes("connection")',
      threshold: 3,
      timeWindow: 120,
      channels: ['email', 'slack', 'sms'],
      enabled: true
    });

    // Authentication failures
    this.alertRules.set('auth_failures', {
      id: 'auth_failures',
      name: 'Authentication Failures',
      condition: 'error.type === "authentication"',
      threshold: 10,
      timeWindow: 300,
      channels: ['slack'],
      enabled: true
    });

    // Payment processing errors
    this.alertRules.set('payment_errors', {
      id: 'payment_errors',
      name: 'Payment Processing Errors',
      condition: 'error.type === "payment" || error.endpoint.includes("/payment")',
      threshold: 1,
      timeWindow: 60,
      channels: ['email', 'slack', 'sms'],
      enabled: true
    });

    // Smart contract errors
    this.alertRules.set('blockchain_errors', {
      id: 'blockchain_errors',
      name: 'Blockchain Transaction Errors',
      condition: 'error.type === "blockchain" || error.message.includes("transaction")',
      threshold: 5,
      timeWindow: 300,
      channels: ['slack', 'email'],
      enabled: true
    });

    // Memory leaks
    this.alertRules.set('memory_leaks', {
      id: 'memory_leaks',
      name: 'Memory Usage Alerts',
      condition: 'error.type === "memory" && error.memoryUsage > 0.8', // 80% memory usage
      threshold: 1,
      timeWindow: 60,
      channels: ['email', 'slack'],
      enabled: true
    });
  }

  /**
   * Initialize notification channels
   */
  initializeNotificationChannels() {
    this.notificationChannels.set('email', {
      id: 'email',
      name: 'Email Notifications',
      type: 'email',
      config: {
        recipients: ['alerts@finnexusai.com', 'devops@finnexusai.com'],
        template: 'error-alert',
        priority: 'high'
      },
      enabled: true
    });

    this.notificationChannels.set('slack', {
      id: 'slack',
      name: 'Slack Notifications',
      type: 'slack',
      config: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: '#alerts',
        username: 'FinAI Nexus Bot',
        iconEmoji: ':warning:'
      },
      enabled: true
    });

    this.notificationChannels.set('sms', {
      id: 'sms',
      name: 'SMS Notifications',
      type: 'sms',
      config: {
        recipients: ['+1234567890'], // On-call phone numbers
        provider: 'twilio',
        priority: 'critical'
      },
      enabled: true
    });

    this.notificationChannels.set('webhook', {
      id: 'webhook',
      name: 'Webhook Notifications',
      type: 'webhook',
      config: {
        url: process.env.ALERT_WEBHOOK_URL,
        headers: {
          'Authorization': `Bearer ${process.env.ALERT_WEBHOOK_TOKEN}`
        }
      },
      enabled: true
    });
  }

  /**
   * Track error
   */
  async trackError(error, context = {}) {
    const errorId = uuidv4();
    const timestamp = new Date();

    // Classify error
    const classification = this.classifyError(error, context);

    // Create error record
    const errorRecord = {
      id: errorId,
      timestamp,
      type: classification.type,
      severity: classification.severity,
      message: error.message || 'Unknown error',
      stack: error.stack,
      context: {
        userId: context.userId,
        sessionId: context.sessionId,
        endpoint: context.endpoint,
        method: context.method,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        ...context
      },
      tags: classification.tags,
      fingerprint: this.generateFingerprint(error, context),
      count: 1,
      firstSeen: timestamp,
      lastSeen: timestamp,
      resolved: false,
      assignedTo: null,
      comments: []
    };

    // Check for existing similar errors
    const existingError = this.findSimilarError(errorRecord.fingerprint);
    if (existingError) {
      existingError.count++;
      existingError.lastSeen = timestamp;
      this.errors.set(existingError.id, existingError);

      // Check alert rules for existing error
      await this.checkAlertRules(existingError);

      return existingError;
    }

    // Store new error
    this.errors.set(errorId, errorRecord);

    // Update error patterns
    this.updateErrorPatterns(errorRecord);

    // Check alert rules
    await this.checkAlertRules(errorRecord);

    logger.info(`Error tracked: ${errorRecord.type} - ${errorRecord.severity}`);
    return errorRecord;
  }

  /**
   * Classify error
   */
  classifyError(error, context) {
    let type = 'unknown';
    let severity = 'low';
    const tags = [];

    // Determine error type
    if (error.message) {
      if (error.message.includes('timeout')) {
        type = 'timeout';
        severity = 'medium';
        tags.push('network', 'performance');
      } else if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
        type = 'database';
        severity = 'high';
        tags.push('database', 'connectivity');
      } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
        type = 'authentication';
        severity = 'medium';
        tags.push('security', 'auth');
      } else if (error.message.includes('payment') || error.message.includes('transaction')) {
        type = 'payment';
        severity = 'critical';
        tags.push('financial', 'payment');
      } else if (error.message.includes('blockchain') || error.message.includes('smart contract')) {
        type = 'blockchain';
        severity = 'high';
        tags.push('blockchain', 'defi');
      } else if (error.message.includes('memory') || error.message.includes('heap')) {
        type = 'memory';
        severity = 'high';
        tags.push('performance', 'memory');
      }
    }

    // Adjust severity based on context
    if (context.endpoint && context.endpoint.includes('/api/')) {
      severity = this.escalateSeverity(severity);
      tags.push('api');
    }

    if (context.userId) {
      tags.push('user-facing');
    }

    // Critical endpoints
    const criticalEndpoints = ['/api/payment', '/api/trade', '/api/auth/login'];
    if (criticalEndpoints.some(ep => context.endpoint?.includes(ep))) {
      severity = 'critical';
      tags.push('critical-endpoint');
    }

    return { type, severity, tags };
  }

  /**
   * Escalate severity level
   */
  escalateSeverity(severity) {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    const escalated = Math.min(levels[severity] + 1, 4);
    return Object.keys(levels)[escalated - 1];
  }

  /**
   * Generate error fingerprint for deduplication
   */
  generateFingerprint(error, context) {
    const key = [
      error.message?.substring(0, 100),
      context.endpoint,
      error.stack?.split('\n')[1]?.trim()
    ].filter(Boolean).join('|');

    return Buffer.from(key).toString('base64');
  }

  /**
   * Find similar error
   */
  findSimilarError(fingerprint) {
    for (const [id, error] of this.errors) {
      if (error.fingerprint === fingerprint) {
        return error;
      }
    }
    return null;
  }

  /**
   * Update error patterns
   */
  updateErrorPatterns(errorRecord) {
    const patternKey = `${errorRecord.type}-${errorRecord.context.endpoint}`;

    if (!this.errorPatterns.has(patternKey)) {
      this.errorPatterns.set(patternKey, {
        type: errorRecord.type,
        endpoint: errorRecord.context.endpoint,
        count: 0,
        firstSeen: errorRecord.timestamp,
        lastSeen: errorRecord.timestamp,
        severity: errorRecord.severity
      });
    }

    const pattern = this.errorPatterns.get(patternKey);
    pattern.count++;
    pattern.lastSeen = errorRecord.timestamp;
  }

  /**
   * Check alert rules
   */
  async checkAlertRules(errorRecord) {
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      const matches = this.evaluateRule(rule, errorRecord);
      if (matches) {
        await this.triggerAlert(rule, errorRecord);
      }
    }
  }

  /**
   * Evaluate alert rule
   */
  evaluateRule(rule, errorRecord) {
    // Simple rule evaluation (in production, use a proper rule engine)
    switch (rule.id) {
    case 'critical_errors':
      return errorRecord.severity === 'critical';

    case 'high_error_rate':
      const errorRate = this.calculateErrorRate(rule.timeWindow);
      return errorRate > 0.05;

    case 'api_timeouts':
      return errorRecord.type === 'timeout' &&
               errorRecord.context.endpoint?.includes('/api/');

    case 'database_errors':
      return errorRecord.type === 'database' ||
               errorRecord.message.includes('connection');

    case 'auth_failures':
      return errorRecord.type === 'authentication';

    case 'payment_errors':
      return errorRecord.type === 'payment' ||
               errorRecord.context.endpoint?.includes('/payment');

    case 'blockchain_errors':
      return errorRecord.type === 'blockchain' ||
               errorRecord.message.includes('transaction');

    case 'memory_leaks':
      return errorRecord.type === 'memory' &&
               errorRecord.context.memoryUsage > 0.8;

    default:
      return false;
    }
  }

  /**
   * Calculate error rate
   */
  calculateErrorRate(timeWindowSeconds) {
    const cutoffTime = new Date() - (timeWindowSeconds * 1000);
    const recentErrors = Array.from(this.errors.values())
      .filter(error => error.timestamp > cutoffTime);

    const totalRequests = recentErrors.reduce((sum, error) => sum + error.count, 0);
    const errorCount = recentErrors.length;

    return totalRequests > 0 ? errorCount / totalRequests : 0;
  }

  /**
   * Trigger alert
   */
  async triggerAlert(rule, errorRecord) {
    const alertId = uuidv4();
    const alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      errorId: errorRecord.id,
      severity: errorRecord.severity,
      timestamp: new Date(),
      status: 'active',
      notifications: []
    };

    // Send notifications through configured channels
    for (const channelId of rule.channels) {
      const channel = this.notificationChannels.get(channelId);
      if (channel && channel.enabled) {
        try {
          await this.sendNotification(channel, alert, errorRecord);
          alert.notifications.push({
            channel: channelId,
            status: 'sent',
            timestamp: new Date()
          });
        } catch (error) {
          logger.error(`Failed to send notification via ${channelId}:`, error);
          alert.notifications.push({
            channel: channelId,
            status: 'failed',
            error: error.message,
            timestamp: new Date()
          });
        }
      }
    }

    this.alerts.set(alertId, alert);
    logger.info(`Alert triggered: ${rule.name} for error ${errorRecord.id}`);

    return alert;
  }

  /**
   * Send notification
   */
  async sendNotification(channel, alert, errorRecord) {
    const notification = {
      title: `🚨 ${alert.ruleName}`,
      message: this.formatNotificationMessage(alert, errorRecord),
      severity: alert.severity,
      timestamp: alert.timestamp,
      errorId: errorRecord.id,
      ruleId: alert.ruleId
    };

    switch (channel.type) {
    case 'email':
      await this.sendEmailNotification(channel, notification);
      break;

    case 'slack':
      await this.sendSlackNotification(channel, notification);
      break;

    case 'sms':
      await this.sendSMSNotification(channel, notification);
      break;

    case 'webhook':
      await this.sendWebhookNotification(channel, notification);
      break;

    default:
      logger.warn(`Unknown notification channel type: ${channel.type}`);
    }
  }

  /**
   * Format notification message
   */
  formatNotificationMessage(alert, errorRecord) {
    return `
🚨 **${alert.ruleName}**

**Error Details:**
- Type: ${errorRecord.type}
- Severity: ${errorRecord.severity.toUpperCase()}
- Message: ${errorRecord.message}
- Count: ${errorRecord.count}

**Context:**
- Endpoint: ${errorRecord.context.endpoint || 'N/A'}
- User ID: ${errorRecord.context.userId || 'N/A'}
- Timestamp: ${errorRecord.timestamp.toISOString()}

**Error ID:** ${errorRecord.id}
**Alert ID:** ${alert.id}

Please investigate and resolve this issue promptly.
    `.trim();
  }

  /**
   * Send email notification (mock implementation)
   */
  async sendEmailNotification(channel, notification) {
    logger.info(`📧 Email notification sent to ${channel.config.recipients.join(', ')}`);
    logger.info(`Subject: ${notification.title}`);
    logger.info(`Body: ${notification.message}`);

    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    return { status: 'sent', timestamp: new Date() };
  }

  /**
   * Send Slack notification (mock implementation)
   */
  async sendSlackNotification(channel, notification) {
    logger.info(`💬 Slack notification sent to ${channel.config.channel}`);
    logger.info(`Message: ${notification.message}`);

    // In production, use Slack webhook API
    return { status: 'sent', timestamp: new Date() };
  }

  /**
   * Send SMS notification (mock implementation)
   */
  async sendSMSNotification(channel, notification) {
    logger.info(`📱 SMS notification sent to ${channel.config.recipients.join(', ')}`);
    logger.info(`Message: ${notification.title}`);

    // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
    return { status: 'sent', timestamp: new Date() };
  }

  /**
   * Send webhook notification (mock implementation)
   */
  async sendWebhookNotification(channel, notification) {
    logger.info(`🔗 Webhook notification sent to ${channel.config.url}`);
    logger.info(`Payload: ${JSON.stringify(notification, null, 2)}`);

    // In production, make HTTP POST request to webhook URL
    return { status: 'sent', timestamp: new Date() };
  }

  /**
   * Start error analysis
   */
  startErrorAnalysis() {
    // Analyze errors every 5 minutes
    setInterval(() => {
      this.analyzeErrorTrends();
    }, 5 * 60 * 1000);

    // Clean up old errors every hour
    setInterval(() => {
      this.cleanupOldErrors();
    }, 60 * 60 * 1000);
  }

  /**
   * Analyze error trends
   */
  analyzeErrorTrends() {
    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);

    const recentErrors = Array.from(this.errors.values())
      .filter(error => error.timestamp > oneHourAgo);

    // Group by type
    const errorsByType = {};
    recentErrors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + error.count;
    });

    // Check for error spikes
    for (const [type, count] of Object.entries(errorsByType)) {
      if (count > 50) { // Threshold for error spike
        logger.warn(`⚠️ Error spike detected: ${count} ${type} errors in the last hour`);
      }
    }
  }

  /**
   * Clean up old errors
   */
  cleanupOldErrors() {
    const cutoffTime = new Date() - (7 * 24 * 60 * 60 * 1000); // 7 days ago

    for (const [id, error] of this.errors) {
      if (error.timestamp < cutoffTime && error.severity !== 'critical') {
        this.errors.delete(id);
      }
    }

    // Clean up old alerts
    for (const [id, alert] of this.alerts) {
      if (alert.timestamp < cutoffTime && alert.status === 'resolved') {
        this.alerts.delete(id);
      }
    }

    logger.info('🧹 Cleaned up old errors and alerts');
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(timeRange = '24h') {
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const cutoffTime = new Date() - (timeRanges[timeRange] || timeRanges['24h']);
    const recentErrors = Array.from(this.errors.values())
      .filter(error => error.timestamp > cutoffTime);

    const stats = {
      total: recentErrors.length,
      bySeverity: {},
      byType: {},
      byEndpoint: {},
      errorRate: this.calculateErrorRate(3600), // Last hour
      trends: this.calculateTrends(recentErrors)
    };

    // Group by severity
    recentErrors.forEach(error => {
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + error.count;
    });

    // Group by type
    recentErrors.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + error.count;
    });

    // Group by endpoint
    recentErrors.forEach(error => {
      const endpoint = error.context.endpoint || 'unknown';
      stats.byEndpoint[endpoint] = (stats.byEndpoint[endpoint] || 0) + error.count;
    });

    return stats;
  }

  /**
   * Calculate error trends
   */
  calculateTrends(errors) {
    // Simple trend calculation (in production, use more sophisticated analysis)
    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);

    const recentCount = errors.filter(e => e.timestamp > oneHourAgo).length;
    const previousCount = errors.filter(e => e.timestamp > twoHoursAgo && e.timestamp <= oneHourAgo).length;

    const trend = previousCount > 0 ? (recentCount - previousCount) / previousCount : 0;

    return {
      direction: trend > 0.1 ? 'increasing' : trend < -0.1 ? 'decreasing' : 'stable',
      percentage: Math.abs(trend * 100),
      recentCount,
      previousCount
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const stats = this.getErrorStatistics('1h');
      const activeAlerts = Array.from(this.alerts.values())
        .filter(alert => alert.status === 'active').length;

      return {
        status: 'healthy',
        service: 'error-tracking',
        metrics: {
          totalErrors: this.errors.size,
          activeAlerts,
          errorRate: stats.errorRate,
          trends: stats.trends
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'error-tracking',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = ErrorTrackingService;
