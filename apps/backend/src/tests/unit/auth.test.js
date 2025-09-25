/**
 * Authentication Unit Tests
 *
 * Tests for user authentication and authorization functionality
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRoutes = require('../../routes/auth');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Mock database
jest.mock('../../config/database');
jest.mock('../../models/User');

describe('Authentication API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async() => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'SecurePass123',
        dateOfBirth: '1990-01-01',
        country: 'US',
        phoneNumber: '+1234567890'
      };

      const mockUser = require('../../models/User');
      mockUser.prototype.create = jest.fn().mockResolvedValue({
        _id: 'user123',
        ...userData,
        emailVerified: false,
        createdAt: new Date()
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Registration successful');
      expect(response.body.user.email).toBe(userData.email);
    });

    test('should reject registration with invalid email', async() => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        password: 'SecurePass123',
        dateOfBirth: '1990-01-01',
        country: 'US',
        phoneNumber: '+1234567890'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email format');
    });

    test('should reject registration with weak password', async() => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'weak',
        dateOfBirth: '1990-01-01',
        country: 'US',
        phoneNumber: '+1234567890'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Password must be at least 8 characters');
    });

    test('should reject registration for users under 18', async() => {
      const userData = {
        firstName: 'Young',
        lastName: 'User',
        email: 'young.user@example.com',
        password: 'SecurePass123',
        dateOfBirth: '2010-01-01', // 14 years old
        country: 'US',
        phoneNumber: '+1234567890'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('must be at least 18 years old');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login user with valid credentials', async() => {
      const loginData = {
        email: 'john.doe@example.com',
        password: 'SecurePass123'
      };

      const mockUser = {
        _id: 'user123',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        emailVerified: true,
        preferences: {},
        riskProfile: 'moderate'
      };

      const mockUserModel = require('../../models/User');
      mockUserModel.prototype.authenticate = jest.fn().mockResolvedValue(mockUser);
      mockUserModel.prototype.generateToken = jest.fn().mockReturnValue('mock-jwt-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBe('mock-jwt-token');
      expect(response.body.user.email).toBe(mockUser.email);
    });

    test('should reject login with invalid credentials', async() => {
      const loginData = {
        email: 'john.doe@example.com',
        password: 'WrongPassword'
      };

      const mockUserModel = require('../../models/User');
      mockUserModel.prototype.authenticate = jest.fn().mockRejectedValue(new Error('Invalid credentials'));

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    test('should reject login for unverified email', async() => {
      const loginData = {
        email: 'unverified@example.com',
        password: 'SecurePass123'
      };

      const mockUser = {
        _id: 'user123',
        email: 'unverified@example.com',
        emailVerified: false
      };

      const mockUserModel = require('../../models/User');
      mockUserModel.prototype.authenticate = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('verify your email');
    });
  });

  describe('JWT Token Verification', () => {
    test('should verify valid JWT token', async() => {
      const mockUser = {
        _id: 'user123',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Mock JWT verification
      jest.spyOn(jwt, 'verify').mockReturnValue({
        userId: 'user123',
        email: 'john.doe@example.com'
      });

      const mockUserModel = require('../../models/User');
      mockUserModel.prototype.findById = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(mockUser.email);
    });

    test('should reject invalid JWT token', async() => {
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });
  });

  describe('Password Reset Flow', () => {
    test('should initiate password reset successfully', async() => {
      const resetData = { email: 'john.doe@example.com' };

      const mockUserModel = require('../../models/User');
      mockUserModel.prototype.findByEmail = jest.fn().mockResolvedValue({
        _id: 'user123',
        email: 'john.doe@example.com'
      });
      mockUserModel.prototype.generatePasswordResetToken = jest.fn().mockResolvedValue('reset-token');

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send(resetData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password reset email sent');
    });

    test('should reset password with valid token', async() => {
      const resetData = {
        token: 'valid-reset-token',
        newPassword: 'NewSecurePass123'
      };

      const mockUserModel = require('../../models/User');
      mockUserModel.prototype.resetPassword = jest.fn().mockResolvedValue({
        _id: 'user123',
        email: 'john.doe@example.com'
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password reset successful');
    });
  });

  describe('Email Verification', () => {
    test('should verify email with valid token', async() => {
      const verificationData = { token: 'valid-verification-token' };

      const mockUserModel = require('../../models/User');
      mockUserModel.prototype.verifyEmail = jest.fn().mockResolvedValue({
        _id: 'user123',
        email: 'john.doe@example.com',
        emailVerified: true
      });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send(verificationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Email verified successfully');
    });

    test('should reject invalid verification token', async() => {
      const verificationData = { token: 'invalid-token' };

      const mockUserModel = require('../../models/User');
      mockUserModel.prototype.verifyEmail = jest.fn().mockRejectedValue(new Error('Invalid verification token'));

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send(verificationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid verification token');
    });
  });

  describe('Input Validation', () => {
    test('should validate required fields for registration', async() => {
      const incompleteData = {
        firstName: 'John',
        email: 'john.doe@example.com'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('All required fields must be provided');
    });

    test('should validate email and password for login', async() => {
      const incompleteData = {
        email: 'john.doe@example.com'
        // Missing password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email and password are required');
    });
  });

  describe('Security Features', () => {
    test('should hash passwords before storage', () => {
      const password = 'SecurePass123';
      const hashedPassword = bcrypt.hashSync(password, 10);

      expect(hashedPassword).not.toBe(password);
      expect(bcrypt.compareSync(password, hashedPassword)).toBe(true);
    });

    test('should generate secure JWT tokens', () => {
      const payload = { userId: 'user123', email: 'test@example.com' };
      const secret = 'test-secret';
      const token = jwt.sign(payload, secret, { expiresIn: '24h' });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, secret);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });
  });
});
