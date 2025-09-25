-- Enhanced Authentication Tables
-- Migration 005: Add enhanced authentication features (password reset, 2FA, email verification)

-- Password reset requests table
CREATE TABLE IF NOT EXISTS password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT password_reset_token_hash_not_empty CHECK (length(trim(token_hash)) > 0),
    CONSTRAINT password_reset_expires_future CHECK (expires_at > created_at)
);

-- Email verifications table
CREATE TABLE IF NOT EXISTS email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'registration', -- 'registration', 'email_change'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT email_verification_token_hash_not_empty CHECK (length(trim(token_hash)) > 0),
    CONSTRAINT email_verification_type_valid CHECK (type IN ('registration', 'email_change')),
    CONSTRAINT email_verification_expires_future CHECK (expires_at > created_at)
);

-- Two-factor authentication table
CREATE TABLE IF NOT EXISTS user_two_factor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    totp_secret TEXT, -- Encrypted TOTP secret
    backup_codes TEXT[], -- Array of backup codes (encrypted)
    enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    enabled_at TIMESTAMP WITH TIME ZONE,
    disabled_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT user_two_factor_user_id_not_empty CHECK (user_id IS NOT NULL)
);

-- Two-factor authentication audit log
CREATE TABLE IF NOT EXISTS two_factor_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- '2fa_enabled', '2fa_disabled', 'backup_code_used', 'backup_codes_regenerated'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT two_factor_audit_event_type_valid CHECK (
        event_type IN ('2fa_enabled', '2fa_disabled', 'backup_code_used', 'backup_codes_regenerated', 'totp_verified')
    )
);

-- Add two-factor enabled column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;

-- Update users table to include email verification status if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id ON password_reset_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_token_hash ON password_reset_requests(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_expires_at ON password_reset_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_used_at ON password_reset_requests(used_at);

CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_token_hash ON email_verifications(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_type ON email_verifications(type);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verifications_verified_at ON email_verifications(verified_at);

CREATE INDEX IF NOT EXISTS idx_user_two_factor_user_id ON user_two_factor(user_id);
CREATE INDEX IF NOT EXISTS idx_user_two_factor_enabled ON user_two_factor(enabled);

CREATE INDEX IF NOT EXISTS idx_two_factor_audit_log_user_id ON two_factor_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_two_factor_audit_log_event_type ON two_factor_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_two_factor_audit_log_created_at ON two_factor_audit_log(created_at);

-- Update trigger for user_two_factor updated_at column
CREATE OR REPLACE FUNCTION update_user_two_factor_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_two_factor_updated_at
    BEFORE UPDATE ON user_two_factor
    FOR EACH ROW
    EXECUTE FUNCTION update_user_two_factor_updated_at();

-- Function to cleanup expired password reset requests
CREATE OR REPLACE FUNCTION cleanup_expired_password_resets()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM password_reset_requests 
    WHERE expires_at < NOW() OR used_at IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired email verifications
CREATE OR REPLACE FUNCTION cleanup_expired_email_verifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM email_verifications 
    WHERE expires_at < NOW() OR verified_at IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user authentication summary
CREATE OR REPLACE FUNCTION get_user_auth_summary(p_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    email_verified BOOLEAN,
    two_factor_enabled BOOLEAN,
    two_factor_setup_date TIMESTAMP WITH TIME ZONE,
    last_password_reset TIMESTAMP WITH TIME ZONE,
    pending_verifications INTEGER,
    active_sessions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.is_email_verified,
        u.two_factor_enabled,
        utf.enabled_at,
        (SELECT MAX(created_at) FROM password_reset_requests WHERE user_id = p_user_id AND used_at IS NOT NULL),
        (SELECT COUNT(*) FROM email_verifications WHERE user_id = p_user_id AND verified_at IS NULL AND expires_at > NOW()),
        (SELECT COUNT(*) FROM refresh_tokens WHERE user_id = p_user_id AND revoked_at IS NULL AND expires_at > NOW())
    FROM users u
    LEFT JOIN user_two_factor utf ON u.id = utf.user_id
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get authentication statistics
CREATE OR REPLACE FUNCTION get_auth_statistics()
RETURNS TABLE (
    total_users BIGINT,
    email_verified_users BIGINT,
    two_factor_enabled_users BIGINT,
    pending_verifications BIGINT,
    recent_password_resets BIGINT,
    recent_2fa_events BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM users WHERE status = 'active') as total_users,
        (SELECT COUNT(*) FROM users WHERE is_email_verified = true AND status = 'active') as email_verified_users,
        (SELECT COUNT(*) FROM users WHERE two_factor_enabled = true AND status = 'active') as two_factor_enabled_users,
        (SELECT COUNT(*) FROM email_verifications WHERE verified_at IS NULL AND expires_at > NOW()) as pending_verifications,
        (SELECT COUNT(*) FROM password_reset_requests WHERE created_at > NOW() - INTERVAL '24 hours') as recent_password_resets,
        (SELECT COUNT(*) FROM two_factor_audit_log WHERE created_at > NOW() - INTERVAL '24 hours') as recent_2fa_events;
END;
$$ LANGUAGE plpgsql;

-- Create views for easy access to authentication data
CREATE OR REPLACE VIEW user_auth_status AS
SELECT 
    u.id,
    u.email,
    u.is_email_verified,
    u.two_factor_enabled,
    u.status,
    u.created_at,
    utf.enabled_at as two_factor_enabled_at,
    (SELECT COUNT(*) FROM refresh_tokens WHERE user_id = u.id AND revoked_at IS NULL AND expires_at > NOW()) as active_sessions,
    (SELECT COUNT(*) FROM email_verifications WHERE user_id = u.id AND verified_at IS NULL AND expires_at > NOW()) as pending_verifications
FROM users u
LEFT JOIN user_two_factor utf ON u.id = utf.user_id
WHERE u.status = 'active';

CREATE OR REPLACE VIEW pending_verifications AS
SELECT 
    ev.id,
    ev.user_id,
    u.email,
    ev.email as verification_email,
    ev.type,
    ev.created_at,
    ev.expires_at,
    EXTRACT(EPOCH FROM (ev.expires_at - NOW()))/3600 as hours_until_expiry
FROM email_verifications ev
JOIN users u ON ev.user_id = u.id
WHERE ev.verified_at IS NULL AND ev.expires_at > NOW()
ORDER BY ev.created_at ASC;

CREATE OR REPLACE VIEW recent_2fa_events AS
SELECT 
    tfal.user_id,
    u.email,
    tfal.event_type,
    tfal.metadata,
    tfal.created_at
FROM two_factor_audit_log tfal
JOIN users u ON tfal.user_id = u.id
WHERE tfal.created_at > NOW() - INTERVAL '7 days'
ORDER BY tfal.created_at DESC;

-- Insert default data for testing (only in development)
DO $$
BEGIN
    IF current_setting('app.environment', true) = 'development' THEN
        -- Insert a test user with 2FA enabled for development
        INSERT INTO users (id, email, password_hash, first_name, last_name, country, is_email_verified, two_factor_enabled)
        VALUES (
            '550e8400-e29b-41d4-a716-446655440000',
            'test@finnexusai.com',
            '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
            'Test',
            'User',
            'US',
            true,
            true
        )
        ON CONFLICT (email) DO NOTHING;
        
        -- Insert 2FA data for test user
        INSERT INTO user_two_factor (user_id, totp_secret, backup_codes, enabled, enabled_at)
        VALUES (
            '550e8400-e29b-41d4-a716-446655440000',
            '{"encrypted":"test-secret","iv":"test-iv","tag":"test-tag","algorithm":"aes-256-gcm"}',
            ARRAY['ABC12345', 'DEF67890', 'GHI13579'],
            true,
            NOW()
        )
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END $$;
