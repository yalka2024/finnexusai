/**
 * FinAI Nexus - SEC Compliance Service
 *
 * Securities and Exchange Commission compliance monitoring and reporting
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class SECComplianceService {
  constructor() {
    this.complianceRules = new Map();
    this.regulatoryReports = new Map();
    this.auditTrails = new Map();
    this.complianceMetrics = new Map();

    this.initializeSECRules();
    logger.info('SECComplianceService initialized');
  }

  /**
   * Initialize SEC compliance rules
   */
  initializeSECRules() {
    // Investment Adviser Act of 1940
    this.complianceRules.set('iaa-1940', {
      id: 'iaa-1940',
      name: 'Investment Adviser Act of 1940',
      category: 'investment-advisory',
      requirements: [
        'fiduciary-duty',
        'disclosure-requirements',
        'record-keeping',
        'advertising-restrictions',
        'custody-rules'
      ],
      severity: 'critical'
    });

    // Securities Act of 1933
    this.complianceRules.set('sa-1933', {
      id: 'sa-1933',
      name: 'Securities Act of 1933',
      category: 'securities-offering',
      requirements: [
        'registration-requirements',
        'disclosure-obligations',
        'anti-fraud-provisions',
        'exemption-requirements'
      ],
      severity: 'critical'
    });

    // Securities Exchange Act of 1934
    this.complianceRules.set('sea-1934', {
      id: 'sea-1934',
      name: 'Securities Exchange Act of 1934',
      category: 'trading-regulation',
      requirements: [
        'market-manipulation-prevention',
        'insider-trading-prevention',
        'short-sale-regulations',
        'broker-dealer-requirements'
      ],
      severity: 'critical'
    });

    // Dodd-Frank Act
    this.complianceRules.set('dodd-frank', {
      id: 'dodd-frank',
      name: 'Dodd-Frank Wall Street Reform',
      category: 'systemic-risk',
      requirements: [
        'systemic-risk-monitoring',
        'derivatives-regulation',
        'consumer-protection',
        'volcker-rule-compliance'
      ],
      severity: 'high'
    });

    // GDPR for EU operations
    this.complianceRules.set('gdpr', {
      id: 'gdpr',
      name: 'General Data Protection Regulation',
      category: 'data-protection',
      requirements: [
        'data-minimization',
        'consent-management',
        'right-to-erasure',
        'data-portability',
        'breach-notification'
      ],
      severity: 'high'
    });
  }

  /**
   * Monitor compliance for a specific activity
   */
  async monitorCompliance(activity, userId, details = {}) {
    const complianceId = uuidv4();
    const timestamp = new Date();

    try {
      const complianceCheck = {
        id: complianceId,
        activity,
        userId,
        timestamp,
        details,
        violations: [],
        warnings: [],
        status: 'compliant',
        riskLevel: 'low'
      };

      // Check against each applicable rule
      for (const [ruleId, rule] of this.complianceRules) {
        const ruleCheck = await this.checkRuleCompliance(rule, activity, userId, details);

        if (ruleCheck.violations.length > 0) {
          complianceCheck.violations.push(...ruleCheck.violations);
          complianceCheck.status = 'violation';
        }

        if (ruleCheck.warnings.length > 0) {
          complianceCheck.warnings.push(...ruleCheck.warnings);
        }
      }

      // Calculate risk level
      complianceCheck.riskLevel = this.calculateRiskLevel(complianceCheck.violations, complianceCheck.warnings);

      // Generate recommendations
      complianceCheck.recommendations = this.generateComplianceRecommendations(complianceCheck);

      // Store compliance check
      this.auditTrails.set(complianceId, complianceCheck);

      // Update metrics
      this.updateComplianceMetrics(complianceCheck);

      logger.info(`🔍 Compliance check completed for ${activity} - Status: ${complianceCheck.status}`);

      return complianceCheck;
    } catch (error) {
      logger.error('Compliance monitoring error:', error);
      throw error;
    }
  }

  /**
   * Check compliance against specific rule
   */
  async checkRuleCompliance(rule, activity, userId, details) {
    const ruleCheck = {
      ruleId: rule.id,
      ruleName: rule.name,
      violations: [],
      warnings: []
    };

    // Simulate compliance checks based on rule type
    switch (rule.category) {
    case 'investment-advisory':
      ruleCheck.violations.push(...await this.checkInvestmentAdvisoryCompliance(rule, activity, details));
      break;
    case 'securities-offering':
      ruleCheck.violations.push(...await this.checkSecuritiesOfferingCompliance(rule, activity, details));
      break;
    case 'trading-regulation':
      ruleCheck.violations.push(...await this.checkTradingCompliance(rule, activity, details));
      break;
    case 'data-protection':
      ruleCheck.violations.push(...await this.checkDataProtectionCompliance(rule, activity, details));
      break;
    default:
      ruleCheck.warnings.push({
        type: 'generic-compliance',
        message: `Generic compliance check for ${rule.name}`,
        recommendation: 'Review activity against regulatory requirements'
      });
    }

    return ruleCheck;
  }

  /**
   * Check investment advisory compliance
   */
  async checkInvestmentAdvisoryCompliance(rule, activity, details) {
    const violations = [];

    // Fiduciary duty check
    if (activity === 'portfolio-management' && details.conflictOfInterest) {
      violations.push({
        id: uuidv4(),
        type: 'fiduciary-duty-violation',
        severity: 'critical',
        description: 'Potential conflict of interest in portfolio management',
        rule: 'Investment Adviser Act Section 206',
        recommendation: 'Disclose conflict of interest and obtain client consent'
      });
    }

    // Disclosure requirements
    if (activity === 'investment-recommendation' && !details.disclosureProvided) {
      violations.push({
        id: uuidv4(),
        type: 'disclosure-violation',
        severity: 'high',
        description: 'Investment recommendation without proper disclosure',
        rule: 'Investment Adviser Act Section 204',
        recommendation: 'Provide required disclosures before making recommendations'
      });
    }

    return violations;
  }

  /**
   * Check securities offering compliance
   */
  async checkSecuritiesOfferingCompliance(rule, activity, details) {
    const violations = [];

    // Registration requirements
    if (activity === 'securities-offering' && !details.registrationStatus) {
      violations.push({
        id: uuidv4(),
        type: 'registration-violation',
        severity: 'critical',
        description: 'Securities offering without proper registration',
        rule: 'Securities Act Section 5',
        recommendation: 'Ensure securities are properly registered or exempt'
      });
    }

    // Anti-fraud provisions
    if (activity === 'marketing' && details.misleadingContent) {
      violations.push({
        id: uuidv4(),
        type: 'anti-fraud-violation',
        severity: 'critical',
        description: 'Marketing materials contain misleading information',
        rule: 'Securities Act Section 17(a)',
        recommendation: 'Remove misleading content and ensure accuracy'
      });
    }

    return violations;
  }

  /**
   * Check trading compliance
   */
  async checkTradingCompliance(rule, activity, details) {
    const violations = [];

    // Insider trading prevention
    if (activity === 'trading' && details.insiderInformation) {
      violations.push({
        id: uuidv4(),
        type: 'insider-trading-violation',
        severity: 'critical',
        description: 'Trading activity with potential insider information',
        rule: 'Securities Exchange Act Section 10(b)',
        recommendation: 'Block trade and report to compliance officer'
      });
    }

    // Market manipulation
    if (activity === 'trading' && details.manipulativeActivity) {
      violations.push({
        id: uuidv4(),
        type: 'market-manipulation-violation',
        severity: 'critical',
        description: 'Potential market manipulation detected',
        rule: 'Securities Exchange Act Section 9',
        recommendation: 'Investigate and report suspicious trading activity'
      });
    }

    return violations;
  }

  /**
   * Check data protection compliance
   */
  async checkDataProtectionCompliance(rule, activity, details) {
    const violations = [];

    // Data minimization
    if (activity === 'data-collection' && details.excessiveData) {
      violations.push({
        id: uuidv4(),
        type: 'data-minimization-violation',
        severity: 'medium',
        description: 'Collecting more personal data than necessary',
        rule: 'GDPR Article 5(1)(c)',
        recommendation: 'Limit data collection to what is necessary'
      });
    }

    // Consent management
    if (activity === 'data-processing' && !details.validConsent) {
      violations.push({
        id: uuidv4(),
        type: 'consent-violation',
        severity: 'high',
        description: 'Processing personal data without valid consent',
        rule: 'GDPR Article 6',
        recommendation: 'Obtain valid consent before processing personal data'
      });
    }

    return violations;
  }

  /**
   * Calculate risk level
   */
  calculateRiskLevel(violations, warnings) {
    const criticalViolations = violations.filter(v => v.severity === 'critical').length;
    const highViolations = violations.filter(v => v.severity === 'high').length;

    if (criticalViolations > 0) return 'critical';
    if (highViolations > 1) return 'high';
    if (violations.length > 0 || warnings.length > 3) return 'medium';
    return 'low';
  }

  /**
   * Generate compliance recommendations
   */
  generateComplianceRecommendations(complianceCheck) {
    const recommendations = [];

    if (complianceCheck.violations.length > 0) {
      recommendations.push({
        priority: 'immediate',
        category: 'Regulatory Violations',
        description: `${complianceCheck.violations.length} regulatory violations require immediate attention`,
        actions: [
          'Stop non-compliant activities immediately',
          'Notify compliance officer',
          'Implement corrective measures',
          'Document remediation steps'
        ]
      });
    }

    if (complianceCheck.warnings.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Compliance Warnings',
        description: `${complianceCheck.warnings.length} compliance warnings need review`,
        actions: [
          'Review warning conditions',
          'Implement preventive measures',
          'Update compliance procedures',
          'Schedule compliance training'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Generate regulatory report
   */
  async generateRegulatoryReport(reportType, period, includeDetails = false) {
    const reportId = uuidv4();

    try {
      const report = {
        id: reportId,
        type: reportType,
        period,
        generatedAt: new Date(),
        summary: {},
        violations: [],
        metrics: {},
        recommendations: []
      };

      // Generate summary based on report type
      switch (reportType) {
      case 'quarterly-compliance':
        report.summary = await this.generateQuarterlySummary(period);
        break;
      case 'ad-hoc-compliance':
        report.summary = await this.generateAdHocSummary(period);
        break;
      case 'audit-trail':
        report.summary = await this.generateAuditTrailSummary(period);
        break;
      default:
        report.summary = await this.generateGenericSummary(period);
      }

      // Include violation details if requested
      if (includeDetails) {
        report.violations = Array.from(this.auditTrails.values())
          .filter(check => check.status === 'violation')
          .flatMap(check => check.violations);
      }

      // Generate metrics
      report.metrics = this.getComplianceMetrics();

      // Generate recommendations
      report.recommendations = this.generateReportRecommendations(report);

      this.regulatoryReports.set(reportId, report);

      logger.info(`📊 Regulatory report generated: ${reportType} for ${period}`);

      return report;
    } catch (error) {
      logger.error('Regulatory report generation error:', error);
      throw error;
    }
  }

  /**
   * Generate quarterly compliance summary
   */
  async generateQuarterlySummary(period) {
    return {
      totalComplianceChecks: this.auditTrails.size,
      violationsFound: Array.from(this.auditTrails.values()).filter(c => c.status === 'violation').length,
      averageRiskLevel: this.calculateAverageRiskLevel(),
      topViolationTypes: this.getTopViolationTypes(),
      complianceTrends: this.getComplianceTrends()
    };
  }

  /**
   * Generate ad-hoc compliance summary
   */
  async generateAdHocSummary(period) {
    return {
      currentComplianceStatus: 'monitoring',
      activeViolations: Array.from(this.auditTrails.values()).filter(c => c.status === 'violation').length,
      riskAssessment: this.calculateOverallRiskAssessment(),
      regulatoryChanges: this.getRecentRegulatoryChanges()
    };
  }

  /**
   * Generate audit trail summary
   */
  async generateAuditTrailSummary(period) {
    return {
      totalAuditEntries: this.auditTrails.size,
      complianceRate: this.calculateComplianceRate(),
      violationTrends: this.getViolationTrends(),
      remediationStatus: this.getRemediationStatus()
    };
  }

  /**
   * Generate generic summary
   */
  async generateGenericSummary(period) {
    return {
      complianceOverview: 'Comprehensive compliance monitoring active',
      keyMetrics: this.getKeyComplianceMetrics(),
      status: 'operational'
    };
  }

  /**
   * Update compliance metrics
   */
  updateComplianceMetrics(complianceCheck) {
    const metrics = this.complianceMetrics.get('overall') || {
      totalChecks: 0,
      violations: 0,
      warnings: 0,
      complianceRate: 100,
      averageRiskLevel: 'low'
    };

    metrics.totalChecks++;
    if (complianceCheck.violations.length > 0) metrics.violations++;
    if (complianceCheck.warnings.length > 0) metrics.warnings++;
    metrics.complianceRate = ((metrics.totalChecks - metrics.violations) / metrics.totalChecks) * 100;

    this.complianceMetrics.set('overall', metrics);
  }

  /**
   * Calculate average risk level
   */
  calculateAverageRiskLevel() {
    const checks = Array.from(this.auditTrails.values());
    if (checks.length === 0) return 'low';

    const riskLevels = { low: 0, medium: 0, high: 0, critical: 0 };
    checks.forEach(check => riskLevels[check.riskLevel]++);

    if (riskLevels.critical > 0) return 'critical';
    if (riskLevels.high > riskLevels.medium) return 'high';
    if (riskLevels.medium > 0) return 'medium';
    return 'low';
  }

  /**
   * Get top violation types
   */
  getTopViolationTypes() {
    const violations = Array.from(this.auditTrails.values())
      .flatMap(check => check.violations)
      .map(v => v.type);

    const counts = {};
    violations.forEach(type => counts[type] = (counts[type] || 0) + 1);

    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
  }

  /**
   * Get compliance trends
   */
  getComplianceTrends() {
    // Simulate trend data
    return {
      improving: Math.random() > 0.5,
      trendPercentage: Math.random() * 20 - 10, // -10% to +10%
      period: 'last 30 days'
    };
  }

  /**
   * Calculate overall risk assessment
   */
  calculateOverallRiskAssessment() {
    const violations = Array.from(this.auditTrails.values())
      .flatMap(check => check.violations);

    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const highCount = violations.filter(v => v.severity === 'high').length;

    if (criticalCount > 0) return 'HIGH RISK';
    if (highCount > 2) return 'MEDIUM RISK';
    return 'LOW RISK';
  }

  /**
   * Get recent regulatory changes
   */
  getRecentRegulatoryChanges() {
    return [
      {
        regulation: 'SEC Rule 15c2-11',
        change: 'Updated requirements for quotation of securities',
        effectiveDate: '2024-01-01',
        impact: 'medium'
      },
      {
        regulation: 'Investment Adviser Act Amendments',
        change: 'Enhanced disclosure requirements',
        effectiveDate: '2024-03-01',
        impact: 'high'
      }
    ];
  }

  /**
   * Calculate compliance rate
   */
  calculateComplianceRate() {
    const checks = Array.from(this.auditTrails.values());
    if (checks.length === 0) return 100;

    const compliant = checks.filter(c => c.status === 'compliant').length;
    return (compliant / checks.length) * 100;
  }

  /**
   * Get violation trends
   */
  getViolationTrends() {
    return {
      decreasing: Math.random() > 0.3,
      trendPercentage: Math.random() * 15, // 0% to 15%
      period: 'last quarter'
    };
  }

  /**
   * Get remediation status
   */
  getRemediationStatus() {
    const violations = Array.from(this.auditTrails.values())
      .flatMap(check => check.violations);

    return {
      totalViolations: violations.length,
      remediated: Math.floor(violations.length * 0.7), // 70% remediated
      inProgress: Math.floor(violations.length * 0.2), // 20% in progress
      pending: Math.floor(violations.length * 0.1) // 10% pending
    };
  }

  /**
   * Get key compliance metrics
   */
  getKeyComplianceMetrics() {
    return {
      activeRules: this.complianceRules.size,
      complianceChecks: this.auditTrails.size,
      violationRate: this.calculateViolationRate(),
      averageResponseTime: '2.3 seconds'
    };
  }

  /**
   * Calculate violation rate
   */
  calculateViolationRate() {
    const checks = Array.from(this.auditTrails.values());
    if (checks.length === 0) return 0;

    const violations = checks.filter(c => c.status === 'violation').length;
    return (violations / checks.length) * 100;
  }

  /**
   * Generate report recommendations
   */
  generateReportRecommendations(report) {
    const recommendations = [];

    if (report.summary.violationsFound > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Violation Remediation',
        description: 'Address regulatory violations immediately',
        actions: [
          'Implement immediate corrective actions',
          'Review and update compliance procedures',
          'Conduct additional staff training',
          'Schedule follow-up compliance review'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Get compliance metrics
   */
  getComplianceMetrics() {
    return Object.fromEntries(this.complianceMetrics);
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const metrics = this.getComplianceMetrics();

      return {
        status: 'healthy',
        service: 'sec-compliance',
        metrics: {
          activeRules: this.complianceRules.size,
          totalComplianceChecks: metrics.overall?.totalChecks || 0,
          complianceRate: metrics.overall?.complianceRate || 100,
          violationRate: this.calculateViolationRate(),
          regulatoryReports: this.regulatoryReports.size
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'sec-compliance',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = SECComplianceService;
