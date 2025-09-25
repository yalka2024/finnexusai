/**
 * Database Encryption Service
 * Provides transparent encryption/decryption for sensitive database fields
 */

const crypto = require('crypto');
const secretsManager = require('./SecretsManager');
const logger = require('../../utils/logger');

class DatabaseEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyDerivationAlgorithm = 'pbkdf2';
    this.keyDerivationIterations = 100000;
    this.saltLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;

    // Cache for encryption keys
    this.keyCache = new Map();
    this.keyCacheTimeout = 300000; // 5 minutes
  }

  /**
   * Get encryption key from secrets manager
   */
  async getEncryptionKey(purpose = 'database') {
    const cacheKey = `encryption_key_${purpose}`;
    const cached = this.keyCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.keyCacheTimeout) {
      return cached.key;
    }

    try {
      const secret = await secretsManager.getSecret(`db_encryption_key_${purpose}`);
      const key = Buffer.from(secret.value, 'hex');

      this.keyCache.set(cacheKey, {
        key: key,
        timestamp: Date.now()
      });

      return key;
    } catch (error) {
      // If secret doesn't exist, generate a new one
      logger.info(`Generating new encryption key for purpose: ${purpose}`);
      const newKey = crypto.randomBytes(32);

      await secretsManager.storeSecret(`db_encryption_key_${purpose}`, newKey.toString('hex'), {
        purpose: 'database_encryption',
        description: `Database encryption key for ${purpose}`,
        autoRotate: false // Don't auto-rotate encryption keys
      });

      this.keyCache.set(cacheKey, {
        key: newKey,
        timestamp: Date.now()
      });

      return newKey;
    }
  }

  /**
   * Encrypt a value for database storage
   */
  async encryptValue(value, purpose = 'database', fieldName = 'default') {
    if (!value || value === null || value === undefined) {
      return value;
    }

    try {
      // Get encryption key
      const key = await this.getEncryptionKey(purpose);

      // Generate random salt and IV
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);

      // Generate derived key
      const derivedKey = crypto.pbkdf2Sync(
        key,
        salt,
        this.keyDerivationIterations,
        32, // 256 bits
        'sha512'
      );

      // Create cipher
      const cipher = crypto.createCipher(this.algorithm, derivedKey);

      // Add field name as additional authenticated data
      cipher.setAAD(Buffer.from(fieldName, 'utf8'));

      // Encrypt the value
      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Return structured encrypted data
      return JSON.stringify({
        encrypted: encrypted,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        algorithm: this.algorithm,
        field: fieldName,
        purpose: purpose
      });
    } catch (error) {
      logger.error('Encryption error:', error);
      throw new Error(`Failed to encrypt value: ${error.message}`);
    }
  }

  /**
   * Decrypt a value from database storage
   */
  async decryptValue(encryptedData, purpose = 'database', fieldName = 'default') {
    if (!encryptedData || encryptedData === null || encryptedData === undefined) {
      return encryptedData;
    }

    try {
      // Parse encrypted data
      const data = JSON.parse(encryptedData);

      // Validate required fields
      if (!data.encrypted || !data.salt || !data.iv || !data.tag) {
        throw new Error('Invalid encrypted data format');
      }

      // Get encryption key
      const key = await this.getEncryptionKey(purpose);

      // Convert hex strings back to buffers
      const salt = Buffer.from(data.salt, 'hex');
      const _iv = Buffer.from(data.iv, 'hex');
      const tag = Buffer.from(data.tag, 'hex');

      // Generate derived key
      const derivedKey = crypto.pbkdf2Sync(
        key,
        salt,
        this.keyDerivationIterations,
        32, // 256 bits
        'sha512'
      );

      // Create decipher
      const decipher = crypto.createDecipher(data.algorithm || this.algorithm, derivedKey);
      decipher.setAuthTag(tag);
      decipher.setAAD(Buffer.from(data.field || fieldName, 'utf8'));

      // Decrypt the value
      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption error:', error);
      throw new Error(`Failed to decrypt value: ${error.message}`);
    }
  }

  /**
   * Encrypt multiple fields in a data object
   */
  async encryptFields(data, fieldConfig) {
    const encryptedData = { ...data };

    for (const [fieldName, config] of Object.entries(fieldConfig)) {
      if (data[fieldName] !== undefined && data[fieldName] !== null) {
        const purpose = config.purpose || 'database';
        const encrypted = await this.encryptValue(data[fieldName], purpose, fieldName);
        encryptedData[fieldName] = encrypted;
      }
    }

    return encryptedData;
  }

  /**
   * Decrypt multiple fields in a data object
   */
  async decryptFields(data, fieldConfig) {
    const decryptedData = { ...data };

    for (const [fieldName, config] of Object.entries(fieldConfig)) {
      if (data[fieldName] !== undefined && data[fieldName] !== null) {
        const purpose = config.purpose || 'database';
        const decrypted = await this.decryptValue(data[fieldName], purpose, fieldName);
        decryptedData[fieldName] = decrypted;
      }
    }

    return decryptedData;
  }

  /**
   * Hash a value for searching (one-way hash for indexing)
   */
  async hashForSearch(value, purpose = 'search') {
    if (!value) return value;

    try {
      const _key = await this.getEncryptionKey(purpose);
      const salt = crypto.randomBytes(16);

      const hash = crypto.pbkdf2Sync(value, salt, 10000, 32, 'sha512');

      return {
        hash: hash.toString('hex'),
        salt: salt.toString('hex')
      };
    } catch (error) {
      logger.error('Hash for search error:', error);
      throw new Error(`Failed to hash value for search: ${error.message}`);
    }
  }

  /**
   * Verify a value against a search hash
   */
  async verifySearchHash(value, hashData, purpose = 'search') {
    if (!value || !hashData) return false;

    try {
      const _key = await this.getEncryptionKey(purpose);
      const salt = Buffer.from(hashData.salt, 'hex');

      const hash = crypto.pbkdf2Sync(value, salt, 10000, 32, 'sha512');

      return hash.toString('hex') === hashData.hash;
    } catch (error) {
      logger.error('Verify search hash error:', error);
      return false;
    }
  }

  /**
   * Create searchable hash for database queries
   */
  async createSearchHash(value, purpose = 'search') {
    const hashData = await this.hashForSearch(value, purpose);
    return hashData.hash;
  }

  /**
   * Rotate encryption keys (re-encrypt all data with new key)
   */
  async rotateEncryptionKey(purpose = 'database') {
    try {
      logger.info(`Starting key rotation for purpose: ${purpose}`);

      // Generate new key
      const newKey = crypto.randomBytes(32);

      // Store new key
      await secretsManager.storeSecret(`db_encryption_key_${purpose}_new`, newKey.toString('hex'), {
        purpose: 'database_encryption',
        description: `New database encryption key for ${purpose}`,
        autoRotate: false
      });

      // Clear key cache
      this.keyCache.clear();

      return {
        success: true,
        message: `New encryption key generated for ${purpose}`,
        nextStep: 'Re-encrypt existing data with new key'
      };
    } catch (error) {
      logger.error('Key rotation error:', error);
      throw new Error(`Failed to rotate encryption key: ${error.message}`);
    }
  }

  /**
   * Get field encryption configuration for different data types
   */
  getFieldConfig() {
    return {
      // User data encryption
      user: {
        email: { purpose: 'user_data', searchable: true },
        phone: { purpose: 'user_data', searchable: true },
        ssn: { purpose: 'pii', searchable: false },
        address: { purpose: 'user_data', searchable: false },
        dateOfBirth: { purpose: 'user_data', searchable: false }
      },

      // Financial data encryption
      financial: {
        bankAccount: { purpose: 'financial', searchable: false },
        routingNumber: { purpose: 'financial', searchable: false },
        creditCard: { purpose: 'payment', searchable: false },
        taxId: { purpose: 'pii', searchable: false }
      },

      // Trading data encryption
      trading: {
        privateKey: { purpose: 'crypto', searchable: false },
        seedPhrase: { purpose: 'crypto', searchable: false },
        apiKey: { purpose: 'api_keys', searchable: false },
        secretKey: { purpose: 'api_keys', searchable: false }
      },

      // Compliance data encryption
      compliance: {
        kycDocument: { purpose: 'compliance', searchable: false },
        amlReport: { purpose: 'compliance', searchable: false },
        riskAssessment: { purpose: 'compliance', searchable: false }
      },

      // System data encryption
      system: {
        jwtSecret: { purpose: 'system', searchable: false },
        sessionData: { purpose: 'system', searchable: false },
        auditData: { purpose: 'audit', searchable: false }
      }
    };
  }

  /**
   * Initialize encryption for all sensitive tables
   */
  async initializeEncryption() {
    try {
      const fieldConfig = this.getFieldConfig();
      const allPurposes = new Set();

      // Collect all unique purposes
      Object.values(fieldConfig).forEach(category => {
        Object.values(category).forEach(config => {
          allPurposes.add(config.purpose);
        });
      });

      // Initialize encryption keys for all purposes
      const results = [];
      for (const purpose of allPurposes) {
        try {
          await this.getEncryptionKey(purpose);
          results.push({
            purpose: purpose,
            status: 'initialized',
            message: `Encryption key for ${purpose} is ready`
          });
        } catch (error) {
          results.push({
            purpose: purpose,
            status: 'error',
            message: `Failed to initialize encryption key for ${purpose}: ${error.message}`
          });
        }
      }

      return {
        success: true,
        message: 'Database encryption initialization completed',
        results: results
      };
    } catch (error) {
      logger.error('Encryption initialization error:', error);
      throw new Error(`Failed to initialize database encryption: ${error.message}`);
    }
  }

  /**
   * Validate encryption configuration
   */
  async validateEncryption() {
    try {
      const testValue = 'test_encryption_value';
      const testPurpose = 'validation';

      // Test encryption
      const encrypted = await this.encryptValue(testValue, testPurpose, 'test_field');

      // Test decryption
      const decrypted = await this.decryptValue(encrypted, testPurpose, 'test_field');

      if (decrypted === testValue) {
        return {
          success: true,
          message: 'Encryption validation successful'
        };
      } else {
        throw new Error('Encryption validation failed - decrypted value does not match');
      }
    } catch (error) {
      logger.error('Encryption validation error:', error);
      return {
        success: false,
        message: `Encryption validation failed: ${error.message}`
      };
    }
  }

  /**
   * Get encryption statistics
   */
  async getEncryptionStats() {
    try {
      const fieldConfig = this.getFieldConfig();
      const stats = {
        totalFields: 0,
        purposes: {},
        searchableFields: 0,
        nonSearchableFields: 0
      };

      Object.entries(fieldConfig).forEach(([_category, fields]) => {
        Object.entries(fields).forEach(([_fieldName, config]) => {
          stats.totalFields++;

          if (config.searchable) {
            stats.searchableFields++;
          } else {
            stats.nonSearchableFields++;
          }

          const purpose = config.purpose;
          if (!stats.purposes[purpose]) {
            stats.purposes[purpose] = 0;
          }
          stats.purposes[purpose]++;
        });
      });

      return {
        success: true,
        stats: stats
      };
    } catch (error) {
      logger.error('Get encryption stats error:', error);
      throw new Error(`Failed to get encryption statistics: ${error.message}`);
    }
  }
}

module.exports = new DatabaseEncryption();
