/**
 * API Key Management Service
 * Handles generation, validation, and lifecycle management of API keys
 */

const crypto = require('crypto');
const databaseManager = require('../../config/database');
// const secretsManager = require('./SecretsManager');
const { CustomError } = require('../../errors/ErrorHandler');
const logger = require('../../utils/logger');

class APIKeyManager {
  constructor() {
    this.postgres = databaseManager.getPostgresPool();
    this.redis = databaseManager.getRedisClient();

    // API key configuration
    this.keyLength = 64;
    this.secretLength = 32;
    this.tokenExpiration = 24 * 60 * 60 * 1000; // 24 hours
    this.refreshTokenExpiration = 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  /**
   * Generate a new API key pair (key + secret)
   */
  async generateAPIKey(userId, metadata = {}) {
    try {
      const keyId = crypto.randomUUID();
      const apiKey = this.generateSecureKey(this.keyLength);
      const apiSecret = this.generateSecureKey(this.secretLength);

      // Hash the secret for storage
      const secretHash = await this.hashSecret(apiSecret);

      // Store in database
      const query = `
        INSERT INTO api_keys (
          id, user_id, key_id, api_key, secret_hash, permissions,
          rate_limit, ip_whitelist, expires_at, is_active, metadata,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING *
      `;

      const _result = await this.postgres.query(query, [
        keyId,
        userId,
        apiKey,
        apiKey,
        secretHash,
        JSON.stringify(metadata.permissions || ['read']),
        metadata.rateLimit || 1000,
        metadata.ipWhitelist ? JSON.stringify(metadata.ipWhitelist) : null,
        metadata.expiresAt || null,
        true,
        JSON.stringify(metadata)
      ]);

      // Store in Redis for quick lookup
      await this.cacheAPIKey(apiKey, {
        userId: userId,
        keyId: keyId,
        permissions: metadata.permissions || ['read'],
        rateLimit: metadata.rateLimit || 1000,
        ipWhitelist: metadata.ipWhitelist || null
      });

      // Log API key creation
      await this.logAPIKeyActivity(keyId, 'created', userId);

      return {
        success: true,
        apiKey: apiKey,
        apiSecret: apiSecret, // Only returned once during creation
        keyId: keyId,
        expiresAt: metadata.expiresAt,
        message: 'API key generated successfully'
      };
    } catch (error) {
      logger.error('Generate API key error:', error);
      throw new Error(`Failed to generate API key: ${error.message}`);
    }
  }

  /**
   * Validate an API key and secret
   */
  async validateAPIKey(apiKey, apiSecret, ipAddress = null) {
    try {
      // Check Redis cache first
      const cachedKey = await this.getCachedAPIKey(apiKey);
      if (!cachedKey) {
        throw new CustomError('Invalid API key', 401, 'INVALID_API_KEY');
      }

      // Get full key details from database
      const query = `
        SELECT * FROM api_keys 
        WHERE api_key = $1 AND is_active = true 
        AND (expires_at IS NULL OR expires_at > NOW())
      `;

      const result = await this.postgres.query(query, [apiKey]);
      if (result.rows.length === 0) {
        throw new CustomError('Invalid or expired API key', 401, 'INVALID_API_KEY');
      }

      const keyData = result.rows[0];

      // Verify secret
      const isValidSecret = await this.verifySecret(apiSecret, keyData.secret_hash);
      if (!isValidSecret) {
        await this.logAPIKeyActivity(keyData.id, 'invalid_secret', keyData.user_id, ipAddress);
        throw new CustomError('Invalid API secret', 401, 'INVALID_API_SECRET');
      }

      // Check IP whitelist if configured
      if (keyData.ip_whitelist && ipAddress) {
        const allowedIPs = JSON.parse(keyData.ip_whitelist);
        if (!allowedIPs.includes(ipAddress)) {
          await this.logAPIKeyActivity(keyData.id, 'ip_blocked', keyData.user_id, ipAddress);
          throw new CustomError('IP address not allowed', 403, 'IP_NOT_ALLOWED');
        }
      }

      // Update last used timestamp
      await this.postgres.query(
        'UPDATE api_keys SET last_used_at = NOW(), usage_count = usage_count + 1 WHERE id = $1',
        [keyData.id]
      );

      // Log successful usage
      await this.logAPIKeyActivity(keyData.id, 'used', keyData.user_id, ipAddress);

      return {
        success: true,
        keyData: {
          id: keyData.id,
          userId: keyData.user_id,
          permissions: JSON.parse(keyData.permissions),
          rateLimit: keyData.rate_limit,
          ipWhitelist: keyData.ip_whitelist ? JSON.parse(keyData.ip_whitelist) : null,
          expiresAt: keyData.expires_at,
          metadata: JSON.parse(keyData.metadata || '{}')
        }
      };
    } catch (error) {
      logger.error('Validate API key error:', error);
      throw error;
    }
  }

  /**
   * Get API keys for a user
   */
  async getUserAPIKeys(userId, includeInactive = false) {
    try {
      let query = `
        SELECT id, key_id, api_key, permissions, rate_limit, ip_whitelist,
               expires_at, is_active, created_at, last_used_at, usage_count
        FROM api_keys 
        WHERE user_id = $1
      `;

      const params = [userId];

      if (!includeInactive) {
        query += ' AND is_active = true';
      }

      query += ' ORDER BY created_at DESC';

      const result = await this.postgres.query(query, params);

      return {
        success: true,
        apiKeys: result.rows.map(row => ({
          id: row.id,
          keyId: row.key_id,
          apiKey: this.maskAPIKey(row.api_key),
          permissions: JSON.parse(row.permissions),
          rateLimit: row.rate_limit,
          ipWhitelist: row.ip_whitelist ? JSON.parse(row.ip_whitelist) : null,
          expiresAt: row.expires_at,
          isActive: row.is_active,
          createdAt: row.created_at,
          lastUsedAt: row.last_used_at,
          usageCount: row.usage_count
        }))
      };
    } catch (error) {
      logger.error('Get user API keys error:', error);
      throw new Error(`Failed to get API keys: ${error.message}`);
    }
  }

  /**
   * Revoke an API key
   */
  async revokeAPIKey(keyId, userId) {
    try {
      const query = `
        UPDATE api_keys 
        SET is_active = false, revoked_at = NOW(), revoked_by = $2
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await this.postgres.query(query, [keyId, userId]);

      if (result.rows.length === 0) {
        throw new CustomError('API key not found', 404, 'API_KEY_NOT_FOUND');
      }

      // Remove from Redis cache
      await this.removeCachedAPIKey(result.rows[0].api_key);

      // Log revocation
      await this.logAPIKeyActivity(keyId, 'revoked', userId);

      return {
        success: true,
        message: 'API key revoked successfully'
      };
    } catch (error) {
      logger.error('Revoke API key error:', error);
      throw new Error(`Failed to revoke API key: ${error.message}`);
    }
  }

  /**
   * Regenerate API secret
   */
  async regenerateAPISecret(keyId, userId) {
    try {
      const newSecret = this.generateSecureKey(this.secretLength);
      const secretHash = await this.hashSecret(newSecret);

      const query = `
        UPDATE api_keys 
        SET secret_hash = $1, updated_at = NOW()
        WHERE id = $2 AND user_id = $3 AND is_active = true
        RETURNING api_key
      `;

      const result = await this.postgres.query(query, [secretHash, keyId, userId]);

      if (result.rows.length === 0) {
        throw new CustomError('API key not found', 404, 'API_KEY_NOT_FOUND');
      }

      // Log regeneration
      await this.logAPIKeyActivity(keyId, 'secret_regenerated', userId);

      return {
        success: true,
        apiSecret: newSecret, // Only returned once during regeneration
        message: 'API secret regenerated successfully'
      };
    } catch (error) {
      logger.error('Regenerate API secret error:', error);
      throw new Error(`Failed to regenerate API secret: ${error.message}`);
    }
  }

  /**
   * Update API key permissions or settings
   */
  async updateAPIKey(keyId, userId, updates) {
    try {
      const allowedUpdates = ['permissions', 'rateLimit', 'ipWhitelist', 'expiresAt'];
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      for (const [field, value] of Object.entries(updates)) {
        if (allowedUpdates.includes(field)) {
          updateFields.push(`${this.camelToSnakeCase(field)} = $${paramCount}`);

          if (field === 'permissions' || field === 'ipWhitelist') {
            updateValues.push(JSON.stringify(value));
          } else {
            updateValues.push(value);
          }

          paramCount++;
        }
      }

      if (updateFields.length === 0) {
        throw new CustomError('No valid updates provided', 400, 'INVALID_UPDATES');
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(keyId, userId);

      const query = `
        UPDATE api_keys 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount} AND user_id = $${paramCount + 1} AND is_active = true
        RETURNING *
      `;

      const result = await this.postgres.query(query, updateValues);

      if (result.rows.length === 0) {
        throw new CustomError('API key not found', 404, 'API_KEY_NOT_FOUND');
      }

      // Update Redis cache
      const updatedKey = result.rows[0];
      await this.cacheAPIKey(updatedKey.api_key, {
        userId: updatedKey.user_id,
        keyId: updatedKey.id,
        permissions: JSON.parse(updatedKey.permissions),
        rateLimit: updatedKey.rate_limit,
        ipWhitelist: updatedKey.ip_whitelist ? JSON.parse(updatedKey.ip_whitelist) : null
      });

      // Log update
      await this.logAPIKeyActivity(keyId, 'updated', userId);

      return {
        success: true,
        message: 'API key updated successfully'
      };
    } catch (error) {
      logger.error('Update API key error:', error);
      throw new Error(`Failed to update API key: ${error.message}`);
    }
  }

  /**
   * Check rate limiting for API key
   */
  async checkRateLimit(apiKey, endpoint) {
    try {
      const keyData = await this.getCachedAPIKey(apiKey);
      if (!keyData) {
        return { allowed: false, reason: 'Invalid API key' };
      }

      const rateLimitKey = `rate_limit:${apiKey}:${endpoint}`;
      const current = await this.redis.get(rateLimitKey);

      if (current && parseInt(current) >= keyData.rateLimit) {
        return {
          allowed: false,
          reason: 'Rate limit exceeded',
          limit: keyData.rateLimit,
          current: parseInt(current)
        };
      }

      // Increment counter
      await this.redis.incr(rateLimitKey);
      await this.redis.expire(rateLimitKey, 3600); // 1 hour window

      return {
        allowed: true,
        limit: keyData.rateLimit,
        current: parseInt(current || 0) + 1
      };
    } catch (error) {
      logger.error('Rate limit check error:', error);
      return { allowed: true, reason: 'Rate limit check failed' };
    }
  }

  /**
   * Generate secure key
   */
  generateSecureKey(length) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash API secret
   */
  async hashSecret(secret) {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Verify API secret
   */
  async verifySecret(secret, hash) {
    const secretHash = await this.hashSecret(secret);
    return secretHash === hash;
  }

  /**
   * Mask API key for display
   */
  maskAPIKey(apiKey) {
    if (!apiKey || apiKey.length < 8) return apiKey;
    return `${apiKey.substring(0, 4)  }...${  apiKey.substring(apiKey.length - 4)}`;
  }

  /**
   * Cache API key in Redis
   */
  async cacheAPIKey(apiKey, keyData) {
    try {
      await this.redis.setEx(
        `api_key:${apiKey}`,
        3600, // 1 hour TTL
        JSON.stringify(keyData)
      );
    } catch (error) {
      logger.error('Cache API key error:', error);
    }
  }

  /**
   * Get cached API key
   */
  async getCachedAPIKey(apiKey) {
    try {
      const cached = await this.redis.get(`api_key:${apiKey}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Get cached API key error:', error);
      return null;
    }
  }

  /**
   * Remove cached API key
   */
  async removeCachedAPIKey(apiKey) {
    try {
      await this.redis.del(`api_key:${apiKey}`);
    } catch (error) {
      logger.error('Remove cached API key error:', error);
    }
  }

  /**
   * Log API key activity
   */
  async logAPIKeyActivity(keyId, action, userId, ipAddress = null, details = {}) {
    try {
      const query = `
        INSERT INTO api_key_logs (
          key_id, action, user_id, ip_address, details, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `;

      await this.postgres.query(query, [
        keyId,
        action,
        userId,
        ipAddress,
        JSON.stringify(details)
      ]);
    } catch (error) {
      logger.error('Log API key activity error:', error);
    }
  }

  /**
   * Get API key usage logs
   */
  async getAPIKeyLogs(keyId, limit = 100, offset = 0) {
    try {
      const query = `
        SELECT action, user_id, ip_address, details, created_at
        FROM api_key_logs
        WHERE key_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.postgres.query(query, [keyId, limit, offset]);

      return {
        success: true,
        logs: result.rows.map(row => ({
          action: row.action,
          userId: row.user_id,
          ipAddress: row.ip_address,
          details: JSON.parse(row.details || '{}'),
          createdAt: row.created_at
        }))
      };
    } catch (error) {
      logger.error('Get API key logs error:', error);
      throw new Error(`Failed to get API key logs: ${error.message}`);
    }
  }

  /**
   * Clean up expired API keys
   */
  async cleanupExpiredKeys() {
    try {
      const query = `
        UPDATE api_keys 
        SET is_active = false, cleanup_reason = 'expired'
        WHERE expires_at < NOW() AND is_active = true
        RETURNING id, api_key
      `;

      const result = await this.postgres.query(query);

      // Remove from Redis cache
      for (const row of result.rows) {
        await this.removeCachedAPIKey(row.api_key);
      }

      return {
        success: true,
        cleanedKeys: result.rows.length,
        message: `Cleaned up ${result.rows.length} expired API keys`
      };
    } catch (error) {
      logger.error('Cleanup expired keys error:', error);
      throw new Error(`Failed to cleanup expired keys: ${error.message}`);
    }
  }

  /**
   * Convert camelCase to snake_case
   */
  camelToSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Get API key statistics
   */
  async getAPIKeyStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_keys,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_keys,
          COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_keys,
          COUNT(CASE WHEN last_used_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recently_used
        FROM api_keys
      `;

      const result = await this.postgres.query(query);
      const stats = result.rows[0];

      return {
        success: true,
        stats: {
          totalKeys: parseInt(stats.total_keys),
          activeKeys: parseInt(stats.active_keys),
          expiredKeys: parseInt(stats.expired_keys),
          recentlyUsed: parseInt(stats.recently_used)
        }
      };
    } catch (error) {
      logger.error('Get API key stats error:', error);
      throw new Error(`Failed to get API key statistics: ${error.message}`);
    }
  }
}

module.exports = new APIKeyManager();
