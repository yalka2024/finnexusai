/**
 * Database Backup and Disaster Recovery Manager
 * Handles automated backups, restoration, and disaster recovery procedures
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');
const databaseManager = require('../../config/database');
const { CustomError } = require('../../errors/ErrorHandler');
const logger = require('../../utils/logger');

class BackupManager {
  constructor() {
    this.postgres = databaseManager.getPostgresPool();
    this.backupConfig = {
      basePath: process.env.BACKUP_BASE_PATH || '/var/backups/finnexus',
      retention: {
        daily: 30,    // Keep daily backups for 30 days
        weekly: 12,   // Keep weekly backups for 12 weeks
        monthly: 12   // Keep monthly backups for 12 months
      },
      compression: true,
      encryption: true,
      encryptionKey: process.env.BACKUP_ENCRYPTION_KEY || this.generateEncryptionKey()
    };

    this.scheduledBackups = new Map();
    this.backupStatus = {
      lastFullBackup: null,
      lastIncrementalBackup: null,
      lastSuccessfulBackup: null,
      totalBackups: 0,
      failedBackups: 0
    };
  }

  /**
   * Initialize backup system
   */
  async initialize() {
    try {
      logger.info('🔄 Initializing backup system...');

      // Create backup directories
      await this.createBackupDirectories();

      // Load backup status
      await this.loadBackupStatus();

      // Schedule automatic backups
      this.scheduleAutomaticBackups();

      logger.info('✅ Backup system initialized successfully');

      return {
        success: true,
        message: 'Backup system initialized successfully',
        config: {
          basePath: this.backupConfig.basePath,
          retention: this.backupConfig.retention,
          encryption: this.backupConfig.encryption
        }
      };
    } catch (error) {
      logger.error('❌ Backup system initialization failed:', error);
      throw new Error(`Failed to initialize backup system: ${error.message}`);
    }
  }

  /**
   * Create backup directories
   */
  async createBackupDirectories() {
    const directories = [
      this.backupConfig.basePath,
      path.join(this.backupConfig.basePath, 'postgresql'),
      path.join(this.backupConfig.basePath, 'mongodb'),
      path.join(this.backupConfig.basePath, 'postgresql', 'full'),
      path.join(this.backupConfig.basePath, 'postgresql', 'incremental'),
      path.join(this.backupConfig.basePath, 'mongodb', 'full'),
      path.join(this.backupConfig.basePath, 'mongodb', 'incremental'),
      path.join(this.backupConfig.basePath, 'metadata'),
      path.join(this.backupConfig.basePath, 'logs')
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      }
    }
  }

  /**
   * Schedule automatic backups
   */
  scheduleAutomaticBackups() {
    // Daily full backup at 2 AM
    this.scheduleBackup('daily-full', '0 2 * * *', 'full', 'daily');

    // Incremental backup every 6 hours
    this.scheduleBackup('incremental', '0 */6 * * *', 'incremental', 'hourly');

    // Weekly full backup on Sunday at 1 AM
    this.scheduleBackup('weekly-full', '0 1 * * 0', 'full', 'weekly');

    // Monthly full backup on 1st at 12 AM
    this.scheduleBackup('monthly-full', '0 0 1 * *', 'full', 'monthly');
  }

  /**
   * Schedule a backup task
   */
  scheduleBackup(name, cronExpression, type, frequency) {
    // In a real implementation, you would use a cron scheduler like node-cron
    // For now, we'll simulate scheduling
    this.scheduledBackups.set(name, {
      cronExpression,
      type,
      frequency,
      lastRun: null,
      nextRun: this.calculateNextRun(cronExpression)
    });

    logger.info(`📅 Scheduled ${type} backup: ${name} (${frequency})`);
  }

  /**
   * Calculate next run time for cron expression
   */
  calculateNextRun(cronExpression) {
    // Simplified cron parser - in production use a proper cron library
    const now = new Date();
    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next day
    return nextRun;
  }

  /**
   * Create full backup of PostgreSQL database
   */
  async createPostgreSQLFullBackup() {
    try {
      logger.info('🔄 Creating PostgreSQL full backup...');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `postgresql-full-${timestamp}`;
      const backupPath = path.join(this.backupConfig.basePath, 'postgresql', 'full', backupName);

      // Create backup directory
      fs.mkdirSync(backupPath, { recursive: true });

      // Database connection details
      const dbConfig = {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'finnexus',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD
      };

      // Create pg_dump command
      const pgDumpCmd = [
        'pg_dump',
        `--host=${dbConfig.host}`,
        `--port=${dbConfig.port}`,
        `--username=${dbConfig.user}`,
        `--dbname=${dbConfig.database}`,
        '--verbose',
        '--clean',
        '--create',
        '--format=directory',
        `--file=${backupPath}/dump`
      ];

      // Execute backup
      const env = { ...process.env, PGPASSWORD: dbConfig.password };
      execSync(pgDumpCmd.join(' '), { env, stdio: 'inherit' });

      // Create backup metadata
      const metadata = {
        type: 'full',
        database: 'postgresql',
        timestamp: new Date().toISOString(),
        backupName: backupName,
        size: this.calculateDirectorySize(backupPath),
        compression: this.backupConfig.compression,
        encryption: this.backupConfig.encryption,
        checksum: this.calculateChecksum(backupPath)
      };

      // Save metadata
      fs.writeFileSync(
        path.join(backupPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Compress backup if enabled
      if (this.backupConfig.compression) {
        await this.compressBackup(backupPath);
      }

      // Encrypt backup if enabled
      if (this.backupConfig.encryption) {
        await this.encryptBackup(backupPath);
      }

      // Update backup status
      this.backupStatus.lastFullBackup = new Date();
      this.backupStatus.lastSuccessfulBackup = new Date();
      this.backupStatus.totalBackups++;

      // Save status
      await this.saveBackupStatus();

      logger.info(`✅ PostgreSQL full backup created: ${backupName}`);

      return {
        success: true,
        backupName: backupName,
        backupPath: backupPath,
        metadata: metadata
      };
    } catch (error) {
      logger.error('❌ PostgreSQL full backup failed:', error);
      this.backupStatus.failedBackups++;
      await this.saveBackupStatus();
      throw new Error(`PostgreSQL backup failed: ${error.message}`);
    }
  }

  /**
   * Create incremental backup of PostgreSQL database
   */
  async createPostgreSQLIncrementalBackup() {
    try {
      logger.info('🔄 Creating PostgreSQL incremental backup...');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `postgresql-incremental-${timestamp}`;
      const backupPath = path.join(this.backupConfig.basePath, 'postgresql', 'incremental', backupName);

      // Create backup directory
      fs.mkdirSync(backupPath, { recursive: true });

      // Get last backup timestamp for incremental backup
      const lastBackup = await this.getLastBackupTimestamp('postgresql', 'full');

      // Database connection details
      const dbConfig = {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'finnexus',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD
      };

      // Create incremental backup using WAL files
      const walBackupCmd = [
        'pg_basebackup',
        `--host=${dbConfig.host}`,
        `--port=${dbConfig.port}`,
        `--username=${dbConfig.user}`,
        `--pgdata=${backupPath}/base`,
        '--format=tar',
        '--wal-method=stream',
        '--checkpoint=fast'
      ];

      // Execute incremental backup
      const env = { ...process.env, PGPASSWORD: dbConfig.password };
      execSync(walBackupCmd.join(' '), { env, stdio: 'inherit' });

      // Create backup metadata
      const metadata = {
        type: 'incremental',
        database: 'postgresql',
        timestamp: new Date().toISOString(),
        backupName: backupName,
        baseBackup: lastBackup,
        size: this.calculateDirectorySize(backupPath),
        compression: this.backupConfig.compression,
        encryption: this.backupConfig.encryption,
        checksum: this.calculateChecksum(backupPath)
      };

      // Save metadata
      fs.writeFileSync(
        path.join(backupPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Compress and encrypt if enabled
      if (this.backupConfig.compression) {
        await this.compressBackup(backupPath);
      }

      if (this.backupConfig.encryption) {
        await this.encryptBackup(backupPath);
      }

      // Update backup status
      this.backupStatus.lastIncrementalBackup = new Date();
      this.backupStatus.lastSuccessfulBackup = new Date();
      this.backupStatus.totalBackups++;

      // Save status
      await this.saveBackupStatus();

      logger.info(`✅ PostgreSQL incremental backup created: ${backupName}`);

      return {
        success: true,
        backupName: backupName,
        backupPath: backupPath,
        metadata: metadata
      };
    } catch (error) {
      logger.error('❌ PostgreSQL incremental backup failed:', error);
      this.backupStatus.failedBackups++;
      await this.saveBackupStatus();
      throw new Error(`PostgreSQL incremental backup failed: ${error.message}`);
    }
  }

  /**
   * Create full backup of MongoDB database
   */
  async createMongoDBFullBackup() {
    try {
      logger.info('🔄 Creating MongoDB full backup...');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `mongodb-full-${timestamp}`;
      const backupPath = path.join(this.backupConfig.basePath, 'mongodb', 'full', backupName);

      // Create backup directory
      fs.mkdirSync(backupPath, { recursive: true });

      // MongoDB connection URI
      const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/finnexus';

      // Create mongodump command
      const mongoDumpCmd = [
        'mongodump',
        `--uri=${mongoUri}`,
        `--out=${backupPath}`,
        '--verbose'
      ];

      // Execute backup
      execSync(mongoDumpCmd.join(' '), { stdio: 'inherit' });

      // Create backup metadata
      const metadata = {
        type: 'full',
        database: 'mongodb',
        timestamp: new Date().toISOString(),
        backupName: backupName,
        size: this.calculateDirectorySize(backupPath),
        compression: this.backupConfig.compression,
        encryption: this.backupConfig.encryption,
        checksum: this.calculateChecksum(backupPath)
      };

      // Save metadata
      fs.writeFileSync(
        path.join(backupPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Compress and encrypt if enabled
      if (this.backupConfig.compression) {
        await this.compressBackup(backupPath);
      }

      if (this.backupConfig.encryption) {
        await this.encryptBackup(backupPath);
      }

      // Update backup status
      this.backupStatus.lastFullBackup = new Date();
      this.backupStatus.lastSuccessfulBackup = new Date();
      this.backupStatus.totalBackups++;

      // Save status
      await this.saveBackupStatus();

      logger.info(`✅ MongoDB full backup created: ${backupName}`);

      return {
        success: true,
        backupName: backupName,
        backupPath: backupPath,
        metadata: metadata
      };
    } catch (error) {
      logger.error('❌ MongoDB full backup failed:', error);
      this.backupStatus.failedBackups++;
      await this.saveBackupStatus();
      throw new Error(`MongoDB backup failed: ${error.message}`);
    }
  }

  /**
   * Restore PostgreSQL database from backup
   */
  async restorePostgreSQL(backupName, targetDatabase = null) {
    try {
      logger.info(`🔄 Restoring PostgreSQL from backup: ${backupName}`);

      // Find backup
      const backupInfo = await this.findBackup('postgresql', backupName);
      if (!backupInfo) {
        throw new Error(`Backup not found: ${backupName}`);
      }

      let backupPath = backupInfo.path;

      // Decrypt backup if encrypted
      if (backupInfo.metadata.encryption) {
        backupPath = await this.decryptBackup(backupPath);
      }

      // Decompress backup if compressed
      if (backupInfo.metadata.compression) {
        backupPath = await this.decompressBackup(backupPath);
      }

      const targetDb = targetDatabase || process.env.POSTGRES_DB || 'finnexus';

      // Database connection details
      const dbConfig = {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD
      };

      // Create restore command
      const pgRestoreCmd = [
        'pg_restore',
        `--host=${dbConfig.host}`,
        `--port=${dbConfig.port}`,
        `--username=${dbConfig.user}`,
        `--dbname=${targetDb}`,
        '--verbose',
        '--clean',
        '--create',
        `${backupPath}/dump`
      ];

      // Execute restore
      const env = { ...process.env, PGPASSWORD: dbConfig.password };
      execSync(pgRestoreCmd.join(' '), { env, stdio: 'inherit' });

      logger.info(`✅ PostgreSQL restored from backup: ${backupName}`);

      return {
        success: true,
        message: `PostgreSQL restored from backup: ${backupName}`,
        targetDatabase: targetDb
      };
    } catch (error) {
      logger.error('❌ PostgreSQL restore failed:', error);
      throw new Error(`PostgreSQL restore failed: ${error.message}`);
    }
  }

  /**
   * Restore MongoDB database from backup
   */
  async restoreMongoDB(backupName, targetDatabase = null) {
    try {
      logger.info(`🔄 Restoring MongoDB from backup: ${backupName}`);

      // Find backup
      const backupInfo = await this.findBackup('mongodb', backupName);
      if (!backupInfo) {
        throw new Error(`Backup not found: ${backupName}`);
      }

      let backupPath = backupInfo.path;

      // Decrypt backup if encrypted
      if (backupInfo.metadata.encryption) {
        backupPath = await this.decryptBackup(backupPath);
      }

      // Decompress backup if compressed
      if (backupInfo.metadata.compression) {
        backupPath = await this.decompressBackup(backupPath);
      }

      const targetDb = targetDatabase || process.env.MONGO_DB || 'finnexus';

      // MongoDB connection URI
      const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';

      // Create mongorestore command
      const mongoRestoreCmd = [
        'mongorestore',
        `--uri=${mongoUri}`,
        `--db=${targetDb}`,
        `${backupPath}`,
        '--verbose'
      ];

      // Execute restore
      execSync(mongoRestoreCmd.join(' '), { stdio: 'inherit' });

      logger.info(`✅ MongoDB restored from backup: ${backupName}`);

      return {
        success: true,
        message: `MongoDB restored from backup: ${backupName}`,
        targetDatabase: targetDb
      };
    } catch (error) {
      logger.error('❌ MongoDB restore failed:', error);
      throw new Error(`MongoDB restore failed: ${error.message}`);
    }
  }

  /**
   * List available backups
   */
  async listBackups(database = null, type = null) {
    try {
      const backups = [];

      // List PostgreSQL backups
      if (!database || database === 'postgresql') {
        const postgresBackups = await this.listBackupsInDirectory(
          path.join(this.backupConfig.basePath, 'postgresql'),
          'postgresql',
          type
        );
        backups.push(...postgresBackups);
      }

      // List MongoDB backups
      if (!database || database === 'mongodb') {
        const mongoBackups = await this.listBackupsInDirectory(
          path.join(this.backupConfig.basePath, 'mongodb'),
          'mongodb',
          type
        );
        backups.push(...mongoBackups);
      }

      // Sort by timestamp
      backups.sort((a, b) => new Date(b.metadata.timestamp) - new Date(a.metadata.timestamp));

      return {
        success: true,
        backups: backups,
        total: backups.length
      };
    } catch (error) {
      logger.error('List backups error:', error);
      throw new Error(`Failed to list backups: ${error.message}`);
    }
  }

  /**
   * List backups in directory
   */
  async listBackupsInDirectory(baseDir, database, type = null) {
    const backups = [];

    if (!fs.existsSync(baseDir)) {
      return backups;
    }

    const subdirs = fs.readdirSync(baseDir);

    for (const subdir of subdirs) {
      const backupType = subdir; // 'full' or 'incremental'

      if (type && backupType !== type) {
        continue;
      }

      const backupDir = path.join(baseDir, subdir);
      const backupNames = fs.readdirSync(backupDir);

      for (const backupName of backupNames) {
        const backupPath = path.join(backupDir, backupName);
        const metadataPath = path.join(backupPath, 'metadata.json');

        if (fs.existsSync(metadataPath)) {
          try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            backups.push({
              name: backupName,
              path: backupPath,
              database: database,
              metadata: metadata
            });
          } catch (error) {
            logger.warn(`Failed to read metadata for ${backupName}:`, error.message);
          }
        }
      }
    }

    return backups;
  }

  /**
   * Clean up old backups based on retention policy
   */
  async cleanupOldBackups() {
    try {
      logger.info('🔄 Cleaning up old backups...');

      const retention = this.backupConfig.retention;
      const now = new Date();
      let deletedCount = 0;

      // Clean up PostgreSQL backups
      const postgresBackups = await this.listBackups('postgresql');
      for (const backup of postgresBackups) {
        const backupDate = new Date(backup.metadata.timestamp);
        const ageInDays = (now - backupDate) / (1000 * 60 * 60 * 24);

        let shouldDelete = false;

        if (backup.metadata.type === 'full') {
          if (backup.name.includes('daily') && ageInDays > retention.daily) {
            shouldDelete = true;
          } else if (backup.name.includes('weekly') && ageInDays > (retention.weekly * 7)) {
            shouldDelete = true;
          } else if (backup.name.includes('monthly') && ageInDays > (retention.monthly * 30)) {
            shouldDelete = true;
          }
        } else if (backup.metadata.type === 'incremental') {
          if (ageInDays > retention.daily) {
            shouldDelete = true;
          }
        }

        if (shouldDelete) {
          await this.deleteBackup(backup.path);
          deletedCount++;
        }
      }

      // Clean up MongoDB backups
      const mongoBackups = await this.listBackups('mongodb');
      for (const backup of mongoBackups) {
        const backupDate = new Date(backup.metadata.timestamp);
        const ageInDays = (now - backupDate) / (1000 * 60 * 60 * 24);

        let shouldDelete = false;

        if (backup.metadata.type === 'full') {
          if (backup.name.includes('daily') && ageInDays > retention.daily) {
            shouldDelete = true;
          } else if (backup.name.includes('weekly') && ageInDays > (retention.weekly * 7)) {
            shouldDelete = true;
          } else if (backup.name.includes('monthly') && ageInDays > (retention.monthly * 30)) {
            shouldDelete = true;
          }
        } else if (backup.metadata.type === 'incremental') {
          if (ageInDays > retention.daily) {
            shouldDelete = true;
          }
        }

        if (shouldDelete) {
          await this.deleteBackup(backup.path);
          deletedCount++;
        }
      }

      logger.info(`✅ Cleaned up ${deletedCount} old backups`);

      return {
        success: true,
        message: `Cleaned up ${deletedCount} old backups`,
        deletedCount: deletedCount
      };
    } catch (error) {
      logger.error('Cleanup old backups error:', error);
      throw new Error(`Failed to cleanup old backups: ${error.message}`);
    }
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupName) {
    try {
      const backupInfo = await this.findBackup(null, backupName);
      if (!backupInfo) {
        throw new Error(`Backup not found: ${backupName}`);
      }

      // Check if backup files exist
      const backupPath = backupInfo.path;
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup path does not exist: ${backupPath}`);
      }

      // Verify metadata
      const metadataPath = path.join(backupPath, 'metadata.json');
      if (!fs.existsSync(metadataPath)) {
        throw new Error('Backup metadata not found');
      }

      // Verify checksum if available
      if (backupInfo.metadata.checksum) {
        const currentChecksum = this.calculateChecksum(backupPath);
        if (currentChecksum !== backupInfo.metadata.checksum) {
          throw new Error('Backup checksum verification failed');
        }
      }

      return {
        success: true,
        message: `Backup ${backupName} verified successfully`,
        backup: backupInfo
      };
    } catch (error) {
      logger.error('Verify backup error:', error);
      throw new Error(`Backup verification failed: ${error.message}`);
    }
  }

  /**
   * Get backup status
   */
  getBackupStatus() {
    return {
      success: true,
      status: this.backupStatus,
      config: {
        basePath: this.backupConfig.basePath,
        retention: this.backupConfig.retention,
        encryption: this.backupConfig.encryption
      },
      scheduledBackups: Array.from(this.scheduledBackups.entries()).map(([name, config]) => ({
        name,
        cronExpression: config.cronExpression,
        type: config.type,
        frequency: config.frequency,
        lastRun: config.lastRun,
        nextRun: config.nextRun
      }))
    };
  }

  // Utility methods

  /**
   * Generate encryption key
   */
  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Calculate directory size
   */
  calculateDirectorySize(dirPath) {
    let totalSize = 0;

    const calculateSize = (path) => {
      const stats = fs.statSync(path);
      if (stats.isDirectory()) {
        const files = fs.readdirSync(path);
        for (const file of files) {
          calculateSize(path.join(path, file));
        }
      } else {
        totalSize += stats.size;
      }
    };

    calculateSize(dirPath);
    return totalSize;
  }

  /**
   * Calculate checksum for directory
   */
  calculateChecksum(dirPath) {
    const hash = crypto.createHash('sha256');

    const addToHash = (path) => {
      const stats = fs.statSync(path);
      if (stats.isDirectory()) {
        const files = fs.readdirSync(path).sort();
        for (const file of files) {
          addToHash(path.join(path, file));
        }
      } else {
        const content = fs.readFileSync(path);
        hash.update(content);
      }
    };

    addToHash(dirPath);
    return hash.digest('hex');
  }

  /**
   * Compress backup
   */
  async compressBackup(backupPath) {
    const tarCmd = `tar -czf ${backupPath}.tar.gz -C ${path.dirname(backupPath)} ${path.basename(backupPath)}`;
    execSync(tarCmd, { stdio: 'inherit' });

    // Remove original directory
    fs.rmSync(backupPath, { recursive: true, force: true });
  }

  /**
   * Decompress backup
   */
  async decompressBackup(backupPath) {
    const tarCmd = `tar -xzf ${backupPath}.tar.gz -C ${path.dirname(backupPath)}`;
    execSync(tarCmd, { stdio: 'inherit' });

    // Return path to extracted directory
    return backupPath;
  }

  /**
   * Encrypt backup
   */
  async encryptBackup(backupPath) {
    const cipher = crypto.createCipher('aes-256-gcm', this.backupConfig.encryptionKey);
    const input = fs.createReadStream(backupPath);
    const output = fs.createWriteStream(`${backupPath}.enc`);

    input.pipe(cipher).pipe(output);

    return new Promise((resolve, reject) => {
      output.on('finish', resolve);
      output.on('error', reject);
    });
  }

  /**
   * Decrypt backup
   */
  async decryptBackup(backupPath) {
    const decipher = crypto.createDecipher('aes-256-gcm', this.backupConfig.encryptionKey);
    const input = fs.createReadStream(`${backupPath}.enc`);
    const output = fs.createWriteStream(backupPath);

    input.pipe(decipher).pipe(output);

    return new Promise((resolve, reject) => {
      output.on('finish', resolve);
      output.on('error', reject);
    });
  }

  /**
   * Find backup by name
   */
  async findBackup(database, backupName) {
    const backups = await this.listBackups(database);
    return backups.find(backup => backup.name === backupName);
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupPath) {
    fs.rmSync(backupPath, { recursive: true, force: true });
  }

  /**
   * Get last backup timestamp
   */
  async getLastBackupTimestamp(database, type) {
    const backups = await this.listBackups(database, type);
    if (backups.length === 0) {
      return null;
    }

    return backups[0].metadata.timestamp;
  }

  /**
   * Load backup status
   */
  async loadBackupStatus() {
    const statusPath = path.join(this.backupConfig.basePath, 'metadata', 'status.json');

    if (fs.existsSync(statusPath)) {
      try {
        const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
        this.backupStatus = { ...this.backupStatus, ...status };
      } catch (error) {
        logger.warn('Failed to load backup status:', error.message);
      }
    }
  }

  /**
   * Save backup status
   */
  async saveBackupStatus() {
    const statusPath = path.join(this.backupConfig.basePath, 'metadata', 'status.json');

    try {
      fs.writeFileSync(statusPath, JSON.stringify(this.backupStatus, null, 2));
    } catch (error) {
      logger.error('Failed to save backup status:', error);
    }
  }
}

module.exports = new BackupManager();
