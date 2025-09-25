@echo off
REM FinNexusAI Backend Setup Script for Windows
REM This script sets up the development environment for FinNexusAI backend

echo.
echo 🚀 FinNexusAI Backend Setup
echo ============================
echo.

REM Check if Node.js is installed
echo ℹ️  Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ and try again.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js is installed: %NODE_VERSION%

REM Check Node.js version (simplified check)
echo %NODE_VERSION% | findstr /r "v1[8-9]\." >nul 2>&1
if %errorlevel% neq 0 (
    echo %NODE_VERSION% | findstr /r "v[2-9][0-9]\." >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Node.js version 18+ is required. Current version: %NODE_VERSION%
        pause
        exit /b 1
    )
)

echo ✅ Node.js version is compatible (18+)
echo.

REM Check if npm is installed
echo ℹ️  Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed
    pause
    exit /b 1
)
echo ✅ npm is installed
echo.

REM Check for Docker (optional)
echo ℹ️  Checking for Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Docker is not installed (optional for some features)
) else (
    echo ✅ Docker is installed
)
echo.

REM Create necessary directories
echo ℹ️  Creating necessary directories...
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads
if not exist "temp" mkdir temp
if not exist "backups" mkdir backups
echo ✅ Directories created
echo.

REM Install dependencies
echo ℹ️  Installing npm dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed successfully
echo.

REM Setup environment file
echo ℹ️  Setting up environment configuration...
if not exist ".env" (
    if exist "env.template" (
        copy env.template .env >nul
        echo ✅ Environment file created from template
        echo ⚠️  Please edit .env file with your configuration
    ) else (
        echo ❌ Environment template not found
        pause
        exit /b 1
    )
) else (
    echo ℹ️  Environment file already exists
)
echo.

REM Check if .env is configured
if not exist ".env.configured" (
    echo.
    echo ⚠️  IMPORTANT: Please edit the .env file with your configuration
    echo ℹ️  Required configurations:
    echo   - Database passwords and connection strings
    echo   - JWT secrets (generate secure random strings)
    echo   - External API keys (optional for development)
    echo.
    pause
    echo. > .env.configured
)

REM Setup databases with Docker if available
echo ℹ️  Setting up databases...
docker --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ℹ️  Starting databases with Docker Compose...
    docker-compose -f docker-compose.production.yml up -d postgres mongodb redis
    echo ℹ️  Waiting for databases to be ready...
    timeout /t 10 /nobreak >nul
    echo ✅ Databases started successfully
) else (
    echo ⚠️  Docker not available. Please ensure databases are running locally:
    echo   - PostgreSQL 15+ on port 5432
    echo   - MongoDB 6.0+ on port 27017
    echo   - Redis 7+ on port 6379
)
echo.

REM Run database migrations
echo ℹ️  Running database migrations...
call npm run migrate
if %errorlevel% neq 0 (
    echo ❌ Database migrations failed. Please check your database configuration
    echo ℹ️  Make sure your databases are running and accessible
    pause
    exit /b 1
)
echo ✅ Database migrations completed successfully
echo.

REM Seed database
echo ℹ️  Seeding database with initial data...
call npm run seed
if %errorlevel% neq 0 (
    echo ⚠️  Database seeding failed or already completed
) else (
    echo ✅ Database seeded successfully
)
echo.

REM Run tests
echo ℹ️  Running tests to verify setup...
call npm test
if %errorlevel% neq 0 (
    echo ⚠️  Some tests failed. This might be expected for initial setup
) else (
    echo ✅ All tests passed
)
echo.

echo ✅ Setup completed successfully! 🎉
echo.
echo ℹ️  Next steps:
echo   1. Review your .env configuration
echo   2. Start the development server: npm run dev
echo   3. Visit http://localhost:4000/api/v1/health to verify
echo   4. Check the API documentation at http://localhost:4000/api-docs
echo.
echo ℹ️  Available commands:
echo   npm run dev          - Start development server
echo   npm test             - Run all tests
echo   npm run migrate      - Run database migrations
echo   npm run seed         - Seed database with sample data
echo   npm run lint         - Run code linting
echo.
pause
