
/**
 * Database Migration Runner
 * Handles database schema migrations and updates
 */

const fs = require('fs').promises;
const path = require('path');
const databaseManager = require('../config/database');

class MigrationRunner {
  constructor() {
    this.migrationsPath = path.join(__dirname, 'migrations');
    this.migrationsTable = 'schema_migrations';
  }

  /**
   * Initialize migration system
   */
  async initialize() {
    try {
      // Create migrations table if it doesn't exist
      await databaseManager.queryPostgres(`
        CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          checksum VARCHAR(64) NOT NULL
        )
      `);

      logger.info('✅ Migration system initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize migration system:', error);
      throw error;
    }
  }

  /**
   * Get list of migration files
   */
  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsPath);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort()
        .map(file => ({
          filename: file,
          path: path.join(this.migrationsPath, file)
        }));
    } catch (error) {
      logger.error('❌ Failed to read migration files:', error);
      throw error;
    }
  }

  /**
   * Get executed migrations from database
   */
  async getExecutedMigrations() {
    try {
      const result = await databaseManager.queryPostgres(
        `SELECT filename FROM ${this.migrationsTable} ORDER BY executed_at`
      );
      return result.rows.map(row => row.filename);
    } catch (error) {
      logger.error('❌ Failed to get executed migrations:', error);
      throw error;
    }
  }

  /**
   * Calculate file checksum
   */
  async calculateChecksum(filePath) {
    const crypto = require('crypto');
    const content = await fs.readFile(filePath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Execute a single migration
   */
  async executeMigration(migration) {
    const { filename, path: filePath } = migration;

    try {
      logger.info(`🔄 Executing migration: ${filename}`);

      // Calculate checksum
      const checksum = await this.calculateChecksum(filePath);

      // Read migration content
      const content = await fs.readFile(filePath, 'utf8');

      // Execute migration in transaction
      const client = await databaseManager.getPostgresPool().connect();

      try {
        await client.query('BEGIN');

        // Execute the migration SQL
        await client.query(content);

        // Record migration as executed
        await client.query(
          `INSERT INTO ${this.migrationsTable} (filename, checksum) VALUES ($1, $2)`,
          [filename, checksum]
        );

        await client.query('COMMIT');
        logger.info(`✅ Migration executed successfully: ${filename}`);

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      logger.error(`❌ Failed to execute migration ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations() {
    try {
      logger.info('🚀 Starting database migrations...');

      // Initialize migration system
      await this.initialize();

      // Get migration files and executed migrations
      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();

      // Find pending migrations
      const pendingMigrations = migrationFiles.filter(
        migration => !executedMigrations.includes(migration.filename)
      );

      if (pendingMigrations.length === 0) {
        logger.info('✅ No pending migrations');
        return;
      }

      logger.info(`📋 Found ${pendingMigrations.length} pending migrations`);

      // Execute pending migrations
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      logger.info('✅ All migrations completed successfully');

    } catch (error) {
      logger.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Rollback last migration (if supported)
   */
  async rollbackLastMigration() {
    try {
      logger.info('🔄 Rolling back last migration...');

      // Get last executed migration
      const result = await databaseManager.queryPostgres(
        `SELECT filename FROM ${this.migrationsTable} ORDER BY executed_at DESC LIMIT 1`
      );

      if (result.rows.length === 0) {
        logger.info('ℹ️ No migrations to rollback');
        return;
      }

      const lastMigration = result.rows[0].filename;
      logger.info(`⚠️ Rollback not implemented for: ${lastMigration}`);
      logger.info('ℹ️ Manual rollback required');

    } catch (error) {
      logger.error('❌ Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Check migration status
   */
  async checkStatus() {
    try {
      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();

      logger.info('\n📊 Migration Status:');
      logger.info('==================');

      for (const migration of migrationFiles) {
        const isExecuted = executedMigrations.includes(migration.filename);
        const status = isExecuted ? '✅ Executed' : '⏳ Pending';
        logger.info(`${status} ${migration.filename}`);
      }

      const pendingCount = migrationFiles.length - executedMigrations.length;
      logger.info(`\n📈 Summary: ${executedMigrations.length} executed, ${pendingCount} pending`);

    } catch (error) {
      logger.error('❌ Failed to check migration status:', error);
      throw error;
    }
  }

  /**
   * Verify migration integrity
   */
  async verifyIntegrity() {
    try {
      logger.info('🔍 Verifying migration integrity...');

      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();

      for (const migration of migrationFiles) {
        if (executedMigrations.includes(migration.filename)) {
          const storedResult = await databaseManager.queryPostgres(
            `SELECT checksum FROM ${this.migrationsTable} WHERE filename = $1`,
            [migration.filename]
          );

          if (storedResult.rows.length > 0) {
            const storedChecksum = storedResult.rows[0].checksum;
            const currentChecksum = await this.calculateChecksum(migration.path);

            if (storedChecksum !== currentChecksum) {
              logger.warn(`⚠️ Checksum mismatch for ${migration.filename}`);
              logger.warn(`   Stored: ${storedChecksum}`);
              logger.warn(`   Current: ${currentChecksum}`);
            } else {
              logger.info(`✅ ${migration.filename} - integrity verified`);
            }
          }
        }
      }

      logger.info('✅ Migration integrity check completed');

    } catch (error) {
      logger.error('❌ Integrity check failed:', error);
      throw error;
    }
  }

  /**
   * Create a new migration file
   */
  async createMigration(name) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `${String(Date.now()).slice(-6)}_${name.replace(/[^a-zA-Z0-9]/g, '_')}.sql`;
      const filePath = path.join(this.migrationsPath, filename);

      const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your migration SQL here
-- Example:
-- CREATE TABLE example_table (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     name VARCHAR(100) NOT NULL,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- CREATE INDEX idx_example_name ON example_table(name);
`;

      await fs.writeFile(filePath, template);
      logger.info(`✅ Created migration: ${filename}`);
      logger.info(`📝 Edit file: ${filePath}`);

      return filename;

    } catch (error) {
      logger.error('❌ Failed to create migration:', error);
      throw error;
    }
  }

  /**
   * Seed database with initial data
   */
  async seedDatabase() {
    try {
      logger.info('🌱 Seeding database with initial data...');

      // Check if seeding has already been done
      const result = await databaseManager.queryPostgres(
        `SELECT COUNT(*) as count FROM ${this.migrationsTable} WHERE filename = '000_seed_data.sql'`
      );

      if (parseInt(result.rows[0].count) > 0) {
        logger.info('ℹ️ Database already seeded');
        return;
      }

      // Create default admin user
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@finnexusai.com';
      const adminPassword = process.env.ADMIN_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD;

      const bcrypt = require('bcrypt');
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

      await databaseManager.queryPostgres(`
        INSERT INTO users (
          email, password_hash, salt, first_name, last_name, 
          date_of_birth, country, role, status, kyc_status
        ) VALUES (
          $1, $2, $3, 'Admin', 'User', 
          '1990-01-01', 'US', 'superadmin', 'active', 'approved'
        )
        ON CONFLICT (email) DO NOTHING
      `, [adminEmail, passwordHash, 'default_salt']);

      // Mark seeding as completed
      await databaseManager.queryPostgres(
        `INSERT INTO ${this.migrationsTable} (filename, checksum) VALUES ($1, $2)`,
        ['000_seed_data.sql', 'seed_data_placeholder']
      );

      logger.info('✅ Database seeded successfully');
      logger.info(`👤 Default admin user created: ${adminEmail}`);

    } catch (error) {
      logger.error('❌ Database seeding failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const migrationRunner = new MigrationRunner();

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const argument = process.argv[3];

  async function runCommand() {
    try {
      switch (command) {
      case 'migrate':
        await migrationRunner.runMigrations();
        break;
      case 'status':
        await migrationRunner.checkStatus();
        break;
      case 'verify':
        await migrationRunner.verifyIntegrity();
        break;
      case 'rollback':
        await migrationRunner.rollbackLastMigration();
        break;
      case 'create':
        if (!argument) {
          logger.error('❌ Please provide a migration name');
          process.exit(1);
        }
        await migrationRunner.createMigration(argument);
        break;
      case 'seed':
        await migrationRunner.seedDatabase();
        break;
      default:
        logger.info('📖 Migration Commands:');
        logger.info('  migrate    - Run pending migrations');
        logger.info('  status     - Show migration status');
        logger.info('  verify     - Verify migration integrity');
        logger.info('  rollback   - Rollback last migration');
        logger.info('  create     - Create new migration file');
        logger.info('  seed       - Seed database with initial data');
        break;
      }
    } catch (error) {
      logger.error('❌ Command failed:', error);
      process.exit(1);
    }
  }

  runCommand();
}

module.exports = migrationRunner;
