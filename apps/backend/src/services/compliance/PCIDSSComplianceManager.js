/**
 * PCI DSS Compliance Manager
 * Manages PCI DSS compliance requirements and controls for payment card industry
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../../utils/logger');


class PCIDSSComplianceManager {
  constructor() {
    this.pciDSSRequirements = {
      requirement1: {
        title: 'Install and maintain a firewall configuration to protect cardholder data',
        description: 'Firewalls are computer devices that control computer traffic allowed into and out of a company\'s network',
        controls: [
          '1.1', '1.2', '1.3', '1.4', '1.5', '1.6'
        ]
      },
      requirement2: {
        title: 'Do not use vendor-supplied defaults for system passwords and other security parameters',
        description: 'Malicious individuals (external and internal to a company) often use vendor default passwords and other vendor default settings to compromise systems',
        controls: [
          '2.1', '2.2', '2.3', '2.4', '2.5', '2.6'
        ]
      },
      requirement3: {
        title: 'Protect stored cardholder data',
        description: 'Protection methods such as encryption, truncation, masking, and hashing are critical components of cardholder data protection',
        controls: [
          '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7'
        ]
      },
      requirement4: {
        title: 'Encrypt transmission of cardholder data across open, public networks',
        description: 'Sensitive information must be encrypted during transmission over networks that are easy and common for a hacker to intercept, modify, and divert data while in transit',
        controls: [
          '4.1', '4.2'
        ]
      },
      requirement5: {
        title: 'Protect all systems against malware and regularly update anti-virus software or programs',
        description: 'Anti-virus software must be used on all systems commonly affected by malware to protect systems from current and evolving malicious software threats',
        controls: [
          '5.1', '5.2', '5.3'
        ]
      },
      requirement6: {
        title: 'Develop and maintain secure systems and applications',
        description: 'Vulnerabilities are being discovered continually by malicious individuals and researchers, and being introduced by software developers',
        controls: [
          '6.1', '6.2', '6.3', '6.4', '6.5', '6.6', '6.7', '6.8'
        ]
      },
      requirement7: {
        title: 'Restrict access to cardholder data by business need to know',
        description: 'To ensure critical data can only be accessed by authorized personnel, systems and processes must be in place to limit access based on need to know and according to job responsibilities',
        controls: [
          '7.1', '7.2', '7.3'
        ]
      },
      requirement8: {
        title: 'Identify and authenticate access to system components',
        description: 'Assigning a unique identification (ID) to each person with access ensures that actions taken on critical data and systems are performed by, and can be traced to, known and authorized users',
        controls: [
          '8.1', '8.2', '8.3', '8.4', '8.5', '8.6', '8.7', '8.8'
        ]
      },
      requirement9: {
        title: 'Restrict physical access to cardholder data',
        description: 'Any physical access to data or systems that house cardholder data provides the opportunity for individuals to access devices or data and to remove systems or hardcopies',
        controls: [
          '9.1', '9.2', '9.3', '9.4', '9.5', '9.6', '9.7', '9.8', '9.9', '9.10'
        ]
      },
      requirement10: {
        title: 'Track and monitor all access to network resources and cardholder data',
        description: 'Logging mechanisms and the ability to track user activities are critical in preventing, detecting, or minimizing the impact of a data compromise',
        controls: [
          '10.1', '10.2', '10.3', '10.4', '10.5', '10.6', '10.7', '10.8'
        ]
      },
      requirement11: {
        title: 'Regularly test security systems and processes',
        description: 'Vulnerabilities are being discovered continually by malicious individuals and researchers, and being introduced by software developers',
        controls: [
          '11.1', '11.2', '11.3', '11.4', '11.5', '11.6'
        ]
      },
      requirement12: {
        title: 'Maintain a policy that addresses information security for all personnel',
        description: 'A strong security policy sets the security tone for the whole entity and informs personnel what is expected of them',
        controls: [
          '12.1', '12.2', '12.3', '12.4', '12.5', '12.6', '12.7', '12.8', '12.9', '12.10'
        ]
      }
    };

    this.controlFramework = {
      '1.1': {
        title: 'Establish and implement firewall and router configuration standards',
        description: 'Firewall and router configuration standards must be established and implemented',
        implementation: 'Implement firewall rules, network segmentation, and router configuration standards',
        evidence: ['firewall_configs', 'router_configs', 'network_diagrams'],
        frequency: 'quarterly',
        owner: 'Network Security Team'
      },
      '1.2': {
        title: 'Build firewall and router configurations that restrict connections between untrusted networks and any system in the cardholder data environment',
        description: 'Firewall and router configurations must restrict connections between untrusted networks and cardholder data environment',
        implementation: 'Implement network segmentation and access controls',
        evidence: ['firewall_rules', 'network_segmentation', 'access_controls'],
        frequency: 'quarterly',
        owner: 'Network Security Team'
      },
      '1.3': {
        title: 'Prohibit direct public access between the Internet and any system component in the cardholder data environment',
        description: 'Direct public access between Internet and cardholder data environment must be prohibited',
        implementation: 'Implement DMZ, proxy servers, and network isolation',
        evidence: ['network_architecture', 'dmz_configs', 'proxy_configs'],
        frequency: 'quarterly',
        owner: 'Network Security Team'
      },
      '1.4': {
        title: 'Install personal firewall software on any mobile and/or employee-owned devices that connect to the Internet when outside the network',
        description: 'Personal firewall software must be installed on mobile and employee-owned devices',
        implementation: 'Implement endpoint protection and mobile device management',
        evidence: ['endpoint_protection', 'mdm_configs', 'mobile_security'],
        frequency: 'monthly',
        owner: 'IT Security Team'
      },
      '1.5': {
        title: 'Ensure that security policies and operational procedures for managing firewalls are documented, in use, and known to all affected parties',
        description: 'Security policies and operational procedures for firewalls must be documented and known',
        implementation: 'Document firewall policies and procedures',
        evidence: ['firewall_policies', 'operational_procedures', 'training_records'],
        frequency: 'annually',
        owner: 'Security Team'
      },
      '1.6': {
        title: 'Ensure that security policies and operational procedures for managing firewalls are documented, in use, and known to all affected parties',
        description: 'Security policies and operational procedures for firewalls must be documented and known',
        implementation: 'Document firewall policies and procedures',
        evidence: ['firewall_policies', 'operational_procedures', 'training_records'],
        frequency: 'annually',
        owner: 'Security Team'
      },
      '2.1': {
        title: 'Always change vendor-supplied defaults and remove or disable unnecessary default accounts before installing a system on the network',
        description: 'Vendor-supplied defaults must be changed and unnecessary default accounts removed',
        implementation: 'Change default passwords and remove unnecessary accounts',
        evidence: ['password_changes', 'account_removal', 'system_configs'],
        frequency: 'on_install',
        owner: 'System Administration Team'
      },
      '2.2': {
        title: 'Develop configuration standards for all system components. Assure that these standards address all known security vulnerabilities and are consistent with industry-accepted system hardening standards',
        description: 'Configuration standards must be developed for all system components',
        implementation: 'Develop and implement system hardening standards',
        evidence: ['hardening_standards', 'config_standards', 'vulnerability_assessments'],
        frequency: 'quarterly',
        owner: 'System Administration Team'
      },
      '2.3': {
        title: 'Encrypt all non-console administrative access using strong cryptography',
        description: 'All non-console administrative access must be encrypted',
        implementation: 'Implement encrypted administrative access',
        evidence: ['encrypted_admin_access', 'crypto_configs', 'access_logs'],
        frequency: 'continuous',
        owner: 'System Administration Team'
      },
      '2.4': {
        title: 'Maintain an inventory of authorized wireless access points connected to the cardholder data environment',
        description: 'Inventory of authorized wireless access points must be maintained',
        implementation: 'Maintain wireless access point inventory',
        evidence: ['wireless_inventory', 'access_point_configs', 'monitoring_logs'],
        frequency: 'quarterly',
        owner: 'Network Team'
      },
      '2.5': {
        title: 'Ensure that security policies and operational procedures for managing vendor defaults and other security parameters are documented, in use, and known to all affected parties',
        description: 'Security policies and operational procedures for vendor defaults must be documented',
        implementation: 'Document vendor default management procedures',
        evidence: ['vendor_default_policies', 'operational_procedures', 'training_records'],
        frequency: 'annually',
        owner: 'Security Team'
      },
      '2.6': {
        title: 'Ensure that security policies and operational procedures for managing vendor defaults and other security parameters are documented, in use, and known to all affected parties',
        description: 'Security policies and operational procedures for vendor defaults must be documented',
        implementation: 'Document vendor default management procedures',
        evidence: ['vendor_default_policies', 'operational_procedures', 'training_records'],
        frequency: 'annually',
        owner: 'Security Team'
      }
    };

    this.complianceStatus = {
      overall: 'not_assessed',
      requirements: {},
      controls: {},
      evidence: {},
      gaps: [],
      recommendations: [],
      lastAssessment: null,
      nextAssessment: null,
      scope: {
        cardholderDataEnvironment: false,
        connectedSystems: false,
        thirdPartyServices: false,
        wirelessNetworks: false
      }
    };

    this.isInitialized = false;
    this.assessmentInterval = null;
  }

  /**
   * Initialize PCI DSS compliance manager
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing PCI DSS compliance manager...');

      // Load existing compliance status
      await this.loadComplianceStatus();

      // Start continuous monitoring
      this.startContinuousMonitoring();

      // Perform initial assessment
      await this.performComplianceAssessment();

      this.isInitialized = true;
      logger.info('✅ PCI DSS compliance manager initialized successfully');

      return {
        success: true,
        message: 'PCI DSS compliance manager initialized successfully',
        status: this.complianceStatus
      };

    } catch (error) {
      logger.error('❌ Failed to initialize PCI DSS compliance manager:', error);
      throw new Error(`PCI DSS compliance manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Perform comprehensive PCI DSS compliance assessment
   */
  async performComplianceAssessment() {
    try {
      logger.info('🔍 Performing PCI DSS compliance assessment...');

      const assessment = {
        timestamp: new Date().toISOString(),
        assessor: 'PCIDSSComplianceManager',
        version: '1.0.0',
        requirements: {},
        overallScore: 0,
        totalControls: 0,
        compliantControls: 0,
        gaps: [],
        recommendations: []
      };

      // Assess each requirement
      for (const [reqId, requirement] of Object.entries(this.pciDSSRequirements)) {
        logger.info(`📋 Assessing ${requirement.title}...`);

        const requirementAssessment = await this.assessRequirement(reqId, requirement);
        assessment.requirements[reqId] = requirementAssessment;

        assessment.totalControls += requirementAssessment.totalControls;
        assessment.compliantControls += requirementAssessment.compliantControls;
      }

      // Calculate overall score
      assessment.overallScore = assessment.totalControls > 0
        ? (assessment.compliantControls / assessment.totalControls) * 100
        : 0;

      // Determine overall compliance status
      if (assessment.overallScore >= 95) {
        assessment.overallStatus = 'compliant';
      } else if (assessment.overallScore >= 80) {
        assessment.overallStatus = 'mostly_compliant';
      } else if (assessment.overallScore >= 60) {
        assessment.overallStatus = 'partially_compliant';
      } else {
        assessment.overallStatus = 'non_compliant';
      }

      // Update compliance status
      this.complianceStatus.overall = assessment.overallStatus;
      this.complianceStatus.requirements = assessment.requirements;
      this.complianceStatus.lastAssessment = assessment.timestamp;
      this.complianceStatus.nextAssessment = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Save assessment results
      await this.saveComplianceStatus();

      logger.info(`✅ PCI DSS compliance assessment completed. Overall score: ${assessment.overallScore.toFixed(2)}%`);

      return {
        success: true,
        message: 'PCI DSS compliance assessment completed successfully',
        assessment: assessment
      };

    } catch (error) {
      logger.error('❌ PCI DSS compliance assessment failed:', error);
      throw new Error(`PCI DSS compliance assessment failed: ${error.message}`);
    }
  }

  /**
   * Assess specific PCI DSS requirement
   */
  async assessRequirement(reqId, requirement) {
    const assessment = {
      title: requirement.title,
      description: requirement.description,
      controls: {},
      totalControls: requirement.controls.length,
      compliantControls: 0,
      score: 0,
      gaps: [],
      recommendations: []
    };

    // Assess each control
    for (const controlId of requirement.controls) {
      const control = this.controlFramework[controlId];
      if (!control) continue;

      logger.info(`  🔍 Assessing control ${controlId}: ${control.title}`);

      const controlAssessment = await this.assessControl(controlId, control);
      assessment.controls[controlId] = controlAssessment;

      if (controlAssessment.status === 'compliant') {
        assessment.compliantControls++;
      } else {
        assessment.gaps.push({
          controlId: controlId,
          title: control.title,
          status: controlAssessment.status,
          gaps: controlAssessment.gaps,
          recommendations: controlAssessment.recommendations
        });
      }
    }

    // Calculate requirement score
    assessment.score = assessment.totalControls > 0
      ? (assessment.compliantControls / assessment.totalControls) * 100
      : 0;

    return assessment;
  }

  /**
   * Assess specific control
   */
  async assessControl(controlId, control) {
    const assessment = {
      controlId: controlId,
      title: control.title,
      description: control.description,
      status: 'not_assessed',
      evidence: {},
      gaps: [],
      recommendations: [],
      lastAssessed: new Date().toISOString()
    };

    try {
      // Check evidence availability
      for (const evidenceType of control.evidence) {
        const evidenceStatus = await this.checkEvidence(evidenceType);
        assessment.evidence[evidenceType] = evidenceStatus;

        if (!evidenceStatus.available) {
          assessment.gaps.push(`Missing evidence: ${evidenceType}`);
        }
      }

      // Perform control-specific assessment
      const controlResult = await this.performControlAssessment(controlId, control);
      assessment.status = controlResult.status;
      assessment.gaps = [...assessment.gaps, ...controlResult.gaps];
      assessment.recommendations = controlResult.recommendations;

      // Update control status
      this.complianceStatus.controls[controlId] = assessment;

    } catch (error) {
      logger.error(`❌ Error assessing control ${controlId}:`, error);
      assessment.status = 'error';
      assessment.gaps.push(`Assessment error: ${error.message}`);
    }

    return assessment;
  }

  /**
   * Check evidence availability
   */
  async checkEvidence(evidenceType) {
    try {
      switch (evidenceType) {
      case 'firewall_configs':
        return await this.checkFirewallConfigurations();
      case 'router_configs':
        return await this.checkRouterConfigurations();
      case 'network_diagrams':
        return await this.checkNetworkDiagrams();
      case 'firewall_rules':
        return await this.checkFirewallRules();
      case 'network_segmentation':
        return await this.checkNetworkSegmentation();
      case 'access_controls':
        return await this.checkAccessControls();
      case 'network_architecture':
        return await this.checkNetworkArchitecture();
      case 'dmz_configs':
        return await this.checkDMZConfigurations();
      case 'proxy_configs':
        return await this.checkProxyConfigurations();
      case 'endpoint_protection':
        return await this.checkEndpointProtection();
      case 'mdm_configs':
        return await this.checkMDMConfigurations();
      case 'mobile_security':
        return await this.checkMobileSecurity();
      case 'firewall_policies':
        return await this.checkFirewallPolicies();
      case 'operational_procedures':
        return await this.checkOperationalProcedures();
      case 'training_records':
        return await this.checkTrainingRecords();
      case 'password_changes':
        return await this.checkPasswordChanges();
      case 'account_removal':
        return await this.checkAccountRemoval();
      case 'system_configs':
        return await this.checkSystemConfigurations();
      case 'hardening_standards':
        return await this.checkHardeningStandards();
      case 'config_standards':
        return await this.checkConfigurationStandards();
      case 'vulnerability_assessments':
        return await this.checkVulnerabilityAssessments();
      case 'encrypted_admin_access':
        return await this.checkEncryptedAdminAccess();
      case 'crypto_configs':
        return await this.checkCryptoConfigurations();
      case 'access_logs':
        return await this.checkAccessLogs();
      case 'wireless_inventory':
        return await this.checkWirelessInventory();
      case 'access_point_configs':
        return await this.checkAccessPointConfigurations();
      case 'monitoring_logs':
        return await this.checkMonitoringLogs();
      case 'vendor_default_policies':
        return await this.checkVendorDefaultPolicies();
      default:
        return { available: false, message: `Unknown evidence type: ${evidenceType}` };
      }
    } catch (error) {
      return { available: false, message: `Error checking evidence: ${error.message}` };
    }
  }

  /**
   * Perform control-specific assessment
   */
  async performControlAssessment(controlId, control) {
    try {
      switch (controlId) {
      case '1.1':
        return await this.assessFirewallConfigurationStandards();
      case '1.2':
        return await this.assessFirewallRestrictions();
      case '1.3':
        return await this.assessPublicAccessRestrictions();
      case '1.4':
        return await this.assessPersonalFirewallSoftware();
      case '1.5':
      case '1.6':
        return await this.assessFirewallPolicies();
      case '2.1':
        return await this.assessVendorDefaults();
      case '2.2':
        return await this.assessConfigurationStandards();
      case '2.3':
        return await this.assessEncryptedAdminAccess();
      case '2.4':
        return await this.assessWirelessInventory();
      case '2.5':
      case '2.6':
        return await this.assessVendorDefaultPolicies();
      default:
        return { status: 'not_assessed', gaps: [], recommendations: [] };
      }
    } catch (error) {
      return {
        status: 'error',
        gaps: [`Assessment error: ${error.message}`],
        recommendations: ['Review control implementation and retry assessment']
      };
    }
  }

  /**
   * Assess firewall configuration standards (1.1)
   */
  async assessFirewallConfigurationStandards() {
    const gaps = [];
    const recommendations = [];

    try {
      // Check firewall configuration standards
      const firewallStandards = await this.checkFirewallConfigurationStandards();
      if (!firewallStandards.exist) {
        gaps.push('Firewall configuration standards not documented');
        recommendations.push('Develop and document firewall configuration standards');
      }

      // Check router configuration standards
      const routerStandards = await this.checkRouterConfigurationStandards();
      if (!routerStandards.exist) {
        gaps.push('Router configuration standards not documented');
        recommendations.push('Develop and document router configuration standards');
      }

      const status = gaps.length === 0 ? 'compliant' : 'non_compliant';
      return { status, gaps, recommendations };

    } catch (error) {
      return {
        status: 'error',
        gaps: [`Assessment error: ${error.message}`],
        recommendations: ['Review firewall configuration standards']
      };
    }
  }

  /**
   * Assess firewall restrictions (1.2)
   */
  async assessFirewallRestrictions() {
    const gaps = [];
    const recommendations = [];

    try {
      // Check network segmentation
      const segmentation = await this.checkNetworkSegmentation();
      if (!segmentation.implemented) {
        gaps.push('Network segmentation not properly implemented');
        recommendations.push('Implement proper network segmentation between untrusted networks and cardholder data environment');
      }

      // Check firewall rules
      const firewallRules = await this.checkFirewallRules();
      if (!firewallRules.restrictive) {
        gaps.push('Firewall rules not restrictive enough');
        recommendations.push('Implement restrictive firewall rules to prevent unauthorized access');
      }

      const status = gaps.length === 0 ? 'compliant' : 'non_compliant';
      return { status, gaps, recommendations };

    } catch (error) {
      return {
        status: 'error',
        gaps: [`Assessment error: ${error.message}`],
        recommendations: ['Review firewall restrictions']
      };
    }
  }

  /**
   * Start continuous monitoring
   */
  startContinuousMonitoring() {
    if (this.assessmentInterval) {
      clearInterval(this.assessmentInterval);
    }

    // Run assessment every 24 hours
    this.assessmentInterval = setInterval(async() => {
      try {
        await this.performComplianceAssessment();
      } catch (error) {
        logger.error('❌ Error in continuous PCI DSS monitoring:', error);
      }
    }, 24 * 60 * 60 * 1000);

    logger.info('✅ PCI DSS continuous monitoring started');
  }

  /**
   * Load compliance status from storage
   */
  async loadComplianceStatus() {
    try {
      const statusPath = path.join(__dirname, '../../data/pci-dss-compliance-status.json');
      const data = await fs.readFile(statusPath, 'utf8');
      this.complianceStatus = JSON.parse(data);
      logger.info('✅ PCI DSS compliance status loaded');
    } catch (error) {
      logger.info('⚠️ No existing PCI DSS compliance status found, starting fresh');
      this.complianceStatus = {
        overall: 'not_assessed',
        requirements: {},
        controls: {},
        evidence: {},
        gaps: [],
        recommendations: [],
        lastAssessment: null,
        nextAssessment: null,
        scope: {
          cardholderDataEnvironment: false,
          connectedSystems: false,
          thirdPartyServices: false,
          wirelessNetworks: false
        }
      };
    }
  }

  /**
   * Save compliance status to storage
   */
  async saveComplianceStatus() {
    try {
      const statusPath = path.join(__dirname, '../../data/pci-dss-compliance-status.json');
      await fs.mkdir(path.dirname(statusPath), { recursive: true });
      await fs.writeFile(statusPath, JSON.stringify(this.complianceStatus, null, 2));
      logger.info('✅ PCI DSS compliance status saved');
    } catch (error) {
      logger.error('❌ Failed to save PCI DSS compliance status:', error);
    }
  }

  /**
   * Get compliance status
   */
  getComplianceStatus() {
    return this.complianceStatus;
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport() {
    try {
      const report = {
        title: 'PCI DSS Compliance Report',
        generated: new Date().toISOString(),
        version: '1.0.0',
        status: this.complianceStatus,
        summary: {
          overallScore: this.calculateOverallScore(),
          totalControls: this.getTotalControls(),
          compliantControls: this.getCompliantControls(),
          gaps: this.complianceStatus.gaps.length,
          recommendations: this.complianceStatus.recommendations.length
        },
        details: this.complianceStatus
      };

      // Save report
      const reportPath = path.join(__dirname, '../../reports/pci-dss-compliance-report.json');
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

      return report;
    } catch (error) {
      logger.error('❌ Failed to generate compliance report:', error);
      throw error;
    }
  }

  /**
   * Calculate overall compliance score
   */
  calculateOverallScore() {
    const totalControls = this.getTotalControls();
    const compliantControls = this.getCompliantControls();
    return totalControls > 0 ? (compliantControls / totalControls) * 100 : 0;
  }

  /**
   * Get total number of controls
   */
  getTotalControls() {
    return Object.keys(this.controlFramework).length;
  }

  /**
   * Get number of compliant controls
   */
  getCompliantControls() {
    let compliant = 0;
    for (const [controlId, control] of Object.entries(this.complianceStatus.controls)) {
      if (control.status === 'compliant') {
        compliant++;
      }
    }
    return compliant;
  }

  /**
   * Shutdown compliance manager
   */
  async shutdown() {
    try {
      if (this.assessmentInterval) {
        clearInterval(this.assessmentInterval);
        this.assessmentInterval = null;
      }
      logger.info('✅ PCI DSS compliance manager shutdown completed');
    } catch (error) {
      logger.error('❌ Error shutting down PCI DSS compliance manager:', error);
    }
  }
}

module.exports = new PCIDSSComplianceManager();
