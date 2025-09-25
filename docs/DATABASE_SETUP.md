# FinNexusAI Database Setup Guide

## Overview

This guide covers the complete database setup and management for FinNexusAI, including PostgreSQL configuration, migrations, and production deployment.

## Database Architecture

### Core Tables
- **Users & Authentication**: User management, sessions, API keys
- **Trading**: Portfolios, holdings, trades, assets
- **Payments**: Transactions, withdrawals, deposits
- **Security**: Encryption keys, SSL certificates, audit logs
- **Compliance**: GDPR, Sharia compliance, audit trails
- **Advanced Features**: HFT, arbitrage, derivatives, sandbox

### Migration System
- **22 Migration Files**: Complete database schema
- **Version Control**: Tracked migration history
- **Rollback Support**: Safe migration reversal
- **Transaction Safety**: All migrations run in transactions

## Quick Start

### 1. Test Migration System
```bash
npm run db:test
```

### 2. Setup Development Database
```bash
npm run db:setup
```

### 3. Run Migrations
```bash
npm run db:migrate
```

### 4. Check Status
```bash
npm run db:status
```

## Environment Configurations

### Development
```bash
# Uses test.env configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/finnexusai_dev
```

### Staging
```bash
# Uses staging.env configuration
DATABASE_URL=postgresql://finnexusai_staging:${DB_PASSWORD}@staging-db.finnexusai.com:5432/finnexusai_staging
```

### Production
```bash
# Uses production.env configuration
DATABASE_URL=postgresql://finnexusai_prod:${DB_PASSWORD}@prod-db-cluster.finnexusai.com:5432/finnexusai_production
```

## Database Management Commands

### Available Scripts
```bash
npm run db:setup      # Setup development database
npm run db:migrate    # Run pending migrations
npm run db:status     # Show database status
npm run db:backup     # Create database backup
npm run db:reset      # Reset database (DANGEROUS)
npm run db:test       # Test migration system
```

### Manual Commands
```bash
# Run migrations
node scripts/database/migration-runner.js up

# Rollback migration
node scripts/database/migration-runner.js down migration_name

# Database status
node scripts/database/db-manager.js status

# Create backup
node scripts/database/db-manager.js backup
```

## Migration Files

### Core Schema Migrations
1. **001_create_users_table.sql** - User management
2. **001_initial_schema.sql** - Core platform tables
3. **002_auth_tables.sql** - Authentication system
4. **002_create_portfolios_table.sql** - Portfolio management
5. **003_create_assets_table.sql** - Asset definitions
6. **003_payments_table.sql** - Payment processing
7. **004_create_holdings_table.sql** - User holdings
8. **005_create_trades_table.sql** - Trade records

### Security & Compliance
9. **003_secrets_tables.sql** - Secret management
10. **004_gdpr_compliance_tables.sql** - GDPR compliance
11. **005_enhanced_auth_tables.sql** - Enhanced authentication
12. **006_ssl_certificates.sql** - SSL certificate management
13. **007_database_encryption.sql** - Database encryption
14. **008_api_keys.sql** - API key management

### Advanced Features
15. **005_hft_trading.sql** - High-frequency trading
16. **006_sharia_compliance.sql** - Sharia compliance
17. **007_cross_exchange_arbitrage.sql** - Arbitrage system
18. **008_options_derivatives.sql** - Options & derivatives
19. **009_futurist_sandbox.sql** - Futurist sandbox

### Enterprise Features
20. **004_enterprise_services.sql** - Enterprise services
21. **002_seed_data.sql** - Initial seed data
22. **init.sql** - Database initialization

## Docker Setup

### Development with Docker
```bash
# Start PostgreSQL and Redis
docker-compose -f docker-compose.dev.yml up -d

# Check status
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Docker Compose Configuration
```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: finnexusai_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## Production Deployment

### Kubernetes Configuration
```yaml
# Database connection
apiVersion: v1
kind: Secret
metadata:
  name: finnexusai-production-secrets
data:
  DATABASE_URL: <base64-encoded-connection-string>
```

### High Availability Setup
- **Primary Database**: Master for writes
- **Read Replicas**: Multiple replicas for reads
- **Connection Pooling**: PgBouncer for connection management
- **Backup Strategy**: Automated daily backups

### Security Configuration
- **SSL/TLS**: Encrypted connections
- **Network Policies**: Restricted access
- **Encryption at Rest**: Database-level encryption
- **Audit Logging**: Complete audit trail

## Monitoring & Maintenance

### Health Checks
```sql
-- Database health
SELECT 
  current_database() as database_name,
  version() as postgres_version,
  pg_database_size(current_database()) as database_size;

-- Migration status
SELECT name, run_on FROM migrations ORDER BY run_on DESC;
```

### Performance Monitoring
- **Query Performance**: Slow query logging
- **Connection Pooling**: Monitor active connections
- **Disk Usage**: Database size monitoring
- **Backup Status**: Backup completion tracking

### Backup Strategy
```bash
# Daily automated backups
0 2 * * * /usr/local/bin/backup-db.sh

# Backup retention
- Daily backups: 30 days
- Weekly backups: 12 weeks
- Monthly backups: 12 months
```

## Troubleshooting

### Common Issues

#### Connection Refused
```bash
# Check PostgreSQL status
systemctl status postgresql

# Check port availability
netstat -tlnp | grep 5432
```

#### Migration Failures
```bash
# Check migration status
npm run db:status

# View migration logs
tail -f /var/log/postgresql/postgresql.log
```

#### Performance Issues
```sql
-- Check active connections
SELECT * FROM pg_stat_activity;

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### Recovery Procedures

#### Database Recovery
```bash
# Restore from backup
npm run db:restore backup_file.sql

# Reset and re-migrate
npm run db:reset
npm run db:migrate
```

#### Migration Rollback
```bash
# Rollback specific migration
node scripts/database/db-manager.js down migration_name

# Check rollback status
npm run db:status
```

## Security Best Practices

### Database Security
- **Strong Passwords**: Use complex passwords
- **SSL Connections**: Always use encrypted connections
- **Network Security**: Restrict database access
- **Regular Updates**: Keep PostgreSQL updated

### Migration Security
- **Transaction Safety**: All migrations in transactions
- **Backup Before Migration**: Always backup before major changes
- **Test Migrations**: Test in staging before production
- **Rollback Plan**: Always have rollback procedures

## Performance Optimization

### Database Tuning
```sql
-- Connection settings
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB

-- Query optimization
random_page_cost = 1.1
effective_io_concurrency = 200
```

### Index Optimization
- **Primary Keys**: All tables have primary keys
- **Foreign Keys**: Proper foreign key constraints
- **Indexes**: Strategic indexes for performance
- **Partitioning**: Large tables partitioned by date

## Support

### Documentation
- **API Documentation**: `/docs/api/`
- **Schema Documentation**: `/docs/schema/`
- **Migration Guide**: `/docs/migrations/`

### Contact
- **Database Issues**: devops@finnexusai.com
- **Migration Support**: backend@finnexusai.com
- **Emergency**: +1-800-FINNEXUS

---

*Last Updated: $(date)*
*Version: 1.0.0*

