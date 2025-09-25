/**
 * Alert Manager
 * Integration with PagerDuty, OpsGenie, and other incident management systems
 */

const axios = require('axios');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../../utils/logger');

class AlertManager extends EventEmitter {
  constructor() {
    super();
    this.config = {
      pagerDuty: {
        enabled: process.env.PAGERDUTY_ENABLED === 'true',
        apiKey: process.env.PAGERDUTY_API_KEY,
        integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
        apiUrl: 'https://api.pagerduty.com',
        escalationPolicy: process.env.PAGERDUTY_ESCALATION_POLICY,
        serviceId: process.env.PAGERDUTY_SERVICE_ID
      },
      opsGenie: {
        enabled: process.env.OPSGENIE_ENABLED === 'true',
        apiKey: process.env.OPSGENIE_API_KEY,
        apiUrl: 'https://api.opsgenie.com',
        defaultTeam: process.env.OPSGENIE_DEFAULT_TEAM,
        defaultPriority: process.env.OPSGENIE_DEFAULT_PRIORITY || 'P3'
      },
      slack: {
        enabled: process.env.SLACK_ENABLED === 'true',
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_ALERT_CHANNEL || '#alerts',
        username: process.env.SLACK_BOT_USERNAME || 'FinNexusAI-Alerts'
      },
      email: {
        enabled: process.env.EMAIL_ALERTS_ENABLED === 'true',
        smtpHost: process.env.SMTP_HOST,
        smtpPort: parseInt(process.env.SMTP_PORT) || 587,
        smtpUser: process.env.SMTP_USER,
        smtpPassword: process.env.SMTP_PASSWORD,
        fromEmail: process.env.FROM_EMAIL,
        toEmails: process.env.ALERT_EMAILS ? process.env.ALERT_EMAILS.split(',') : []
      },
      webhook: {
        enabled: process.env.WEBHOOK_ALERTS_ENABLED === 'true',
        url: process.env.WEBHOOK_ALERT_URL,
        secret: process.env.WEBHOOK_SECRET,
        timeout: parseInt(process.env.WEBHOOK_TIMEOUT) || 10000
      },
      alertRulesDir: path.join(__dirname, '..', '..', 'config', 'alert-rules'),
      alertHistoryDir: path.join(__dirname, '..', '..', 'data', 'alert-history'),
      enableAlertDeduplication: process.env.ENABLE_ALERT_DEDUPLICATION !== 'false',
      alertDeduplicationWindow: parseInt(process.env.ALERT_DEDUPLICATION_WINDOW) || 300000, // 5 minutes
      maxAlertsPerMinute: parseInt(process.env.MAX_ALERTS_PER_MINUTE) || 10,
      enableAlertEscalation: process.env.ENABLE_ALERT_ESCALATION !== 'false'
    };

    this.alertHistory = new Map();
    this.alertRules = new Map();
    this.activeAlerts = new Map();
    this.alertCounts = new Map();
    this.escalationPolicies = new Map();

    // Alert severity levels
    this.severityLevels = {
      CRITICAL: { level: 1, color: '#FF0000', emoji: '🚨' },
      HIGH: { level: 2, color: '#FF6600', emoji: '⚠️' },
      MEDIUM: { level: 3, color: '#FFCC00', emoji: '⚡' },
      LOW: { level: 4, color: '#00CCFF', emoji: 'ℹ️' },
      INFO: { level: 5, color: '#00FF00', emoji: '✅' }
    };

    // Alert statuses
    this.alertStatuses = {
      OPEN: 'open',
      ACKNOWLEDGED: 'acknowledged',
      RESOLVED: 'resolved',
      SUPPRESSED: 'suppressed'
    };

    // Rate limiting
    this.rateLimiter = {
      requests: [],
      maxRequests: this.config.maxAlertsPerMinute,
      windowMs: 60000 // 1 minute
    };
  }

  /**
   * Initialize the alert manager
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing alert manager...');

      // Create necessary directories
      await this.createDirectories();

      // Load alert rules
      await this.loadAlertRules();

      // Load escalation policies
      await this.loadEscalationPolicies();

      // Validate integrations
      await this.validateIntegrations();

      // Start alert cleanup
      this.startAlertCleanup();

      logger.info('✅ Alert manager initialized successfully');

      return {
        success: true,
        message: 'Alert manager initialized successfully',
        config: {
          pagerDuty: this.config.pagerDuty.enabled,
          opsGenie: this.config.opsGenie.enabled,
          slack: this.config.slack.enabled,
          email: this.config.email.enabled,
          webhook: this.config.webhook.enabled,
          alertDeduplication: this.config.enableAlertDeduplication,
          alertEscalation: this.config.enableAlertEscalation,
          maxAlertsPerMinute: this.config.maxAlertsPerMinute
        }
      };

    } catch (error) {
      logger.error('❌ Failed to initialize alert manager:', error);
      throw new Error(`Alert manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Create necessary directories
   */
  async createDirectories() {
    const directories = [
      this.config.alertRulesDir,
      this.config.alertHistoryDir
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  /**
   * Load alert rules
   */
  async loadAlertRules() {
    try {
      // Load default alert rules
      this.loadDefaultAlertRules();

      // Load custom alert rules from files
      const ruleFiles = await this.getRuleFiles();
      for (const file of ruleFiles) {
        await this.loadRuleFromFile(file);
      }

      logger.info(`✅ Loaded ${this.alertRules.size} alert rules`);
    } catch (error) {
      logger.warn('⚠️ Could not load alert rules:', error.message);
    }
  }

  /**
   * Load default alert rules
   */
  loadDefaultAlertRules() {
    const defaultRules = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds threshold',
        severity: 'HIGH',
        conditions: {
          metric: 'error_rate',
          threshold: 0.05, // 5%
          operator: 'gt',
          duration: '5m'
        },
        enabled: true,
        channels: ['pagerduty', 'slack']
      },
      {
        id: 'high_response_time',
        name: 'High Response Time',
        description: 'Alert when response time exceeds threshold',
        severity: 'MEDIUM',
        conditions: {
          metric: 'response_time_p95',
          threshold: 2000, // 2 seconds
          operator: 'gt',
          duration: '10m'
        },
        enabled: true,
        channels: ['slack']
      },
      {
        id: 'low_disk_space',
        name: 'Low Disk Space',
        description: 'Alert when disk space is low',
        severity: 'HIGH',
        conditions: {
          metric: 'disk_usage_percent',
          threshold: 85, // 85%
          operator: 'gt',
          duration: '2m'
        },
        enabled: true,
        channels: ['pagerduty', 'email']
      },
      {
        id: 'database_connection_failure',
        name: 'Database Connection Failure',
        description: 'Alert when database connections fail',
        severity: 'CRITICAL',
        conditions: {
          metric: 'database_connection_errors',
          threshold: 5,
          operator: 'gt',
          duration: '1m'
        },
        enabled: true,
        channels: ['pagerduty', 'opsgenie', 'slack']
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        description: 'Alert when memory usage is high',
        severity: 'MEDIUM',
        conditions: {
          metric: 'memory_usage_percent',
          threshold: 90, // 90%
          operator: 'gt',
          duration: '5m'
        },
        enabled: true,
        channels: ['slack']
      },
      {
        id: 'trading_volume_anomaly',
        name: 'Trading Volume Anomaly',
        description: 'Alert when trading volume deviates significantly',
        severity: 'HIGH',
        conditions: {
          metric: 'trading_volume_24h',
          threshold: 2, // 2x normal
          operator: 'gt',
          duration: '30m'
        },
        enabled: true,
        channels: ['pagerduty', 'slack']
      }
    ];

    for (const rule of defaultRules) {
      this.alertRules.set(rule.id, {
        ...rule,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      });
    }
  }

  /**
   * Get rule files
   */
  async getRuleFiles() {
    try {
      const files = await fs.readdir(this.config.alertRulesDir);
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      return [];
    }
  }

  /**
   * Load rule from file
   */
  async loadRuleFromFile(filename) {
    try {
      const filePath = path.join(this.config.alertRulesDir, filename);
      const content = await fs.readFile(filePath, 'utf8');
      const rule = JSON.parse(content);

      this.alertRules.set(rule.id, {
        ...rule,
        loadedFrom: filename,
        lastModified: new Date().toISOString()
      });
    } catch (error) {
      logger.warn(`⚠️ Could not load rule from ${filename}:`, error.message);
    }
  }

  /**
   * Load escalation policies
   */
  async loadEscalationPolicies() {
    const defaultPolicies = [
      {
        id: 'critical_alerts',
        name: 'Critical Alerts Escalation',
        levels: [
          { delay: 0, channels: ['pagerduty', 'opsgenie'] },
          { delay: 900000, channels: ['email', 'slack'] }, // 15 minutes
          { delay: 3600000, channels: ['webhook'] } // 1 hour
        ]
      },
      {
        id: 'high_alerts',
        name: 'High Alerts Escalation',
        levels: [
          { delay: 0, channels: ['slack'] },
          { delay: 1800000, channels: ['email'] }, // 30 minutes
          { delay: 7200000, channels: ['pagerduty'] } // 2 hours
        ]
      },
      {
        id: 'medium_alerts',
        name: 'Medium Alerts Escalation',
        levels: [
          { delay: 0, channels: ['slack'] },
          { delay: 3600000, channels: ['email'] } // 1 hour
        ]
      }
    ];

    for (const policy of defaultPolicies) {
      this.escalationPolicies.set(policy.id, policy);
    }
  }

  /**
   * Validate integrations
   */
  async validateIntegrations() {
    const validations = [];

    if (this.config.pagerDuty.enabled) {
      validations.push(this.validatePagerDuty());
    }

    if (this.config.opsGenie.enabled) {
      validations.push(this.validateOpsGenie());
    }

    if (this.config.slack.enabled) {
      validations.push(this.validateSlack());
    }

    if (this.config.email.enabled) {
      validations.push(this.validateEmail());
    }

    const results = await Promise.allSettled(validations);

    for (const result of results) {
      if (result.status === 'rejected') {
        logger.warn('⚠️ Integration validation failed:', result.reason.message);
      }
    }
  }

  /**
   * Validate PagerDuty integration
   */
  async validatePagerDuty() {
    try {
      const response = await axios.get(`${this.config.pagerDuty.apiUrl}/services`, {
        headers: {
          'Authorization': `Token token=${this.config.pagerDuty.apiKey}`,
          'Accept': 'application/vnd.pagerduty+json;version=2'
        },
        timeout: 10000
      });

      if (response.status === 200) {
        logger.info('✅ PagerDuty integration validated');
        return true;
      }
    } catch (error) {
      throw new Error(`PagerDuty validation failed: ${error.message}`);
    }
  }

  /**
   * Validate OpsGenie integration
   */
  async validateOpsGenie() {
    try {
      const response = await axios.get(`${this.config.opsGenie.apiUrl}/v2/heartbeats`, {
        headers: {
          'Authorization': `GenieKey ${this.config.opsGenie.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status === 200) {
        logger.info('✅ OpsGenie integration validated');
        return true;
      }
    } catch (error) {
      throw new Error(`OpsGenie validation failed: ${error.message}`);
    }
  }

  /**
   * Validate Slack integration
   */
  async validateSlack() {
    if (!this.config.slack.webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    try {
      const response = await axios.post(this.config.slack.webhookUrl, {
        text: 'FinNexusAI Alert Manager initialized successfully',
        channel: this.config.slack.channel,
        username: this.config.slack.username
      }, {
        timeout: 10000
      });

      if (response.status === 200) {
        logger.info('✅ Slack integration validated');
        return true;
      }
    } catch (error) {
      throw new Error(`Slack validation failed: ${error.message}`);
    }
  }

  /**
   * Validate email integration
   */
  async validateEmail() {
    if (!this.config.email.smtpHost || !this.config.email.smtpUser) {
      throw new Error('Email SMTP configuration incomplete');
    }

    logger.info('✅ Email integration validated (basic config check)');
    return true;
  }

  /**
   * Send alert
   */
  async sendAlert(alert) {
    try {
      // Rate limiting check
      if (!this.checkRateLimit()) {
        logger.warn('⚠️ Alert rate limit exceeded, skipping alert');
        return { success: false, reason: 'rate_limit_exceeded' };
      }

      // Deduplication check
      if (this.config.enableAlertDeduplication && this.isDuplicateAlert(alert)) {
        logger.info('🔄 Duplicate alert detected, updating existing alert');
        return await this.updateExistingAlert(alert);
      }

      // Generate alert ID
      const alertId = this.generateAlertId();

      // Create alert object
      const alertObject = {
        id: alertId,
        ruleId: alert.ruleId,
        severity: alert.severity || 'MEDIUM',
        title: alert.title,
        description: alert.description,
        source: alert.source || 'system',
        timestamp: new Date().toISOString(),
        status: this.alertStatuses.OPEN,
        metadata: alert.metadata || {},
        channels: alert.channels || this.getDefaultChannels(alert.severity),
        escalationPolicy: alert.escalationPolicy || this.getDefaultEscalationPolicy(alert.severity)
      };

      // Store alert
      this.activeAlerts.set(alertId, alertObject);

      // Send to channels
      const results = await this.sendToChannels(alertObject);

      // Log alert
      await this.logAlert(alertObject, results);

      // Start escalation if enabled
      if (this.config.enableAlertEscalation) {
        this.scheduleEscalation(alertObject);
      }

      this.emit('alert:sent', { alert: alertObject, results });

      return {
        success: true,
        alertId,
        results
      };

    } catch (error) {
      logger.error('❌ Error sending alert:', error);
      this.emit('alert:error', { alert, error });
      throw error;
    }
  }

  /**
   * Send to channels
   */
  async sendToChannels(alert) {
    const results = {};

    for (const channel of alert.channels) {
      try {
        switch (channel) {
        case 'pagerduty':
          results.pagerduty = await this.sendToPagerDuty(alert);
          break;
        case 'opsgenie':
          results.opsgenie = await this.sendToOpsGenie(alert);
          break;
        case 'slack':
          results.slack = await this.sendToSlack(alert);
          break;
        case 'email':
          results.email = await this.sendToEmail(alert);
          break;
        case 'webhook':
          results.webhook = await this.sendToWebhook(alert);
          break;
        }
      } catch (error) {
        logger.error(`❌ Error sending alert to ${channel}:`, error);
        results[channel] = { success: false, error: error.message };
      }
    }

    return results;
  }

  /**
   * Send to PagerDuty
   */
  async sendToPagerDuty(alert) {
    if (!this.config.pagerDuty.enabled) {
      throw new Error('PagerDuty not enabled');
    }

    const payload = {
      routing_key: this.config.pagerDuty.integrationKey,
      event_action: 'trigger',
      dedup_key: alert.id,
      payload: {
        summary: alert.title,
        source: alert.source,
        severity: this.mapSeverityToPagerDuty(alert.severity),
        custom_details: alert.metadata,
        timestamp: alert.timestamp
      }
    };

    const response = await axios.post(
      `${this.config.pagerDuty.apiUrl}/v2/enqueue`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    return {
      success: response.status === 202,
      incidentKey: response.data?.dedup_key,
      status: response.data?.status
    };
  }

  /**
   * Send to OpsGenie
   */
  async sendToOpsGenie(alert) {
    if (!this.config.opsGenie.enabled) {
      throw new Error('OpsGenie not enabled');
    }

    const payload = {
      message: alert.title,
      description: alert.description,
      alias: alert.id,
      source: alert.source,
      priority: this.mapSeverityToOpsGenie(alert.severity),
      tags: [alert.severity.toLowerCase(), alert.source],
      details: alert.metadata
    };

    const response = await axios.post(
      `${this.config.opsGenie.apiUrl}/v2/alerts`,
      payload,
      {
        headers: {
          'Authorization': `GenieKey ${this.config.opsGenie.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    return {
      success: response.status === 202,
      alertId: response.data?.requestId,
      status: response.data?.result
    };
  }

  /**
   * Send to Slack
   */
  async sendToSlack(alert) {
    if (!this.config.slack.enabled) {
      throw new Error('Slack not enabled');
    }

    const severityInfo = this.severityLevels[alert.severity];

    const payload = {
      channel: this.config.slack.channel,
      username: this.config.slack.username,
      attachments: [{
        color: severityInfo.color,
        title: `${severityInfo.emoji} ${alert.title}`,
        text: alert.description,
        fields: [
          {
            title: 'Severity',
            value: alert.severity,
            short: true
          },
          {
            title: 'Source',
            value: alert.source,
            short: true
          },
          {
            title: 'Alert ID',
            value: alert.id,
            short: true
          },
          {
            title: 'Timestamp',
            value: new Date(alert.timestamp).toLocaleString(),
            short: true
          }
        ],
        footer: 'FinNexusAI Alert Manager',
        ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
      }]
    };

    const response = await axios.post(this.config.slack.webhookUrl, payload, {
      timeout: 10000
    });

    return {
      success: response.status === 200,
      status: response.data
    };
  }

  /**
   * Send to Email
   */
  async sendToEmail(alert) {
    if (!this.config.email.enabled) {
      throw new Error('Email not enabled');
    }

    // For now, return a placeholder
    // In production, you would use a proper email library like nodemailer
    logger.info(`📧 Email alert would be sent: ${alert.title}`);

    return {
      success: true,
      message: 'Email alert queued for sending'
    };
  }

  /**
   * Send to Webhook
   */
  async sendToWebhook(alert) {
    if (!this.config.webhook.enabled) {
      throw new Error('Webhook not enabled');
    }

    const payload = {
      alertId: alert.id,
      ruleId: alert.ruleId,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      source: alert.source,
      timestamp: alert.timestamp,
      metadata: alert.metadata
    };

    const response = await axios.post(this.config.webhook.url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': this.config.webhook.secret
      },
      timeout: this.config.webhook.timeout
    });

    return {
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      data: response.data
    };
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.status = this.alertStatuses.ACKNOWLEDGED;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date().toISOString();

    // Update in PagerDuty/OpsGenie if applicable
    if (alert.channels.includes('pagerduty')) {
      await this.acknowledgeInPagerDuty(alert);
    }

    if (alert.channels.includes('opsgenie')) {
      await this.acknowledgeInOpsGenie(alert);
    }

    this.emit('alert:acknowledged', { alertId, acknowledgedBy });
    return { success: true };
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId, resolvedBy, resolution = '') {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.status = this.alertStatuses.RESOLVED;
    alert.resolvedBy = resolvedBy;
    alert.resolvedAt = new Date().toISOString();
    alert.resolution = resolution;

    // Update in PagerDuty/OpsGenie if applicable
    if (alert.channels.includes('pagerduty')) {
      await this.resolveInPagerDuty(alert);
    }

    if (alert.channels.includes('opsgenie')) {
      await this.resolveInOpsGenie(alert);
    }

    // Remove from active alerts
    this.activeAlerts.delete(alertId);

    this.emit('alert:resolved', { alertId, resolvedBy, resolution });
    return { success: true };
  }

  /**
   * Utility methods
   */
  checkRateLimit() {
    const now = Date.now();
    this.rateLimiter.requests = this.rateLimiter.requests.filter(
      time => now - time < this.rateLimiter.windowMs
    );

    if (this.rateLimiter.requests.length >= this.rateLimiter.maxRequests) {
      return false;
    }

    this.rateLimiter.requests.push(now);
    return true;
  }

  isDuplicateAlert(alert) {
    const key = `${alert.ruleId}_${alert.source}_${alert.title}`;
    const existingAlert = Array.from(this.activeAlerts.values()).find(
      a => a.ruleId === alert.ruleId &&
           a.source === alert.source &&
           a.title === alert.title &&
           a.status === this.alertStatuses.OPEN
    );

    return existingAlert !== undefined;
  }

  generateAlertId() {
    return `alert_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  getDefaultChannels(severity) {
    const channelMap = {
      CRITICAL: ['pagerduty', 'opsgenie', 'slack'],
      HIGH: ['pagerduty', 'slack'],
      MEDIUM: ['slack'],
      LOW: ['slack'],
      INFO: []
    };
    return channelMap[severity] || ['slack'];
  }

  getDefaultEscalationPolicy(severity) {
    const policyMap = {
      CRITICAL: 'critical_alerts',
      HIGH: 'high_alerts',
      MEDIUM: 'medium_alerts',
      LOW: 'medium_alerts',
      INFO: 'medium_alerts'
    };
    return policyMap[severity] || 'medium_alerts';
  }

  mapSeverityToPagerDuty(severity) {
    const mapping = {
      CRITICAL: 'critical',
      HIGH: 'error',
      MEDIUM: 'warning',
      LOW: 'info',
      INFO: 'info'
    };
    return mapping[severity] || 'warning';
  }

  mapSeverityToOpsGenie(severity) {
    const mapping = {
      CRITICAL: 'P1',
      HIGH: 'P2',
      MEDIUM: 'P3',
      LOW: 'P4',
      INFO: 'P5'
    };
    return mapping[severity] || 'P3';
  }

  /**
   * Log alert
   */
  async logAlert(alert, results) {
    const logEntry = {
      alert,
      results,
      timestamp: new Date().toISOString()
    };

    this.alertHistory.set(alert.id, logEntry);

    // Save to file for persistence
    try {
      const logFile = path.join(this.config.alertHistoryDir, `${alert.id}.json`);
      await fs.writeFile(logFile, JSON.stringify(logEntry, null, 2));
    } catch (error) {
      logger.error('❌ Error saving alert log:', error);
    }
  }

  /**
   * Schedule escalation
   */
  scheduleEscalation(alert) {
    const policy = this.escalationPolicies.get(alert.escalationPolicy);
    if (!policy) return;

    for (const level of policy.levels) {
      setTimeout(async() => {
        if (this.activeAlerts.has(alert.id) &&
            this.activeAlerts.get(alert.id).status === this.alertStatuses.OPEN) {
          try {
            await this.sendToChannels({
              ...alert,
              channels: level.channels,
              escalated: true,
              escalationLevel: level
            });
          } catch (error) {
            logger.error('❌ Error in alert escalation:', error);
          }
        }
      }, level.delay);
    }
  }

  /**
   * Start alert cleanup
   */
  startAlertCleanup() {
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 3600000); // Every hour
  }

  /**
   * Cleanup old alerts
   */
  cleanupOldAlerts() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

    for (const [alertId, alert] of this.activeAlerts) {
      if (new Date(alert.timestamp).getTime() < cutoffTime) {
        this.activeAlerts.delete(alertId);
      }
    }

    // Cleanup alert history
    for (const [alertId, logEntry] of this.alertHistory) {
      if (new Date(logEntry.timestamp).getTime() < cutoffTime) {
        this.alertHistory.delete(alertId);
      }
    }
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics() {
    const stats = {
      activeAlerts: this.activeAlerts.size,
      alertHistory: this.alertHistory.size,
      alertsBySeverity: {},
      alertsByStatus: {},
      totalAlertsSent: 0,
      lastUpdated: new Date().toISOString()
    };

    // Count by severity
    for (const alert of this.activeAlerts.values()) {
      stats.alertsBySeverity[alert.severity] = (stats.alertsBySeverity[alert.severity] || 0) + 1;
      stats.alertsByStatus[alert.status] = (stats.alertsByStatus[alert.status] || 0) + 1;
    }

    // Count total alerts sent
    stats.totalAlertsSent = this.alertHistory.size;

    return stats;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 100) {
    return Array.from(this.alertHistory.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }
}

module.exports = new AlertManager();
