/**
 * API Versioning Middleware
 * Comprehensive API versioning strategy with backward compatibility
 */

const semver = require('semver');
const { CustomError } = require('../errors/ErrorHandler');

class ApiVersioning {
  constructor() {
    this.config = {
      defaultVersion: process.env.API_DEFAULT_VERSION || '1.0.0',
      supportedVersions: process.env.API_SUPPORTED_VERSIONS ?
        process.env.API_SUPPORTED_VERSIONS.split(',') : ['1.0.0'],
      deprecatedVersions: process.env.API_DEPRECATED_VERSIONS ?
        process.env.API_DEPRECATED_VERSIONS.split(',') : [],
      versioningStrategy: process.env.API_VERSIONING_STRATEGY || 'header', // header, url, query
      enforceVersion: process.env.API_ENFORCE_VERSION === 'true',
      allowLatest: process.env.API_ALLOW_LATEST === 'true',
      versionHeader: process.env.API_VERSION_HEADER || 'X-API-Version',
      acceptHeader: 'Accept',
      sunsetHeader: 'Sunset'
    };

    this.versionRoutes = new Map();
    this.versionHandlers = new Map();
    this.versionMetadata = new Map();

    // Version lifecycle states
    this.states = {
      ACTIVE: 'active',
      DEPRECATED: 'deprecated',
      SUNSET: 'sunset',
      RETIRED: 'retired'
    };
  }

  /**
   * Initialize API versioning
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing API versioning...');

      // Validate configuration
      this.validateConfiguration();

      // Set up default version metadata
      this.setupDefaultVersions();

      logger.info('✅ API versioning initialized successfully');

      return {
        success: true,
        message: 'API versioning initialized successfully',
        config: {
          defaultVersion: this.config.defaultVersion,
          supportedVersions: this.config.supportedVersions,
          deprecatedVersions: this.config.deprecatedVersions,
          versioningStrategy: this.config.versioningStrategy
        }
      };

    } catch (error) {
      logger.error('❌ Failed to initialize API versioning:', error);
      throw new Error(`API versioning initialization failed: ${error.message}`);
    }
  }

  /**
   * Validate versioning configuration
   */
  validateConfiguration() {
    // Validate supported versions
    for (const version of this.config.supportedVersions) {
      if (!semver.valid(version)) {
        throw new Error(`Invalid version format: ${version}`);
      }
    }

    // Validate deprecated versions
    for (const version of this.config.deprecatedVersions) {
      if (!semver.valid(version)) {
        throw new Error(`Invalid deprecated version format: ${version}`);
      }
    }

    // Validate default version
    if (!semver.valid(this.config.defaultVersion)) {
      throw new Error(`Invalid default version format: ${this.config.defaultVersion}`);
    }

    // Check if default version is supported
    if (!this.config.supportedVersions.includes(this.config.defaultVersion)) {
      throw new Error('Default version must be in supported versions list');
    }

    // Validate versioning strategy
    const validStrategies = ['header', 'url', 'query'];
    if (!validStrategies.includes(this.config.versioningStrategy)) {
      throw new Error(`Invalid versioning strategy: ${this.config.versioningStrategy}`);
    }
  }

  /**
   * Set up default version metadata
   */
  setupDefaultVersions() {
    // Set up supported versions
    this.config.supportedVersions.forEach(version => {
      this.versionMetadata.set(version, {
        version,
        state: this.config.deprecatedVersions.includes(version) ?
          this.states.DEPRECATED : this.states.ACTIVE,
        releaseDate: new Date().toISOString(),
        sunsetDate: null,
        changelog: [],
        breakingChanges: [],
        newFeatures: [],
        deprecatedFeatures: []
      });
    });

    // Set up deprecated versions
    this.config.deprecatedVersions.forEach(version => {
      const metadata = this.versionMetadata.get(version);
      if (metadata) {
        metadata.state = this.states.DEPRECATED;
        metadata.sunsetDate = this.calculateSunsetDate(version);
      }
    });
  }

  /**
   * Calculate sunset date for deprecated version
   */
  calculateSunsetDate(version) {
    // Default sunset period: 6 months from deprecation
    const sunsetDate = new Date();
    sunsetDate.setMonth(sunsetDate.getMonth() + 6);
    return sunsetDate.toISOString();
  }

  /**
   * Main versioning middleware
   */
  versionMiddleware() {
    return (req, res, next) => {
      try {
        // Extract version from request
        const version = this.extractVersion(req);

        // Validate version
        const validationResult = this.validateVersion(version);

        if (!validationResult.valid) {
          return this.handleInvalidVersion(req, res, validationResult);
        }

        // Set version in request
        req.apiVersion = version;
        req.versionMetadata = this.versionMetadata.get(version);

        // Add version headers to response
        this.addVersionHeaders(req, res);

        // Check for deprecation warnings
        this.checkDeprecationWarning(req, res, version);

        next();
      } catch (error) {
        logger.error('❌ API versioning error:', error);
        next(new CustomError('API versioning error', 500, 'VERSIONING_ERROR'));
      }
    };
  }

  /**
   * Extract version from request
   */
  extractVersion(req) {
    switch (this.config.versioningStrategy) {
    case 'header':
      return this.extractVersionFromHeader(req);
    case 'url':
      return this.extractVersionFromUrl(req);
    case 'query':
      return this.extractVersionFromQuery(req);
    default:
      return this.config.defaultVersion;
    }
  }

  /**
   * Extract version from header
   */
  extractVersionFromHeader(req) {
    const versionHeader = req.get(this.config.versionHeader);
    const acceptHeader = req.get(this.config.acceptHeader);

    // Check custom version header first
    if (versionHeader) {
      return this.parseVersionFromHeader(versionHeader);
    }

    // Check Accept header for version
    if (acceptHeader) {
      const versionMatch = acceptHeader.match(/version=([0-9]+\.[0-9]+\.[0-9]+)/);
      if (versionMatch) {
        return versionMatch[1];
      }
    }

    return this.config.defaultVersion;
  }

  /**
   * Extract version from URL
   */
  extractVersionFromUrl(req) {
    const pathMatch = req.path.match(/\/v([0-9]+\.[0-9]+\.[0-9]+)\//);
    if (pathMatch) {
      return pathMatch[1];
    }

    const pathMatchShort = req.path.match(/\/v([0-9]+)\//);
    if (pathMatchShort) {
      return `${pathMatchShort[1]}.0.0`;
    }

    return this.config.defaultVersion;
  }

  /**
   * Extract version from query parameter
   */
  extractVersionFromQuery(req) {
    const version = req.query.version || req.query.v;
    if (version) {
      return this.parseVersionFromQuery(version);
    }

    return this.config.defaultVersion;
  }

  /**
   * Parse version from header
   */
  parseVersionFromHeader(header) {
    // Handle different header formats
    const formats = [
      /^v?([0-9]+\.[0-9]+\.[0-9]+)$/,
      /^version\s*=\s*v?([0-9]+\.[0-9]+\.[0-9]+)$/i,
      /^api-version\s*:\s*v?([0-9]+\.[0-9]+\.[0-9]+)$/i
    ];

    for (const format of formats) {
      const match = header.match(format);
      if (match) {
        return match[1];
      }
    }

    return this.config.defaultVersion;
  }

  /**
   * Parse version from query parameter
   */
  parseVersionFromQuery(query) {
    // Handle different query formats
    const formats = [
      /^v?([0-9]+\.[0-9]+\.[0-9]+)$/,
      /^([0-9]+)$/,
      /^([0-9]+\.[0-9]+)$/
    ];

    for (const format of formats) {
      const match = query.match(format);
      if (match) {
        let version = match[1];

        // Convert short versions to full semver
        if (version.split('.').length === 1) {
          version = `${version}.0.0`;
        } else if (version.split('.').length === 2) {
          version = `${version}.0`;
        }

        return version;
      }
    }

    return this.config.defaultVersion;
  }

  /**
   * Validate version
   */
  validateVersion(version) {
    // Check if version is valid semver
    if (!semver.valid(version)) {
      return {
        valid: false,
        error: 'INVALID_VERSION_FORMAT',
        message: 'Invalid version format'
      };
    }

    // Check if version is supported
    if (!this.isVersionSupported(version)) {
      return {
        valid: false,
        error: 'UNSUPPORTED_VERSION',
        message: 'API version not supported',
        supportedVersions: this.config.supportedVersions
      };
    }

    // Check if version is retired
    const metadata = this.versionMetadata.get(version);
    if (metadata && metadata.state === this.states.RETIRED) {
      return {
        valid: false,
        error: 'RETIRED_VERSION',
        message: 'API version has been retired',
        supportedVersions: this.config.supportedVersions
      };
    }

    return { valid: true };
  }

  /**
   * Check if version is supported
   */
  isVersionSupported(version) {
    // Check exact match
    if (this.config.supportedVersions.includes(version)) {
      return true;
    }

    // Check if 'latest' is allowed and version is the latest
    if (this.config.allowLatest && version === 'latest') {
      return true;
    }

    // Check for compatible versions (same major version)
    const majorVersion = semver.major(version);
    return this.config.supportedVersions.some(supportedVersion =>
      semver.major(supportedVersion) === majorVersion
    );
  }

  /**
   * Handle invalid version
   */
  handleInvalidVersion(req, res, validationResult) {
    const statusCode = this.getStatusCodeForError(validationResult.error);

    res.status(statusCode).json({
      success: false,
      error: validationResult.error,
      message: validationResult.message,
      requestedVersion: req.apiVersion,
      supportedVersions: validationResult.supportedVersions || this.config.supportedVersions,
      defaultVersion: this.config.defaultVersion,
      documentation: this.getVersionDocumentationUrl(req.apiVersion)
    });
  }

  /**
   * Get status code for version error
   */
  getStatusCodeForError(error) {
    switch (error) {
    case 'INVALID_VERSION_FORMAT':
      return 400;
    case 'UNSUPPORTED_VERSION':
      return 400;
    case 'RETIRED_VERSION':
      return 410;
    default:
      return 400;
    }
  }

  /**
   * Add version headers to response
   */
  addVersionHeaders(req, res) {
    const version = req.apiVersion;
    const metadata = req.versionMetadata;

    res.set(this.config.versionHeader, version);
    res.set('API-Version', version);
    res.set('API-Supported-Versions', this.config.supportedVersions.join(', '));

    if (metadata) {
      res.set('API-Version-State', metadata.state);

      if (metadata.sunsetDate) {
        res.set(this.config.sunsetHeader, metadata.sunsetDate);
      }
    }
  }

  /**
   * Check for deprecation warning
   */
  checkDeprecationWarning(req, res, version) {
    const metadata = this.versionMetadata.get(version);

    if (metadata && metadata.state === this.states.DEPRECATED) {
      const warning = `API version ${version} is deprecated and will be sunset on ${metadata.sunsetDate}`;

      res.set('Warning', `299 - "${warning}"`);
      res.set('API-Deprecation-Warning', warning);

      logger.warn(`⚠️ Deprecated API version used: ${version} by ${req.ip}`);
    }
  }

  /**
   * Register version-specific route handler
   */
  registerVersionHandler(version, route, handler) {
    const key = `${version}:${route}`;
    this.versionHandlers.set(key, handler);

    logger.info(`✅ Registered handler for version ${version} on route ${route}`);
  }

  /**
   * Get version-specific handler
   */
  getVersionHandler(version, route) {
    // Try exact version first
    let key = `${version}:${route}`;
    let handler = this.versionHandlers.get(key);

    if (handler) {
      return handler;
    }

    // Try compatible major version
    const majorVersion = semver.major(version);
    const compatibleVersions = this.config.supportedVersions.filter(v =>
      semver.major(v) === majorVersion
    );

    for (const compatibleVersion of compatibleVersions) {
      key = `${compatibleVersion}:${route}`;
      handler = this.versionHandlers.get(key);
      if (handler) {
        return handler;
      }
    }

    return null;
  }

  /**
   * Add version metadata
   */
  addVersionMetadata(version, metadata) {
    this.versionMetadata.set(version, {
      ...this.versionMetadata.get(version),
      ...metadata,
      version
    });
  }

  /**
   * Deprecate version
   */
  deprecateVersion(version, sunsetDate = null) {
    if (!this.config.supportedVersions.includes(version)) {
      throw new Error(`Version ${version} is not supported`);
    }

    const metadata = this.versionMetadata.get(version);
    if (metadata) {
      metadata.state = this.states.DEPRECATED;
      metadata.sunsetDate = sunsetDate || this.calculateSunsetDate(version);
    }

    if (!this.config.deprecatedVersions.includes(version)) {
      this.config.deprecatedVersions.push(version);
    }

    logger.info(`⚠️ Deprecated API version: ${version}, sunset: ${metadata?.sunsetDate}`);
  }

  /**
   * Retire version
   */
  retireVersion(version) {
    const metadata = this.versionMetadata.get(version);
    if (metadata) {
      metadata.state = this.states.RETIRED;
    }

    // Remove from supported versions
    this.config.supportedVersions = this.config.supportedVersions.filter(v => v !== version);

    logger.info(`🚫 Retired API version: ${version}`);
  }

  /**
   * Add breaking change
   */
  addBreakingChange(version, change) {
    const metadata = this.versionMetadata.get(version);
    if (metadata) {
      metadata.breakingChanges.push({
        ...change,
        addedAt: new Date().toISOString()
      });
    }
  }

  /**
   * Add new feature
   */
  addNewFeature(version, feature) {
    const metadata = this.versionMetadata.get(version);
    if (metadata) {
      metadata.newFeatures.push({
        ...feature,
        addedAt: new Date().toISOString()
      });
    }
  }

  /**
   * Add deprecated feature
   */
  addDeprecatedFeature(version, feature) {
    const metadata = this.versionMetadata.get(version);
    if (metadata) {
      metadata.deprecatedFeatures.push({
        ...feature,
        deprecatedAt: new Date().toISOString()
      });
    }
  }

  /**
   * Get version documentation URL
   */
  getVersionDocumentationUrl(version) {
    const baseUrl = process.env.API_DOCS_BASE_URL || 'https://docs.finnexus.ai';
    return `${baseUrl}/api/v${version}`;
  }

  /**
   * Get version information
   */
  getVersionInfo(version = null) {
    if (version) {
      const metadata = this.versionMetadata.get(version);
      return {
        version,
        metadata,
        supported: this.isVersionSupported(version)
      };
    }

    return {
      defaultVersion: this.config.defaultVersion,
      supportedVersions: this.config.supportedVersions,
      deprecatedVersions: this.config.deprecatedVersions,
      versioningStrategy: this.config.versioningStrategy,
      versions: Object.fromEntries(this.versionMetadata)
    };
  }

  /**
   * Get changelog for version
   */
  getChangelog(version) {
    const metadata = this.versionMetadata.get(version);
    if (!metadata) {
      return null;
    }

    return {
      version,
      releaseDate: metadata.releaseDate,
      state: metadata.state,
      sunsetDate: metadata.sunsetDate,
      breakingChanges: metadata.breakingChanges,
      newFeatures: metadata.newFeatures,
      deprecatedFeatures: metadata.deprecatedFeatures,
      changelog: metadata.changelog
    };
  }

  /**
   * Middleware for version-specific routes
   */
  versionRouteMiddleware(route) {
    return (req, res, next) => {
      const version = req.apiVersion;
      const handler = this.getVersionHandler(version, route);

      if (handler) {
        return handler(req, res, next);
      }

      // Fallback to default handler
      next();
    };
  }

  /**
   * Get versioning statistics
   */
  getStatistics() {
    return {
      config: this.config,
      totalVersions: this.versionMetadata.size,
      activeVersions: this.config.supportedVersions.length - this.config.deprecatedVersions.length,
      deprecatedVersions: this.config.deprecatedVersions.length,
      registeredHandlers: this.versionHandlers.size,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new ApiVersioning();
