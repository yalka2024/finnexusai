/**
 * Email Verification Service
 * Handles email verification for user registration and email changes
 */

const crypto = require('crypto');
const databaseManager = require('../../config/database');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');
const logger = require('../../utils/logger');

class EmailVerificationService {
  constructor() {
    this.postgres = databaseManager.getPostgresPool();
    this.redis = databaseManager.getRedisClient();
    this.tokenExpiry = 24 * 60 * 60 * 1000; // 24 hours
    this.maxAttempts = 5;
  }

  /**
   * Generate email verification token
   */
  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create email verification request
   */
  async createVerificationRequest(userId, email, type = 'registration') {
    try {
      // Check if user exists
      const userResult = await this.postgres.query(
        'SELECT id, email, first_name, is_email_verified FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Check for existing valid verification requests
      const existingRequest = await this.postgres.query(
        'SELECT id, created_at FROM email_verifications WHERE user_id = $1 AND verified_at IS NULL AND expires_at > NOW() AND type = $2 ORDER BY created_at DESC LIMIT 1',
        [userId, type]
      );

      if (existingRequest.rows.length > 0) {
        const requestAge = Date.now() - existingRequest.rows[0].created_at.getTime();
        if (requestAge < 5 * 60 * 1000) { // 5 minutes cooldown
          throw new Error('Verification email already sent. Please check your email or wait before requesting another.');
        }
      }

      // Generate verification token
      const verificationToken = this.generateVerificationToken();
      const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
      const expiresAt = new Date(Date.now() + this.tokenExpiry);

      // Store verification request
      const verificationId = uuidv4();
      await this.postgres.query(`
        INSERT INTO email_verifications (
          id, user_id, email, token_hash, type, expires_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [verificationId, userId, email, tokenHash, type, expiresAt]);

      // Store in Redis for quick validation
      await this.redis.setEx(
        `email_verification:${tokenHash}`,
        this.tokenExpiry / 1000,
        JSON.stringify({
          userId: userId,
          email: email,
          type: type,
          verificationId: verificationId
        })
      );

      // Send verification email
      await this.sendVerificationEmail(email, user.first_name, verificationToken, type);

      return {
        success: true,
        message: 'Verification email sent successfully',
        verificationId: verificationId,
        // In development, include the token for testing
        ...(config.nodeEnv === 'development' && { verificationToken: verificationToken })
      };
    } catch (error) {
      logger.error('Create verification request error:', error);
      throw error;
    }
  }

  /**
   * Verify email token
   */
  async verifyEmailToken(token) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Check Redis first
      const cachedData = await this.redis.get(`email_verification:${tokenHash}`);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Check database
      const result = await this.postgres.query(`
        SELECT 
          ev.id as verification_id,
          ev.user_id,
          ev.email,
          ev.type,
          ev.expires_at,
          u.first_name,
          u.is_email_verified
        FROM email_verifications ev
        JOIN users u ON ev.user_id = u.id
        WHERE ev.token_hash = $1 
          AND ev.verified_at IS NULL 
          AND ev.expires_at > NOW()
        ORDER BY ev.created_at DESC
        LIMIT 1
      `, [tokenHash]);

      if (result.rows.length === 0) {
        return null;
      }

      const verificationData = result.rows[0];
      return {
        verificationId: verificationData.verification_id,
        userId: verificationData.user_id,
        email: verificationData.email,
        type: verificationData.type,
        expiresAt: verificationData.expires_at,
        firstName: verificationData.first_name,
        isEmailVerified: verificationData.is_email_verified
      };
    } catch (error) {
      logger.error('Verify email token error:', error);
      throw new Error('Failed to verify email token');
    }
  }

  /**
   * Confirm email verification
   */
  async confirmEmailVerification(token) {
    try {
      // Validate token
      const verificationData = await this.verifyEmailToken(token);
      if (!verificationData) {
        throw new Error('Invalid or expired verification token');
      }

      const { verificationId, userId, email, type } = verificationData;

      // Check attempt limits
      const attempts = await this.redis.get(`email_verification_attempts:${userId}`);
      if (attempts && parseInt(attempts) >= this.maxAttempts) {
        throw new Error('Too many verification attempts. Please request a new verification email.');
      }

      // Start transaction
      const client = await this.postgres.connect();
      try {
        await client.query('BEGIN');

        // Mark verification as confirmed
        await client.query(
          'UPDATE email_verifications SET verified_at = NOW() WHERE id = $1',
          [verificationId]
        );

        // Update user email verification status
        if (type === 'registration' || type === 'email_change') {
          await client.query(
            'UPDATE users SET is_email_verified = true, email = $1, updated_at = NOW() WHERE id = $2',
            [email, userId]
          );
        }

        await client.query('COMMIT');

        // Clear Redis cache
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await this.redis.del(`email_verification:${tokenHash}`);

        // Clear attempt counter
        await this.redis.del(`email_verification_attempts:${userId}`);

        // Send welcome email for new registrations
        if (type === 'registration') {
          await this.sendWelcomeEmail(email, verificationData.first_name);
        }

        return {
          success: true,
          message: 'Email verified successfully',
          type: type
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Confirm email verification error:', error);

      // Increment attempt counter
      if (verificationData?.userId) {
        await this.redis.incr(`email_verification_attempts:${verificationData.userId}`);
        await this.redis.expire(`email_verification_attempts:${verificationData.userId}`, 3600); // 1 hour
      }

      throw error;
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(userId, type = 'registration') {
    try {
      // Get user information
      const userResult = await this.postgres.query(
        'SELECT email, first_name, is_email_verified FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Check if email is already verified for registration
      if (type === 'registration' && user.is_email_verified) {
        throw new Error('Email is already verified');
      }

      // Check resend limits
      const resendKey = `email_verification_resend:${userId}:${type}`;
      const resendCount = await this.redis.get(resendKey);
      if (resendCount && parseInt(resendCount) >= 3) {
        throw new Error('Too many resend attempts. Please wait before requesting another verification email.');
      }

      // Create new verification request
      const result = await this.createVerificationRequest(userId, user.email, type);

      // Increment resend counter
      await this.redis.incr(resendKey);
      await this.redis.expire(resendKey, 3600); // 1 hour

      return {
        success: true,
        message: 'Verification email resent successfully',
        resendCount: (parseInt(resendCount) || 0) + 1
      };
    } catch (error) {
      logger.error('Resend verification email error:', error);
      throw error;
    }
  }

  /**
   * Request email change
   */
  async requestEmailChange(userId, newEmail) {
    try {
      // Check if new email is already in use
      const existingUser = await this.postgres.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [newEmail, userId]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Email address is already in use');
      }

      // Create verification request for email change
      const result = await this.createVerificationRequest(userId, newEmail, 'email_change');

      return {
        success: true,
        message: 'Email change verification sent to new email address',
        newEmail: newEmail
      };
    } catch (error) {
      logger.error('Request email change error:', error);
      throw error;
    }
  }

  /**
   * Get verification status for user
   */
  async getVerificationStatus(userId) {
    try {
      const result = await this.postgres.query(`
        SELECT 
          is_email_verified,
          email,
          created_at
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];

      // Get pending verification requests
      const pendingRequests = await this.postgres.query(`
        SELECT 
          type,
          email,
          created_at,
          expires_at
        FROM email_verifications 
        WHERE user_id = $1 AND verified_at IS NULL AND expires_at > NOW()
        ORDER BY created_at DESC
      `, [userId]);

      return {
        isEmailVerified: user.is_email_verified,
        email: user.email,
        accountCreatedAt: user.created_at,
        pendingVerifications: pendingRequests.rows
      };
    } catch (error) {
      logger.error('Get verification status error:', error);
      throw new Error('Failed to get verification status');
    }
  }

  /**
   * Clean up expired verification requests
   */
  async cleanupExpiredVerifications() {
    try {
      const result = await this.postgres.query(
        'DELETE FROM email_verifications WHERE expires_at < NOW() OR verified_at IS NOT NULL'
      );

      return result.rowCount;
    } catch (error) {
      logger.error('Cleanup expired verifications error:', error);
      throw new Error('Failed to cleanup expired verifications');
    }
  }

  /**
   * Get email verification statistics
   */
  async getVerificationStats() {
    try {
      const stats = await this.postgres.query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN verified_at IS NOT NULL THEN 1 END) as verified_requests,
          COUNT(CASE WHEN expires_at > NOW() AND verified_at IS NULL THEN 1 END) as pending_requests,
          COUNT(CASE WHEN expires_at < NOW() AND verified_at IS NULL THEN 1 END) as expired_requests
        FROM email_verifications
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);

      return stats.rows[0];
    } catch (error) {
      logger.error('Get verification stats error:', error);
      throw new Error('Failed to get verification statistics');
    }
  }

  /**
   * Send verification email (placeholder for email service integration)
   */
  async sendVerificationEmail(email, firstName, token, type) {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`;

    logger.info(`Email verification for ${email} (${type}):`);
    logger.info(`Verification URL: ${verificationUrl}`);

    // This would be replaced with actual email sending logic
    return {
      success: true,
      message: 'Verification email sent',
      verificationUrl: verificationUrl
    };
  }

  /**
   * Send welcome email (placeholder)
   */
  async sendWelcomeEmail(email, firstName) {
    // TODO: Integrate with email service
    logger.info(`Welcome email sent to ${email}`);
    return { success: true };
  }
}

module.exports = new EmailVerificationService();
