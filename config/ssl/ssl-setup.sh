#!/bin/bash

# FinNexusAI SSL Certificate Setup Script
# Automates SSL certificate generation and management

set -e

# Configuration
DOMAIN="finnexusai.com"
EMAIL="admin@finnexusai.com"
SSL_DIR="/etc/ssl"
NGINX_DIR="/etc/nginx"
BACKUP_DIR="/etc/ssl/backup"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
        exit 1
    fi
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v certbot &> /dev/null; then
        error "Certbot is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v openssl &> /dev/null; then
        error "OpenSSL is not installed. Please install it first."
        exit 1
    fi
    
    success "All dependencies are installed"
}

# Create backup of existing certificates
backup_certificates() {
    log "Creating backup of existing certificates..."
    
    if [ -d "$SSL_DIR/certs" ]; then
        mkdir -p "$BACKUP_DIR"
        cp -r "$SSL_DIR/certs" "$BACKUP_DIR/certs-$(date +%Y%m%d-%H%M%S)"
        success "Backup created"
    fi
}

# Generate self-signed certificate (for development)
generate_self_signed() {
    log "Generating self-signed certificate for development..."
    
    mkdir -p "$SSL_DIR/certs" "$SSL_DIR/private"
    
    # Generate private key
    openssl genrsa -out "$SSL_DIR/private/finnexusai-dev.key" 4096
    
    # Generate certificate signing request
    openssl req -new -key "$SSL_DIR/private/finnexusai-dev.key" \
        -out "$SSL_DIR/certs/finnexusai-dev.csr" \
        -subj "/C=US/ST=CA/L=San Francisco/O=FinNexusAI/OU=Development/CN=localhost"
    
    # Generate self-signed certificate
    openssl x509 -req -days 365 -in "$SSL_DIR/certs/finnexusai-dev.csr" \
        -signkey "$SSL_DIR/private/finnexusai-dev.key" \
        -out "$SSL_DIR/certs/finnexusai-dev.crt"
    
    # Set proper permissions
    chmod 600 "$SSL_DIR/private/finnexusai-dev.key"
    chmod 644 "$SSL_DIR/certs/finnexusai-dev.crt"
    
    success "Self-signed certificate generated"
}

# Generate Let's Encrypt certificate (for production)
generate_letsencrypt() {
    log "Generating Let's Encrypt certificate for production..."
    
    # Stop nginx if running
    if systemctl is-active --quiet nginx; then
        log "Stopping nginx..."
        systemctl stop nginx
    fi
    
    # Generate certificate
    certbot certonly --standalone \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --domains "$DOMAIN,www.$DOMAIN,admin.$DOMAIN" \
        --cert-name finnexusai
    
    # Create symlinks for easier management
    ln -sf "/etc/letsencrypt/live/finnexusai/fullchain.pem" "$SSL_DIR/certs/finnexusai.crt"
    ln -sf "/etc/letsencrypt/live/finnexusai/privkey.pem" "$SSL_DIR/private/finnexusai.key"
    ln -sf "/etc/letsencrypt/live/finnexusai/chain.pem" "$SSL_DIR/certs/finnexusai-ca.crt"
    
    success "Let's Encrypt certificate generated"
}

# Setup certificate auto-renewal
setup_auto_renewal() {
    log "Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > /etc/cron.d/certbot-renew << EOF
# Auto-renew Let's Encrypt certificates
0 12 * * * root /usr/bin/certbot renew --quiet --reload-hook "systemctl reload nginx"
EOF
    
    # Create renewal hook script
    cat > /usr/local/bin/certbot-renewal-hook << 'EOF'
#!/bin/bash
# Certificate renewal hook for FinNexusAI

# Reload nginx configuration
systemctl reload nginx

# Update certificate symlinks
ln -sf /etc/letsencrypt/live/finnexusai/fullchain.pem /etc/ssl/certs/finnexusai.crt
ln -sf /etc/letsencrypt/live/finnexusai/privkey.pem /etc/ssl/private/finnexusai.key
ln -sf /etc/letsencrypt/live/finnexusai/chain.pem /etc/ssl/certs/finnexusai-ca.crt

# Log renewal
echo "$(date): SSL certificate renewed successfully" >> /var/log/ssl-renewal.log
EOF
    
    chmod +x /usr/local/bin/certbot-renewal-hook
    
    success "Auto-renewal setup completed"
}

# Generate strong Diffie-Hellman parameters
generate_dh_params() {
    log "Generating strong Diffie-Hellman parameters (this may take a while)..."
    
    if [ ! -f "$SSL_DIR/certs/dhparam.pem" ]; then
        openssl dhparam -out "$SSL_DIR/certs/dhparam.pem" 4096
        success "DH parameters generated"
    else
        warning "DH parameters already exist"
    fi
}

# Setup SSL configuration for nginx
setup_nginx_ssl() {
    log "Setting up nginx SSL configuration..."
    
    # Copy nginx configuration
    if [ -f "config/ssl/nginx.conf" ]; then
        cp config/ssl/nginx.conf "$NGINX_DIR/nginx.conf"
        success "Nginx SSL configuration copied"
    else
        warning "Nginx configuration file not found"
    fi
    
    # Test nginx configuration
    if nginx -t; then
        success "Nginx configuration test passed"
    else
        error "Nginx configuration test failed"
        exit 1
    fi
}

# Start services
start_services() {
    log "Starting services..."
    
    # Start nginx
    systemctl enable nginx
    systemctl start nginx
    
    # Check status
    if systemctl is-active --quiet nginx; then
        success "Nginx started successfully"
    else
        error "Failed to start nginx"
        exit 1
    fi
}

# Verify SSL setup
verify_ssl() {
    log "Verifying SSL setup..."
    
    # Check certificate files
    if [ -f "$SSL_DIR/certs/finnexusai.crt" ] && [ -f "$SSL_DIR/private/finnexusai.key" ]; then
        success "SSL certificate files are present"
    else
        error "SSL certificate files are missing"
        exit 1
    fi
    
    # Check certificate validity
    if openssl x509 -in "$SSL_DIR/certs/finnexusai.crt" -text -noout > /dev/null 2>&1; then
        success "SSL certificate is valid"
    else
        error "SSL certificate is invalid"
        exit 1
    fi
    
    # Test HTTPS connection
    if curl -k -s -o /dev/null -w "%{http_code}" https://localhost/health | grep -q "200"; then
        success "HTTPS connection test passed"
    else
        warning "HTTPS connection test failed (this is normal if the backend is not running)"
    fi
}

# Main function
main() {
    log "Starting FinNexusAI SSL setup..."
    
    check_root
    check_dependencies
    backup_certificates
    
    # Ask user for certificate type
    echo "Select certificate type:"
    echo "1) Self-signed (for development)"
    echo "2) Let's Encrypt (for production)"
    read -p "Enter choice [1-2]: " choice
    
    case $choice in
        1)
            generate_self_signed
            ;;
        2)
            generate_letsencrypt
            setup_auto_renewal
            ;;
        *)
            error "Invalid choice"
            exit 1
            ;;
    esac
    
    generate_dh_params
    setup_nginx_ssl
    start_services
    verify_ssl
    
    success "SSL setup completed successfully!"
    
    echo ""
    echo "Next steps:"
    echo "1. Update your DNS records to point to this server"
    echo "2. Test your SSL configuration at: https://www.ssllabs.com/ssltest/"
    echo "3. Monitor certificate expiration with: certbot certificates"
    echo "4. Check renewal logs at: /var/log/ssl-renewal.log"
}

# Run main function
main "$@"

