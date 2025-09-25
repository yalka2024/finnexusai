/**
 * Secrets Management Service
 * Secure handling of sensitive data, API keys, and configuration secrets
 */

const crypto = require('crypto');
const { promisify } = require('util');
const databaseManager = require('../../config/database');
const logger = require('../../utils/logger');

class SecretsManager {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
    this.algorithm = 'aes-256-gcm';
    this.keyDerivationIterations = 100000;
    this.saltLength = 32;
    this.tagLength = 16;
    this.secretsCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Generate a secure encryption key
   */
  generateEncryptionKey() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY must be set in production environment');
    }
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Derive a key from a password using PBKDF2
   */
  async deriveKey(password, salt) {
    return promisify(crypto.pbkdf2)(password, salt, this.keyDerivationIterations, 32, 'sha512');
  }

  /**
   * Encrypt sensitive data
   */
  async encrypt(plaintext, context = 'default') {
    try {
      const salt = crypto.randomBytes(this.saltLength);
      const key = await this.deriveKey(this.encryptionKey, salt);
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(Buffer.from(context, 'utf8'));

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      return {
        encrypted: encrypted,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        algorithm: this.algorithm,
        context: context
      };
    } catch (error) {
      logger.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decrypt(encryptedData, context = 'default') {
    try {
      const { encrypted, salt, iv, tag, algorithm } = encryptedData;

      if (algorithm !== this.algorithm) {
        throw new Error('Unsupported encryption algorithm');
      }

      const key = await this.deriveKey(this.encryptionKey, Buffer.from(salt, 'hex'));
      const decipher = crypto.createDecipher(algorithm, key);

      decipher.setAAD(Buffer.from(context, 'utf8'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Store a secret securely
   */
  async storeSecret(key, value, metadata = {}) {
    try {
      const encryptedData = await this.encrypt(value, key);

      const secretRecord = {
        id: crypto.randomUUID(),
        key: key,
        encrypted_data: JSON.stringify(encryptedData),
        metadata: JSON.stringify(metadata),
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: metadata.expiresAt || null,
        access_count: 0,
        last_accessed: null
      };

      // Store in database
      const client = await databaseManager.getPostgresPool().connect();
      try {
        await client.query(`
          INSERT INTO secrets (
            id, key, encrypted_data, metadata, created_at, updated_at, expires_at, access_count, last_accessed
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (key) DO UPDATE SET
            encrypted_data = EXCLUDED.encrypted_data,
            metadata = EXCLUDED.metadata,
            updated_at = EXCLUDED.updated_at,
            expires_at = EXCLUDED.expires_at
        `, [
          secretRecord.id,
          secretRecord.key,
          secretRecord.encrypted_data,
          secretRecord.metadata,
          secretRecord.created_at,
          secretRecord.updated_at,
          secretRecord.expires_at,
          secretRecord.access_count,
          secretRecord.last_accessed
        ]);
      } finally {
        client.release();
      }

      // Cache the decrypted value for quick access
      this.secretsCache.set(key, {
        value: value,
        timestamp: Date.now(),
        metadata: metadata
      });

      return secretRecord.id;
    } catch (error) {
      logger.error('Store secret error:', error);
      throw new Error('Failed to store secret');
    }
  }

  /**
   * Retrieve a secret securely
   */
  async getSecret(key) {
    try {
      // Check cache first
      const cached = this.secretsCache.get(key);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        await this.incrementAccessCount(key);
        return cached.value;
      }

      // Retrieve from database
      const client = await databaseManager.getPostgresPool().connect();
      let result;
      try {
        result = await client.query(
          'SELECT * FROM secrets WHERE key = $1 AND (expires_at IS NULL OR expires_at > NOW())',
          [key]
        );
      } finally {
        client.release();
      }

      if (result.rows.length === 0) {
        throw new Error('Secret not found or expired');
      }

      const secretRecord = result.rows[0];
      const encryptedData = JSON.parse(secretRecord.encrypted_data);
      const decryptedValue = await this.decrypt(encryptedData, key);

      // Update access tracking
      await this.incrementAccessCount(key);

      // Cache the decrypted value
      this.secretsCache.set(key, {
        value: decryptedValue,
        timestamp: Date.now(),
        metadata: JSON.parse(secretRecord.metadata)
      });

      return decryptedValue;
    } catch (error) {
      logger.error('Get secret error:', error);
      throw new Error('Failed to retrieve secret');
    }
  }

  /**
   * Delete a secret
   */
  async deleteSecret(key) {
    try {
      const client = await databaseManager.getPostgresPool().connect();
      try {
        await client.query('DELETE FROM secrets WHERE key = $1', [key]);
      } finally {
        client.release();
      }

      // Remove from cache
      this.secretsCache.delete(key);

      return true;
    } catch (error) {
      logger.error('Delete secret error:', error);
      throw new Error('Failed to delete secret');
    }
  }

  /**
   * List all secret keys (without values)
   */
  async listSecrets() {
    try {
      const client = await databaseManager.getPostgresPool().connect();
      let result;
      try {
        result = await client.query(`
          SELECT key, metadata, created_at, updated_at, expires_at, access_count, last_accessed
          FROM secrets
          WHERE expires_at IS NULL OR expires_at > NOW()
          ORDER BY created_at DESC
        `);
      } finally {
        client.release();
      }

      return result.rows.map(row => ({
        key: row.key,
        metadata: JSON.parse(row.metadata),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        expiresAt: row.expires_at,
        accessCount: row.access_count,
        lastAccessed: row.last_accessed
      }));
    } catch (error) {
      logger.error('List secrets error:', error);
      throw new Error('Failed to list secrets');
    }
  }

  /**
   * Rotate a secret (generate new value)
   */
  async rotateSecret(key, newValue, metadata = {}) {
    try {
      const oldValue = await this.getSecret(key);
      await this.storeSecret(key, newValue, {
        ...metadata,
        rotatedAt: new Date(),
        previousValue: oldValue
      });

      return true;
    } catch (error) {
      logger.error('Rotate secret error:', error);
      throw new Error('Failed to rotate secret');
    }
  }

  /**
   * Increment access count for audit purposes
   */
  async incrementAccessCount(key) {
    try {
      const client = await databaseManager.getPostgresPool().connect();
      try {
        await client.query(`
          UPDATE secrets 
          SET access_count = access_count + 1, last_accessed = NOW()
          WHERE key = $1
        `, [key]);
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Increment access count error:', error);
      // Don't throw error for access tracking failure
    }
  }

  /**
   * Clean up expired secrets
   */
  async cleanupExpiredSecrets() {
    try {
      const client = await databaseManager.getPostgresPool().connect();
      try {
        const result = await client.query(`
          DELETE FROM secrets 
          WHERE expires_at IS NOT NULL AND expires_at < NOW()
          RETURNING key
        `);

        // Remove from cache
        result.rows.forEach(row => {
          this.secretsCache.delete(row.key);
        });

        return result.rows.length;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Cleanup expired secrets error:', error);
      throw new Error('Failed to cleanup expired secrets');
    }
  }

  /**
   * Validate secret strength
   */
  validateSecretStrength(secret, type = 'general') {
    const validations = {
      general: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false
      },
      api_key: {
        minLength: 32,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      },
      password: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      },
      jwt_secret: {
        minLength: 64,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      }
    };

    const rules = validations[type] || validations.general;
    const errors = [];

    if (secret.length < rules.minLength) {
      errors.push(`Secret must be at least ${rules.minLength} characters long`);
    }

    if (rules.requireUppercase && !/[A-Z]/.test(secret)) {
      errors.push('Secret must contain at least one uppercase letter');
    }

    if (rules.requireLowercase && !/[a-z]/.test(secret)) {
      errors.push('Secret must contain at least one lowercase letter');
    }

    if (rules.requireNumbers && !/\d/.test(secret)) {
      errors.push('Secret must contain at least one number');
    }

    if (rules.requireSpecialChars && !/[@$!%*?&]/.test(secret)) {
      errors.push('Secret must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Generate a secure random secret
   */
  generateSecureSecret(type = 'general', length = 32) {
    const charset = {
      general: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      api_key: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-',
      password: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&',
      jwt_secret: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&'
    };

    const chars = charset[type] || charset.general;
    let secret = '';

    for (let i = 0; i < length; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Ensure it meets strength requirements
    const validation = this.validateSecretStrength(secret, type);
    if (!validation.isValid) {
      // Regenerate with additional requirements
      return this.generateSecureSecret(type, Math.max(length, 16));
    }

    return secret;
  }

  /**
   * Audit secret access
   */
  async auditSecretAccess(key, action, userId = null, metadata = {}) {
    try {
      const auditRecord = {
        id: crypto.randomUUID(),
        secret_key: key,
        action: action, // 'create', 'read', 'update', 'delete', 'rotate'
        user_id: userId,
        ip_address: metadata.ipAddress || null,
        user_agent: metadata.userAgent || null,
        timestamp: new Date(),
        metadata: JSON.stringify(metadata)
      };

      const client = await databaseManager.getPostgresPool().connect();
      try {
        await client.query(`
          INSERT INTO secret_audit_log (
            id, secret_key, action, user_id, ip_address, user_agent, timestamp, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          auditRecord.id,
          auditRecord.secret_key,
          auditRecord.action,
          auditRecord.user_id,
          auditRecord.ip_address,
          auditRecord.user_agent,
          auditRecord.timestamp,
          auditRecord.metadata
        ]);
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Audit secret access error:', error);
      // Don't throw error for audit logging failure
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.secretsCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.secretsCache.size,
      maxAge: this.cacheTimeout,
      keys: Array.from(this.secretsCache.keys())
    };
  }
}

// Create singleton instance
const secretsManager = new SecretsManager();

module.exports = secretsManager;
