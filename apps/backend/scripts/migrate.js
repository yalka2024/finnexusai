#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const logger = require('../src/utils/logger');

class MigrationManager {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    this.migrationsDir = path.join(__dirname, '../src/database/migrations');
  }

  async initialize() {
    try {
      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();
      logger.info('Migration system initialized');
    } catch (error) {
      logger.error('Failed to initialize migration system:', error);
      throw error;
    }
  }

  async createMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64) NOT NULL
      );
    `;
    await this.pool.query(query);
  }

  async getExecutedMigrations() {
    const query = 'SELECT filename FROM migrations ORDER BY id';
    const result = await this.pool.query(query);
    return result.rows.map(row => row.filename);
  }

  async getPendingMigrations() {
    const executedMigrations = await this.getExecutedMigrations();
    const allMigrations = this.getMigrationFiles();

    return allMigrations.filter(migration =>
      !executedMigrations.includes(migration)
    );
  }

  getMigrationFiles() {
    if (!fs.existsSync(this.migrationsDir)) {
      fs.mkdirSync(this.migrationsDir, { recursive: true });
      return [];
    }

    return fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
  }

  calculateChecksum(content) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async executeMigration(filename) {
    const filepath = path.join(this.migrationsDir, filename);

    if (!fs.existsSync(filepath)) {
      throw new Error(`Migration file not found: ${filename}`);
    }

    const content = fs.readFileSync(filepath, 'utf8');
    const checksum = this.calculateChecksum(content);

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Execute migration SQL
      await client.query(content);

      // Record migration
      await client.query(
        'INSERT INTO migrations (filename, checksum) VALUES ($1, $2)',
        [filename, checksum]
      );

      await client.query('COMMIT');
      logger.info(`Migration executed successfully: ${filename}`);

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Migration failed: ${filename}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async migrate() {
    try {
      await this.initialize();

      const pendingMigrations = await this.getPendingMigrations();

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations');
        return;
      }

      logger.info(`Found ${pendingMigrations.length} pending migrations`);

      for (const migration of pendingMigrations) {
        logger.info(`Executing migration: ${migration}`);
        await this.executeMigration(migration);
      }

      logger.info('All migrations completed successfully');

    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  async rollback(steps = 1) {
    try {
      await this.initialize();

      const query = `
        SELECT filename FROM migrations 
        ORDER BY id DESC 
        LIMIT $1
      `;

      const result = await this.pool.query(query, [steps]);
      const migrationsToRollback = result.rows.map(row => row.filename);

      if (migrationsToRollback.length === 0) {
        logger.info('No migrations to rollback');
        return;
      }

      logger.info(`Rolling back ${migrationsToRollback.length} migrations`);

      for (const migration of migrationsToRollback) {
        logger.info(`Rolling back migration: ${migration}`);
        await this.rollbackMigration(migration);
      }

      logger.info('Rollback completed successfully');

    } catch (error) {
      logger.error('Rollback failed:', error);
      throw error;
    }
  }

  async rollbackMigration(filename) {
    // For now, we'll just remove the migration record
    // In a real system, you'd implement proper rollback SQL
    await this.pool.query('DELETE FROM migrations WHERE filename = $1', [filename]);
    logger.info(`Migration record removed: ${filename}`);
  }

  async status() {
    try {
      await this.initialize();

      const executedMigrations = await this.getExecutedMigrations();
      const allMigrations = this.getMigrationFiles();
      const pendingMigrations = allMigrations.filter(migration =>
        !executedMigrations.includes(migration)
      );

      logger.info('\n=== Migration Status ===');
      logger.info(`Total migrations: ${allMigrations.length}`);
      logger.info(`Executed: ${executedMigrations.length}`);
      logger.info(`Pending: ${pendingMigrations.length}`);

      if (executedMigrations.length > 0) {
        logger.info('\nExecuted migrations:');
        executedMigrations.forEach(migration => {
          logger.info(`  ✓ ${migration}`);
        });
      }

      if (pendingMigrations.length > 0) {
        logger.info('\nPending migrations:');
        pendingMigrations.forEach(migration => {
          logger.info(`  ⏳ ${migration}`);
        });
      }

      logger.info('');

    } catch (error) {
      logger.error('Failed to get migration status:', error);
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const migrationManager = new MigrationManager();

  try {
    switch (command) {
    case 'up':
      await migrationManager.migrate();
      break;
    case 'down':
      const steps = parseInt(process.argv[3]) || 1;
      await migrationManager.rollback(steps);
      break;
    case 'status':
      await migrationManager.status();
      break;
    default:
      logger.info('Usage: node migrate.js [up|down|status]');
      logger.info('  up     - Run pending migrations');
      logger.info('  down   - Rollback last migration(s)');
      logger.info('  status - Show migration status');
      process.exit(1);
    }
  } catch (error) {
    logger.error('Migration command failed:', error.message);
    process.exit(1);
  } finally {
    await migrationManager.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = MigrationManager;
