#!/bin/bash

# FinAI Nexus - SSL Certificate Setup Script
# Automated SSL certificate generation and renewal

set -e

# Configuration
DOMAINS=("api.finainexus.com" "app.finainexus.com" "finainexus.com")
EMAIL="${SSL_EMAIL:-admin@finainexus.com}"
NGINX_CONF_DIR="/etc/nginx"
SSL_DIR="/etc/nginx/ssl"
CERTBOT_DIR="/var/www/certbot"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error_exit "This script must be run as root"
    fi
}

# Install required packages
install_dependencies() {
    log "Installing dependencies..."
    
    # Update package list
    apt-get update
    
    # Install certbot and nginx plugin
    apt-get install -y certbot python3-certbot-nginx nginx
    
    log "Dependencies installed successfully"
}

# Create SSL directory
create_ssl_directory() {
    log "Creating SSL directory..."
    mkdir -p "$SSL_DIR"
    chmod 700 "$SSL_DIR"
}

# Generate self-signed certificates (for testing)
generate_self_signed() {
    log "Generating self-signed certificates for testing..."
    
    local domain_list=$(IFS=','; echo "${DOMAINS[*]}")
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/key.pem" \
        -out "$SSL_DIR/cert.pem" \
        -subj "/C=US/ST=State/L=City/O=FinAI Nexus/CN=finainexus.com" \
        -addext "subjectAltName=DNS:api.finainexus.com,DNS:app.finainexus.com,DNS:finainexus.com"
    
    log "Self-signed certificates generated"
}

# Obtain Let's Encrypt certificates
obtain_letsencrypt() {
    log "Obtaining Let's Encrypt certificates..."
    
    # Create certbot webroot directory
    mkdir -p "$CERTBOT_DIR"
    
    # Stop nginx temporarily
    systemctl stop nginx
    
    # Obtain certificates
    certbot certonly \
        --webroot \
        --webroot-path="$CERTBOT_DIR" \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --domains "$(IFS=','; echo "${DOMAINS[*]}")" \
        --non-interactive || error_exit "Failed to obtain Let's Encrypt certificates"
    
    # Create symlinks for nginx
    ln -sf "/etc/letsencrypt/live/${DOMAINS[0]}/fullchain.pem" "$SSL_DIR/cert.pem"
    ln -sf "/etc/letsencrypt/live/${DOMAINS[0]}/privkey.pem" "$SSL_DIR/key.pem"
    
    # Set proper permissions
    chmod 644 "$SSL_DIR/cert.pem"
    chmod 600 "$SSL_DIR/key.pem"
    
    # Start nginx
    systemctl start nginx
    
    log "Let's Encrypt certificates obtained successfully"
}

# Setup certificate auto-renewal
setup_renewal() {
    log "Setting up certificate auto-renewal..."
    
    # Create renewal script
    cat > /usr/local/bin/renew-ssl.sh << 'EOF'
#!/bin/bash

# SSL Certificate Renewal Script
set -e

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log "Starting SSL certificate renewal check..."

# Renew certificates
certbot renew --quiet --no-self-upgrade

# Reload nginx if certificates were renewed
if [ $? -eq 0 ]; then
    log "Certificates renewed successfully"
    systemctl reload nginx
    log "Nginx reloaded with new certificates"
else
    log "No certificates needed renewal"
fi

log "SSL renewal check completed"
EOF
    
    chmod +x /usr/local/bin/renew-ssl.sh
    
    # Add to crontab (run twice daily)
    (crontab -l 2>/dev/null; echo "0 2,14 * * * /usr/local/bin/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1") | crontab -
    
    log "SSL auto-renewal configured"
}

# Test SSL configuration
test_ssl() {
    log "Testing SSL configuration..."
    
    # Test nginx configuration
    nginx -t || error_exit "Nginx configuration test failed"
    
    # Test SSL certificates
    for domain in "${DOMAINS[@]}"; do
        log "Testing SSL for $domain..."
        echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates || log "Warning: Could not test SSL for $domain"
    done
    
    log "SSL configuration test completed"
}

# Setup SSL monitoring
setup_monitoring() {
    log "Setting up SSL monitoring..."
    
    # Create SSL monitoring script
    cat > /usr/local/bin/ssl-monitor.sh << 'EOF'
#!/bin/bash

# SSL Certificate Monitoring Script
set -e

DOMAINS=("api.finainexus.com" "app.finainexus.com" "finainexus.com")
WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

check_cert_expiry() {
    local domain="$1"
    local expiry_date=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
    local expiry_timestamp=$(date -d "$expiry_date" +%s)
    local current_timestamp=$(date +%s)
    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
    
    echo "$days_until_expiry"
}

send_alert() {
    local message="$1"
    
    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🔒 SSL Alert: $message\"}" \
            "$WEBHOOK_URL"
    fi
    
    echo "SSL Alert: $message"
}

for domain in "${DOMAINS[@]}"; do
    days_until_expiry=$(check_cert_expiry "$domain")
    
    if [ "$days_until_expiry" -lt 30 ]; then
        send_alert "SSL certificate for $domain expires in $days_until_expiry days"
    elif [ "$days_until_expiry" -lt 7 ]; then
        send_alert "⚠️ URGENT: SSL certificate for $domain expires in $days_until_expiry days"
    fi
done
EOF
    
    chmod +x /usr/local/bin/ssl-monitor.sh
    
    # Add to crontab (run daily)
    (crontab -l 2>/dev/null; echo "0 9 * * * /usr/local/bin/ssl-monitor.sh >> /var/log/ssl-monitor.log 2>&1") | crontab -
    
    log "SSL monitoring configured"
}

# Main function
main() {
    log "Starting SSL setup for FinAI Nexus..."
    
    # Check if running as root
    check_root
    
    # Check if we're in production or testing mode
    if [ "${SSL_MODE:-production}" = "testing" ]; then
        log "Running in testing mode - generating self-signed certificates"
        create_ssl_directory
        generate_self_signed
    else
        log "Running in production mode - obtaining Let's Encrypt certificates"
        install_dependencies
        create_ssl_directory
        obtain_letsencrypt
        setup_renewal
        setup_monitoring
    fi
    
    # Test SSL configuration
    test_ssl
    
    log "✅ SSL setup completed successfully"
    
    # Display certificate information
    log "Certificate information:"
    for domain in "${DOMAINS[@]}"; do
        log "Domain: $domain"
        echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -subject -dates || log "Could not retrieve certificate info for $domain"
        echo ""
    done
}

# Run main function
main "$@"

