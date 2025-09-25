/**
 * Data Retention Manager
 * Comprehensive data retention policies with GDPR/CCPA compliance
 */

const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../../utils/logger');

class DataRetentionManager extends EventEmitter {
  constructor() {
    super();
    this.config = {
      postgresUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/fin_nexus_ai',
      mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/finnexusai',
      retentionPoliciesDir: path.join(__dirname, '..', '..', 'config', 'retention-policies'),
      archiveDir: path.join(__dirname, '..', '..', 'data', 'archives'),
      enableAutomaticRetention: process.env.ENABLE_AUTOMATIC_RETENTION !== 'false',
      enableDataAnonymization: process.env.ENABLE_DATA_ANONYMIZATION !== 'false',
      enableArchiveBeforeDeletion: process.env.ENABLE_ARCHIVE_BEFORE_DELETION !== 'false',
      retentionCheckInterval: parseInt(process.env.RETENTION_CHECK_INTERVAL) || 86400000, // 24 hours
      batchSize: parseInt(process.env.RETENTION_BATCH_SIZE) || 1000,
      maxRetentionAge: parseInt(process.env.MAX_RETENTION_AGE) || 31536000000, // 1 year in milliseconds
      enableAuditLogging: process.env.ENABLE_RETENTION_AUDIT_LOGGING !== 'false'
    };

    this.postgres = null;
    this.mongodb = null;
    this.retentionPolicies = new Map();
    this.retentionJobs = new Map();
    this.retentionInterval = null;

    // GDPR/CCPA compliance settings
    this.complianceConfig = {
      gdpr: {
        enabled: process.env.GDPR_COMPLIANCE === 'true',
        dataSubjectRights: ['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'],
        legalBasis: ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'],
        retentionPeriods: {
          personal_data: 365, // days
          financial_records: 2555, // 7 years
          marketing_data: 365,
          audit_logs: 2555
        }
      },
      ccpa: {
        enabled: process.env.CCPA_COMPLIANCE === 'true',
        consumerRights: ['know', 'delete', 'opt-out', 'non-discrimination'],
        retentionPeriods: {
          personal_information: 365,
          financial_information: 2555,
          commercial_information: 365
        }
      },
      sox: {
        enabled: process.env.SOX_COMPLIANCE === 'true',
        retentionPeriods: {
          financial_records: 2555,
          audit_trails: 2555,
          communications: 2555
        }
      }
    };

    // Data categories and their retention policies
    this.dataCategories = {
      user_profile: {
        retentionPeriod: 365, // days
        anonymizationFields: ['email', 'phone', 'address', 'ssn', 'date_of_birth'],
        deletionStrategy: 'anonymize_first',
        legalBasis: 'consent',
        complianceFrameworks: ['gdpr', 'ccpa']
      },
      trading_history: {
        retentionPeriod: 2555, // 7 years for financial records
        anonymizationFields: ['user_id', 'account_number'],
        deletionStrategy: 'archive_then_anonymize',
        legalBasis: 'legal_obligation',
        complianceFrameworks: ['sox', 'gdpr']
      },
      audit_logs: {
        retentionPeriod: 2555, // 7 years
        anonymizationFields: ['user_id', 'ip_address'],
        deletionStrategy: 'archive_then_delete',
        legalBasis: 'legal_obligation',
        complianceFrameworks: ['sox', 'gdpr']
      },
      marketing_data: {
        retentionPeriod: 365,
        anonymizationFields: ['email', 'phone', 'preferences'],
        deletionStrategy: 'delete_immediately',
        legalBasis: 'consent',
        complianceFrameworks: ['gdpr', 'ccpa']
      },
      system_logs: {
        retentionPeriod: 90,
        anonymizationFields: ['user_id', 'session_id'],
        deletionStrategy: 'compress_then_delete',
        legalBasis: 'legitimate_interests',
        complianceFrameworks: ['gdpr']
      },
      api_logs: {
        retentionPeriod: 30,
        anonymizationFields: ['user_id', 'ip_address'],
        deletionStrategy: 'delete_immediately',
        legalBasis: 'legitimate_interests',
        complianceFrameworks: ['gdpr']
      }
    };
  }

  /**
   * Initialize the data retention manager
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing data retention manager...');

      // Initialize database connections
      await this.initializeConnections();

      // Create necessary directories
      await this.createDirectories();

      // Load retention policies
      await this.loadRetentionPolicies();

      // Create retention tracking tables
      await this.createRetentionTables();

      // Start retention monitoring
      if (this.config.enableAutomaticRetention) {
        this.startRetentionMonitoring();
      }

      logger.info('✅ Data retention manager initialized successfully');

      return {
        success: true,
        message: 'Data retention manager initialized successfully',
        config: {
          automaticRetention: this.config.enableAutomaticRetention,
          dataAnonymization: this.config.enableDataAnonymization,
          archiveBeforeDeletion: this.config.enableArchiveBeforeDeletion,
          checkInterval: this.config.retentionCheckInterval,
          dataCategories: Object.keys(this.dataCategories).length,
          complianceFrameworks: this.getActiveComplianceFrameworks()
        }
      };

    } catch (error) {
      logger.error('❌ Failed to initialize data retention manager:', error);
      throw new Error(`Data retention manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize database connections
   */
  async initializeConnections() {
    // PostgreSQL connection
    this.postgres = new Pool({
      connectionString: this.config.postgresUrl,
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    // MongoDB connection
    this.mongodb = new MongoClient(this.config.mongoUrl);
    await this.mongodb.connect();
  }

  /**
   * Create necessary directories
   */
  async createDirectories() {
    const directories = [
      this.config.retentionPoliciesDir,
      this.config.archiveDir,
      path.join(this.config.archiveDir, 'postgres'),
      path.join(this.config.archiveDir, 'mongodb'),
      path.join(this.config.archiveDir, 'anonymized')
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
   * Load retention policies
   */
  async loadRetentionPolicies() {
    try {
      // Load default policies
      for (const [category, policy] of Object.entries(this.dataCategories)) {
        this.retentionPolicies.set(category, {
          ...policy,
          id: category,
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        });
      }

      // Load custom policies from files
      const policyFiles = await this.getPolicyFiles();
      for (const file of policyFiles) {
        await this.loadPolicyFromFile(file);
      }

      logger.info(`✅ Loaded ${this.retentionPolicies.size} retention policies`);
    } catch (error) {
      logger.warn('⚠️ Could not load retention policies:', error.message);
    }
  }

  /**
   * Get policy files
   */
  async getPolicyFiles() {
    try {
      const files = await fs.readdir(this.config.retentionPoliciesDir);
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      return [];
    }
  }

  /**
   * Load policy from file
   */
  async loadPolicyFromFile(filename) {
    try {
      const filePath = path.join(this.config.retentionPoliciesDir, filename);
      const content = await fs.readFile(filePath, 'utf8');
      const policy = JSON.parse(content);

      this.retentionPolicies.set(policy.id, {
        ...policy,
        loadedFrom: filename,
        lastModified: new Date().toISOString()
      });
    } catch (error) {
      logger.warn(`⚠️ Could not load policy from ${filename}:`, error.message);
    }
  }

  /**
   * Create retention tracking tables
   */
  async createRetentionTables() {
    try {
      const client = await this.postgres.connect();

      // Create data retention log table
      await client.query(`
        CREATE TABLE IF NOT EXISTS data_retention_log (
          id SERIAL PRIMARY KEY,
          policy_id VARCHAR(255) NOT NULL,
          table_name VARCHAR(255) NOT NULL,
          operation VARCHAR(50) NOT NULL,
          records_processed INTEGER DEFAULT 0,
          records_deleted INTEGER DEFAULT 0,
          records_anonymized INTEGER DEFAULT 0,
          records_archived INTEGER DEFAULT 0,
          execution_time_ms INTEGER,
          status VARCHAR(20) DEFAULT 'pending',
          error_message TEXT,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          executed_by VARCHAR(255),
          compliance_frameworks TEXT[]
        );
      `);

      // Create data subject requests table
      await client.query(`
        CREATE TABLE IF NOT EXISTS data_subject_requests (
          id SERIAL PRIMARY KEY,
          request_id VARCHAR(255) UNIQUE NOT NULL,
          subject_type VARCHAR(50) NOT NULL,
          subject_identifier VARCHAR(255) NOT NULL,
          request_type VARCHAR(50) NOT NULL,
          legal_basis VARCHAR(100),
          status VARCHAR(20) DEFAULT 'pending',
          requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          processed_at TIMESTAMP,
          processed_by VARCHAR(255),
          response_data JSONB,
          notes TEXT
        );
      `);

      // Create data retention policies table
      await client.query(`
        CREATE TABLE IF NOT EXISTS data_retention_policies (
          id SERIAL PRIMARY KEY,
          policy_id VARCHAR(255) UNIQUE NOT NULL,
          policy_name VARCHAR(255) NOT NULL,
          data_category VARCHAR(100) NOT NULL,
          retention_period_days INTEGER NOT NULL,
          deletion_strategy VARCHAR(50) NOT NULL,
          anonymization_fields TEXT[],
          legal_basis VARCHAR(100),
          compliance_frameworks TEXT[],
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_data_retention_log_policy_id 
        ON data_retention_log(policy_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_data_retention_log_executed_at 
        ON data_retention_log(executed_at);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_data_subject_requests_subject_identifier 
        ON data_subject_requests(subject_identifier);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_data_subject_requests_status 
        ON data_subject_requests(status);
      `);

      client.release();
      logger.info('✅ Retention tracking tables created');
    } catch (error) {
      logger.warn('⚠️ Could not create retention tables:', error.message);
    }
  }

  /**
   * Start retention monitoring
   */
  startRetentionMonitoring() {
    if (this.retentionInterval) {
      clearInterval(this.retentionInterval);
    }

    this.retentionInterval = setInterval(async() => {
      try {
        await this.processRetentionPolicies();
      } catch (error) {
        logger.error('❌ Error in retention monitoring:', error);
        this.emit('retention:error', { error });
      }
    }, this.config.retentionCheckInterval);

    logger.info(`✅ Retention monitoring started (interval: ${this.config.retentionCheckInterval}ms)`);
  }

  /**
   * Process retention policies
   */
  async processRetentionPolicies() {
    logger.info('🔄 Processing data retention policies...');

    const results = [];

    for (const [policyId, policy] of this.retentionPolicies) {
      try {
        const result = await this.processRetentionPolicy(policy);
        results.push(result);

        this.emit('retention:policyProcessed', { policyId, result });
      } catch (error) {
        logger.error(`❌ Error processing policy ${policyId}:`, error);
        this.emit('retention:policyError', { policyId, error });
      }
    }

    logger.info(`✅ Processed ${results.length} retention policies`);
    return results;
  }

  /**
   * Process individual retention policy
   */
  async processRetentionPolicy(policy) {
    const startTime = Date.now();
    const logEntry = {
      policy_id: policy.id,
      table_name: policy.table || 'unknown',
      operation: 'retention_check',
      records_processed: 0,
      records_deleted: 0,
      records_anonymized: 0,
      records_archived: 0,
      status: 'running',
      executed_at: new Date(),
      executed_by: 'system'
    };

    try {
      // Find expired records
      const expiredRecords = await this.findExpiredRecords(policy);
      logEntry.records_processed = expiredRecords.length;

      if (expiredRecords.length === 0) {
        logEntry.status = 'completed';
        logEntry.execution_time_ms = Date.now() - startTime;
        await this.logRetentionOperation(logEntry);
        return { policyId: policy.id, status: 'no_expired_records' };
      }

      // Process expired records based on deletion strategy
      const processResult = await this.processExpiredRecords(policy, expiredRecords);

      logEntry.records_deleted = processResult.deleted;
      logEntry.records_anonymized = processResult.anonymized;
      logEntry.records_archived = processResult.archived;
      logEntry.status = 'completed';
      logEntry.execution_time_ms = Date.now() - startTime;

      await this.logRetentionOperation(logEntry);

      return {
        policyId: policy.id,
        status: 'completed',
        recordsProcessed: expiredRecords.length,
        recordsDeleted: processResult.deleted,
        recordsAnonymized: processResult.anonymized,
        recordsArchived: processResult.archived
      };

    } catch (error) {
      logEntry.status = 'failed';
      logEntry.error_message = error.message;
      logEntry.execution_time_ms = Date.now() - startTime;

      await this.logRetentionOperation(logEntry);
      throw error;
    }
  }

  /**
   * Find expired records
   */
  async findExpiredRecords(policy) {
    const cutoffDate = new Date(Date.now() - (policy.retentionPeriod * 24 * 60 * 60 * 1000));

    try {
      if (policy.database === 'postgres' || !policy.database) {
        return await this.findExpiredPostgresRecords(policy, cutoffDate);
      } else if (policy.database === 'mongodb') {
        return await this.findExpiredMongoRecords(policy, cutoffDate);
      }
    } catch (error) {
      logger.error(`❌ Error finding expired records for policy ${policy.id}:`, error);
      return [];
    }
  }

  /**
   * Find expired PostgreSQL records
   */
  async findExpiredPostgresRecords(policy, cutoffDate) {
    const client = await this.postgres.connect();

    try {
      const query = `
        SELECT * FROM ${policy.table}
        WHERE ${policy.dateField} < $1
        LIMIT $2
      `;

      const result = await client.query(query, [cutoffDate, this.config.batchSize]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Find expired MongoDB records
   */
  async findExpiredMongoRecords(policy, cutoffDate) {
    const db = this.mongodb.db();
    const collection = db.collection(policy.collection);

    const query = {
      [policy.dateField]: { $lt: cutoffDate }
    };

    return await collection.find(query).limit(this.config.batchSize).toArray();
  }

  /**
   * Process expired records
   */
  async processExpiredRecords(policy, records) {
    const result = {
      deleted: 0,
      anonymized: 0,
      archived: 0
    };

    switch (policy.deletionStrategy) {
    case 'delete_immediately':
      result.deleted = await this.deleteRecords(policy, records);
      break;

    case 'anonymize_first':
      result.anonymized = await this.anonymizeRecords(policy, records);
      result.deleted = await this.deleteRecords(policy, records);
      break;

    case 'archive_then_delete':
      result.archived = await this.archiveRecords(policy, records);
      result.deleted = await this.deleteRecords(policy, records);
      break;

    case 'archive_then_anonymize':
      result.archived = await this.archiveRecords(policy, records);
      result.anonymized = await this.anonymizeRecords(policy, records);
      break;

    case 'compress_then_delete':
      result.archived = await this.compressRecords(policy, records);
      result.deleted = await this.deleteRecords(policy, records);
      break;

    default:
      throw new Error(`Unknown deletion strategy: ${policy.deletionStrategy}`);
    }

    return result;
  }

  /**
   * Delete records
   */
  async deleteRecords(policy, records) {
    if (records.length === 0) return 0;

    try {
      if (policy.database === 'postgres' || !policy.database) {
        return await this.deletePostgresRecords(policy, records);
      } else if (policy.database === 'mongodb') {
        return await this.deleteMongoRecords(policy, records);
      }
    } catch (error) {
      logger.error(`❌ Error deleting records for policy ${policy.id}:`, error);
      throw error;
    }
  }

  /**
   * Delete PostgreSQL records
   */
  async deletePostgresRecords(policy, records) {
    const client = await this.postgres.connect();

    try {
      const ids = records.map(record => record.id);
      const query = `DELETE FROM ${policy.table} WHERE id = ANY($1)`;
      const result = await client.query(query, [ids]);

      return result.rowCount;
    } finally {
      client.release();
    }
  }

  /**
   * Delete MongoDB records
   */
  async deleteMongoRecords(policy, records) {
    const db = this.mongodb.db();
    const collection = db.collection(policy.collection);

    const ids = records.map(record => record._id);
    const result = await collection.deleteMany({ _id: { $in: ids } });

    return result.deletedCount;
  }

  /**
   * Anonymize records
   */
  async anonymizeRecords(policy, records) {
    if (records.length === 0) return 0;

    const anonymizedRecords = records.map(record => {
      const anonymized = { ...record };

      // Anonymize specified fields
      for (const field of policy.anonymizationFields || []) {
        if (anonymized[field]) {
          anonymized[field] = this.anonymizeField(field, anonymized[field]);
        }
      }

      return anonymized;
    });

    try {
      if (policy.database === 'postgres' || !policy.database) {
        return await this.updatePostgresRecords(policy, anonymizedRecords);
      } else if (policy.database === 'mongodb') {
        return await this.updateMongoRecords(policy, anonymizedRecords);
      }
    } catch (error) {
      logger.error(`❌ Error anonymizing records for policy ${policy.id}:`, error);
      throw error;
    }
  }

  /**
   * Anonymize field value
   */
  anonymizeField(fieldName, value) {
    if (!value) return value;

    const fieldType = this.getFieldType(fieldName);

    switch (fieldType) {
    case 'email':
      return `anon_${crypto.randomBytes(4).toString('hex')}@anonymized.com`;
    case 'phone':
      return `+1-***-***-${value.slice(-4)}`;
    case 'ssn':
      return `***-**-${value.slice(-4)}`;
    case 'ip_address':
      return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    case 'name':
      return `Anonymous_${crypto.randomBytes(2).toString('hex')}`;
    case 'address':
      return '*** Anonymous Street, Anonymized City, AC 00000';
    default:
      return '[ANONYMIZED]';
    }
  }

  /**
   * Get field type for anonymization
   */
  getFieldType(fieldName) {
    const lowerField = fieldName.toLowerCase();

    if (lowerField.includes('email')) return 'email';
    if (lowerField.includes('phone')) return 'phone';
    if (lowerField.includes('ssn') || lowerField.includes('social')) return 'ssn';
    if (lowerField.includes('ip')) return 'ip_address';
    if (lowerField.includes('name')) return 'name';
    if (lowerField.includes('address')) return 'address';

    return 'generic';
  }

  /**
   * Archive records
   */
  async archiveRecords(policy, records) {
    if (records.length === 0) return 0;

    try {
      const archiveId = this.generateArchiveId();
      const archivePath = path.join(this.config.archiveDir, policy.database || 'postgres', `${archiveId}.json`);

      const archiveData = {
        id: archiveId,
        policyId: policy.id,
        tableName: policy.table,
        recordCount: records.length,
        archivedAt: new Date().toISOString(),
        records: records
      };

      await fs.writeFile(archivePath, JSON.stringify(archiveData, null, 2));

      return records.length;
    } catch (error) {
      logger.error(`❌ Error archiving records for policy ${policy.id}:`, error);
      throw error;
    }
  }

  /**
   * Compress records
   */
  async compressRecords(policy, records) {
    // For now, treat compression same as archiving
    // In production, you might want to use actual compression libraries
    return await this.archiveRecords(policy, records);
  }

  /**
   * Update PostgreSQL records
   */
  async updatePostgresRecords(policy, records) {
    const client = await this.postgres.connect();

    try {
      let updatedCount = 0;

      for (const record of records) {
        const updateFields = Object.keys(record).filter(key => key !== 'id');
        const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(', ');
        const values = [record.id, ...updateFields.map(field => record[field])];

        const query = `UPDATE ${policy.table} SET ${setClause} WHERE id = $1`;
        const result = await client.query(query, values);

        if (result.rowCount > 0) {
          updatedCount++;
        }
      }

      return updatedCount;
    } finally {
      client.release();
    }
  }

  /**
   * Update MongoDB records
   */
  async updateMongoRecords(policy, records) {
    const db = this.mongodb.db();
    const collection = db.collection(policy.collection);

    let updatedCount = 0;

    for (const record of records) {
      const { _id, ...updateData } = record;
      const result = await collection.updateOne({ _id }, { $set: updateData });

      if (result.modifiedCount > 0) {
        updatedCount++;
      }
    }

    return updatedCount;
  }

  /**
   * Handle data subject request (GDPR/CCPA)
   */
  async handleDataSubjectRequest(request) {
    const requestId = this.generateRequestId();

    try {
      // Log the request
      await this.logDataSubjectRequest(requestId, request);

      // Process based on request type
      let result;
      switch (request.type) {
      case 'access':
        result = await this.handleDataAccessRequest(request);
        break;
      case 'rectification':
        result = await this.handleDataRectificationRequest(request);
        break;
      case 'erasure':
        result = await this.handleDataErasureRequest(request);
        break;
      case 'portability':
        result = await this.handleDataPortabilityRequest(request);
        break;
      case 'restriction':
        result = await this.handleDataRestrictionRequest(request);
        break;
      case 'objection':
        result = await this.handleDataObjectionRequest(request);
        break;
      default:
        throw new Error(`Unknown request type: ${request.type}`);
      }

      // Update request status
      await this.updateDataSubjectRequestStatus(requestId, 'completed', result);

      return {
        requestId,
        status: 'completed',
        result
      };

    } catch (error) {
      await this.updateDataSubjectRequestStatus(requestId, 'failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle data access request
   */
  async handleDataAccessRequest(request) {
    const data = {};

    // Collect data from all relevant tables
    for (const [policyId, policy] of this.retentionPolicies) {
      if (this.isSubjectData(policy, request.subjectIdentifier)) {
        const subjectData = await this.getSubjectData(policy, request.subjectIdentifier);
        if (subjectData && subjectData.length > 0) {
          data[policy.table] = subjectData;
        }
      }
    }

    return {
      type: 'access',
      subjectIdentifier: request.subjectIdentifier,
      data,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Handle data erasure request (right to be forgotten)
   */
  async handleDataErasureRequest(request) {
    const deletionResults = {};

    for (const [policyId, policy] of this.retentionPolicies) {
      if (this.isSubjectData(policy, request.subjectIdentifier)) {
        try {
          const result = await this.deleteSubjectData(policy, request.subjectIdentifier);
          deletionResults[policy.table] = result;
        } catch (error) {
          deletionResults[policy.table] = { error: error.message };
        }
      }
    }

    return {
      type: 'erasure',
      subjectIdentifier: request.subjectIdentifier,
      deletionResults,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Check if policy contains subject data
   */
  isSubjectData(policy, subjectIdentifier) {
    // Check if the policy's table/collection contains data for this subject
    return policy.anonymizationFields && policy.anonymizationFields.length > 0;
  }

  /**
   * Get subject data
   */
  async getSubjectData(policy, subjectIdentifier) {
    // Implementation would query the database for all data related to the subject
    // This is a simplified version
    return [];
  }

  /**
   * Delete subject data
   */
  async deleteSubjectData(policy, subjectIdentifier) {
    // Implementation would delete all data related to the subject
    // This is a simplified version
    return { deleted: 0 };
  }

  /**
   * Utility methods
   */
  generateArchiveId() {
    return `archive_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateRequestId() {
    return `dsr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  getActiveComplianceFrameworks() {
    const frameworks = [];

    if (this.complianceConfig.gdpr.enabled) frameworks.push('GDPR');
    if (this.complianceConfig.ccpa.enabled) frameworks.push('CCPA');
    if (this.complianceConfig.sox.enabled) frameworks.push('SOX');

    return frameworks;
  }

  /**
   * Log retention operation
   */
  async logRetentionOperation(logEntry) {
    if (!this.config.enableAuditLogging) return;

    try {
      const client = await this.postgres.connect();

      await client.query(`
        INSERT INTO data_retention_log (
          policy_id, table_name, operation, records_processed,
          records_deleted, records_anonymized, records_archived,
          execution_time_ms, status, error_message, executed_at, executed_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        logEntry.policy_id,
        logEntry.table_name,
        logEntry.operation,
        logEntry.records_processed,
        logEntry.records_deleted,
        logEntry.records_anonymized,
        logEntry.records_archived,
        logEntry.execution_time_ms,
        logEntry.status,
        logEntry.error_message,
        logEntry.executed_at,
        logEntry.executed_by
      ]);

      client.release();
    } catch (error) {
      logger.error('❌ Error logging retention operation:', error);
    }
  }

  /**
   * Log data subject request
   */
  async logDataSubjectRequest(requestId, request) {
    try {
      const client = await this.postgres.connect();

      await client.query(`
        INSERT INTO data_subject_requests (
          request_id, subject_type, subject_identifier, request_type,
          legal_basis, status, requested_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        requestId,
        request.subjectType || 'individual',
        request.subjectIdentifier,
        request.type,
        request.legalBasis,
        'pending',
        new Date()
      ]);

      client.release();
    } catch (error) {
      logger.error('❌ Error logging data subject request:', error);
    }
  }

  /**
   * Update data subject request status
   */
  async updateDataSubjectRequestStatus(requestId, status, result = null) {
    try {
      const client = await this.postgres.connect();

      await client.query(`
        UPDATE data_subject_requests
        SET status = $1, processed_at = $2, response_data = $3
        WHERE request_id = $4
      `, [status, new Date(), result ? JSON.stringify(result) : null, requestId]);

      client.release();
    } catch (error) {
      logger.error('❌ Error updating data subject request status:', error);
    }
  }

  /**
   * Get retention statistics
   */
  async getRetentionStatistics() {
    try {
      const client = await this.postgres.connect();

      const stats = await client.query(`
        SELECT 
          policy_id,
          COUNT(*) as total_operations,
          SUM(records_processed) as total_processed,
          SUM(records_deleted) as total_deleted,
          SUM(records_anonymized) as total_anonymized,
          SUM(records_archived) as total_archived,
          AVG(execution_time_ms) as avg_execution_time
        FROM data_retention_log
        WHERE executed_at >= NOW() - INTERVAL '30 days'
        GROUP BY policy_id
        ORDER BY total_processed DESC
      `);

      client.release();
      return stats.rows;
    } catch (error) {
      logger.error('❌ Error getting retention statistics:', error);
      return [];
    }
  }

  /**
   * Stop retention monitoring
   */
  stopRetentionMonitoring() {
    if (this.retentionInterval) {
      clearInterval(this.retentionInterval);
      this.retentionInterval = null;
      logger.info('✅ Retention monitoring stopped');
    }
  }

  /**
   * Shutdown retention manager
   */
  async shutdown() {
    try {
      this.stopRetentionMonitoring();

      if (this.postgres) {
        await this.postgres.end();
      }

      if (this.mongodb) {
        await this.mongodb.close();
      }

      logger.info('✅ Data retention manager shutdown completed');
    } catch (error) {
      logger.error('❌ Error shutting down data retention manager:', error);
    }
  }
}

module.exports = new DataRetentionManager();
