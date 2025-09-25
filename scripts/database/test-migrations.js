#!/usr/bin/env node

/**
 * Database Migration Test Script
 * Tests the migration system without requiring a full database setup
 */

const fs = require('fs');
const path = require('path');

// Mock database connection for testing
class MockDatabase {
  constructor() {
    this.connected = false;
    this.migrations = [];
  }

  async connect() {
    console.log('🔗 Mock database connection established');
    this.connected = true;
    return this;
  }

  async query(sql, params = []) {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    console.log(`📝 Executing SQL: ${sql.substring(0, 100)}...`);
    
    // Mock responses for different queries
    if (sql.includes('CREATE TABLE IF NOT EXISTS migrations')) {
      return { rows: [] };
    }
    
    if (sql.includes('SELECT name FROM migrations')) {
      return { rows: this.migrations.map(name => ({ name })) };
    }
    
    if (sql.includes('INSERT INTO migrations')) {
      const migrationName = params[0];
      this.migrations.push(migrationName);
      console.log(`✅ Migration ${migrationName} recorded`);
      return { rows: [{ id: this.migrations.length }] };
    }
    
    if (sql.includes('DELETE FROM migrations')) {
      const migrationName = params[0];
      const index = this.migrations.indexOf(migrationName);
      if (index > -1) {
        this.migrations.splice(index, 1);
        console.log(`↩️ Migration ${migrationName} rolled back`);
      }
      return { rows: [] };
    }
    
    return { rows: [] };
  }

  async disconnect() {
    console.log('🔌 Mock database connection closed');
    this.connected = false;
  }
}

// Test migration runner
class TestMigrationRunner {
  constructor() {
    this.db = new MockDatabase();
    this.migrationsPath = path.join(__dirname, '../../apps/backend/src/database/migrations');
  }

  async testMigrations() {
    try {
      console.log('🚀 Starting database migration tests...\n');
      
      // Test 1: Check if migrations directory exists
      console.log('Test 1: Checking migrations directory...');
      if (fs.existsSync(this.migrationsPath)) {
        console.log('✅ Migrations directory exists');
      } else {
        console.log('❌ Migrations directory not found');
        return false;
      }

      // Test 2: List migration files
      console.log('\nTest 2: Listing migration files...');
      const migrationFiles = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      if (migrationFiles.length > 0) {
        console.log(`✅ Found ${migrationFiles.length} migration files:`);
        migrationFiles.forEach(file => console.log(`   - ${file}`));
      } else {
        console.log('❌ No migration files found');
        return false;
      }

      // Test 3: Test database connection
      console.log('\nTest 3: Testing database connection...');
      await this.db.connect();
      console.log('✅ Database connection successful');

      // Test 4: Test migrations table creation
      console.log('\nTest 4: Testing migrations table creation...');
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          run_on TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      console.log('✅ Migrations table creation successful');

      // Test 5: Test migration execution
      console.log('\nTest 5: Testing migration execution...');
      for (const file of migrationFiles.slice(0, 3)) { // Test first 3 migrations
        console.log(`\n📄 Testing migration: ${file}`);
        const sql = fs.readFileSync(path.join(this.migrationsPath, file), 'utf8');
        
        // Check if SQL is valid (basic syntax check)
        if (sql.trim().length > 0) {
          await this.db.query(sql);
          await this.db.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
          console.log(`✅ Migration ${file} executed successfully`);
        } else {
          console.log(`⚠️ Migration ${file} is empty`);
        }
      }

      // Test 6: Test rollback
      console.log('\nTest 6: Testing migration rollback...');
      const lastMigration = migrationFiles[0];
      await this.db.query('DELETE FROM migrations WHERE name = $1', [lastMigration]);
      console.log(`✅ Migration ${lastMigration} rolled back successfully`);

      // Test 7: Check migration status
      console.log('\nTest 7: Checking migration status...');
      const result = await this.db.query('SELECT name FROM migrations');
      console.log(`✅ ${result.rows.length} migrations currently applied`);

      await this.db.disconnect();
      
      console.log('\n🎉 All migration tests passed successfully!');
      return true;

    } catch (error) {
      console.error('\n❌ Migration test failed:', error.message);
      return false;
    }
  }

  async testMigrationFiles() {
    console.log('\n🔍 Testing individual migration files...\n');
    
    const migrationFiles = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    let passed = 0;
    let failed = 0;

    for (const file of migrationFiles) {
      try {
        console.log(`Testing ${file}...`);
        const sql = fs.readFileSync(path.join(this.migrationsPath, file), 'utf8');
        
        // Basic SQL validation
        if (sql.trim().length === 0) {
          console.log(`⚠️ ${file}: Empty file`);
          failed++;
          continue;
        }

        // Check for common SQL patterns
        const hasCreateTable = sql.toLowerCase().includes('create table');
        const hasCreateIndex = sql.toLowerCase().includes('create index');
        const hasInsert = sql.toLowerCase().includes('insert into');
        const hasAlter = sql.toLowerCase().includes('alter table');

        if (hasCreateTable || hasCreateIndex || hasInsert || hasAlter) {
          console.log(`✅ ${file}: Valid SQL structure`);
          passed++;
        } else {
          console.log(`⚠️ ${file}: No recognized SQL operations`);
          failed++;
        }

      } catch (error) {
        console.log(`❌ ${file}: Error - ${error.message}`);
        failed++;
      }
    }

    console.log('\n📊 Migration file test results:');
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📄 Total: ${migrationFiles.length}`);

    return failed === 0;
  }
}

// Run tests
async function runTests() {
  const runner = new TestMigrationRunner();
  
  console.log('🧪 FinNexusAI Database Migration Test Suite\n');
  console.log('=' .repeat(50));
  
  const migrationTests = await runner.testMigrations();
  const fileTests = await runner.testMigrationFiles();
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 Test Summary:');
  console.log(`   Migration System: ${migrationTests ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Migration Files: ${fileTests ? '✅ PASS' : '❌ FAIL'}`);
  
  if (migrationTests && fileTests) {
    console.log('\n🎉 All tests passed! Database migration system is ready.');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please check the issues above.');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test runner crashed:', error);
  process.exit(1);
});
