/**
 * GDPR/CCPA Compliance Service
 * Handles data privacy, consent management, and regulatory compliance
 */

const databaseManager = require('../../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class GDPRComplianceService {
  constructor() {
    this.postgres = databaseManager.getPostgresPool();
    this.redis = databaseManager.getRedisClient();
    this.dataRetentionPeriods = {
      user_data: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
      audit_logs: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
      trading_data: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
      compliance_data: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
      temporary_data: 24 * 60 * 60 * 1000 // 24 hours
    };
  }

  /**
   * Record user consent for data processing
   */
  async recordConsent(userId, consentType, consentData) {
    try {
      const consentId = uuidv4();
      const consentRecord = {
        id: consentId,
        user_id: userId,
        consent_type: consentType, // 'marketing', 'analytics', 'data_sharing', 'essential'
        granted: consentData.granted,
        consent_method: consentData.method, // 'explicit', 'opt_in', 'opt_out'
        ip_address: consentData.ipAddress,
        user_agent: consentData.userAgent,
        consent_text: consentData.consentText,
        version: consentData.version || '1.0',
        created_at: new Date(),
        expires_at: consentData.expiresAt || null,
        withdrawn_at: null,
        metadata: JSON.stringify(consentData.metadata || {})
      };

      const query = `
        INSERT INTO user_consents (
          id, user_id, consent_type, granted, consent_method, ip_address, 
          user_agent, consent_text, version, created_at, expires_at, 
          withdrawn_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const result = await this.postgres.query(query, [
        consentRecord.id,
        consentRecord.user_id,
        consentRecord.consent_type,
        consentRecord.granted,
        consentRecord.consent_method,
        consentRecord.ip_address,
        consentRecord.user_agent,
        consentRecord.consent_text,
        consentRecord.version,
        consentRecord.created_at,
        consentRecord.expires_at,
        consentRecord.withdrawn_at,
        consentRecord.metadata
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error('Record consent error:', error);
      throw new Error('Failed to record consent');
    }
  }

  /**
   * Withdraw user consent
   */
  async withdrawConsent(userId, consentType) {
    try {
      const query = `
        UPDATE user_consents 
        SET withdrawn_at = NOW(), granted = false
        WHERE user_id = $1 AND consent_type = $2 AND withdrawn_at IS NULL
        RETURNING *
      `;

      const result = await this.postgres.query(query, [userId, consentType]);
      return result.rows;
    } catch (error) {
      logger.error('Withdraw consent error:', error);
      throw new Error('Failed to withdraw consent');
    }
  }

  /**
   * Get user's current consent status
   */
  async getUserConsentStatus(userId) {
    try {
      const query = `
        SELECT DISTINCT ON (consent_type) 
          consent_type, granted, created_at, withdrawn_at, version
        FROM user_consents 
        WHERE user_id = $1 
        ORDER BY consent_type, created_at DESC
      `;

      const result = await this.postgres.query(query, [userId]);

      const consentStatus = {};
      result.rows.forEach(row => {
        consentStatus[row.consent_type] = {
          granted: row.granted && !row.withdrawn_at,
          grantedAt: row.created_at,
          withdrawnAt: row.withdrawn_at,
          version: row.version
        };
      });

      return consentStatus;
    } catch (error) {
      logger.error('Get consent status error:', error);
      throw new Error('Failed to get consent status');
    }
  }

  /**
   * Create a data processing activity record
   */
  async recordDataProcessing(userId, activityData) {
    try {
      const activityId = uuidv4();
      const processingRecord = {
        id: activityId,
        user_id: userId,
        activity_type: activityData.type, // 'collection', 'processing', 'sharing', 'storage', 'deletion'
        purpose: activityData.purpose,
        legal_basis: activityData.legalBasis, // 'consent', 'contract', 'legal_obligation', 'legitimate_interest'
        data_categories: activityData.dataCategories, // ['personal', 'financial', 'behavioral']
        third_parties: activityData.thirdParties || [],
        retention_period: activityData.retentionPeriod,
        created_at: new Date(),
        metadata: JSON.stringify(activityData.metadata || {})
      };

      const query = `
        INSERT INTO data_processing_activities (
          id, user_id, activity_type, purpose, legal_basis, data_categories,
          third_parties, retention_period, created_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const result = await this.postgres.query(query, [
        processingRecord.id,
        processingRecord.user_id,
        processingRecord.activity_type,
        processingRecord.purpose,
        processingRecord.legal_basis,
        JSON.stringify(processingRecord.data_categories),
        JSON.stringify(processingRecord.third_parties),
        processingRecord.retention_period,
        processingRecord.created_at,
        processingRecord.metadata
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error('Record data processing error:', error);
      throw new Error('Failed to record data processing activity');
    }
  }

  /**
   * Handle data subject access request (DSAR)
   */
  async handleDataSubjectAccessRequest(userId, requestData) {
    try {
      const requestId = uuidv4();
      const dsarRecord = {
        id: requestId,
        user_id: userId,
        request_type: requestData.type, // 'access', 'rectification', 'erasure', 'portability', 'restriction'
        status: 'pending',
        requested_data_categories: requestData.dataCategories || [],
        created_at: new Date(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        completed_at: null,
        response_data: null,
        metadata: JSON.stringify(requestData.metadata || {})
      };

      const query = `
        INSERT INTO data_subject_requests (
          id, user_id, request_type, status, requested_data_categories,
          created_at, deadline, completed_at, response_data, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const result = await this.postgres.query(query, [
        dsarRecord.id,
        dsarRecord.user_id,
        dsarRecord.request_type,
        dsarRecord.status,
        JSON.stringify(dsarRecord.requested_data_categories),
        dsarRecord.created_at,
        dsarRecord.deadline,
        dsarRecord.completed_at,
        dsarRecord.response_data,
        dsarRecord.metadata
      ]);

      // Process the request based on type
      await this.processDataSubjectRequest(requestId, requestData.type, userId);

      return result.rows[0];
    } catch (error) {
      logger.error('Handle DSAR error:', error);
      throw new Error('Failed to handle data subject access request');
    }
  }

  /**
   * Process data subject request based on type
   */
  async processDataSubjectRequest(requestId, requestType, userId) {
    try {
      switch (requestType) {
      case 'access':
        return await this.generateDataAccessReport(requestId, userId);
      case 'portability':
        return await this.generateDataPortabilityExport(requestId, userId);
      case 'erasure':
        return await this.processDataErasureRequest(requestId, userId);
      case 'rectification':
        return await this.processDataRectificationRequest(requestId, userId);
      default:
        throw new Error(`Unsupported request type: ${requestType}`);
      }
    } catch (error) {
      logger.error('Process DSAR error:', error);
      throw new Error('Failed to process data subject request');
    }
  }

  /**
   * Generate comprehensive data access report
   */
  async generateDataAccessReport(requestId, userId) {
    try {
      const reportData = {
        personal_data: await this.getUserPersonalData(userId),
        consent_records: await this.getUserConsentHistory(userId),
        processing_activities: await this.getUserProcessingActivities(userId),
        data_sharing: await this.getUserDataSharingHistory(userId),
        audit_logs: await this.getUserAuditLogs(userId),
        generated_at: new Date(),
        request_id: requestId
      };

      const query = `
        UPDATE data_subject_requests 
        SET response_data = $1, status = 'completed', completed_at = NOW()
        WHERE id = $2
      `;

      await this.postgres.query(query, [JSON.stringify(reportData), requestId]);
      return reportData;
    } catch (error) {
      logger.error('Generate access report error:', error);
      throw new Error('Failed to generate data access report');
    }
  }

  /**
   * Generate data portability export
   */
  async generateDataPortabilityExport(requestId, userId) {
    try {
      const exportData = {
        user_profile: await this.getUserProfileData(userId),
        trading_history: await this.getUserTradingData(userId),
        portfolio_data: await this.getUserPortfolioData(userId),
        preferences: await this.getUserPreferences(userId),
        generated_at: new Date(),
        format: 'json',
        request_id: requestId
      };

      const query = `
        UPDATE data_subject_requests 
        SET response_data = $1, status = 'completed', completed_at = NOW()
        WHERE id = $2
      `;

      await this.postgres.query(query, [JSON.stringify(exportData), requestId]);
      return exportData;
    } catch (error) {
      logger.error('Generate portability export error:', error);
      throw new Error('Failed to generate data portability export');
    }
  }

  /**
   * Process data erasure request (right to be forgotten)
   */
  async processDataErasureRequest(requestId, userId) {
    try {
      const erasurePlan = await this.createDataErasurePlan(userId);

      // Execute erasure based on legal requirements
      const erasureResults = {
        immediate_deletion: [],
        anonymization: [],
        retention_required: [],
        completed_at: new Date(),
        request_id: requestId
      };

      // Immediate deletion for non-essential data
      for (const table of erasurePlan.immediate) {
        const result = await this.anonymizeUserData(table, userId);
        erasureResults.immediate_deletion.push({
          table: table,
          records_affected: result.count
        });
      }

      // Anonymization for data that must be retained
      for (const table of erasurePlan.anonymize) {
        const result = await this.anonymizeUserData(table, userId);
        erasureResults.anonymization.push({
          table: table,
          records_affected: result.count
        });
      }

      // Mark data for retention with legal basis
      for (const table of erasurePlan.retain) {
        erasureResults.retention_required.push({
          table: table,
          reason: 'legal_obligation',
          retention_period: this.dataRetentionPeriods[table] || 'indefinite'
        });
      }

      const query = `
        UPDATE data_subject_requests 
        SET response_data = $1, status = 'completed', completed_at = NOW()
        WHERE id = $2
      `;

      await this.postgres.query(query, [JSON.stringify(erasureResults), requestId]);
      return erasureResults;
    } catch (error) {
      logger.error('Process erasure request error:', error);
      throw new Error('Failed to process data erasure request');
    }
  }

  /**
   * Create data erasure plan based on legal requirements
   */
  async createDataErasurePlan(userId) {
    return {
      immediate: [
        'user_preferences',
        'marketing_consent',
        'analytics_data'
      ],
      anonymize: [
        'audit_logs',
        'trading_history',
        'portfolio_history'
      ],
      retain: [
        'compliance_records',
        'financial_transactions',
        'kyc_documents'
      ]
    };
  }

  /**
   * Anonymize user data in a table
   */
  async anonymizeUserData(tableName, userId) {
    try {
      const anonymizationQueries = {
        audit_logs: `
          UPDATE audit_logs 
          SET user_id = NULL, ip_address = '0.0.0.0', user_agent = 'ANONYMIZED'
          WHERE user_id = $1
        `,
        trading_history: `
          UPDATE trades 
          SET user_id = NULL, notes = 'ANONYMIZED'
          WHERE user_id = $1
        `,
        portfolio_history: `
          UPDATE portfolio_history 
          SET user_id = NULL, notes = 'ANONYMIZED'
          WHERE user_id = $1
        `
      };

      const query = anonymizationQueries[tableName];
      if (!query) {
        throw new Error(`No anonymization query for table: ${tableName}`);
      }

      const result = await this.postgres.query(query, [userId]);
      return { count: result.rowCount };
    } catch (error) {
      logger.error('Anonymize data error:', error);
      throw new Error(`Failed to anonymize data in ${tableName}`);
    }
  }

  /**
   * Get user personal data
   */
  async getUserPersonalData(userId) {
    try {
      const query = `
        SELECT 
          id, email, first_name, last_name, date_of_birth, 
          phone, country, created_at, updated_at
        FROM users 
        WHERE id = $1
      `;
      const result = await this.postgres.query(query, [userId]);
      return result.rows[0] || {};
    } catch (error) {
      logger.error('Get user data error:', error);
      return {};
    }
  }

  /**
   * Get user consent history
   */
  async getUserConsentHistory(userId) {
    try {
      const query = `
        SELECT 
          consent_type, granted, created_at, withdrawn_at, 
          consent_method, version
        FROM user_consents 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `;
      const result = await this.postgres.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Get consent history error:', error);
      return [];
    }
  }

  /**
   * Get user processing activities
   */
  async getUserProcessingActivities(userId) {
    try {
      const query = `
        SELECT 
          activity_type, purpose, legal_basis, data_categories,
          third_parties, retention_period, created_at
        FROM data_processing_activities 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `;
      const result = await this.postgres.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Get processing activities error:', error);
      return [];
    }
  }

  /**
   * Get user data sharing history
   */
  async getUserDataSharingHistory(userId) {
    try {
      const query = `
        SELECT 
          third_party, data_categories, purpose, shared_at, 
          legal_basis, consent_obtained
        FROM data_sharing_log 
        WHERE user_id = $1 
        ORDER BY shared_at DESC
      `;
      const result = await this.postgres.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Get data sharing history error:', error);
      return [];
    }
  }

  /**
   * Get user audit logs
   */
  async getUserAuditLogs(userId) {
    try {
      const query = `
        SELECT 
          action, resource, timestamp, ip_address, 
          user_agent, success, metadata
        FROM audit_logs 
        WHERE user_id = $1 
        ORDER BY timestamp DESC
        LIMIT 1000
      `;
      const result = await this.postgres.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Get audit logs error:', error);
      return [];
    }
  }

  /**
   * Get user profile data for portability
   */
  async getUserProfileData(userId) {
    try {
      const query = `
        SELECT 
          id, email, first_name, last_name, date_of_birth,
          phone, country, preferences, created_at
        FROM users 
        WHERE id = $1
      `;
      const result = await this.postgres.query(query, [userId]);
      return result.rows[0] || {};
    } catch (error) {
      logger.error('Get profile data error:', error);
      return {};
    }
  }

  /**
   * Get user trading data for portability
   */
  async getUserTradingData(userId) {
    try {
      const query = `
        SELECT 
          id, symbol, side, quantity, price, order_type,
          status, created_at, filled_at
        FROM trades 
        WHERE user_id = $1 
        ORDER BY created_at DESC
        LIMIT 10000
      `;
      const result = await this.postgres.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Get trading data error:', error);
      return [];
    }
  }

  /**
   * Get user portfolio data for portability
   */
  async getUserPortfolioData(userId) {
    try {
      const query = `
        SELECT 
          id, symbol, quantity, average_price, current_value,
          created_at, updated_at
        FROM portfolio_assets 
        WHERE user_id = $1
      `;
      const result = await this.postgres.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Get portfolio data error:', error);
      return [];
    }
  }

  /**
   * Get user preferences for portability
   */
  async getUserPreferences(userId) {
    try {
      const query = `
        SELECT 
          language, timezone, currency, theme,
          notifications, privacy_settings, created_at, updated_at
        FROM user_preferences 
        WHERE user_id = $1
      `;
      const result = await this.postgres.query(query, [userId]);
      return result.rows[0] || {};
    } catch (error) {
      logger.error('Get preferences error:', error);
      return {};
    }
  }

  /**
   * Check if user has valid consent for data processing
   */
  async hasValidConsent(userId, consentType) {
    try {
      const query = `
        SELECT granted, expires_at, withdrawn_at
        FROM user_consents 
        WHERE user_id = $1 AND consent_type = $2 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      const result = await this.postgres.query(query, [userId, consentType]);

      if (result.rows.length === 0) {
        return false;
      }

      const consent = result.rows[0];

      // Check if consent is granted, not withdrawn, and not expired
      return consent.granted &&
             !consent.withdrawn_at &&
             (!consent.expires_at || consent.expires_at > new Date());
    } catch (error) {
      logger.error('Check consent error:', error);
      return false;
    }
  }

  /**
   * Get pending data subject requests
   */
  async getPendingDataSubjectRequests() {
    try {
      const query = `
        SELECT 
          id, user_id, request_type, status, created_at, deadline
        FROM data_subject_requests 
        WHERE status = 'pending' AND deadline > NOW()
        ORDER BY created_at ASC
      `;
      const result = await this.postgres.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Get pending DSARs error:', error);
      return [];
    }
  }

  /**
   * Clean up expired data based on retention policies
   */
  async cleanupExpiredData() {
    try {
      const cleanupResults = {};

      for (const [dataType, retentionPeriod] of Object.entries(this.dataRetentionPeriods)) {
        const cutoffDate = new Date(Date.now() - retentionPeriod);

        // This would need to be customized based on actual table structure
        // For now, we'll log what would be cleaned up
        cleanupResults[dataType] = {
          cutoffDate: cutoffDate,
          retentionPeriod: retentionPeriod,
          status: 'simulated'
        };
      }

      return cleanupResults;
    } catch (error) {
      logger.error('Cleanup expired data error:', error);
      throw new Error('Failed to cleanup expired data');
    }
  }
}

module.exports = new GDPRComplianceService();
