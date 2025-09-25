/**
 * Password Reset Service
 * Handles password reset functionality with secure token generation and validation
 */

const crypto = require('crypto');
const databaseManager = require('../../config/database');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');

class PasswordResetService {
  constructor() {
    this.postgres = databaseManager.getPostgresPool();
    this.redis = databaseManager.getRedisClient();
    this.tokenExpiry = 15 * 60 * 1000; // 15 minutes
    this.maxAttempts = 3;
  }

  /**
   * Generate a secure password reset token
   */
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a password reset request
   */
  async createPasswordResetRequest(email, ipAddress, userAgent) {
    try {
      // Check if user exists
      const userResult = await this.postgres.query(
        'SELECT id, email, first_name FROM users WHERE email = $1 AND status = $2',
        [email, 'active']
      );

      if (userResult.rows.length === 0) {
        // Don't reveal if user exists or not for security
        return {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.',
          email: email
        };
      }

      const user = userResult.rows[0];

      // Check for existing valid reset requests
      const existingRequest = await this.postgres.query(
        'SELECT id, created_at FROM password_reset_requests WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
        [user.id]
      );

      if (existingRequest.rows.length > 0) {
        const requestAge = Date.now() - existingRequest.rows[0].created_at.getTime();
        if (requestAge < 5 * 60 * 1000) { // 5 minutes cooldown
          return {
            success: true,
            message: 'A password reset link has already been sent. Please check your email or wait before requesting another.',
            email: email
          };
        }
      }

      // Generate reset token
      const resetToken = this.generateResetToken();
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const expiresAt = new Date(Date.now() + this.tokenExpiry);

      // Store reset request
      const requestId = uuidv4();
      await this.postgres.query(`
        INSERT INTO password_reset_requests (
          id, user_id, token_hash, expires_at, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [requestId, user.id, tokenHash, expiresAt, ipAddress, userAgent]);

      // Store in Redis for quick validation
      await this.redis.setEx(
        `password_reset:${tokenHash}`,
        this.tokenExpiry / 1000,
        JSON.stringify({
          userId: user.id,
          email: user.email,
          requestId: requestId
        })
      );

      // TODO: Send email with reset link
      // await this.sendPasswordResetEmail(user.email, user.first_name, resetToken);

      return {
        success: true,
        message: 'Password reset link sent to your email address.',
        requestId: requestId,
        // In development, include the token for testing
        ...(config.nodeEnv === 'development' && { resetToken: resetToken })
      };
    } catch (error) {
      logger.error('Create password reset request error:', error);
      throw new Error('Failed to create password reset request');
    }
  }

  /**
   * Validate password reset token
   */
  async validateResetToken(token) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Check Redis first
      const cachedData = await this.redis.get(`password_reset:${tokenHash}`);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Check database
      const result = await this.postgres.query(`
        SELECT 
          prr.id as request_id,
          prr.user_id,
          prr.expires_at,
          u.email,
          u.first_name
        FROM password_reset_requests prr
        JOIN users u ON prr.user_id = u.id
        WHERE prr.token_hash = $1 
          AND prr.used_at IS NULL 
          AND prr.expires_at > NOW()
        ORDER BY prr.created_at DESC
        LIMIT 1
      `, [tokenHash]);

      if (result.rows.length === 0) {
        return null;
      }

      const resetData = result.rows[0];
      return {
        requestId: resetData.request_id,
        userId: resetData.user_id,
        email: resetData.email,
        firstName: resetData.first_name,
        expiresAt: resetData.expires_at
      };
    } catch (error) {
      logger.error('Validate reset token error:', error);
      throw new Error('Failed to validate reset token');
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(token, newPassword, ipAddress, userAgent) {
    try {
      // Validate token
      const resetData = await this.validateResetToken(token);
      if (!resetData) {
        throw new Error('Invalid or expired password reset token');
      }

      const { requestId, userId } = resetData;

      // Check attempt limits
      const attempts = await this.redis.get(`password_reset_attempts:${userId}`);
      if (attempts && parseInt(attempts) >= this.maxAttempts) {
        throw new Error('Too many password reset attempts. Please try again later.');
      }

      // Hash new password
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      // Start transaction
      const client = await this.postgres.connect();
      try {
        await client.query('BEGIN');

        // Update password
        await client.query(
          'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
          [passwordHash, userId]
        );

        // Mark reset request as used
        await client.query(
          'UPDATE password_reset_requests SET used_at = NOW() WHERE id = $1',
          [requestId]
        );

        // Revoke all existing sessions for security
        await client.query(
          'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1',
          [userId]
        );

        await client.query('COMMIT');

        // Clear Redis cache
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await this.redis.del(`password_reset:${tokenHash}`);

        // Clear attempt counter
        await this.redis.del(`password_reset_attempts:${userId}`);

        // TODO: Send password change notification email
        // await this.sendPasswordChangeNotification(resetData.email, resetData.firstName);

        return {
          success: true,
          message: 'Password reset successfully. Please log in with your new password.'
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Reset password error:', error);

      // Increment attempt counter
      if (resetData?.userId) {
        await this.redis.incr(`password_reset_attempts:${resetData.userId}`);
        await this.redis.expire(`password_reset_attempts:${resetData.userId}`, 3600); // 1 hour
      }

      throw error;
    }
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(userId, currentPassword, newPassword, ipAddress, userAgent) {
    try {
      // Get current password hash
      const userResult = await this.postgres.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Verify current password
      const bcrypt = require('bcryptjs');
      const logger = require('../../utils/logger');
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      // Update password
      await this.postgres.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, userId]
      );

      // Revoke all existing sessions except current one
      await this.postgres.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND id != $2',
        [userId, userAgent] // Using userAgent as session identifier
      );

      // TODO: Send password change notification email

      return {
        success: true,
        message: 'Password changed successfully. Please log in again with your new password.'
      };
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Clean up expired password reset requests
   */
  async cleanupExpiredRequests() {
    try {
      const result = await this.postgres.query(
        'DELETE FROM password_reset_requests WHERE expires_at < NOW() OR used_at IS NOT NULL'
      );

      return result.rowCount;
    } catch (error) {
      logger.error('Cleanup expired requests error:', error);
      throw new Error('Failed to cleanup expired requests');
    }
  }

  /**
   * Get password reset statistics
   */
  async getPasswordResetStats() {
    try {
      const stats = await this.postgres.query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN used_at IS NOT NULL THEN 1 END) as used_requests,
          COUNT(CASE WHEN expires_at > NOW() AND used_at IS NULL THEN 1 END) as pending_requests,
          COUNT(CASE WHEN expires_at < NOW() AND used_at IS NULL THEN 1 END) as expired_requests
        FROM password_reset_requests
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);

      return stats.rows[0];
    } catch (error) {
      logger.error('Get password reset stats error:', error);
      throw new Error('Failed to get password reset statistics');
    }
  }

  /**
   * Send password reset email (placeholder for email service integration)
   */
  async sendPasswordResetEmail(email, firstName, resetToken) {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

    logger.info(`Password reset email for ${email}:`);
    logger.info(`Reset URL: ${resetUrl}`);

    // This would be replaced with actual email sending logic
    return {
      success: true,
      message: 'Password reset email sent',
      resetUrl: resetUrl
    };
  }

  /**
   * Send password change notification email (placeholder)
   */
  async sendPasswordChangeNotification(email, firstName) {
    // TODO: Integrate with email service
    logger.info(`Password change notification sent to ${email}`);
    return { success: true };
  }
}

module.exports = new PasswordResetService();
