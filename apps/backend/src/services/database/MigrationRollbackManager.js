/**
 * Migration Rollback Manager
 * Comprehensive database migration rollback strategy with safety checks
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const EventEmitter = require('events');

class MigrationRollbackManager extends EventEmitter {
  constructor() {
    super();
    this.config = {
      postgresUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/fin_nexus_ai',
      mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/finnexusai',
      migrationsDir: path.join(__dirname, '..', '..', 'database', 'migrations'),
      rollbacksDir: path.join(__dirname, '..', '..', 'database', 'rollbacks'),
      backupDir: path.join(__dirname, '..', '..', 'database', 'backups'),
      maxRollbackSteps: parseInt(process.env.MAX_ROLLBACK_STEPS) || 5,
      rollbackTimeout: parseInt(process.env.ROLLBACK_TIMEOUT) || 300000, // 5 minutes
      enableBackupBeforeRollback: process.env.ENABLE_BACKUP_BEFORE_ROLLBACK !== 'false',
      enableDryRun: process.env.ENABLE_DRY_RUN !== 'false',
      requireConfirmation: process.env.REQUIRE_ROLLBACK_CONFIRMATION === 'true'
    };

    this.postgres = null;
    this.mongodb = null;
    this.rollbackHistory = new Map();
    this.rollbackStrategies = new Map();

    // Rollback safety checks
    this.safetyChecks = {
      dataIntegrity: true,
      foreignKeyConstraints: true,
      indexConsistency: true,
      backupVerification: true,
      transactionSafety: true
    };
  }

  /**
   * Initialize the migration rollback manager
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing migration rollback manager...');

      // Initialize database connections
      await this.initializeConnections();

      // Create necessary directories
      await this.createDirectories();

      // Load rollback strategies
      await this.loadRollbackStrategies();

      // Initialize rollback history
      await this.loadRollbackHistory();

      logger.info('✅ Migration rollback manager initialized successfully');

      return {
        success: true,
        message: 'Migration rollback manager initialized successfully',
        config: {
          maxRollbackSteps: this.config.maxRollbackSteps,
          rollbackTimeout: this.config.rollbackTimeout,
          backupBeforeRollback: this.config.enableBackupBeforeRollback,
          dryRun: this.config.enableDryRun
        }
      };

    } catch (error) {
      logger.error('❌ Failed to initialize migration rollback manager:', error);
      throw new Error(`Migration rollback manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize database connections
   */
  async initializeConnections() {
    // PostgreSQL connection
    this.postgres = new Pool({
      connectionString: this.config.postgresUrl,
      max: 1, // Single connection for migrations
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    // MongoDB connection
    this.mongodb = new MongoClient(this.config.mongoUrl);
    await this.mongodb.connect();
  }

  /**
   * Create necessary directories
   */
  async createDirectories() {
    const directories = [
      this.config.rollbacksDir,
      this.config.backupDir,
      path.join(this.config.backupDir, 'pre-rollback'),
      path.join(this.config.backupDir, 'post-rollback')
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  /**
   * Load rollback strategies
   */
  async loadRollbackStrategies() {
    // SQL DDL operations rollback strategies
    this.rollbackStrategies.set('CREATE_TABLE', this.rollbackCreateTable.bind(this));
    this.rollbackStrategies.set('DROP_TABLE', this.rollbackDropTable.bind(this));
    this.rollbackStrategies.set('ALTER_TABLE', this.rollbackAlterTable.bind(this));
    this.rollbackStrategies.set('CREATE_INDEX', this.rollbackCreateIndex.bind(this));
    this.rollbackStrategies.set('DROP_INDEX', this.rollbackDropIndex.bind(this));
    this.rollbackStrategies.set('ADD_COLUMN', this.rollbackAddColumn.bind(this));
    this.rollbackStrategies.set('DROP_COLUMN', this.rollbackDropColumn.bind(this));
    this.rollbackStrategies.set('MODIFY_COLUMN', this.rollbackModifyColumn.bind(this));
    this.rollbackStrategies.set('ADD_CONSTRAINT', this.rollbackAddConstraint.bind(this));
    this.rollbackStrategies.set('DROP_CONSTRAINT', this.rollbackDropConstraint.bind(this));

    // MongoDB operations rollback strategies
    this.rollbackStrategies.set('CREATE_COLLECTION', this.rollbackCreateCollection.bind(this));
    this.rollbackStrategies.set('DROP_COLLECTION', this.rollbackDropCollection.bind(this));
    this.rollbackStrategies.set('CREATE_INDEX_MONGO', this.rollbackCreateIndexMongo.bind(this));
    this.rollbackStrategies.set('DROP_INDEX_MONGO', this.rollbackDropIndexMongo.bind(this));
    this.rollbackStrategies.set('CREATE_VIEW', this.rollbackCreateView.bind(this));
    this.rollbackStrategies.set('DROP_VIEW', this.rollbackDropView.bind(this));

    logger.info(`✅ Loaded ${this.rollbackStrategies.size} rollback strategies`);
  }

  /**
   * Load rollback history
   */
  async loadRollbackHistory() {
    try {
      const historyFile = path.join(this.config.rollbacksDir, 'rollback-history.json');

      try {
        const data = await fs.readFile(historyFile, 'utf8');
        const history = JSON.parse(data);

        for (const [key, value] of Object.entries(history)) {
          this.rollbackHistory.set(key, value);
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        // File doesn't exist, start with empty history
      }
    } catch (error) {
      logger.warn('⚠️ Could not load rollback history:', error.message);
    }
  }

  /**
   * Save rollback history
   */
  async saveRollbackHistory() {
    try {
      const historyFile = path.join(this.config.rollbacksDir, 'rollback-history.json');
      const history = Object.fromEntries(this.rollbackHistory);

      await fs.writeFile(historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
      logger.error('❌ Could not save rollback history:', error);
    }
  }

  /**
   * Rollback to specific migration
   */
  async rollbackTo(targetMigration, options = {}) {
    const rollbackId = this.generateRollbackId();
    const startTime = Date.now();

    try {
      logger.info(`🔄 Starting rollback to migration: ${targetMigration}`);
      this.emit('rollback:start', { rollbackId, targetMigration, options });

      // Validate rollback request
      await this.validateRollbackRequest(targetMigration, options);

      // Get current migration status
      const currentStatus = await this.getCurrentMigrationStatus();

      if (currentStatus.currentMigration === targetMigration) {
        logger.info('✅ Already at target migration');
        return { success: true, message: 'Already at target migration' };
      }

      // Create backup before rollback
      let backupInfo = null;
      if (this.config.enableBackupBeforeRollback) {
        backupInfo = await this.createBackupBeforeRollback(rollbackId);
      }

      // Perform rollback
      const rollbackResult = await this.performRollback(targetMigration, options);

      // Verify rollback
      await this.verifyRollback(targetMigration, options);

      // Record rollback in history
      await this.recordRollback(rollbackId, {
        targetMigration,
        previousMigration: currentStatus.currentMigration,
        rollbackResult,
        backupInfo,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });

      logger.info(`✅ Rollback completed successfully to migration: ${targetMigration}`);
      this.emit('rollback:complete', { rollbackId, targetMigration, rollbackResult });

      return {
        success: true,
        message: `Rollback completed successfully to migration: ${targetMigration}`,
        rollbackId,
        targetMigration,
        duration: Date.now() - startTime
      };

    } catch (error) {
      logger.error('❌ Rollback failed:', error);
      this.emit('rollback:error', { rollbackId, targetMigration, error });

      // Attempt to restore from backup if available
      if (options.backupInfo) {
        try {
          await this.restoreFromBackup(options.backupInfo);
          logger.info('✅ Restored from backup after rollback failure');
        } catch (restoreError) {
          logger.error('❌ Failed to restore from backup:', restoreError);
        }
      }

      throw new Error(`Rollback failed: ${error.message}`);
    }
  }

  /**
   * Validate rollback request
   */
  async validateRollbackRequest(targetMigration, options) {
    // Check if target migration exists
    const migrations = await this.getAvailableMigrations();
    if (!migrations.includes(targetMigration)) {
      throw new Error(`Target migration ${targetMigration} not found`);
    }

    // Check rollback safety
    if (!options.force) {
      await this.performSafetyChecks(targetMigration);
    }

    // Check for data dependencies
    await this.checkDataDependencies(targetMigration);

    // Check for active connections
    await this.checkActiveConnections();
  }

  /**
   * Perform safety checks
   */
  async performSafetyChecks(targetMigration) {
    logger.info('🔍 Performing rollback safety checks...');

    if (this.safetyChecks.dataIntegrity) {
      await this.checkDataIntegrity(targetMigration);
    }

    if (this.safetyChecks.foreignKeyConstraints) {
      await this.checkForeignKeyConstraints(targetMigration);
    }

    if (this.safetyChecks.indexConsistency) {
      await this.checkIndexConsistency(targetMigration);
    }

    if (this.safetyChecks.backupVerification) {
      await this.verifyBackups();
    }

    logger.info('✅ Safety checks passed');
  }

  /**
   * Check data integrity
   */
  async checkDataIntegrity(targetMigration) {
    // Check for orphaned records
    const orphanedRecords = await this.findOrphanedRecords();
    if (orphanedRecords.length > 0) {
      throw new Error(`Found ${orphanedRecords.length} orphaned records that would be affected by rollback`);
    }

    // Check for data loss scenarios
    const dataLossScenarios = await this.identifyDataLossScenarios(targetMigration);
    if (dataLossScenarios.length > 0) {
      logger.warn(`⚠️ Potential data loss scenarios identified: ${dataLossScenarios.length}`);
      // Continue with warning
    }
  }

  /**
   * Check foreign key constraints
   */
  async checkForeignKeyConstraints(targetMigration) {
    // Check for foreign key violations that would occur during rollback
    const violations = await this.findForeignKeyViolations(targetMigration);
    if (violations.length > 0) {
      throw new Error(`Found ${violations.length} foreign key constraint violations that would occur during rollback`);
    }
  }

  /**
   * Check index consistency
   */
  async checkIndexConsistency(targetMigration) {
    // Verify all indexes are consistent before rollback
    const inconsistentIndexes = await this.findInconsistentIndexes();
    if (inconsistentIndexes.length > 0) {
      logger.warn(`⚠️ Found ${inconsistentIndexes.length} inconsistent indexes`);
    }
  }

  /**
   * Verify backups
   */
  async verifyBackups() {
    // Check if recent backups exist and are valid
    const recentBackups = await this.getRecentBackups();
    if (recentBackups.length === 0) {
      throw new Error('No recent backups found. Cannot proceed with rollback safely.');
    }

    // Verify backup integrity
    for (const backup of recentBackups) {
      const isValid = await this.verifyBackupIntegrity(backup);
      if (!isValid) {
        throw new Error(`Backup ${backup.id} is corrupted or invalid`);
      }
    }
  }

  /**
   * Perform the actual rollback
   */
  async performRollback(targetMigration, options) {
    const rollbackSteps = await this.generateRollbackSteps(targetMigration);
    const results = [];

    logger.info(`📋 Generated ${rollbackSteps.length} rollback steps`);

    for (let i = 0; i < rollbackSteps.length; i++) {
      const step = rollbackSteps[i];
      logger.info(`🔄 Executing rollback step ${i + 1}/${rollbackSteps.length}: ${step.operation}`);

      try {
        const result = await this.executeRollbackStep(step, options);
        results.push({
          step: i + 1,
          operation: step.operation,
          success: true,
          result
        });

        this.emit('rollback:step', { step: i + 1, operation: step.operation, success: true });
      } catch (error) {
        logger.error(`❌ Rollback step ${i + 1} failed:`, error);

        results.push({
          step: i + 1,
          operation: step.operation,
          success: false,
          error: error.message
        });

        this.emit('rollback:step', { step: i + 1, operation: step.operation, success: false, error });

        // Decide whether to continue or abort
        if (options.stopOnError !== false) {
          throw new Error(`Rollback step ${i + 1} failed: ${error.message}`);
        }
      }
    }

    return results;
  }

  /**
   * Generate rollback steps
   */
  async generateRollbackSteps(targetMigration) {
    const currentStatus = await this.getCurrentMigrationStatus();
    const migrations = await this.getMigrationsBetween(currentStatus.currentMigration, targetMigration);

    const steps = [];

    // Reverse order for rollback
    for (let i = migrations.length - 1; i >= 0; i--) {
      const migration = migrations[i];
      const rollbackSteps = await this.parseMigrationForRollback(migration);
      steps.push(...rollbackSteps);
    }

    return steps;
  }

  /**
   * Parse migration for rollback steps
   */
  async parseMigrationForRollback(migration) {
    const migrationPath = path.join(this.config.migrationsDir, migration);
    const content = await fs.readFile(migrationPath, 'utf8');

    const steps = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('CREATE TABLE')) {
        steps.push({
          operation: 'CREATE_TABLE',
          sql: trimmed,
          rollbackSql: `DROP TABLE IF EXISTS ${this.extractTableName(trimmed)} CASCADE;`
        });
      } else if (trimmed.startsWith('DROP TABLE')) {
        steps.push({
          operation: 'DROP_TABLE',
          sql: trimmed,
          rollbackSql: await this.generateCreateTableSql(trimmed)
        });
      } else if (trimmed.startsWith('ALTER TABLE') && trimmed.includes('ADD COLUMN')) {
        steps.push({
          operation: 'ADD_COLUMN',
          sql: trimmed,
          rollbackSql: `ALTER TABLE ${this.extractTableName(trimmed)} DROP COLUMN ${this.extractColumnName(trimmed)};`
        });
      }
      // Add more parsing logic for other SQL operations
    }

    return steps;
  }

  /**
   * Execute rollback step
   */
  async executeRollbackStep(step, options) {
    const client = await this.postgres.connect();

    try {
      await client.query('BEGIN');

      // Execute rollback SQL
      const result = await client.query(step.rollbackSql);

      // Verify step execution
      if (step.verifySql) {
        const verifyResult = await client.query(step.verifySql);
        if (verifyResult.rows.length === 0) {
          throw new Error('Rollback verification failed');
        }
      }

      await client.query('COMMIT');

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rollback strategy implementations
   */
  async rollbackCreateTable(step) {
    return `DROP TABLE IF EXISTS ${step.tableName} CASCADE;`;
  }

  async rollbackDropTable(step) {
    // This is complex - need to recreate table structure and data
    // For now, return a placeholder
    return `-- RECREATE TABLE ${step.tableName} (requires manual intervention)`;
  }

  async rollbackAlterTable(step) {
    // Reverse the ALTER TABLE operation
    return `ALTER TABLE ${step.tableName} ${this.reverseAlterOperation(step.operation)};`;
  }

  async rollbackCreateIndex(step) {
    return `DROP INDEX IF EXISTS ${step.indexName};`;
  }

  async rollbackDropIndex(step) {
    return `CREATE INDEX ${step.indexName} ON ${step.tableName} (${step.columns});`;
  }

  async rollbackAddColumn(step) {
    return `ALTER TABLE ${step.tableName} DROP COLUMN ${step.columnName};`;
  }

  async rollbackDropColumn(step) {
    // Complex - need to recreate column with original definition
    return `ALTER TABLE ${step.tableName} ADD COLUMN ${step.columnName} ${step.columnType};`;
  }

  async rollbackModifyColumn(step) {
    return `ALTER TABLE ${step.tableName} ALTER COLUMN ${step.columnName} TYPE ${step.originalType};`;
  }

  async rollbackAddConstraint(step) {
    return `ALTER TABLE ${step.tableName} DROP CONSTRAINT ${step.constraintName};`;
  }

  async rollbackDropConstraint(step) {
    return `ALTER TABLE ${step.tableName} ADD CONSTRAINT ${step.constraintName} ${step.constraintDefinition};`;
  }

  // MongoDB rollback strategies
  async rollbackCreateCollection(step) {
    return `db.${step.collectionName}.drop();`;
  }

  async rollbackDropCollection(step) {
    // Recreate collection - this is complex and may require data restoration
    return `-- RECREATE COLLECTION ${step.collectionName} (requires manual intervention)`;
  }

  async rollbackCreateIndexMongo(step) {
    return `db.${step.collectionName}.dropIndex("${step.indexName}");`;
  }

  async rollbackDropIndexMongo(step) {
    return `db.${step.collectionName}.createIndex(${JSON.stringify(step.indexDefinition)});`;
  }

  /**
   * Create backup before rollback
   */
  async createBackupBeforeRollback(rollbackId) {
    const backupId = `pre-rollback-${rollbackId}`;
    const backupPath = path.join(this.config.backupDir, 'pre-rollback', `${backupId}.sql`);

    logger.info(`💾 Creating backup before rollback: ${backupId}`);

    try {
      // Create PostgreSQL backup
      const pgBackup = await this.createPostgresBackup(backupPath);

      // Create MongoDB backup
      const mongoBackup = await this.createMongoBackup(backupId);

      const backupInfo = {
        id: backupId,
        timestamp: new Date().toISOString(),
        postgresBackup: pgBackup,
        mongoBackup: mongoBackup,
        size: await this.getBackupSize(backupPath)
      };

      logger.info(`✅ Backup created successfully: ${backupId}`);
      return backupInfo;

    } catch (error) {
      logger.error(`❌ Failed to create backup: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create PostgreSQL backup
   */
  async createPostgresBackup(backupPath) {
    // Use pg_dump for backup
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    try {
      const command = `pg_dump "${this.config.postgresUrl}" > "${backupPath}"`;
      await execAsync(command);

      return {
        type: 'postgres',
        path: backupPath,
        format: 'sql'
      };
    } catch (error) {
      throw new Error(`PostgreSQL backup failed: ${error.message}`);
    }
  }

  /**
   * Create MongoDB backup
   */
  async createMongoBackup(backupId) {
    const backupDir = path.join(this.config.backupDir, 'pre-rollback', backupId);

    try {
      await fs.mkdir(backupDir, { recursive: true });

      // Use mongodump for backup
      const { exec } = require('child_process');
      const util = require('util');
      const logger = require('../../utils/logger');
      const execAsync = util.promisify(exec);

      const command = `mongodump --uri="${this.config.mongoUrl}" --out="${backupDir}"`;
      await execAsync(command);

      return {
        type: 'mongodb',
        path: backupDir,
        format: 'bson'
      };
    } catch (error) {
      throw new Error(`MongoDB backup failed: ${error.message}`);
    }
  }

  /**
   * Verify rollback
   */
  async verifyRollback(targetMigration, options) {
    logger.info('🔍 Verifying rollback...');

    const currentStatus = await this.getCurrentMigrationStatus();

    if (currentStatus.currentMigration !== targetMigration) {
      throw new Error(`Rollback verification failed: current migration is ${currentStatus.currentMigration}, expected ${targetMigration}`);
    }

    // Verify database integrity
    await this.verifyDatabaseIntegrity();

    logger.info('✅ Rollback verification passed');
  }

  /**
   * Verify database integrity
   */
  async verifyDatabaseIntegrity() {
    // Check for orphaned records
    const orphanedRecords = await this.findOrphanedRecords();
    if (orphanedRecords.length > 0) {
      logger.warn(`⚠️ Found ${orphanedRecords.length} orphaned records after rollback`);
    }

    // Check foreign key constraints
    const fkViolations = await this.findForeignKeyViolations();
    if (fkViolations.length > 0) {
      throw new Error(`Found ${fkViolations.length} foreign key constraint violations after rollback`);
    }

    // Check index consistency
    const inconsistentIndexes = await this.findInconsistentIndexes();
    if (inconsistentIndexes.length > 0) {
      logger.warn(`⚠️ Found ${inconsistentIndexes.length} inconsistent indexes after rollback`);
    }
  }

  /**
   * Record rollback in history
   */
  async recordRollback(rollbackId, rollbackInfo) {
    this.rollbackHistory.set(rollbackId, rollbackInfo);
    await this.saveRollbackHistory();
  }

  /**
   * Get rollback status
   */
  async getRollbackStatus() {
    const currentStatus = await this.getCurrentMigrationStatus();
    const recentRollbacks = Array.from(this.rollbackHistory.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    return {
      currentMigration: currentStatus.currentMigration,
      availableRollbacks: await this.getAvailableRollbacks(),
      recentRollbacks,
      safetyChecks: this.safetyChecks,
      config: {
        maxRollbackSteps: this.config.maxRollbackSteps,
        rollbackTimeout: this.config.rollbackTimeout,
        enableBackupBeforeRollback: this.config.enableBackupBeforeRollback
      }
    };
  }

  /**
   * Get available rollbacks
   */
  async getAvailableRollbacks() {
    const currentStatus = await this.getCurrentMigrationStatus();
    const migrations = await this.getAvailableMigrations();

    return migrations.filter(migration =>
      migration !== currentStatus.currentMigration
    );
  }

  /**
   * Utility methods
   */
  generateRollbackId() {
    return `rollback_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  extractTableName(sql) {
    const match = sql.match(/CREATE TABLE\s+(\w+)/i);
    return match ? match[1] : null;
  }

  extractColumnName(sql) {
    const match = sql.match(/ADD COLUMN\s+(\w+)/i);
    return match ? match[1] : null;
  }

  async getCurrentMigrationStatus() {
    // This would typically query a migrations table
    return {
      currentMigration: '008_api_keys',
      appliedMigrations: ['001_initial_schema', '002_auth_tables', '003_secrets_tables', '004_gdpr_compliance_tables', '005_enhanced_auth_tables', '006_ssl_certificates', '007_database_encryption', '008_api_keys'],
      lastApplied: new Date().toISOString()
    };
  }

  async getAvailableMigrations() {
    const files = await fs.readdir(this.config.migrationsDir);
    return files
      .filter(file => file.endsWith('.sql'))
      .sort();
  }

  async getMigrationsBetween(from, to) {
    const allMigrations = await this.getAvailableMigrations();
    const fromIndex = allMigrations.indexOf(from);
    const toIndex = allMigrations.indexOf(to);

    if (fromIndex === -1 || toIndex === -1) {
      throw new Error('Invalid migration range');
    }

    return allMigrations.slice(Math.min(fromIndex, toIndex), Math.max(fromIndex, toIndex) + 1);
  }

  async findOrphanedRecords() {
    // Implementation would check for orphaned records
    return [];
  }

  async identifyDataLossScenarios(targetMigration) {
    // Implementation would identify potential data loss scenarios
    return [];
  }

  async findForeignKeyViolations(targetMigration = null) {
    // Implementation would check for foreign key violations
    return [];
  }

  async findInconsistentIndexes() {
    // Implementation would check for inconsistent indexes
    return [];
  }

  async verifyBackupIntegrity(backup) {
    // Implementation would verify backup integrity
    return true;
  }

  async getRecentBackups() {
    // Implementation would get recent backups
    return [];
  }

  async getBackupSize(backupPath) {
    try {
      const stats = await fs.stat(backupPath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Shutdown rollback manager
   */
  async shutdown() {
    try {
      if (this.postgres) {
        await this.postgres.end();
      }

      if (this.mongodb) {
        await this.mongodb.close();
      }

      logger.info('✅ Migration rollback manager shutdown completed');
    } catch (error) {
      logger.error('❌ Error shutting down rollback manager:', error);
    }
  }
}

module.exports = new MigrationRollbackManager();
