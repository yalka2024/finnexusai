-- Create SSL certificates table for certificate management
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'ssl', -- ssl, client, ca
    domain VARCHAR(255) NOT NULL,
    certificate_data TEXT NOT NULL,
    private_key_data TEXT NOT NULL,
    certificate_chain TEXT, -- For intermediate certificates
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID, -- REFERENCES users(id) if user management is integrated
    UNIQUE(domain, type)
);

-- Create certificate_access_logs table for auditing certificate usage
CREATE TABLE IF NOT EXISTS certificate_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
    accessed_by UUID, -- REFERENCES users(id)
    access_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    action VARCHAR(50) NOT NULL -- e.g., 'read', 'renew', 'revoke', 'install'
);

-- Create certificate_events table for tracking certificate lifecycle events
CREATE TABLE IF NOT EXISTS certificate_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- e.g., 'created', 'renewed', 'expired', 'revoked', 'installed'
    event_data JSONB DEFAULT '{}',
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    triggered_by VARCHAR(100), -- system, user, automated
    details TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_certificates_domain ON certificates(domain);
CREATE INDEX IF NOT EXISTS idx_certificates_type ON certificates(type);
CREATE INDEX IF NOT EXISTS idx_certificates_valid_to ON certificates(valid_to);
CREATE INDEX IF NOT EXISTS idx_certificates_is_active ON certificates(is_active);
CREATE INDEX IF NOT EXISTS idx_certificate_access_logs_certificate_id ON certificate_access_logs(certificate_id);
CREATE INDEX IF NOT EXISTS idx_certificate_events_certificate_id ON certificate_events(certificate_id);
CREATE INDEX IF NOT EXISTS idx_certificate_events_event_type ON certificate_events(event_type);
CREATE INDEX IF NOT EXISTS idx_certificate_events_occurred_at ON certificate_events(occurred_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_certificates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_certificates_updated_at
    BEFORE UPDATE ON certificates
    FOR EACH ROW
    EXECUTE FUNCTION update_certificates_updated_at();

-- Insert initial system certificate if none exists
INSERT INTO certificates (
    name, 
    type, 
    domain, 
    certificate_data, 
    private_key_data,
    valid_from, 
    valid_to, 
    is_active,
    auto_renew
) 
SELECT 
    'System Default Certificate',
    'ssl',
    'localhost',
    '-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END CERTIFICATE-----',
    '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '1 year',
    TRUE,
    FALSE
WHERE NOT EXISTS (
    SELECT 1 FROM certificates WHERE domain = 'localhost' AND type = 'ssl'
);

-- Create view for certificate monitoring
CREATE OR REPLACE VIEW certificate_monitoring AS
SELECT 
    c.id,
    c.name,
    c.domain,
    c.type,
    c.valid_from,
    c.valid_to,
    c.is_active,
    c.auto_renew,
    CASE 
        WHEN c.valid_to <= CURRENT_TIMESTAMP THEN 'expired'
        WHEN c.valid_to <= CURRENT_TIMESTAMP + INTERVAL '7 days' THEN 'expiring_soon'
        WHEN c.valid_to <= CURRENT_TIMESTAMP + INTERVAL '30 days' THEN 'expiring_soon'
        ELSE 'valid'
    END as status,
    EXTRACT(DAYS FROM (c.valid_to - CURRENT_TIMESTAMP)) as days_until_expiry,
    c.created_at,
    c.updated_at
FROM certificates c
WHERE c.is_active = TRUE
ORDER BY c.valid_to ASC;

-- Grant permissions (adjust based on your security requirements)
-- GRANT SELECT ON certificate_monitoring TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON certificates TO app_user;
-- GRANT SELECT, INSERT ON certificate_access_logs TO app_user;
-- GRANT SELECT, INSERT ON certificate_events TO app_user;
