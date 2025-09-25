#!/usr/bin/env node

/**
 * Development Database Setup Script
 * Sets up a local PostgreSQL database for development
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function warning(message) {
  log(`⚠️ ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️ ${message}`, 'blue');
}

// Check if PostgreSQL is installed
function checkPostgreSQL() {
  try {
    execSync('psql --version', { stdio: 'pipe' });
    return true;
  } catch (err) {
    return false;
  }
}

// Check if Docker is available
function checkDocker() {
  try {
    execSync('docker --version', { stdio: 'pipe' });
    return true;
  } catch (err) {
    return false;
  }
}

// Setup PostgreSQL with Docker
function setupPostgreSQLWithDocker() {
  info('Setting up PostgreSQL with Docker...');
  
  try {
    // Create docker-compose.yml for PostgreSQL
    const dockerCompose = `version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: finnexusai-postgres-dev
    environment:
      POSTGRES_DB: finnexusai_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: finnexusai-redis-dev
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
`;

    fs.writeFileSync('docker-compose.dev.yml', dockerCompose);
    success('Docker Compose file created');

    // Create init-db.sql
    const initDb = `-- FinNexusAI Development Database Initialization
-- This script sets up the development database

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE finnexusai_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'finnexusai_dev');

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE finnexusai_dev TO postgres;

-- Create a test database
CREATE DATABASE finnexusai_test;
GRANT ALL PRIVILEGES ON DATABASE finnexusai_test TO postgres;
`;

    fs.writeFileSync('init-db.sql', initDb);
    success('Database initialization script created');

    // Start containers
    info('Starting PostgreSQL and Redis containers...');
    execSync('docker-compose -f docker-compose.dev.yml up -d', { stdio: 'inherit' });
    
    // Wait for containers to be ready
    info('Waiting for containers to be ready...');
    execSync('docker-compose -f docker-compose.dev.yml exec postgres pg_isready -U postgres', { stdio: 'inherit' });
    
    success('PostgreSQL and Redis containers are running');
    return true;

  } catch (err) {
    error(`Failed to setup PostgreSQL with Docker: ${err.message}`);
    return false;
  }
}

// Setup PostgreSQL natively
function setupPostgreSQLNative() {
  info('Setting up PostgreSQL natively...');
  
  try {
    // Create databases
    execSync('createdb finnexusai_dev', { stdio: 'inherit' });
    success('Development database created');
    
    execSync('createdb finnexusai_test', { stdio: 'inherit' });
    success('Test database created');
    
    return true;

  } catch (err) {
    error(`Failed to setup PostgreSQL natively: ${err.message}`);
    return false;
  }
}

// Run migrations
function runMigrations() {
  info('Running database migrations...');
  
  try {
    execSync('node scripts/database/migration-runner.js up', { stdio: 'inherit' });
    success('Database migrations completed');
    return true;

  } catch (err) {
    error(`Failed to run migrations: ${err.message}`);
    return false;
  }
}

// Create .env file for development
function createDevEnvFile() {
  info('Creating development environment file...');
  
  const envContent = `# FinNexusAI Development Environment
NODE_ENV=development
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/finnexusai_dev
DB_USER=postgres
DB_HOST=localhost
DB_NAME=finnexusai_dev
DB_PASSWORD=password
DB_PORT=5432

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# JWT Configuration
JWT_SECRET=dev-jwt-secret-key-not-for-production
JWT_REFRESH_SECRET=dev-refresh-secret-key-not-for-production

# External APIs (Add your keys here)
COINGECKO_API_KEY=your-coingecko-api-key
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-api-key
OPENAI_API_KEY=your-openai-api-key

# Development Settings
HOT_RELOAD=true
DEBUG_MODE=true
MOCK_EXTERNAL_APIS=true
ENABLE_CORS=true

# Trading (Test Mode)
HFT_ENABLED=false
ARBITRAGE_ENABLED=true
DERIVATIVES_ENABLED=true
SANDBOX_ENABLED=true
`;

  fs.writeFileSync('.env', envContent);
  success('Development environment file created');
}

// Main setup function
async function main() {
  log('🚀 FinNexusAI Development Database Setup', 'bright');
  log('=' .repeat(50), 'cyan');
  
  // Check prerequisites
  const hasPostgreSQL = checkPostgreSQL();
  const hasDocker = checkDocker();
  
  info(`PostgreSQL installed: ${hasPostgreSQL ? 'Yes' : 'No'}`);
  info(`Docker installed: ${hasDocker ? 'Yes' : 'No'}`);
  
  let setupSuccess = false;
  
  if (hasDocker) {
    log('\n🐳 Using Docker for database setup...', 'magenta');
    setupSuccess = setupPostgreSQLWithDocker();
  } else if (hasPostgreSQL) {
    log('\n🐘 Using native PostgreSQL...', 'magenta');
    setupSuccess = setupPostgreSQLNative();
  } else {
    error('Neither PostgreSQL nor Docker is installed. Please install one of them.');
    log('\nInstallation options:', 'yellow');
    log('1. Install PostgreSQL: https://www.postgresql.org/download/', 'yellow');
    log('2. Install Docker: https://www.docker.com/get-started', 'yellow');
    process.exit(1);
  }
  
  if (!setupSuccess) {
    error('Database setup failed');
    process.exit(1);
  }
  
  // Create development environment file
  createDevEnvFile();
  
  // Wait a bit for database to be ready
  info('Waiting for database to be ready...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Run migrations
  const migrationSuccess = runMigrations();
  
  if (migrationSuccess) {
    log('\n🎉 Development database setup completed successfully!', 'green');
    log('\nNext steps:', 'bright');
    log('1. Update .env file with your API keys', 'yellow');
    log('2. Run: npm start', 'yellow');
    log('3. Visit: http://localhost:3000', 'yellow');
    
    if (hasDocker) {
      log('\nDocker commands:', 'bright');
      log('• Stop: docker-compose -f docker-compose.dev.yml down', 'yellow');
      log('• Start: docker-compose -f docker-compose.dev.yml up -d', 'yellow');
      log('• Logs: docker-compose -f docker-compose.dev.yml logs -f', 'yellow');
    }
  } else {
    error('Migration failed');
    process.exit(1);
  }
}

// Run the setup
main().catch(error => {
  error(`Setup failed: ${error.message}`);
  process.exit(1);
});

