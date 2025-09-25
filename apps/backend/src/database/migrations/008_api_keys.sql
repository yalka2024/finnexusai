-- Create API keys management tables
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- REFERENCES users(id)
    key_id VARCHAR(255) UNIQUE NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    secret_hash VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '["read"]',
    rate_limit INTEGER DEFAULT 1000,
    ip_whitelist JSONB, -- Array of allowed IP addresses
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID, -- REFERENCES users(id)
    cleanup_reason VARCHAR(100),
    metadata JSONB DEFAULT '{}'
);

-- Create API key activity logs table
CREATE TABLE IF NOT EXISTS api_key_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- created, used, revoked, regenerated, updated, invalid_secret, ip_blocked
    user_id UUID, -- REFERENCES users(id)
    ip_address INET,
    user_agent TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create API rate limiting table
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key VARCHAR(255) NOT NULL REFERENCES api_keys(api_key) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(api_key, endpoint, window_start)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_id ON api_keys(key_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used_at ON api_keys(last_used_at);

CREATE INDEX IF NOT EXISTS idx_api_key_logs_key_id ON api_key_logs(key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_logs_action ON api_key_logs(action);
CREATE INDEX IF NOT EXISTS idx_api_key_logs_created_at ON api_key_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_key_logs_ip_address ON api_key_logs(ip_address);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_api_key ON api_rate_limits(api_key);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_endpoint ON api_rate_limits(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window_start ON api_rate_limits(window_start);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_api_keys_updated_at();

-- Create view for API key monitoring
CREATE OR REPLACE VIEW api_key_monitoring AS
SELECT 
    ak.id,
    ak.key_id,
    ak.user_id,
    ak.api_key,
    ak.permissions,
    ak.rate_limit,
    ak.is_active,
    ak.usage_count,
    ak.last_used_at,
    ak.created_at,
    ak.expires_at,
    CASE 
        WHEN ak.expires_at IS NULL THEN 'never'
        WHEN ak.expires_at <= NOW() THEN 'expired'
        WHEN ak.expires_at <= NOW() + INTERVAL '7 days' THEN 'expiring_soon'
        ELSE 'valid'
    END as expiry_status,
    CASE 
        WHEN ak.last_used_at IS NULL THEN 'never'
        WHEN ak.last_used_at > NOW() - INTERVAL '24 hours' THEN 'recent'
        WHEN ak.last_used_at > NOW() - INTERVAL '7 days' THEN 'weekly'
        WHEN ak.last_used_at > NOW() - INTERVAL '30 days' THEN 'monthly'
        ELSE 'old'
    END as usage_status
FROM api_keys ak;

-- Create function to clean up old rate limit records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM api_rate_limits 
    WHERE window_start < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get API key usage statistics
CREATE OR REPLACE FUNCTION get_api_key_stats()
RETURNS TABLE (
    total_keys BIGINT,
    active_keys BIGINT,
    expired_keys BIGINT,
    recently_used BIGINT,
    total_requests BIGINT,
    unique_endpoints BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM api_keys) as total_keys,
        (SELECT COUNT(*) FROM api_keys WHERE is_active = true) as active_keys,
        (SELECT COUNT(*) FROM api_keys WHERE expires_at < NOW()) as expired_keys,
        (SELECT COUNT(*) FROM api_keys WHERE last_used_at > NOW() - INTERVAL '24 hours') as recently_used,
        (SELECT COALESCE(SUM(usage_count), 0) FROM api_keys) as total_requests,
        (SELECT COUNT(DISTINCT endpoint) FROM api_key_logs WHERE created_at > NOW() - INTERVAL '24 hours') as unique_endpoints;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate API key permissions
CREATE OR REPLACE FUNCTION validate_api_permission(
    p_api_key VARCHAR(255),
    p_required_permission VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
    key_permissions JSONB;
BEGIN
    SELECT permissions INTO key_permissions
    FROM api_keys
    WHERE api_key = p_api_key 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > NOW());
    
    IF key_permissions IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN key_permissions ? p_required_permission;
END;
$$ LANGUAGE plpgsql;

-- Create function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_api_key VARCHAR(255),
    p_endpoint VARCHAR(255),
    p_rate_limit INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
BEGIN
    -- Get current request count for this window (last hour)
    SELECT COALESCE(SUM(request_count), 0) INTO current_count
    FROM api_rate_limits
    WHERE api_key = p_api_key 
    AND endpoint = p_endpoint
    AND window_start > NOW() - INTERVAL '1 hour';
    
    -- Check if limit exceeded
    RETURN current_count < p_rate_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment rate limit counter
CREATE OR REPLACE FUNCTION increment_rate_limit(
    p_api_key VARCHAR(255),
    p_endpoint VARCHAR(255)
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO api_rate_limits (api_key, endpoint, request_count)
    VALUES (p_api_key, p_endpoint, 1)
    ON CONFLICT (api_key, endpoint, window_start)
    DO UPDATE SET request_count = api_rate_limits.request_count + 1;
END;
$$ LANGUAGE plpgsql;

-- Create function to get API key activity summary
CREATE OR REPLACE FUNCTION get_api_key_activity_summary(
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    date DATE,
    total_requests BIGINT,
    unique_keys BIGINT,
    unique_endpoints BIGINT,
    error_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(akl.created_at) as date,
        COUNT(*) as total_requests,
        COUNT(DISTINCT akl.key_id) as unique_keys,
        COUNT(DISTINCT akl.details->>'endpoint') as unique_endpoints,
        COUNT(CASE WHEN akl.action LIKE '%error%' OR akl.action LIKE '%invalid%' THEN 1 END) as error_count
    FROM api_key_logs akl
    WHERE akl.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY DATE(akl.created_at)
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant appropriate permissions
-- GRANT SELECT, INSERT, UPDATE ON api_keys TO app_user;
-- GRANT SELECT, INSERT ON api_key_logs TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON api_rate_limits TO app_user;
-- GRANT SELECT ON api_key_monitoring TO app_user;
-- GRANT EXECUTE ON FUNCTION cleanup_old_rate_limits() TO app_user;
-- GRANT EXECUTE ON FUNCTION get_api_key_stats() TO app_user;
-- GRANT EXECUTE ON FUNCTION validate_api_permission(VARCHAR, VARCHAR) TO app_user;
-- GRANT EXECUTE ON FUNCTION check_rate_limit(VARCHAR, VARCHAR, INTEGER) TO app_user;
-- GRANT EXECUTE ON FUNCTION increment_rate_limit(VARCHAR, VARCHAR) TO app_user;
-- GRANT EXECUTE ON FUNCTION get_api_key_activity_summary(INTEGER) TO app_user;

-- Insert default API key for system use (will be generated by application)
INSERT INTO api_keys (
    user_id,
    key_id,
    api_key,
    secret_hash,
    permissions,
    rate_limit,
    is_active,
    metadata
) VALUES (
    NULL, -- System key
    'system_key',
    'PLACEHOLDER_SYSTEM_KEY',
    'PLACEHOLDER_HASH',
    '["admin", "read", "write"]',
    10000,
    true,
    '{"description": "System API key for internal operations", "auto_generated": true}'
) ON CONFLICT (key_id) DO NOTHING;
