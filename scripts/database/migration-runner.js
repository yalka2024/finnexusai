#!/usr/bin/env node

/**
 * Database Migration Runner
 * Handles database migrations for FinNexusAI
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

class MigrationRunner {
  constructor() {
    // Load environment variables from test.env for testing
    require('dotenv').config({ path: path.resolve(__dirname, '../../config/environments/test.env') });
    
    this.pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'finnexusai_test',
      password: process.env.DB_PASSWORD || 'password',
      port: process.env.DB_PORT || 5432,
    });
    this.migrationsPath = path.join(__dirname, '../../apps/backend/src/database/migrations');
  }

  async init() {
    try {
      await this.createMigrationsTable();
      console.log('✅ Migration runner initialized');
    } catch (error) {
      console.error('❌ Failed to initialize migration runner:', error.message);
      process.exit(1);
    }
  }

  async createMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    const allMigrations = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return allMigrations.filter(migration => !executedMigrations.includes(migration));
  }

  async executeMigration(filename) {
    const filePath = path.join(this.migrationsPath, filename);
    const sql = fs.readFileSync(filePath, 'utf8');

    try {
      await this.pool.query('BEGIN');
      await this.pool.query(sql);
      
      const insertQuery = 'INSERT INTO migrations (filename) VALUES ($1)';
      await this.pool.query(insertQuery, [filename]);
      
      await this.pool.query('COMMIT');
      console.log(`✅ Executed migration: ${filename}`);
    } catch (error) {
      await this.pool.query('ROLLBACK');
      console.error(`❌ Failed to execute migration ${filename}:`, error.message);
      throw error;
    }
  }

  async runMigrations() {
    console.log('🚀 Starting database migrations...');
    
    const pendingMigrations = await this.getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`📋 Found ${pendingMigrations.length} pending migrations`);
    
    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }

    console.log('✅ All migrations completed successfully');
  }

  async rollbackMigration(filename) {
    // This is a simplified rollback - in production you'd want proper rollback scripts
    console.log(`⚠️  Rollback not implemented for ${filename}`);
    console.log('   Manual rollback required');
  }

  async close() {
    await this.pool.end();
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const migrationRunner = new MigrationRunner();

  try {
    await migrationRunner.init();

    switch (command) {
    case 'up':
    case 'migrate':
      await migrationRunner.runMigrations();
      break;
      
    case 'down':
    case 'rollback':
      const filename = process.argv[3];
      if (!filename) {
        console.error('❌ Please specify migration filename to rollback');
        process.exit(1);
      }
      await migrationRunner.rollbackMigration(filename);
      break;
      
    case 'status':
      const pending = await migrationRunner.getPendingMigrations();
      const executed = await migrationRunner.getExecutedMigrations();
        
      console.log('📊 Migration Status:');
      console.log(`   Executed: ${executed.length}`);
      console.log(`   Pending: ${pending.length}`);
        
      if (pending.length > 0) {
        console.log('   Pending migrations:');
        pending.forEach(migration => console.log(`     - ${migration}`));
      }
      break;
      
    default:
      console.log('Usage: node migration-runner.js [up|down|status] [filename]');
      console.log('  up/migrate    - Run pending migrations');
      console.log('  down/rollback - Rollback specific migration');
      console.log('  status        - Show migration status');
    }
  } catch (error) {
    console.error('❌ Migration runner error:', error.message);
    process.exit(1);
  } finally {
    await migrationRunner.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = MigrationRunner;
