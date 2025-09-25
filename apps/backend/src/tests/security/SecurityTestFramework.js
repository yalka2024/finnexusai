/**
 * Security Testing Framework
 * Comprehensive security scanning and penetration testing capabilities
 */

const axios = require('axios');
const crypto = require('crypto');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger');

class SecurityTestFramework extends EventEmitter {
  constructor() {
    super();
    this.config = {
      baseUrl: process.env.SECURITY_TEST_BASE_URL || 'http://localhost:4000',
      timeout: parseInt(process.env.SECURITY_TEST_TIMEOUT || '30000'),
      maxConcurrency: parseInt(process.env.SECURITY_TEST_MAX_CONCURRENCY || '5'),
      outputDir: process.env.SECURITY_TEST_OUTPUT_DIR || './security-test-results',
      enableOWASP: process.env.ENABLE_OWASP_SCAN !== 'false',
      enableSQLInjection: process.env.ENABLE_SQL_INJECTION_TEST !== 'false',
      enableXSS: process.env.ENABLE_XSS_TEST !== 'false',
      enableCSRF: process.env.ENABLE_CSRF_TEST !== 'false',
      enableAuthBypass: process.env.ENABLE_AUTH_BYPASS_TEST !== 'false',
      enableRateLimit: process.env.ENABLE_RATE_LIMIT_TEST !== 'false'
    };

    this.results = {
      startTime: null,
      endTime: null,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      vulnerabilities: [],
      recommendations: []
    };

    this.isRunning = false;
    this.testSuites = new Map();
    this.vulnerabilityPatterns = new Map();
  }

  /**
   * Initialize the security testing framework
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing security testing framework...');

      // Create output directory
      await fs.mkdir(this.config.outputDir, { recursive: true });

      // Initialize vulnerability patterns
      this.initializeVulnerabilityPatterns();

      // Initialize test suites
      this.initializeTestSuites();

      logger.info('✅ Security testing framework initialized successfully');

      return {
        success: true,
        message: 'Security testing framework initialized successfully',
        config: this.config,
        testSuites: Array.from(this.testSuites.keys()),
        vulnerabilityPatterns: this.vulnerabilityPatterns.size
      };
    } catch (error) {
      logger.error('❌ Failed to initialize security testing framework:', error);
      throw new Error(`Security testing initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize vulnerability patterns
   */
  initializeVulnerabilityPatterns() {
    // SQL Injection patterns
    this.vulnerabilityPatterns.set('sql_injection', {
      patterns: [
        '\' OR \'1\'=\'1',
        '\' OR 1=1--',
        '\'; DROP TABLE users; --',
        '\' UNION SELECT * FROM users--',
        '1\' OR \'1\'=\'1\' --',
        'admin\'--',
        '\' OR \'x\'=\'x',
        '\') OR (\'1\'=\'1',
        '\' OR \'1\'=\'1\' /*',
        '\' OR \'1\'=\'1\' #'
      ],
      severity: 'high',
      category: 'injection'
    });

    // XSS patterns
    this.vulnerabilityPatterns.set('xss', {
      patterns: [
        '<script>alert(\'XSS\')</script>',
        '<img src=x onerror=alert(\'XSS\')>',
        '<svg onload=alert(\'XSS\')>',
        'javascript:alert(\'XSS\')',
        '<iframe src=javascript:alert(\'XSS\')>',
        '<body onload=alert(\'XSS\')>',
        '<input onfocus=alert(\'XSS\') autofocus>',
        '<select onfocus=alert(\'XSS\') autofocus>',
        '<textarea onfocus=alert(\'XSS\') autofocus>',
        '<keygen onfocus=alert(\'XSS\') autofocus>'
      ],
      severity: 'medium',
      category: 'xss'
    });

    // Path traversal patterns
    this.vulnerabilityPatterns.set('path_traversal', {
      patterns: [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '..%252f..%252f..%252fetc%252fpasswd',
        '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd'
      ],
      severity: 'high',
      category: 'path_traversal'
    });

    // Command injection patterns
    this.vulnerabilityPatterns.set('command_injection', {
      patterns: [
        '; ls -la',
        '| cat /etc/passwd',
        '& whoami',
        '` id `',
        '$(whoami)',
        '; cat /etc/passwd',
        '| ping -c 1 127.0.0.1',
        '& ping -n 1 127.0.0.1'
      ],
      severity: 'critical',
      category: 'command_injection'
    });
  }

  /**
   * Initialize test suites
   */
  initializeTestSuites() {
    // OWASP Top 10 Test Suite
    this.addTestSuite('owasp-top10', {
      name: 'OWASP Top 10',
      description: 'Test for OWASP Top 10 vulnerabilities',
      tests: [
        { id: 'injection', name: 'Injection Flaws', enabled: this.config.enableSQLInjection },
        { id: 'broken-auth', name: 'Broken Authentication', enabled: this.config.enableAuthBypass },
        { id: 'sensitive-data', name: 'Sensitive Data Exposure', enabled: true },
        { id: 'xml-external', name: 'XML External Entities', enabled: true },
        { id: 'broken-access', name: 'Broken Access Control', enabled: true },
        { id: 'security-misconfig', name: 'Security Misconfiguration', enabled: true },
        { id: 'xss', name: 'Cross-Site Scripting', enabled: this.config.enableXSS },
        { id: 'insecure-deserialization', name: 'Insecure Deserialization', enabled: true },
        { id: 'known-vulns', name: 'Using Components with Known Vulnerabilities', enabled: true },
        { id: 'logging', name: 'Insufficient Logging & Monitoring', enabled: true }
      ]
    });

    // Authentication Bypass Test Suite
    this.addTestSuite('auth-bypass', {
      name: 'Authentication Bypass',
      description: 'Test for authentication bypass vulnerabilities',
      tests: [
        { id: 'jwt-tampering', name: 'JWT Token Tampering', enabled: true },
        { id: 'session-fixation', name: 'Session Fixation', enabled: true },
        { id: 'weak-auth', name: 'Weak Authentication', enabled: true },
        { id: 'privilege-escalation', name: 'Privilege Escalation', enabled: true },
        { id: 'brute-force', name: 'Brute Force Protection', enabled: true }
      ]
    });

    // Input Validation Test Suite
    this.addTestSuite('input-validation', {
      name: 'Input Validation',
      description: 'Test input validation and sanitization',
      tests: [
        { id: 'sql-injection', name: 'SQL Injection', enabled: this.config.enableSQLInjection },
        { id: 'xss', name: 'Cross-Site Scripting', enabled: this.config.enableXSS },
        { id: 'path-traversal', name: 'Path Traversal', enabled: true },
        { id: 'command-injection', name: 'Command Injection', enabled: true },
        { id: 'ldap-injection', name: 'LDAP Injection', enabled: true },
        { id: 'nosql-injection', name: 'NoSQL Injection', enabled: true }
      ]
    });

    // Rate Limiting Test Suite
    this.addTestSuite('rate-limiting', {
      name: 'Rate Limiting',
      description: 'Test rate limiting and DoS protection',
      tests: [
        { id: 'api-rate-limit', name: 'API Rate Limiting', enabled: this.config.enableRateLimit },
        { id: 'auth-rate-limit', name: 'Authentication Rate Limiting', enabled: this.config.enableRateLimit },
        { id: 'dos-protection', name: 'DoS Protection', enabled: true }
      ]
    });

    // CSRF Test Suite
    this.addTestSuite('csrf', {
      name: 'Cross-Site Request Forgery',
      description: 'Test CSRF protection',
      tests: [
        { id: 'csrf-protection', name: 'CSRF Protection', enabled: this.config.enableCSRF },
        { id: 'same-origin-policy', name: 'Same-Origin Policy', enabled: true }
      ]
    });
  }

  /**
   * Add a test suite
   */
  addTestSuite(id, suite) {
    this.testSuites.set(id, {
      id,
      ...suite,
      tests: suite.tests || []
    });
  }

  /**
   * Remove a test suite
   */
  removeTestSuite(id) {
    this.testSuites.delete(id);
  }

  /**
   * Run security tests
   */
  async runSecurityTests(suiteIds = null, options = {}) {
    try {
      if (this.isRunning) {
        throw new Error('Security test is already running');
      }

      logger.info('🔒 Starting security testing...');

      // Merge options with config
      const testConfig = { ...this.config, ...options };
      const suites = suiteIds ?
        suiteIds.map(id => this.testSuites.get(id)).filter(Boolean) :
        Array.from(this.testSuites.values());

      if (suites.length === 0) {
        throw new Error('No test suites found');
      }

      this.isRunning = true;
      this.resetResults();

      // Emit start event
      this.emit('testStart', { suites, config: testConfig });

      // Run tests
      for (const suite of suites) {
        await this.runTestSuite(suite, testConfig);
      }

      // Generate recommendations
      this.generateRecommendations();

      // Emit completion event
      this.emit('testComplete', this.results);

      logger.info('✅ Security testing completed successfully');
      return this.results;

    } catch (error) {
      this.isRunning = false;
      this.emit('testError', error);
      logger.error('❌ Security test failed:', error);
      throw error;
    }
  }

  /**
   * Run a test suite
   */
  async runTestSuite(suite, config) {
    logger.info(`🔍 Running test suite: ${suite.name}`);

    for (const test of suite.tests) {
      if (!test.enabled) continue;

      this.results.totalTests++;

      try {
        const result = await this.runTest(test, config);
        if (result.passed) {
          this.results.passedTests++;
        } else {
          this.results.failedTests++;
          this.results.vulnerabilities.push(result);

          // Categorize by severity
          switch (result.severity) {
          case 'critical':
            this.results.criticalIssues++;
            break;
          case 'high':
            this.results.highIssues++;
            break;
          case 'medium':
            this.results.mediumIssues++;
            break;
          case 'low':
            this.results.lowIssues++;
            break;
          }
        }

        // Emit test result event
        this.emit('testResult', {
          suite: suite.id,
          test: test.id,
          result
        });

      } catch (error) {
        this.results.failedTests++;
        this.emit('testError', {
          suite: suite.id,
          test: test.id,
          error: error.message
        });
      }
    }
  }

  /**
   * Run a specific test
   */
  async runTest(test, config) {
    const testMethods = {
      'injection': () => this.testSQLInjection(config),
      'sql-injection': () => this.testSQLInjection(config),
      'xss': () => this.testXSS(config),
      'broken-auth': () => this.testBrokenAuthentication(config),
      'jwt-tampering': () => this.testJWTTampering(config),
      'path-traversal': () => this.testPathTraversal(config),
      'command-injection': () => this.testCommandInjection(config),
      'api-rate-limit': () => this.testAPIRateLimiting(config),
      'auth-rate-limit': () => this.testAuthRateLimiting(config),
      'csrf-protection': () => this.testCSRFProtection(config),
      'sensitive-data': () => this.testSensitiveDataExposure(config),
      'security-misconfig': () => this.testSecurityMisconfiguration(config),
      'brute-force': () => this.testBruteForceProtection(config),
      'privilege-escalation': () => this.testPrivilegeEscalation(config),
      'dos-protection': () => this.testDoSProtection(config)
    };

    const testMethod = testMethods[test.id];
    if (!testMethod) {
      throw new Error(`Unknown test: ${test.id}`);
    }

    return await testMethod();
  }

  /**
   * Test SQL Injection vulnerabilities
   */
  async testSQLInjection(config) {
    const endpoints = [
      { method: 'POST', path: '/api/v1/auth/login', body: { email: 'test@example.com', password: 'test' } },
      { method: 'GET', path: '/api/v1/users/search', params: { q: 'test' } },
      { method: 'POST', path: '/api/v1/trading/orders', body: { symbol: 'BTC/USD', amount: 0.001 } }
    ];

    const vulnerabilities = [];

    for (const endpoint of endpoints) {
      for (const pattern of this.vulnerabilityPatterns.get('sql_injection').patterns) {
        try {
          const testPayload = this.injectPayload(endpoint, pattern);
          const response = await this.makeRequest(testPayload, config);

          if (this.isSQLInjectionVulnerable(response, pattern)) {
            vulnerabilities.push({
              endpoint: endpoint.path,
              method: endpoint.method,
              payload: pattern,
              response: response.data,
              severity: 'high',
              category: 'sql_injection'
            });
          }
        } catch (error) {
          // Continue with other tests
        }
      }
    }

    return {
      testId: 'sql-injection',
      testName: 'SQL Injection',
      passed: vulnerabilities.length === 0,
      severity: vulnerabilities.length > 0 ? 'high' : 'info',
      vulnerabilities,
      recommendations: vulnerabilities.length > 0 ? [
        'Use parameterized queries or prepared statements',
        'Implement input validation and sanitization',
        'Use an ORM with built-in SQL injection protection',
        'Implement least privilege database access'
      ] : []
    };
  }

  /**
   * Test XSS vulnerabilities
   */
  async testXSS(config) {
    const endpoints = [
      { method: 'POST', path: '/api/v1/users', body: { name: 'test', email: 'test@example.com' } },
      { method: 'POST', path: '/api/v1/trading/orders', body: { symbol: 'BTC/USD', notes: 'test' } },
      { method: 'GET', path: '/api/v1/users/search', params: { q: 'test' } }
    ];

    const vulnerabilities = [];

    for (const endpoint of endpoints) {
      for (const pattern of this.vulnerabilityPatterns.get('xss').patterns) {
        try {
          const testPayload = this.injectPayload(endpoint, pattern);
          const response = await this.makeRequest(testPayload, config);

          if (this.isXSSVulnerable(response, pattern)) {
            vulnerabilities.push({
              endpoint: endpoint.path,
              method: endpoint.method,
              payload: pattern,
              response: response.data,
              severity: 'medium',
              category: 'xss'
            });
          }
        } catch (error) {
          // Continue with other tests
        }
      }
    }

    return {
      testId: 'xss',
      testName: 'Cross-Site Scripting',
      passed: vulnerabilities.length === 0,
      severity: vulnerabilities.length > 0 ? 'medium' : 'info',
      vulnerabilities,
      recommendations: vulnerabilities.length > 0 ? [
        'Implement proper input validation and sanitization',
        'Use Content Security Policy (CSP) headers',
        'Encode output data appropriately',
        'Use template engines with auto-escaping'
      ] : []
    };
  }

  /**
   * Test broken authentication
   */
  async testBrokenAuthentication(config) {
    const vulnerabilities = [];

    // Test weak passwords
    const weakPasswords = ['123456', 'password', 'admin', 'qwerty', 'letmein'];
    for (const password of weakPasswords) {
      try {
        const response = await this.makeRequest({
          method: 'POST',
          path: '/api/v1/auth/login',
          body: { email: 'test@example.com', password }
        }, config);

        if (response.status === 200) {
          vulnerabilities.push({
            test: 'weak-password',
            password,
            severity: 'medium',
            category: 'broken_auth'
          });
        }
      } catch (error) {
        // Continue with other tests
      }
    }

    // Test JWT vulnerabilities
    const jwtVulnerabilities = await this.testJWTTampering(config);
    if (!jwtVulnerabilities.passed) {
      vulnerabilities.push(...jwtVulnerabilities.vulnerabilities);
    }

    return {
      testId: 'broken-auth',
      testName: 'Broken Authentication',
      passed: vulnerabilities.length === 0,
      severity: vulnerabilities.length > 0 ? 'high' : 'info',
      vulnerabilities,
      recommendations: vulnerabilities.length > 0 ? [
        'Implement strong password policies',
        'Use multi-factor authentication',
        'Implement account lockout mechanisms',
        'Use secure session management',
        'Validate JWT tokens properly'
      ] : []
    };
  }

  /**
   * Test JWT token tampering
   */
  async testJWTTampering(config) {
    const vulnerabilities = [];

    // Test with invalid JWT
    try {
      const response = await this.makeRequest({
        method: 'GET',
        path: '/api/v1/users/profile',
        headers: { 'Authorization': 'Bearer invalid-jwt-token' }
      }, config);

      if (response.status !== 401) {
        vulnerabilities.push({
          test: 'invalid-jwt',
          severity: 'high',
          category: 'jwt_tampering'
        });
      }
    } catch (error) {
      // Continue with other tests
    }

    // Test with tampered JWT
    try {
      const tamperedJWT = this.createTamperedJWT();
      const response = await this.makeRequest({
        method: 'GET',
        path: '/api/v1/users/profile',
        headers: { 'Authorization': `Bearer ${tamperedJWT}` }
      }, config);

      if (response.status !== 401) {
        vulnerabilities.push({
          test: 'tampered-jwt',
          severity: 'high',
          category: 'jwt_tampering'
        });
      }
    } catch (error) {
      // Continue with other tests
    }

    return {
      testId: 'jwt-tampering',
      testName: 'JWT Token Tampering',
      passed: vulnerabilities.length === 0,
      severity: vulnerabilities.length > 0 ? 'high' : 'info',
      vulnerabilities,
      recommendations: vulnerabilities.length > 0 ? [
        'Validate JWT signature properly',
        'Use strong JWT secrets',
        'Implement token expiration',
        'Use HTTPS for token transmission'
      ] : []
    };
  }

  /**
   * Test API rate limiting
   */
  async testAPIRateLimiting(config) {
    const endpoint = { method: 'GET', path: '/api/v1/health' };
    const requests = [];
    const maxRequests = 100;

    // Send multiple requests rapidly
    for (let i = 0; i < maxRequests; i++) {
      requests.push(this.makeRequest(endpoint, config));
    }

    const responses = await Promise.allSettled(requests);
    const rateLimited = responses.filter(r => r.status === 'fulfilled' && r.value.status === 429);

    return {
      testId: 'api-rate-limit',
      testName: 'API Rate Limiting',
      passed: rateLimited.length > 0,
      severity: rateLimited.length === 0 ? 'medium' : 'info',
      vulnerabilities: rateLimited.length === 0 ? [{
        test: 'no-rate-limiting',
        severity: 'medium',
        category: 'rate_limiting'
      }] : [],
      recommendations: rateLimited.length === 0 ? [
        'Implement API rate limiting',
        'Use sliding window or token bucket algorithms',
        'Set appropriate rate limits per endpoint',
        'Implement IP-based rate limiting'
      ] : []
    };
  }

  /**
   * Test CSRF protection
   */
  async testCSRFProtection(config) {
    const vulnerabilities = [];

    // Test state-changing operations without CSRF token
    const stateChangingEndpoints = [
      { method: 'POST', path: '/api/v1/users', body: { name: 'test' } },
      { method: 'PUT', path: '/api/v1/users/1', body: { name: 'test' } },
      { method: 'DELETE', path: '/api/v1/users/1' }
    ];

    for (const endpoint of stateChangingEndpoints) {
      try {
        const response = await this.makeRequest(endpoint, config);

        if (response.status === 200 || response.status === 201) {
          vulnerabilities.push({
            endpoint: endpoint.path,
            method: endpoint.method,
            severity: 'medium',
            category: 'csrf'
          });
        }
      } catch (error) {
        // Continue with other tests
      }
    }

    return {
      testId: 'csrf-protection',
      testName: 'CSRF Protection',
      passed: vulnerabilities.length === 0,
      severity: vulnerabilities.length > 0 ? 'medium' : 'info',
      vulnerabilities,
      recommendations: vulnerabilities.length > 0 ? [
        'Implement CSRF tokens',
        'Use SameSite cookie attribute',
        'Validate Origin and Referer headers',
        'Use double submit cookie pattern'
      ] : []
    };
  }

  /**
   * Test sensitive data exposure
   */
  async testSensitiveDataExposure(config) {
    const vulnerabilities = [];

    // Test for exposed sensitive data in responses
    const sensitiveEndpoints = [
      '/api/v1/users/profile',
      '/api/v1/auth/me',
      '/api/v1/trading/portfolio'
    ];

    for (const endpoint of sensitiveEndpoints) {
      try {
        const response = await this.makeRequest({
          method: 'GET',
          path: endpoint,
          headers: { 'Authorization': 'Bearer test-token' }
        }, config);

        if (response.status === 200) {
          const responseText = JSON.stringify(response.data);

          // Check for sensitive patterns
          const sensitivePatterns = [
            /password/i,
            /ssn|social.security/i,
            /credit.card/i,
            /private.key/i,
            /secret/i
          ];

          for (const pattern of sensitivePatterns) {
            if (pattern.test(responseText)) {
              vulnerabilities.push({
                endpoint,
                pattern: pattern.toString(),
                severity: 'high',
                category: 'sensitive_data'
              });
            }
          }
        }
      } catch (error) {
        // Continue with other tests
      }
    }

    return {
      testId: 'sensitive-data',
      testName: 'Sensitive Data Exposure',
      passed: vulnerabilities.length === 0,
      severity: vulnerabilities.length > 0 ? 'high' : 'info',
      vulnerabilities,
      recommendations: vulnerabilities.length > 0 ? [
        'Remove sensitive data from API responses',
        'Implement data masking for sensitive fields',
        'Use field-level encryption',
        'Implement proper access controls'
      ] : []
    };
  }

  /**
   * Test security misconfiguration
   */
  async testSecurityMisconfiguration(config) {
    const vulnerabilities = [];

    // Test for security headers
    try {
      const response = await this.makeRequest({
        method: 'GET',
        path: '/api/v1/health'
      }, config);

      const headers = response.headers;
      const securityHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'strict-transport-security',
        'content-security-policy'
      ];

      for (const header of securityHeaders) {
        if (!headers[header]) {
          vulnerabilities.push({
            missingHeader: header,
            severity: 'medium',
            category: 'security_misconfig'
          });
        }
      }
    } catch (error) {
      // Continue with other tests
    }

    // Test for information disclosure
    try {
      const response = await this.makeRequest({
        method: 'GET',
        path: '/api/v1/health'
      }, config);

      if (response.headers['x-powered-by']) {
        vulnerabilities.push({
          infoDisclosure: 'x-powered-by',
          severity: 'low',
          category: 'security_misconfig'
        });
      }
    } catch (error) {
      // Continue with other tests
    }

    return {
      testId: 'security-misconfig',
      testName: 'Security Misconfiguration',
      passed: vulnerabilities.length === 0,
      severity: vulnerabilities.length > 0 ? 'medium' : 'info',
      vulnerabilities,
      recommendations: vulnerabilities.length > 0 ? [
        'Implement all security headers',
        'Remove server information disclosure',
        'Disable unnecessary HTTP methods',
        'Configure proper error handling',
        'Use secure default configurations'
      ] : []
    };
  }

  /**
   * Test brute force protection
   */
  async testBruteForceProtection(config) {
    const endpoint = {
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: 'test@example.com', password: 'wrongpassword' }
    };

    const maxAttempts = 10;
    let blocked = false;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.makeRequest(endpoint, config);

        if (response.status === 429 || response.status === 423) {
          blocked = true;
          break;
        }
      } catch (error) {
        // Continue with other tests
      }
    }

    return {
      testId: 'brute-force',
      testName: 'Brute Force Protection',
      passed: blocked,
      severity: blocked ? 'info' : 'high',
      vulnerabilities: blocked ? [] : [{
        test: 'no-brute-force-protection',
        severity: 'high',
        category: 'brute_force'
      }],
      recommendations: blocked ? [] : [
        'Implement account lockout after failed attempts',
        'Use CAPTCHA after multiple failures',
        'Implement progressive delays',
        'Monitor for brute force attempts'
      ]
    };
  }

  /**
   * Test privilege escalation
   */
  async testPrivilegeEscalation(config) {
    const vulnerabilities = [];

    // Test accessing admin endpoints with user token
    const adminEndpoints = [
      '/api/v1/admin/users',
      '/api/v1/admin/system',
      '/api/v1/admin/logs'
    ];

    for (const endpoint of adminEndpoints) {
      try {
        const response = await this.makeRequest({
          method: 'GET',
          path: endpoint,
          headers: { 'Authorization': 'Bearer user-token' }
        }, config);

        if (response.status === 200) {
          vulnerabilities.push({
            endpoint,
            severity: 'critical',
            category: 'privilege_escalation'
          });
        }
      } catch (error) {
        // Continue with other tests
      }
    }

    return {
      testId: 'privilege-escalation',
      testName: 'Privilege Escalation',
      passed: vulnerabilities.length === 0,
      severity: vulnerabilities.length > 0 ? 'critical' : 'info',
      vulnerabilities,
      recommendations: vulnerabilities.length > 0 ? [
        'Implement proper role-based access control',
        'Validate user permissions on every request',
        'Use principle of least privilege',
        'Implement proper authorization checks'
      ] : []
    };
  }

  /**
   * Test DoS protection
   */
  async testDoSProtection(config) {
    const vulnerabilities = [];

    // Test for resource exhaustion
    try {
      const endpoint = { method: 'POST', path: '/api/v1/trading/orders' };
      const requests = [];
      const maxRequests = 1000;

      for (let i = 0; i < maxRequests; i++) {
        requests.push(this.makeRequest(endpoint, config));
      }

      const responses = await Promise.allSettled(requests);
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status < 500);

      if (successful.length > maxRequests * 0.8) {
        vulnerabilities.push({
          test: 'no-dos-protection',
          severity: 'medium',
          category: 'dos'
        });
      }
    } catch (error) {
      // Continue with other tests
    }

    return {
      testId: 'dos-protection',
      testName: 'DoS Protection',
      passed: vulnerabilities.length === 0,
      severity: vulnerabilities.length > 0 ? 'medium' : 'info',
      vulnerabilities,
      recommendations: vulnerabilities.length > 0 ? [
        'Implement rate limiting',
        'Use request queuing',
        'Implement circuit breakers',
        'Monitor resource usage',
        'Use load balancing'
      ] : []
    };
  }

  /**
   * Test path traversal
   */
  async testPathTraversal(config) {
    const vulnerabilities = [];

    for (const pattern of this.vulnerabilityPatterns.get('path_traversal').patterns) {
      try {
        const response = await this.makeRequest({
          method: 'GET',
          path: `/api/v1/files/${pattern}`
        }, config);

        if (response.status === 200 && this.isPathTraversalVulnerable(response)) {
          vulnerabilities.push({
            payload: pattern,
            severity: 'high',
            category: 'path_traversal'
          });
        }
      } catch (error) {
        // Continue with other tests
      }
    }

    return {
      testId: 'path-traversal',
      testName: 'Path Traversal',
      passed: vulnerabilities.length === 0,
      severity: vulnerabilities.length > 0 ? 'high' : 'info',
      vulnerabilities,
      recommendations: vulnerabilities.length > 0 ? [
        'Validate and sanitize file paths',
        'Use whitelist of allowed paths',
        'Implement proper file access controls',
        'Use chroot or similar sandboxing'
      ] : []
    };
  }

  /**
   * Test command injection
   */
  async testCommandInjection(config) {
    const vulnerabilities = [];

    for (const pattern of this.vulnerabilityPatterns.get('command_injection').patterns) {
      try {
        const response = await this.makeRequest({
          method: 'POST',
          path: '/api/v1/system/command',
          body: { command: pattern }
        }, config);

        if (response.status === 200 && this.isCommandInjectionVulnerable(response)) {
          vulnerabilities.push({
            payload: pattern,
            severity: 'critical',
            category: 'command_injection'
          });
        }
      } catch (error) {
        // Continue with other tests
      }
    }

    return {
      testId: 'command-injection',
      testName: 'Command Injection',
      passed: vulnerabilities.length === 0,
      severity: vulnerabilities.length > 0 ? 'critical' : 'info',
      vulnerabilities,
      recommendations: vulnerabilities.length > 0 ? [
        'Avoid executing system commands with user input',
        'Use parameterized commands if necessary',
        'Implement input validation and sanitization',
        'Use least privilege principles'
      ] : []
    };
  }

  /**
   * Test authentication rate limiting
   */
  async testAuthRateLimiting(config) {
    const endpoint = {
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: 'test@example.com', password: 'wrongpassword' }
    };

    const maxAttempts = 10;
    let blocked = false;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.makeRequest(endpoint, config);

        if (response.status === 429) {
          blocked = true;
          break;
        }
      } catch (error) {
        // Continue with other tests
      }
    }

    return {
      testId: 'auth-rate-limit',
      testName: 'Authentication Rate Limiting',
      passed: blocked,
      severity: blocked ? 'info' : 'high',
      vulnerabilities: blocked ? [] : [{
        test: 'no-auth-rate-limiting',
        severity: 'high',
        category: 'rate_limiting'
      }],
      recommendations: blocked ? [] : [
        'Implement authentication rate limiting',
        'Use progressive delays',
        'Implement CAPTCHA after failures',
        'Monitor for brute force attempts'
      ]
    };
  }

  /**
   * Helper methods
   */

  injectPayload(endpoint, payload) {
    const result = { ...endpoint };

    if (result.body) {
      // Inject into body fields
      for (const key in result.body) {
        if (typeof result.body[key] === 'string') {
          result.body[key] = payload;
        }
      }
    }

    if (result.params) {
      // Inject into query parameters
      for (const key in result.params) {
        result.params[key] = payload;
      }
    }

    return result;
  }

  isSQLInjectionVulnerable(response, payload) {
    const responseText = JSON.stringify(response.data).toLowerCase();
    const errorPatterns = [
      'sql syntax',
      'mysql error',
      'postgresql error',
      'sqlite error',
      'oracle error',
      'sql server error',
      'database error',
      'query failed'
    ];

    return errorPatterns.some(pattern => responseText.includes(pattern));
  }

  isXSSVulnerable(response, payload) {
    const responseText = JSON.stringify(response.data);
    return responseText.includes(payload);
  }

  isPathTraversalVulnerable(response) {
    const responseText = JSON.stringify(response.data);
    return responseText.includes('root:') || responseText.includes('passwd');
  }

  isCommandInjectionVulnerable(response) {
    const responseText = JSON.stringify(response.data);
    return responseText.includes('uid=') || responseText.includes('gid=');
  }

  createTamperedJWT() {
    // Create a tampered JWT token for testing
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      sub: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    })).toString('base64url');
    const signature = 'tampered-signature';

    return `${header}.${payload}.${signature}`;
  }

  makeRequest(request, config) {
    const axiosConfig = {
      method: request.method,
      url: `${config.baseUrl}${request.path}`,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...request.headers
      },
      validateStatus: () => true
    };

    if (request.body) {
      axiosConfig.data = request.body;
    }

    if (request.params) {
      axiosConfig.params = request.params;
    }

    return axios(axiosConfig);
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.results.criticalIssues > 0) {
      recommendations.push('CRITICAL: Address critical security vulnerabilities immediately');
    }

    if (this.results.highIssues > 0) {
      recommendations.push('HIGH: Fix high-severity vulnerabilities as soon as possible');
    }

    if (this.results.mediumIssues > 0) {
      recommendations.push('MEDIUM: Address medium-severity vulnerabilities in next release');
    }

    if (this.results.lowIssues > 0) {
      recommendations.push('LOW: Consider addressing low-severity vulnerabilities');
    }

    this.results.recommendations = recommendations;
  }

  resetResults() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      vulnerabilities: [],
      recommendations: []
    };
  }

  async generateReport() {
    try {
      this.results.endTime = new Date();

      const report = {
        summary: {
          testDuration: this.results.endTime - this.results.startTime,
          totalTests: this.results.totalTests,
          passedTests: this.results.passedTests,
          failedTests: this.results.failedTests,
          criticalIssues: this.results.criticalIssues,
          highIssues: this.results.highIssues,
          mediumIssues: this.results.mediumIssues,
          lowIssues: this.results.lowIssues,
          securityScore: this.calculateSecurityScore()
        },
        vulnerabilities: this.results.vulnerabilities,
        recommendations: this.results.recommendations,
        config: this.config,
        timestamp: new Date().toISOString()
      };

      // Save report to file
      const reportPath = path.join(this.config.outputDir, `security-test-report-${Date.now()}.json`);
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

      logger.info(`🔒 Security test report generated: ${reportPath}`);
      return report;

    } catch (error) {
      logger.error('❌ Failed to generate security test report:', error);
      throw error;
    }
  }

  calculateSecurityScore() {
    const totalIssues = this.results.criticalIssues + this.results.highIssues +
                       this.results.mediumIssues + this.results.lowIssues;

    if (totalIssues === 0) return 100;

    const weightedScore = (this.results.criticalIssues * 25) +
                         (this.results.highIssues * 15) +
                         (this.results.mediumIssues * 5) +
                         (this.results.lowIssues * 1);

    return Math.max(0, 100 - weightedScore);
  }

  getStatus() {
    return {
      success: true,
      isRunning: this.isRunning,
      config: this.config,
      testSuites: Array.from(this.testSuites.keys()),
      lastResults: this.results.totalTests > 0 ? this.results : null
    };
  }

  stop() {
    if (this.isRunning) {
      this.isRunning = false;
      this.emit('testStop');
      logger.info('🛑 Security test stopped');
    }
  }
}

module.exports = SecurityTestFramework;
