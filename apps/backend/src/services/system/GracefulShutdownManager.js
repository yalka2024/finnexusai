/**
 * Graceful Shutdown Manager
 * Handles proper application shutdown with cleanup and resource management
 */

const EventEmitter = require('events');
// const fs = require('fs').promises;
// const path = require('path');
const logger = require('../../utils/logger');

class GracefulShutdownManager extends EventEmitter {
  constructor() {
    super();
    this.config = {
      shutdownTimeout: parseInt(process.env.SHUTDOWN_TIMEOUT) || 30000, // 30 seconds
      forceShutdownTimeout: parseInt(process.env.FORCE_SHUTDOWN_TIMEOUT) || 5000, // 5 seconds
      enableGracefulShutdown: process.env.ENABLE_GRACEFUL_SHUTDOWN !== 'false',
      enableHealthChecks: process.env.ENABLE_SHUTDOWN_HEALTH_CHECKS !== 'false',
      enableResourceCleanup: process.env.ENABLE_RESOURCE_CLEANUP !== 'false',
      enableDataPersistence: process.env.ENABLE_SHUTDOWN_DATA_PERSISTENCE !== 'false'
    };

    this.shutdownHandlers = new Map();
    this.cleanupTasks = [];
    this.isShuttingDown = false;
    this.shutdownStartTime = null;
    this.shutdownTimeout = null;
    this.forceShutdownTimeout = null;

    // Shutdown phases
    this.shutdownPhases = {
      INITIATED: 'initiated',
      HEALTH_CHECKS: 'health_checks',
      STOPPING_SERVICES: 'stopping_services',
      CLEANUP_RESOURCES: 'cleanup_resources',
      PERSIST_DATA: 'persist_data',
      CLOSING_CONNECTIONS: 'closing_connections',
      COMPLETED: 'completed',
      FAILED: 'failed'
    };

    this.currentPhase = null;
    this.shutdownLog = [];
  }

  /**
   * Initialize the graceful shutdown manager
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing graceful shutdown manager...');

      // Register default shutdown handlers
      this.registerDefaultHandlers();

      // Set up signal handlers
      this.setupSignalHandlers();

      // Set up process event handlers
      this.setupProcessHandlers();

      logger.info('✅ Graceful shutdown manager initialized successfully');

      return {
        success: true,
        message: 'Graceful shutdown manager initialized successfully',
        config: {
          shutdownTimeout: this.config.shutdownTimeout,
          forceShutdownTimeout: this.config.forceShutdownTimeout,
          gracefulShutdown: this.config.enableGracefulShutdown,
          healthChecks: this.config.enableHealthChecks,
          resourceCleanup: this.config.enableResourceCleanup,
          dataPersistence: this.config.enableDataPersistence
        }
      };

    } catch (error) {
      logger.error('❌ Failed to initialize graceful shutdown manager:', error);
      throw new Error(`Graceful shutdown manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Register default shutdown handlers
   */
  registerDefaultHandlers() {
    // Register shutdown handlers for different components
    this.registerShutdownHandler('database', {
      priority: 1,
      timeout: 10000,
      handler: this.shutdownDatabase.bind(this)
    });

    this.registerShutdownHandler('cache', {
      priority: 2,
      timeout: 5000,
      handler: this.shutdownCache.bind(this)
    });

    this.registerShutdownHandler('external_services', {
      priority: 3,
      timeout: 5000,
      handler: this.shutdownExternalServices.bind(this)
    });

    this.registerShutdownHandler('background_jobs', {
      priority: 4,
      timeout: 10000,
      handler: this.shutdownBackgroundJobs.bind(this)
    });

    this.registerShutdownHandler('monitoring', {
      priority: 5,
      timeout: 3000,
      handler: this.shutdownMonitoring.bind(this)
    });

    this.registerShutdownHandler('logging', {
      priority: 6,
      timeout: 3000,
      handler: this.shutdownLogging.bind(this)
    });
  }

  /**
   * Set up signal handlers
   */
  setupSignalHandlers() {
    // SIGTERM - Termination request
    process.on('SIGTERM', () => {
      this.logShutdown('Received SIGTERM signal');
      this.initiateShutdown('SIGTERM');
    });

    // SIGINT - Interrupt signal (Ctrl+C)
    process.on('SIGINT', () => {
      this.logShutdown('Received SIGINT signal');
      this.initiateShutdown('SIGINT');
    });

    // SIGHUP - Hangup signal
    process.on('SIGHUP', () => {
      this.logShutdown('Received SIGHUP signal');
      this.initiateShutdown('SIGHUP');
    });

    // SIGUSR1 - User-defined signal 1
    process.on('SIGUSR1', () => {
      this.logShutdown('Received SIGUSR1 signal');
      this.initiateShutdown('SIGUSR1');
    });

    // SIGUSR2 - User-defined signal 2
    process.on('SIGUSR2', () => {
      this.logShutdown('Received SIGUSR2 signal');
      this.initiateShutdown('SIGUSR2');
    });
  }

  /**
   * Set up process event handlers
   */
  setupProcessHandlers() {
    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('❌ Uncaught Exception:', error);
      this.logShutdown(`Uncaught exception: ${error.message}`);
      this.initiateShutdown('uncaughtException', error);
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, _promise) => {
      logger.error('❌ Unhandled Rejection:', reason);
      this.logShutdown(`Unhandled rejection: ${reason}`);
      this.initiateShutdown('unhandledRejection', reason);
    });

    // Process exit
    process.on('exit', (code) => {
      this.logShutdown(`Process exiting with code: ${code}`);
    });
  }

  /**
   * Register a shutdown handler
   */
  registerShutdownHandler(name, options) {
    this.shutdownHandlers.set(name, {
      name,
      priority: options.priority || 10,
      timeout: options.timeout || 5000,
      handler: options.handler,
      registeredAt: new Date().toISOString()
    });

    logger.info(`✅ Registered shutdown handler: ${name} (priority: ${options.priority || 10})`);
  }

  /**
   * Unregister a shutdown handler
   */
  unregisterShutdownHandler(name) {
    if (this.shutdownHandlers.has(name)) {
      this.shutdownHandlers.delete(name);
      logger.info(`✅ Unregistered shutdown handler: ${name}`);
    }
  }

  /**
   * Add cleanup task
   */
  addCleanupTask(task) {
    this.cleanupTasks.push({
      ...task,
      addedAt: new Date().toISOString()
    });
  }

  /**
   * Initiate graceful shutdown
   */
  async initiateShutdown(reason, error = null) {
    if (this.isShuttingDown) {
      logger.info('⚠️ Shutdown already in progress, ignoring signal');
      return;
    }

    this.isShuttingDown = true;
    this.shutdownStartTime = Date.now();
    this.currentPhase = this.shutdownPhases.INITIATED;

    logger.info(`🛑 Initiating graceful shutdown (reason: ${reason})`);
    this.logShutdown(`Shutdown initiated - Reason: ${reason}`);

    // Set shutdown timeout
    this.shutdownTimeout = setTimeout(() => {
      logger.warn('⚠️ Shutdown timeout reached, forcing shutdown');
      this.forceShutdown();
    }, this.config.shutdownTimeout);

    // Set force shutdown timeout
    this.forceShutdownTimeout = setTimeout(() => {
      logger.error('❌ Force shutdown timeout reached, exiting immediately');
      process.exit(1);
    }, this.config.shutdownTimeout + this.config.forceShutdownTimeout);

    try {
      // Emit shutdown started event
      this.emit('shutdown:started', {
        reason,
        error,
        startTime: this.shutdownStartTime
      });

      // Execute shutdown phases
      await this.executeShutdownPhases();

      // Complete shutdown
      await this.completeShutdown();

    } catch (shutdownError) {
      logger.error('❌ Error during shutdown:', shutdownError);
      this.logShutdown(`Shutdown failed: ${shutdownError.message}`);

      this.currentPhase = this.shutdownPhases.FAILED;
      this.emit('shutdown:failed', {
        error: shutdownError,
        phase: this.currentPhase
      });

      // Force shutdown on error
      this.forceShutdown();
    }
  }

  /**
   * Execute shutdown phases
   */
  async executeShutdownPhases() {
    // Phase 1: Health checks
    if (this.config.enableHealthChecks) {
      this.currentPhase = this.shutdownPhases.HEALTH_CHECKS;
      await this.performHealthChecks();
    }

    // Phase 2: Stop services
    this.currentPhase = this.shutdownPhases.STOPPING_SERVICES;
    await this.stopServices();

    // Phase 3: Cleanup resources
    if (this.config.enableResourceCleanup) {
      this.currentPhase = this.shutdownPhases.CLEANUP_RESOURCES;
      await this.cleanupResources();
    }

    // Phase 4: Persist data
    if (this.config.enableDataPersistence) {
      this.currentPhase = this.shutdownPhases.PERSIST_DATA;
      await this.persistData();
    }

    // Phase 5: Close connections
    this.currentPhase = this.shutdownPhases.CLOSING_CONNECTIONS;
    await this.closeConnections();
  }

  /**
   * Perform health checks before shutdown
   */
  async performHealthChecks() {
    logger.info('🔍 Performing pre-shutdown health checks...');
    this.logShutdown('Performing health checks');

    try {
      // Check if there are active connections that need to be handled
      const activeConnections = await this.getActiveConnections();
      if (activeConnections > 0) {
        logger.info(`⚠️ Found ${activeConnections} active connections`);
        this.logShutdown(`Active connections found: ${activeConnections}`);
      }

      // Check for pending operations
      const pendingOperations = await this.getPendingOperations();
      if (pendingOperations > 0) {
        logger.info(`⚠️ Found ${pendingOperations} pending operations`);
        this.logShutdown(`Pending operations found: ${pendingOperations}`);
      }

      logger.info('✅ Health checks completed');
      this.logShutdown('Health checks completed successfully');

    } catch (error) {
      logger.error('❌ Health checks failed:', error);
      this.logShutdown(`Health checks failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop services gracefully
   */
  async stopServices() {
    logger.info('🛑 Stopping services...');
    this.logShutdown('Stopping services');

    // Sort handlers by priority (lower number = higher priority)
    const sortedHandlers = Array.from(this.shutdownHandlers.values())
      .sort((a, b) => a.priority - b.priority);

    for (const handler of sortedHandlers) {
      try {
        logger.info(`🔄 Stopping service: ${handler.name}`);
        this.logShutdown(`Stopping service: ${handler.name}`);

        const startTime = Date.now();

        // Execute handler with timeout
        await Promise.race([
          handler.handler(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Handler timeout: ${handler.name}`)), handler.timeout)
          )
        ]);

        const duration = Date.now() - startTime;
        logger.info(`✅ Service stopped: ${handler.name} (${duration}ms)`);
        this.logShutdown(`Service stopped: ${handler.name} (${duration}ms)`);

      } catch (error) {
        logger.error(`❌ Failed to stop service ${handler.name}:`, error);
        this.logShutdown(`Failed to stop service ${handler.name}: ${error.message}`);

        // Continue with other services even if one fails
      }
    }

    logger.info('✅ All services stopped');
    this.logShutdown('All services stopped');
  }

  /**
   * Cleanup resources
   */
  async cleanupResources() {
    logger.info('🧹 Cleaning up resources...');
    this.logShutdown('Cleaning up resources');

    try {
      // Execute cleanup tasks
      for (const task of this.cleanupTasks) {
        try {
          logger.info(`🔄 Executing cleanup task: ${task.name || 'unnamed'}`);
          this.logShutdown(`Executing cleanup task: ${task.name || 'unnamed'}`);

          const startTime = Date.now();
          await task.handler();
          const duration = Date.now() - startTime;

          logger.info(`✅ Cleanup task completed: ${task.name || 'unnamed'} (${duration}ms)`);
          this.logShutdown(`Cleanup task completed: ${task.name || 'unnamed'} (${duration}ms)`);

        } catch (error) {
          logger.error(`❌ Cleanup task failed: ${task.name || 'unnamed'}`, error);
          this.logShutdown(`Cleanup task failed: ${task.name || 'unnamed'}: ${error.message}`);
        }
      }

      logger.info('✅ Resource cleanup completed');
      this.logShutdown('Resource cleanup completed');

    } catch (error) {
      logger.error('❌ Resource cleanup failed:', error);
      this.logShutdown(`Resource cleanup failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Persist data before shutdown
   */
  async persistData() {
    logger.info('💾 Persisting data...');
    this.logShutdown('Persisting data');

    try {
      // Save application state
      await this.saveApplicationState();

      // Save logs
      await this.saveLogs();

      // Save metrics
      await this.saveMetrics();

      logger.info('✅ Data persistence completed');
      this.logShutdown('Data persistence completed');

    } catch (error) {
      logger.error('❌ Data persistence failed:', error);
      this.logShutdown(`Data persistence failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Close connections
   */
  async closeConnections() {
    logger.info('🔌 Closing connections...');
    this.logShutdown('Closing connections');

    try {
      // Close database connections
      await this.closeDatabaseConnections();

      // Close cache connections
      await this.closeCacheConnections();

      // Close external service connections
      await this.closeExternalConnections();

      logger.info('✅ All connections closed');
      this.logShutdown('All connections closed');

    } catch (error) {
      logger.error('❌ Failed to close connections:', error);
      this.logShutdown(`Failed to close connections: ${error.message}`);
      throw error;
    }
  }

  /**
   * Complete shutdown
   */
  async completeShutdown() {
    this.currentPhase = this.shutdownPhases.COMPLETED;
    const shutdownDuration = Date.now() - this.shutdownStartTime;

    logger.info(`✅ Graceful shutdown completed (${shutdownDuration}ms)`);
    this.logShutdown(`Graceful shutdown completed (${shutdownDuration}ms)`);

    // Clear timeouts
    if (this.shutdownTimeout) {
      clearTimeout(this.shutdownTimeout);
    }
    if (this.forceShutdownTimeout) {
      clearTimeout(this.forceShutdownTimeout);
    }

    // Emit shutdown completed event
    this.emit('shutdown:completed', {
      duration: shutdownDuration,
      phase: this.currentPhase,
      log: this.shutdownLog
    });

    // Exit process
    process.exit(0);
  }

  /**
   * Force shutdown
   */
  forceShutdown() {
    logger.error('❌ Force shutdown initiated');
    this.logShutdown('Force shutdown initiated');

    // Clear timeouts
    if (this.shutdownTimeout) {
      clearTimeout(this.shutdownTimeout);
    }
    if (this.forceShutdownTimeout) {
      clearTimeout(this.forceShutdownTimeout);
    }

    // Emit force shutdown event
    this.emit('shutdown:forced', {
      duration: Date.now() - this.shutdownStartTime,
      phase: this.currentPhase
    });

    // Exit immediately
    process.exit(1);
  }

  /**
   * Default shutdown handlers
   */
  async shutdownDatabase() {
    // This would be implemented based on your database setup
    logger.info('🔄 Shutting down database connections...');
    // Implementation would go here
  }

  async shutdownCache() {
    // This would be implemented based on your cache setup
    logger.info('🔄 Shutting down cache connections...');
    // Implementation would go here
  }

  async shutdownExternalServices() {
    // This would be implemented based on your external services
    logger.info('🔄 Shutting down external services...');
    // Implementation would go here
  }

  async shutdownBackgroundJobs() {
    // This would be implemented based on your background job system
    logger.info('🔄 Shutting down background jobs...');
    // Implementation would go here
  }

  async shutdownMonitoring() {
    // This would be implemented based on your monitoring setup
    logger.info('🔄 Shutting down monitoring...');
    // Implementation would go here
  }

  async shutdownLogging() {
    // This would be implemented based on your logging setup
    logger.info('🔄 Shutting down logging...');
    // Implementation would go here
  }

  /**
   * Utility methods
   */
  async getActiveConnections() {
    // Placeholder - would check actual active connections
    return 0;
  }

  async getPendingOperations() {
    // Placeholder - would check actual pending operations
    return 0;
  }

  async saveApplicationState() {
    // Placeholder - would save application state
    logger.info('💾 Saving application state...');
  }

  async saveLogs() {
    // Placeholder - would save logs
    logger.info('💾 Saving logs...');
  }

  async saveMetrics() {
    // Placeholder - would save metrics
    logger.info('💾 Saving metrics...');
  }

  async closeDatabaseConnections() {
    // Placeholder - would close database connections
    logger.info('🔌 Closing database connections...');
  }

  async closeCacheConnections() {
    // Placeholder - would close cache connections
    logger.info('🔌 Closing cache connections...');
  }

  async closeExternalConnections() {
    // Placeholder - would close external connections
    logger.info('🔌 Closing external connections...');
  }

  /**
   * Log shutdown events
   */
  logShutdown(message) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      phase: this.currentPhase,
      uptime: process.uptime()
    };

    this.shutdownLog.push(logEntry);
    logger.info(`[SHUTDOWN] ${message}`);
  }

  /**
   * Get shutdown status
   */
  getShutdownStatus() {
    return {
      isShuttingDown: this.isShuttingDown,
      currentPhase: this.currentPhase,
      shutdownStartTime: this.shutdownStartTime,
      shutdownDuration: this.shutdownStartTime ? Date.now() - this.shutdownStartTime : 0,
      registeredHandlers: this.shutdownHandlers.size,
      cleanupTasks: this.cleanupTasks.length,
      log: this.shutdownLog.slice(-10) // Last 10 log entries
    };
  }

  /**
   * Get shutdown log
   */
  getShutdownLog() {
    return this.shutdownLog;
  }
}

module.exports = new GracefulShutdownManager();
