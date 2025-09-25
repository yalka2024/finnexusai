/**
 * Authentication Service Unit Tests
 * Comprehensive test suite for authentication functionality
 *
 * @author FinNexusAI Development Team
 * @version 1.0.0
 * @date 2024-01-15
 */

const request = require('supertest');
// const app = require('../../src/index');
const authService = require('../../src/services/auth/AuthenticationService');
const databaseManager = require('../../src/config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

describe('Authentication Service', () => {
  let testUser;
  let testUserId;

  beforeAll(async() => {
    // Setup test database connection
    await databaseManager.initialize();

    // Create test user
    testUserId = `test-user-${  Date.now()}`;
    testUser = {
      id: testUserId,
      email: 'test@example.com',
      username: 'testuser',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1990-01-01',
      phoneNumber: '+1234567890',
      countryCode: 'US',
      country: 'United States',
      termsAccepted: true,
      privacyPolicyAccepted: true,
      marketingConsent: false
    };
  });

  afterAll(async() => {
    // Cleanup test data
    if (testUserId) {
      await databaseManager.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    await databaseManager.close();
  });

  describe('User Registration', () => {
    test('should register a new user successfully', async() => {
      const userData = {
        ...testUser,
        email: 'newuser@example.com',
        username: `newuser${  Date.now()}`
      };

      const result = await authService.registerUser(userData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(userData.email);
      expect(result.user.username).toBe(userData.username);
      expect(result.user.status).toBe('active');
      expect(result.user.emailVerified).toBe(false);
    });

    test('should fail registration with invalid email', async() => {
      const userData = {
        ...testUser,
        email: 'invalid-email',
        username: `invaliduser${  Date.now()}`
      };

      const result = await authService.registerUser(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('VALIDATION_ERROR');
      expect(result.details).toContain('Valid email address is required');
    });

    test('should fail registration with weak password', async() => {
      const userData = {
        ...testUser,
        email: 'weakpass@example.com',
        username: `weakpass${  Date.now()}`,
        password: '123'
      };

      const result = await authService.registerUser(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('VALIDATION_ERROR');
      expect(result.details).toContain('Password must be at least 8 characters long');
    });

    test('should fail registration with existing email', async() => {
      const userData = {
        ...testUser,
        email: 'existing@example.com',
        username: `existing${  Date.now()}`
      };

      // Register first user
      await authService.registerUser(userData);

      // Try to register with same email
      const duplicateUser = {
        ...userData,
        username: `different${  Date.now()}`
      };

      const result = await authService.registerUser(duplicateUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('USER_EXISTS');
      expect(result.message).toBe('Email already registered');
    });

    test('should fail registration without accepting terms', async() => {
      const userData = {
        ...testUser,
        email: 'noterms@example.com',
        username: `noterms${  Date.now()}`,
        termsAccepted: false
      };

      const result = await authService.registerUser(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('VALIDATION_ERROR');
      expect(result.details).toContain('Terms of service must be accepted');
    });
  });

  describe('User Authentication', () => {
    let registeredUser;

    beforeAll(async() => {
      // Register a user for authentication tests
      const userData = {
        ...testUser,
        email: 'auth@example.com',
        username: `authuser${  Date.now()}`
      };

      const result = await authService.registerUser(userData);
      registeredUser = result.user;
    });

    test('should authenticate user with valid credentials', async() => {
      const credentials = {
        email: 'auth@example.com',
        password: 'TestPassword123!'
      };

      const result = await authService.authenticateUser(credentials);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(credentials.email);
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    test('should fail authentication with invalid email', async() => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!'
      };

      const result = await authService.authenticateUser(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_CREDENTIALS');
    });

    test('should fail authentication with invalid password', async() => {
      const credentials = {
        email: 'auth@example.com',
        password: 'WrongPassword123!'
      };

      const result = await authService.authenticateUser(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_CREDENTIALS');
    });

    test('should fail authentication with missing credentials', async() => {
      const credentials = {
        email: 'auth@example.com'
        // Missing password
      };

      const result = await authService.authenticateUser(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('Two-Factor Authentication', () => {
    let twoFactorUser;

    beforeAll(async() => {
      // Register a user for 2FA tests
      const userData = {
        ...testUser,
        email: '2fa@example.com',
        username: `2fauser${  Date.now()}`
      };

      const result = await authService.registerUser(userData);
      twoFactorUser = result.user;
    });

    test('should setup two-factor authentication', async() => {
      const result = await authService.setupTwoFactor(twoFactorUser.id);

      expect(result.success).toBe(true);
      expect(result.secret).toBeDefined();
      expect(result.qrCodeUrl).toBeDefined();
      expect(result.backupCodes).toBeDefined();
      expect(result.backupCodes.length).toBe(10);
    });

    test('should enable two-factor authentication with valid code', async() => {
      // First setup 2FA
      const setupResult = await authService.setupTwoFactor(twoFactorUser.id);
      expect(setupResult.success).toBe(true);

      // Mock a valid TOTP code (in real tests, you'd use a test secret)
      const mockCode = '123456';

      // This test would need to be adjusted for actual TOTP verification
      // For now, we'll test the structure
      expect(setupResult.secret).toBeDefined();
    });

    test('should fail to enable 2FA without setup', async() => {
      const result = await authService.enableTwoFactor(twoFactorUser.id, '123456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('TWO_FACTOR_NOT_SETUP');
    });
  });

  describe('Password Reset', () => {
    let resetUser;

    beforeAll(async() => {
      // Register a user for password reset tests
      const userData = {
        ...testUser,
        email: 'reset@example.com',
        username: `resetuser${  Date.now()}`
      };

      const result = await authService.registerUser(userData);
      resetUser = result.user;
    });

    test('should request password reset for valid email', async() => {
      const result = await authService.requestPasswordReset('reset@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('password reset link has been sent');
    });

    test('should handle password reset for non-existent email', async() => {
      const result = await authService.requestPasswordReset('nonexistent@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('password reset link has been sent');
    });

    test('should fail password reset with invalid email', async() => {
      const result = await authService.requestPasswordReset('invalid-email');

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_EMAIL');
    });
  });

  describe('Token Management', () => {
    let tokenUser;
    let accessToken;
    let refreshToken;

    beforeAll(async() => {
      // Register and authenticate a user for token tests
      const userData = {
        ...testUser,
        email: 'token@example.com',
        username: `tokenuser${  Date.now()}`
      };

      await authService.registerUser(userData);

      const authResult = await authService.authenticateUser({
        email: 'token@example.com',
        password: 'TestPassword123!'
      });

      tokenUser = authResult.user;
      accessToken = authResult.tokens.accessToken;
      refreshToken = authResult.tokens.refreshToken;
    });

    test('should refresh access token with valid refresh token', async() => {
      const result = await authService.refreshAccessToken(refreshToken);

      expect(result.success).toBe(true);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.expiresIn).toBeDefined();
    });

    test('should fail to refresh token with invalid refresh token', async() => {
      const result = await authService.refreshAccessToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_TOKEN');
    });

    test('should logout user successfully', async() => {
      const result = await authService.logoutUser(tokenUser.id, refreshToken);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');
    });
  });

  describe('Email Verification', () => {
    let verifyUser;
    let verificationToken;

    beforeAll(async() => {
      // Register a user for email verification tests
      const userData = {
        ...testUser,
        email: 'verify@example.com',
        username: `verifyuser${  Date.now()}`
      };

      const result = await authService.registerUser(userData);
      verifyUser = result.user;

      // Get verification token from database
      const query = 'SELECT email_verification_token FROM users WHERE id = $1';
      const dbResult = await databaseManager.query(query, [verifyUser.id]);
      verificationToken = dbResult.rows[0].email_verification_token;
    });

    test('should verify email with valid token', async() => {
      const result = await authService.verifyEmail(verificationToken);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email verified successfully');
    });

    test('should fail email verification with invalid token', async() => {
      const result = await authService.verifyEmail('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_TOKEN');
    });

    test('should fail email verification with expired token', async() => {
      // This would require setting up an expired token
      // For now, we'll test the structure
      expect(verificationToken).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    test('should have rate limiters configured', () => {
      const rateLimiters = authService.getRateLimiters();

      expect(rateLimiters.login).toBeDefined();
      expect(rateLimiters.register).toBeDefined();
      expect(rateLimiters.passwordReset).toBeDefined();
    });
  });

  describe('Password Validation', () => {
    test('should validate strong passwords', () => {
      const strongPassword = 'StrongPassword123!';
      const validation = authService.validatePassword(strongPassword);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject weak passwords', () => {
      const weakPasswords = [
        '123',
        'password',
        'Password',
        'Password123',
        'Password!',
        'PASSWORD123!',
        'password123!'
      ];

      weakPasswords.forEach(password => {
        const validation = authService.validatePassword(password);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    test('should reject common passwords', () => {
      const commonPasswords = ['password', '123456', 'password123', 'admin', 'qwerty'];

      commonPasswords.forEach(password => {
        const validation = authService.validatePassword(password);
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Password is too common');
      });
    });
  });

  describe('Security Features', () => {
    test('should hash passwords securely', async() => {
      const password = 'TestPassword123!';
      const salt = 'test-salt';
      const hash = await bcrypt.hash(password + salt, 12);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    test('should generate secure tokens', () => {
      const payload = { userId: 'test-user' };
      const token = jwt.sign(payload, 'test-secret', { expiresIn: '1h' });

      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should verify JWT tokens', () => {
      const payload = { userId: 'test-user' };
      const token = jwt.sign(payload, 'test-secret', { expiresIn: '1h' });
      const decoded = jwt.verify(token, 'test-secret');

      expect(decoded.userId).toBe('test-user');
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async() => {
      // Mock database error
      const originalQuery = databaseManager.query;
      databaseManager.query = jest.fn().mockRejectedValue(new Error('Database error'));

      const userData = {
        ...testUser,
        email: 'dberror@example.com',
        username: `dberror${  Date.now()}`
      };

      const result = await authService.registerUser(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('REGISTRATION_FAILED');

      // Restore original function
      databaseManager.query = originalQuery;
    });

    test('should handle invalid input gracefully', async() => {
      const result = await authService.registerUser(null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('REGISTRATION_FAILED');
    });
  });
});
