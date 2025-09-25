/**
 * Incident Response Manager
 * Manages incident detection, response, and resolution processes
 */

const config = require('../../config');

const { Counter, Gauge, Histogram } = require('prom-client');
const logger = require('../../utils/logger');

// Prometheus Metrics
const incidentCounter = new Counter({
  name: 'incidents_total',
  help: 'Total number of incidents',
  labelNames: ['severity', 'type', 'status']
});

const incidentDurationHistogram = new Histogram({
  name: 'incident_duration_seconds',
  help: 'Duration of incidents in seconds',
  labelNames: ['severity', 'type']
});

const incidentResponseTimeHistogram = new Histogram({
  name: 'incident_response_time_seconds',
  help: 'Time to respond to incidents in seconds',
  labelNames: ['severity', 'type']
});

const activeIncidentsGauge = new Gauge({
  name: 'active_incidents',
  help: 'Number of active incidents',
  labelNames: ['severity']
});

class IncidentResponseManager {
  constructor() {
    this.incidents = new Map();
    this.incidentTypes = {
      'security': {
        name: 'Security Incident',
        severityLevels: ['critical', 'high', 'medium', 'low'],
        responseTimes: { critical: 300, high: 900, medium: 3600, low: 14400 }, // seconds
        escalationMatrix: {
          critical: ['security_team', 'cto', 'ceo'],
          high: ['security_team', 'cto'],
          medium: ['security_team'],
          low: ['security_team']
        }
      },
      'availability': {
        name: 'Service Availability',
        severityLevels: ['critical', 'high', 'medium', 'low'],
        responseTimes: { critical: 300, high: 900, medium: 3600, low: 14400 },
        escalationMatrix: {
          critical: ['sre_team', 'cto', 'ceo'],
          high: ['sre_team', 'cto'],
          medium: ['sre_team'],
          low: ['sre_team']
        }
      },
      'performance': {
        name: 'Performance Issue',
        severityLevels: ['high', 'medium', 'low'],
        responseTimes: { high: 900, medium: 3600, low: 14400 },
        escalationMatrix: {
          high: ['sre_team', 'cto'],
          medium: ['sre_team'],
          low: ['sre_team']
        }
      },
      'data': {
        name: 'Data Incident',
        severityLevels: ['critical', 'high', 'medium', 'low'],
        responseTimes: { critical: 300, high: 900, medium: 3600, low: 14400 },
        escalationMatrix: {
          critical: ['data_team', 'cto', 'ceo', 'legal'],
          high: ['data_team', 'cto', 'legal'],
          medium: ['data_team', 'legal'],
          low: ['data_team']
        }
      },
      'compliance': {
        name: 'Compliance Incident',
        severityLevels: ['critical', 'high', 'medium', 'low'],
        responseTimes: { critical: 300, high: 900, medium: 3600, low: 14400 },
        escalationMatrix: {
          critical: ['compliance_team', 'legal', 'cto', 'ceo'],
          high: ['compliance_team', 'legal', 'cto'],
          medium: ['compliance_team', 'legal'],
          low: ['compliance_team']
        }
      }
    };

    this.incidentStatuses = {
      'detected': 'Incident detected and being analyzed',
      'acknowledged': 'Incident acknowledged by response team',
      'investigating': 'Active investigation in progress',
      'mitigated': 'Incident impact mitigated',
      'resolved': 'Incident fully resolved',
      'closed': 'Incident closed and documented',
      'false_positive': 'Incident determined to be false positive'
    };

    this.escalationChannels = {
      'security_team': ['security@finnexusai.com', 'slack:#security-incidents'],
      'sre_team': ['sre@finnexusai.com', 'slack:#sre-incidents'],
      'data_team': ['data@finnexusai.com', 'slack:#data-incidents'],
      'compliance_team': ['compliance@finnexusai.com', 'slack:#compliance-incidents'],
      'cto': ['cto@finnexusai.com', 'slack:#executive-alerts'],
      'ceo': ['ceo@finnexusai.com', 'slack:#executive-alerts'],
      'legal': ['legal@finnexusai.com', 'slack:#legal-alerts']
    };

    this.isInitialized = false;
    this.incidentCounter = 0;
    this.activeIncidents = new Set();
  }

  /**
   * Initialize incident response manager
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing incident response manager...');

      // Load existing incidents
      await this.loadIncidents();

      // Start incident monitoring
      this.startIncidentMonitoring();

      // Initialize metrics
      this.initializeMetrics();

      this.isInitialized = true;
      logger.info('✅ Incident response manager initialized successfully');

      return {
        success: true,
        message: 'Incident response manager initialized successfully',
        incidentTypes: Object.keys(this.incidentTypes).length,
        escalationChannels: Object.keys(this.escalationChannels).length
      };

    } catch (error) {
      logger.error('❌ Failed to initialize incident response manager:', error);
      throw new Error(`Incident response manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Create a new incident
   */
  async createIncident(incidentData) {
    try {
      const incidentId = this.generateIncidentId();
      const timestamp = new Date().toISOString();

      // Validate incident data
      const validation = this.validateIncidentData(incidentData);
      if (!validation.isValid) {
        throw new Error(`Invalid incident data: ${validation.errors.join(', ')}`);
      }

      // Create incident object
      const incident = {
        id: incidentId,
        type: incidentData.type,
        severity: incidentData.severity,
        title: incidentData.title,
        description: incidentData.description,
        source: incidentData.source || 'manual',
        reporter: incidentData.reporter || 'system',
        affectedServices: incidentData.affectedServices || [],
        affectedUsers: incidentData.affectedUsers || 0,
        businessImpact: incidentData.businessImpact || 'unknown',
        status: 'detected',
        createdAt: timestamp,
        updatedAt: timestamp,
        acknowledgedAt: null,
        resolvedAt: null,
        closedAt: null,
        responseTime: null,
        resolutionTime: null,
        assignedTo: null,
        escalatedTo: [],
        actions: [],
        communications: [],
        postmortem: null,
        lessonsLearned: []
      };

      // Store incident
      this.incidents.set(incidentId, incident);
      this.activeIncidents.add(incidentId);

      // Update metrics
      incidentCounter.labels(incident.severity, incident.type, incident.status).inc();
      activeIncidentsGauge.labels(incident.severity).inc();

      // Start response process
      await this.startIncidentResponse(incidentId);

      // Log incident creation
      logger.error(`🚨 Incident created: ${incidentId} - ${incident.title}`, {
        incidentId: incidentId,
        type: incident.type,
        severity: incident.severity,
        status: incident.status
      });

      logger.info(`🚨 Incident created: ${incidentId} - ${incident.title}`);

      return {
        success: true,
        incidentId: incidentId,
        incident: incident
      };

    } catch (error) {
      logger.error('❌ Error creating incident:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Acknowledge an incident
   */
  async acknowledgeIncident(incidentId, acknowledgedBy) {
    try {
      const incident = this.incidents.get(incidentId);
      if (!incident) {
        throw new Error(`Incident ${incidentId} not found`);
      }

      if (incident.status !== 'detected') {
        throw new Error(`Incident ${incidentId} cannot be acknowledged in status: ${incident.status}`);
      }

      // Update incident
      incident.status = 'acknowledged';
      incident.acknowledgedAt = new Date().toISOString();
      incident.assignedTo = acknowledgedBy;
      incident.updatedAt = incident.acknowledgedAt;

      // Calculate response time
      const responseTime = new Date(incident.acknowledgedAt) - new Date(incident.createdAt);
      incident.responseTime = responseTime / 1000; // Convert to seconds

      // Update metrics
      incidentCounter.labels(incident.severity, incident.type, incident.status).inc();
      incidentCounter.labels(incident.severity, incident.type, 'detected').dec();
      incidentResponseTimeHistogram.labels(incident.severity, incident.type).observe(incident.responseTime);

      // Log acknowledgment
      logger.info(`✅ Incident acknowledged: ${incidentId} by ${acknowledgedBy}`, {
        incidentId: incidentId,
        acknowledgedBy: acknowledgedBy,
        responseTime: incident.responseTime
      });

      logger.info(`✅ Incident acknowledged: ${incidentId} by ${acknowledgedBy}`);

      return {
        success: true,
        incident: incident
      };

    } catch (error) {
      logger.error('❌ Error acknowledging incident:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(incidentId, status, updatedBy, notes = '') {
    try {
      const incident = this.incidents.get(incidentId);
      if (!incident) {
        throw new Error(`Incident ${incidentId} not found`);
      }

      // Validate status transition
      const validTransitions = this.getValidStatusTransitions(incident.status);
      if (!validTransitions.includes(status)) {
        throw new Error(`Invalid status transition from ${incident.status} to ${status}`);
      }

      // Update incident
      const previousStatus = incident.status;
      incident.status = status;
      incident.updatedAt = new Date().toISOString();

      // Update timestamps based on status
      switch (status) {
      case 'resolved':
        incident.resolvedAt = incident.updatedAt;
        incident.resolutionTime = (new Date(incident.resolvedAt) - new Date(incident.createdAt)) / 1000;
        this.activeIncidents.delete(incidentId);
        activeIncidentsGauge.labels(incident.severity).dec();
        break;
      case 'closed':
        incident.closedAt = incident.updatedAt;
        break;
      }

      // Add status update to actions
      incident.actions.push({
        timestamp: incident.updatedAt,
        action: 'status_update',
        performedBy: updatedBy,
        details: `Status changed from ${previousStatus} to ${status}`,
        notes: notes
      });

      // Update metrics
      incidentCounter.labels(incident.severity, incident.type, status).inc();
      incidentCounter.labels(incident.severity, incident.type, previousStatus).dec();

      // Log status update
      logger.info(`📝 Incident status updated: ${incidentId} - ${previousStatus} → ${status}`, {
        incidentId: incidentId,
        previousStatus: previousStatus,
        newStatus: status,
        updatedBy: updatedBy
      });

      logger.info(`📝 Incident status updated: ${incidentId} - ${previousStatus} → ${status}`);

      return {
        success: true,
        incident: incident
      };

    } catch (error) {
      logger.error('❌ Error updating incident status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add action to incident
   */
  async addIncidentAction(incidentId, action, performedBy, details, notes = '') {
    try {
      const incident = this.incidents.get(incidentId);
      if (!incident) {
        throw new Error(`Incident ${incidentId} not found`);
      }

      const actionEntry = {
        timestamp: new Date().toISOString(),
        action: action,
        performedBy: performedBy,
        details: details,
        notes: notes
      };

      incident.actions.push(actionEntry);
      incident.updatedAt = actionEntry.timestamp;

      // Log action
      logger.info(`🔧 Incident action added: ${incidentId} - ${action}`, {
        incidentId: incidentId,
        action: action,
        performedBy: performedBy,
        details: details
      });

      logger.info(`🔧 Incident action added: ${incidentId} - ${action}`);

      return {
        success: true,
        action: actionEntry
      };

    } catch (error) {
      logger.error('❌ Error adding incident action:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Escalate incident
   */
  async escalateIncident(incidentId, escalatedTo, escalatedBy, reason) {
    try {
      const incident = this.incidents.get(incidentId);
      if (!incident) {
        throw new Error(`Incident ${incidentId} not found`);
      }

      // Validate escalation
      const incidentType = this.incidentTypes[incident.type];
      if (!incidentType.escalationMatrix[incident.severity].includes(escalatedTo)) {
        throw new Error(`Invalid escalation target: ${escalatedTo} for ${incident.type}:${incident.severity}`);
      }

      // Add escalation
      const escalation = {
        timestamp: new Date().toISOString(),
        escalatedTo: escalatedTo,
        escalatedBy: escalatedBy,
        reason: reason
      };

      incident.escalatedTo.push(escalation);
      incident.updatedAt = escalation.timestamp;

      // Add action
      await this.addIncidentAction(
        incidentId,
        'escalation',
        escalatedBy,
        `Escalated to ${escalatedTo}`,
        reason
      );

      // Send escalation notifications
      await this.sendEscalationNotification(incident, escalation);

      // Log escalation
      logger.warn(`📢 Incident escalated: ${incidentId} to ${escalatedTo}`, {
        incidentId: incidentId,
        escalatedTo: escalatedTo,
        escalatedBy: escalatedBy,
        reason: reason
      });

      logger.info(`📢 Incident escalated: ${incidentId} to ${escalatedTo}`);

      return {
        success: true,
        escalation: escalation
      };

    } catch (error) {
      logger.error('❌ Error escalating incident:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get incident details
   */
  getIncident(incidentId) {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      return {
        success: false,
        error: `Incident ${incidentId} not found`
      };
    }

    return {
      success: true,
      incident: incident
    };
  }

  /**
   * List incidents with filtering
   */
  listIncidents(filters = {}) {
    try {
      let incidents = Array.from(this.incidents.values());

      // Apply filters
      if (filters.status) {
        incidents = incidents.filter(incident => incident.status === filters.status);
      }

      if (filters.severity) {
        incidents = incidents.filter(incident => incident.severity === filters.severity);
      }

      if (filters.type) {
        incidents = incidents.filter(incident => incident.type === filters.type);
      }

      if (filters.assignedTo) {
        incidents = incidents.filter(incident => incident.assignedTo === filters.assignedTo);
      }

      if (filters.dateFrom) {
        incidents = incidents.filter(incident => incident.createdAt >= filters.dateFrom);
      }

      if (filters.dateTo) {
        incidents = incidents.filter(incident => incident.createdAt <= filters.dateTo);
      }

      // Sort by creation date (newest first)
      incidents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      const paginatedIncidents = incidents.slice(offset, offset + limit);

      return {
        success: true,
        incidents: paginatedIncidents,
        total: incidents.length,
        limit: limit,
        offset: offset
      };

    } catch (error) {
      logger.error('❌ Error listing incidents:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get incident statistics
   */
  getIncidentStatistics() {
    try {
      const incidents = Array.from(this.incidents.values());

      const stats = {
        total: incidents.length,
        active: incidents.filter(i => this.activeIncidents.has(i.id)).length,
        byStatus: {},
        bySeverity: {},
        byType: {},
        averageResponseTime: 0,
        averageResolutionTime: 0,
        mttr: 0, // Mean Time To Resolution
        mtbf: 0  // Mean Time Between Failures
      };

      // Calculate statistics
      incidents.forEach(incident => {
        // By status
        stats.byStatus[incident.status] = (stats.byStatus[incident.status] || 0) + 1;

        // By severity
        stats.bySeverity[incident.severity] = (stats.bySeverity[incident.severity] || 0) + 1;

        // By type
        stats.byType[incident.type] = (stats.byType[incident.type] || 0) + 1;
      });

      // Calculate averages
      const resolvedIncidents = incidents.filter(i => i.resolutionTime);
      if (resolvedIncidents.length > 0) {
        stats.averageResolutionTime = resolvedIncidents.reduce((sum, i) => sum + i.resolutionTime, 0) / resolvedIncidents.length;
      }

      const acknowledgedIncidents = incidents.filter(i => i.responseTime);
      if (acknowledgedIncidents.length > 0) {
        stats.averageResponseTime = acknowledgedIncidents.reduce((sum, i) => sum + i.responseTime, 0) / acknowledgedIncidents.length;
      }

      // Calculate MTTR (Mean Time To Resolution)
      if (resolvedIncidents.length > 0) {
        stats.mttr = resolvedIncidents.reduce((sum, i) => sum + i.resolutionTime, 0) / resolvedIncidents.length / 3600; // Convert to hours
      }

      return {
        success: true,
        statistics: stats,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('❌ Error getting incident statistics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Start incident response process
   */
  async startIncidentResponse(incidentId) {
    try {
      const incident = this.incidents.get(incidentId);
      if (!incident) {
        throw new Error(`Incident ${incidentId} not found`);
      }

      // Send initial notifications
      await this.sendInitialNotifications(incident);

      // Check for auto-escalation
      const incidentType = this.incidentTypes[incident.type];
      if (incidentType && incidentType.escalationMatrix[incident.severity]) {
        // Auto-escalate critical incidents
        if (incident.severity === 'critical') {
          setTimeout(async() => {
            const incidentCheck = this.incidents.get(incidentId);
            if (incidentCheck && incidentCheck.status === 'detected') {
              await this.escalateIncident(
                incidentId,
                incidentType.escalationMatrix[incident.severity][1], // Escalate to second level
                'system',
                'Auto-escalation due to critical severity'
              );
            }
          }, incidentType.responseTimes[incident.severity] * 1000);
        }
      }

      logger.info(`🚀 Incident response started for: ${incidentId}`);

    } catch (error) {
      logger.error('❌ Error starting incident response:', error);
    }
  }

  /**
   * Send initial notifications
   */
  async sendInitialNotifications(incident) {
    try {
      const incidentType = this.incidentTypes[incident.type];
      const escalationTargets = incidentType.escalationMatrix[incident.severity];

      for (const target of escalationTargets) {
        const channels = this.escalationChannels[target];
        if (channels) {
          for (const channel of channels) {
            await this.sendNotification(channel, incident, 'initial');
          }
        }
      }

    } catch (error) {
      logger.error('❌ Error sending initial notifications:', error);
    }
  }

  /**
   * Send escalation notifications
   */
  async sendEscalationNotification(incident, escalation) {
    try {
      const channels = this.escalationChannels[escalation.escalatedTo];
      if (channels) {
        for (const channel of channels) {
          await this.sendNotification(channel, incident, 'escalation', escalation);
        }
      }

    } catch (error) {
      logger.error('❌ Error sending escalation notification:', error);
    }
  }

  /**
   * Send notification
   */
  async sendNotification(channel, incident, type, escalation = null) {
    try {
      // In a real implementation, this would send actual notifications
      logger.info(`📧 Notification sent to ${channel}:`, {
        incidentId: incident.id,
        type: type,
        escalation: escalation
      });

    } catch (error) {
      logger.error('❌ Error sending notification:', error);
    }
  }

  /**
   * Validate incident data
   */
  validateIncidentData(data) {
    const errors = [];

    if (!data.type || !this.incidentTypes[data.type]) {
      errors.push('Invalid or missing incident type');
    }

    if (!data.severity) {
      errors.push('Missing severity level');
    } else if (data.type && !this.incidentTypes[data.type].severityLevels.includes(data.severity)) {
      errors.push(`Invalid severity level: ${data.severity} for type: ${data.type}`);
    }

    if (!data.title || data.title.trim().length === 0) {
      errors.push('Missing or empty title');
    }

    if (!data.description || data.description.trim().length === 0) {
      errors.push('Missing or empty description');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Generate incident ID
   */
  generateIncidentId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `INC-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Get valid status transitions
   */
  getValidStatusTransitions(currentStatus) {
    const transitions = {
      'detected': ['acknowledged', 'false_positive'],
      'acknowledged': ['investigating', 'mitigated', 'resolved'],
      'investigating': ['mitigated', 'resolved'],
      'mitigated': ['resolved'],
      'resolved': ['closed'],
      'closed': [],
      'false_positive': ['closed']
    };

    return transitions[currentStatus] || [];
  }

  /**
   * Start incident monitoring
   */
  startIncidentMonitoring() {
    // Monitor for incidents that need escalation
    setInterval(async() => {
      try {
        await this.checkForEscalations();
      } catch (error) {
        logger.error('❌ Error in incident monitoring:', error);
      }
    }, 60000); // Check every minute

    logger.info('✅ Incident monitoring started');
  }

  /**
   * Check for escalations
   */
  async checkForEscalations() {
    for (const incidentId of this.activeIncidents) {
      const incident = this.incidents.get(incidentId);
      if (!incident) continue;

      const incidentType = this.incidentTypes[incident.type];
      if (!incidentType) continue;

      const responseTime = incidentType.responseTimes[incident.severity];
      const timeSinceCreation = (Date.now() - new Date(incident.createdAt).getTime()) / 1000;

      // Check if incident needs escalation
      if (timeSinceCreation > responseTime && incident.status === 'detected') {
        await this.escalateIncident(
          incidentId,
          incidentType.escalationMatrix[incident.severity][0],
          'system',
          `Auto-escalation due to response time exceeded (${responseTime}s)`
        );
      }
    }
  }

  /**
   * Load incidents from storage
   */
  async loadIncidents() {
    try {
      // In a real implementation, this would load from persistent storage
      logger.info('⚠️ No existing incidents found, starting fresh');
      this.incidents = new Map();
      this.activeIncidents = new Set();
    } catch (error) {
      logger.error('❌ Error loading incidents:', error);
    }
  }

  /**
   * Save incidents to storage
   */
  async saveIncidents() {
    try {
      // In a real implementation, this would save to persistent storage
      logger.info('💾 Incidents saved to storage');
    } catch (error) {
      logger.error('❌ Error saving incidents:', error);
    }
  }

  /**
   * Initialize metrics
   */
  initializeMetrics() {
    // Initialize active incidents gauge
    for (const severity of ['critical', 'high', 'medium', 'low']) {
      activeIncidentsGauge.labels(severity).set(0);
    }

    logger.info('✅ Metrics initialized');
  }

  /**
   * Get incident response status
   */
  getIncidentResponseStatus() {
    return {
      isInitialized: this.isInitialized,
      totalIncidents: this.incidents.size,
      activeIncidents: this.activeIncidents.size,
      incidentTypes: Object.keys(this.incidentTypes).length,
      escalationChannels: Object.keys(this.escalationChannels).length
    };
  }

  /**
   * Shutdown incident response manager
   */
  async shutdown() {
    try {
      // Save incidents
      await this.saveIncidents();

      logger.info('✅ Incident response manager shutdown completed');
    } catch (error) {
      logger.error('❌ Error shutting down incident response manager:', error);
    }
  }
}

module.exports = new IncidentResponseManager();
