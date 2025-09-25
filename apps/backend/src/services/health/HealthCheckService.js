/**
 * FinAI Nexus - Health Check Service
 *
 * Comprehensive health monitoring for all services and dependencies
 * Provides detailed health status and metrics for monitoring systems
 */

const databaseManager = require('../../config/database');
const { circuitBreakerManager } = require('../resilience/CircuitBreakerService');

class HealthCheckService {
  constructor() {
    this.checks = new Map();
    this.startTime = Date.now();
    this.uptime = 0;
    this.lastCheckTime = null;
    this.healthHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Register a health check function
   */
  registerCheck(name, checkFunction, options = {}) {
    const check = {
      name,
      function: checkFunction,
      critical: options.critical || false,
      timeout: options.timeout || 5000,
      interval: options.interval || 30000, // 30 seconds
      lastCheck: null,
      lastResult: null,
      consecutiveFailures: 0,
      enabled: true
    };

    this.checks.set(name, check);

    // Start periodic checking
    this.startPeriodicCheck(name);

    logger.info(`✅ Health check registered: ${name}`);
  }

  /**
   * Start periodic health check
   */
  startPeriodicCheck(checkName) {
    const check = this.checks.get(checkName);
    if (!check) return;

    const runCheck = async() => {
      if (!check.enabled) return;

      try {
        const result = await this.runSingleCheck(checkName);
        check.lastResult = result;
        check.lastCheck = Date.now();

        if (result.status === 'healthy') {
          check.consecutiveFailures = 0;
        } else {
          check.consecutiveFailures++;
        }
      } catch (error) {
        check.consecutiveFailures++;
        check.lastResult = {
          status: 'error',
          message: error.message,
          timestamp: Date.now()
        };
        check.lastCheck = Date.now();
      }

      // Schedule next check
      setTimeout(runCheck, check.interval);
    };

    // Start first check
    runCheck();
  }

  /**
   * Run a single health check
   */
  async runSingleCheck(checkName) {
    const check = this.checks.get(checkName);
    if (!check) {
      throw new Error(`Health check not found: ${checkName}`);
    }

    const startTime = Date.now();

    try {
      const result = await Promise.race([
        check.function(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), check.timeout)
        )
      ]);

      const duration = Date.now() - startTime;

      return {
        status: 'healthy',
        duration,
        timestamp: Date.now(),
        data: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        status: 'unhealthy',
        duration,
        timestamp: Date.now(),
        error: error.message,
        critical: check.critical
      };
    }
  }

  /**
   * Run all health checks
   */
  async runAllChecks() {
    const results = {};
    const startTime = Date.now();

    // Run all checks in parallel
    const checkPromises = Array.from(this.checks.keys()).map(async(checkName) => {
      try {
        const result = await this.runSingleCheck(checkName);
        results[checkName] = result;
      } catch (error) {
        results[checkName] = {
          status: 'error',
          error: error.message,
          timestamp: Date.now()
        };
      }
    });

    await Promise.allSettled(checkPromises);

    const totalDuration = Date.now() - startTime;
    this.lastCheckTime = Date.now();
    this.uptime = Date.now() - this.startTime;

    // Store in history
    const healthStatus = this.calculateOverallHealth(results);
    this.addToHistory({
      timestamp: Date.now(),
      status: healthStatus,
      checks: results,
      duration: totalDuration
    });

    return {
      status: healthStatus,
      checks: results,
      duration: totalDuration,
      timestamp: Date.now(),
      uptime: this.uptime
    };
  }

  /**
   * Calculate overall health status
   */
  calculateOverallHealth(checks) {
    let hasCriticalFailures = false;
    let hasFailures = false;

    for (const [checkName, result] of Object.entries(checks)) {
      const check = this.checks.get(checkName);

      if (result.status === 'unhealthy' || result.status === 'error') {
        if (check && check.critical) {
          hasCriticalFailures = true;
        } else {
          hasFailures = true;
        }
      }
    }

    if (hasCriticalFailures) {
      return 'critical';
    } else if (hasFailures) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Add health status to history
   */
  addToHistory(healthStatus) {
    this.healthHistory.push(healthStatus);

    // Keep only recent history
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get detailed health report
   */
  async getHealthReport() {
    const healthData = await this.runAllChecks();

    return {
      ...healthData,
      system: {
        uptime: this.uptime,
        startTime: this.startTime,
        lastCheck: this.lastCheckTime,
        totalChecks: this.checks.size,
        history: this.healthHistory.slice(-10) // Last 10 checks
      },
      circuitBreakers: circuitBreakerManager.getAllHealth(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };
  }

  /**
   * Get quick health status
   */
  async getQuickHealth() {
    const criticalChecks = Array.from(this.checks.entries())
      .filter(([_, check]) => check.critical)
      .map(([name, _]) => name);

    const results = {};

    for (const checkName of criticalChecks) {
      try {
        results[checkName] = await this.runSingleCheck(checkName);
      } catch (error) {
        results[checkName] = {
          status: 'error',
          error: error.message,
          timestamp: Date.now()
        };
      }
    }

    const status = this.calculateOverallHealth(results);

    return {
      status,
      checks: results,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Enable/disable a health check
   */
  toggleCheck(checkName, enabled) {
    const check = this.checks.get(checkName);
    if (check) {
      check.enabled = enabled;
      logger.info(`${enabled ? 'Enabled' : 'Disabled'} health check: ${checkName}`);
    }
  }

  /**
   * Remove a health check
   */
  removeCheck(checkName) {
    if (this.checks.has(checkName)) {
      this.checks.delete(checkName);
      logger.info(`Removed health check: ${checkName}`);
    }
  }

  /**
   * Get health check statistics
   */
  getStats() {
    const stats = {
      totalChecks: this.checks.size,
      enabledChecks: 0,
      disabledChecks: 0,
      criticalChecks: 0,
      healthyChecks: 0,
      unhealthyChecks: 0,
      totalFailures: 0
    };

    for (const [_, check] of this.checks) {
      if (check.enabled) {
        stats.enabledChecks++;
      } else {
        stats.disabledChecks++;
      }

      if (check.critical) {
        stats.criticalChecks++;
      }

      if (check.lastResult) {
        if (check.lastResult.status === 'healthy') {
          stats.healthyChecks++;
        } else {
          stats.unhealthyChecks++;
        }
      }

      stats.totalFailures += check.consecutiveFailures;
    }

    return stats;
  }
}

// Create singleton instance
const healthCheckService = new HealthCheckService();

// Register default health checks
healthCheckService.registerCheck('database', async() => {
  const health = await databaseManager.healthCheck();
  if (!health.postgres) {
    throw new Error('PostgreSQL is not healthy');
  }
  return health;
}, { critical: true, timeout: 3000 });

healthCheckService.registerCheck('memory', async() => {
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memUsage.heapTotal / 1024 / 1024;

  // Alert if heap usage is over 80%
  if ((heapUsedMB / heapTotalMB) > 0.8) {
    throw new Error(`High memory usage: ${Math.round(heapUsedMB)}MB / ${Math.round(heapTotalMB)}MB`);
  }

  return {
    heapUsed: heapUsedMB,
    heapTotal: heapTotalMB,
    external: memUsage.external / 1024 / 1024,
    rss: memUsage.rss / 1024 / 1024
  };
}, { critical: false, timeout: 1000 });

healthCheckService.registerCheck('disk', async() => {
  const fs = require('fs');
  const path = require('path');

  try {
    // Check if we can write to temp directory
    const tempFile = path.join(require('os').tmpdir(), 'health-check-test');
    fs.writeFileSync(tempFile, 'health-check');
    fs.unlinkSync(tempFile);

    return { status: 'writable' };
  } catch (error) {
    throw new Error(`Disk write test failed: ${error.message}`);
  }
}, { critical: true, timeout: 2000 });

healthCheckService.registerCheck('external-api', async() => {
  // Check external API connectivity (example)
  const axios = require('axios');
  const logger = require('../../utils/logger');
  const response = await axios.get('https://httpbin.org/status/200', { timeout: 5000 });

  if (response.status !== 200) {
    throw new Error(`External API returned status: ${response.status}`);
  }

  return { status: response.status };
}, { critical: false, timeout: 5000 });

module.exports = {
  HealthCheckService,
  healthCheckService
};


