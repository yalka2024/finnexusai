
const databaseManager = require('../../config/database');
const authService = require('../auth/AuthService');

class UserService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  // Get user profile
  async getUserProfile(userId) {
    const cacheKey = `user_profile_${userId}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const result = await databaseManager.query(`
        SELECT u.id, u.email, u.username, u.first_name, u.last_name, u.phone,
               u.date_of_birth, u.status, u.role, u.two_factor_enabled,
               u.email_verified, u.phone_verified, u.kyc_status, u.kyc_verified_at,
               u.last_login_at, u.created_at, u.updated_at,
               up.bio, up.avatar_url, up.timezone, up.language, up.currency,
               up.risk_tolerance, up.investment_goals, up.notification_preferences,
               up.privacy_settings
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];
      const formattedUser = this.formatUser(user);

      const response = {
        success: true,
        user: formattedUser
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });

      return response;

    } catch (error) {
      logger.error('Failed to get user profile:', error);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(userId, updateData) {
    const client = await databaseManager.getClient();

    try {
      await client.query('BEGIN');

      // Check if user exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE id = $1',
        [userId]
      );

      if (existingUser.rows.length === 0) {
        throw new Error('User not found');
      }

      // Update user table
      const userUpdateFields = [];
      const userUpdateValues = [];
      let paramIndex = 1;

      if (updateData.firstName !== undefined) {
        userUpdateFields.push(`first_name = $${paramIndex++}`);
        userUpdateValues.push(updateData.firstName);
      }

      if (updateData.lastName !== undefined) {
        userUpdateFields.push(`last_name = $${paramIndex++}`);
        userUpdateValues.push(updateData.lastName);
      }

      if (updateData.phone !== undefined) {
        userUpdateFields.push(`phone = $${paramIndex++}`);
        userUpdateValues.push(updateData.phone);
      }

      if (updateData.dateOfBirth !== undefined) {
        userUpdateFields.push(`date_of_birth = $${paramIndex++}`);
        userUpdateValues.push(updateData.dateOfBirth);
      }

      if (userUpdateFields.length > 0) {
        userUpdateFields.push('updated_at = CURRENT_TIMESTAMP');
        userUpdateValues.push(userId);

        await client.query(`
          UPDATE users 
          SET ${userUpdateFields.join(', ')}
          WHERE id = $${paramIndex}
        `, userUpdateValues);
      }

      // Update or insert user profile
      const profileUpdateFields = [];
      const profileUpdateValues = [];
      paramIndex = 1;

      if (updateData.bio !== undefined) {
        profileUpdateFields.push(`bio = $${paramIndex++}`);
        profileUpdateValues.push(updateData.bio);
      }

      if (updateData.avatarUrl !== undefined) {
        profileUpdateFields.push(`avatar_url = $${paramIndex++}`);
        profileUpdateValues.push(updateData.avatarUrl);
      }

      if (updateData.timezone !== undefined) {
        profileUpdateFields.push(`timezone = $${paramIndex++}`);
        profileUpdateValues.push(updateData.timezone);
      }

      if (updateData.language !== undefined) {
        profileUpdateFields.push(`language = $${paramIndex++}`);
        profileUpdateValues.push(updateData.language);
      }

      if (updateData.currency !== undefined) {
        profileUpdateFields.push(`currency = $${paramIndex++}`);
        profileUpdateValues.push(updateData.currency);
      }

      if (updateData.riskTolerance !== undefined) {
        profileUpdateFields.push(`risk_tolerance = $${paramIndex++}`);
        profileUpdateValues.push(updateData.riskTolerance);
      }

      if (updateData.investmentGoals !== undefined) {
        profileUpdateFields.push(`investment_goals = $${paramIndex++}`);
        profileUpdateValues.push(updateData.investmentGoals);
      }

      if (updateData.notificationPreferences !== undefined) {
        profileUpdateFields.push(`notification_preferences = $${paramIndex++}`);
        profileUpdateValues.push(JSON.stringify(updateData.notificationPreferences));
      }

      if (updateData.privacySettings !== undefined) {
        profileUpdateFields.push(`privacy_settings = $${paramIndex++}`);
        profileUpdateValues.push(JSON.stringify(updateData.privacySettings));
      }

      if (profileUpdateFields.length > 0) {
        profileUpdateFields.push('updated_at = CURRENT_TIMESTAMP');
        profileUpdateValues.push(userId);

        await client.query(`
          INSERT INTO user_profiles (user_id, ${profileUpdateFields.slice(0, -1).join(', ')}, created_at, updated_at)
          VALUES ($1, ${profileUpdateValues.slice(0, -1).map((_, i) => `$${i + 2}`).join(', ')}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (user_id) 
          DO UPDATE SET ${profileUpdateFields.slice(0, -1).map(field => `${field} = EXCLUDED.${field.split(' = ')[0]}`).join(', ')}, updated_at = CURRENT_TIMESTAMP
        `, [userId, ...profileUpdateValues.slice(0, -1)]);
      }

      await client.query('COMMIT');

      // Clear cache
      this.clearUserCache(userId);

      logger.info(`User profile updated: ${userId}`);

      return {
        success: true,
        message: 'Profile updated successfully'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('User profile update failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    const client = await databaseManager.getClient();

    try {
      await client.query('BEGIN');

      // Get current password hash
      const userResult = await client.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const currentPasswordHash = userResult.rows[0].password_hash;

      // Verify current password
      const isValidPassword = await authService.verifyPassword(currentPassword, currentPasswordHash);

      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await authService.hashPassword(newPassword);

      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, userId]
      );

      await client.query('COMMIT');

      // Clear all user sessions to force re-login
      await client.query(
        'DELETE FROM user_sessions WHERE user_id = $1',
        [userId]
      );

      logger.info(`Password changed for user: ${userId}`);

      return {
        success: true,
        message: 'Password changed successfully. Please login again.'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Password change failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get user statistics
  async getUserStats(userId) {
    try {
      // Get portfolio count
      const portfolioResult = await databaseManager.query(
        'SELECT COUNT(*) as portfolio_count FROM portfolios WHERE user_id = $1',
        [userId]
      );

      // Get total portfolio value
      const valueResult = await databaseManager.query(`
        SELECT COALESCE(SUM(p.current_balance), 0) as total_value
        FROM portfolios p
        WHERE p.user_id = $1
      `, [userId]);

      // Get transaction count
      const transactionResult = await databaseManager.query(
        'SELECT COUNT(*) as transaction_count FROM transactions WHERE user_id = $1',
        [userId]
      );

      // Get total return
      const returnResult = await databaseManager.query(`
        SELECT COALESCE(SUM(p.total_return), 0) as total_return
        FROM portfolios p
        WHERE p.user_id = $1
      `, [userId]);

      // Get recent activity
      const activityResult = await databaseManager.query(`
        SELECT 
          'transaction' as type,
          t.created_at,
          a.symbol,
          t.transaction_type,
          t.quantity,
          t.price
        FROM transactions t
        JOIN assets a ON t.asset_id = a.id
        WHERE t.user_id = $1
        ORDER BY t.created_at DESC
        LIMIT 10
      `, [userId]);

      const stats = {
        portfolioCount: parseInt(portfolioResult.rows[0].portfolio_count),
        totalValue: parseFloat(valueResult.rows[0].total_value),
        transactionCount: parseInt(transactionResult.rows[0].transaction_count),
        totalReturn: parseFloat(returnResult.rows[0].total_return),
        recentActivity: activityResult.rows.map(row => ({
          type: row.type,
          timestamp: row.created_at,
          symbol: row.symbol,
          transactionType: row.transaction_type,
          quantity: parseFloat(row.quantity),
          price: parseFloat(row.price)
        }))
      };

      return {
        success: true,
        stats
      };

    } catch (error) {
      logger.error('Failed to get user stats:', error);
      throw error;
    }
  }

  // Get user notifications
  async getUserNotifications(userId, limit = 50, offset = 0) {
    try {
      const result = await databaseManager.query(`
        SELECT id, title, message, type, is_read, data, created_at, read_at
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      const notifications = result.rows.map(row => ({
        id: row.id,
        title: row.title,
        message: row.message,
        type: row.type,
        isRead: row.is_read,
        data: row.data ? JSON.parse(row.data) : {},
        createdAt: row.created_at,
        readAt: row.read_at
      }));

      // Get total count
      const countResult = await databaseManager.query(
        'SELECT COUNT(*) as total FROM notifications WHERE user_id = $1',
        [userId]
      );

      return {
        success: true,
        notifications,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      };

    } catch (error) {
      logger.error('Failed to get user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markNotificationAsRead(userId, notificationId) {
    try {
      const result = await databaseManager.query(`
        UPDATE notifications 
        SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `, [notificationId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Notification not found');
      }

      return {
        success: true,
        message: 'Notification marked as read'
      };

    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead(userId) {
    try {
      await databaseManager.query(`
        UPDATE notifications 
        SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND is_read = FALSE
      `, [userId]);

      return {
        success: true,
        message: 'All notifications marked as read'
      };

    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  // Create notification
  async createNotification(userId, notificationData) {
    try {
      const result = await databaseManager.query(`
        INSERT INTO notifications (user_id, title, message, type, data)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        userId,
        notificationData.title,
        notificationData.message,
        notificationData.type || 'info',
        JSON.stringify(notificationData.data || {})
      ]);

      return {
        success: true,
        notificationId: result.rows[0].id,
        message: 'Notification created successfully'
      };

    } catch (error) {
      logger.error('Failed to create notification:', error);
      throw error;
    }
  }

  // Get user API keys
  async getUserApiKeys(userId) {
    try {
      const result = await databaseManager.query(`
        SELECT id, name, permissions, is_active, last_used_at, expires_at, created_at
        FROM api_keys
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [userId]);

      const apiKeys = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        permissions: row.permissions,
        isActive: row.is_active,
        lastUsedAt: row.last_used_at,
        expiresAt: row.expires_at,
        createdAt: row.created_at
      }));

      return {
        success: true,
        apiKeys,
        total: apiKeys.length
      };

    } catch (error) {
      logger.error('Failed to get user API keys:', error);
      throw error;
    }
  }

  // Create API key
  async createApiKey(userId, apiKeyData) {
    const client = await databaseManager.getClient();

    try {
      await client.query('BEGIN');

      // Generate API key
      const crypto = require('crypto');
      const logger = require('../../utils/logger');
      const apiKey = crypto.randomBytes(32).toString('hex');
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      // Insert API key
      const result = await client.query(`
        INSERT INTO api_keys (user_id, name, key_hash, permissions, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        userId,
        apiKeyData.name,
        keyHash,
        apiKeyData.permissions || ['read'],
        apiKeyData.expiresAt || null
      ]);

      await client.query('COMMIT');

      logger.info(`API key created for user: ${userId}`);

      return {
        success: true,
        apiKey, // Only return the key once during creation
        apiKeyId: result.rows[0].id,
        message: 'API key created successfully. Save this key securely as it will not be shown again.'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('API key creation failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Revoke API key
  async revokeApiKey(userId, apiKeyId) {
    try {
      const result = await databaseManager.query(`
        UPDATE api_keys 
        SET is_active = FALSE
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `, [apiKeyId, userId]);

      if (result.rows.length === 0) {
        throw new Error('API key not found');
      }

      logger.info(`API key revoked: ${apiKeyId} for user: ${userId}`);

      return {
        success: true,
        message: 'API key revoked successfully'
      };

    } catch (error) {
      logger.error('API key revocation failed:', error);
      throw error;
    }
  }

  // Helper methods
  formatUser(user) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      dateOfBirth: user.date_of_birth,
      status: user.status,
      role: user.role,
      twoFactorEnabled: user.two_factor_enabled,
      emailVerified: user.email_verified,
      phoneVerified: user.phone_verified,
      kycStatus: user.kyc_status,
      kycVerifiedAt: user.kyc_verified_at,
      lastLoginAt: user.last_login_at,
      profile: {
        bio: user.bio,
        avatarUrl: user.avatar_url,
        timezone: user.timezone,
        language: user.language,
        currency: user.currency,
        riskTolerance: user.risk_tolerance,
        investmentGoals: user.investment_goals,
        notificationPreferences: user.notification_preferences ? JSON.parse(user.notification_preferences) : {},
        privacySettings: user.privacy_settings ? JSON.parse(user.privacy_settings) : {}
      },
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }

  clearUserCache(userId) {
    for (const key of this.cache.keys()) {
      if (key.includes(`_${userId}`)) {
        this.cache.delete(key);
      }
    }
  }
}

module.exports = new UserService();
