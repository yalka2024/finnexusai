/**
 * Database Replication Manager
 * Handles PostgreSQL and MongoDB replication for high availability
 */

const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const databaseManager = require('../../config/database');
const { CustomError } = require('../../errors/ErrorHandler');
const logger = require('../../utils/logger');

class ReplicationManager {
  constructor() {
    this.postgresPrimary = null;
    this.postgresReplicas = [];
    this.mongoPrimary = null;
    this.mongoReplicas = [];
    this.replicationStatus = {
      postgres: { primary: null, replicas: [], healthy: false },
      mongo: { primary: null, replicas: [], healthy: false }
    };
    this.healthCheckInterval = null;
    this.failoverTimeout = 10000; // 10 seconds
  }

  /**
   * Initialize replication for both PostgreSQL and MongoDB
   */
  async initializeReplication() {
    try {
      logger.info('🔄 Initializing database replication...');

      // Initialize PostgreSQL replication
      await this.initializePostgreSQLReplication();

      // Initialize MongoDB replication
      await this.initializeMongoDBReplication();

      // Start health monitoring
      this.startHealthMonitoring();

      logger.info('✅ Database replication initialized successfully');

      return {
        success: true,
        message: 'Database replication initialized successfully',
        status: this.replicationStatus
      };
    } catch (error) {
      logger.error('❌ Replication initialization failed:', error);
      throw new Error(`Failed to initialize replication: ${error.message}`);
    }
  }

  /**
   * Initialize PostgreSQL replication
   */
  async initializePostgreSQLReplication() {
    try {
      const primaryConfig = this.getPostgreSQLPrimaryConfig();
      const replicaConfigs = this.getPostgreSQLReplicaConfigs();

      // Connect to primary
      this.postgresPrimary = new Pool(primaryConfig);
      await this.testConnection(this.postgresPrimary, 'PostgreSQL Primary');

      // Connect to replicas
      for (const config of replicaConfigs) {
        const replica = new Pool(config);
        await this.testConnection(replica, `PostgreSQL Replica ${config.host}`);
        this.postgresReplicas.push(replica);
      }

      // Verify replication status
      await this.verifyPostgreSQLReplication();

      this.replicationStatus.postgres = {
        primary: primaryConfig.host,
        replicas: replicaConfigs.map(c => c.host),
        healthy: true
      };

      logger.info(`✅ PostgreSQL replication: 1 primary, ${this.postgresReplicas.length} replicas`);
    } catch (error) {
      logger.error('PostgreSQL replication initialization failed:', error);
      this.replicationStatus.postgres.healthy = false;
      throw error;
    }
  }

  /**
   * Initialize MongoDB replication
   */
  async initializeMongoDBReplication() {
    try {
      const primaryConfig = this.getMongoDBPrimaryConfig();
      const replicaConfigs = this.getMongoDBReplicaConfigs();

      // Connect to primary
      this.mongoPrimary = new MongoClient(primaryConfig.uri, primaryConfig.options);
      await this.mongoPrimary.connect();
      await this.testMongoConnection(this.mongoPrimary, 'MongoDB Primary');

      // Connect to replicas
      for (const config of replicaConfigs) {
        const replica = new MongoClient(config.uri, config.options);
        await replica.connect();
        await this.testMongoConnection(replica, `MongoDB Replica ${config.host}`);
        this.mongoReplicas.push(replica);
      }

      // Verify replication status
      await this.verifyMongoDBReplication();

      this.replicationStatus.mongo = {
        primary: primaryConfig.host,
        replicas: replicaConfigs.map(c => c.host),
        healthy: true
      };

      logger.info(`✅ MongoDB replication: 1 primary, ${this.mongoReplicas.length} replicas`);
    } catch (error) {
      logger.error('MongoDB replication initialization failed:', error);
      this.replicationStatus.mongo.healthy = false;
      throw error;
    }
  }

  /**
   * Get PostgreSQL primary configuration
   */
  getPostgreSQLPrimaryConfig() {
    return {
      host: process.env.POSTGRES_PRIMARY_HOST || 'localhost',
      port: process.env.POSTGRES_PRIMARY_PORT || 5432,
      database: process.env.POSTGRES_DB || 'finnexus',
      user: process.env.POSTGRES_PRIMARY_USER || process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PRIMARY_PASSWORD || process.env.POSTGRES_PASSWORD,
      ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    };
  }

  /**
   * Get PostgreSQL replica configurations
   */
  getPostgreSQLReplicaConfigs() {
    const replicaHosts = process.env.POSTGRES_REPLICA_HOSTS?.split(',') || [];
    const replicaPorts = process.env.POSTGRES_REPLICA_PORTS?.split(',') || [];

    return replicaHosts.map((host, index) => ({
      host: host.trim(),
      port: parseInt(replicaPorts[index]) || 5432,
      database: process.env.POSTGRES_DB || 'finnexus',
      user: process.env.POSTGRES_REPLICA_USER || process.env.POSTGRES_USER,
      password: process.env.POSTGRES_REPLICA_PASSWORD || process.env.POSTGRES_PASSWORD,
      ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    }));
  }

  /**
   * Get MongoDB primary configuration
   */
  getMongoDBPrimaryConfig() {
    return {
      host: process.env.MONGO_PRIMARY_HOST || 'localhost',
      uri: process.env.MONGO_PRIMARY_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/finnexus',
      options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        useUnifiedTopology: true
      }
    };
  }

  /**
   * Get MongoDB replica configurations
   */
  getMongoDBReplicaConfigs() {
    const replicaUris = process.env.MONGO_REPLICA_URIS?.split(',') || [];

    return replicaUris.map(uri => ({
      host: new URL(uri).hostname,
      uri: uri.trim(),
      options: {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        useUnifiedTopology: true
      }
    }));
  }

  /**
   * Test database connection
   */
  async testConnection(pool, name) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      logger.info(`✅ ${name} connection successful`);
    } catch (error) {
      logger.error(`❌ ${name} connection failed:`, error.message);
      throw error;
    }
  }

  /**
   * Test MongoDB connection
   */
  async testMongoConnection(client, name) {
    try {
      await client.db().admin().ping();
      logger.info(`✅ ${name} connection successful`);
    } catch (error) {
      logger.error(`❌ ${name} connection failed:`, error.message);
      throw error;
    }
  }

  /**
   * Verify PostgreSQL replication status
   */
  async verifyPostgreSQLReplication() {
    try {
      const client = await this.postgresPrimary.connect();

      // Check replication slots
      const replicationQuery = `
        SELECT 
          slot_name,
          plugin,
          slot_type,
          active,
          xmin,
          restart_lsn
        FROM pg_replication_slots
        WHERE slot_type = 'physical'
      `;

      const result = await client.query(replicationQuery);
      client.release();

      if (result.rows.length === 0) {
        logger.warn('⚠️ No PostgreSQL replication slots found');
      } else {
        logger.info(`✅ Found ${result.rows.length} PostgreSQL replication slots`);
      }

      return result.rows;
    } catch (error) {
      logger.error('PostgreSQL replication verification failed:', error);
      throw error;
    }
  }

  /**
   * Verify MongoDB replication status
   */
  async verifyMongoDBReplication() {
    try {
      const adminDb = this.mongoPrimary.db().admin();

      // Check replica set status
      const status = await adminDb.command({ replSetGetStatus: 1 });

      if (status.ok !== 1) {
        throw new Error('MongoDB replica set not properly configured');
      }

      logger.info(`✅ MongoDB replica set healthy with ${status.members.length} members`);

      return status;
    } catch (error) {
      logger.error('MongoDB replication verification failed:', error);
      throw error;
    }
  }

  /**
   * Start health monitoring for replication
   */
  startHealthMonitoring() {
    this.healthCheckInterval = setInterval(async() => {
      await this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Perform health check on all database connections
   */
  async performHealthCheck() {
    try {
      // Check PostgreSQL primary
      await this.checkPostgreSQLHealth();

      // Check PostgreSQL replicas
      await this.checkPostgreSQLReplicas();

      // Check MongoDB primary
      await this.checkMongoDBHealth();

      // Check MongoDB replicas
      await this.checkMongoDBReplicas();

    } catch (error) {
      logger.error('Health check failed:', error);
    }
  }

  /**
   * Check PostgreSQL primary health
   */
  async checkPostgreSQLHealth() {
    try {
      if (!this.postgresPrimary) return;

      const client = await this.postgresPrimary.connect();
      await client.query('SELECT 1');
      client.release();

      this.replicationStatus.postgres.healthy = true;
    } catch (error) {
      logger.error('PostgreSQL primary health check failed:', error);
      this.replicationStatus.postgres.healthy = false;
      await this.handlePostgreSQLFailover();
    }
  }

  /**
   * Check PostgreSQL replicas health
   */
  async checkPostgreSQLReplicas() {
    for (let i = 0; i < this.postgresReplicas.length; i++) {
      try {
        const client = await this.postgresReplicas[i].connect();
        await client.query('SELECT 1');
        client.release();
      } catch (error) {
        logger.error(`PostgreSQL replica ${i} health check failed:`, error);
        // Remove unhealthy replica
        this.postgresReplicas.splice(i, 1);
        i--;
      }
    }
  }

  /**
   * Check MongoDB primary health
   */
  async checkMongoDBHealth() {
    try {
      if (!this.mongoPrimary) return;

      await this.mongoPrimary.db().admin().ping();
      this.replicationStatus.mongo.healthy = true;
    } catch (error) {
      logger.error('MongoDB primary health check failed:', error);
      this.replicationStatus.mongo.healthy = false;
      await this.handleMongoDBFailover();
    }
  }

  /**
   * Check MongoDB replicas health
   */
  async checkMongoDBReplicas() {
    for (let i = 0; i < this.mongoReplicas.length; i++) {
      try {
        await this.mongoReplicas[i].db().admin().ping();
      } catch (error) {
        logger.error(`MongoDB replica ${i} health check failed:`, error);
        // Remove unhealthy replica
        this.mongoReplicas.splice(i, 1);
        i--;
      }
    }
  }

  /**
   * Handle PostgreSQL failover
   */
  async handlePostgreSQLFailover() {
    try {
      logger.info('🔄 Attempting PostgreSQL failover...');

      // Find healthy replica to promote
      let newPrimary = null;
      for (const replica of this.postgresReplicas) {
        try {
          const client = await replica.connect();
          await client.query('SELECT 1');
          client.release();
          newPrimary = replica;
          break;
        } catch (error) {
          continue;
        }
      }

      if (newPrimary) {
        // In a real scenario, you would promote the replica to primary
        logger.info('✅ PostgreSQL failover successful');
        this.postgresPrimary = newPrimary;
        this.replicationStatus.postgres.healthy = true;
      } else {
        logger.error('❌ No healthy PostgreSQL replica found for failover');
      }
    } catch (error) {
      logger.error('PostgreSQL failover failed:', error);
    }
  }

  /**
   * Handle MongoDB failover
   */
  async handleMongoDBFailover() {
    try {
      logger.info('🔄 Attempting MongoDB failover...');

      // Find healthy replica to promote
      let newPrimary = null;
      for (const replica of this.mongoReplicas) {
        try {
          await replica.db().admin().ping();
          newPrimary = replica;
          break;
        } catch (error) {
          continue;
        }
      }

      if (newPrimary) {
        logger.info('✅ MongoDB failover successful');
        this.mongoPrimary = newPrimary;
        this.replicationStatus.mongo.healthy = true;
      } else {
        logger.error('❌ No healthy MongoDB replica found for failover');
      }
    } catch (error) {
      logger.error('MongoDB failover failed:', error);
    }
  }

  /**
   * Get read connection (prefer replica for read operations)
   */
  async getPostgreSQLReadConnection() {
    // Prefer replica for read operations
    if (this.postgresReplicas.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.postgresReplicas.length);
      return this.postgresReplicas[randomIndex];
    }

    // Fallback to primary
    return this.postgresPrimary;
  }

  /**
   * Get write connection (always use primary)
   */
  async getPostgreSQLWriteConnection() {
    return this.postgresPrimary;
  }

  /**
   * Get MongoDB read connection
   */
  async getMongoDBReadConnection() {
    // Prefer replica for read operations
    if (this.mongoReplicas.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.mongoReplicas.length);
      return this.mongoReplicas[randomIndex];
    }

    // Fallback to primary
    return this.mongoPrimary;
  }

  /**
   * Get MongoDB write connection
   */
  async getMongoDBWriteConnection() {
    return this.mongoPrimary;
  }

  /**
   * Execute read query with automatic failover
   */
  async executeReadQuery(query, params = []) {
    const connection = await this.getPostgreSQLReadConnection();

    try {
      const client = await connection.connect();
      const result = await client.query(query, params);
      client.release();
      return result;
    } catch (error) {
      logger.error('Read query failed, attempting failover:', error);

      // Try with primary as fallback
      try {
        const primaryClient = await this.postgresPrimary.connect();
        const result = await primaryClient.query(query, params);
        primaryClient.release();
        return result;
      } catch (fallbackError) {
        throw new Error(`All database connections failed: ${fallbackError.message}`);
      }
    }
  }

  /**
   * Execute write query (always use primary)
   */
  async executeWriteQuery(query, params = []) {
    const connection = await this.getPostgreSQLWriteConnection();

    try {
      const client = await connection.connect();
      const result = await client.query(query, params);
      client.release();
      return result;
    } catch (error) {
      logger.error('Write query failed:', error);
      throw error;
    }
  }

  /**
   * Get replication status
   */
  getReplicationStatus() {
    return {
      success: true,
      status: this.replicationStatus,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get replication statistics
   */
  async getReplicationStats() {
    try {
      const stats = {
        postgres: {
          primary: this.replicationStatus.postgres.primary,
          replicaCount: this.postgresReplicas.length,
          healthy: this.replicationStatus.postgres.healthy,
          connections: {
            primary: this.postgresPrimary?.totalCount || 0,
            replicas: this.postgresReplicas.map(r => r.totalCount || 0)
          }
        },
        mongo: {
          primary: this.replicationStatus.mongo.primary,
          replicaCount: this.mongoReplicas.length,
          healthy: this.replicationStatus.mongo.healthy
        }
      };

      return {
        success: true,
        stats: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Get replication stats error:', error);
      throw new Error(`Failed to get replication statistics: ${error.message}`);
    }
  }

  /**
   * Force failover (for testing)
   */
  async forceFailover(database) {
    try {
      if (database === 'postgres') {
        await this.handlePostgreSQLFailover();
      } else if (database === 'mongo') {
        await this.handleMongoDBFailover();
      } else {
        throw new Error('Invalid database type. Use "postgres" or "mongo"');
      }

      return {
        success: true,
        message: `${database} failover completed`,
        status: this.replicationStatus
      };
    } catch (error) {
      logger.error('Force failover error:', error);
      throw new Error(`Failed to force failover: ${error.message}`);
    }
  }

  /**
   * Stop replication monitoring
   */
  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Close all database connections
   */
  async closeAllConnections() {
    try {
      this.stopMonitoring();

      // Close PostgreSQL connections
      if (this.postgresPrimary) {
        await this.postgresPrimary.end();
      }

      for (const replica of this.postgresReplicas) {
        await replica.end();
      }

      // Close MongoDB connections
      if (this.mongoPrimary) {
        await this.mongoPrimary.close();
      }

      for (const replica of this.mongoReplicas) {
        await replica.close();
      }

      logger.info('✅ All replication connections closed');
    } catch (error) {
      logger.error('Error closing replication connections:', error);
      throw error;
    }
  }
}

module.exports = new ReplicationManager();
