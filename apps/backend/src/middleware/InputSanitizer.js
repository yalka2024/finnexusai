/**
 * Input Sanitizer Middleware
 * Comprehensive input sanitization and validation for all API endpoints
 */

const DOMPurify = require('isomorphic-dompurify');
const validator = require('validator');
const xss = require('xss');
const { CustomError } = require('../errors/ErrorHandler');

class InputSanitizer {
  constructor() {
    this.config = {
      maxStringLength: parseInt(process.env.MAX_INPUT_LENGTH) || 10000,
      maxArrayLength: parseInt(process.env.MAX_ARRAY_LENGTH) || 1000,
      maxObjectDepth: parseInt(process.env.MAX_OBJECT_DEPTH) || 10,
      allowedHtmlTags: process.env.ALLOWED_HTML_TAGS ? 
        process.env.ALLOWED_HTML_TAGS.split(',') : [],
      enableXssProtection: process.env.ENABLE_XSS_PROTECTION !== 'false',
      enableSqlInjectionProtection: process.env.ENABLE_SQL_INJECTION_PROTECTION !== 'false',
      enablePathTraversalProtection: process.env.ENABLE_PATH_TRAVERSAL_PROTECTION !== 'false',
      enableCommandInjectionProtection: process.env.ENABLE_COMMAND_INJECTION_PROTECTION !== 'false'
    };

    // SQL injection patterns
    this.sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE)\b)/gi,
      /(\b(UNION|OR|AND)\b.*\b(SELECT|INSERT|UPDATE|DELETE)\b)/gi,
      /(\b(INTO|FROM|WHERE|SET|VALUES)\b.*\b(SELECT|INSERT|UPDATE|DELETE)\b)/gi,
      /(\b(CHAR|ASCII|SUBSTRING|LENGTH|CAST|CONVERT)\s*\(/gi,
      /(\b(WAITFOR|DELAY|SLEEP)\b)/gi,
      /(\b(BULK|OPENROWSET|OPENDATASOURCE)\b)/gi,
      /(\b(SP_|XP_|EXEC\s+SP_|EXEC\s+XP_)\b)/gi,
      /(\b(BEGIN|END|IF|ELSE|WHILE|FOR)\b)/gi,
      /(\b(DECLARE|SET)\s+@/gi,
      /(\b(GETDATE|GETUTCDATE|SYSDATETIME)\b)/gi
    ];

    // XSS patterns
    this.xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
      /<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi,
      /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /on\w+\s*=/gi
    ];

    // Path traversal patterns
    this.pathTraversalPatterns = [
      /\.\.\//g,
      /\.\.\\/g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi,
      /\.\.%2f/gi,
      /\.\.%5c/gi,
      /%252e%252e%252f/gi,
      /%252e%252e%255c/gi
    ];

    // Command injection patterns
    this.commandInjectionPatterns = [
      /[;&|`$]/g,
      /\b(cmd|command|exec|system|shell|bash|sh|powershell|cmd\.exe)\b/gi,
      /\b(ping|nslookup|tracert|netstat|ipconfig|ifconfig)\b/gi,
      /\b(cat|ls|dir|type|more|less|head|tail|grep|find|locate)\b/gi,
      /\b(wget|curl|ftp|telnet|ssh|scp|rsync)\b/gi,
      /\b(kill|killall|taskkill|pkill)\b/gi,
      /\b(rm|del|erase|remove|delete)\b/gi,
      /\b(mkdir|md|rmdir|rd|move|copy|cp|mv)\b/gi,
      /\b(chmod|chown|attrib|icacls)\b/gi,
      /\b(reg|registry|regedit|regsvr32)\b/gi
    ];

    // Dangerous file extensions
    this.dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
      '.php', '.asp', '.aspx', '.jsp', '.py', '.pl', '.sh', '.ps1', '.rb'
    ];
  }

  /**
   * Initialize the input sanitizer
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing input sanitizer...');

      // Configure DOMPurify
      DOMPurify.setConfig({
        ALLOWED_TAGS: this.config.allowedHtmlTags,
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        RETURN_DOM_IMPORT: false,
        SANITIZE_DOM: true,
        FORCE_BODY: false,
        SANITIZE_NAMED_PROPS: false,
        ADD_ATTR: [],
        ADD_TAGS: [],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'applet', 'form']
      });

      logger.info('✅ Input sanitizer initialized successfully');

      return {
        success: true,
        message: 'Input sanitizer initialized successfully',
        config: {
          maxStringLength: this.config.maxStringLength,
          maxArrayLength: this.config.maxArrayLength,
          maxObjectDepth: this.config.maxObjectDepth,
          xssProtection: this.config.enableXssProtection,
          sqlInjectionProtection: this.config.enableSqlInjectionProtection,
          pathTraversalProtection: this.config.enablePathTraversalProtection,
          commandInjectionProtection: this.config.enableCommandInjectionProtection
        }
      };

    } catch (error) {
      logger.error('❌ Failed to initialize input sanitizer:', error);
      throw new Error(`Input sanitizer initialization failed: ${error.message}`);
    }
  }

  /**
   * Main sanitization middleware
   */
  sanitizeInput() {
    return (req, res, next) => {
      try {
        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
          req.body = this.sanitizeObject(req.body, 0);
        }

        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
          req.query = this.sanitizeObject(req.query, 0);
        }

        // Sanitize route parameters
        if (req.params && typeof req.params === 'object') {
          req.params = this.sanitizeObject(req.params, 0);
        }

        // Sanitize headers (basic sanitization)
        this.sanitizeHeaders(req);

        next();
      } catch (error) {
        logger.error('❌ Input sanitization error:', error);
        next(new CustomError('Invalid input detected', 400, 'INVALID_INPUT'));
      }
    };
  }

  /**
   * Sanitize object recursively
   */
  sanitizeObject(obj, depth) {
    if (depth > this.config.maxObjectDepth) {
      throw new Error('Object depth exceeds maximum allowed depth');
    }

    if (Array.isArray(obj)) {
      return this.sanitizeArray(obj, depth);
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key
        const sanitizedKey = this.sanitizeKey(key);
        
        // Sanitize value
        sanitized[sanitizedKey] = this.sanitizeObject(value, depth + 1);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize array
   */
  sanitizeArray(arr, depth) {
    if (arr.length > this.config.maxArrayLength) {
      throw new Error('Array length exceeds maximum allowed length');
    }

    return arr.map(item => this.sanitizeObject(item, depth + 1));
  }

  /**
   * Sanitize string
   */
  sanitizeString(str) {
    if (typeof str !== 'string') {
      return str;
    }

    // Check string length
    if (str.length > this.config.maxStringLength) {
      throw new Error('String length exceeds maximum allowed length');
    }

    // Remove null bytes
    str = str.replace(/\0/g, '');

    // Trim whitespace
    str = str.trim();

    // Check for SQL injection
    if (this.config.enableSqlInjectionProtection) {
      this.checkSqlInjection(str);
    }

    // Check for XSS
    if (this.config.enableXssProtection) {
      this.checkXss(str);
    }

    // Check for path traversal
    if (this.config.enablePathTraversalProtection) {
      this.checkPathTraversal(str);
    }

    // Check for command injection
    if (this.config.enableCommandInjectionProtection) {
      this.checkCommandInjection(str);
    }

    // HTML sanitization
    str = DOMPurify.sanitize(str);

    // XSS sanitization
    str = xss(str, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });

    return str;
  }

  /**
   * Sanitize object key
   */
  sanitizeKey(key) {
    if (typeof key !== 'string') {
      return key;
    }

    // Remove dangerous characters from keys
    return key.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * Sanitize headers
   */
  sanitizeHeaders(req) {
    const dangerousHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'user-agent',
      'referer',
      'origin'
    ];

    for (const header of dangerousHeaders) {
      const value = req.get(header);
      if (value) {
        // Basic sanitization for headers
        const sanitized = value.replace(/[\r\n\t]/g, '').trim();
        if (sanitized !== value) {
          req.headers[header] = sanitized;
        }
      }
    }
  }

  /**
   * Check for SQL injection
   */
  checkSqlInjection(str) {
    for (const pattern of this.sqlPatterns) {
      if (pattern.test(str)) {
        throw new Error('Potential SQL injection detected');
      }
    }
  }

  /**
   * Check for XSS
   */
  checkXss(str) {
    for (const pattern of this.xssPatterns) {
      if (pattern.test(str)) {
        throw new Error('Potential XSS attack detected');
      }
    }
  }

  /**
   * Check for path traversal
   */
  checkPathTraversal(str) {
    for (const pattern of this.pathTraversalPatterns) {
      if (pattern.test(str)) {
        throw new Error('Potential path traversal attack detected');
      }
    }
  }

  /**
   * Check for command injection
   */
  checkCommandInjection(str) {
    for (const pattern of this.commandInjectionPatterns) {
      if (pattern.test(str)) {
        throw new Error('Potential command injection detected');
      }
    }
  }

  /**
   * Validate and sanitize email
   */
  sanitizeEmail(email) {
    if (!email || typeof email !== 'string') {
      throw new Error('Invalid email format');
    }

    const sanitized = this.sanitizeString(email);
    
    if (!validator.isEmail(sanitized)) {
      throw new Error('Invalid email format');
    }

    return validator.normalizeEmail(sanitized);
  }

  /**
   * Validate and sanitize URL
   */
  sanitizeUrl(url) {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL format');
    }

    const sanitized = this.sanitizeString(url);
    
    if (!validator.isURL(sanitized, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
      allow_underscores: false,
      allow_trailing_dot: false,
      allow_protocol_relative_urls: false
    })) {
      throw new Error('Invalid URL format');
    }

    return sanitized;
  }

  /**
   * Validate and sanitize phone number
   */
  sanitizePhone(phone) {
    if (!phone || typeof phone !== 'string') {
      throw new Error('Invalid phone format');
    }

    const sanitized = this.sanitizeString(phone);
    
    // Remove all non-digit characters except + at the beginning
    const cleaned = sanitized.replace(/[^\d+]/g, '');
    
    if (!validator.isMobilePhone(cleaned)) {
      throw new Error('Invalid phone format');
    }

    return cleaned;
  }

  /**
   * Validate and sanitize file name
   */
  sanitizeFileName(fileName) {
    if (!fileName || typeof fileName !== 'string') {
      throw new Error('Invalid file name');
    }

    const sanitized = this.sanitizeString(fileName);
    
    // Check for dangerous extensions
    const ext = sanitized.toLowerCase().substring(sanitized.lastIndexOf('.'));
    if (this.dangerousExtensions.includes(ext)) {
      throw new Error('File type not allowed');
    }

    // Remove dangerous characters
    const cleaned = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    if (cleaned.length === 0) {
      throw new Error('Invalid file name');
    }

    return cleaned;
  }

  /**
   * Validate and sanitize JSON
   */
  sanitizeJson(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('Invalid JSON format');
    }

    const sanitized = this.sanitizeString(jsonString);
    
    try {
      const parsed = JSON.parse(sanitized);
      return this.sanitizeObject(parsed, 0);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }

  /**
   * Validate and sanitize UUID
   */
  sanitizeUuid(uuid) {
    if (!uuid || typeof uuid !== 'string') {
      throw new Error('Invalid UUID format');
    }

    const sanitized = this.sanitizeString(uuid);
    
    if (!validator.isUUID(sanitized)) {
      throw new Error('Invalid UUID format');
    }

    return sanitized.toLowerCase();
  }

  /**
   * Validate and sanitize IP address
   */
  sanitizeIpAddress(ip) {
    if (!ip || typeof ip !== 'string') {
      throw new Error('Invalid IP address format');
    }

    const sanitized = this.sanitizeString(ip);
    
    if (!validator.isIP(sanitized)) {
      throw new Error('Invalid IP address format');
    }

    return sanitized;
  }

  /**
   * Validate and sanitize credit card number
   */
  sanitizeCreditCard(cardNumber) {
    if (!cardNumber || typeof cardNumber !== 'string') {
      throw new Error('Invalid credit card format');
    }

    const sanitized = this.sanitizeString(cardNumber);
    
    // Remove spaces and dashes
    const cleaned = sanitized.replace(/[\s-]/g, '');
    
    if (!validator.isCreditCard(cleaned)) {
      throw new Error('Invalid credit card format');
    }

    // Return masked version for security
    return cleaned.replace(/(\d{4})\d{8}(\d{4})/, '$1********$2');
  }

  /**
   * Validate and sanitize password
   */
  sanitizePassword(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Invalid password format');
    }

    // Check password length
    if (password.length < 8 || password.length > 128) {
      throw new Error('Password must be between 8 and 128 characters');
    }

    // Check for common weak passwords
    const weakPasswords = ['password', '123456', 'admin', 'qwerty', 'letmein'];
    if (weakPasswords.includes(password.toLowerCase())) {
      throw new Error('Password is too weak');
    }

    // Basic sanitization (don't modify password content)
    return password.trim();
  }

  /**
   * Get sanitization statistics
   */
  getStatistics() {
    return {
      config: this.config,
      patterns: {
        sqlPatterns: this.sqlPatterns.length,
        xssPatterns: this.xssPatterns.length,
        pathTraversalPatterns: this.pathTraversalPatterns.length,
        commandInjectionPatterns: this.commandInjectionPatterns.length,
        dangerousExtensions: this.dangerousExtensions.length
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Update sanitization configuration
   */
  updateConfiguration(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };

    // Update DOMPurify config if needed
    if (newConfig.allowedHtmlTags) {
      DOMPurify.setConfig({
        ...DOMPurify.getConfig(),
        ALLOWED_TAGS: newConfig.allowedHtmlTags
      });
    }

    logger.info('✅ Input sanitizer configuration updated');
  }

  /**
   * Add custom validation pattern
   */
  addValidationPattern(type, pattern) {
    switch (type) {
      case 'sql':
        this.sqlPatterns.push(pattern);
        break;
      case 'xss':
        this.xssPatterns.push(pattern);
        break;
      case 'pathTraversal':
        this.pathTraversalPatterns.push(pattern);
        break;
      case 'commandInjection':
        this.commandInjectionPatterns.push(pattern);
        break;
      default:
        throw new Error(`Unknown validation pattern type: ${type}`);
    }
  }
}

module.exports = new InputSanitizer();
