const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * Enhanced Authentication Middleware
 * Implements JWT verification with refresh tokens, rate limiting, and security headers
 */
class SecurityMiddleware {
  constructor() {
    this.refreshTokens = new Map(); // In production, use Redis
    this.failedAttempts = new Map(); // Track failed login attempts
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    this.maxFailedAttempts = 5;
  }

  /**
   * Enhanced JWT Authentication Middleware
   */
  authMiddleware(req, res, next) {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header',
          code: 'AUTH_MISSING_TOKEN'
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if token is expired
      if (decoded.exp < Date.now() / 1000) {
        return res.status(401).json({
          error: 'Token expired',
          code: 'AUTH_TOKEN_EXPIRED'
        });
      }

      // Check if user is locked out
      if (this.isUserLockedOut(decoded.userId)) {
        return res.status(423).json({
          error: 'Account temporarily locked',
          message: 'Too many failed attempts',
          code: 'AUTH_ACCOUNT_LOCKED'
        });
      }

      req.user = decoded;
      req.token = token;
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token',
          code: 'AUTH_INVALID_TOKEN'
        });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          code: 'AUTH_TOKEN_EXPIRED'
        });
      }

      logger.error('Authentication error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        code: 'AUTH_INTERNAL_ERROR'
      });
    }
  }

  /**
   * Generate JWT tokens (access + refresh)
   */
  generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || []
    };

    const accessToken = jwt.sign(
      { ...payload, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { ...payload, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Store refresh token
    this.refreshTokens.set(refreshToken, {
      userId: user.id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    return { accessToken, refreshToken };
  }

  /**
   * Refresh access token
   */
  async refreshTokenMiddleware(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          error: 'Refresh token required',
          code: 'AUTH_REFRESH_MISSING'
        });
      }

      const tokenData = this.refreshTokens.get(refreshToken);
      if (!tokenData) {
        return res.status(401).json({
          error: 'Invalid refresh token',
          code: 'AUTH_REFRESH_INVALID'
        });
      }

      if (tokenData.expiresAt < new Date()) {
        this.refreshTokens.delete(refreshToken);
        return res.status(401).json({
          error: 'Refresh token expired',
          code: 'AUTH_REFRESH_EXPIRED'
        });
      }

      // Generate new tokens
      const newTokens = this.generateTokens({
        id: tokenData.userId,
        email: tokenData.email,
        role: tokenData.role,
        permissions: tokenData.permissions
      });

      // Remove old refresh token
      this.refreshTokens.delete(refreshToken);

      res.json({
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresIn: 900 // 15 minutes
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'AUTH_REFRESH_ERROR'
      });
    }
  }

  /**
   * Rate limiting for authentication endpoints
   */
  getAuthRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: {
        error: 'Too many authentication attempts',
        message: 'Please try again later',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true,
      handler: (req, res) => {
        this.recordFailedAttempt(req.ip);
        res.status(429).json({
          error: 'Too many authentication attempts',
          message: 'Please try again later',
          retryAfter: '15 minutes'
        });
      }
    });
  }

  /**
   * General API rate limiting
   */
  getApiRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
      message: {
        error: 'Too many requests',
        message: 'Please slow down',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  /**
   * Security headers middleware
   */
  getSecurityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ['\'self\''],
          styleSrc: ['\'self\'', '\'unsafe-inline\''],
          scriptSrc: ['\'self\''],
          imgSrc: ['\'self\'', 'data:', 'https:'],
          connectSrc: ['\'self\''],
          fontSrc: ['\'self\''],
          objectSrc: ['\'none\''],
          mediaSrc: ['\'self\''],
          frameSrc: ['\'none\'']
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }

  /**
   * Input sanitization middleware
   */
  sanitizeInput(req, res, next) {
    const sanitize = (obj) => {
      if (typeof obj === 'string') {
        return obj
          .replace(/[<>]/g, '') // Remove potential HTML tags
          .trim();
      }
      if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          obj[key] = sanitize(obj[key]);
        }
      }
      return obj;
    };

    req.body = sanitize(req.body);
    req.query = sanitize(req.query);
    req.params = sanitize(req.params);
    next();
  }

  /**
   * Check if user is locked out
   */
  isUserLockedOut(userId) {
    const attempts = this.failedAttempts.get(userId);
    if (!attempts) return false;

    if (attempts.count >= this.maxFailedAttempts) {
      const lockoutEnd = attempts.lastAttempt + this.lockoutDuration;
      if (Date.now() < lockoutEnd) {
        return true;
      } else {
        // Lockout expired, reset attempts
        this.failedAttempts.delete(userId);
        return false;
      }
    }
    return false;
  }

  /**
   * Record failed authentication attempt
   */
  recordFailedAttempt(identifier) {
    const attempts = this.failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    this.failedAttempts.set(identifier, attempts);
  }

  /**
   * Clear failed attempts for user
   */
  clearFailedAttempts(identifier) {
    this.failedAttempts.delete(identifier);
  }

  /**
   * Password hashing utility
   */
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Password verification utility
   */
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
}

// Create singleton instance
const securityMiddleware = new SecurityMiddleware();

// Export individual functions for backward compatibility
const { authMiddleware, getAuthRateLimit, getApiRateLimit, getSecurityHeaders, sanitizeInput } = securityMiddleware;

module.exports = {
  authMiddleware,
  getAuthRateLimit,
  getApiRateLimit,
  getSecurityHeaders,
  sanitizeInput,
  securityMiddleware
};
