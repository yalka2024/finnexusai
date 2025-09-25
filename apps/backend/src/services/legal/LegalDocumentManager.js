/**
 * Legal Document Manager
 * Manages legal documentation including Terms of Service, Privacy Policy, and DPAs
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../../utils/logger');


class LegalDocumentManager {
  constructor() {
    this.documents = {
      termsOfService: {
        name: 'Terms of Service',
        version: '1.0.0',
        effectiveDate: '2024-01-01',
        lastUpdated: '2024-01-01',
        filePath: path.join(__dirname, '../../docs/legal/TERMS_OF_SERVICE.md'),
        hash: null,
        status: 'active',
        jurisdictions: ['US', 'EU', 'UK', 'CA'],
        languages: ['en', 'es', 'fr', 'de']
      },
      privacyPolicy: {
        name: 'Privacy Policy',
        version: '1.0.0',
        effectiveDate: '2024-01-01',
        lastUpdated: '2024-01-01',
        filePath: path.join(__dirname, '../../docs/legal/PRIVACY_POLICY.md'),
        hash: null,
        status: 'active',
        jurisdictions: ['US', 'EU', 'UK', 'CA'],
        languages: ['en', 'es', 'fr', 'de']
      },
      dataProcessingAgreements: {
        name: 'Data Processing Agreements',
        version: '1.0.0',
        effectiveDate: '2024-01-01',
        lastUpdated: '2024-01-01',
        filePath: path.join(__dirname, '../../docs/legal/DATA_PROCESSING_AGREEMENTS.md'),
        hash: null,
        status: 'active',
        jurisdictions: ['US', 'EU', 'UK', 'CA'],
        languages: ['en', 'es', 'fr', 'de']
      },
      cookiePolicy: {
        name: 'Cookie Policy',
        version: '1.0.0',
        effectiveDate: '2024-01-01',
        lastUpdated: '2024-01-01',
        filePath: path.join(__dirname, '../../docs/legal/COOKIE_POLICY.md'),
        hash: null,
        status: 'active',
        jurisdictions: ['US', 'EU', 'UK', 'CA'],
        languages: ['en', 'es', 'fr', 'de']
      },
      disclaimer: {
        name: 'Investment Disclaimer',
        version: '1.0.0',
        effectiveDate: '2024-01-01',
        lastUpdated: '2024-01-01',
        filePath: path.join(__dirname, '../../docs/legal/INVESTMENT_DISCLAIMER.md'),
        hash: null,
        status: 'active',
        jurisdictions: ['US', 'EU', 'UK', 'CA'],
        languages: ['en', 'es', 'fr', 'de']
      }
    };

    this.consentRecords = new Map();
    this.auditTrail = [];
    this.isInitialized = false;
  }

  /**
   * Initialize legal document manager
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing legal document manager...');

      // Load existing consent records
      await this.loadConsentRecords();

      // Validate all legal documents
      await this.validateAllDocuments();

      // Calculate document hashes
      await this.calculateDocumentHashes();

      // Start periodic validation
      this.startPeriodicValidation();

      this.isInitialized = true;
      logger.info('✅ Legal document manager initialized successfully');

      return {
        success: true,
        message: 'Legal document manager initialized successfully',
        documents: Object.keys(this.documents).length
      };

    } catch (error) {
      logger.error('❌ Failed to initialize legal document manager:', error);
      throw new Error(`Legal document manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Get legal document by type and jurisdiction
   */
  async getDocument(documentType, jurisdiction = 'US', language = 'en') {
    try {
      if (!this.documents[documentType]) {
        throw new Error(`Document type ${documentType} not found`);
      }

      const document = this.documents[documentType];

      // Check if jurisdiction is supported
      if (!document.jurisdictions.includes(jurisdiction)) {
        throw new Error(`Jurisdiction ${jurisdiction} not supported for ${documentType}`);
      }

      // Check if language is supported
      if (!document.languages.includes(language)) {
        throw new Error(`Language ${language} not supported for ${documentType}`);
      }

      // Read document content
      const content = await fs.readFile(document.filePath, 'utf8');

      // Log document access
      this.logDocumentAccess(documentType, jurisdiction, language);

      return {
        success: true,
        document: {
          type: documentType,
          name: document.name,
          version: document.version,
          effectiveDate: document.effectiveDate,
          lastUpdated: document.lastUpdated,
          jurisdiction: jurisdiction,
          language: language,
          content: content,
          hash: document.hash,
          status: document.status
        }
      };

    } catch (error) {
      logger.error(`❌ Error getting document ${documentType}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Record user consent for legal documents
   */
  async recordConsent(userId, documentType, jurisdiction, language, consentType = 'accept') {
    try {
      const consentRecord = {
        userId: userId,
        documentType: documentType,
        jurisdiction: jurisdiction,
        language: language,
        consentType: consentType, // 'accept', 'decline', 'withdraw'
        timestamp: new Date().toISOString(),
        ipAddress: null, // Will be set by the calling function
        userAgent: null, // Will be set by the calling function
        documentVersion: this.documents[documentType]?.version,
        documentHash: this.documents[documentType]?.hash
      };

      // Store consent record
      const consentKey = `${userId}_${documentType}_${jurisdiction}_${language}`;
      this.consentRecords.set(consentKey, consentRecord);

      // Save consent records
      await this.saveConsentRecords();

      // Log consent event
      this.logConsentEvent(consentRecord);

      logger.info(`✅ Consent recorded for user ${userId} for ${documentType}`);

      return {
        success: true,
        message: 'Consent recorded successfully',
        consentRecord: consentRecord
      };

    } catch (error) {
      logger.error('❌ Error recording consent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check user consent status
   */
  async checkConsentStatus(userId, documentType, jurisdiction = 'US', language = 'en') {
    try {
      const consentKey = `${userId}_${documentType}_${jurisdiction}_${language}`;
      const consentRecord = this.consentRecords.get(consentKey);

      if (!consentRecord) {
        return {
          success: true,
          hasConsent: false,
          consentRecord: null
        };
      }

      // Check if consent is still valid (not withdrawn)
      const isValid = consentRecord.consentType === 'accept' &&
                     !this.isConsentWithdrawn(userId, documentType, jurisdiction, language);

      return {
        success: true,
        hasConsent: isValid,
        consentRecord: consentRecord
      };

    } catch (error) {
      logger.error('❌ Error checking consent status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Withdraw user consent
   */
  async withdrawConsent(userId, documentType, jurisdiction = 'US', language = 'en') {
    try {
      const consentRecord = {
        userId: userId,
        documentType: documentType,
        jurisdiction: jurisdiction,
        language: language,
        consentType: 'withdraw',
        timestamp: new Date().toISOString(),
        ipAddress: null,
        userAgent: null,
        documentVersion: this.documents[documentType]?.version,
        documentHash: this.documents[documentType]?.hash
      };

      // Store withdrawal record
      const consentKey = `${userId}_${documentType}_${jurisdiction}_${language}_withdrawal`;
      this.consentRecords.set(consentKey, consentRecord);

      // Save consent records
      await this.saveConsentRecords();

      // Log withdrawal event
      this.logConsentEvent(consentRecord);

      logger.info(`✅ Consent withdrawn for user ${userId} for ${documentType}`);

      return {
        success: true,
        message: 'Consent withdrawn successfully',
        consentRecord: consentRecord
      };

    } catch (error) {
      logger.error('❌ Error withdrawing consent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate all legal documents
   */
  async validateAllDocuments() {
    try {
      logger.info('🔍 Validating all legal documents...');

      const validationResults = {};

      for (const [documentType, document] of Object.entries(this.documents)) {
        logger.info(`  📄 Validating ${document.name}...`);

        const validation = await this.validateDocument(documentType);
        validationResults[documentType] = validation;

        if (!validation.isValid) {
          logger.warn(`⚠️ Document ${documentType} validation failed:`, validation.errors);
        }
      }

      // Check for any validation failures
      const failedValidations = Object.values(validationResults).filter(result => !result.isValid);

      if (failedValidations.length > 0) {
        throw new Error(`Document validation failed for ${failedValidations.length} documents`);
      }

      logger.info('✅ All legal documents validated successfully');
      return {
        success: true,
        message: 'All documents validated successfully',
        results: validationResults
      };

    } catch (error) {
      logger.error('❌ Document validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate specific document
   */
  async validateDocument(documentType) {
    try {
      const document = this.documents[documentType];
      if (!document) {
        return {
          isValid: false,
          errors: [`Document type ${documentType} not found`]
        };
      }

      const errors = [];

      // Check if file exists
      try {
        await fs.access(document.filePath);
      } catch (error) {
        errors.push(`Document file not found: ${document.filePath}`);
      }

      // Check if document has required fields
      const requiredFields = ['name', 'version', 'effectiveDate', 'lastUpdated', 'status'];
      for (const field of requiredFields) {
        if (!document[field]) {
          errors.push(`Missing required field: ${field}`);
        }
      }

      // Check if document has supported jurisdictions
      if (!document.jurisdictions || document.jurisdictions.length === 0) {
        errors.push('No supported jurisdictions defined');
      }

      // Check if document has supported languages
      if (!document.languages || document.languages.length === 0) {
        errors.push('No supported languages defined');
      }

      // Check if document status is valid
      const validStatuses = ['active', 'draft', 'archived', 'superseded'];
      if (!validStatuses.includes(document.status)) {
        errors.push(`Invalid document status: ${document.status}`);
      }

      // Check if document version is valid
      if (!document.version || !document.version.match(/^\d+\.\d+\.\d+$/)) {
        errors.push(`Invalid document version format: ${document.version}`);
      }

      // Check if dates are valid
      if (!document.effectiveDate || !this.isValidDate(document.effectiveDate)) {
        errors.push(`Invalid effective date: ${document.effectiveDate}`);
      }

      if (!document.lastUpdated || !this.isValidDate(document.lastUpdated)) {
        errors.push(`Invalid last updated date: ${document.lastUpdated}`);
      }

      return {
        isValid: errors.length === 0,
        errors: errors,
        document: document
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`]
      };
    }
  }

  /**
   * Calculate document hashes
   */
  async calculateDocumentHashes() {
    try {
      logger.info('🔐 Calculating document hashes...');

      for (const [documentType, document] of Object.entries(this.documents)) {
        try {
          const content = await fs.readFile(document.filePath, 'utf8');
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          document.hash = hash;
          logger.info(`  📄 ${document.name}: ${hash.substring(0, 16)}...`);
        } catch (error) {
          logger.warn(`⚠️ Could not calculate hash for ${documentType}: ${error.message}`);
          document.hash = null;
        }
      }

      logger.info('✅ Document hashes calculated successfully');

    } catch (error) {
      logger.error('❌ Error calculating document hashes:', error);
    }
  }

  /**
   * Generate legal document report
   */
  async generateLegalReport() {
    try {
      const report = {
        title: 'Legal Document Compliance Report',
        generated: new Date().toISOString(),
        version: '1.0.0',
        documents: {},
        consentSummary: {
          totalRecords: this.consentRecords.size,
          activeConsents: 0,
          withdrawnConsents: 0,
          jurisdictions: new Set(),
          languages: new Set()
        },
        auditTrail: this.auditTrail.slice(-100) // Last 100 entries
      };

      // Document status summary
      for (const [documentType, document] of Object.entries(this.documents)) {
        report.documents[documentType] = {
          name: document.name,
          version: document.version,
          status: document.status,
          effectiveDate: document.effectiveDate,
          lastUpdated: document.lastUpdated,
          jurisdictions: document.jurisdictions,
          languages: document.languages,
          hash: document.hash
        };
      }

      // Consent summary
      for (const consentRecord of this.consentRecords.values()) {
        if (consentRecord.consentType === 'accept') {
          report.consentSummary.activeConsents++;
        } else if (consentRecord.consentType === 'withdraw') {
          report.consentSummary.withdrawnConsents++;
        }

        report.consentSummary.jurisdictions.add(consentRecord.jurisdiction);
        report.consentSummary.languages.add(consentRecord.language);
      }

      // Convert Sets to Arrays for JSON serialization
      report.consentSummary.jurisdictions = Array.from(report.consentSummary.jurisdictions);
      report.consentSummary.languages = Array.from(report.consentSummary.languages);

      // Save report
      const reportPath = path.join(__dirname, '../../reports/legal-document-report.json');
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

      return report;

    } catch (error) {
      logger.error('❌ Failed to generate legal report:', error);
      throw error;
    }
  }

  /**
   * Load consent records from storage
   */
  async loadConsentRecords() {
    try {
      const consentPath = path.join(__dirname, '../../data/legal-consent-records.json');
      const data = await fs.readFile(consentPath, 'utf8');
      const consentData = JSON.parse(data);

      // Load consent records into Map
      for (const [key, record] of Object.entries(consentData)) {
        this.consentRecords.set(key, record);
      }

      logger.info(`✅ Loaded ${this.consentRecords.size} consent records`);
    } catch (error) {
      logger.info('⚠️ No existing consent records found, starting fresh');
      this.consentRecords = new Map();
    }
  }

  /**
   * Save consent records to storage
   */
  async saveConsentRecords() {
    try {
      const consentPath = path.join(__dirname, '../../data/legal-consent-records.json');
      const consentData = Object.fromEntries(this.consentRecords);

      await fs.mkdir(path.dirname(consentPath), { recursive: true });
      await fs.writeFile(consentPath, JSON.stringify(consentData, null, 2));
    } catch (error) {
      logger.error('❌ Failed to save consent records:', error);
    }
  }

  /**
   * Start periodic validation
   */
  startPeriodicValidation() {
    // Run validation every 24 hours
    setInterval(async() => {
      try {
        await this.validateAllDocuments();
        await this.calculateDocumentHashes();
      } catch (error) {
        logger.error('❌ Error in periodic validation:', error);
      }
    }, 24 * 60 * 60 * 1000);

    logger.info('✅ Periodic validation started');
  }

  /**
   * Log document access
   */
  logDocumentAccess(documentType, jurisdiction, language) {
    const logEntry = {
      event: 'document_access',
      documentType: documentType,
      jurisdiction: jurisdiction,
      language: language,
      timestamp: new Date().toISOString()
    };

    this.auditTrail.push(logEntry);
  }

  /**
   * Log consent event
   */
  logConsentEvent(consentRecord) {
    const logEntry = {
      event: 'consent_event',
      userId: consentRecord.userId,
      documentType: consentRecord.documentType,
      consentType: consentRecord.consentType,
      timestamp: consentRecord.timestamp
    };

    this.auditTrail.push(logEntry);
  }

  /**
   * Check if consent has been withdrawn
   */
  isConsentWithdrawn(userId, documentType, jurisdiction, language) {
    const withdrawalKey = `${userId}_${documentType}_${jurisdiction}_${language}_withdrawal`;
    return this.consentRecords.has(withdrawalKey);
  }

  /**
   * Validate date format
   */
  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Get legal document status
   */
  getDocumentStatus() {
    return {
      isInitialized: this.isInitialized,
      documents: Object.keys(this.documents).length,
      consentRecords: this.consentRecords.size,
      auditTrailEntries: this.auditTrail.length
    };
  }

  /**
   * Shutdown legal document manager
   */
  async shutdown() {
    try {
      // Save consent records
      await this.saveConsentRecords();

      // Generate final report
      await this.generateLegalReport();

      logger.info('✅ Legal document manager shutdown completed');
    } catch (error) {
      logger.error('❌ Error shutting down legal document manager:', error);
    }
  }
}

module.exports = new LegalDocumentManager();
