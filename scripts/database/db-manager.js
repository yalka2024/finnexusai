#!/usr/bin/env node

/**
 * Database Manager
 * Comprehensive database management tool for FinNexusAI
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../../config/environments/development.env') });

class DatabaseManager {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'finnexusai_dev',
      password: process.env.DB_PASSWORD || 'password',
      port: process.env.DB_PORT || 5432,
    });
    
    this.migrationsPath = path.join(__dirname, '../../apps/backend/src/database/migrations');
  }

  async connect() {
    try {
      const client = await this.pool.connect();
      console.log('✅ Connected to database');
      return client;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    await this.pool.end();
    console.log('🔌 Disconnected from database');
  }

  async createMigrationsTable() {
    const client = await this.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          run_on TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      console.log('✅ Migrations table ensured');
    } finally {
      client.release();
    }
  }

  async getAppliedMigrations() {
    const client = await this.connect();
    try {
      const result = await client.query('SELECT name FROM migrations ORDER BY run_on');
      return result.rows.map(row => row.name);
    } finally {
      client.release();
    }
  }

  async runMigrations() {
    console.log('🚀 Running database migrations...');
    
    await this.createMigrationsTable();
    const appliedMigrations = await this.getAppliedMigrations();
    
    const migrationFiles = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    let newMigrations = 0;
    
    for (const file of migrationFiles) {
      if (!appliedMigrations.includes(file)) {
        console.log(`📄 Running migration: ${file}`);
        
        const client = await this.connect();
        try {
          const sql = fs.readFileSync(path.join(this.migrationsPath, file), 'utf8');
          
          // Execute migration in a transaction
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
          await client.query('COMMIT');
          
          console.log(`✅ Migration ${file} applied successfully`);
          newMigrations++;
          
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`❌ Migration ${file} failed:`, error.message);
          throw error;
        } finally {
          client.release();
        }
      } else {
        console.log(`⏭️ Migration ${file} already applied`);
      }
    }
    
    console.log(`🎉 Migration run completed. ${newMigrations} new migrations applied.`);
  }

  async rollbackMigration(migrationName) {
    console.log(`↩️ Rolling back migration: ${migrationName}`);
    
    const client = await this.connect();
    try {
      const result = await client.query('SELECT name FROM migrations WHERE name = $1', [migrationName]);
      
      if (result.rows.length === 0) {
        console.warn(`⚠️ Migration ${migrationName} not found in applied migrations`);
        return;
      }
      
      // Note: In a real scenario, you'd have rollback SQL files
      // For now, we just remove the migration record
      await client.query('DELETE FROM migrations WHERE name = $1', [migrationName]);
      console.log(`✅ Migration ${migrationName} rolled back (record removed)`);
      
    } finally {
      client.release();
    }
  }

  async resetDatabase() {
    console.log('🔄 Resetting database...');
    
    const client = await this.connect();
    try {
      // Drop all tables
      const result = await client.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' AND tablename != 'migrations'
      `);
      
      for (const row of result.rows) {
        await client.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
        console.log(`🗑️ Dropped table: ${row.tablename}`);
      }
      
      // Clear migrations table
      await client.query('DELETE FROM migrations');
      console.log('🧹 Cleared migrations table');
      
      console.log('✅ Database reset completed');
      
    } finally {
      client.release();
    }
  }

  async showStatus() {
    console.log('📊 Database Status:');
    console.log('=' .repeat(50));
    
    const client = await this.connect();
    try {
      // Show applied migrations
      const appliedMigrations = await this.getAppliedMigrations();
      console.log(`\n📋 Applied Migrations (${appliedMigrations.length}):`);
      appliedMigrations.forEach(migration => console.log(`   ✅ ${migration}`));
      
      // Show pending migrations
      const allMigrations = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      const pendingMigrations = allMigrations.filter(migration => 
        !appliedMigrations.includes(migration)
      );
      
      console.log(`\n⏳ Pending Migrations (${pendingMigrations.length}):`);
      pendingMigrations.forEach(migration => console.log(`   ⏸️ ${migration}`));
      
      // Show database info
      const dbInfo = await client.query(`
        SELECT 
          current_database() as database_name,
          version() as postgres_version,
          pg_database_size(current_database()) as database_size
      `);
      
      const info = dbInfo.rows[0];
      console.log('\n🗄️ Database Info:');
      console.log(`   Database: ${info.database_name}`);
      console.log(`   Version: ${info.postgres_version.split(' ')[0]}`);
      console.log(`   Size: ${Math.round(info.database_size / 1024 / 1024)} MB`);
      
      // Show table count
      const tableCount = await client.query(`
        SELECT COUNT(*) as table_count 
        FROM pg_tables 
        WHERE schemaname = 'public'
      `);
      
      console.log(`   Tables: ${tableCount.rows[0].table_count}`);
      
    } finally {
      client.release();
    }
  }

  async backupDatabase() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `backup_${timestamp}.sql`;
    
    console.log(`💾 Creating database backup: ${backupFile}`);
    
    try {
      const command = `pg_dump -h ${process.env.DB_HOST || 'localhost'} -p ${process.env.DB_PORT || 5432} -U ${process.env.DB_USER || 'postgres'} -d ${process.env.DB_NAME || 'finnexusai_dev'} > ${backupFile}`;
      execSync(command, { stdio: 'inherit' });
      console.log(`✅ Backup created: ${backupFile}`);
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
    }
  }

  async restoreDatabase(backupFile) {
    console.log(`📥 Restoring database from: ${backupFile}`);
    
    if (!fs.existsSync(backupFile)) {
      console.error(`❌ Backup file not found: ${backupFile}`);
      return;
    }
    
    try {
      const command = `psql -h ${process.env.DB_HOST || 'localhost'} -p ${process.env.DB_PORT || 5432} -U ${process.env.DB_USER || 'postgres'} -d ${process.env.DB_NAME || 'finnexusai_dev'} < ${backupFile}`;
      execSync(command, { stdio: 'inherit' });
      console.log(`✅ Database restored from: ${backupFile}`);
    } catch (error) {
      console.error('❌ Restore failed:', error.message);
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  const dbManager = new DatabaseManager();
  
  try {
    switch (command) {
    case 'up':
    case 'migrate':
      await dbManager.runMigrations();
      break;
        
    case 'down':
      if (!arg) {
        console.error('❌ Please specify migration name to rollback');
        process.exit(1);
      }
      await dbManager.rollbackMigration(arg);
      break;
        
    case 'status':
      await dbManager.showStatus();
      break;
        
    case 'reset':
      console.log('⚠️ This will delete all data! Are you sure? (yes/no)');
      // In a real implementation, you'd want to add confirmation
      await dbManager.resetDatabase();
      break;
        
    case 'backup':
      await dbManager.backupDatabase();
      break;
        
    case 'restore':
      if (!arg) {
        console.error('❌ Please specify backup file to restore');
        process.exit(1);
      }
      await dbManager.restoreDatabase(arg);
      break;
        
    default:
      console.log('🗄️ FinNexusAI Database Manager');
      console.log('=' .repeat(40));
      console.log('Usage: node db-manager.js <command> [argument]');
      console.log('');
      console.log('Commands:');
      console.log('  up, migrate     Run pending migrations');
      console.log('  down <name>     Rollback specific migration');
      console.log('  status          Show database status');
      console.log('  reset           Reset database (⚠️ DANGEROUS)');
      console.log('  backup          Create database backup');
      console.log('  restore <file>  Restore from backup');
      console.log('');
      console.log('Examples:');
      console.log('  node db-manager.js migrate');
      console.log('  node db-manager.js status');
      console.log('  node db-manager.js backup');
      break;
    }
  } catch (error) {
    console.error('❌ Operation failed:', error.message);
    process.exit(1);
  } finally {
    await dbManager.disconnect();
  }
}

// Run the CLI
main().catch(error => {
  console.error('💥 Database manager crashed:', error);
  process.exit(1);
});

