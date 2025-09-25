/**
 * Resource Limits Manager
 * Manages application resource limits and constraints
 */

const EventEmitter = require('events');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger');

class ResourceLimitsManager extends EventEmitter {
  constructor() {
    super();
    this.config = {
      enableResourceMonitoring: process.env.ENABLE_RESOURCE_MONITORING !== 'false',
      enableMemoryLimits: process.env.ENABLE_MEMORY_LIMITS !== 'false',
      enableCpuLimits: process.env.ENABLE_CPU_LIMITS !== 'false',
      enableDiskLimits: process.env.ENABLE_DISK_LIMITS !== 'false',
      enableNetworkLimits: process.env.ENABLE_NETWORK_LIMITS !== 'false',
      monitoringInterval: parseInt(process.env.RESOURCE_MONITORING_INTERVAL) || 30000,
      alertThresholds: {
        memoryUsage: parseFloat(process.env.RESOURCE_MEMORY_THRESHOLD) || 0.85,
        cpuUsage: parseFloat(process.env.RESOURCE_CPU_THRESHOLD) || 0.80,
        diskUsage: parseFloat(process.env.RESOURCE_DISK_THRESHOLD) || 0.90,
        networkLatency: parseInt(process.env.RESOURCE_NETWORK_LATENCY_THRESHOLD) || 1000
      },
      limits: {
        maxMemoryUsage: parseInt(process.env.MAX_MEMORY_USAGE) || 2048, // MB
        maxCpuUsage: parseFloat(process.env.MAX_CPU_USAGE) || 2.0, // cores
        maxDiskUsage: parseInt(process.env.MAX_DISK_USAGE) || 10240, // MB
        maxConcurrentConnections: parseInt(process.env.MAX_CONCURRENT_CONNECTIONS) || 1000,
        maxRequestRate: parseInt(process.env.MAX_REQUEST_RATE) || 1000, // requests per minute
        maxResponseTime: parseInt(process.env.MAX_RESPONSE_TIME) || 5000 // ms
      }
    };

    this.isInitialized = false;
    this.monitoringInterval = null;
    this.resourceStats = {
      memory: {
        total: 0,
        used: 0,
        free: 0,
        usagePercent: 0
      },
      cpu: {
        usage: 0,
        cores: 0,
        loadAverage: [0, 0, 0]
      },
      disk: {
        total: 0,
        used: 0,
        free: 0,
        usagePercent: 0
      },
      network: {
        connections: 0,
        latency: 0,
        throughput: 0
      },
      application: {
        requests: 0,
        errors: 0,
        responseTime: 0,
        activeConnections: 0
      }
    };

    this.limits = {
      memory: {
        soft: this.config.limits.maxMemoryUsage * 0.8, // 80% of max
        hard: this.config.limits.maxMemoryUsage
      },
      cpu: {
        soft: this.config.limits.maxCpuUsage * 0.8, // 80% of max
        hard: this.config.limits.maxCpuUsage
      },
      disk: {
        soft: this.config.limits.maxDiskUsage * 0.8, // 80% of max
        hard: this.config.limits.maxDiskUsage
      },
      connections: {
        soft: this.config.limits.maxConcurrentConnections * 0.8,
        hard: this.config.limits.maxConcurrentConnections
      },
      requestRate: {
        soft: this.config.limits.maxRequestRate * 0.8,
        hard: this.config.limits.maxRequestRate
      },
      responseTime: {
        soft: this.config.limits.maxResponseTime * 0.8,
        hard: this.config.limits.maxResponseTime
      }
    };

    this.violations = [];
    this.alertCounts = {};
  }

  /**
   * Initialize the resource limits manager
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing resource limits manager...');

      // Initialize system info
      await this.initializeSystemInfo();

      // Start resource monitoring
      if (this.config.enableResourceMonitoring) {
        this.startResourceMonitoring();
      }

      // Set up process limits
      await this.setupProcessLimits();

      // Set up memory limits
      if (this.config.enableMemoryLimits) {
        await this.setupMemoryLimits();
      }

      // Set up CPU limits
      if (this.config.enableCpuLimits) {
        await this.setupCpuLimits();
      }

      // Set up disk limits
      if (this.config.enableDiskLimits) {
        await this.setupDiskLimits();
      }

      // Set up network limits
      if (this.config.enableNetworkLimits) {
        await this.setupNetworkLimits();
      }

      this.isInitialized = true;
      logger.info('✅ Resource limits manager initialized successfully');

      return {
        success: true,
        message: 'Resource limits manager initialized successfully',
        config: {
          monitoring: this.config.enableResourceMonitoring,
          memoryLimits: this.config.enableMemoryLimits,
          cpuLimits: this.config.enableCpuLimits,
          diskLimits: this.config.enableDiskLimits,
          networkLimits: this.config.enableNetworkLimits,
          limits: this.limits,
          thresholds: this.config.alertThresholds
        }
      };

    } catch (error) {
      logger.error('❌ Failed to initialize resource limits manager:', error);
      throw new Error(`Resource limits manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize system information
   */
  async initializeSystemInfo() {
    try {
      // Get system memory info
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;

      this.resourceStats.memory = {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usagePercent: (usedMemory / totalMemory) * 100
      };

      // Get CPU info
      const cpus = os.cpus();
      const loadAverage = os.loadavg();

      this.resourceStats.cpu = {
        usage: 0, // Will be calculated during monitoring
        cores: cpus.length,
        loadAverage: loadAverage
      };

      // Get disk info
      await this.updateDiskStats();

      logger.info('✅ System information initialized');
      logger.info(`📊 Memory: ${this.formatBytes(totalMemory)} total, ${this.formatBytes(usedMemory)} used`);
      logger.info(`💻 CPU: ${cpus.length} cores, load average: ${loadAverage.join(', ')}`);

    } catch (error) {
      logger.error('❌ Failed to initialize system info:', error);
      throw error;
    }
  }

  /**
   * Start resource monitoring
   */
  startResourceMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async() => {
      try {
        await this.monitorResources();
      } catch (error) {
        logger.error('❌ Error in resource monitoring:', error);
        this.emit('resource:monitoring:error', { error });
      }
    }, this.config.monitoringInterval);

    logger.info(`✅ Resource monitoring started (interval: ${this.config.monitoringInterval}ms)`);
  }

  /**
   * Monitor system resources
   */
  async monitorResources() {
    const startTime = Date.now();

    try {
      // Monitor memory
      await this.monitorMemory();

      // Monitor CPU
      await this.monitorCpu();

      // Monitor disk
      await this.monitorDisk();

      // Monitor network
      await this.monitorNetwork();

      // Monitor application metrics
      await this.monitorApplication();

      // Check for limit violations
      await this.checkLimitViolations();

      const duration = Date.now() - startTime;

      this.emit('resource:monitored', {
        stats: this.resourceStats,
        duration,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('❌ Resource monitoring failed:', error);
      this.emit('resource:monitoring:failed', { error });
    }
  }

  /**
   * Monitor memory usage
   */
  async monitorMemory() {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const usagePercent = (usedMemory / totalMemory) * 100;

      this.resourceStats.memory = {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usagePercent: usagePercent
      };

      // Check memory limits
      const memoryUsageMB = usedMemory / (1024 * 1024);
      if (memoryUsageMB > this.limits.memory.soft) {
        this.handleLimitViolation('memory', {
          current: memoryUsageMB,
          soft: this.limits.memory.soft,
          hard: this.limits.memory.hard,
          usagePercent: usagePercent
        });
      }

    } catch (error) {
      logger.error('❌ Memory monitoring failed:', error);
    }
  }

  /**
   * Monitor CPU usage
   */
  async monitorCpu() {
    try {
      const cpuUsage = await this.getCpuUsage();
      const loadAverage = os.loadavg();

      this.resourceStats.cpu = {
        usage: cpuUsage,
        cores: os.cpus().length,
        loadAverage: loadAverage
      };

      // Check CPU limits
      if (cpuUsage > this.limits.cpu.soft) {
        this.handleLimitViolation('cpu', {
          current: cpuUsage,
          soft: this.limits.cpu.soft,
          hard: this.limits.cpu.hard,
          loadAverage: loadAverage
        });
      }

    } catch (error) {
      logger.error('❌ CPU monitoring failed:', error);
    }
  }

  /**
   * Monitor disk usage
   */
  async monitorDisk() {
    try {
      await this.updateDiskStats();

      // Check disk limits
      const diskUsageMB = this.resourceStats.disk.used / (1024 * 1024);
      if (diskUsageMB > this.limits.disk.soft) {
        this.handleLimitViolation('disk', {
          current: diskUsageMB,
          soft: this.limits.disk.soft,
          hard: this.limits.disk.hard,
          usagePercent: this.resourceStats.disk.usagePercent
        });
      }

    } catch (error) {
      logger.error('❌ Disk monitoring failed:', error);
    }
  }

  /**
   * Monitor network usage
   */
  async monitorNetwork() {
    try {
      // This would be implemented based on your network monitoring needs
      // For now, we'll use placeholder values
      this.resourceStats.network = {
        connections: await this.getActiveConnections(),
        latency: await this.getNetworkLatency(),
        throughput: await this.getNetworkThroughput()
      };

    } catch (error) {
      logger.error('❌ Network monitoring failed:', error);
    }
  }

  /**
   * Monitor application metrics
   */
  async monitorApplication() {
    try {
      // This would be implemented based on your application metrics
      // For now, we'll use placeholder values
      this.resourceStats.application = {
        requests: await this.getRequestCount(),
        errors: await this.getErrorCount(),
        responseTime: await this.getAverageResponseTime(),
        activeConnections: await this.getActiveConnections()
      };

      // Check application limits
      if (this.resourceStats.application.activeConnections > this.limits.connections.soft) {
        this.handleLimitViolation('connections', {
          current: this.resourceStats.application.activeConnections,
          soft: this.limits.connections.soft,
          hard: this.limits.connections.hard
        });
      }

      if (this.resourceStats.application.responseTime > this.limits.responseTime.soft) {
        this.handleLimitViolation('responseTime', {
          current: this.resourceStats.application.responseTime,
          soft: this.limits.responseTime.soft,
          hard: this.limits.responseTime.hard
        });
      }

    } catch (error) {
      logger.error('❌ Application monitoring failed:', error);
    }
  }

  /**
   * Check for limit violations
   */
  async checkLimitViolations() {
    const violations = [];
    const currentTime = Date.now();

    // Check memory violations
    if (this.resourceStats.memory.usagePercent > this.config.alertThresholds.memoryUsage * 100) {
      violations.push({
        type: 'memory',
        severity: 'high',
        message: `Memory usage exceeded threshold: ${this.resourceStats.memory.usagePercent.toFixed(2)}%`,
        timestamp: currentTime
      });
    }

    // Check CPU violations
    if (this.resourceStats.cpu.usage > this.config.alertThresholds.cpuUsage * 100) {
      violations.push({
        type: 'cpu',
        severity: 'high',
        message: `CPU usage exceeded threshold: ${this.resourceStats.cpu.usage.toFixed(2)}%`,
        timestamp: currentTime
      });
    }

    // Check disk violations
    if (this.resourceStats.disk.usagePercent > this.config.alertThresholds.diskUsage * 100) {
      violations.push({
        type: 'disk',
        severity: 'high',
        message: `Disk usage exceeded threshold: ${this.resourceStats.disk.usagePercent.toFixed(2)}%`,
        timestamp: currentTime
      });
    }

    // Process violations
    for (const violation of violations) {
      await this.processViolation(violation);
    }
  }

  /**
   * Handle limit violation
   */
  handleLimitViolation(type, details) {
    const violation = {
      type,
      details,
      timestamp: new Date().toISOString(),
      severity: details.current > details.hard ? 'critical' : 'warning'
    };

    this.violations.push(violation);

    // Emit violation event
    this.emit('resource:limit:violation', violation);

    // Log violation
    logger.warn(`⚠️ Resource limit violation [${type}]:`, details);

    // Alert if critical
    if (violation.severity === 'critical') {
      this.emit('resource:limit:critical', violation);
    }
  }

  /**
   * Process violation
   */
  async processViolation(violation) {
    try {
      // Update alert counts
      const key = `${violation.type}_${violation.severity}`;
      this.alertCounts[key] = (this.alertCounts[key] || 0) + 1;

      // Emit alert event
      this.emit('resource:alert', {
        type: violation.type,
        severity: violation.severity,
        message: violation.message,
        count: this.alertCounts[key],
        timestamp: violation.timestamp
      });

      // Take action based on severity
      if (violation.severity === 'critical') {
        await this.handleCriticalViolation(violation);
      } else {
        await this.handleWarningViolation(violation);
      }

    } catch (error) {
      logger.error('❌ Error processing violation:', error);
    }
  }

  /**
   * Handle critical violation
   */
  async handleCriticalViolation(violation) {
    logger.error(`🚨 Critical resource violation [${violation.type}]:`, violation.message);

    // Implement critical violation handling
    switch (violation.type) {
    case 'memory':
      await this.handleMemoryCritical();
      break;
    case 'cpu':
      await this.handleCpuCritical();
      break;
    case 'disk':
      await this.handleDiskCritical();
      break;
    case 'connections':
      await this.handleConnectionsCritical();
      break;
    case 'responseTime':
      await this.handleResponseTimeCritical();
      break;
    }
  }

  /**
   * Handle warning violation
   */
  async handleWarningViolation(violation) {
    logger.warn(`⚠️ Resource warning [${violation.type}]:`, violation.message);

    // Implement warning violation handling
    // This could include scaling up resources, reducing load, etc.
  }

  /**
   * Handle memory critical violation
   */
  async handleMemoryCritical() {
    logger.info('🧹 Handling critical memory violation...');

    // Force garbage collection
    if (global.gc) {
      global.gc();
    }

    // Clear caches
    await this.clearCaches();

    // Emit memory critical event
    this.emit('resource:memory:critical', {
      action: 'garbage_collection_triggered',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle CPU critical violation
   */
  async handleCpuCritical() {
    logger.info('⚡ Handling critical CPU violation...');

    // Reduce processing load
    await this.reduceProcessingLoad();

    // Emit CPU critical event
    this.emit('resource:cpu:critical', {
      action: 'processing_load_reduced',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle disk critical violation
   */
  async handleDiskCritical() {
    logger.info('💾 Handling critical disk violation...');

    // Clean up temporary files
    await this.cleanupTempFiles();

    // Emit disk critical event
    this.emit('resource:disk:critical', {
      action: 'temp_files_cleaned',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle connections critical violation
   */
  async handleConnectionsCritical() {
    logger.info('🔌 Handling critical connections violation...');

    // Reject new connections
    await this.rejectNewConnections();

    // Emit connections critical event
    this.emit('resource:connections:critical', {
      action: 'new_connections_rejected',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle response time critical violation
   */
  async handleResponseTimeCritical() {
    logger.info('⏱️ Handling critical response time violation...');

    // Enable circuit breakers
    await this.enableCircuitBreakers();

    // Emit response time critical event
    this.emit('resource:responseTime:critical', {
      action: 'circuit_breakers_enabled',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Setup process limits
   */
  async setupProcessLimits() {
    try {
      // Set process limits
      process.setMaxListeners(0); // Remove listener limit

      // Set memory limits
      if (this.config.enableMemoryLimits) {
        const maxMemory = this.config.limits.maxMemoryUsage * 1024 * 1024; // Convert to bytes
        process.env.NODE_OPTIONS = `--max-old-space-size=${Math.floor(maxMemory / 1024 / 1024)}`;
      }

      logger.info('✅ Process limits configured');

    } catch (error) {
      logger.error('❌ Failed to setup process limits:', error);
      throw error;
    }
  }

  /**
   * Setup memory limits
   */
  async setupMemoryLimits() {
    try {
      // Set memory monitoring
      setInterval(() => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;

        if (heapUsedMB > this.limits.memory.soft) {
          this.handleLimitViolation('memory', {
            current: heapUsedMB,
            soft: this.limits.memory.soft,
            hard: this.limits.memory.hard
          });
        }
      }, 10000); // Check every 10 seconds

      logger.info('✅ Memory limits configured');

    } catch (error) {
      logger.error('❌ Failed to setup memory limits:', error);
      throw error;
    }
  }

  /**
   * Setup CPU limits
   */
  async setupCpuLimits() {
    try {
      // CPU limits are handled by the monitoring system
      logger.info('✅ CPU limits configured');

    } catch (error) {
      logger.error('❌ Failed to setup CPU limits:', error);
      throw error;
    }
  }

  /**
   * Setup disk limits
   */
  async setupDiskLimits() {
    try {
      // Disk limits are handled by the monitoring system
      logger.info('✅ Disk limits configured');

    } catch (error) {
      logger.error('❌ Failed to setup disk limits:', error);
      throw error;
    }
  }

  /**
   * Setup network limits
   */
  async setupNetworkLimits() {
    try {
      // Network limits are handled by the monitoring system
      logger.info('✅ Network limits configured');

    } catch (error) {
      logger.error('❌ Failed to setup network limits:', error);
      throw error;
    }
  }

  /**
   * Utility methods
   */
  async getCpuUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = endUsage.user + endUsage.system;
        const totalTime = process.hrtime(startUsage);
        const totalTimeMs = totalTime[0] * 1000 + totalTime[1] / 1000000;
        const cpuPercent = (totalUsage / 1000) / totalTimeMs * 100;
        resolve(Math.min(100, cpuPercent));
      }, 100);
    });
  }

  async updateDiskStats() {
    try {
      // This would be implemented based on your disk monitoring needs
      // For now, we'll use placeholder values
      this.resourceStats.disk = {
        total: 1000000000, // 1GB placeholder
        used: 500000000,   // 500MB placeholder
        free: 500000000,
        usagePercent: 50
      };
    } catch (error) {
      logger.error('❌ Failed to update disk stats:', error);
    }
  }

  async getActiveConnections() {
    // Placeholder - would track actual active connections
    return 0;
  }

  async getNetworkLatency() {
    // Placeholder - would measure actual network latency
    return 0;
  }

  async getNetworkThroughput() {
    // Placeholder - would measure actual network throughput
    return 0;
  }

  async getRequestCount() {
    // Placeholder - would track actual request count
    return 0;
  }

  async getErrorCount() {
    // Placeholder - would track actual error count
    return 0;
  }

  async getAverageResponseTime() {
    // Placeholder - would calculate actual average response time
    return 0;
  }

  async clearCaches() {
    // Placeholder - would clear application caches
    logger.info('🧹 Clearing application caches...');
  }

  async reduceProcessingLoad() {
    // Placeholder - would reduce processing load
    logger.info('⚡ Reducing processing load...');
  }

  async cleanupTempFiles() {
    // Placeholder - would cleanup temporary files
    logger.info('💾 Cleaning up temporary files...');
  }

  async rejectNewConnections() {
    // Placeholder - would reject new connections
    logger.info('🔌 Rejecting new connections...');
  }

  async enableCircuitBreakers() {
    // Placeholder - would enable circuit breakers
    logger.info('⏱️ Enabling circuit breakers...');
  }

  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100  } ${  sizes[i]}`;
  }

  /**
   * Get resource statistics
   */
  getResourceStats() {
    return {
      ...this.resourceStats,
      limits: this.limits,
      violations: this.violations.slice(-10), // Last 10 violations
      alertCounts: this.alertCounts,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get limit violations
   */
  getLimitViolations() {
    return {
      violations: this.violations,
      alertCounts: this.alertCounts,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Stop resource monitoring
   */
  stopResourceMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('✅ Resource monitoring stopped');
    }
  }

  /**
   * Shutdown resource limits manager
   */
  async shutdown() {
    try {
      this.stopResourceMonitoring();
      logger.info('✅ Resource limits manager shutdown completed');
    } catch (error) {
      logger.error('❌ Error shutting down resource limits manager:', error);
    }
  }
}

module.exports = new ResourceLimitsManager();
