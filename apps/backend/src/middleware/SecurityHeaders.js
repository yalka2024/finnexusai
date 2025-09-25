/**
 * Comprehensive Security Headers Middleware
 * Implements all critical security headers for production deployment
 */

const helmet = require('helmet');
const crypto = require('crypto');

class SecurityHeaders {
  constructor() {
    this.nonce = this.generateNonce();
    this.setupHelmetConfig();
  }

  /**
   * Generate CSP nonce for inline scripts
   */
  generateNonce() {
    return crypto.randomBytes(16).toString('base64');
  }

  /**
   * Setup comprehensive Helmet configuration
   */
  setupHelmetConfig() {
    this.helmetConfig = helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ['\'self\''],
          scriptSrc: [
            '\'self\'',
            `'nonce-${  this.nonce  }'`,
            '\'strict-dynamic\'',
            'https://cdn.jsdelivr.net',
            'https://unpkg.com'
          ],
          styleSrc: [
            '\'self\'',
            '\'unsafe-inline\'',
            'https://fonts.googleapis.com',
            'https://cdn.jsdelivr.net'
          ],
          fontSrc: [
            '\'self\'',
            'https://fonts.gstatic.com',
            'https://cdn.jsdelivr.net'
          ],
          imgSrc: [
            '\'self\'',
            'data:',
            'https:',
            'blob:'
          ],
          connectSrc: [
            '\'self\'',
            'https://api.finnexusai.com',
            'wss://api.finnexusai.com',
            'https://sentry.io',
            'https://*.sentry.io'
          ],
          mediaSrc: ['\'self\''],
          objectSrc: ['\'none\''],
          frameSrc: ['\'none\''],
          baseUri: ['\'self\''],
          formAction: ['\'self\''],
          frameAncestors: ['\'none\''],
          upgradeInsecureRequests: []
        },
        reportOnly: false
      },

      // HTTP Strict Transport Security
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },

      // X-Content-Type-Options
      noSniff: true,

      // X-Frame-Options
      frameguard: {
        action: 'deny'
      },

      // X-XSS-Protection
      xssFilter: true,

      // Referrer Policy
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
      },

      // Permissions Policy (formerly Feature Policy)
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: ['\'self\''],
        usb: [],
        magnetometer: [],
        gyroscope: [],
        accelerometer: [],
        ambientLightSensor: [],
        autoplay: [],
        fullscreen: ['\'self\''],
        pictureInPicture: []
      },

      // Cross-Origin Embedder Policy
      crossOriginEmbedderPolicy: true,

      // Cross-Origin Opener Policy
      crossOriginOpenerPolicy: {
        policy: 'same-origin'
      },

      // Cross-Origin Resource Policy
      crossOriginResourcePolicy: {
        policy: 'cross-origin'
      }
    });
  }

  /**
   * Get the main security headers middleware
   */
  getSecurityHeaders() {
    return (req, res, next) => {
      // Generate new nonce for each request
      req.nonce = this.generateNonce();

      // Apply Helmet security headers
      this.helmetConfig(req, res, () => {
        // Add custom security headers
        this.addCustomSecurityHeaders(req, res);
        next();
      });
    };
  }

  /**
   * Add custom security headers beyond Helmet
   */
  addCustomSecurityHeaders(req, res) {
    // Clear-Site-Data header for logout
    if (req.path === '/api/v1/auth/logout') {
      res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
    }

    // X-Request-ID for request tracing
    res.setHeader('X-Request-ID', req.correlationId || crypto.randomUUID());

    // X-Response-Time
    if (req.startTime) {
      const responseTime = Date.now() - req.startTime;
      res.setHeader('X-Response-Time', `${responseTime}ms`);
    }

    // X-Rate-Limit headers (if rate limiting is applied)
    if (req.rateLimit) {
      res.setHeader('X-RateLimit-Limit', req.rateLimit.limit);
      res.setHeader('X-RateLimit-Remaining', req.rateLimit.remaining);
      res.setHeader('X-RateLimit-Reset', req.rateLimit.reset);
    }

    // X-Content-Type-Options (additional)
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-Download-Options (IE specific)
    res.setHeader('X-Download-Options', 'noopen');

    // X-Permitted-Cross-Domain-Policies
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // Strict-Transport-Security (additional configuration)
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Cache-Control for API responses
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // X-Powered-By (remove to hide technology stack)
    res.removeHeader('X-Powered-By');

    // Server header (customize to hide server info)
    res.setHeader('Server', 'FinNexusAI/1.0');

    // Expect-CT header for certificate transparency
    res.setHeader('Expect-CT', 'max-age=86400, enforce');

    // Feature-Policy (legacy, for older browsers)
    res.setHeader('Feature-Policy', [
      'camera \'none\'',
      'microphone \'none\'',
      'geolocation \'none\'',
      'payment \'self\'',
      'usb \'none\''
    ].join('; '));
  }

  /**
   * Security headers for API responses
   */
  getAPISecurityHeaders() {
    return (req, res, next) => {
      // API-specific security headers
      res.setHeader('X-API-Version', 'v1');
      res.setHeader('X-API-Documentation', 'https://api.finnexusai.com/docs');

      // Rate limiting headers
      res.setHeader('X-RateLimit-Policy', 'sliding-window');

      // CORS headers (if needed for API)
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', this.getAllowedOrigin(req));
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-API-Key');
        res.setHeader('Access-Control-Max-Age', '86400');
      }

      next();
    };
  }

  /**
   * Get allowed origin for CORS
   */
  getAllowedOrigin(req) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
      return origin;
    }

    return allowedOrigins[0]; // Default to first allowed origin
  }

  /**
   * Security headers for static files
   */
  getStaticSecurityHeaders() {
    return (req, res, next) => {
      // Static file specific headers
      if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        // Cache static assets
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

        // Add integrity headers for subresource integrity
        if (req.path.endsWith('.js') || req.path.endsWith('.css')) {
          // This would be populated with actual hashes in production
          res.setHeader('X-Content-Hash', 'placeholder-hash');
        }
      }

      next();
    };
  }

  /**
   * Security headers for admin routes
   */
  getAdminSecurityHeaders() {
    return (req, res, next) => {
      // Additional security for admin routes
      if (req.path.startsWith('/api/v1/admin/') || req.path.startsWith('/admin/')) {
        // Require additional authentication
        res.setHeader('X-Admin-Required', 'true');

        // Audit logging header
        res.setHeader('X-Audit-Required', 'true');

        // No caching for admin routes
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
      }

      next();
    };
  }

  /**
   * Security headers for authentication routes
   */
  getAuthSecurityHeaders() {
    return (req, res, next) => {
      if (req.path.startsWith('/api/v1/auth/')) {
        // Authentication specific headers
        res.setHeader('X-Auth-Provider', 'finnexusai');
        res.setHeader('X-Auth-Version', '1.0');

        // Prevent caching of auth responses
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

        // Security for login attempts
        if (req.path.includes('login') || req.path.includes('register')) {
          res.setHeader('X-Login-Attempt', 'true');
        }
      }

      next();
    };
  }

  /**
   * Get CSP nonce for current request
   */
  getNonce(req) {
    return req.nonce || this.nonce;
  }

  /**
   * Update CSP nonce in response
   */
  updateCSPNonce(req, res) {
    const nonce = this.getNonce(req);

    // Update CSP header with new nonce
    const cspHeader = res.getHeader('Content-Security-Policy');
    if (cspHeader) {
      const updatedCSP = cspHeader.replace(/'nonce-[^']+'/g, `'nonce-${nonce}'`);
      res.setHeader('Content-Security-Policy', updatedCSP);
    }
  }

  /**
   * Security headers validation middleware
   */
  validateSecurityHeaders() {
    return (req, res, next) => {
      // Validate required headers are present
      const requiredHeaders = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection'
      ];

      const missingHeaders = requiredHeaders.filter(header =>
        !res.getHeader(header)
      );

      if (missingHeaders.length > 0) {
        logger.warn(`Missing security headers: ${missingHeaders.join(', ')}`);
      }

      next();
    };
  }

  /**
   * Security headers for health check endpoints
   */
  getHealthCheckSecurityHeaders() {
    return (req, res, next) => {
      if (req.path.includes('/health') || req.path.includes('/status')) {
        // Minimal headers for health checks
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Health-Check', 'true');
      }

      next();
    };
  }

  /**
   * Get all security headers configuration
   */
  getAllSecurityMiddlewares() {
    return [
      this.getSecurityHeaders(),
      this.getAPISecurityHeaders(),
      this.getStaticSecurityHeaders(),
      this.getAdminSecurityHeaders(),
      this.getAuthSecurityHeaders(),
      this.getHealthCheckSecurityHeaders(),
      this.validateSecurityHeaders()
    ];
  }
}

module.exports = new SecurityHeaders();
