/**
 * Database Query Performance Monitor
 * Comprehensive monitoring and analysis of database query performance
 */

const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class QueryPerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    this.config = {
      postgresUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/fin_nexus_ai',
      mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/finnexusai',
      monitoringInterval: parseInt(process.env.QUERY_MONITORING_INTERVAL) || 60000, // 1 minute
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000, // 1 second
      verySlowQueryThreshold: parseInt(process.env.VERY_SLOW_QUERY_THRESHOLD) || 5000, // 5 seconds
      maxQueriesPerLog: parseInt(process.env.MAX_QUERIES_PER_LOG) || 1000,
      enableQueryLogging: process.env.ENABLE_QUERY_LOGGING !== 'false',
      enableSlowQueryLogging: process.env.ENABLE_SLOW_QUERY_LOGGING !== 'false',
      enableQueryAnalysis: process.env.ENABLE_QUERY_ANALYSIS !== 'false',
      enableIndexRecommendations: process.env.ENABLE_INDEX_RECOMMENDATIONS !== 'false',
      logsDir: path.join(__dirname, '..', '..', 'logs', 'query-performance')
    };

    this.postgres = null;
    this.mongodb = null;
    this.monitoringInterval = null;
    this.queryStats = new Map();
    this.slowQueries = [];
    this.indexRecommendations = [];

    // Performance metrics
    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      verySlowQueries: 0,
      averageQueryTime: 0,
      queriesPerSecond: 0,
      topSlowQueries: [],
      topFrequentQueries: [],
      indexUsage: new Map(),
      tableStats: new Map()
    };

    // Query patterns for analysis
    this.queryPatterns = {
      select: /^SELECT/i,
      insert: /^INSERT/i,
      update: /^UPDATE/i,
      delete: /^DELETE/i,
      create: /^CREATE/i,
      drop: /^DROP/i,
      alter: /^ALTER/i
    };
  }

  /**
   * Initialize the query performance monitor
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing query performance monitor...');

      // Initialize database connections
      await this.initializeConnections();

      // Create logs directory
      await this.createLogsDirectory();

      // Set up query monitoring
      await this.setupQueryMonitoring();

      // Start performance monitoring
      this.startMonitoring();

      logger.info('✅ Query performance monitor initialized successfully');

      return {
        success: true,
        message: 'Query performance monitor initialized successfully',
        config: {
          monitoringInterval: this.config.monitoringInterval,
          slowQueryThreshold: this.config.slowQueryThreshold,
          verySlowQueryThreshold: this.config.verySlowQueryThreshold,
          enableQueryLogging: this.config.enableQueryLogging,
          enableSlowQueryLogging: this.config.enableSlowQueryLogging,
          enableQueryAnalysis: this.config.enableQueryAnalysis,
          enableIndexRecommendations: this.config.enableIndexRecommendations
        }
      };

    } catch (error) {
      logger.error('❌ Failed to initialize query performance monitor:', error);
      throw new Error(`Query performance monitor initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize database connections
   */
  async initializeConnections() {
    // PostgreSQL connection
    this.postgres = new Pool({
      connectionString: this.config.postgresUrl,
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    // MongoDB connection
    this.mongodb = new MongoClient(this.config.mongoUrl);
    await this.mongodb.connect();
  }

  /**
   * Create logs directory
   */
  async createLogsDirectory() {
    try {
      await fs.mkdir(this.config.logsDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Set up query monitoring
   */
  async setupQueryMonitoring() {
    try {
      // Enable PostgreSQL query logging
      await this.enablePostgresQueryLogging();

      // Set up MongoDB profiling
      await this.enableMongoProfiling();

      // Create performance monitoring tables
      await this.createMonitoringTables();

    } catch (error) {
      logger.warn('⚠️ Could not set up query monitoring:', error.message);
    }
  }

  /**
   * Enable PostgreSQL query logging
   */
  async enablePostgresQueryLogging() {
    try {
      const client = await this.postgres.connect();

      // Enable query statistics
      await client.query('CREATE EXTENSION IF NOT EXISTS pg_stat_statements;');

      // Create query performance view
      await client.query(`
        CREATE OR REPLACE VIEW query_performance AS
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements
        ORDER BY mean_time DESC;
      `);

      // Create slow queries view
      await client.query(`
        CREATE OR REPLACE VIEW slow_queries AS
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows,
          last_exec
        FROM pg_stat_statements
        WHERE mean_time > ${this.config.slowQueryThreshold}
        ORDER BY mean_time DESC;
      `);

      client.release();
      logger.info('✅ PostgreSQL query logging enabled');
    } catch (error) {
      logger.warn('⚠️ Could not enable PostgreSQL query logging:', error.message);
    }
  }

  /**
   * Enable MongoDB profiling
   */
  async enableMongoProfiling() {
    try {
      const db = this.mongodb.db();

      // Set profiling level to log slow operations
      await db.command({
        profile: 1,
        slowms: this.config.slowQueryThreshold
      });

      logger.info('✅ MongoDB profiling enabled');
    } catch (error) {
      logger.warn('⚠️ Could not enable MongoDB profiling:', error.message);
    }
  }

  /**
   * Create monitoring tables
   */
  async createMonitoringTables() {
    try {
      const client = await this.postgres.connect();

      // Create query performance log table
      await client.query(`
        CREATE TABLE IF NOT EXISTS query_performance_log (
          id SERIAL PRIMARY KEY,
          query_hash VARCHAR(64) NOT NULL,
          query_text TEXT NOT NULL,
          execution_time_ms INTEGER NOT NULL,
          rows_returned INTEGER,
          rows_affected INTEGER,
          query_type VARCHAR(20),
          table_name VARCHAR(255),
          database_name VARCHAR(255),
          user_name VARCHAR(255),
          application_name VARCHAR(255),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_slow BOOLEAN DEFAULT FALSE,
          is_very_slow BOOLEAN DEFAULT FALSE,
          error_message TEXT
        );
      `);

      // Create index recommendations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS index_recommendations (
          id SERIAL PRIMARY KEY,
          table_name VARCHAR(255) NOT NULL,
          column_name VARCHAR(255) NOT NULL,
          recommendation_type VARCHAR(50) NOT NULL,
          reason TEXT NOT NULL,
          estimated_benefit VARCHAR(100),
          priority INTEGER DEFAULT 5,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) DEFAULT 'pending'
        );
      `);

      // Create indexes for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_query_performance_log_timestamp 
        ON query_performance_log(timestamp);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_query_performance_log_execution_time 
        ON query_performance_log(execution_time_ms);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_query_performance_log_slow 
        ON query_performance_log(is_slow);
      `);

      client.release();
      logger.info('✅ Monitoring tables created');
    } catch (error) {
      logger.warn('⚠️ Could not create monitoring tables:', error.message);
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async() => {
      try {
        await this.collectPerformanceMetrics();
        await this.analyzeSlowQueries();
        await this.generateIndexRecommendations();
        await this.cleanupOldLogs();
      } catch (error) {
        logger.error('❌ Error in performance monitoring:', error);
        this.emit('monitoring:error', { error });
      }
    }, this.config.monitoringInterval);

    logger.info(`✅ Performance monitoring started (interval: ${this.config.monitoringInterval}ms)`);
  }

  /**
   * Collect performance metrics
   */
  async collectPerformanceMetrics() {
    try {
      // Collect PostgreSQL metrics
      await this.collectPostgresMetrics();

      // Collect MongoDB metrics
      await this.collectMongoMetrics();

      // Update aggregated metrics
      this.updateAggregatedMetrics();

      this.emit('metrics:collected', { metrics: this.metrics });

    } catch (error) {
      logger.error('❌ Error collecting performance metrics:', error);
      throw error;
    }
  }

  /**
   * Collect PostgreSQL metrics
   */
  async collectPostgresMetrics() {
    try {
      const client = await this.postgres.connect();

      // Get query performance statistics
      const queryStats = await client.query(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows,
          hit_percent
        FROM query_performance
        LIMIT 100;
      `);

      // Get slow queries
      const slowQueries = await client.query(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM slow_queries
        LIMIT 50;
      `);

      // Get table statistics
      const tableStats = await client.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins,
          n_tup_upd,
          n_tup_del,
          n_live_tup,
          n_dead_tup,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC;
      `);

      // Get index usage statistics
      const indexStats = await client.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch,
          idx_scan
        FROM pg_stat_user_indexes
        WHERE idx_scan > 0
        ORDER BY idx_scan DESC;
      `);

      client.release();

      // Process and store metrics
      this.processPostgresMetrics({
        queryStats: queryStats.rows,
        slowQueries: slowQueries.rows,
        tableStats: tableStats.rows,
        indexStats: indexStats.rows
      });

    } catch (error) {
      logger.error('❌ Error collecting PostgreSQL metrics:', error);
    }
  }

  /**
   * Collect MongoDB metrics
   */
  async collectMongoMetrics() {
    try {
      const db = this.mongodb.db();

      // Get profiling data
      const profilingData = await db.collection('system.profile')
        .find({})
        .sort({ ts: -1 })
        .limit(100)
        .toArray();

      // Get collection statistics
      const collections = await db.listCollections().toArray();
      const collectionStats = [];

      for (const collection of collections) {
        if (collection.name.startsWith('system.')) continue;

        const stats = await db.collection(collection.name).stats();
        collectionStats.push({
          name: collection.name,
          count: stats.count,
          size: stats.size,
          avgObjSize: stats.avgObjSize,
          storageSize: stats.storageSize,
          totalIndexSize: stats.totalIndexSize,
          indexes: stats.indexSizes
        });
      }

      // Process and store metrics
      this.processMongoMetrics({
        profilingData,
        collectionStats
      });

    } catch (error) {
      logger.error('❌ Error collecting MongoDB metrics:', error);
    }
  }

  /**
   * Process PostgreSQL metrics
   */
  processPostgresMetrics(data) {
    // Update query statistics
    data.queryStats.forEach(query => {
      const queryHash = this.hashQuery(query.query);

      if (!this.queryStats.has(queryHash)) {
        this.queryStats.set(queryHash, {
          query: query.query,
          calls: 0,
          totalTime: 0,
          averageTime: 0,
          rows: 0,
          hitPercent: 0,
          lastSeen: new Date()
        });
      }

      const stats = this.queryStats.get(queryHash);
      stats.calls += query.calls;
      stats.totalTime += query.total_time;
      stats.averageTime = query.mean_time;
      stats.rows += query.rows;
      stats.hitPercent = query.hit_percent;
      stats.lastSeen = new Date();
    });

    // Update slow queries
    data.slowQueries.forEach(query => {
      this.slowQueries.push({
        query: query.query,
        executionTime: query.mean_time,
        calls: query.calls,
        timestamp: new Date(),
        database: 'postgres'
      });
    });

    // Update table statistics
    data.tableStats.forEach(table => {
      const key = `${table.schemaname}.${table.tablename}`;
      this.metrics.tableStats.set(key, {
        schema: table.schemaname,
        table: table.tablename,
        inserts: table.n_tup_ins,
        updates: table.n_tup_upd,
        deletes: table.n_tup_del,
        liveTuples: table.n_live_tup,
        deadTuples: table.n_dead_tup,
        lastVacuum: table.last_vacuum,
        lastAnalyze: table.last_analyze
      });
    });

    // Update index usage
    data.indexStats.forEach(index => {
      const key = `${index.schemaname}.${index.tablename}.${index.indexname}`;
      this.metrics.indexUsage.set(key, {
        schema: index.schemaname,
        table: index.tablename,
        index: index.indexname,
        scans: index.idx_scan,
        tuplesRead: index.idx_tup_read,
        tuplesFetched: index.idx_tup_fetch
      });
    });
  }

  /**
   * Process MongoDB metrics
   */
  processMongoMetrics(data) {
    // Process profiling data
    data.profilingData.forEach(profile => {
      if (profile.duration > this.config.slowQueryThreshold) {
        this.slowQueries.push({
          query: profile.command,
          executionTime: profile.duration,
          timestamp: new Date(profile.ts),
          database: 'mongodb',
          collection: profile.ns
        });
      }
    });

    // Process collection statistics
    data.collectionStats.forEach(collection => {
      this.metrics.tableStats.set(collection.name, {
        table: collection.name,
        count: collection.count,
        size: collection.size,
        avgObjSize: collection.avgObjSize,
        storageSize: collection.storageSize,
        totalIndexSize: collection.totalIndexSize,
        indexes: collection.indexes
      });
    });
  }

  /**
   * Update aggregated metrics
   */
  updateAggregatedMetrics() {
    // Calculate total queries
    this.metrics.totalQueries = Array.from(this.queryStats.values())
      .reduce((total, stats) => total + stats.calls, 0);

    // Calculate slow queries
    this.metrics.slowQueries = this.slowQueries.filter(q =>
      q.executionTime > this.config.slowQueryThreshold &&
      q.executionTime <= this.config.verySlowQueryThreshold
    ).length;

    this.metrics.verySlowQueries = this.slowQueries.filter(q =>
      q.executionTime > this.config.verySlowQueryThreshold
    ).length;

    // Calculate average query time
    const totalTime = Array.from(this.queryStats.values())
      .reduce((total, stats) => total + stats.totalTime, 0);

    this.metrics.averageQueryTime = this.metrics.totalQueries > 0 ?
      totalTime / this.metrics.totalQueries : 0;

    // Get top slow queries
    this.metrics.topSlowQueries = this.slowQueries
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    // Get top frequent queries
    this.metrics.topFrequentQueries = Array.from(this.queryStats.values())
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10);
  }

  /**
   * Analyze slow queries
   */
  async analyzeSlowQueries() {
    if (!this.config.enableSlowQueryLogging) return;

    const recentSlowQueries = this.slowQueries.filter(q =>
      Date.now() - q.timestamp.getTime() < this.config.monitoringInterval * 2
    );

    for (const query of recentSlowQueries) {
      await this.analyzeQuery(query);
    }

    // Log slow queries
    if (recentSlowQueries.length > 0) {
      await this.logSlowQueries(recentSlowQueries);
    }
  }

  /**
   * Analyze individual query
   */
  async analyzeQuery(query) {
    try {
      // Log query to database
      if (this.config.enableQueryLogging) {
        await this.logQueryToDatabase(query);
      }

      // Generate recommendations
      if (this.config.enableIndexRecommendations) {
        await this.generateQueryRecommendations(query);
      }

      // Emit slow query event
      this.emit('slowQuery', {
        query: query.query,
        executionTime: query.executionTime,
        database: query.database,
        timestamp: query.timestamp
      });

    } catch (error) {
      logger.error('❌ Error analyzing query:', error);
    }
  }

  /**
   * Log query to database
   */
  async logQueryToDatabase(query) {
    try {
      const client = await this.postgres.connect();

      await client.query(`
        INSERT INTO query_performance_log (
          query_hash, query_text, execution_time_ms, rows_returned,
          query_type, table_name, database_name, is_slow, is_very_slow
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        this.hashQuery(query.query),
        query.query.substring(0, 1000), // Limit query text length
        query.executionTime,
        query.rows || 0,
        this.getQueryType(query.query),
        this.extractTableName(query.query),
        query.database,
        query.executionTime > this.config.slowQueryThreshold,
        query.executionTime > this.config.verySlowQueryThreshold
      ]);

      client.release();
    } catch (error) {
      logger.error('❌ Error logging query to database:', error);
    }
  }

  /**
   * Generate index recommendations
   */
  async generateIndexRecommendations() {
    if (!this.config.enableIndexRecommendations) return;

    try {
      const client = await this.postgres.connect();

      // Analyze missing indexes
      const missingIndexes = await client.query(`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats
        WHERE schemaname = 'public'
        AND n_distinct > 100
        AND correlation < 0.1
        ORDER BY n_distinct DESC;
      `);

      for (const index of missingIndexes.rows) {
        await this.addIndexRecommendation({
          table: `${index.schemaname}.${index.tablename}`,
          column: index.attname,
          type: 'missing_index',
          reason: `High cardinality column with low correlation (${index.n_distinct} distinct values)`,
          priority: this.calculateIndexPriority(index.n_distinct)
        });
      }

      // Analyze unused indexes
      const unusedIndexes = await client.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          pg_size_pretty(pg_relation_size(indexrelid)) as size
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        AND schemaname = 'public';
      `);

      for (const index of unusedIndexes.rows) {
        await this.addIndexRecommendation({
          table: `${index.schemaname}.${index.tablename}`,
          column: index.indexname,
          type: 'unused_index',
          reason: `Index has never been used (${index.size})`,
          priority: 3 // Lower priority for unused indexes
        });
      }

      client.release();
    } catch (error) {
      logger.error('❌ Error generating index recommendations:', error);
    }
  }

  /**
   * Add index recommendation
   */
  async addIndexRecommendation(recommendation) {
    try {
      const client = await this.postgres.connect();

      await client.query(`
        INSERT INTO index_recommendations (
          table_name, column_name, recommendation_type, 
          reason, priority, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (table_name, column_name, recommendation_type) 
        DO UPDATE SET 
          reason = EXCLUDED.reason,
          priority = EXCLUDED.priority,
          created_at = CURRENT_TIMESTAMP
      `, [
        recommendation.table,
        recommendation.column,
        recommendation.type,
        recommendation.reason,
        recommendation.priority,
        'pending'
      ]);

      client.release();

      this.emit('indexRecommendation', recommendation);
    } catch (error) {
      logger.error('❌ Error adding index recommendation:', error);
    }
  }

  /**
   * Log slow queries to file
   */
  async logSlowQueries(queries) {
    try {
      const logFile = path.join(this.config.logsDir, `slow-queries-${new Date().toISOString().split('T')[0]}.json`);
      const logEntry = {
        timestamp: new Date().toISOString(),
        slowQueries: queries.map(q => ({
          query: q.query.substring(0, 500), // Limit query length
          executionTime: q.executionTime,
          database: q.database,
          timestamp: q.timestamp
        }))
      };

      await fs.appendFile(logFile, `${JSON.stringify(logEntry)  }\n`);
    } catch (error) {
      logger.error('❌ Error logging slow queries:', error);
    }
  }

  /**
   * Cleanup old logs
   */
  async cleanupOldLogs() {
    try {
      const files = await fs.readdir(this.config.logsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep logs for 30 days

      for (const file of files) {
        const filePath = path.join(this.config.logsDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          logger.info(`🗑️ Cleaned up old log file: ${file}`);
        }
      }
    } catch (error) {
      logger.error('❌ Error cleaning up old logs:', error);
    }
  }

  /**
   * Utility methods
   */
  hashQuery(query) {
    const crypto = require('crypto');
    const logger = require('../../utils/logger');
    return crypto.createHash('md5').update(query).digest('hex');
  }

  getQueryType(query) {
    for (const [type, pattern] of Object.entries(this.queryPatterns)) {
      if (pattern.test(query)) {
        return type.toUpperCase();
      }
    }
    return 'UNKNOWN';
  }

  extractTableName(query) {
    const patterns = [
      /FROM\s+(\w+)/i,
      /INTO\s+(\w+)/i,
      /UPDATE\s+(\w+)/i,
      /TABLE\s+(\w+)/i
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  calculateIndexPriority(distinctValues) {
    if (distinctValues > 10000) return 1; // High priority
    if (distinctValues > 1000) return 2; // Medium priority
    return 3; // Low priority
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      queryStats: Object.fromEntries(this.queryStats),
      tableStats: Object.fromEntries(this.metrics.tableStats),
      indexUsage: Object.fromEntries(this.metrics.indexUsage),
      slowQueries: this.slowQueries.slice(-100), // Last 100 slow queries
      indexRecommendations: this.indexRecommendations,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get performance report
   */
  async getPerformanceReport() {
    const metrics = this.getMetrics();

    return {
      summary: {
        totalQueries: metrics.totalQueries,
        slowQueries: metrics.slowQueries,
        verySlowQueries: metrics.verySlowQueries,
        averageQueryTime: Math.round(metrics.averageQueryTime * 100) / 100,
        queriesPerSecond: Math.round((metrics.totalQueries / (this.config.monitoringInterval / 1000)) * 100) / 100
      },
      topSlowQueries: metrics.topSlowQueries.slice(0, 10),
      topFrequentQueries: metrics.topFrequentQueries.slice(0, 10),
      indexRecommendations: await this.getIndexRecommendations(),
      tableStats: Object.values(metrics.tableStats).slice(0, 20),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get index recommendations
   */
  async getIndexRecommendations() {
    try {
      const client = await this.postgres.connect();

      const result = await client.query(`
        SELECT * FROM index_recommendations 
        WHERE status = 'pending' 
        ORDER BY priority ASC, created_at DESC 
        LIMIT 20;
      `);

      client.release();
      return result.rows;
    } catch (error) {
      logger.error('❌ Error getting index recommendations:', error);
      return [];
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('✅ Performance monitoring stopped');
    }
  }

  /**
   * Shutdown monitor
   */
  async shutdown() {
    try {
      this.stopMonitoring();

      if (this.postgres) {
        await this.postgres.end();
      }

      if (this.mongodb) {
        await this.mongodb.close();
      }

      logger.info('✅ Query performance monitor shutdown completed');
    } catch (error) {
      logger.error('❌ Error shutting down query performance monitor:', error);
    }
  }
}

module.exports = new QueryPerformanceMonitor();
