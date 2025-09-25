/**
 * Enterprise-Grade Secrets Management Service
 * Handles encryption, rotation, and secure storage of application secrets
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const databaseManager = require('../../config/database');
const logger = require('../../utils/logger');

class SecretsManager {
  constructor() {
    this.postgres = databaseManager.getPostgresPool();
    this.redis = databaseManager.getRedisClient();

    // Encryption configuration
    this.algorithm = 'aes-256-gcm';
    this.keyDerivationAlgorithm = 'pbkdf2';
    this.keyDerivationIterations = 100000;
    this.saltLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;

    // Master key management
    this.masterKey = this.initializeMasterKey();

    // Rotation settings
    this.rotationInterval = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
  }

  /**
   * Initialize or retrieve master encryption key
   */
  initializeMasterKey() {
    const masterKeyPath = process.env.MASTER_KEY_PATH || '/etc/finnexus/secrets/master.key';
    const masterKeyEnv = process.env.MASTER_ENCRYPTION_KEY;

    if (masterKeyEnv) {
      return Buffer.from(masterKeyEnv, 'hex');
    }

    if (fs.existsSync(masterKeyPath)) {
      return fs.readFileSync(masterKeyPath);
    }

    // Generate new master key
    const masterKey = crypto.randomBytes(32);

    try {
      // Ensure directory exists
      const keyDir = path.dirname(masterKeyPath);
      if (!fs.existsSync(keyDir)) {
        fs.mkdirSync(keyDir, { recursive: true, mode: 0o700 });
      }

      // Save master key
      fs.writeFileSync(masterKeyPath, masterKey);
      fs.chmodSync(masterKeyPath, 0o600);

      logger.warn(`⚠️  New master key generated and saved to ${masterKeyPath}`);
      logger.warn('⚠️  BACKUP THIS KEY IMMEDIATELY - DO NOT LOSE IT!');

      return masterKey;
    } catch (error) {
      logger.error('Failed to save master key:', error);
      throw new Error('Master key initialization failed');
    }
  }

  /**
   * Generate a derived key from the master key using PBKDF2
   */
  generateDerivedKey(salt, purpose = 'default') {
    const keyMaterial = Buffer.concat([
      this.masterKey,
      Buffer.from(purpose, 'utf8')
    ]);

    return crypto.pbkdf2Sync(
      keyMaterial,
      salt,
      this.keyDerivationIterations,
      32, // 256 bits
      'sha512'
    );
  }

  /**
   * Encrypt a secret value
   */
  encryptSecret(value, metadata = {}) {
    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);

      // Generate derived key
      const derivedKey = this.generateDerivedKey(salt, metadata.purpose || 'default');

      // Create cipher
      const cipher = crypto.createCipher(this.algorithm, derivedKey);
      cipher.setAAD(Buffer.from(JSON.stringify(metadata)));

      // Encrypt the value
      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      return {
        encryptedValue: encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        tag: tag.toString('hex'),
        metadata: metadata
      };
    } catch (error) {
      logger.error('Encryption error:', error);
      throw new Error(`Failed to encrypt secret: ${error.message}`);
    }
  }

  /**
   * Decrypt a secret value
   */
  decryptSecret(encryptedData, purpose = 'default') {
    try {
      const {
        encryptedValue,
        iv: ivHex,
        salt: saltHex,
        tag: tagHex,
        metadata
      } = encryptedData;

      // Convert hex strings back to buffers
      const _iv = Buffer.from(ivHex, 'hex');
      const salt = Buffer.from(saltHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');

      // Generate derived key
      const derivedKey = this.generateDerivedKey(salt, purpose);

      // Create decipher
      const decipher = crypto.createDecipher(this.algorithm, derivedKey);
      decipher.setAuthTag(tag);
      decipher.setAAD(Buffer.from(JSON.stringify(metadata)));

      // Decrypt the value
      let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption error:', error);
      throw new Error(`Failed to decrypt secret: ${error.message}`);
    }
  }

  /**
   * Store a secret in the database
   */
  async storeSecret(key, value, metadata = {}) {
    try {
      const encryptedData = this.encryptSecret(value, metadata);
      const secretId = crypto.randomUUID();

      const query = `
        INSERT INTO secrets (
          id, key, encrypted_value, iv, salt, tag, metadata,
          expires_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (key) DO UPDATE SET
          encrypted_value = EXCLUDED.encrypted_value,
          iv = EXCLUDED.iv,
          salt = EXCLUDED.salt,
          tag = EXCLUDED.tag,
          metadata = EXCLUDED.metadata,
          expires_at = EXCLUDED.expires_at,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `;

      const result = await this.postgres.query(query, [
        secretId,
        key,
        encryptedData.encryptedValue,
        encryptedData.iv,
        encryptedData.salt,
        encryptedData.tag,
        JSON.stringify(encryptedData.metadata),
        metadata.expiresAt || null,
        metadata.createdBy || null
      ]);

      // Log access
      await this.logSecretAccess(result.rows[0].id, metadata.accessedBy, 'create');

      return {
        success: true,
        secretId: result.rows[0].id,
        message: `Secret '${key}' stored successfully`
      };
    } catch (error) {
      logger.error('Store secret error:', error);
      throw new Error(`Failed to store secret: ${error.message}`);
    }
  }

  /**
   * Retrieve a secret from the database
   */
  async getSecret(key, purpose = 'default', accessedBy = null) {
    try {
      const query = `
        SELECT id, encrypted_value, iv, salt, tag, metadata, expires_at
        FROM secrets
        WHERE key = $1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      `;

      const result = await this.postgres.query(query, [key]);

      if (result.rows.length === 0) {
        throw new Error(`Secret '${key}' not found or expired`);
      }

      const secret = result.rows[0];

      // Check if secret is expired
      if (secret.expires_at && new Date(secret.expires_at) <= new Date()) {
        throw new Error(`Secret '${key}' has expired`);
      }

      // Decrypt the secret
      const encryptedData = {
        encryptedValue: secret.encrypted_value,
        iv: secret.iv,
        salt: secret.salt,
        tag: secret.tag,
        metadata: JSON.parse(secret.metadata || '{}')
      };

      const decryptedValue = this.decryptSecret(encryptedData, purpose);

      // Update access time and log access
      await this.postgres.query(
        'UPDATE secrets SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = $1',
        [secret.id]
      );

      await this.logSecretAccess(secret.id, accessedBy, 'read');

      return {
        success: true,
        value: decryptedValue,
        metadata: encryptedData.metadata,
        lastAccessed: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Get secret error:', error);
      throw new Error(`Failed to retrieve secret: ${error.message}`);
    }
  }

  /**
   * Rotate a secret (generate new value and update)
   */
  async rotateSecret(key, newValue = null, metadata = {}) {
    try {
      // Get current secret metadata
      const currentQuery = 'SELECT metadata, expires_at FROM secrets WHERE key = $1';
      const currentResult = await this.postgres.query(currentQuery, [key]);

      if (currentResult.rows.length === 0) {
        throw new Error(`Secret '${key}' not found`);
      }

      const currentMetadata = JSON.parse(currentResult.rows[0].metadata || '{}');

      // Generate new value if not provided
      if (!newValue) {
        newValue = this.generateSecureValue(currentMetadata.length || 32);
      }

      // Store new secret
      const result = await this.storeSecret(key, newValue, {
        ...currentMetadata,
        ...metadata,
        rotatedAt: new Date().toISOString(),
        rotationCount: (currentMetadata.rotationCount || 0) + 1
      });

      // Log rotation event
      await this.logSecretAccess(result.secretId, metadata.rotatedBy, 'rotate');

      return {
        success: true,
        message: `Secret '${key}' rotated successfully`,
        rotationCount: (currentMetadata.rotationCount || 0) + 1
      };
    } catch (error) {
      logger.error('Rotate secret error:', error);
      throw new Error(`Failed to rotate secret: ${error.message}`);
    }
  }

  /**
   * Generate a secure random value
   */
  generateSecureValue(length = 32, charset = 'alphanumeric') {
    const charsets = {
      alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      numeric: '0123456789',
      hexadecimal: '0123456789ABCDEF',
      base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    };

    const chars = charsets[charset] || charsets.alphanumeric;
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  /**
   * Delete a secret
   */
  async deleteSecret(key, deletedBy = null) {
    try {
      const query = 'SELECT id FROM secrets WHERE key = $1';
      const result = await this.postgres.query(query, [key]);

      if (result.rows.length === 0) {
        throw new Error(`Secret '${key}' not found`);
      }

      const secretId = result.rows[0].id;

      // Log deletion
      await this.logSecretAccess(secretId, deletedBy, 'delete');

      // Delete the secret
      await this.postgres.query('DELETE FROM secrets WHERE id = $1', [secretId]);

      return {
        success: true,
        message: `Secret '${key}' deleted successfully`
      };
    } catch (error) {
      logger.error('Delete secret error:', error);
      throw new Error(`Failed to delete secret: ${error.message}`);
    }
  }

  /**
   * List all secrets (without values)
   */
  async listSecrets(limit = 50, offset = 0) {
    try {
      const query = `
        SELECT id, key, metadata, created_at, updated_at, last_accessed_at, expires_at
        FROM secrets
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const result = await this.postgres.query(query, [limit, offset]);

      return {
        success: true,
        secrets: result.rows.map(row => ({
          id: row.id,
          key: row.key,
          metadata: JSON.parse(row.metadata || '{}'),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          lastAccessedAt: row.last_accessed_at,
          expiresAt: row.expires_at
        })),
        pagination: {
          limit,
          offset,
          total: result.rows.length
        }
      };
    } catch (error) {
      logger.error('List secrets error:', error);
      throw new Error(`Failed to list secrets: ${error.message}`);
    }
  }

  /**
   * Log secret access for auditing
   */
  async logSecretAccess(secretId, accessedBy, action) {
    try {
      const query = `
        INSERT INTO secret_access_logs (secret_id, accessed_by, action, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
      `;

      await this.postgres.query(query, [
        secretId,
        accessedBy,
        action,
        null, // IP address would be passed from request context
        null  // User agent would be passed from request context
      ]);
    } catch (error) {
      logger.error('Log secret access error:', error);
      // Don't throw here as this is audit logging
    }
  }

  /**
   * Check for secrets that need rotation
   */
  async checkRotationNeeded() {
    try {
      const query = `
        SELECT id, key, created_at, metadata
        FROM secrets
        WHERE created_at <= CURRENT_TIMESTAMP - INTERVAL '90 days'
        AND (metadata->>'autoRotate' IS NULL OR metadata->>'autoRotate' = 'true')
      `;

      const result = await this.postgres.query(query);

      return {
        success: true,
        secretsNeedingRotation: result.rows.map(row => ({
          id: row.id,
          key: row.key,
          createdAt: row.created_at,
          metadata: JSON.parse(row.metadata || '{}')
        }))
      };
    } catch (error) {
      logger.error('Check rotation needed error:', error);
      throw new Error(`Failed to check rotation status: ${error.message}`);
    }
  }

  /**
   * Auto-rotate secrets that need rotation
   */
  async autoRotateSecrets() {
    try {
      const rotationCheck = await this.checkRotationNeeded();
      const results = [];

      for (const secret of rotationCheck.secretsNeedingRotation) {
        try {
          const result = await this.rotateSecret(secret.key, null, {
            autoRotated: true,
            rotatedBy: 'system'
          });
          results.push({
            key: secret.key,
            status: 'success',
            message: result.message
          });
        } catch (error) {
          results.push({
            key: secret.key,
            status: 'error',
            message: error.message
          });
        }
      }

      return {
        success: true,
        rotationResults: results
      };
    } catch (error) {
      logger.error('Auto-rotate secrets error:', error);
      throw new Error(`Failed to auto-rotate secrets: ${error.message}`);
    }
  }

  /**
   * Get secret access logs for auditing
   */
  async getAccessLogs(secretKey = null, limit = 100, offset = 0) {
    try {
      let query = `
        SELECT sal.id, sal.action, sal.access_time, sal.ip_address, sal.user_agent,
               s.key as secret_key
        FROM secret_access_logs sal
        JOIN secrets s ON sal.secret_id = s.id
      `;

      const params = [];

      if (secretKey) {
        query += ' WHERE s.key = $1';
        params.push(secretKey);
      }

      query += ` ORDER BY sal.access_time DESC LIMIT $${  params.length + 1  } OFFSET $${  params.length + 2}`;
      params.push(limit, offset);

      const result = await this.postgres.query(query, params);

      return {
        success: true,
        logs: result.rows,
        pagination: {
          limit,
          offset,
          total: result.rows.length
        }
      };
    } catch (error) {
      logger.error('Get access logs error:', error);
      throw new Error(`Failed to get access logs: ${error.message}`);
    }
  }

  /**
   * Initialize default secrets for the application
   */
  async initializeDefaultSecrets() {
    const defaultSecrets = [
      {
        key: 'jwt_secret',
        value: this.generateSecureValue(64),
        metadata: {
          purpose: 'jwt',
          description: 'JWT signing secret',
          autoRotate: true
        }
      },
      {
        key: 'session_secret',
        value: this.generateSecureValue(64),
        metadata: {
          purpose: 'session',
          description: 'Express session secret',
          autoRotate: true
        }
      },
      {
        key: 'api_encryption_key',
        value: this.generateSecureValue(32),
        metadata: {
          purpose: 'api',
          description: 'API request/response encryption',
          autoRotate: true
        }
      }
    ];

    const results = [];

    for (const secret of defaultSecrets) {
      try {
        const result = await this.storeSecret(secret.key, secret.value, secret.metadata);
        results.push({
          key: secret.key,
          status: 'created',
          message: result.message
        });
      } catch (error) {
        if (error.message.includes('already exists')) {
          results.push({
            key: secret.key,
            status: 'exists',
            message: 'Secret already exists'
          });
        } else {
          results.push({
            key: secret.key,
            status: 'error',
            message: error.message
          });
        }
      }
    }

    return {
      success: true,
      initializationResults: results
    };
  }
}

module.exports = new SecretsManager();
