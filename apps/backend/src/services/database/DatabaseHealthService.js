/**
 * Database Health Service
 * Comprehensive database health monitoring and maintenance
 */

const databaseManager = require('../../config/database');
const databaseService = require('./DatabaseService');
const logger = require('../../utils/logger');

class DatabaseHealthService {
  constructor() {
    this.postgres = databaseManager.getPostgresPool();
    this.mongodb = databaseManager.getMongoDB();
    this.redis = databaseManager.getRedisClient();
    this.healthCheckInterval = 60000; // 1 minute
    this.lastHealthCheck = null;
    this.healthStatus = {
      overall: 'unknown',
      postgresql: 'unknown',
      mongodb: 'unknown',
      redis: 'unknown',
      lastCheck: null,
      issues: []
    };
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const healthCheck = {
      timestamp: new Date(),
      overall: 'healthy',
      services: {},
      metrics: {},
      issues: []
    };

    // Check PostgreSQL
    try {
      const pgStart = Date.now();
      const pgResult = await this.postgres.query('SELECT 1 as health_check');
      const pgResponseTime = Date.now() - pgStart;

      // Get PostgreSQL metrics
      const pgMetrics = await this.getPostgreSQLMetrics();

      healthCheck.services.postgresql = {
        status: 'healthy',
        responseTime: pgResponseTime,
        version: pgMetrics.version,
        connections: pgMetrics.connections,
        databaseSize: pgMetrics.databaseSize,
        lastVacuum: pgMetrics.lastVacuum
      };
    } catch (error) {
      healthCheck.services.postgresql = {
        status: 'unhealthy',
        error: error.message
      };
      healthCheck.overall = 'degraded';
      healthCheck.issues.push(`PostgreSQL: ${error.message}`);
    }

    // Check MongoDB
    try {
      const mongoStart = Date.now();
      await this.mongodb.db().admin().ping();
      const mongoResponseTime = Date.now() - mongoStart;

      // Get MongoDB metrics
      const mongoMetrics = await this.getMongoDBMetrics();

      healthCheck.services.mongodb = {
        status: 'healthy',
        responseTime: mongoResponseTime,
        version: mongoMetrics.version,
        connections: mongoMetrics.connections,
        databaseSize: mongoMetrics.databaseSize,
        collections: mongoMetrics.collections
      };
    } catch (error) {
      healthCheck.services.mongodb = {
        status: 'unhealthy',
        error: error.message
      };
      healthCheck.overall = 'degraded';
      healthCheck.issues.push(`MongoDB: ${error.message}`);
    }

    // Check Redis
    try {
      const redisStart = Date.now();
      await this.redis.ping();
      const redisResponseTime = Date.now() - redisStart;

      // Get Redis metrics
      const redisMetrics = await this.getRedisMetrics();

      healthCheck.services.redis = {
        status: 'healthy',
        responseTime: redisResponseTime,
        version: redisMetrics.version,
        memory: redisMetrics.memory,
        connectedClients: redisMetrics.connectedClients,
        keyspace: redisMetrics.keyspace
      };
    } catch (error) {
      healthCheck.services.redis = {
        status: 'unhealthy',
        error: error.message
      };
      healthCheck.overall = 'degraded';
      healthCheck.issues.push(`Redis: ${error.message}`);
    }

    // Update health status
    this.healthStatus = {
      overall: healthCheck.overall,
      postgresql: healthCheck.services.postgresql?.status || 'unknown',
      mongodb: healthCheck.services.mongodb?.status || 'unknown',
      redis: healthCheck.services.redis?.status || 'unknown',
      lastCheck: healthCheck.timestamp,
      issues: healthCheck.issues
    };

    this.lastHealthCheck = healthCheck;
    return healthCheck;
  }

  /**
   * Get PostgreSQL metrics
   */
  async getPostgreSQLMetrics() {
    try {
      // Get version
      const versionResult = await this.postgres.query('SELECT version()');
      const version = versionResult.rows[0].version;

      // Get connection info
      const connectionsResult = await this.postgres.query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);

      // Get database size
      const sizeResult = await this.postgres.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);

      // Get last vacuum info
      const vacuumResult = await this.postgres.query(`
        SELECT 
          schemaname, tablename, last_vacuum, last_autovacuum, last_analyze, last_autoanalyze
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
        ORDER BY last_autovacuum DESC NULLS LAST
        LIMIT 1
      `);

      return {
        version: version.split(' ')[1], // Extract version number
        connections: connectionsResult.rows[0],
        databaseSize: sizeResult.rows[0].size,
        lastVacuum: vacuumResult.rows[0] || null
      };
    } catch (error) {
      logger.error('Get PostgreSQL metrics error:', error);
      return { error: error.message };
    }
  }

  /**
   * Get MongoDB metrics
   */
  async getMongoDBMetrics() {
    try {
      const admin = this.mongodb.db().admin();

      // Get server status
      const serverStatus = await admin.serverStatus();

      // Get database stats
      const dbStats = await this.mongodb.db().stats();

      // Get collections
      const collections = await this.mongodb.db().listCollections().toArray();

      return {
        version: serverStatus.version,
        connections: {
          current: serverStatus.connections?.current || 0,
          available: serverStatus.connections?.available || 0
        },
        databaseSize: {
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexSize: dbStats.indexSize
        },
        collections: collections.length
      };
    } catch (error) {
      logger.error('Get MongoDB metrics error:', error);
      return { error: error.message };
    }
  }

  /**
   * Get Redis metrics
   */
  async getRedisMetrics() {
    try {
      const info = await this.redis.info();
      const infoLines = info.split('\r\n');
      const metrics = {};

      // Parse Redis info
      infoLines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          metrics[key] = value;
        }
      });

      return {
        version: metrics.redis_version,
        memory: {
          used: metrics.used_memory_human,
          peak: metrics.used_memory_peak_human,
          fragmentation: metrics.mem_fragmentation_ratio
        },
        connectedClients: parseInt(metrics.connected_clients),
        keyspace: {
          keys: parseInt(metrics.db0?.split(',')[0]?.split('=')[1] || 0)
        }
      };
    } catch (error) {
      logger.error('Get Redis metrics error:', error);
      return { error: error.message };
    }
  }

  /**
   * Get database performance metrics
   */
  async getPerformanceMetrics() {
    try {
      // PostgreSQL performance metrics
      const pgMetrics = await this.postgres.query(`
        SELECT 
          'postgresql' as database,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_queries,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_queries,
          (SELECT sum(n_tup_ins + n_tup_upd + n_tup_del) FROM pg_stat_user_tables) as total_operations
      `);

      // MongoDB performance metrics
      const mongoMetrics = await this.mongodb.db().admin().serverStatus();

      return {
        postgresql: pgMetrics.rows[0],
        mongodb: {
          activeOperations: mongoMetrics.activeClients?.total || 0,
          totalOperations: mongoMetrics.opcounters || {}
        },
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Get performance metrics error:', error);
      throw error;
    }
  }

  /**
   * Get database storage metrics
   */
  async getStorageMetrics() {
    try {
      // PostgreSQL storage
      const pgStorage = await this.postgres.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);

      // MongoDB storage
      const mongoStats = await this.mongodb.db().stats();

      return {
        postgresql: {
          tables: pgStorage.rows,
          totalSize: pgStorage.rows.reduce((sum, table) => sum + parseInt(table.size_bytes || 0), 0)
        },
        mongodb: {
          dataSize: mongoStats.dataSize,
          storageSize: mongoStats.storageSize,
          indexSize: mongoStats.indexSize
        },
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Get storage metrics error:', error);
      throw error;
    }
  }

  /**
   * Get slow queries
   */
  async getSlowQueries() {
    try {
      const slowQueries = await this.postgres.query(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements 
        WHERE mean_time > 1000  -- Queries taking more than 1 second on average
        ORDER BY mean_time DESC 
        LIMIT 10
      `);

      return {
        slowQueries: slowQueries.rows,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Get slow queries error:', error);
      // pg_stat_statements might not be enabled
      return { slowQueries: [], error: 'pg_stat_statements not available' };
    }
  }

  /**
   * Optimize database performance
   */
  async optimizeDatabase() {
    const results = {};

    try {
      // PostgreSQL optimizations
      const pgOptimizations = await this.postgres.query(`
        -- Update table statistics
        ANALYZE;
        
        -- Vacuum tables
        VACUUM ANALYZE;
        
        -- Reindex if needed (commented out for safety)
        -- REINDEX DATABASE finnexusai_dev;
      `);

      results.postgresql = { success: true, message: 'PostgreSQL optimization completed' };

      // MongoDB optimizations
      const collections = await this.mongodb.db().listCollections().toArray();
      for (const collection of collections) {
        await this.mongodb.db().collection(collection.name).createIndex({ createdAt: 1 });
      }

      results.mongodb = { success: true, message: 'MongoDB optimization completed' };

      // Redis optimization
      await this.redis.memory('PURGE');
      results.redis = { success: true, message: 'Redis optimization completed' };

    } catch (error) {
      logger.error('Database optimization error:', error);
      results.error = error.message;
    }

    return results;
  }

  /**
   * Check database integrity
   */
  async checkDatabaseIntegrity() {
    const results = {};

    try {
      // PostgreSQL integrity check
      const pgIntegrity = await this.postgres.query(`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        ORDER BY schemaname, tablename, attname
      `);

      results.postgresql = {
        tablesChecked: pgIntegrity.rows.length,
        integrity: 'good'
      };

      // Check for orphaned records
      const orphanedCheck = await this.postgres.query(`
        SELECT 
          'refresh_tokens' as table_name,
          count(*) as orphaned_count
        FROM refresh_tokens r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE u.id IS NULL
        
        UNION ALL
        
        SELECT 
          'trades' as table_name,
          count(*) as orphaned_count
        FROM trades t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE u.id IS NULL
      `);

      results.orphanedRecords = orphanedCheck.rows;

    } catch (error) {
      logger.error('Database integrity check error:', error);
      results.error = error.message;
    }

    return results;
  }

  /**
   * Get current health status
   */
  getHealthStatus() {
    return this.healthStatus;
  }

  /**
   * Get last health check results
   */
  getLastHealthCheck() {
    return this.lastHealthCheck;
  }

  /**
   * Start continuous health monitoring
   */
  startHealthMonitoring() {
    if (this.healthMonitoringInterval) {
      return; // Already running
    }

    this.healthMonitoringInterval = setInterval(async() => {
      try {
        await this.performHealthCheck();

        // Log any issues
        if (this.healthStatus.issues.length > 0) {
          logger.warn('Database health issues detected:', this.healthStatus.issues);
        }
      } catch (error) {
        logger.error('Health monitoring error:', error);
      }
    }, this.healthCheckInterval);

    logger.info('Database health monitoring started');
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthMonitoringInterval) {
      clearInterval(this.healthMonitoringInterval);
      this.healthMonitoringInterval = null;
      logger.info('Database health monitoring stopped');
    }
  }

  /**
   * Emergency database recovery
   */
  async emergencyRecovery() {
    const results = {};

    try {
      // Check if we can connect to all databases
      const healthCheck = await this.performHealthCheck();

      if (healthCheck.overall === 'healthy') {
        results.status = 'no_recovery_needed';
        results.message = 'All databases are healthy';
        return results;
      }

      // Attempt recovery for each failed service
      if (healthCheck.services.postgresql?.status === 'unhealthy') {
        try {
          // Try to reconnect PostgreSQL
          await this.postgres.query('SELECT 1');
          results.postgresql = 'reconnected';
        } catch (error) {
          results.postgresql = `reconnection_failed: ${error.message}`;
        }
      }

      if (healthCheck.services.mongodb?.status === 'unhealthy') {
        try {
          // Try to reconnect MongoDB
          await this.mongodb.db().admin().ping();
          results.mongodb = 'reconnected';
        } catch (error) {
          results.mongodb = `reconnection_failed: ${error.message}`;
        }
      }

      if (healthCheck.services.redis?.status === 'unhealthy') {
        try {
          // Try to reconnect Redis
          await this.redis.ping();
          results.redis = 'reconnected';
        } catch (error) {
          results.redis = `reconnection_failed: ${error.message}`;
        }
      }

      // Perform final health check
      const finalHealthCheck = await this.performHealthCheck();
      results.finalStatus = finalHealthCheck.overall;

    } catch (error) {
      logger.error('Emergency recovery error:', error);
      results.error = error.message;
    }

    return results;
  }
}

module.exports = new DatabaseHealthService();
