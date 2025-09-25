@echo off
REM FinNexusAI Setup Script for Windows
echo 🚀 FinNexusAI Setup Script for Windows
echo ======================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js is installed
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ npm is installed
npm --version

REM Create necessary directories
echo 📁 Creating project directories...
if not exist "apps\backend\logs" mkdir "apps\backend\logs"
if not exist "apps\backend\tests" mkdir "apps\backend\tests"
if not exist "apps\frontend\public" mkdir "apps\frontend\public"
if not exist "docs" mkdir "docs"
if not exist "scripts" mkdir "scripts"
if not exist "smart-contracts" mkdir "smart-contracts"

echo ✅ Directories created

REM Install backend dependencies
echo 🔧 Installing backend dependencies...
cd apps\backend

REM Install dependencies
npm install

echo ✅ Backend dependencies installed

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo 📝 Creating .env file...
    copy env.example .env
    echo ⚠️  Please update the .env file with your actual configuration values
) else (
    echo ✅ .env file already exists
)

REM Create logs directory
if not exist "logs" mkdir "logs"

REM Go back to project root
cd ..\..

echo 🎉 FinNexusAI Setup Complete!
echo =============================
echo.
echo 📁 Project Structure:
echo   ✅ Backend API server
echo   ✅ Development scripts
echo   ✅ Documentation
echo.
echo 🚀 Next Steps:
echo   1. Update apps\backend\.env with your configuration
echo   2. Start development: cd apps\backend ^&^& npm run dev
echo.
echo 📚 Documentation:
echo   • API Docs: http://localhost:3000/api-docs
echo   • Health Check: http://localhost:3000/health
echo.
echo Happy coding! 🚀
pause