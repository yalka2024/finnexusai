-- Add encryption columns to existing tables for sensitive data
-- This migration adds encrypted versions of sensitive fields

-- Users table encryption
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_encrypted TEXT,
ADD COLUMN IF NOT EXISTS email_hash TEXT,
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
ADD COLUMN IF NOT EXISTS phone_hash TEXT,
ADD COLUMN IF NOT EXISTS ssn_encrypted TEXT,
ADD COLUMN IF NOT EXISTS address_encrypted TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth_encrypted TEXT;

-- Add indexes for encrypted email and phone for searching
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash) WHERE email_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone_hash ON users(phone_hash) WHERE phone_hash IS NOT NULL;

-- Create encrypted_users view for application use
CREATE OR REPLACE VIEW encrypted_users AS
SELECT 
    id,
    email_encrypted as email,
    email_hash,
    phone_encrypted as phone,
    phone_hash,
    first_name,
    last_name,
    ssn_encrypted as ssn,
    address_encrypted as address,
    date_of_birth_encrypted as date_of_birth,
    role,
    status,
    is_email_verified,
    is_2fa_enabled,
    created_at,
    updated_at
FROM users;

-- Financial data encryption table
CREATE TABLE IF NOT EXISTS encrypted_financial_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- REFERENCES users(id)
    bank_account_encrypted TEXT,
    routing_number_encrypted TEXT,
    credit_card_encrypted TEXT,
    tax_id_encrypted TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Trading data encryption table
CREATE TABLE IF NOT EXISTS encrypted_trading_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- REFERENCES users(id)
    private_key_encrypted TEXT,
    seed_phrase_encrypted TEXT,
    api_key_encrypted TEXT,
    secret_key_encrypted TEXT,
    exchange_credentials_encrypted TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Compliance data encryption table
CREATE TABLE IF NOT EXISTS encrypted_compliance_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- REFERENCES users(id)
    kyc_document_encrypted TEXT,
    aml_report_encrypted TEXT,
    risk_assessment_encrypted TEXT,
    verification_documents_encrypted TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- System secrets encryption table
CREATE TABLE IF NOT EXISTS encrypted_system_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    secret_type VARCHAR(100) NOT NULL, -- jwt_secret, session_secret, api_keys, etc.
    encrypted_value TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(secret_type)
);

-- Audit data encryption table
CREATE TABLE IF NOT EXISTS encrypted_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- REFERENCES users(id)
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    encrypted_before_data TEXT,
    encrypted_after_data TEXT,
    ip_address INET,
    user_agent TEXT,
    risk_score DECIMAL(3,2) DEFAULT 0.00,
    security_flags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_encrypted_financial_data_user_id ON encrypted_financial_data(user_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_trading_data_user_id ON encrypted_trading_data(user_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_compliance_data_user_id ON encrypted_compliance_data(user_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_system_secrets_type ON encrypted_system_secrets(secret_type);
CREATE INDEX IF NOT EXISTS idx_encrypted_audit_logs_user_id ON encrypted_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_audit_logs_action ON encrypted_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_encrypted_audit_logs_created_at ON encrypted_audit_logs(created_at);

-- Create triggers to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_encrypted_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_encrypted_financial_data_updated_at
    BEFORE UPDATE ON encrypted_financial_data
    FOR EACH ROW
    EXECUTE FUNCTION update_encrypted_tables_updated_at();

CREATE TRIGGER update_encrypted_trading_data_updated_at
    BEFORE UPDATE ON encrypted_trading_data
    FOR EACH ROW
    EXECUTE FUNCTION update_encrypted_tables_updated_at();

CREATE TRIGGER update_encrypted_compliance_data_updated_at
    BEFORE UPDATE ON encrypted_compliance_data
    FOR EACH ROW
    EXECUTE FUNCTION update_encrypted_tables_updated_at();

CREATE TRIGGER update_encrypted_system_secrets_updated_at
    BEFORE UPDATE ON encrypted_system_secrets
    FOR EACH ROW
    EXECUTE FUNCTION update_encrypted_tables_updated_at();

-- Create functions for encryption operations
CREATE OR REPLACE FUNCTION encrypt_user_email(email TEXT)
RETURNS TEXT AS $$
BEGIN
    -- This function would be called from the application layer
    -- The actual encryption happens in the DatabaseEncryption service
    RETURN NULL; -- Placeholder - encryption handled by application
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrypt_user_email(encrypted_email TEXT)
RETURNS TEXT AS $$
BEGIN
    -- This function would be called from the application layer
    -- The actual decryption happens in the DatabaseEncryption service
    RETURN NULL; -- Placeholder - decryption handled by application
END;
$$ LANGUAGE plpgsql;

-- Create view for encrypted data monitoring
CREATE OR REPLACE VIEW encryption_monitoring AS
SELECT 
    'users' as table_name,
    COUNT(*) as total_records,
    COUNT(email_encrypted) as encrypted_emails,
    COUNT(phone_encrypted) as encrypted_phones,
    COUNT(ssn_encrypted) as encrypted_ssns
FROM users
UNION ALL
SELECT 
    'financial_data' as table_name,
    COUNT(*) as total_records,
    COUNT(bank_account_encrypted) as encrypted_emails,
    COUNT(routing_number_encrypted) as encrypted_phones,
    COUNT(tax_id_encrypted) as encrypted_ssns
FROM encrypted_financial_data
UNION ALL
SELECT 
    'trading_data' as table_name,
    COUNT(*) as total_records,
    COUNT(private_key_encrypted) as encrypted_emails,
    COUNT(api_key_encrypted) as encrypted_phones,
    COUNT(secret_key_encrypted) as encrypted_ssns
FROM encrypted_trading_data
UNION ALL
SELECT 
    'compliance_data' as table_name,
    COUNT(*) as total_records,
    COUNT(kyc_document_encrypted) as encrypted_emails,
    COUNT(aml_report_encrypted) as encrypted_phones,
    COUNT(risk_assessment_encrypted) as encrypted_ssns
FROM encrypted_compliance_data;

-- Create data masking functions for development/testing
CREATE OR REPLACE FUNCTION mask_sensitive_data(data TEXT, mask_char CHAR DEFAULT 'X')
RETURNS TEXT AS $$
BEGIN
    IF data IS NULL OR data = '' THEN
        RETURN data;
    END IF;
    
    -- Mask all but first and last character
    IF LENGTH(data) <= 2 THEN
        RETURN REPEAT(mask_char, LENGTH(data));
    END IF;
    
    RETURN LEFT(data, 1) || REPEAT(mask_char, LENGTH(data) - 2) || RIGHT(data, 1);
END;
$$ LANGUAGE plpgsql;

-- Create view for masked sensitive data (for development/testing only)
CREATE OR REPLACE VIEW masked_users AS
SELECT 
    id,
    mask_sensitive_data(email) as email,
    mask_sensitive_data(phone) as phone,
    mask_sensitive_data(ssn) as ssn,
    mask_sensitive_data(address) as address,
    first_name,
    last_name,
    role,
    status,
    created_at
FROM users;

-- Grant appropriate permissions
-- GRANT SELECT ON encrypted_users TO app_user;
-- GRANT SELECT ON encrypted_financial_data TO app_user;
-- GRANT SELECT ON encrypted_trading_data TO app_user;
-- GRANT SELECT ON encrypted_compliance_data TO app_user;
-- GRANT SELECT ON encrypted_system_secrets TO app_user;
-- GRANT SELECT ON encrypted_audit_logs TO app_user;
-- GRANT SELECT ON encryption_monitoring TO app_user;
-- GRANT SELECT ON masked_users TO app_user;

-- Insert default system secrets (will be encrypted by application)
INSERT INTO encrypted_system_secrets (secret_type, encrypted_value, metadata)
VALUES 
    ('jwt_secret', 'PLACEHOLDER_ENCRYPTED_VALUE', '{"description": "JWT signing secret", "autoRotate": true}'),
    ('session_secret', 'PLACEHOLDER_ENCRYPTED_VALUE', '{"description": "Express session secret", "autoRotate": true}'),
    ('api_encryption_key', 'PLACEHOLDER_ENCRYPTED_VALUE', '{"description": "API request/response encryption key", "autoRotate": false}')
ON CONFLICT (secret_type) DO NOTHING;
