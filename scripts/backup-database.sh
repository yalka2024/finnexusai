#!/bin/bash

# FinAI Nexus - Database Backup Script
# Automated backup system for PostgreSQL and MongoDB

set -e

# Configuration
BACKUP_DIR="/backups/finnexus"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
AWS_S3_BUCKET="${AWS_S3_BUCKET:-finnexus-backups}"
LOG_FILE="/var/log/finnexus-backup.log"

# Database credentials
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-finnexusai_production}"
POSTGRES_USER="${POSTGRES_USER:-finnexus_prod}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"

MONGODB_HOST="${MONGODB_HOST:-localhost}"
MONGODB_PORT="${MONGODB_PORT:-27017}"
MONGODB_DB="${MONGODB_DB:-finnexusai_production}"
MONGODB_USER="${MONGODB_USER:-finnexus_mongo}"
MONGODB_PASSWORD="${MONGODB_PASSWORD}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# PostgreSQL Backup
backup_postgres() {
    log "Starting PostgreSQL backup..."
    
    local backup_file="$BACKUP_DIR/postgres_${DATE}.sql"
    local compressed_file="${backup_file}.gz"
    
    # Set password for pg_dump
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # Create backup
    pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        --verbose --no-password --format=custom --compress=9 \
        --file="$compressed_file" || error_exit "PostgreSQL backup failed"
    
    # Verify backup
    if [ -f "$compressed_file" ] && [ -s "$compressed_file" ]; then
        log "PostgreSQL backup successful: $compressed_file"
        
        # Upload to S3 if configured
        if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
            aws s3 cp "$compressed_file" "s3://$AWS_S3_BUCKET/postgres/" || error_exit "S3 upload failed"
            log "PostgreSQL backup uploaded to S3"
        fi
        
        echo "$compressed_file" > "$BACKUP_DIR/latest_postgres_backup"
    else
        error_exit "PostgreSQL backup file is empty or missing"
    fi
}

# MongoDB Backup
backup_mongodb() {
    log "Starting MongoDB backup..."
    
    local backup_dir="$BACKUP_DIR/mongodb_${DATE}"
    local compressed_file="${backup_dir}.tar.gz"
    
    # Create backup directory
    mkdir -p "$backup_dir"
    
    # Create backup
    mongodump --host "$MONGODB_HOST:$MONGODB_PORT" \
        --db "$MONGODB_DB" \
        --username "$MONGODB_USER" \
        --password "$MONGODB_PASSWORD" \
        --out "$backup_dir" || error_exit "MongoDB backup failed"
    
    # Compress backup
    tar -czf "$compressed_file" -C "$BACKUP_DIR" "mongodb_${DATE}" || error_exit "MongoDB compression failed"
    
    # Remove uncompressed directory
    rm -rf "$backup_dir"
    
    # Verify backup
    if [ -f "$compressed_file" ] && [ -s "$compressed_file" ]; then
        log "MongoDB backup successful: $compressed_file"
        
        # Upload to S3 if configured
        if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
            aws s3 cp "$compressed_file" "s3://$AWS_S3_BUCKET/mongodb/" || error_exit "S3 upload failed"
            log "MongoDB backup uploaded to S3"
        fi
        
        echo "$compressed_file" > "$BACKUP_DIR/latest_mongodb_backup"
    else
        error_exit "MongoDB backup file is empty or missing"
    fi
}

# Redis Backup
backup_redis() {
    log "Starting Redis backup..."
    
    local backup_file="$BACKUP_DIR/redis_${DATE}.rdb"
    
    # Redis backup (if using RDB persistence)
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --rdb "$backup_file" || error_exit "Redis backup failed"
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --rdb "$backup_file" || error_exit "Redis backup failed"
    fi
    
    # Compress backup
    gzip "$backup_file"
    local compressed_file="${backup_file}.gz"
    
    if [ -f "$compressed_file" ] && [ -s "$compressed_file" ]; then
        log "Redis backup successful: $compressed_file"
        
        # Upload to S3 if configured
        if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
            aws s3 cp "$compressed_file" "s3://$AWS_S3_BUCKET/redis/" || error_exit "S3 upload failed"
            log "Redis backup uploaded to S3"
        fi
        
        echo "$compressed_file" > "$BACKUP_DIR/latest_redis_backup"
    else
        error_exit "Redis backup file is empty or missing"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.rdb.gz" -mtime +$RETENTION_DAYS -delete
    
    log "Cleanup completed"
}

# Backup verification
verify_backups() {
    log "Verifying backups..."
    
    local postgres_backup=$(cat "$BACKUP_DIR/latest_postgres_backup" 2>/dev/null || echo "")
    local mongodb_backup=$(cat "$BACKUP_DIR/latest_mongodb_backup" 2>/dev/null || echo "")
    local redis_backup=$(cat "$BACKUP_DIR/latest_redis_backup" 2>/dev/null || echo "")
    
    local verification_passed=true
    
    # Verify PostgreSQL backup
    if [ -n "$postgres_backup" ] && [ -f "$postgres_backup" ]; then
        log "✅ PostgreSQL backup verified: $postgres_backup"
    else
        log "❌ PostgreSQL backup verification failed"
        verification_passed=false
    fi
    
    # Verify MongoDB backup
    if [ -n "$mongodb_backup" ] && [ -f "$mongodb_backup" ]; then
        log "✅ MongoDB backup verified: $mongodb_backup"
    else
        log "❌ MongoDB backup verification failed"
        verification_passed=false
    fi
    
    # Verify Redis backup
    if [ -n "$redis_backup" ] && [ -f "$redis_backup" ]; then
        log "✅ Redis backup verified: $redis_backup"
    else
        log "❌ Redis backup verification failed"
        verification_passed=false
    fi
    
    if [ "$verification_passed" = true ]; then
        log "✅ All backups verified successfully"
    else
        error_exit "Backup verification failed"
    fi
}

# Main backup function
main() {
    log "Starting FinAI Nexus backup process..."
    
    # Check required environment variables
    if [ -z "$POSTGRES_PASSWORD" ]; then
        error_exit "POSTGRES_PASSWORD environment variable is required"
    fi
    
    if [ -z "$MONGODB_PASSWORD" ]; then
        error_exit "MONGODB_PASSWORD environment variable is required"
    fi
    
    # Perform backups
    backup_postgres
    backup_mongodb
    backup_redis
    
    # Verify backups
    verify_backups
    
    # Cleanup old backups
    cleanup_old_backups
    
    log "✅ Backup process completed successfully"
    
    # Send notification (optional)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"✅ FinAI Nexus backup completed successfully at $(date)\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
}

# Run main function
main "$@"

