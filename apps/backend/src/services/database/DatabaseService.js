/**
 * Database Service
 * Centralized database operations and service integrations
 */

const databaseManager = require('../../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class DatabaseService {
  constructor() {
    this.postgres = databaseManager.getPostgresPool();
    this.mongodb = databaseManager.getMongoDB();
    this.redis = databaseManager.getRedisClient();
  }

  /**
   * PostgreSQL Operations
   */
  async postgresQuery(query, params = []) {
    try {
      const result = await this.postgres.query(query, params);
      return result;
    } catch (error) {
      logger.error('PostgreSQL query error:', error);
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  async postgresTransaction(queries) {
    const client = await this.postgres.connect();
    try {
      await client.query('BEGIN');

      const results = [];
      for (const { query, params } of queries) {
        const result = await client.query(query, params);
        results.push(result);
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * MongoDB Operations
   */
  async mongodbFind(collection, filter = {}, options = {}) {
    try {
      const db = this.mongodb.db();
      const result = await db.collection(collection).find(filter, options).toArray();
      return result;
    } catch (error) {
      logger.error('MongoDB find error:', error);
      throw new Error(`MongoDB find failed: ${error.message}`);
    }
  }

  async mongodbFindOne(collection, filter = {}) {
    try {
      const db = this.mongodb.db();
      const result = await db.collection(collection).findOne(filter);
      return result;
    } catch (error) {
      logger.error('MongoDB findOne error:', error);
      throw new Error(`MongoDB findOne failed: ${error.message}`);
    }
  }

  async mongodbInsertOne(collection, document) {
    try {
      const db = this.mongodb.db();
      const result = await db.collection(collection).insertOne({
        ...document,
        _id: document._id || uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return result;
    } catch (error) {
      logger.error('MongoDB insertOne error:', error);
      throw new Error(`MongoDB insertOne failed: ${error.message}`);
    }
  }

  async mongodbUpdateOne(collection, filter, update, options = {}) {
    try {
      const db = this.mongodb.db();
      const result = await db.collection(collection).updateOne(filter, {
        ...update,
        $set: {
          ...update.$set,
          updatedAt: new Date()
        }
      }, options);
      return result;
    } catch (error) {
      logger.error('MongoDB updateOne error:', error);
      throw new Error(`MongoDB updateOne failed: ${error.message}`);
    }
  }

  async mongodbDeleteOne(collection, filter) {
    try {
      const db = this.mongodb.db();
      const result = await db.collection(collection).deleteOne(filter);
      return result;
    } catch (error) {
      logger.error('MongoDB deleteOne error:', error);
      throw new Error(`MongoDB deleteOne failed: ${error.message}`);
    }
  }

  /**
   * Redis Operations
   */
  async redisGet(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      throw new Error(`Redis get failed: ${error.message}`);
    }
  }

  async redisSet(key, value, ttl = null) {
    try {
      const stringValue = JSON.stringify(value);
      if (ttl) {
        await this.redis.setEx(key, ttl, stringValue);
      } else {
        await this.redis.set(key, stringValue);
      }
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      throw new Error(`Redis set failed: ${error.message}`);
    }
  }

  async redisDel(key) {
    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Redis del error:', error);
      throw new Error(`Redis del failed: ${error.message}`);
    }
  }

  async redisExists(key) {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis exists error:', error);
      throw new Error(`Redis exists failed: ${error.message}`);
    }
  }

  async redisExpire(key, ttl) {
    try {
      const result = await this.redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      logger.error('Redis expire error:', error);
      throw new Error(`Redis expire failed: ${error.message}`);
    }
  }

  /**
   * Cross-Database Operations
   */
  async getUserWithCache(userId) {
    const cacheKey = `user:${userId}`;

    // Try Redis cache first
    let user = await this.redisGet(cacheKey);

    if (!user) {
      // Get from PostgreSQL
      const result = await this.postgresQuery(
        'SELECT id, email, first_name, last_name, role, status, is_email_verified, two_factor_enabled, created_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length > 0) {
        user = result.rows[0];
        // Cache for 5 minutes
        await this.redisSet(cacheKey, user, 300);
      }
    }

    return user;
  }

  async getTradingHistory(userId, limit = 100, offset = 0) {
    try {
      // Get from PostgreSQL for transactional data
      const pgResult = await this.postgresQuery(`
        SELECT 
          id, symbol, side, quantity, price, order_type, status, 
          created_at, filled_at, fees, notes
        FROM trades 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      // Get additional analytics from MongoDB
      const analytics = await this.mongodbFindOne('trading_analytics', { userId });

      return {
        trades: pgResult.rows,
        analytics: analytics,
        pagination: {
          limit,
          offset,
          total: pgResult.rows.length
        }
      };
    } catch (error) {
      logger.error('Get trading history error:', error);
      throw error;
    }
  }

  async getPortfolioData(userId) {
    try {
      // Get portfolio assets from PostgreSQL
      const assetsResult = await this.postgresQuery(`
        SELECT 
          id, symbol, quantity, average_price, current_price, 
          value, gain, gain_percent, allocation
        FROM portfolio_assets 
        WHERE user_id = $1
      `, [userId]);

      // Get portfolio analytics from MongoDB
      const analytics = await this.mongodbFindOne('portfolio_analytics', { userId });

      // Get portfolio settings from PostgreSQL
      const settingsResult = await this.postgresQuery(`
        SELECT 
          name, description, risk_tolerance, investment_goal,
          rebalancing_frequency, auto_rebalancing, notifications
        FROM portfolio_settings 
        WHERE user_id = $1
      `, [userId]);

      return {
        assets: assetsResult.rows,
        analytics: analytics,
        settings: settingsResult.rows[0] || {},
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Get portfolio data error:', error);
      throw error;
    }
  }

  async getComplianceData(userId) {
    try {
      // Get KYC data from PostgreSQL
      const kycResult = await this.postgresQuery(`
        SELECT 
          status, level, verification_date, documents, personal_info
        FROM kyc_verifications 
        WHERE user_id = $1 
        ORDER BY verification_date DESC 
        LIMIT 1
      `, [userId]);

      // Get AML checks from MongoDB
      const amlChecks = await this.mongodbFind('aml_checks', { userId }, { sort: { createdAt: -1 }, limit: 10 });

      // Get compliance alerts from PostgreSQL
      const alertsResult = await this.postgresQuery(`
        SELECT 
          id, type, severity, description, status, created_at
        FROM compliance_alerts 
        WHERE user_id = $1 AND status != 'resolved'
        ORDER BY created_at DESC
      `, [userId]);

      return {
        kyc: kycResult.rows[0] || null,
        amlChecks: amlChecks,
        alerts: alertsResult.rows
      };
    } catch (error) {
      logger.error('Get compliance data error:', error);
      throw error;
    }
  }

  async getAuditLogs(userId, limit = 100, offset = 0) {
    try {
      // Get audit logs from PostgreSQL
      const result = await this.postgresQuery(`
        SELECT 
          id, action, resource, timestamp, ip_address, 
          user_agent, success, risk_score, metadata
        FROM audit_logs 
        WHERE user_id = $1 
        ORDER BY timestamp DESC 
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      return {
        logs: result.rows,
        pagination: {
          limit,
          offset,
          total: result.rows.length
        }
      };
    } catch (error) {
      logger.error('Get audit logs error:', error);
      throw error;
    }
  }

  /**
   * Data Migration and Sync Operations
   */
  async syncUserData(userId) {
    try {
      // Get user data from PostgreSQL
      const userResult = await this.postgresQuery(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Sync to MongoDB for analytics
      await this.mongodbUpdateOne(
        'user_profiles',
        { userId: userId },
        {
          $set: {
            userId: userId,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            status: user.status,
            lastSync: new Date()
          }
        },
        { upsert: true }
      );

      // Update Redis cache
      await this.redisSet(`user:${userId}`, user, 300);

      return { success: true, message: 'User data synced successfully' };
    } catch (error) {
      logger.error('Sync user data error:', error);
      throw error;
    }
  }

  async migrateAuditLogsToMongoDB() {
    try {
      // Get recent audit logs from PostgreSQL
      const result = await this.postgresQuery(`
        SELECT * FROM audit_logs 
        WHERE timestamp > NOW() - INTERVAL '30 days'
        ORDER BY timestamp DESC
      `);

      // Batch insert to MongoDB
      const logs = result.rows.map(log => ({
        ...log,
        _id: log.id,
        migratedAt: new Date()
      }));

      if (logs.length > 0) {
        const db = this.mongodb.db();
        await db.collection('audit_logs_archive').insertMany(logs);
      }

      return { success: true, migrated: logs.length };
    } catch (error) {
      logger.error('Migrate audit logs error:', error);
      throw error;
    }
  }

  /**
   * Health Check Operations
   */
  async checkDatabaseHealth() {
    const health = {
      postgresql: { status: 'unknown', responseTime: null, error: null },
      mongodb: { status: 'unknown', responseTime: null, error: null },
      redis: { status: 'unknown', responseTime: null, error: null }
    };

    // Check PostgreSQL
    try {
      const start = Date.now();
      await this.postgresQuery('SELECT 1');
      health.postgresql = {
        status: 'healthy',
        responseTime: Date.now() - start
      };
    } catch (error) {
      health.postgresql = {
        status: 'unhealthy',
        error: error.message
      };
    }

    // Check MongoDB
    try {
      const start = Date.now();
      await this.mongodbFindOne('health_check', {});
      health.mongodb = {
        status: 'healthy',
        responseTime: Date.now() - start
      };
    } catch (error) {
      health.mongodb = {
        status: 'unhealthy',
        error: error.message
      };
    }

    // Check Redis
    try {
      const start = Date.now();
      await this.redis.set('health_check', 'ok', 'EX', 10);
      await this.redis.get('health_check');
      health.redis = {
        status: 'healthy',
        responseTime: Date.now() - start
      };
    } catch (error) {
      health.redis = {
        status: 'unhealthy',
        error: error.message
      };
    }

    return health;
  }

  /**
   * Cleanup Operations
   */
  async cleanupExpiredData() {
    const results = {};

    try {
      // Cleanup expired password resets
      const passwordResets = await this.postgresQuery(
        'DELETE FROM password_reset_requests WHERE expires_at < NOW()'
      );
      results.passwordResets = passwordResets.rowCount;

      // Cleanup expired email verifications
      const emailVerifications = await this.postgresQuery(
        'DELETE FROM email_verifications WHERE expires_at < NOW()'
      );
      results.emailVerifications = emailVerifications.rowCount;

      // Cleanup expired refresh tokens
      const refreshTokens = await this.postgresQuery(
        'DELETE FROM refresh_tokens WHERE expires_at < NOW()'
      );
      results.refreshTokens = refreshTokens.rowCount;

      // Cleanup old audit logs (older than 1 year)
      const auditLogs = await this.postgresQuery(
        'DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL \'1 year\''
      );
      results.auditLogs = auditLogs.rowCount;

    } catch (error) {
      logger.error('Cleanup expired data error:', error);
      results.error = error.message;
    }

    return results;
  }

  /**
   * Backup Operations
   */
  async createDataBackup() {
    try {
      const backupId = uuidv4();
      const timestamp = new Date();

      // Get critical data for backup
      const users = await this.postgresQuery('SELECT * FROM users WHERE status = $1', ['active']);
      const portfolios = await this.postgresQuery('SELECT * FROM portfolio_assets');
      const trades = await this.postgresQuery('SELECT * FROM trades WHERE created_at > NOW() - INTERVAL \'30 days\'');

      const backup = {
        backupId,
        timestamp,
        data: {
          users: users.rows,
          portfolios: portfolios.rows,
          trades: trades.rows
        }
      };

      // Store backup in MongoDB
      await this.mongodbInsertOne('data_backups', backup);

      return {
        success: true,
        backupId,
        timestamp,
        records: users.rows.length + portfolios.rows.length + trades.rows.length
      };
    } catch (error) {
      logger.error('Create data backup error:', error);
      throw error;
    }
  }
}

module.exports = new DatabaseService();
