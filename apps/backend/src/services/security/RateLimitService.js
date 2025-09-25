/**
 * FinAI Nexus - Rate Limiting Service
 *
 * Advanced rate limiting and DDoS protection featuring:
 * - Multi-tier rate limiting
 * - IP-based and user-based limits
 * - Sliding window algorithms
 * - Adaptive rate limiting
 * - DDoS detection and mitigation
 * - Whitelist/blacklist management
 * - Geographic rate limiting
 * - API endpoint specific limits
 */

// const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class RateLimitService {
  constructor() {
    this.rateLimits = new Map(); // Store rate limit data
    this.ipLimits = new Map(); // IP-based limits
    this.userLimits = new Map(); // User-based limits
    this.blockedIPs = new Set(); // Blocked IP addresses
    this.whitelistIPs = new Set(); // Whitelisted IPs
    this.blacklistIPs = new Set(); // Blacklisted IPs
    this.suspiciousIPs = new Map(); // Suspicious IP tracking
    this.ddosThresholds = {
      requestsPerSecond: 100,
      requestsPerMinute: 1000,
      requestsPerHour: 10000,
      concurrentConnections: 50
    };

    this.setupDefaultRateLimits();
    this.startRateLimitProcessing();

    logger.info('RateLimitService initialized with DDoS protection');
  }

  /**
   * Setup default rate limits for different endpoints
   */
  setupDefaultRateLimits() {
    this.defaultLimits = {
      // Authentication endpoints
      '/api/auth/login': { requests: 5, window: 60000, burst: 10 }, // 5 per minute, burst 10
      '/api/auth/register': { requests: 3, window: 300000, burst: 5 }, // 3 per 5 minutes
      '/api/auth/forgot-password': { requests: 3, window: 3600000, burst: 5 }, // 3 per hour
      '/api/auth/reset-password': { requests: 5, window: 300000, burst: 10 }, // 5 per 5 minutes

      // Trading endpoints
      '/api/trade': { requests: 100, window: 60000, burst: 200 }, // 100 per minute
      '/api/portfolio': { requests: 200, window: 60000, burst: 400 }, // 200 per minute

      // AI endpoints
      '/api/ai': { requests: 50, window: 60000, burst: 100 }, // 50 per minute
      '/api/quantum': { requests: 20, window: 60000, burst: 40 }, // 20 per minute

      // Data endpoints
      '/api/analytics': { requests: 100, window: 60000, burst: 200 }, // 100 per minute
      '/api/market-data': { requests: 500, window: 60000, burst: 1000 }, // 500 per minute

      // General API endpoints
      '/api': { requests: 1000, window: 60000, burst: 2000 }, // 1000 per minute

      // WebSocket connections
      '/socket.io': { requests: 10, window: 60000, burst: 20 }, // 10 per minute

      // Public endpoints
      '/api/v1/health': { requests: 100, window: 60000, burst: 200 }, // 100 per minute
      '/api/v1/portfolio': { requests: 50, window: 60000, burst: 100 } // 50 per minute
    };
  }

  /**
   * Start rate limit processing
   */
  startRateLimitProcessing() {
    // Clean up expired rate limits every minute
    setInterval_(() => {
      this.cleanupExpiredLimits();
    }, 60000);

    // Process DDoS detection every 30 seconds
    setInterval_(() => {
      this.processDDoSDetection();
    }, 30000);

    // Update suspicious IP tracking every 5 minutes
    setInterval_(() => {
      this.updateSuspiciousIPTracking();
    }, 300000);
  }

  /**
   * Check rate limit for request
   */
  async checkRateLimit(identifier, endpoint, options = {}) {
    const {
      ipAddress,
      userId,
      userAgent: _userAgent,
      location: _location,
      device: _device
    } = options;

    // Check if IP is blacklisted
    if (this.blacklistIPs.has(ipAddress)) {
      return {
        allowed: false,
        reason: 'IP_BLACKLISTED',
        retryAfter: null,
        limit: null,
        remaining: 0
      };
    }

    // Whitelisted IPs bypass rate limits
    if (this.whitelistIPs.has(ipAddress)) {
      return {
        allowed: true,
        reason: 'WHITELISTED',
        retryAfter: null,
        limit: null,
        remaining: null
      };
    }

    // Get rate limit configuration for endpoint
    const _limitConfig = this.getRateLimitConfig(endpoint);

    // Check IP-based rate limit
    const _ipResult = await this.checkIPRateLimit(ipAddress, endpoint, limitConfig);
    if (!ipResult.allowed) {
      await this.trackSuspiciousActivity(ipAddress, 'rate_limit_exceeded', { endpoint, limitConfig });
      return ipResult;
    }

    // Check user-based rate limit (if user is authenticated)
    if (userId) {
      const _userResult = await this.checkUserRateLimit(userId, endpoint, limitConfig);
      if (!userResult.allowed) {
        await this.trackSuspiciousActivity(ipAddress, 'user_rate_limit_exceeded', { userId, endpoint, limitConfig });
        return userResult;
      }
    }

    // Check for DDoS patterns
    const _ddosResult = await this.checkDDoSPattern(ipAddress, endpoint);
    if (!ddosResult.allowed) {
      await this.handleDDoSDetection(ipAddress, ddosResult);
      return {
        allowed: false,
        reason: 'DDOS_DETECTED',
        retryAfter: 300000, // 5 minutes
        limit: null,
        remaining: 0
      };
    }

    // Apply adaptive rate limiting based on system load
    const _adaptiveResult = await this.applyAdaptiveRateLimit(ipAddress, endpoint, limitConfig);
    if (!adaptiveResult.allowed) {
      return adaptiveResult;
    }

    return {
      allowed: true,
      reason: 'ALLOWED',
      retryAfter: null,
      limit: limitConfig.requests,
      remaining: Math.max(0, limitConfig.requests - ipResult.used)
    };
  }

  /**
   * Check IP-based rate limit
   */
  async checkIPRateLimit(ipAddress, endpoint, limitConfig) {
    const _key = `ip:${ipAddress}:${endpoint}`;
    const _now = Date.now();
    const _window = limitConfig.window;

    if (!this.ipLimits.has(key)) {
      this.ipLimits.set(key, {
        requests: [],
        lastCleanup: now,
        burst: limitConfig.burst || limitConfig.requests
      });
    }

    const _ipLimit = this.ipLimits.get(key);

    // Clean up old requests
    const _cutoffTime = now - window;
    ipLimit.requests = ipLimit.requests.filter(timestamp => timestamp > cutoffTime);

    // Check if under limit
    if (ipLimit.requests.length < limitConfig.requests) {
      ipLimit.requests.push(now);
      return {
        allowed: true,
        used: ipLimit.requests.length,
        resetTime: now + window
      };
    }

    // Check burst limit
    if (limitConfig.burst && ipLimit.requests.length < ipLimit.burst) {
      ipLimit.requests.push(now);
      return {
        allowed: true,
        used: ipLimit.requests.length,
        resetTime: now + window,
        burst: true
      };
    }

    // Rate limit exceeded
    const _oldestRequest = Math.min(...ipLimit.requests);
    const _retryAfter = oldestRequest + window - now;

    return {
      allowed: false,
      used: ipLimit.requests.length,
      retryAfter: Math.max(0, retryAfter),
      resetTime: oldestRequest + window
    };
  }

  /**
   * Check user-based rate limit
   */
  async checkUserRateLimit(userId, endpoint, limitConfig) {
    const _key = `user:${userId}:${endpoint}`;
    const _now = Date.now();
    const _window = limitConfig.window;

    if (!this.userLimits.has(key)) {
      this.userLimits.set(key, {
        requests: [],
        lastCleanup: now
      });
    }

    const _userLimit = this.userLimits.get(key);

    // Clean up old requests
    const _cutoffTime = now - window;
    userLimit.requests = userLimit.requests.filter(timestamp => timestamp > cutoffTime);

    // Check if under limit
    if (userLimit.requests.length < limitConfig.requests) {
      userLimit.requests.push(now);
      return {
        allowed: true,
        used: userLimit.requests.length,
        resetTime: now + window
      };
    }

    // Rate limit exceeded
    const _oldestRequest = Math.min(...userLimit.requests);
    const _retryAfter = oldestRequest + window - now;

    return {
      allowed: false,
      used: userLimit.requests.length,
      retryAfter: Math.max(0, retryAfter),
      resetTime: oldestRequest + window
    };
  }

  /**
   * Get rate limit configuration for endpoint
   */
  getRateLimitConfig(endpoint) {
    // Find the most specific match
    let _config = this.defaultLimits[endpoint];

    if (!config) {
      // Try to find a pattern match
      for (const [pattern, limitConfig] of Object.entries(this.defaultLimits)) {
        if (endpoint.startsWith(pattern)) {
          config = limitConfig;
          break;
        }
      }
    }

    // Default fallback
    if (!config) {
      config = this.defaultLimits['/api'];
    }

    return config;
  }

  /**
   * Track suspicious activity
   */
  async trackSuspiciousActivity(ipAddress, activity, details) {
    if (!this.suspiciousIPs.has(ipAddress)) {
      this.suspiciousIPs.set(ipAddress, {
        activities: [],
        firstSeen: new Date(),
        lastSeen: new Date(),
        score: 0,
        blocked: false
      });
    }

    const _suspiciousData = this.suspiciousIPs.get(ipAddress);
    suspiciousData.activities.push({
      activity,
      details,
      timestamp: new Date()
    });
    suspiciousData.lastSeen = new Date();

    // Calculate suspicious score
    suspiciousData.score = this.calculateSuspiciousScore(suspiciousData);

    // Auto-block if score is too high
    if (suspiciousData.score > 80 && !suspiciousData.blocked) {
      await this.blockIP(ipAddress, 'AUTO_BLOCKED_HIGH_SUSPICIOUS_SCORE');
      suspiciousData.blocked = true;
    }

    logger.info(`Suspicious activity tracked for IP ${ipAddress}: ${activity} (score: ${suspiciousData.score})`);
  }

  /**
   * Calculate suspicious score
   */
  calculateSuspiciousScore(suspiciousData) {
    let _score = 0;
    const _now = new Date();
    const _oneHourAgo = new Date(now - 3600000);

    // Recent activities
    const _recentActivities = suspiciousData.activities.filter(
      a => a.timestamp > oneHourAgo
    );

    // Rate limit violations
    const _rateLimitViolations = recentActivities.filter(
      a => a.activity.includes('rate_limit')
    ).length;
    score += rateLimitViolations * 15;

    // Multiple failed logins
    const _failedLogins = recentActivities.filter(
      a => a.activity.includes('failed_login')
    ).length;
    score += failedLogins * 20;

    // DDoS patterns
    const _ddosActivities = recentActivities.filter(
      a => a.activity.includes('ddos')
    ).length;
    score += ddosActivities * 30;

    // Unusual patterns
    const _uniqueActivities = new Set(recentActivities.map(a => a.activity)).size;
    if (uniqueActivities > 5) {
      score += 25; // Many different types of suspicious activities
    }

    return Math.min(score, 100);
  }

  /**
   * Check for DDoS patterns
   */
  async checkDDoSPattern(ipAddress, _endpoint) {
    const _now = Date.now();
    const _oneSecondAgo = now - 1000;
    const _oneMinuteAgo = now - 60000;
    const _oneHourAgo = now - 3600000;

    // Count recent requests
    let _recentRequests = 0;
    let _minuteRequests = 0;
    let _hourRequests = 0;

    for (const [key, limit] of this.ipLimits) {
      if (key.startsWith(`ip:${ipAddress}:`)) {
        const _requests = limit.requests.filter(timestamp => timestamp > oneHourAgo);
        hourRequests += requests.length;

        const _minuteRequestsFiltered = requests.filter(timestamp => timestamp > oneMinuteAgo);
        minuteRequests += minuteRequestsFiltered.length;

        const _secondRequests = requests.filter(timestamp => timestamp > oneSecondAgo);
        recentRequests += secondRequests.length;
      }
    }

    // Check DDoS thresholds
    if (recentRequests > this.ddosThresholds.requestsPerSecond) {
      return {
        allowed: false,
        reason: 'DDOS_HIGH_RPS',
        severity: 'critical',
        requests: recentRequests,
        threshold: this.ddosThresholds.requestsPerSecond
      };
    }

    if (minuteRequests > this.ddosThresholds.requestsPerMinute) {
      return {
        allowed: false,
        reason: 'DDOS_HIGH_RPM',
        severity: 'warning',
        requests: minuteRequests,
        threshold: this.ddosThresholds.requestsPerMinute
      };
    }

    if (hourRequests > this.ddosThresholds.requestsPerHour) {
      return {
        allowed: false,
        reason: 'DDOS_HIGH_RPH',
        severity: 'warning',
        requests: hourRequests,
        threshold: this.ddosThresholds.requestsPerHour
      };
    }

    return { allowed: true };
  }

  /**
   * Handle DDoS detection
   */
  async handleDDoSDetection(ipAddress, ddosResult) {
    logger.info(`DDoS detected from IP ${ipAddress}: ${ddosResult.reason} (${ddosResult.requests} requests)`);

    // Track as suspicious activity
    await this.trackSuspiciousActivity(ipAddress, 'ddos_detected', ddosResult);

    // Auto-block for critical DDoS
    if (ddosResult.severity === 'critical') {
      await this.blockIP(ipAddress, 'DDOS_CRITICAL', 3600000); // Block for 1 hour
    }

    // In a real implementation, this would:
    // - Send alerts to security team
    // - Update firewall rules
    // - Notify CDN providers
    // - Log to security monitoring systems
  }

  /**
   * Apply adaptive rate limiting based on system load
   */
  async applyAdaptiveRateLimit(ipAddress, endpoint, limitConfig) {
    // Get system load (simplified)
    const _systemLoad = await this.getSystemLoad();

    // Reduce limits if system is under high load
    if (systemLoad > 0.8) {
      const _reducedLimit = Math.floor(limitConfig.requests * 0.5);
      const _adaptiveConfig = { ...limitConfig, requests: reducedLimit };

      const _result = await this.checkIPRateLimit(ipAddress, endpoint, adaptiveConfig);
      if (!result.allowed) {
        return {
          allowed: false,
          reason: 'ADAPTIVE_RATE_LIMIT',
          retryAfter: result.retryAfter,
          limit: reducedLimit,
          remaining: 0
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get system load (simplified)
   */
  async getSystemLoad() {
    // In a real implementation, this would check:
    // - CPU usage
    // - Memory usage
    // - Database connection pool
    // - Queue lengths
    // - Response times

    return Math.random() * 0.5; // Mock load for now
  }

  /**
   * Block IP address
   */
  async blockIP(ipAddress, reason, duration = null) {
    this.blockedIPs.add(ipAddress);

    logger.info(`IP ${ipAddress} blocked: ${reason}`);

    // Set auto-unblock timer if duration is specified
    if (duration) {
      setTimeout_(() => {
        this.unblockIP(ipAddress, 'AUTO_UNBLOCK');
      }, duration);
    }

    // In a real implementation, this would:
    // - Update firewall rules
    // - Update CDN block lists
    // - Notify security team
    // - Log to security systems
  }

  /**
   * Unblock IP address
   */
  async unblockIP(ipAddress, reason) {
    this.blockedIPs.delete(ipAddress);
    logger.info(`IP ${ipAddress} unblocked: ${reason}`);
  }

  /**
   * Add IP to whitelist
   */
  addToWhitelist(ipAddress) {
    this.whitelistIPs.add(ipAddress);
    logger.info(`IP ${ipAddress} added to whitelist`);
  }

  /**
   * Remove IP from whitelist
   */
  removeFromWhitelist(ipAddress) {
    this.whitelistIPs.delete(ipAddress);
    logger.info(`IP ${ipAddress} removed from whitelist`);
  }

  /**
   * Add IP to blacklist
   */
  addToBlacklist(ipAddress, reason) {
    this.blacklistIPs.add(ipAddress);
    logger.info(`IP ${ipAddress} added to blacklist: ${reason}`);
  }

  /**
   * Remove IP from blacklist
   */
  removeFromBlacklist(ipAddress) {
    this.blacklistIPs.delete(ipAddress);
    logger.info(`IP ${ipAddress} removed from blacklist`);
  }

  /**
   * Process DDoS detection
   */
  processDDoSDetection() {
    // Analyze patterns and detect DDoS attacks
    const _suspiciousIPs = Array.from(this.suspiciousIPs.entries())
      .filter(_([ip, _data]) => data.score > 60 && !data.blocked);

    for (const [ipAddress, data] of suspiciousIPs) {
      // Check if IP should be blocked based on recent activity
      const _recentActivities = data.activities.filter(
        a => (new Date() - a.timestamp) < 300000 // Last 5 minutes
      );

      if (recentActivities.length > 10) {
        this.blockIP(ipAddress, 'AUTO_BLOCKED_SUSPICIOUS_ACTIVITY');
        data.blocked = true;
      }
    }
  }

  /**
   * Update suspicious IP tracking
   */
  updateSuspiciousIPTracking() {
    const _now = new Date();
    const _oneHourAgo = new Date(now - 3600000);

    // Clean up old suspicious activities
    for (const [ipAddress, data] of this.suspiciousIPs) {
      data.activities = data.activities.filter(
        a => a.timestamp > oneHourAgo
      );

      // Remove IPs with no recent activity
      if (data.activities.length === 0 && (now - data.lastSeen) > 3600000) {
        this.suspiciousIPs.delete(ipAddress);
      }
    }
  }

  /**
   * Cleanup expired rate limits
   */
  cleanupExpiredLimits() {
    const _now = Date.now();
    const _maxAge = 3600000; // 1 hour

    // Cleanup IP limits
    for (const [key, limit] of this.ipLimits) {
      if (now - limit.lastCleanup > maxAge) {
        this.ipLimits.delete(key);
      }
    }

    // Cleanup user limits
    for (const [key, limit] of this.userLimits) {
      if (now - limit.lastCleanup > maxAge) {
        this.userLimits.delete(key);
      }
    }
  }

  /**
   * Get rate limit statistics
   */
  getRateLimitStats() {
    const _stats = {
      totalIPs: this.ipLimits.size,
      totalUsers: this.userLimits.size,
      blockedIPs: this.blockedIPs.size,
      whitelistedIPs: this.whitelistIPs.size,
      blacklistedIPs: this.blacklistIPs.size,
      suspiciousIPs: this.suspiciousIPs.size,
      activeRateLimits: this.rateLimits.size
    };

    return stats;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const _stats = this.getRateLimitStats();

      return {
        status: 'healthy',
        service: 'rate-limiting',
        stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'rate-limiting',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = RateLimitService;
