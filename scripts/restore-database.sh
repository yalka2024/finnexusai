#!/bin/bash

# FinAI Nexus - Database Restore Script
# Disaster recovery and database restoration

set -e

# Configuration
BACKUP_DIR="/backups/finnexus"
LOG_FILE="/var/log/finnexus-restore.log"

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

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -p, --postgres FILE    Restore PostgreSQL from FILE"
    echo "  -m, --mongodb FILE     Restore MongoDB from FILE"
    echo "  -r, --redis FILE       Restore Redis from FILE"
    echo "  -a, --all             Restore all databases from latest backups"
    echo "  -l, --list            List available backups"
    echo "  -h, --help            Show this help"
    exit 1
}

# List available backups
list_backups() {
    log "Available backups:"
    echo "PostgreSQL backups:"
    ls -la "$BACKUP_DIR"/postgres_*.sql.gz 2>/dev/null || echo "No PostgreSQL backups found"
    echo ""
    echo "MongoDB backups:"
    ls -la "$BACKUP_DIR"/mongodb_*.tar.gz 2>/dev/null || echo "No MongoDB backups found"
    echo ""
    echo "Redis backups:"
    ls -la "$BACKUP_DIR"/redis_*.rdb.gz 2>/dev/null || echo "No Redis backups found"
}

# Restore PostgreSQL
restore_postgres() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        error_exit "PostgreSQL backup file not found: $backup_file"
    fi
    
    log "Starting PostgreSQL restore from: $backup_file"
    
    # Set password for pg_restore
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # Drop existing database (with confirmation)
    read -p "⚠️ This will DROP the existing database. Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log "PostgreSQL restore cancelled by user"
        return 1
    fi
    
    # Drop and recreate database
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres \
        -c "DROP DATABASE IF EXISTS $POSTGRES_DB;" || error_exit "Failed to drop database"
    
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres \
        -c "CREATE DATABASE $POSTGRES_DB;" || error_exit "Failed to create database"
    
    # Restore from backup
    pg_restore -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        --verbose --no-password --clean --if-exists "$backup_file" || error_exit "PostgreSQL restore failed"
    
    log "✅ PostgreSQL restore completed successfully"
}

# Restore MongoDB
restore_mongodb() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        error_exit "MongoDB backup file not found: $backup_file"
    fi
    
    log "Starting MongoDB restore from: $backup_file"
    
    # Extract backup
    local extract_dir="/tmp/mongodb_restore_$$"
    mkdir -p "$extract_dir"
    tar -xzf "$backup_file" -C "$extract_dir" || error_exit "Failed to extract MongoDB backup"
    
    # Drop existing database (with confirmation)
    read -p "⚠️ This will DROP the existing MongoDB database. Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log "MongoDB restore cancelled by user"
        rm -rf "$extract_dir"
        return 1
    fi
    
    # Find the backup directory
    local backup_data_dir=$(find "$extract_dir" -name "$MONGODB_DB" -type d | head -1)
    
    if [ -z "$backup_data_dir" ]; then
        error_exit "Could not find database directory in backup"
    fi
    
    # Restore database
    mongorestore --host "$MONGODB_HOST:$MONGODB_PORT" \
        --db "$MONGODB_DB" \
        --username "$MONGODB_USER" \
        --password "$MONGODB_PASSWORD" \
        --drop \
        "$backup_data_dir" || error_exit "MongoDB restore failed"
    
    # Cleanup
    rm -rf "$extract_dir"
    
    log "✅ MongoDB restore completed successfully"
}

# Restore Redis
restore_redis() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        error_exit "Redis backup file not found: $backup_file"
    fi
    
    log "Starting Redis restore from: $backup_file"
    
    # Stop Redis service
    systemctl stop redis || service redis-server stop || log "Redis service stop failed, continuing..."
    
    # Backup current Redis data
    if [ -f "/var/lib/redis/dump.rdb" ]; then
        cp "/var/lib/redis/dump.rdb" "/var/lib/redis/dump.rdb.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Extract and restore backup
    gunzip -c "$backup_file" > "/var/lib/redis/dump.rdb" || error_exit "Redis restore failed"
    
    # Set proper permissions
    chown redis:redis "/var/lib/redis/dump.rdb" || chown redis:redis "/var/lib/redis/dump.rdb"
    chmod 640 "/var/lib/redis/dump.rdb"
    
    # Start Redis service
    systemctl start redis || service redis-server start || error_exit "Failed to start Redis service"
    
    log "✅ Redis restore completed successfully"
}

# Restore all databases from latest backups
restore_all() {
    log "Starting full database restore from latest backups..."
    
    local postgres_backup=$(cat "$BACKUP_DIR/latest_postgres_backup" 2>/dev/null || echo "")
    local mongodb_backup=$(cat "$BACKUP_DIR/latest_mongodb_backup" 2>/dev/null || echo "")
    local redis_backup=$(cat "$BACKUP_DIR/latest_redis_backup" 2>/dev/null || echo "")
    
    if [ -z "$postgres_backup" ] && [ -z "$mongodb_backup" ] && [ -z "$redis_backup" ]; then
        error_exit "No latest backup files found"
    fi
    
    read -p "⚠️ This will restore ALL databases from latest backups. Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log "Full restore cancelled by user"
        return 1
    fi
    
    # Restore each database if backup exists
    if [ -n "$postgres_backup" ] && [ -f "$postgres_backup" ]; then
        restore_postgres "$postgres_backup"
    fi
    
    if [ -n "$mongodb_backup" ] && [ -f "$mongodb_backup" ]; then
        restore_mongodb "$mongodb_backup"
    fi
    
    if [ -n "$redis_backup" ] && [ -f "$redis_backup" ]; then
        restore_redis "$redis_backup"
    fi
    
    log "✅ Full database restore completed successfully"
}

# Main function
main() {
    log "Starting FinAI Nexus database restore process..."
    
    # Check required environment variables
    if [ -z "$POSTGRES_PASSWORD" ]; then
        error_exit "POSTGRES_PASSWORD environment variable is required"
    fi
    
    if [ -z "$MONGODB_PASSWORD" ]; then
        error_exit "MONGODB_PASSWORD environment variable is required"
    fi
    
    # Parse command line arguments
    case "${1:-}" in
        -p|--postgres)
            if [ -z "${2:-}" ]; then
                error_exit "PostgreSQL backup file required"
            fi
            restore_postgres "$2"
            ;;
        -m|--mongodb)
            if [ -z "${2:-}" ]; then
                error_exit "MongoDB backup file required"
            fi
            restore_mongodb "$2"
            ;;
        -r|--redis)
            if [ -z "${2:-}" ]; then
                error_exit "Redis backup file required"
            fi
            restore_redis "$2"
            ;;
        -a|--all)
            restore_all
            ;;
        -l|--list)
            list_backups
            ;;
        -h|--help)
            usage
            ;;
        *)
            usage
            ;;
    esac
    
    log "✅ Restore process completed successfully"
}

# Run main function
main "$@"

