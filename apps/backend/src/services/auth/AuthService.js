const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Optional imports - application will work without these dependencies
let speakeasy = null;
let QRCode = null;

try {
  speakeasy = require('speakeasy');
} catch (error) {
  logger.info('⚠️ Speakeasy not available - 2FA features will be limited');
}

try {
  QRCode = require('qrcode');
} catch (error) {
  logger.info('⚠️ QRCode not available - QR code generation will be limited');
}

const databaseManager = require('../../config/database');
const logger = require('../../utils/logger');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  }

  // Hash password
  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, this.bcryptRounds);
    } catch (error) {
      logger.error('Password hashing failed:', error);
      throw new Error('Password hashing failed');
    }
  }

  // Verify password
  async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password verification failed:', error);
      throw new Error('Password verification failed');
    }
  }

  // Generate JWT token
  generateAccessToken(payload) {
    try {
      return jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn,
        issuer: 'finainexus',
        audience: 'finainexus-users'
      });
    } catch (error) {
      logger.error('Access token generation failed:', error);
      throw new Error('Token generation failed');
    }
  }

  // Generate refresh token
  generateRefreshToken(payload) {
    try {
      return jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.refreshTokenExpiresIn,
        issuer: 'finainexus',
        audience: 'finainexus-refresh'
      });
    } catch (error) {
      logger.error('Refresh token generation failed:', error);
      throw new Error('Refresh token generation failed');
    }
  }

  // Verify JWT token
  verifyToken(token, audience = 'finainexus-users') {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'finainexus',
        audience: audience
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        logger.error('Token verification failed:', error);
        throw new Error('Token verification failed');
      }
    }
  }

  // Generate 2FA secret
  generateTwoFactorSecret(userEmail) {
    try {
      const secret = speakeasy.generateSecret({
        name: `FinNexusAI (${userEmail})`,
        issuer: 'FinNexusAI',
        length: 32
      });

      return {
        secret: secret.base32,
        qrCodeUrl: secret.otpauth_url
      };
    } catch (error) {
      logger.error('2FA secret generation failed:', error);
      throw new Error('2FA setup failed');
    }
  }

  // Generate QR code for 2FA
  async generateQRCode(secret) {
    try {
      return await QRCode.toDataURL(secret.qrCodeUrl);
    } catch (error) {
      logger.error('QR code generation failed:', error);
      throw new Error('QR code generation failed');
    }
  }

  // Verify 2FA token
  verifyTwoFactorToken(token, secret) {
    try {
      return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 2 time steps tolerance
      });
    } catch (error) {
      logger.error('2FA token verification failed:', error);
      return false;
    }
  }

  // Generate backup codes
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  // Hash backup codes
  hashBackupCodes(codes) {
    return codes.map(code => crypto.createHash('sha256').update(code).digest('hex'));
  }

  // Verify backup code
  verifyBackupCode(code, hashedCodes) {
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    return hashedCodes.includes(hashedCode);
  }

  // Register new user
  async registerUser(userData) {
    const client = await databaseManager.getClient();

    try {
      await client.query('BEGIN');

      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [userData.email, userData.username]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User already exists with this email or username');
      }

      // Hash password
      const passwordHash = await this.hashPassword(userData.password);

      // Insert user
      const userResult = await client.query(`
        INSERT INTO users (
          email, username, password_hash, first_name, last_name, 
          phone, date_of_birth, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, email, username, first_name, last_name, status, role, created_at
      `, [
        userData.email,
        userData.username,
        passwordHash,
        userData.firstName,
        userData.lastName,
        userData.phone || null,
        userData.dateOfBirth || null,
        'pending_verification'
      ]);

      const user = userResult.rows[0];

      // Create user profile
      await client.query(`
        INSERT INTO user_profiles (user_id, timezone, language, currency)
        VALUES ($1, $2, $3, $4)
      `, [user.id, userData.timezone || 'UTC', userData.language || 'en', userData.currency || 'USD']);

      await client.query('COMMIT');

      logger.info(`User registered successfully: ${user.email}`);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          status: user.status,
          role: user.role,
          createdAt: user.created_at
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('User registration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Login user
  async loginUser(email, password, twoFactorToken = null, deviceInfo = {}) {
    const client = await databaseManager.getClient();

    try {
      // Get user with password hash
      const userResult = await client.query(`
        SELECT id, email, username, password_hash, first_name, last_name, 
               status, role, two_factor_enabled, two_factor_secret, 
               failed_login_attempts, locked_until
        FROM users 
        WHERE email = $1
      `, [email]);

      if (userResult.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = userResult.rows[0];

      // Check if account is locked
      if (user.locked_until && new Date() < new Date(user.locked_until)) {
        throw new Error('Account is temporarily locked due to too many failed login attempts');
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.password_hash);

      if (!isValidPassword) {
        // Increment failed login attempts
        await client.query(
          'UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1',
          [user.id]
        );

        // Lock account after 5 failed attempts
        const failedAttempts = user.failed_login_attempts + 1;
        if (failedAttempts >= 5) {
          const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          await client.query(
            'UPDATE users SET locked_until = $1 WHERE id = $2',
            [lockUntil, user.id]
          );
          throw new Error('Account locked due to too many failed login attempts');
        }

        throw new Error('Invalid credentials');
      }

      // Check if 2FA is enabled
      if (user.two_factor_enabled) {
        if (!twoFactorToken) {
          throw new Error('Two-factor authentication required');
        }

        // Verify 2FA token
        const isValid2FA = this.verifyTwoFactorToken(twoFactorToken, user.two_factor_secret);

        if (!isValid2FA) {
          throw new Error('Invalid two-factor authentication code');
        }
      }

      // Reset failed login attempts and unlock account
      await client.query(
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      };

      const accessToken = this.generateAccessToken(tokenPayload);
      const refreshToken = this.generateRefreshToken({ userId: user.id });

      // Create session
      const sessionResult = await client.query(`
        INSERT INTO user_sessions (
          user_id, session_token, refresh_token, device_info, 
          ip_address, user_agent, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        user.id,
        accessToken,
        refreshToken,
        JSON.stringify(deviceInfo),
        deviceInfo.ipAddress || null,
        deviceInfo.userAgent || null,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      ]);

      logger.info(`User logged in successfully: ${user.email}`);

      return {
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          twoFactorEnabled: user.two_factor_enabled
        },
        sessionId: sessionResult.rows[0].id
      };

    } catch (error) {
      logger.error('User login failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = this.verifyToken(refreshToken, 'finainexus-refresh');

      // Check if session exists and is valid
      const client = await databaseManager.getClient();

      try {
        const sessionResult = await client.query(`
          SELECT s.id, s.user_id, u.email, u.username, u.role, u.status
          FROM user_sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.refresh_token = $1 AND s.expires_at > CURRENT_TIMESTAMP
        `, [refreshToken]);

        if (sessionResult.rows.length === 0) {
          throw new Error('Invalid or expired refresh token');
        }

        const session = sessionResult.rows[0];

        // Check if user is still active
        if (session.status !== 'active') {
          throw new Error('User account is not active');
        }

        // Generate new access token
        const tokenPayload = {
          userId: session.user_id,
          email: session.email,
          username: session.username,
          role: session.role
        };

        const newAccessToken = this.generateAccessToken(tokenPayload);

        // Update session
        await client.query(
          'UPDATE user_sessions SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = $1',
          [session.id]
        );

        logger.info(`Access token refreshed for user: ${session.email}`);

        return {
          success: true,
          accessToken: newAccessToken,
          user: {
            id: session.user_id,
            email: session.email,
            username: session.username,
            role: session.role
          }
        };

      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  // Logout user
  async logoutUser(sessionToken) {
    try {
      await databaseManager.query(
        'DELETE FROM user_sessions WHERE session_token = $1',
        [sessionToken]
      );

      logger.info('User logged out successfully');

      return { success: true, message: 'Logged out successfully' };

    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    }
  }

  // Verify session
  async verifySession(sessionToken) {
    try {
      // Verify token
      const decoded = this.verifyToken(sessionToken);

      // Check if session exists and is valid
      const sessionResult = await databaseManager.query(`
        SELECT s.user_id, u.email, u.username, u.role, u.status
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_token = $1 AND s.expires_at > CURRENT_TIMESTAMP
      `, [sessionToken]);

      if (sessionResult.rows.length === 0) {
        throw new Error('Invalid or expired session');
      }

      const session = sessionResult.rows[0];

      // Check if user is still active
      if (session.status !== 'active') {
        throw new Error('User account is not active');
      }

      return {
        success: true,
        user: {
          id: session.user_id,
          email: session.email,
          username: session.username,
          role: session.role
        }
      };

    } catch (error) {
      logger.error('Session verification failed:', error);
      throw error;
    }
  }

  // Setup 2FA
  async setupTwoFactor(userId) {
    try {
      const secret = this.generateTwoFactorSecret('user@example.com');
      const qrCodeUrl = await this.generateQRCode(secret);
      const backupCodes = this.generateBackupCodes();
      const hashedBackupCodes = this.hashBackupCodes(backupCodes);

      // Store secret and backup codes (in production, backup codes should be encrypted)
      await databaseManager.query(
        'UPDATE users SET two_factor_secret = $1, backup_codes = $2 WHERE id = $3',
        [secret.secret, JSON.stringify(hashedBackupCodes), userId]
      );

      logger.info(`2FA setup initiated for user: ${userId}`);

      return {
        success: true,
        secret: secret.secret,
        qrCodeUrl,
        backupCodes, // Only return once during setup
        message: 'Save these backup codes in a secure location'
      };

    } catch (error) {
      logger.error('2FA setup failed:', error);
      throw error;
    }
  }

  // Enable 2FA
  async enableTwoFactor(userId, token) {
    try {
      // Get user's 2FA secret
      const userResult = await databaseManager.query(
        'SELECT two_factor_secret FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const secret = userResult.rows[0].two_factor_secret;

      // Verify token
      const isValidToken = this.verifyTwoFactorToken(token, secret);

      if (!isValidToken) {
        throw new Error('Invalid verification code');
      }

      // Enable 2FA
      await databaseManager.query(
        'UPDATE users SET two_factor_enabled = TRUE WHERE id = $1',
        [userId]
      );

      logger.info(`2FA enabled for user: ${userId}`);

      return { success: true, message: 'Two-factor authentication enabled successfully' };

    } catch (error) {
      logger.error('2FA enablement failed:', error);
      throw error;
    }
  }

  // Disable 2FA
  async disableTwoFactor(userId, token) {
    try {
      // Get user's 2FA secret
      const userResult = await databaseManager.query(
        'SELECT two_factor_secret, backup_codes FROM users WHERE id = $1 AND two_factor_enabled = TRUE',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('2FA not enabled or user not found');
      }

      const user = userResult.rows[0];

      // Verify token or backup code
      let isValidToken = this.verifyTwoFactorToken(token, user.two_factor_secret);

      if (!isValidToken && user.backup_codes) {
        const backupCodes = JSON.parse(user.backup_codes);
        isValidToken = this.verifyBackupCode(token, backupCodes);

        if (isValidToken) {
          // Remove used backup code
          const updatedCodes = backupCodes.filter(code =>
            !this.verifyBackupCode(token, [code])
          );
          await databaseManager.query(
            'UPDATE users SET backup_codes = $1 WHERE id = $2',
            [JSON.stringify(updatedCodes), userId]
          );
        }
      }

      if (!isValidToken) {
        throw new Error('Invalid verification code or backup code');
      }

      // Disable 2FA
      await databaseManager.query(
        'UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL, backup_codes = NULL WHERE id = $1',
        [userId]
      );

      logger.info(`2FA disabled for user: ${userId}`);

      return { success: true, message: 'Two-factor authentication disabled successfully' };

    } catch (error) {
      logger.error('2FA disablement failed:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();
