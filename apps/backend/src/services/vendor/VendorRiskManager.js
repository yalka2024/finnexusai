/**
 * Vendor Risk Management Manager
 * Manages vendor risk assessment, monitoring, and compliance tracking
 */

const config = require('../../config');

const { Counter, Gauge, Histogram } = require('prom-client');
const logger = require('../../utils/logger');

// Prometheus Metrics
const vendorRiskCounter = new Counter({
  name: 'vendor_risk_assessments_total',
  help: 'Total number of vendor risk assessments',
  labelNames: ['vendor', 'risk_level', 'status']
});

const vendorRiskScoreGauge = new Gauge({
  name: 'vendor_risk_score',
  help: 'Current risk score for vendors',
  labelNames: ['vendor', 'category']
});

const vendorComplianceGauge = new Gauge({
  name: 'vendor_compliance_status',
  help: 'Compliance status of vendors (1=compliant, 0=non-compliant)',
  labelNames: ['vendor', 'standard']
});

const vendorAssessmentTimeHistogram = new Histogram({
  name: 'vendor_assessment_duration_seconds',
  help: 'Time to complete vendor risk assessments in seconds',
  labelNames: ['vendor', 'assessment_type']
});

class VendorRiskManager {
  constructor() {
    this.vendorCategories = {
      'cloud-provider': {
        name: 'Cloud Provider',
        description: 'Cloud infrastructure and platform services',
        criticality: 'high',
        riskFactors: ['availability', 'security', 'data-location', 'compliance', 'financial-stability']
      },
      'payment-processor': {
        name: 'Payment Processor',
        description: 'Payment processing and financial services',
        criticality: 'critical',
        riskFactors: ['security', 'compliance', 'financial-stability', 'fraud-protection', 'data-protection']
      },
      'security-service': {
        name: 'Security Service',
        description: 'Security monitoring, analysis, and response services',
        criticality: 'high',
        riskFactors: ['security', 'compliance', 'availability', 'expertise', 'incident-response']
      },
      'communication-service': {
        name: 'Communication Service',
        description: 'Email, messaging, and communication platforms',
        criticality: 'medium',
        riskFactors: ['availability', 'security', 'data-protection', 'compliance', 'scalability']
      },
      'monitoring-service': {
        name: 'Monitoring Service',
        description: 'System monitoring, alerting, and observability services',
        criticality: 'high',
        riskFactors: ['availability', 'accuracy', 'security', 'compliance', 'performance']
      },
      'data-service': {
        name: 'Data Service',
        description: 'Data storage, processing, and analytics services',
        criticality: 'high',
        riskFactors: ['data-protection', 'security', 'availability', 'compliance', 'performance']
      },
      'software-vendor': {
        name: 'Software Vendor',
        description: 'Third-party software and application vendors',
        criticality: 'medium',
        riskFactors: ['security', 'compliance', 'support', 'licensing', 'vulnerability-management']
      },
      'consulting-service': {
        name: 'Consulting Service',
        description: 'Professional services and consulting',
        criticality: 'low',
        riskFactors: ['expertise', 'confidentiality', 'compliance', 'reputation', 'availability']
      }
    };

    this.riskFactors = {
      'financial-stability': {
        name: 'Financial Stability',
        description: 'Vendor financial health and stability',
        weight: 0.20,
        assessmentCriteria: ['credit-rating', 'revenue-growth', 'profitability', 'debt-levels']
      },
      'security': {
        name: 'Security Posture',
        description: 'Vendor security practices and controls',
        weight: 0.25,
        assessmentCriteria: ['security-certifications', 'incident-history', 'security-controls', 'vulnerability-management']
      },
      'compliance': {
        name: 'Regulatory Compliance',
        description: 'Compliance with relevant regulations and standards',
        weight: 0.20,
        assessmentCriteria: ['soc2', 'pci-dss', 'iso27001', 'gdpr', 'industry-standards']
      },
      'availability': {
        name: 'Service Availability',
        description: 'Vendor service uptime and reliability',
        weight: 0.15,
        assessmentCriteria: ['uptime-sla', 'incident-history', 'redundancy', 'disaster-recovery']
      },
      'data-protection': {
        name: 'Data Protection',
        description: 'Data handling and protection practices',
        weight: 0.15,
        assessmentCriteria: ['data-encryption', 'access-controls', 'data-retention', 'breach-history']
      },
      'support': {
        name: 'Support Quality',
        description: 'Quality of vendor support and service',
        weight: 0.05,
        assessmentCriteria: ['response-time', 'resolution-time', 'support-channels', 'expertise']
      }
    };

    this.complianceStandards = {
      'soc2': {
        name: 'SOC 2 Type II',
        description: 'Security, availability, processing integrity, confidentiality, and privacy',
        required: true,
        criticality: 'high'
      },
      'pci-dss': {
        name: 'PCI DSS',
        description: 'Payment Card Industry Data Security Standard',
        required: true,
        criticality: 'high'
      },
      'iso27001': {
        name: 'ISO 27001',
        description: 'Information Security Management System',
        required: true,
        criticality: 'high'
      },
      'gdpr': {
        name: 'GDPR',
        description: 'General Data Protection Regulation',
        required: true,
        criticality: 'high'
      },
      'hipaa': {
        name: 'HIPAA',
        description: 'Health Insurance Portability and Accountability Act',
        required: false,
        criticality: 'medium'
      },
      'fedramp': {
        name: 'FedRAMP',
        description: 'Federal Risk and Authorization Management Program',
        required: false,
        criticality: 'medium'
      }
    };

    this.vendors = new Map();
    this.riskAssessments = new Map();
    this.complianceRecords = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize vendor risk management manager
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing vendor risk management manager...');

      // Load existing vendor data
      await this.loadVendorData();

      // Start vendor monitoring
      this.startVendorMonitoring();

      // Initialize metrics
      this.initializeMetrics();

      this.isInitialized = true;
      logger.info('✅ Vendor risk management manager initialized successfully');

      return {
        success: true,
        message: 'Vendor risk management manager initialized successfully',
        vendorCategories: Object.keys(this.vendorCategories).length,
        riskFactors: Object.keys(this.riskFactors).length,
        complianceStandards: Object.keys(this.complianceStandards).length
      };

    } catch (error) {
      logger.error('❌ Failed to initialize vendor risk management manager:', error);
      throw new Error(`Vendor risk management manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Register a new vendor
   */
  async registerVendor(vendorData) {
    try {
      const vendorId = this.generateVendorId();
      const timestamp = new Date().toISOString();

      // Validate vendor data
      const validation = this.validateVendorData(vendorData);
      if (!validation.isValid) {
        throw new Error(`Invalid vendor data: ${validation.errors.join(', ')}`);
      }

      // Create vendor object
      const vendor = {
        id: vendorId,
        name: vendorData.name,
        description: vendorData.description,
        category: vendorData.category,
        contactInfo: vendorData.contactInfo,
        services: vendorData.services || [],
        contractDetails: vendorData.contractDetails || {},
        criticality: this.vendorCategories[vendorData.category].criticality,
        riskScore: 0,
        complianceStatus: {},
        lastAssessment: null,
        nextAssessment: null,
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp
      };

      // Store vendor
      this.vendors.set(vendorId, vendor);

      // Schedule initial risk assessment
      await this.scheduleRiskAssessment(vendorId, 'initial');

      // Log vendor registration
      logger.info(`🏢 Vendor registered: ${vendorId} - ${vendor.name}`, {
        vendorId: vendorId,
        name: vendor.name,
        category: vendor.category,
        criticality: vendor.criticality
      });

      logger.info(`🏢 Vendor registered: ${vendorId} - ${vendor.name}`);

      return {
        success: true,
        vendorId: vendorId,
        vendor: vendor
      };

    } catch (error) {
      logger.error('❌ Error registering vendor:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Conduct vendor risk assessment
   */
  async conductRiskAssessment(vendorId, assessmentData) {
    try {
      const assessmentId = this.generateAssessmentId();
      const timestamp = new Date().toISOString();

      const vendor = this.vendors.get(vendorId);
      if (!vendor) {
        throw new Error(`Vendor ${vendorId} not found`);
      }

      // Create assessment object
      const assessment = {
        id: assessmentId,
        vendorId: vendorId,
        vendorName: vendor.name,
        type: assessmentData.type || 'standard',
        assessor: assessmentData.assessor,
        assessmentDate: timestamp,
        riskFactors: {},
        overallRiskScore: 0,
        riskLevel: 'unknown',
        findings: [],
        recommendations: [],
        status: 'in-progress'
      };

      // Assess each risk factor
      for (const [factorId, factor] of Object.entries(this.riskFactors)) {
        if (this.vendorCategories[vendor.category].riskFactors.includes(factorId)) {
          const factorAssessment = await this.assessRiskFactor(factorId, assessmentData[factorId]);
          assessment.riskFactors[factorId] = factorAssessment;
        }
      }

      // Calculate overall risk score
      assessment.overallRiskScore = this.calculateOverallRiskScore(assessment.riskFactors);
      assessment.riskLevel = this.determineRiskLevel(assessment.overallRiskScore);

      // Generate findings and recommendations
      assessment.findings = this.generateFindings(assessment.riskFactors);
      assessment.recommendations = this.generateRecommendations(assessment.riskFactors, assessment.overallRiskScore);

      assessment.status = 'completed';

      // Store assessment
      this.riskAssessments.set(assessmentId, assessment);

      // Update vendor risk score
      vendor.riskScore = assessment.overallRiskScore;
      vendor.lastAssessment = timestamp;
      vendor.nextAssessment = this.calculateNextAssessmentDate(vendor.category, timestamp);
      vendor.updatedAt = timestamp;

      // Update metrics
      vendorRiskCounter.labels(vendor.name, assessment.riskLevel, assessment.status).inc();
      vendorRiskScoreGauge.labels(vendor.name, vendor.category).set(assessment.overallRiskScore);

      // Log assessment completion
      logger.info(`📊 Risk assessment completed: ${assessmentId} for vendor ${vendor.name}`, {
        assessmentId: assessmentId,
        vendorId: vendorId,
        vendorName: vendor.name,
        riskLevel: assessment.riskLevel,
        riskScore: assessment.overallRiskScore
      });

      logger.info(`📊 Risk assessment completed: ${assessmentId} for vendor ${vendor.name}`);

      return {
        success: true,
        assessmentId: assessmentId,
        assessment: assessment
      };

    } catch (error) {
      logger.error('❌ Error conducting risk assessment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update vendor compliance status
   */
  async updateComplianceStatus(vendorId, complianceData) {
    try {
      const vendor = this.vendors.get(vendorId);
      if (!vendor) {
        throw new Error(`Vendor ${vendorId} not found`);
      }

      const timestamp = new Date().toISOString();

      // Update compliance status
      for (const [standard, status] of Object.entries(complianceData)) {
        if (this.complianceStandards[standard]) {
          vendor.complianceStatus[standard] = {
            status: status.status,
            certificationDate: status.certificationDate,
            expiryDate: status.expiryDate,
            lastVerified: timestamp,
            verifiedBy: status.verifiedBy || 'system'
          };

          // Update metrics
          const isCompliant = status.status === 'compliant' ? 1 : 0;
          vendorComplianceGauge.labels(vendor.name, standard).set(isCompliant);
        }
      }

      vendor.updatedAt = timestamp;

      // Log compliance update
      logger.info(`✅ Compliance status updated for vendor: ${vendor.name}`, {
        vendorId: vendorId,
        vendorName: vendor.name,
        complianceData: complianceData
      });

      logger.info(`✅ Compliance status updated for vendor: ${vendor.name}`);

      return {
        success: true,
        vendor: vendor
      };

    } catch (error) {
      logger.error('❌ Error updating compliance status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get vendor details
   */
  getVendor(vendorId) {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) {
      return {
        success: false,
        error: `Vendor ${vendorId} not found`
      };
    }

    return {
      success: true,
      vendor: vendor
    };
  }

  /**
   * List vendors with filtering
   */
  listVendors(filters = {}) {
    try {
      let vendors = Array.from(this.vendors.values());

      // Apply filters
      if (filters.category) {
        vendors = vendors.filter(vendor => vendor.category === filters.category);
      }

      if (filters.criticality) {
        vendors = vendors.filter(vendor => vendor.criticality === filters.criticality);
      }

      if (filters.status) {
        vendors = vendors.filter(vendor => vendor.status === filters.status);
      }

      if (filters.riskLevel) {
        vendors = vendors.filter(vendor => {
          const riskLevel = this.determineRiskLevel(vendor.riskScore);
          return riskLevel === filters.riskLevel;
        });
      }

      // Sort by risk score (highest first)
      vendors.sort((a, b) => b.riskScore - a.riskScore);

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      const paginatedVendors = vendors.slice(offset, offset + limit);

      return {
        success: true,
        vendors: paginatedVendors,
        total: vendors.length,
        limit: limit,
        offset: offset
      };

    } catch (error) {
      logger.error('❌ Error listing vendors:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get vendor risk statistics
   */
  getVendorRiskStatistics() {
    try {
      const vendors = Array.from(this.vendors.values());
      const assessments = Array.from(this.riskAssessments.values());

      const stats = {
        totalVendors: vendors.length,
        byCategory: {},
        byCriticality: {},
        byRiskLevel: {},
        averageRiskScore: 0,
        complianceStatus: {},
        overdueAssessments: 0,
        upcomingAssessments: 0
      };

      // Calculate statistics
      vendors.forEach(vendor => {
        // By category
        stats.byCategory[vendor.category] = (stats.byCategory[vendor.category] || 0) + 1;

        // By criticality
        stats.byCriticality[vendor.criticality] = (stats.byCriticality[vendor.criticality] || 0) + 1;

        // By risk level
        const riskLevel = this.determineRiskLevel(vendor.riskScore);
        stats.byRiskLevel[riskLevel] = (stats.byRiskLevel[riskLevel] || 0) + 1;

        // Check assessment status
        if (vendor.nextAssessment && new Date(vendor.nextAssessment) < new Date()) {
          stats.overdueAssessments++;
        } else if (vendor.nextAssessment && new Date(vendor.nextAssessment) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
          stats.upcomingAssessments++;
        }
      });

      // Calculate average risk score
      if (vendors.length > 0) {
        stats.averageRiskScore = vendors.reduce((sum, vendor) => sum + vendor.riskScore, 0) / vendors.length;
      }

      // Calculate compliance status
      for (const standard of Object.keys(this.complianceStandards)) {
        const compliantVendors = vendors.filter(vendor =>
          vendor.complianceStatus[standard] && vendor.complianceStatus[standard].status === 'compliant'
        );
        stats.complianceStatus[standard] = {
          compliant: compliantVendors.length,
          total: vendors.length,
          percentage: vendors.length > 0 ? (compliantVendors.length / vendors.length) * 100 : 0
        };
      }

      return {
        success: true,
        statistics: stats,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('❌ Error getting vendor risk statistics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Assess risk factor
   */
  async assessRiskFactor(factorId, factorData) {
    try {
      const factor = this.riskFactors[factorId];
      if (!factor) {
        throw new Error(`Unknown risk factor: ${factorId}`);
      }

      const assessment = {
        factorId: factorId,
        factorName: factor.name,
        score: 0,
        details: {},
        findings: [],
        recommendations: []
      };

      // Assess based on criteria
      const criteria = factor.assessmentCriteria;
      let totalScore = 0;
      let criteriaCount = 0;

      for (const criterion of criteria) {
        if (factorData && factorData[criterion] !== undefined) {
          const score = this.scoreCriterion(criterion, factorData[criterion]);
          assessment.details[criterion] = {
            value: factorData[criterion],
            score: score
          };
          totalScore += score;
          criteriaCount++;
        }
      }

      // Calculate factor score
      if (criteriaCount > 0) {
        assessment.score = totalScore / criteriaCount;
      }

      // Generate findings and recommendations
      assessment.findings = this.generateFactorFindings(factorId, assessment.score, assessment.details);
      assessment.recommendations = this.generateFactorRecommendations(factorId, assessment.score, assessment.details);

      return assessment;

    } catch (error) {
      logger.error('❌ Error assessing risk factor:', error);
      return {
        factorId: factorId,
        factorName: factorId,
        score: 100, // Default to high risk on error
        details: {},
        findings: ['Assessment failed due to error'],
        recommendations: ['Review assessment data and retry']
      };
    }
  }

  /**
   * Score criterion
   */
  scoreCriterion(criterion, value) {
    // In a real implementation, this would use sophisticated scoring algorithms
    // For now, we'll use a simple scoring system
    if (typeof value === 'boolean') {
      return value ? 0 : 100;
    }

    if (typeof value === 'number') {
      return Math.max(0, Math.min(100, value));
    }

    if (typeof value === 'string') {
      const scoreMap = {
        'excellent': 0,
        'good': 25,
        'average': 50,
        'poor': 75,
        'critical': 100
      };
      return scoreMap[value.toLowerCase()] || 50;
    }

    return 50; // Default score
  }

  /**
   * Calculate overall risk score
   */
  calculateOverallRiskScore(riskFactors) {
    let weightedScore = 0;
    let totalWeight = 0;

    for (const [factorId, factorAssessment] of Object.entries(riskFactors)) {
      const factor = this.riskFactors[factorId];
      if (factor) {
        weightedScore += factorAssessment.score * factor.weight;
        totalWeight += factor.weight;
      }
    }

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  /**
   * Determine risk level
   */
  determineRiskLevel(riskScore) {
    if (riskScore >= 80) return 'high';
    if (riskScore >= 60) return 'medium';
    if (riskScore >= 40) return 'low';
    return 'minimal';
  }

  /**
   * Generate findings
   */
  generateFindings(riskFactors) {
    const findings = [];

    for (const [factorId, factorAssessment] of Object.entries(riskFactors)) {
      if (factorAssessment.score >= 70) {
        findings.push(`${this.riskFactors[factorId].name}: High risk identified (${factorAssessment.score.toFixed(1)}%)`);
      }
    }

    return findings;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(riskFactors, overallScore) {
    const recommendations = [];

    for (const [factorId, factorAssessment] of Object.entries(riskFactors)) {
      if (factorAssessment.score >= 70) {
        const factor = this.riskFactors[factorId];
        recommendations.push(`Improve ${factor.name}: Address identified issues to reduce risk`);
      }
    }

    if (overallScore >= 70) {
      recommendations.push('Consider vendor replacement: Overall risk level is high');
    } else if (overallScore >= 50) {
      recommendations.push('Monitor vendor closely: Risk level requires attention');
    }

    return recommendations;
  }

  /**
   * Generate factor findings
   */
  generateFactorFindings(factorId, score, details) {
    const findings = [];

    if (score >= 70) {
      findings.push(`High risk in ${this.riskFactors[factorId].name}`);
    } else if (score >= 40) {
      findings.push(`Moderate risk in ${this.riskFactors[factorId].name}`);
    }

    return findings;
  }

  /**
   * Generate factor recommendations
   */
  generateFactorRecommendations(factorId, score, details) {
    const recommendations = [];

    if (score >= 70) {
      recommendations.push(`Address critical issues in ${this.riskFactors[factorId].name}`);
    } else if (score >= 40) {
      recommendations.push(`Improve ${this.riskFactors[factorId].name} to reduce risk`);
    }

    return recommendations;
  }

  /**
   * Calculate next assessment date
   */
  calculateNextAssessmentDate(category, currentDate) {
    const categoryInfo = this.vendorCategories[category];
    const intervals = {
      'critical': 90, // 90 days
      'high': 180,    // 6 months
      'medium': 365,  // 1 year
      'low': 730      // 2 years
    };

    const intervalDays = intervals[categoryInfo.criticality] || 365;
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + intervalDays);

    return nextDate.toISOString();
  }

  /**
   * Schedule risk assessment
   */
  async scheduleRiskAssessment(vendorId, type) {
    try {
      const vendor = this.vendors.get(vendorId);
      if (!vendor) {
        throw new Error(`Vendor ${vendorId} not found`);
      }

      // In a real implementation, this would schedule the assessment
      logger.info(`📅 Risk assessment scheduled for vendor: ${vendor.name} (${type})`);

    } catch (error) {
      logger.error('❌ Error scheduling risk assessment:', error);
    }
  }

  /**
   * Validate vendor data
   */
  validateVendorData(data) {
    const errors = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Vendor name is required');
    }

    if (!data.category || !this.vendorCategories[data.category]) {
      errors.push('Valid vendor category is required');
    }

    if (!data.contactInfo || !data.contactInfo.email) {
      errors.push('Vendor contact email is required');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Generate vendor ID
   */
  generateVendorId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `VENDOR-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Generate assessment ID
   */
  generateAssessmentId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `ASSESS-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Start vendor monitoring
   */
  startVendorMonitoring() {
    // Monitor vendor compliance and assessments every 24 hours
    setInterval(async() => {
      try {
        await this.monitorVendorCompliance();
      } catch (error) {
        logger.error('❌ Error in vendor monitoring:', error);
      }
    }, 86400000); // 24 hours

    logger.info('✅ Vendor monitoring started');
  }

  /**
   * Monitor vendor compliance
   */
  async monitorVendorCompliance() {
    try {
      for (const [vendorId, vendor] of this.vendors) {
        // Check for expired compliance certifications
        for (const [standard, compliance] of Object.entries(vendor.complianceStatus)) {
          if (compliance.expiryDate && new Date(compliance.expiryDate) < new Date()) {
            logger.info(`⚠️ Compliance expired: ${vendor.name} - ${standard}`);
            // In a real implementation, this would trigger alerts
          }
        }

        // Check for overdue assessments
        if (vendor.nextAssessment && new Date(vendor.nextAssessment) < new Date()) {
          logger.info(`⚠️ Assessment overdue: ${vendor.name}`);
          // In a real implementation, this would trigger alerts
        }
      }
    } catch (error) {
      logger.error('❌ Error monitoring vendor compliance:', error);
    }
  }

  /**
   * Load vendor data
   */
  async loadVendorData() {
    try {
      // In a real implementation, this would load from persistent storage
      logger.info('⚠️ No existing vendor data found, starting fresh');
      this.vendors = new Map();
      this.riskAssessments = new Map();
      this.complianceRecords = new Map();
    } catch (error) {
      logger.error('❌ Error loading vendor data:', error);
    }
  }

  /**
   * Initialize metrics
   */
  initializeMetrics() {
    // Initialize compliance gauges
    for (const standard of Object.keys(this.complianceStandards)) {
      vendorComplianceGauge.labels('unknown', standard).set(0);
    }

    logger.info('✅ Vendor risk management metrics initialized');
  }

  /**
   * Get vendor risk management status
   */
  getVendorRiskManagementStatus() {
    return {
      isInitialized: this.isInitialized,
      totalVendors: this.vendors.size,
      totalAssessments: this.riskAssessments.size,
      vendorCategories: Object.keys(this.vendorCategories).length,
      riskFactors: Object.keys(this.riskFactors).length,
      complianceStandards: Object.keys(this.complianceStandards).length
    };
  }

  /**
   * Shutdown vendor risk management manager
   */
  async shutdown() {
    try {
      logger.info('✅ Vendor risk management manager shutdown completed');
    } catch (error) {
      logger.error('❌ Error shutting down vendor risk management manager:', error);
    }
  }
}

module.exports = new VendorRiskManager();
