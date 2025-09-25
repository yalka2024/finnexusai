-- Secrets Management Tables
-- Migration 003: Add secrets management tables

-- Secrets table for storing encrypted sensitive data
CREATE TABLE IF NOT EXISTS secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    encrypted_data TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT secrets_key_not_empty CHECK (length(trim(key)) > 0),
    CONSTRAINT secrets_encrypted_data_not_empty CHECK (length(trim(encrypted_data)) > 0)
);

-- Secret audit log for tracking access and changes
CREATE TABLE IF NOT EXISTS secret_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    secret_key VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete', 'rotate'
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT secret_audit_action_valid CHECK (action IN ('create', 'read', 'update', 'delete', 'rotate')),
    CONSTRAINT secret_audit_key_not_empty CHECK (length(trim(secret_key)) > 0)
);

-- API keys table for programmatic access (moved from auth migration)
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_prefix VARCHAR(20) NOT NULL, -- First 8 chars for identification
    permissions TEXT[] DEFAULT '{}', -- Array of permissions
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT api_keys_key_name_not_empty CHECK (length(trim(key_name)) > 0),
    CONSTRAINT api_keys_key_hash_not_empty CHECK (length(trim(key_hash)) > 0),
    CONSTRAINT api_keys_key_prefix_not_empty CHECK (length(trim(key_prefix)) > 0)
);

-- Environment variables table for configuration management
CREATE TABLE IF NOT EXISTS environment_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment VARCHAR(50) NOT NULL, -- 'development', 'staging', 'production'
    key VARCHAR(255) NOT NULL,
    encrypted_value TEXT,
    is_secret BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT env_vars_environment_valid CHECK (environment IN ('development', 'staging', 'production')),
    CONSTRAINT env_vars_key_not_empty CHECK (length(trim(key)) > 0),
    UNIQUE(environment, key)
);

-- Certificate store for SSL/TLS certificates
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'ssl', 'client', 'ca', 'signing'
    encrypted_certificate TEXT NOT NULL,
    encrypted_private_key TEXT,
    encrypted_ca_chain TEXT,
    subject VARCHAR(500),
    issuer VARCHAR(500),
    serial_number VARCHAR(100),
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT certificates_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT certificates_type_valid CHECK (type IN ('ssl', 'client', 'ca', 'signing')),
    CONSTRAINT certificates_cert_not_empty CHECK (length(trim(encrypted_certificate)) > 0)
);

-- Encryption keys table for key rotation
CREATE TABLE IF NOT EXISTS encryption_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id VARCHAR(100) UNIQUE NOT NULL,
    algorithm VARCHAR(50) NOT NULL,
    encrypted_key TEXT NOT NULL,
    key_version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    rotated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT encryption_keys_key_id_not_empty CHECK (length(trim(key_id)) > 0),
    CONSTRAINT encryption_keys_algorithm_valid CHECK (algorithm IN ('aes-256-gcm', 'aes-256-cbc', 'rsa-2048', 'rsa-4096')),
    CONSTRAINT encryption_keys_version_positive CHECK (key_version > 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_secrets_key ON secrets(key);
CREATE INDEX IF NOT EXISTS idx_secrets_expires_at ON secrets(expires_at);
CREATE INDEX IF NOT EXISTS idx_secrets_created_at ON secrets(created_at);

CREATE INDEX IF NOT EXISTS idx_secret_audit_secret_key ON secret_audit_log(secret_key);
CREATE INDEX IF NOT EXISTS idx_secret_audit_action ON secret_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_secret_audit_timestamp ON secret_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_secret_audit_user_id ON secret_audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);

CREATE INDEX IF NOT EXISTS idx_env_vars_environment ON environment_variables(environment);
CREATE INDEX IF NOT EXISTS idx_env_vars_key ON environment_variables(key);
CREATE INDEX IF NOT EXISTS idx_env_vars_environment_key ON environment_variables(environment, key);

CREATE INDEX IF NOT EXISTS idx_certificates_name ON certificates(name);
CREATE INDEX IF NOT EXISTS idx_certificates_type ON certificates(type);
CREATE INDEX IF NOT EXISTS idx_certificates_valid_to ON certificates(valid_to);
CREATE INDEX IF NOT EXISTS idx_certificates_is_active ON certificates(is_active);

CREATE INDEX IF NOT EXISTS idx_encryption_keys_key_id ON encryption_keys(key_id);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_algorithm ON encryption_keys(algorithm);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_is_active ON encryption_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_expires_at ON encryption_keys(expires_at);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_secrets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_secrets_updated_at
    BEFORE UPDATE ON secrets
    FOR EACH ROW
    EXECUTE FUNCTION update_secrets_updated_at();

CREATE OR REPLACE FUNCTION update_environment_variables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_environment_variables_updated_at
    BEFORE UPDATE ON environment_variables
    FOR EACH ROW
    EXECUTE FUNCTION update_environment_variables_updated_at();

CREATE OR REPLACE FUNCTION update_certificates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_certificates_updated_at
    BEFORE UPDATE ON certificates
    FOR EACH ROW
    EXECUTE FUNCTION update_certificates_updated_at();

-- Function to cleanup expired secrets
CREATE OR REPLACE FUNCTION cleanup_expired_secrets()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM secrets 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired API keys
CREATE OR REPLACE FUNCTION cleanup_expired_api_keys()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM api_keys 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired certificates
CREATE OR REPLACE FUNCTION cleanup_expired_certificates()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE certificates 
    SET is_active = false 
    WHERE valid_to IS NOT NULL AND valid_to < NOW() AND is_active = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get secret access statistics
CREATE OR REPLACE FUNCTION get_secret_access_stats(
    p_secret_key VARCHAR DEFAULT NULL,
    p_start_date TIMESTAMP DEFAULT NULL,
    p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
    secret_key VARCHAR,
    total_accesses BIGINT,
    unique_users BIGINT,
    last_access TIMESTAMP WITH TIME ZONE,
    most_common_action VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sal.secret_key,
        COUNT(*) as total_accesses,
        COUNT(DISTINCT sal.user_id) as unique_users,
        MAX(sal.timestamp) as last_access,
        MODE() WITHIN GROUP (ORDER BY sal.action) as most_common_action
    FROM secret_audit_log sal
    WHERE 
        (p_secret_key IS NULL OR sal.secret_key = p_secret_key)
        AND (p_start_date IS NULL OR sal.timestamp >= p_start_date)
        AND (p_end_date IS NULL OR sal.timestamp <= p_end_date)
    GROUP BY sal.secret_key
    ORDER BY total_accesses DESC;
END;
$$ LANGUAGE plpgsql;

-- Insert default encryption key if not exists
INSERT INTO encryption_keys (key_id, algorithm, encrypted_key, key_version, metadata)
SELECT 
    'default-aes-key',
    'aes-256-gcm',
    encode(gen_random_bytes(32), 'hex'), -- This should be properly encrypted in production
    1,
    '{"description": "Default AES encryption key", "created_by": "system"}'
WHERE NOT EXISTS (
    SELECT 1 FROM encryption_keys WHERE key_id = 'default-aes-key'
);

-- Create a view for active secrets (excluding expired ones)
CREATE OR REPLACE VIEW active_secrets AS
SELECT 
    s.id,
    s.key,
    s.metadata,
    s.created_at,
    s.updated_at,
    s.access_count,
    s.last_accessed,
    CASE 
        WHEN s.expires_at IS NULL THEN 'never'
        ELSE s.expires_at::text
    END as expires_at
FROM secrets s
WHERE s.expires_at IS NULL OR s.expires_at > NOW()
ORDER BY s.created_at DESC;

-- Create a view for secret access summary
CREATE OR REPLACE VIEW secret_access_summary AS
SELECT 
    s.key,
    s.access_count,
    s.last_accessed,
    s.created_at,
    COUNT(sal.id) as audit_entries,
    MAX(sal.timestamp) as last_audit_entry
FROM secrets s
LEFT JOIN secret_audit_log sal ON s.key = sal.secret_key
GROUP BY s.key, s.access_count, s.last_accessed, s.created_at
ORDER BY s.access_count DESC;
