#!/bin/bash

# FinNexusAI Backend Setup Script
# This script sets up the development environment for FinNexusAI backend

set -e  # Exit on any error

echo "🚀 FinNexusAI Backend Setup"
echo "============================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Node.js is installed
check_nodejs() {
    print_info "Checking Node.js installation..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_status "Node.js is installed: $NODE_VERSION"
        
        # Check if version is 18 or higher
        NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR_VERSION" -ge 18 ]; then
            print_status "Node.js version is compatible (18+)"
        else
            print_error "Node.js version 18+ is required. Current version: $NODE_VERSION"
            exit 1
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
}

# Check if required tools are installed
check_tools() {
    print_info "Checking required tools..."
    
    local tools=("npm" "git" "docker" "docker-compose")
    for tool in "${tools[@]}"; do
        if command -v $tool &> /dev/null; then
            print_status "$tool is installed"
        else
            print_warning "$tool is not installed (optional for some features)"
        fi
    done
}

# Install dependencies
install_dependencies() {
    print_info "Installing npm dependencies..."
    npm install
    print_status "Dependencies installed successfully"
}

# Setup environment file
setup_environment() {
    print_info "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        if [ -f env.template ]; then
            cp env.template .env
            print_status "Environment file created from template"
            print_warning "Please edit .env file with your configuration"
        else
            print_error "Environment template not found"
            exit 1
        fi
    else
        print_info "Environment file already exists"
    fi
}

# Setup databases
setup_databases() {
    print_info "Setting up databases..."
    
    # Check if Docker is available
    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        print_info "Starting databases with Docker Compose..."
        
        # Start only the database services
        docker-compose -f docker-compose.production.yml up -d postgres mongodb redis
        
        # Wait for databases to be ready
        print_info "Waiting for databases to be ready..."
        sleep 10
        
        print_status "Databases started successfully"
    else
        print_warning "Docker not available. Please ensure PostgreSQL, MongoDB, and Redis are running locally"
        print_info "Required databases:"
        echo "  - PostgreSQL 15+ on port 5432"
        echo "  - MongoDB 6.0+ on port 27017"
        echo "  - Redis 7+ on port 6379"
    fi
}

# Run database migrations
run_migrations() {
    print_info "Running database migrations..."
    
    # Check if databases are accessible
    if npm run migrate 2>/dev/null; then
        print_status "Database migrations completed successfully"
    else
        print_error "Database migrations failed. Please check your database configuration"
        print_info "Make sure your databases are running and accessible"
        return 1
    fi
}

# Seed database
seed_database() {
    print_info "Seeding database with initial data..."
    
    if npm run seed 2>/dev/null; then
        print_status "Database seeded successfully"
    else
        print_warning "Database seeding failed or already completed"
    fi
}

# Run tests
run_tests() {
    print_info "Running tests to verify setup..."
    
    if npm test 2>/dev/null; then
        print_status "All tests passed"
    else
        print_warning "Some tests failed. This might be expected for initial setup"
    fi
}

# Create necessary directories
create_directories() {
    print_info "Creating necessary directories..."
    
    local directories=("logs" "uploads" "temp" "backups")
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_status "Created directory: $dir"
        fi
    done
}

# Setup Git hooks (optional)
setup_git_hooks() {
    if [ -d .git ]; then
        print_info "Setting up Git hooks..."
        
        # Create pre-commit hook
        cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "Running pre-commit checks..."
npm run lint
npm run test:unit
EOF
        chmod +x .git/hooks/pre-commit
        print_status "Git pre-commit hook installed"
    fi
}

# Main setup function
main() {
    echo
    print_info "Starting FinNexusAI Backend setup..."
    echo
    
    check_nodejs
    check_tools
    create_directories
    install_dependencies
    setup_environment
    setup_databases
    
    # Wait a bit for user to configure environment if needed
    if [ ! -f .env.configured ]; then
        echo
        print_warning "IMPORTANT: Please edit the .env file with your configuration before continuing"
        print_info "Required configurations:"
        echo "  - Database passwords and connection strings"
        echo "  - JWT secrets (generate secure random strings)"
        echo "  - External API keys (optional for development)"
        echo
        read -p "Press Enter after you've configured the .env file..."
        touch .env.configured
    fi
    
    run_migrations
    seed_database
    run_tests
    setup_git_hooks
    
    echo
    print_status "Setup completed successfully! 🎉"
    echo
    print_info "Next steps:"
    echo "  1. Review your .env configuration"
    echo "  2. Start the development server: npm run dev"
    echo "  3. Visit http://localhost:4000/api/v1/health to verify"
    echo "  4. Check the API documentation at http://localhost:4000/api-docs"
    echo
    print_info "Available commands:"
    echo "  npm run dev          - Start development server"
    echo "  npm test             - Run all tests"
    echo "  npm run migrate      - Run database migrations"
    echo "  npm run seed         - Seed database with sample data"
    echo "  npm run lint         - Run code linting"
    echo
}

# Handle script interruption
trap 'print_error "Setup interrupted"; exit 1' INT

# Run main function
main "$@"
