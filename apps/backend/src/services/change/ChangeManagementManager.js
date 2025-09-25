/**
 * Change Management Manager
 * Manages formal change management processes, approval workflows, and change tracking
 */

const config = require('../../config');

const { Counter, Gauge, Histogram } = require('prom-client');
const logger = require('../../utils/logger');

// Prometheus Metrics
const changeRequestCounter = new Counter({
  name: 'change_requests_total',
  help: 'Total number of change requests',
  labelNames: ['type', 'priority', 'status']
});

const changeApprovalTimeHistogram = new Histogram({
  name: 'change_approval_duration_seconds',
  help: 'Time to approve change requests in seconds',
  labelNames: ['type', 'priority']
});

const changeImplementationTimeHistogram = new Histogram({
  name: 'change_implementation_duration_seconds',
  help: 'Time to implement approved changes in seconds',
  labelNames: ['type', 'priority']
});

const activeChangesGauge = new Gauge({
  name: 'active_changes',
  help: 'Number of active changes',
  labelNames: ['status']
});

class ChangeManagementManager {
  constructor() {
    this.changeTypes = {
      'emergency': {
        name: 'Emergency Change',
        description: 'Critical changes requiring immediate implementation',
        approvalRequired: false,
        maxApprovalTime: 0, // Immediate
        implementationWindow: 'immediate',
        rollbackRequired: true,
        testingRequired: 'minimal'
      },
      'standard': {
        name: 'Standard Change',
        description: 'Normal business changes with standard procedures',
        approvalRequired: true,
        maxApprovalTime: 86400, // 24 hours
        implementationWindow: 'business-hours',
        rollbackRequired: true,
        testingRequired: 'full'
      },
      'major': {
        name: 'Major Change',
        description: 'Significant changes requiring extensive review',
        approvalRequired: true,
        maxApprovalTime: 259200, // 72 hours
        implementationWindow: 'maintenance-window',
        rollbackRequired: true,
        testingRequired: 'extensive'
      },
      'minor': {
        name: 'Minor Change',
        description: 'Low-risk changes with minimal impact',
        approvalRequired: false,
        maxApprovalTime: 3600, // 1 hour
        implementationWindow: 'business-hours',
        rollbackRequired: false,
        testingRequired: 'basic'
      },
      'infrastructure': {
        name: 'Infrastructure Change',
        description: 'Changes to infrastructure components',
        approvalRequired: true,
        maxApprovalTime: 172800, // 48 hours
        implementationWindow: 'maintenance-window',
        rollbackRequired: true,
        testingRequired: 'full'
      },
      'security': {
        name: 'Security Change',
        description: 'Security-related changes and updates',
        approvalRequired: true,
        maxApprovalTime: 43200, // 12 hours
        implementationWindow: 'immediate',
        rollbackRequired: true,
        testingRequired: 'security-focused'
      },
      'database': {
        name: 'Database Change',
        description: 'Database schema or configuration changes',
        approvalRequired: true,
        maxApprovalTime: 172800, // 48 hours
        implementationWindow: 'maintenance-window',
        rollbackRequired: true,
        testingRequired: 'extensive'
      },
      'application': {
        name: 'Application Change',
        description: 'Application code or configuration changes',
        approvalRequired: true,
        maxApprovalTime: 86400, // 24 hours
        implementationWindow: 'business-hours',
        rollbackRequired: true,
        testingRequired: 'full'
      }
    };

    this.changeStatuses = {
      'draft': 'Change request in draft status',
      'submitted': 'Change request submitted for review',
      'under-review': 'Change request under review',
      'approved': 'Change request approved',
      'rejected': 'Change request rejected',
      'scheduled': 'Change request scheduled for implementation',
      'in-progress': 'Change implementation in progress',
      'completed': 'Change implementation completed',
      'failed': 'Change implementation failed',
      'rolled-back': 'Change rolled back',
      'cancelled': 'Change request cancelled'
    };

    this.changePriorities = {
      'critical': {
        name: 'Critical',
        description: 'Changes that must be implemented immediately',
        sla: 3600, // 1 hour
        escalationTime: 1800, // 30 minutes
        approvers: ['cto', 'ceo']
      },
      'high': {
        name: 'High',
        description: 'Important changes requiring prompt attention',
        sla: 86400, // 24 hours
        escalationTime: 43200, // 12 hours
        approvers: ['cto', 'department-head']
      },
      'medium': {
        name: 'Medium',
        description: 'Standard changes with normal processing',
        sla: 259200, // 72 hours
        escalationTime: 172800, // 48 hours
        approvers: ['department-head']
      },
      'low': {
        name: 'Low',
        description: 'Changes with flexible timeline',
        sla: 604800, // 7 days
        escalationTime: 432000, // 5 days
        approvers: ['team-lead']
      }
    };

    this.approvalWorkflows = {
      'single-approver': {
        name: 'Single Approver',
        description: 'Single approver required',
        steps: ['approver']
      },
      'dual-approver': {
        name: 'Dual Approver',
        description: 'Two approvers required',
        steps: ['primary-approver', 'secondary-approver']
      },
      'committee-approval': {
        name: 'Committee Approval',
        description: 'Change advisory board approval required',
        steps: ['review', 'committee-vote', 'final-approval']
      },
      'executive-approval': {
        name: 'Executive Approval',
        description: 'Executive level approval required',
        steps: ['department-head', 'cto', 'ceo']
      }
    };

    this.changeRequests = new Map();
    this.changeHistory = [];
    this.approvalWorkflows_active = new Map();
    this.isInitialized = false;
    this.changeCounter = 0;
  }

  /**
   * Initialize change management manager
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing change management manager...');

      // Load existing change requests and history
      await this.loadChangeData();

      // Start change monitoring
      this.startChangeMonitoring();

      // Initialize metrics
      this.initializeMetrics();

      this.isInitialized = true;
      logger.info('✅ Change management manager initialized successfully');

      return {
        success: true,
        message: 'Change management manager initialized successfully',
        changeTypes: Object.keys(this.changeTypes).length,
        approvalWorkflows: Object.keys(this.approvalWorkflows).length,
        priorities: Object.keys(this.changePriorities).length
      };

    } catch (error) {
      logger.error('❌ Failed to initialize change management manager:', error);
      throw new Error(`Change management manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Create a new change request
   */
  async createChangeRequest(changeData) {
    try {
      const changeId = this.generateChangeId();
      const timestamp = new Date().toISOString();

      // Validate change data
      const validation = this.validateChangeData(changeData);
      if (!validation.isValid) {
        throw new Error(`Invalid change data: ${validation.errors.join(', ')}`);
      }

      // Determine approval workflow
      const workflow = this.determineApprovalWorkflow(changeData);

      // Create change request object
      const changeRequest = {
        id: changeId,
        title: changeData.title,
        description: changeData.description,
        type: changeData.type,
        priority: changeData.priority,
        status: 'draft',
        requester: changeData.requester,
        requestedBy: changeData.requestedBy,
        affectedSystems: changeData.affectedSystems || [],
        businessJustification: changeData.businessJustification || '',
        technicalDetails: changeData.technicalDetails || '',
        riskAssessment: changeData.riskAssessment || 'low',
        rollbackPlan: changeData.rollbackPlan || '',
        testingPlan: changeData.testingPlan || '',
        implementationPlan: changeData.implementationPlan || '',
        approvalWorkflow: workflow,
        approvers: this.getApprovers(changeData.type, changeData.priority),
        scheduledDate: changeData.scheduledDate || null,
        estimatedDuration: changeData.estimatedDuration || 60,
        actualDuration: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        submittedAt: null,
        approvedAt: null,
        implementedAt: null,
        completedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        implementationNotes: '',
        rollbackNotes: '',
        postImplementationReview: null,
        lessonsLearned: []
      };

      // Store change request
      this.changeRequests.set(changeId, changeRequest);

      // Update metrics
      changeRequestCounter.labels(changeRequest.type, changeRequest.priority, changeRequest.status).inc();

      // Log change creation
      logger.info(`📝 Change request created: ${changeId} - ${changeRequest.title}`, {
        changeId: changeId,
        type: changeRequest.type,
        priority: changeRequest.priority,
        requester: changeRequest.requestedBy
      });

      logger.info(`📝 Change request created: ${changeId} - ${changeRequest.title}`);

      return {
        success: true,
        changeId: changeId,
        changeRequest: changeRequest
      };

    } catch (error) {
      logger.error('❌ Error creating change request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Submit change request for approval
   */
  async submitChangeRequest(changeId, submittedBy) {
    try {
      const changeRequest = this.changeRequests.get(changeId);
      if (!changeRequest) {
        throw new Error(`Change request ${changeId} not found`);
      }

      if (changeRequest.status !== 'draft') {
        throw new Error(`Change request ${changeId} cannot be submitted in status: ${changeRequest.status}`);
      }

      // Update change request
      changeRequest.status = 'submitted';
      changeRequest.submittedAt = new Date().toISOString();
      changeRequest.submittedBy = submittedBy;
      changeRequest.updatedAt = changeRequest.submittedAt;

      // Update metrics
      changeRequestCounter.labels(changeRequest.type, changeRequest.priority, changeRequest.status).inc();
      changeRequestCounter.labels(changeRequest.type, changeRequest.priority, 'draft').dec();

      // Start approval workflow if required
      if (this.changeTypes[changeRequest.type].approvalRequired) {
        await this.startApprovalWorkflow(changeRequest);
      } else {
        // Auto-approve if no approval required
        await this.approveChangeRequest(changeId, 'system', 'Auto-approved - no approval required');
      }

      // Log submission
      logger.info(`📤 Change request submitted: ${changeId}`, {
        changeId: changeId,
        submittedBy: submittedBy,
        type: changeRequest.type,
        priority: changeRequest.priority
      });

      logger.info(`📤 Change request submitted: ${changeId}`);

      return {
        success: true,
        changeRequest: changeRequest
      };

    } catch (error) {
      logger.error('❌ Error submitting change request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Approve change request
   */
  async approveChangeRequest(changeId, approvedBy, approvalNotes = '') {
    try {
      const changeRequest = this.changeRequests.get(changeId);
      if (!changeRequest) {
        throw new Error(`Change request ${changeId} not found`);
      }

      if (!['submitted', 'under-review'].includes(changeRequest.status)) {
        throw new Error(`Change request ${changeId} cannot be approved in status: ${changeRequest.status}`);
      }

      // Update change request
      changeRequest.status = 'approved';
      changeRequest.approvedAt = new Date().toISOString();
      changeRequest.approvedBy = approvedBy;
      changeRequest.approvalNotes = approvalNotes;
      changeRequest.updatedAt = changeRequest.approvedAt;

      // Calculate approval time
      const approvalTime = new Date(changeRequest.approvedAt) - new Date(changeRequest.submittedAt);
      changeRequest.approvalDuration = approvalTime / 1000; // Convert to seconds

      // Update metrics
      changeRequestCounter.labels(changeRequest.type, changeRequest.priority, changeRequest.status).inc();
      changeRequestCounter.labels(changeRequest.type, changeRequest.priority, 'under-review').dec();
      changeApprovalTimeHistogram.labels(changeRequest.type, changeRequest.priority).observe(changeRequest.approvalDuration);

      // Log approval
      logger.info(`✅ Change request approved: ${changeId} by ${approvedBy}`, {
        changeId: changeId,
        approvedBy: approvedBy,
        approvalTime: changeRequest.approvalDuration,
        approvalNotes: approvalNotes
      });

      logger.info(`✅ Change request approved: ${changeId} by ${approvedBy}`);

      return {
        success: true,
        changeRequest: changeRequest
      };

    } catch (error) {
      logger.error('❌ Error approving change request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reject change request
   */
  async rejectChangeRequest(changeId, rejectedBy, rejectionReason) {
    try {
      const changeRequest = this.changeRequests.get(changeId);
      if (!changeRequest) {
        throw new Error(`Change request ${changeId} not found`);
      }

      if (!['submitted', 'under-review'].includes(changeRequest.status)) {
        throw new Error(`Change request ${changeId} cannot be rejected in status: ${changeRequest.status}`);
      }

      // Update change request
      changeRequest.status = 'rejected';
      changeRequest.rejectedAt = new Date().toISOString();
      changeRequest.rejectedBy = rejectedBy;
      changeRequest.rejectionReason = rejectionReason;
      changeRequest.updatedAt = changeRequest.rejectedAt;

      // Update metrics
      changeRequestCounter.labels(changeRequest.type, changeRequest.priority, changeRequest.status).inc();
      changeRequestCounter.labels(changeRequest.type, changeRequest.priority, 'under-review').dec();

      // Log rejection
      logger.warn(`❌ Change request rejected: ${changeId} by ${rejectedBy}`, {
        changeId: changeId,
        rejectedBy: rejectedBy,
        rejectionReason: rejectionReason
      });

      logger.info(`❌ Change request rejected: ${changeId} by ${rejectedBy}`);

      return {
        success: true,
        changeRequest: changeRequest
      };

    } catch (error) {
      logger.error('❌ Error rejecting change request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Schedule change request for implementation
   */
  async scheduleChangeRequest(changeId, scheduledDate, scheduledBy) {
    try {
      const changeRequest = this.changeRequests.get(changeId);
      if (!changeRequest) {
        throw new Error(`Change request ${changeId} not found`);
      }

      if (changeRequest.status !== 'approved') {
        throw new Error(`Change request ${changeId} must be approved before scheduling`);
      }

      // Update change request
      changeRequest.status = 'scheduled';
      changeRequest.scheduledDate = scheduledDate;
      changeRequest.scheduledBy = scheduledBy;
      changeRequest.updatedAt = new Date().toISOString();

      // Update metrics
      changeRequestCounter.labels(changeRequest.type, changeRequest.priority, changeRequest.status).inc();
      changeRequestCounter.labels(changeRequest.type, changeRequest.priority, 'approved').dec();

      // Log scheduling
      logger.info(`📅 Change request scheduled: ${changeId} for ${scheduledDate}`, {
        changeId: changeId,
        scheduledDate: scheduledDate,
        scheduledBy: scheduledBy
      });

      logger.info(`📅 Change request scheduled: ${changeId} for ${scheduledDate}`);

      return {
        success: true,
        changeRequest: changeRequest
      };

    } catch (error) {
      logger.error('❌ Error scheduling change request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Start implementation of change request
   */
  async startImplementation(changeId, implementedBy) {
    try {
      const changeRequest = this.changeRequests.get(changeId);
      if (!changeRequest) {
        throw new Error(`Change request ${changeId} not found`);
      }

      if (!['approved', 'scheduled'].includes(changeRequest.status)) {
        throw new Error(`Change request ${changeId} cannot be implemented in status: ${changeRequest.status}`);
      }

      // Update change request
      changeRequest.status = 'in-progress';
      changeRequest.implementedAt = new Date().toISOString();
      changeRequest.implementedBy = implementedBy;
      changeRequest.updatedAt = changeRequest.implementedAt;

      // Update metrics
      changeRequestCounter.labels(changeRequest.type, changeRequest.priority, changeRequest.status).inc();
      if (changeRequest.status === 'scheduled') {
        changeRequestCounter.labels(changeRequest.type, changeRequest.priority, 'scheduled').dec();
      } else {
        changeRequestCounter.labels(changeRequest.type, changeRequest.priority, 'approved').dec();
      }
      activeChangesGauge.labels(changeRequest.status).inc();

      // Log implementation start
      logger.info(`🚀 Change implementation started: ${changeId} by ${implementedBy}`, {
        changeId: changeId,
        implementedBy: implementedBy,
        type: changeRequest.type,
        priority: changeRequest.priority
      });

      logger.info(`🚀 Change implementation started: ${changeId} by ${implementedBy}`);

      return {
        success: true,
        changeRequest: changeRequest
      };

    } catch (error) {
      logger.error('❌ Error starting implementation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Complete change request implementation
   */
  async completeImplementation(changeId, completedBy, implementationNotes = '') {
    try {
      const changeRequest = this.changeRequests.get(changeId);
      if (!changeRequest) {
        throw new Error(`Change request ${changeId} not found`);
      }

      if (changeRequest.status !== 'in-progress') {
        throw new Error(`Change request ${changeId} is not in progress`);
      }

      // Update change request
      changeRequest.status = 'completed';
      changeRequest.completedAt = new Date().toISOString();
      changeRequest.completedBy = completedBy;
      changeRequest.implementationNotes = implementationNotes;
      changeRequest.updatedAt = changeRequest.completedAt;

      // Calculate implementation time
      const implementationTime = new Date(changeRequest.completedAt) - new Date(changeRequest.implementedAt);
      changeRequest.actualDuration = implementationTime / 1000; // Convert to seconds

      // Update metrics
      changeRequestCounter.labels(changeRequest.type, changeRequest.priority, changeRequest.status).inc();
      changeRequestCounter.labels(changeRequest.type, changeRequest.priority, 'in-progress').dec();
      changeImplementationTimeHistogram.labels(changeRequest.type, changeRequest.priority).observe(changeRequest.actualDuration);
      activeChangesGauge.labels('in-progress').dec();

      // Log completion
      logger.info(`✅ Change implementation completed: ${changeId} by ${completedBy}`, {
        changeId: changeId,
        completedBy: completedBy,
        implementationTime: changeRequest.actualDuration,
        implementationNotes: implementationNotes
      });

      logger.info(`✅ Change implementation completed: ${changeId} by ${completedBy}`);

      return {
        success: true,
        changeRequest: changeRequest
      };

    } catch (error) {
      logger.error('❌ Error completing implementation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Rollback change request
   */
  async rollbackChangeRequest(changeId, rolledBackBy, rollbackReason) {
    try {
      const changeRequest = this.changeRequests.get(changeId);
      if (!changeRequest) {
        throw new Error(`Change request ${changeId} not found`);
      }

      if (!['in-progress', 'completed'].includes(changeRequest.status)) {
        throw new Error(`Change request ${changeId} cannot be rolled back in status: ${changeRequest.status}`);
      }

      // Update change request
      changeRequest.status = 'rolled-back';
      changeRequest.rolledBackAt = new Date().toISOString();
      changeRequest.rolledBackBy = rolledBackBy;
      changeRequest.rollbackReason = rollbackReason;
      changeRequest.updatedAt = changeRequest.rolledBackAt;

      // Update metrics
      changeRequestCounter.labels(changeRequest.type, changeRequest.priority, changeRequest.status).inc();
      if (changeRequest.status === 'in-progress') {
        changeRequestCounter.labels(changeRequest.type, changeRequest.priority, 'in-progress').dec();
        activeChangesGauge.labels('in-progress').dec();
      } else {
        changeRequestCounter.labels(changeRequest.type, changeRequest.priority, 'completed').dec();
      }

      // Log rollback
      logger.warn(`🔄 Change rolled back: ${changeId} by ${rolledBackBy}`, {
        changeId: changeId,
        rolledBackBy: rolledBackBy,
        rollbackReason: rollbackReason
      });

      logger.info(`🔄 Change rolled back: ${changeId} by ${rolledBackBy}`);

      return {
        success: true,
        changeRequest: changeRequest
      };

    } catch (error) {
      logger.error('❌ Error rolling back change:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get change request details
   */
  getChangeRequest(changeId) {
    const changeRequest = this.changeRequests.get(changeId);
    if (!changeRequest) {
      return {
        success: false,
        error: `Change request ${changeId} not found`
      };
    }

    return {
      success: true,
      changeRequest: changeRequest
    };
  }

  /**
   * List change requests with filtering
   */
  listChangeRequests(filters = {}) {
    try {
      let changeRequests = Array.from(this.changeRequests.values());

      // Apply filters
      if (filters.status) {
        changeRequests = changeRequests.filter(cr => cr.status === filters.status);
      }

      if (filters.type) {
        changeRequests = changeRequests.filter(cr => cr.type === filters.type);
      }

      if (filters.priority) {
        changeRequests = changeRequests.filter(cr => cr.priority === filters.priority);
      }

      if (filters.requester) {
        changeRequests = changeRequests.filter(cr => cr.requestedBy === filters.requester);
      }

      if (filters.dateFrom) {
        changeRequests = changeRequests.filter(cr => cr.createdAt >= filters.dateFrom);
      }

      if (filters.dateTo) {
        changeRequests = changeRequests.filter(cr => cr.createdAt <= filters.dateTo);
      }

      // Sort by creation date (newest first)
      changeRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      const paginatedChanges = changeRequests.slice(offset, offset + limit);

      return {
        success: true,
        changeRequests: paginatedChanges,
        total: changeRequests.length,
        limit: limit,
        offset: offset
      };

    } catch (error) {
      logger.error('❌ Error listing change requests:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get change management statistics
   */
  getChangeStatistics() {
    try {
      const changeRequests = Array.from(this.changeRequests.values());

      const stats = {
        total: changeRequests.length,
        byStatus: {},
        byType: {},
        byPriority: {},
        averageApprovalTime: 0,
        averageImplementationTime: 0,
        successRate: 0,
        rollbackRate: 0
      };

      // Calculate statistics
      changeRequests.forEach(changeRequest => {
        // By status
        stats.byStatus[changeRequest.status] = (stats.byStatus[changeRequest.status] || 0) + 1;

        // By type
        stats.byType[changeRequest.type] = (stats.byType[changeRequest.type] || 0) + 1;

        // By priority
        stats.byPriority[changeRequest.priority] = (stats.byPriority[changeRequest.priority] || 0) + 1;
      });

      // Calculate averages
      const approvedChanges = changeRequests.filter(cr => cr.approvalDuration);
      if (approvedChanges.length > 0) {
        stats.averageApprovalTime = approvedChanges.reduce((sum, cr) => sum + cr.approvalDuration, 0) / approvedChanges.length;
      }

      const implementedChanges = changeRequests.filter(cr => cr.actualDuration);
      if (implementedChanges.length > 0) {
        stats.averageImplementationTime = implementedChanges.reduce((sum, cr) => sum + cr.actualDuration, 0) / implementedChanges.length;
      }

      // Calculate success rate
      const completedChanges = changeRequests.filter(cr => cr.status === 'completed').length;
      const totalImplemented = changeRequests.filter(cr => ['completed', 'rolled-back', 'failed'].includes(cr.status)).length;
      if (totalImplemented > 0) {
        stats.successRate = (completedChanges / totalImplemented) * 100;
      }

      // Calculate rollback rate
      const rolledBackChanges = changeRequests.filter(cr => cr.status === 'rolled-back').length;
      if (totalImplemented > 0) {
        stats.rollbackRate = (rolledBackChanges / totalImplemented) * 100;
      }

      return {
        success: true,
        statistics: stats,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('❌ Error getting change statistics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate change data
   */
  validateChangeData(data) {
    const errors = [];

    if (!data.title || data.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!data.description || data.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (!data.type || !this.changeTypes[data.type]) {
      errors.push('Valid change type is required');
    }

    if (!data.priority || !this.changePriorities[data.priority]) {
      errors.push('Valid priority is required');
    }

    if (!data.requestedBy || data.requestedBy.trim().length === 0) {
      errors.push('Requested by is required');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Determine approval workflow
   */
  determineApprovalWorkflow(changeData) {
    const changeType = this.changeTypes[changeData.type];
    const priority = this.changePriorities[changeData.priority];

    // Emergency changes don't require approval
    if (changeData.type === 'emergency') {
      return 'no-approval';
    }

    // Critical priority requires executive approval
    if (changeData.priority === 'critical') {
      return 'executive-approval';
    }

    // Major changes require committee approval
    if (changeData.type === 'major') {
      return 'committee-approval';
    }

    // Security changes require dual approval
    if (changeData.type === 'security') {
      return 'dual-approver';
    }

    // Default to single approver
    return 'single-approver';
  }

  /**
   * Get approvers for change type and priority
   */
  getApprovers(type, priority) {
    const changeType = this.changeTypes[type];
    const priorityInfo = this.changePriorities[priority];

    if (!changeType.approvalRequired) {
      return [];
    }

    return priorityInfo.approvers || ['department-head'];
  }

  /**
   * Start approval workflow
   */
  async startApprovalWorkflow(changeRequest) {
    try {
      const workflow = this.approvalWorkflows[changeRequest.approvalWorkflow];
      if (!workflow) {
        throw new Error(`Unknown approval workflow: ${changeRequest.approvalWorkflow}`);
      }

      // Update status to under review
      changeRequest.status = 'under-review';
      changeRequest.updatedAt = new Date().toISOString();

      // Store active workflow
      this.approvalWorkflows_active.set(changeRequest.id, {
        changeId: changeRequest.id,
        workflow: changeRequest.approvalWorkflow,
        steps: workflow.steps,
        currentStep: 0,
        startedAt: new Date().toISOString(),
        completed: false
      });

      logger.info(`🔄 Approval workflow started for change: ${changeRequest.id}`);

    } catch (error) {
      logger.error('❌ Error starting approval workflow:', error);
    }
  }

  /**
   * Generate change ID
   */
  generateChangeId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `CHG-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Start change monitoring
   */
  startChangeMonitoring() {
    // Monitor change requests every 5 minutes
    setInterval(async() => {
      try {
        await this.monitorChangeRequests();
      } catch (error) {
        logger.error('❌ Error in change monitoring:', error);
      }
    }, 300000); // 5 minutes

    logger.info('✅ Change monitoring started');
  }

  /**
   * Monitor change requests
   */
  async monitorChangeRequests() {
    try {
      for (const [changeId, changeRequest] of this.changeRequests) {
        // Check for overdue approvals
        if (changeRequest.status === 'under-review') {
          const maxApprovalTime = this.changeTypes[changeRequest.type].maxApprovalTime;
          const timeSinceSubmitted = (Date.now() - new Date(changeRequest.submittedAt).getTime()) / 1000;

          if (timeSinceSubmitted > maxApprovalTime) {
            logger.info(`⚠️ Change ${changeId} approval overdue by ${timeSinceSubmitted - maxApprovalTime} seconds`);
            // In a real implementation, this would trigger escalation
          }
        }

        // Check for overdue implementations
        if (changeRequest.status === 'in-progress') {
          const estimatedDuration = changeRequest.estimatedDuration;
          const timeSinceStarted = (Date.now() - new Date(changeRequest.implementedAt).getTime()) / 1000;

          if (timeSinceStarted > estimatedDuration * 2) { // 2x estimated time
            logger.info(`⚠️ Change ${changeId} implementation overdue by ${timeSinceStarted - estimatedDuration} seconds`);
            // In a real implementation, this would trigger escalation
          }
        }
      }
    } catch (error) {
      logger.error('❌ Error monitoring change requests:', error);
    }
  }

  /**
   * Load change data
   */
  async loadChangeData() {
    try {
      // In a real implementation, this would load from persistent storage
      logger.info('⚠️ No existing change data found, starting fresh');
      this.changeRequests = new Map();
      this.changeHistory = [];
      this.approvalWorkflows_active = new Map();
    } catch (error) {
      logger.error('❌ Error loading change data:', error);
    }
  }

  /**
   * Initialize metrics
   */
  initializeMetrics() {
    // Initialize active changes gauge
    for (const status of Object.keys(this.changeStatuses)) {
      activeChangesGauge.labels(status).set(0);
    }

    logger.info('✅ Change management metrics initialized');
  }

  /**
   * Get change management status
   */
  getChangeManagementStatus() {
    return {
      isInitialized: this.isInitialized,
      totalChangeRequests: this.changeRequests.size,
      changeTypes: Object.keys(this.changeTypes).length,
      approvalWorkflows: Object.keys(this.approvalWorkflows).length,
      priorities: Object.keys(this.changePriorities).length,
      activeWorkflows: this.approvalWorkflows_active.size
    };
  }

  /**
   * Shutdown change management manager
   */
  async shutdown() {
    try {
      logger.info('✅ Change management manager shutdown completed');
    } catch (error) {
      logger.error('❌ Error shutting down change management manager:', error);
    }
  }
}

module.exports = new ChangeManagementManager();
