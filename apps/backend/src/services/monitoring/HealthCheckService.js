/**
 * Health Check Service
 * Enhanced health monitoring with detailed service status
 */

const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const Redis = require('redis');
const EventEmitter = require('events');
const os = require('os');
const logger = require('../../utils/logger');

class HealthCheckService extends EventEmitter {
  constructor() {
    super();
    this.config = {
      checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 10000
    };

    this.postgres = null;
    this.mongodb = null;
    this.redis = null;
    this.healthInterval = null;
    this.serviceRegistry = new Map();

    this.healthStatus = {
      HEALTHY: 'healthy',
      DEGRADED: 'degraded',
      UNHEALTHY: 'unhealthy',
      UNKNOWN: 'unknown'
    };
  }

  async initialize() {
    try {
      logger.info('🔄 Initializing health check service...');

      await this.initializeConnections();
      await this.registerServices();
      this.startHealthMonitoring();

      logger.info('✅ Health check service initialized successfully');
      return { success: true, message: 'Health check service initialized successfully' };

    } catch (error) {
      logger.error('❌ Failed to initialize health check service:', error);
      throw new Error(`Health check service initialization failed: ${error.message}`);
    }
  }

  async initializeConnections() {
    this.postgres = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/fin_nexus_ai',
      max: 1,
      idleTimeoutMillis: 30000
    });

    this.mongodb = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017/finnexusai');
    await this.mongodb.connect();

    this.redis = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await this.redis.connect();
  }

  async registerServices() {
    this.registerService('postgres', {
      check: this.checkPostgresHealth.bind(this),
      critical: true
    });

    this.registerService('mongodb', {
      check: this.checkMongoHealth.bind(this),
      critical: true
    });

    this.registerService('redis', {
      check: this.checkRedisHealth.bind(this),
      critical: true
    });

    this.registerService('system', {
      check: this.checkSystemHealth.bind(this),
      critical: false
    });
  }

  registerService(name, config) {
    this.serviceRegistry.set(name, {
      ...config,
      name,
      lastCheck: null,
      lastStatus: this.healthStatus.UNKNOWN
    });
  }

  startHealthMonitoring() {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
    }

    this.healthInterval = setInterval(async() => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        logger.error('❌ Error in health monitoring:', error);
      }
    }, this.config.checkInterval);

    logger.info(`✅ Health monitoring started (interval: ${this.config.checkInterval}ms)`);
  }

  async performHealthChecks() {
    const results = {};

    for (const [name, service] of this.serviceRegistry) {
      try {
        const result = await this.checkServiceHealth(name, service);
        results[name] = result;

        service.lastCheck = new Date();
        service.lastStatus = result.status;

      } catch (error) {
        logger.error(`❌ Error checking service ${name}:`, error);
        results[name] = {
          status: this.healthStatus.UNHEALTHY,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    this.emit('health:checked', { results });
  }

  async checkServiceHealth(name, service) {
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        service.check(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), this.config.timeout)
        )
      ]);

      const duration = Date.now() - startTime;

      return {
        status: result.status || this.healthStatus.HEALTHY,
        duration,
        timestamp: new Date().toISOString(),
        details: result.details || {}
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        status: this.healthStatus.UNHEALTHY,
        duration,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  async checkPostgresHealth() {
    const client = await this.postgres.connect();

    try {
      await client.query('SELECT 1');

      const stats = await client.query(`
        SELECT COUNT(*) as total_connections,
               COUNT(*) FILTER (WHERE state = 'active') as active_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);

      return {
        status: this.healthStatus.HEALTHY,
        details: {
          connected: true,
          database: client.database,
          version: client.serverVersion,
          connections: stats.rows[0]
        }
      };

    } finally {
      client.release();
    }
  }

  async checkMongoHealth() {
    try {
      await this.mongodb.db().admin().ping();

      const serverStatus = await this.mongodb.db().admin().serverStatus();
      const dbStats = await this.mongodb.db().stats();

      return {
        status: this.healthStatus.HEALTHY,
        details: {
          connected: true,
          version: serverStatus.version,
          uptime: serverStatus.uptime,
          databaseSize: dbStats.dataSize,
          collectionCount: dbStats.collections
        }
      };

    } catch (error) {
      throw new Error(`MongoDB health check failed: ${error.message}`);
    }
  }

  async checkRedisHealth() {
    try {
      await this.redis.ping();

      const info = await this.redis.info();
      const parsedInfo = this.parseRedisInfo(info);

      return {
        status: this.healthStatus.HEALTHY,
        details: {
          connected: true,
          version: parsedInfo.redis_version,
          uptime: parsedInfo.uptime_in_seconds,
          connectedClients: parsedInfo.connected_clients,
          usedMemory: parsedInfo.used_memory_human
        }
      };

    } catch (error) {
      throw new Error(`Redis health check failed: ${error.message}`);
    }
  }

  async checkSystemHealth() {
    try {
      const memoryUsage = process.memoryUsage();
      const loadAverage = os.loadavg();

      let status = this.healthStatus.HEALTHY;

      if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.85) {
        status = this.healthStatus.DEGRADED;
      }

      return {
        status,
        details: {
          hostname: os.hostname(),
          platform: os.platform(),
          nodeVersion: process.version,
          uptime: process.uptime(),
          memory: {
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            heapUsedPercent: (memoryUsage.heapUsed / memoryUsage.heapTotal * 100).toFixed(2)
          },
          loadAverage: loadAverage
        }
      };

    } catch (error) {
      throw new Error(`System health check failed: ${error.message}`);
    }
  }

  async getHealthStatus() {
    const results = {};

    for (const [name, service] of this.serviceRegistry) {
      try {
        const result = await this.checkServiceHealth(name, service);
        results[name] = result;
      } catch (error) {
        results[name] = {
          status: this.healthStatus.UNHEALTHY,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    return results;
  }

  async getHealthSummary() {
    const results = await this.getHealthStatus();

    const summary = {
      overall: this.healthStatus.HEALTHY,
      timestamp: new Date().toISOString(),
      services: results
    };

    for (const [name, result] of Object.entries(results)) {
      if (result.status === this.healthStatus.UNHEALTHY) {
        summary.overall = this.healthStatus.UNHEALTHY;
        break;
      } else if (result.status === this.healthStatus.DEGRADED && summary.overall === this.healthStatus.HEALTHY) {
        summary.overall = this.healthStatus.DEGRADED;
      }
    }

    return summary;
  }

  parseRedisInfo(info) {
    const parsed = {};
    const lines = info.split('\r\n');

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        parsed[key] = isNaN(value) ? value : parseFloat(value);
      }
    }

    return parsed;
  }

  stopHealthMonitoring() {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
      logger.info('✅ Health monitoring stopped');
    }
  }

  async shutdown() {
    try {
      this.stopHealthMonitoring();

      if (this.postgres) {
        await this.postgres.end();
      }

      if (this.mongodb) {
        await this.mongodb.close();
      }

      if (this.redis) {
        await this.redis.quit();
      }

      logger.info('✅ Health check service shutdown completed');
    } catch (error) {
      logger.error('❌ Error shutting down health check service:', error);
    }
  }
}

module.exports = new HealthCheckService();
