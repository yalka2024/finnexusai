/**
 * Two-Factor Authentication (2FA) Service
 * Handles TOTP (Time-based One-Time Password) and SMS-based 2FA
 */

const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const databaseManager = require('../../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class TwoFactorAuthService {
  constructor() {
    this.postgres = databaseManager.getPostgresPool();
    this.redis = databaseManager.getRedisClient();
    this.totpWindow = 2; // Allow 2 time steps (60 seconds) of drift
    this.backupCodeCount = 10;
    this.backupCodeLength = 8;
  }

  /**
   * Generate TOTP secret for a user
   */
  async generateTOTPSecret(userId, userEmail) {
    try {
      // Check if user already has 2FA enabled
      const existingSecret = await this.postgres.query(
        'SELECT totp_secret FROM user_two_factor WHERE user_id = $1 AND enabled = true',
        [userId]
      );

      if (existingSecret.rows.length > 0) {
        throw new Error('2FA is already enabled for this user');
      }

      // Generate new TOTP secret
      const secret = speakeasy.generateSecret({
        name: `FinNexusAI (${userEmail})`,
        issuer: 'FinNexusAI',
        length: 32
      });

      // Store secret (encrypted) in database
      const encryptedSecret = this.encryptSecret(secret.base32);
      const twoFactorId = uuidv4();

      await this.postgres.query(`
        INSERT INTO user_two_factor (
          id, user_id, totp_secret, backup_codes, enabled, created_at
        ) VALUES ($1, $2, $3, $4, false, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          totp_secret = EXCLUDED.totp_secret,
          backup_codes = EXCLUDED.backup_codes,
          enabled = false,
          updated_at = NOW()
      `, [twoFactorId, userId, encryptedSecret, JSON.stringify([])]);

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        otpauthUrl: secret.otpauth_url,
        backupCodes: this.generateBackupCodes()
      };
    } catch (error) {
      logger.error('Generate TOTP secret error:', error);
      throw new Error('Failed to generate TOTP secret');
    }
  }

  /**
   * Verify TOTP token and enable 2FA
   */
  async verifyAndEnableTOTP(userId, token) {
    try {
      // Get stored secret
      const result = await this.postgres.query(
        'SELECT totp_secret, backup_codes FROM user_two_factor WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('2FA setup not found. Please generate a new secret.');
      }

      const { totp_secret, backup_codes } = result.rows[0];
      const decryptedSecret = this.decryptSecret(totp_secret);

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: 'base32',
        token: token,
        window: this.totpWindow
      });

      if (!verified) {
        throw new Error('Invalid TOTP token');
      }

      // Generate backup codes if not already generated
      let backupCodes = backup_codes;
      if (!backupCodes || backupCodes.length === 0) {
        backupCodes = this.generateBackupCodes();
      }

      // Enable 2FA
      await this.postgres.query(`
        UPDATE user_two_factor 
        SET enabled = true, backup_codes = $1, enabled_at = NOW(), updated_at = NOW()
        WHERE user_id = $2
      `, [JSON.stringify(backupCodes), userId]);

      // Update user's 2FA status
      await this.postgres.query(
        'UPDATE users SET two_factor_enabled = true WHERE id = $1',
        [userId]
      );

      return {
        success: true,
        message: '2FA enabled successfully',
        backupCodes: backupCodes
      };
    } catch (error) {
      logger.error('Verify and enable TOTP error:', error);
      throw error;
    }
  }

  /**
   * Verify TOTP token for login
   */
  async verifyTOTPToken(userId, token) {
    try {
      const result = await this.postgres.query(`
        SELECT totp_secret, enabled 
        FROM user_two_factor 
        WHERE user_id = $1 AND enabled = true
      `, [userId]);

      if (result.rows.length === 0) {
        throw new Error('2FA is not enabled for this user');
      }

      const { totp_secret } = result.rows[0];
      const decryptedSecret = this.decryptSecret(totp_secret);

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: 'base32',
        token: token,
        window: this.totpWindow
      });

      return verified;
    } catch (error) {
      logger.error('Verify TOTP token error:', error);
      return false;
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId, code) {
    try {
      const result = await this.postgres.query(
        'SELECT backup_codes FROM user_two_factor WHERE user_id = $1 AND enabled = true',
        [userId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const { backup_codes } = result.rows[0];
      const codes = JSON.parse(backup_codes || '[]');

      // Check if code exists
      const codeIndex = codes.indexOf(code);
      if (codeIndex === -1) {
        return false;
      }

      // Remove used backup code
      codes.splice(codeIndex, 1);
      await this.postgres.query(
        'UPDATE user_two_factor SET backup_codes = $1, updated_at = NOW() WHERE user_id = $2',
        [JSON.stringify(codes), userId]
      );

      // Log backup code usage
      await this.log2FAEvent(userId, 'backup_code_used', {
        remainingCodes: codes.length
      });

      return true;
    } catch (error) {
      logger.error('Verify backup code error:', error);
      return false;
    }
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId, token) {
    try {
      // Verify token before disabling
      const verified = await this.verifyTOTPToken(userId, token);
      if (!verified) {
        throw new Error('Invalid TOTP token');
      }

      // Disable 2FA
      await this.postgres.query(`
        UPDATE user_two_factor 
        SET enabled = false, disabled_at = NOW(), updated_at = NOW()
        WHERE user_id = $1
      `, [userId]);

      // Update user's 2FA status
      await this.postgres.query(
        'UPDATE users SET two_factor_enabled = false WHERE id = $1',
        [userId]
      );

      // Log 2FA disable event
      await this.log2FAEvent(userId, '2fa_disabled');

      return {
        success: true,
        message: '2FA disabled successfully'
      };
    } catch (error) {
      logger.error('Disable 2FA error:', error);
      throw error;
    }
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(userId, token) {
    try {
      // Verify token before regenerating
      const verified = await this.verifyTOTPToken(userId, token);
      if (!verified) {
        throw new Error('Invalid TOTP token');
      }

      // Generate new backup codes
      const newBackupCodes = this.generateBackupCodes();

      await this.postgres.query(
        'UPDATE user_two_factor SET backup_codes = $1, updated_at = NOW() WHERE user_id = $2',
        [JSON.stringify(newBackupCodes), userId]
      );

      // Log backup code regeneration
      await this.log2FAEvent(userId, 'backup_codes_regenerated');

      return {
        success: true,
        message: 'Backup codes regenerated successfully',
        backupCodes: newBackupCodes
      };
    } catch (error) {
      logger.error('Regenerate backup codes error:', error);
      throw error;
    }
  }

  /**
   * Get user's 2FA status
   */
  async get2FAStatus(userId) {
    try {
      const result = await this.postgres.query(`
        SELECT 
          enabled,
          created_at,
          enabled_at,
          disabled_at,
          backup_codes,
          updated_at
        FROM user_two_factor 
        WHERE user_id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return {
          enabled: false,
          setupRequired: true
        };
      }

      const { enabled, backup_codes, enabled_at, disabled_at } = result.rows[0];
      const codes = JSON.parse(backup_codes || '[]');

      return {
        enabled,
        setupRequired: !enabled,
        enabledAt: enabled_at,
        disabledAt: disabled_at,
        remainingBackupCodes: codes.length,
        hasBackupCodes: codes.length > 0
      };
    } catch (error) {
      logger.error('Get 2FA status error:', error);
      throw new Error('Failed to get 2FA status');
    }
  }

  /**
   * Generate backup codes
   */
  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < this.backupCodeCount; i++) {
      codes.push(crypto.randomBytes(this.backupCodeLength / 2).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Encrypt TOTP secret
   */
  encryptSecret(secret) {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-for-development-only', 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('totp-secret', 'utf8'));

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      algorithm
    };
  }

  /**
   * Decrypt TOTP secret
   */
  decryptSecret(encryptedData) {
    try {
      const { encrypted, iv, tag, algorithm } = encryptedData;
      const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-for-development-only', 'hex');

      const decipher = crypto.createDecipher(algorithm, key);
      decipher.setAAD(Buffer.from('totp-secret', 'utf8'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decrypt secret error:', error);
      throw new Error('Failed to decrypt TOTP secret');
    }
  }

  /**
   * Log 2FA events for audit
   */
  async log2FAEvent(userId, event, metadata = {}) {
    try {
      const eventId = uuidv4();
      await this.postgres.query(`
        INSERT INTO two_factor_audit_log (
          id, user_id, event_type, metadata, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `, [eventId, userId, event, JSON.stringify(metadata)]);
    } catch (error) {
      logger.error('Log 2FA event error:', error);
      // Don't throw error for audit logging failure
    }
  }

  /**
   * Get 2FA audit log for user
   */
  async get2FAAuditLog(userId, limit = 50) {
    try {
      const result = await this.postgres.query(`
        SELECT 
          event_type,
          metadata,
          created_at
        FROM two_factor_audit_log 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `, [userId, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Get 2FA audit log error:', error);
      return [];
    }
  }

  /**
   * Clean up old 2FA audit logs
   */
  async cleanupOldAuditLogs(daysOld = 90) {
    try {
      const result = await this.postgres.query(
        'DELETE FROM two_factor_audit_log WHERE created_at < NOW() - INTERVAL $1 days',
        [daysOld]
      );

      return result.rowCount;
    } catch (error) {
      logger.error('Cleanup old audit logs error:', error);
      throw new Error('Failed to cleanup old audit logs');
    }
  }

  /**
   * Send SMS verification code (placeholder for SMS service integration)
   */
  async sendSMSVerificationCode(phoneNumber, code) {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    logger.info(`SMS verification code for ${phoneNumber}: ${code}`);
    return {
      success: true,
      message: 'SMS verification code sent',
      // In development, return the code for testing
      ...(process.env.NODE_ENV === 'development' && { code: code })
    };
  }

  /**
   * Generate and send SMS verification code
   */
  async generateSMSVerificationCode(userId, phoneNumber) {
    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Store code in Redis with 5-minute expiry
      await this.redis.setEx(`sms_verification:${userId}`, 300, code);

      // Send SMS
      await this.sendSMSVerificationCode(phoneNumber, code);

      return {
        success: true,
        message: 'SMS verification code sent',
        expiresIn: 300 // 5 minutes
      };
    } catch (error) {
      logger.error('Generate SMS verification code error:', error);
      throw new Error('Failed to generate SMS verification code');
    }
  }

  /**
   * Verify SMS code
   */
  async verifySMSCode(userId, code) {
    try {
      const storedCode = await this.redis.get(`sms_verification:${userId}`);

      if (!storedCode || storedCode !== code) {
        return false;
      }

      // Remove code after successful verification
      await this.redis.del(`sms_verification:${userId}`);

      return true;
    } catch (error) {
      logger.error('Verify SMS code error:', error);
      return false;
    }
  }
}

module.exports = new TwoFactorAuthService();
