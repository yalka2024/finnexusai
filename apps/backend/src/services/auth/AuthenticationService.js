/**
 * Authentication Service - Complete Implementation
 * Handles user authentication, authorization, and session management
 *
 * @author FinNexusAI Development Team
 * @version 1.0.0
 * @date 2024-01-15
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const validator = require('validator');
const rateLimit = require('express-rate-limit');

const databaseManager = require('../../config/database');
const emailService = require('../communication/EmailService');
const auditService = require('../audit/AuditService');
const logger = require('../../utils/logger');

class AuthenticationService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
    this.passwordSaltRounds = parseInt(process.env.PASSWORD_SALT_ROUNDS) || 12;
    this.maxLoginAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    this.lockoutDuration = parseInt(process.env.LOCKOUT_DURATION) || 30; // minutes

    // Rate limiting configurations
    this.rateLimiters = {
      login: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts per window
        message: { error: 'Too many login attempts, please try again later' },
        standardHeaders: true,
        legacyHeaders: false
      }),
      register: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 registrations per hour
        message: { error: 'Too many registration attempts, please try again later' },
        standardHeaders: true,
        legacyHeaders: false
      }),
      passwordReset: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 password reset attempts per hour
        message: { error: 'Too many password reset attempts, please try again later' },
        standardHeaders: true,
        legacyHeaders: false
      })
    };

    logger.info('AuthenticationService initialized');
  }

  /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Promise<Object>} Registration result
     */
  async registerUser(userData) {
    try {
      const {
        email,
        username,
        password,
        firstName,
        lastName,
        dateOfBirth,
        phoneNumber,
        countryCode,
        country,
        termsAccepted,
        privacyPolicyAccepted,
        marketingConsent = false
      } = userData;

      // Validate input data
      const validationResult = await this.validateRegistrationData(userData);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid registration data',
          details: validationResult.errors
        };
      }

      // Check if user already exists
      const existingUser = await this.findUserByEmailOrUsername(email, username);
      if (existingUser) {
        return {
          success: false,
          error: 'USER_EXISTS',
          message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
        };
      }

      // Generate password hash and salt
      const salt = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(password + salt, this.passwordSaltRounds);

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user record
      const userId = crypto.randomUUID();
      const userRecord = {
        id: userId,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        password_hash: passwordHash,
        salt: salt,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        phone_number: phoneNumber,
        country_code: countryCode,
        country: country,
        email_verification_token: emailVerificationToken,
        email_verification_expires: emailVerificationExpires,
        terms_accepted_at: termsAccepted ? new Date() : null,
        privacy_policy_accepted_at: privacyPolicyAccepted ? new Date() : null,
        marketing_consent: marketingConsent,
        status: 'active',
        email_verified: false,
        phone_verified: false,
        two_factor_enabled: false,
        failed_login_attempts: 0,
        created_at: new Date(),
        updated_at: new Date(),
        last_activity_at: new Date()
      };

      // Insert user into database
      const query = `
                INSERT INTO users (
                    id, email, username, password_hash, salt, first_name, last_name,
                    date_of_birth, phone_number, country_code, country,
                    email_verification_token, email_verification_expires,
                    terms_accepted_at, privacy_policy_accepted_at, marketing_consent,
                    status, email_verified, phone_verified, two_factor_enabled,
                    failed_login_attempts, created_at, updated_at, last_activity_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
                RETURNING id, email, username, first_name, last_name, status, created_at
            `;

      const values = [
        userRecord.id, userRecord.email, userRecord.username, userRecord.password_hash,
        userRecord.salt, userRecord.first_name, userRecord.last_name, userRecord.date_of_birth,
        userRecord.phone_number, userRecord.country_code, userRecord.country,
        userRecord.email_verification_token, userRecord.email_verification_expires,
        userRecord.terms_accepted_at, userRecord.privacy_policy_accepted_at, userRecord.marketing_consent,
        userRecord.status, userRecord.email_verified, userRecord.phone_verified, userRecord.two_factor_enabled,
        userRecord.failed_login_attempts, userRecord.created_at, userRecord.updated_at, userRecord.last_activity_at
      ];

      const result = await databaseManager.query(query, values);
      const newUser = result.rows[0];

      // Send email verification
      await this.sendEmailVerification(email, emailVerificationToken, firstName);

      // Log registration event
      await auditService.logEvent({
        userId: newUser.id,
        event: 'USER_REGISTERED',
        details: {
          email: newUser.email,
          username: newUser.username,
          registrationMethod: 'email'
        },
        ipAddress: userData.ipAddress,
        userAgent: userData.userAgent
      });

      logger.info(`User registered successfully: ${newUser.email}`);

      return {
        success: true,
        message: 'User registered successfully. Please check your email for verification.',
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          status: newUser.status,
          emailVerified: false,
          createdAt: newUser.created_at
        }
      };

    } catch (error) {
      logger.error('User registration failed:', error);
      return {
        success: false,
        error: 'REGISTRATION_FAILED',
        message: 'Registration failed due to server error'
      };
    }
  }

  /**
     * Authenticate user login
     * @param {Object} credentials - Login credentials
     * @returns {Promise<Object>} Authentication result
     */
  async authenticateUser(credentials) {
    try {
      const { email, password, twoFactorCode, rememberMe = false } = credentials;

      // Validate input
      if (!email || !password) {
        return {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Email and password are required'
        };
      }

      // Find user by email
      const user = await this.findUserByEmail(email.toLowerCase());
      if (!user) {
        return {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        };
      }

      // Check if account is locked
      if (user.locked_until && new Date() < user.locked_until) {
        const lockoutMinutes = Math.ceil((user.locked_until - new Date()) / (1000 * 60));
        return {
          success: false,
          error: 'ACCOUNT_LOCKED',
          message: `Account is locked. Please try again in ${lockoutMinutes} minutes.`
        };
      }

      // Check if account is active
      if (user.status !== 'active') {
        return {
          success: false,
          error: 'ACCOUNT_INACTIVE',
          message: 'Account is not active. Please contact support.'
        };
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password + user.salt, user.password_hash);
      if (!passwordValid) {
        await this.handleFailedLogin(user.id);
        return {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        };
      }

      // Check 2FA if enabled
      if (user.two_factor_enabled) {
        if (!twoFactorCode) {
          return {
            success: false,
            error: 'TWO_FACTOR_REQUIRED',
            message: 'Two-factor authentication code is required',
            requiresTwoFactor: true
          };
        }

        const twoFactorValid = this.verifyTwoFactorCode(user.two_factor_secret, twoFactorCode);
        if (!twoFactorValid) {
          await this.handleFailedLogin(user.id);
          return {
            success: false,
            error: 'INVALID_TWO_FACTOR',
            message: 'Invalid two-factor authentication code'
          };
        }
      }

      // Reset failed login attempts
      await this.resetFailedLoginAttempts(user.id);

      // Update last login
      await this.updateLastLogin(user.id);

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        username: user.username,
        roles: await this.getUserRoles(user.id)
      };

      const accessToken = jwt.sign(tokenPayload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn
      });

      const refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        this.jwtSecret,
        { expiresIn: this.refreshTokenExpiresIn }
      );

      // Store refresh token
      await this.storeRefreshToken(user.id, refreshToken, rememberMe);

      // Log successful login
      await auditService.logEvent({
        userId: user.id,
        event: 'USER_LOGIN_SUCCESS',
        details: {
          email: user.email,
          loginMethod: 'email',
          twoFactorUsed: user.two_factor_enabled
        },
        ipAddress: credentials.ipAddress,
        userAgent: credentials.userAgent
      });

      logger.info(`User logged in successfully: ${user.email}`);

      return {
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          emailVerified: user.email_verified,
          phoneVerified: user.phone_verified,
          twoFactorEnabled: user.two_factor_enabled,
          kycStatus: user.kyc_status,
          kycLevel: user.kyc_level,
          status: user.status,
          lastLoginAt: new Date()
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: this.jwtExpiresIn
        }
      };

    } catch (error) {
      logger.error('User authentication failed:', error);
      return {
        success: false,
        error: 'AUTHENTICATION_FAILED',
        message: 'Authentication failed due to server error'
      };
    }
  }

  /**
     * Refresh access token
     * @param {string} refreshToken - Refresh token
     * @returns {Promise<Object>} Token refresh result
     */
  async refreshAccessToken(refreshToken) {
    try {
      if (!refreshToken) {
        return {
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Refresh token is required'
        };
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.jwtSecret);
      if (decoded.type !== 'refresh') {
        return {
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Invalid refresh token'
        };
      }

      // Check if refresh token exists in database
      const tokenExists = await this.checkRefreshToken(decoded.userId, refreshToken);
      if (!tokenExists) {
        return {
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Refresh token not found or expired'
        };
      }

      // Get user information
      const user = await this.findUserById(decoded.userId);
      if (!user || user.status !== 'active') {
        return {
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'User not found or inactive'
        };
      }

      // Generate new access token
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        username: user.username,
        roles: await this.getUserRoles(user.id)
      };

      const newAccessToken = jwt.sign(tokenPayload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn
      });

      logger.info(`Access token refreshed for user: ${user.email}`);

      return {
        success: true,
        message: 'Token refreshed successfully',
        tokens: {
          accessToken: newAccessToken,
          expiresIn: this.jwtExpiresIn
        }
      };

    } catch (error) {
      logger.error('Token refresh failed:', error);
      return {
        success: false,
        error: 'TOKEN_REFRESH_FAILED',
        message: 'Token refresh failed'
      };
    }
  }

  /**
     * Logout user and invalidate tokens
     * @param {string} userId - User ID
     * @param {string} refreshToken - Refresh token to invalidate
     * @returns {Promise<Object>} Logout result
     */
  async logoutUser(userId, refreshToken) {
    try {
      // Invalidate refresh token
      if (refreshToken) {
        await this.invalidateRefreshToken(userId, refreshToken);
      }

      // Log logout event
      await auditService.logEvent({
        userId: userId,
        event: 'USER_LOGOUT',
        details: {
          logoutMethod: 'manual'
        }
      });

      logger.info(`User logged out: ${userId}`);

      return {
        success: true,
        message: 'Logged out successfully'
      };

    } catch (error) {
      logger.error('User logout failed:', error);
      return {
        success: false,
        error: 'LOGOUT_FAILED',
        message: 'Logout failed'
      };
    }
  }

  /**
     * Verify email address
     * @param {string} token - Email verification token
     * @returns {Promise<Object>} Verification result
     */
  async verifyEmail(token) {
    try {
      if (!token) {
        return {
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Verification token is required'
        };
      }

      // Find user by verification token
      const query = `
                SELECT id, email, email_verification_expires, email_verified
                FROM users 
                WHERE email_verification_token = $1
            `;

      const result = await databaseManager.query(query, [token]);
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Invalid verification token'
        };
      }

      const user = result.rows[0];

      // Check if token is expired
      if (new Date() > user.email_verification_expires) {
        return {
          success: false,
          error: 'TOKEN_EXPIRED',
          message: 'Verification token has expired'
        };
      }

      // Check if already verified
      if (user.email_verified) {
        return {
          success: false,
          error: 'ALREADY_VERIFIED',
          message: 'Email is already verified'
        };
      }

      // Update user verification status
      const updateQuery = `
                UPDATE users 
                SET email_verified = true, 
                    email_verification_token = NULL,
                    email_verification_expires = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING email, first_name
            `;

      const updateResult = await databaseManager.query(updateQuery, [user.id]);
      const updatedUser = updateResult.rows[0];

      // Log verification event
      await auditService.logEvent({
        userId: user.id,
        event: 'EMAIL_VERIFIED',
        details: {
          email: updatedUser.email
        }
      });

      logger.info(`Email verified successfully: ${updatedUser.email}`);

      return {
        success: true,
        message: 'Email verified successfully',
        user: {
          email: updatedUser.email,
          firstName: updatedUser.first_name
        }
      };

    } catch (error) {
      logger.error('Email verification failed:', error);
      return {
        success: false,
        error: 'VERIFICATION_FAILED',
        message: 'Email verification failed'
      };
    }
  }

  /**
     * Setup two-factor authentication
     * @param {string} userId - User ID
     * @returns {Promise<Object>} 2FA setup result
     */
  async setupTwoFactor(userId) {
    try {
      // Generate 2FA secret
      const secret = speakeasy.generateSecret({
        name: `FinNexusAI (${userId})`,
        issuer: 'FinNexusAI',
        length: 32
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store secret and backup codes (encrypted)
      const encryptedSecret = this.encrypt(secret.base32);
      const encryptedBackupCodes = backupCodes.map(code => this.encrypt(code));

      const query = `
                UPDATE users 
                SET two_factor_secret = $1, 
                    backup_codes = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING email, two_factor_enabled
            `;

      await databaseManager.query(query, [encryptedSecret, encryptedBackupCodes, userId]);

      // Log 2FA setup event
      await auditService.logEvent({
        userId: userId,
        event: 'TWO_FACTOR_SETUP',
        details: {
          setupMethod: 'TOTP'
        }
      });

      logger.info(`2FA setup initiated for user: ${userId}`);

      return {
        success: true,
        message: 'Two-factor authentication setup initiated',
        secret: secret.base32,
        qrCodeUrl: qrCodeUrl,
        backupCodes: backupCodes,
        manualEntryKey: secret.base32
      };

    } catch (error) {
      logger.error('2FA setup failed:', error);
      return {
        success: false,
        error: 'TWO_FACTOR_SETUP_FAILED',
        message: 'Two-factor authentication setup failed'
      };
    }
  }

  /**
     * Enable two-factor authentication
     * @param {string} userId - User ID
     * @param {string} verificationCode - Verification code
     * @returns {Promise<Object>} 2FA enable result
     */
  async enableTwoFactor(userId, verificationCode) {
    try {
      // Get user's 2FA secret
      const user = await this.findUserById(userId);
      if (!user || !user.two_factor_secret) {
        return {
          success: false,
          error: 'TWO_FACTOR_NOT_SETUP',
          message: 'Two-factor authentication is not set up'
        };
      }

      // Verify the code
      const decryptedSecret = this.decrypt(user.two_factor_secret);
      const isValid = this.verifyTwoFactorCode(decryptedSecret, verificationCode);

      if (!isValid) {
        return {
          success: false,
          error: 'INVALID_VERIFICATION_CODE',
          message: 'Invalid verification code'
        };
      }

      // Enable 2FA
      const query = `
                UPDATE users 
                SET two_factor_enabled = true, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING email, two_factor_enabled
            `;

      await databaseManager.query(query, [userId]);

      // Log 2FA enable event
      await auditService.logEvent({
        userId: userId,
        event: 'TWO_FACTOR_ENABLED',
        details: {
          enableMethod: 'TOTP'
        }
      });

      logger.info(`2FA enabled for user: ${userId}`);

      return {
        success: true,
        message: 'Two-factor authentication enabled successfully'
      };

    } catch (error) {
      logger.error('2FA enable failed:', error);
      return {
        success: false,
        error: 'TWO_FACTOR_ENABLE_FAILED',
        message: 'Failed to enable two-factor authentication'
      };
    }
  }

  /**
     * Disable two-factor authentication
     * @param {string} userId - User ID
     * @param {string} verificationCode - Verification code or backup code
     * @returns {Promise<Object>} 2FA disable result
     */
  async disableTwoFactor(userId, verificationCode) {
    try {
      // Get user's 2FA information
      const user = await this.findUserById(userId);
      if (!user || !user.two_factor_enabled) {
        return {
          success: false,
          error: 'TWO_FACTOR_NOT_ENABLED',
          message: 'Two-factor authentication is not enabled'
        };
      }

      // Verify the code (either TOTP or backup code)
      let isValid = false;

      if (user.two_factor_secret) {
        const decryptedSecret = this.decrypt(user.two_factor_secret);
        isValid = this.verifyTwoFactorCode(decryptedSecret, verificationCode);
      }

      if (!isValid && user.backup_codes) {
        // Check backup codes
        const decryptedBackupCodes = user.backup_codes.map(code => this.decrypt(code));
        if (decryptedBackupCodes.includes(verificationCode)) {
          isValid = true;
          // Remove used backup code
          const updatedBackupCodes = user.backup_codes.filter(code =>
            this.decrypt(code) !== verificationCode
          );
          await this.updateBackupCodes(userId, updatedBackupCodes);
        }
      }

      if (!isValid) {
        return {
          success: false,
          error: 'INVALID_VERIFICATION_CODE',
          message: 'Invalid verification code or backup code'
        };
      }

      // Disable 2FA
      const query = `
                UPDATE users 
                SET two_factor_enabled = false, 
                    two_factor_secret = NULL,
                    backup_codes = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING email
            `;

      await databaseManager.query(query, [userId]);

      // Log 2FA disable event
      await auditService.logEvent({
        userId: userId,
        event: 'TWO_FACTOR_DISABLED',
        details: {
          disableMethod: 'manual'
        }
      });

      logger.info(`2FA disabled for user: ${userId}`);

      return {
        success: true,
        message: 'Two-factor authentication disabled successfully'
      };

    } catch (error) {
      logger.error('2FA disable failed:', error);
      return {
        success: false,
        error: 'TWO_FACTOR_DISABLE_FAILED',
        message: 'Failed to disable two-factor authentication'
      };
    }
  }

  /**
     * Request password reset
     * @param {string} email - User email
     * @returns {Promise<Object>} Password reset request result
     */
  async requestPasswordReset(email) {
    try {
      if (!email || !validator.isEmail(email)) {
        return {
          success: false,
          error: 'INVALID_EMAIL',
          message: 'Valid email address is required'
        };
      }

      // Find user by email
      const user = await this.findUserByEmail(email.toLowerCase());
      if (!user) {
        // Don't reveal if email exists or not
        return {
          success: true,
          message: 'If the email exists, a password reset link has been sent'
        };
      }

      // Generate password reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token
      const query = `
                UPDATE users 
                SET password_reset_token = $1, 
                    password_reset_expires = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
            `;

      await databaseManager.query(query, [resetToken, resetExpires, user.id]);

      // Send password reset email
      await this.sendPasswordResetEmail(user.email, resetToken, user.first_name);

      // Log password reset request
      await auditService.logEvent({
        userId: user.id,
        event: 'PASSWORD_RESET_REQUESTED',
        details: {
          email: user.email
        }
      });

      logger.info(`Password reset requested for: ${user.email}`);

      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      };

    } catch (error) {
      logger.error('Password reset request failed:', error);
      return {
        success: false,
        error: 'PASSWORD_RESET_FAILED',
        message: 'Password reset request failed'
      };
    }
  }

  /**
     * Reset password with token
     * @param {string} token - Password reset token
     * @param {string} newPassword - New password
     * @returns {Promise<Object>} Password reset result
     */
  async resetPassword(token, newPassword) {
    try {
      if (!token || !newPassword) {
        return {
          success: false,
          error: 'INVALID_INPUT',
          message: 'Reset token and new password are required'
        };
      }

      // Validate password strength
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: 'WEAK_PASSWORD',
          message: 'Password does not meet requirements',
          details: passwordValidation.errors
        };
      }

      // Find user by reset token
      const query = `
                SELECT id, email, password_reset_expires
                FROM users 
                WHERE password_reset_token = $1
            `;

      const result = await databaseManager.query(query, [token]);
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token'
        };
      }

      const user = result.rows[0];

      // Check if token is expired
      if (new Date() > user.password_reset_expires) {
        return {
          success: false,
          error: 'TOKEN_EXPIRED',
          message: 'Reset token has expired'
        };
      }

      // Generate new password hash
      const salt = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(newPassword + salt, this.passwordSaltRounds);

      // Update password and clear reset token
      const updateQuery = `
                UPDATE users 
                SET password_hash = $1, 
                    salt = $2,
                    password_reset_token = NULL,
                    password_reset_expires = NULL,
                    failed_login_attempts = 0,
                    locked_until = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING email, first_name
            `;

      const updateResult = await databaseManager.query(updateQuery, [passwordHash, salt, user.id]);
      const updatedUser = updateResult.rows[0];

      // Log password reset
      await auditService.logEvent({
        userId: user.id,
        event: 'PASSWORD_RESET_COMPLETED',
        details: {
          email: updatedUser.email
        }
      });

      logger.info(`Password reset completed for: ${updatedUser.email}`);

      return {
        success: true,
        message: 'Password reset successfully',
        user: {
          email: updatedUser.email,
          firstName: updatedUser.first_name
        }
      };

    } catch (error) {
      logger.error('Password reset failed:', error);
      return {
        success: false,
        error: 'PASSWORD_RESET_FAILED',
        message: 'Password reset failed'
      };
    }
  }

  // Helper Methods

  /**
     * Validate registration data
     * @param {Object} userData - User registration data
     * @returns {Promise<Object>} Validation result
     */
  async validateRegistrationData(userData) {
    const errors = [];

    // Email validation
    if (!userData.email || !validator.isEmail(userData.email)) {
      errors.push('Valid email address is required');
    }

    // Username validation
    if (!userData.username || !validator.isLength(userData.username, { min: 3, max: 50 })) {
      errors.push('Username must be between 3 and 50 characters');
    }
    if (userData.username && !validator.isAlphanumeric(userData.username, 'en-US', { ignore: '_-' })) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens');
    }

    // Password validation
    const passwordValidation = this.validatePassword(userData.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }

    // Name validation
    if (!userData.firstName || !validator.isLength(userData.firstName, { min: 1, max: 100 })) {
      errors.push('First name is required');
    }
    if (!userData.lastName || !validator.isLength(userData.lastName, { min: 1, max: 100 })) {
      errors.push('Last name is required');
    }

    // Terms acceptance
    if (!userData.termsAccepted) {
      errors.push('Terms of service must be accepted');
    }
    if (!userData.privacyPolicyAccepted) {
      errors.push('Privacy policy must be accepted');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {Object} Validation result
     */
  validatePassword(password) {
    const errors = [];

    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common passwords
    const commonPasswords = ['password', '123456', 'password123', 'admin', 'qwerty'];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
     * Find user by email or username
     * @param {string} email - Email address
     * @param {string} username - Username
     * @returns {Promise<Object|null>} User object or null
     */
  async findUserByEmailOrUsername(email, username) {
    const query = `
            SELECT id, email, username, status
            FROM users 
            WHERE email = $1 OR username = $2
            LIMIT 1
        `;

    const result = await databaseManager.query(query, [email.toLowerCase(), username.toLowerCase()]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
     * Find user by email
     * @param {string} email - Email address
     * @returns {Promise<Object|null>} User object or null
     */
  async findUserByEmail(email) {
    const query = `
            SELECT * FROM users 
            WHERE email = $1
            LIMIT 1
        `;

    const result = await databaseManager.query(query, [email.toLowerCase()]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
     * Find user by ID
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User object or null
     */
  async findUserById(userId) {
    const query = `
            SELECT * FROM users 
            WHERE id = $1
            LIMIT 1
        `;

    const result = await databaseManager.query(query, [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
     * Handle failed login attempt
     * @param {string} userId - User ID
     * @returns {Promise<void>}
     */
  async handleFailedLogin(userId) {
    const query = `
            UPDATE users 
            SET failed_login_attempts = failed_login_attempts + 1,
                last_failed_login = CURRENT_TIMESTAMP,
                locked_until = CASE 
                    WHEN failed_login_attempts + 1 >= $2 
                    THEN CURRENT_TIMESTAMP + INTERVAL '${this.lockoutDuration} minutes'
                    ELSE locked_until
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `;

    await databaseManager.query(query, [userId, this.maxLoginAttempts]);
  }

  /**
     * Reset failed login attempts
     * @param {string} userId - User ID
     * @returns {Promise<void>}
     */
  async resetFailedLoginAttempts(userId) {
    const query = `
            UPDATE users 
            SET failed_login_attempts = 0,
                last_failed_login = NULL,
                locked_until = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `;

    await databaseManager.query(query, [userId]);
  }

  /**
     * Update last login timestamp
     * @param {string} userId - User ID
     * @returns {Promise<void>}
     */
  async updateLastLogin(userId) {
    const query = `
            UPDATE users 
            SET last_login_at = CURRENT_TIMESTAMP,
                last_activity_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `;

    await databaseManager.query(query, [userId]);
  }

  /**
     * Get user roles
     * @param {string} userId - User ID
     * @returns {Promise<Array>} User roles
     */
  async getUserRoles(userId) {
    // This would typically query a roles table
    // For now, return default roles based on user status
    const user = await this.findUserById(userId);
    if (!user) return ['user'];

    const roles = ['user'];

    if (user.kyc_status === 'approved' && user.kyc_level >= 2) {
      roles.push('verified');
    }

    if (user.kyc_status === 'approved' && user.kyc_level >= 3) {
      roles.push('premium');
    }

    return roles;
  }

  /**
     * Store refresh token
     * @param {string} userId - User ID
     * @param {string} refreshToken - Refresh token
     * @param {boolean} rememberMe - Remember me flag
     * @returns {Promise<void>}
     */
  async storeRefreshToken(userId, refreshToken, rememberMe) {
    const expiresAt = new Date();
    if (rememberMe) {
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    } else {
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    }

    const query = `
            INSERT INTO refresh_tokens (user_id, token, expires_at, created_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        `;

    await databaseManager.query(query, [userId, refreshToken, expiresAt]);
  }

  /**
     * Check if refresh token exists
     * @param {string} userId - User ID
     * @param {string} refreshToken - Refresh token
     * @returns {Promise<boolean>} Token exists
     */
  async checkRefreshToken(userId, refreshToken) {
    const query = `
            SELECT id FROM refresh_tokens 
            WHERE user_id = $1 AND token = $2 AND expires_at > CURRENT_TIMESTAMP
            LIMIT 1
        `;

    const result = await databaseManager.query(query, [userId, refreshToken]);
    return result.rows.length > 0;
  }

  /**
     * Invalidate refresh token
     * @param {string} userId - User ID
     * @param {string} refreshToken - Refresh token
     * @returns {Promise<void>}
     */
  async invalidateRefreshToken(userId, refreshToken) {
    const query = `
            DELETE FROM refresh_tokens 
            WHERE user_id = $1 AND token = $2
        `;

    await databaseManager.query(query, [userId, refreshToken]);
  }

  /**
     * Verify two-factor authentication code
     * @param {string} secret - 2FA secret
     * @param {string} code - Verification code
     * @returns {boolean} Code is valid
     */
  verifyTwoFactorCode(secret, code) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: code,
      window: 2 // Allow 2 time steps (60 seconds) of variance
    });
  }

  /**
     * Generate backup codes
     * @returns {Array<string>} Backup codes
     */
  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
     * Update backup codes
     * @param {string} userId - User ID
     * @param {Array<string>} backupCodes - Backup codes
     * @returns {Promise<void>}
     */
  async updateBackupCodes(userId, backupCodes) {
    const encryptedCodes = backupCodes.map(code => this.encrypt(code));
    const query = `
            UPDATE users 
            SET backup_codes = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `;

    await databaseManager.query(query, [encryptedCodes, userId]);
  }

  /**
     * Encrypt data
     * @param {string} data - Data to encrypt
     * @returns {string} Encrypted data
     */
  encrypt(data) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.jwtSecret, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return encrypted;
  }

  /**
     * Decrypt data
     * @param {string} encryptedData - Encrypted data
     * @returns {string} Decrypted data
     */
  decrypt(encryptedData) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.jwtSecret, 'salt', 32);
    const decipher = crypto.createDecipher(algorithm, key);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
     * Send email verification
     * @param {string} email - Email address
     * @param {string} token - Verification token
     * @param {string} firstName - User's first name
     * @returns {Promise<void>}
     */
  async sendEmailVerification(email, token, firstName) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    await emailService.sendEmail({
      to: email,
      subject: 'Verify Your Email - FinNexusAI',
      template: 'email-verification',
      data: {
        firstName: firstName,
        verificationUrl: verificationUrl
      }
    });
  }

  /**
     * Send password reset email
     * @param {string} email - Email address
     * @param {string} token - Reset token
     * @param {string} firstName - User's first name
     * @returns {Promise<void>}
     */
  async sendPasswordResetEmail(email, token, firstName) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await emailService.sendEmail({
      to: email,
      subject: 'Reset Your Password - FinNexusAI',
      template: 'password-reset',
      data: {
        firstName: firstName,
        resetUrl: resetUrl
      }
    });
  }

  /**
     * Get rate limiters
     * @returns {Object} Rate limiters
     */
  getRateLimiters() {
    return this.rateLimiters;
  }
}

module.exports = new AuthenticationService();
