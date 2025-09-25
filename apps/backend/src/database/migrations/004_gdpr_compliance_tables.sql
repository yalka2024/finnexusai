-- GDPR/CCPA Compliance Tables
-- Migration 004: Add GDPR and CCPA compliance tables

-- User consents table for tracking consent management
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL, -- 'marketing', 'analytics', 'data_sharing', 'essential'
    granted BOOLEAN NOT NULL DEFAULT false,
    consent_method VARCHAR(20) NOT NULL, -- 'explicit', 'opt_in', 'opt_out'
    ip_address INET,
    user_agent TEXT,
    consent_text TEXT,
    version VARCHAR(10) DEFAULT '1.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT user_consents_consent_type_valid CHECK (
        consent_type IN ('marketing', 'analytics', 'data_sharing', 'essential', 'third_party', 'profiling')
    ),
    CONSTRAINT user_consents_consent_method_valid CHECK (
        consent_method IN ('explicit', 'opt_in', 'opt_out', 'implied')
    ),
    CONSTRAINT user_consents_version_not_empty CHECK (length(trim(version)) > 0)
);

-- Data processing activities table for GDPR Article 30 records
CREATE TABLE IF NOT EXISTS data_processing_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'collection', 'processing', 'sharing', 'storage', 'deletion'
    purpose TEXT NOT NULL,
    legal_basis VARCHAR(50) NOT NULL, -- 'consent', 'contract', 'legal_obligation', 'legitimate_interest'
    data_categories TEXT[] NOT NULL, -- ['personal', 'financial', 'behavioral', 'biometric']
    third_parties TEXT[] DEFAULT '{}',
    retention_period VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT data_processing_activity_type_valid CHECK (
        activity_type IN ('collection', 'processing', 'sharing', 'storage', 'deletion', 'transfer')
    ),
    CONSTRAINT data_processing_legal_basis_valid CHECK (
        legal_basis IN ('consent', 'contract', 'legal_obligation', 'legitimate_interest', 'vital_interests', 'public_task')
    ),
    CONSTRAINT data_processing_purpose_not_empty CHECK (length(trim(purpose)) > 0)
);

-- Data subject requests table for handling DSARs
CREATE TABLE IF NOT EXISTS data_subject_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL, -- 'access', 'rectification', 'erasure', 'portability', 'restriction'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected'
    requested_data_categories TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL, -- 30 days from creation
    completed_at TIMESTAMP WITH TIME ZONE,
    response_data JSONB,
    rejection_reason TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT dsar_request_type_valid CHECK (
        request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection')
    ),
    CONSTRAINT dsar_status_valid CHECK (
        status IN ('pending', 'processing', 'completed', 'rejected', 'expired')
    ),
    CONSTRAINT dsar_deadline_future CHECK (deadline > created_at)
);

-- Data sharing log table for tracking third-party data sharing
CREATE TABLE IF NOT EXISTS data_sharing_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    third_party VARCHAR(255) NOT NULL,
    data_categories TEXT[] NOT NULL,
    purpose TEXT NOT NULL,
    legal_basis VARCHAR(50) NOT NULL,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    consent_obtained BOOLEAN DEFAULT false,
    consent_id UUID REFERENCES user_consents(id),
    data_anonymized BOOLEAN DEFAULT false,
    retention_period VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT data_sharing_third_party_not_empty CHECK (length(trim(third_party)) > 0),
    CONSTRAINT data_sharing_purpose_not_empty CHECK (length(trim(purpose)) > 0),
    CONSTRAINT data_sharing_legal_basis_valid CHECK (
        legal_basis IN ('consent', 'contract', 'legal_obligation', 'legitimate_interest')
    )
);

-- Privacy impact assessments table
CREATE TABLE IF NOT EXISTS privacy_impact_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data_categories TEXT[] NOT NULL,
    processing_purposes TEXT[] NOT NULL,
    legal_basis VARCHAR(50) NOT NULL,
    risk_level VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    mitigation_measures TEXT[],
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'review', 'approved', 'rejected'
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT pia_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT pia_risk_level_valid CHECK (
        risk_level IN ('low', 'medium', 'high', 'critical')
    ),
    CONSTRAINT pia_status_valid CHECK (
        status IN ('draft', 'review', 'approved', 'rejected', 'expired')
    )
);

-- Data breach incidents table
CREATE TABLE IF NOT EXISTS data_breach_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    breach_type VARCHAR(50) NOT NULL, -- 'confidentiality', 'integrity', 'availability'
    affected_users INTEGER DEFAULT 0,
    data_categories TEXT[] NOT NULL,
    discovered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reported_at TIMESTAMP WITH TIME ZONE,
    contained_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'discovered', -- 'discovered', 'investigating', 'contained', 'resolved', 'reported'
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    regulatory_notification_required BOOLEAN DEFAULT false,
    regulatory_notification_sent BOOLEAN DEFAULT false,
    user_notification_required BOOLEAN DEFAULT false,
    user_notification_sent BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT data_breach_incident_number_not_empty CHECK (length(trim(incident_number)) > 0),
    CONSTRAINT data_breach_title_not_empty CHECK (length(trim(title)) > 0),
    CONSTRAINT data_breach_type_valid CHECK (
        breach_type IN ('confidentiality', 'integrity', 'availability', 'mixed')
    ),
    CONSTRAINT data_breach_status_valid CHECK (
        status IN ('discovered', 'investigating', 'contained', 'resolved', 'reported', 'closed')
    ),
    CONSTRAINT data_breach_severity_valid CHECK (
        severity IN ('low', 'medium', 'high', 'critical')
    ),
    CONSTRAINT data_breach_affected_users_positive CHECK (affected_users >= 0)
);

-- Data retention policies table
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_category VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    retention_period_days INTEGER NOT NULL,
    legal_basis TEXT,
    auto_delete BOOLEAN DEFAULT false,
    anonymize_before_delete BOOLEAN DEFAULT true,
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    next_review_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT retention_policy_data_category_not_empty CHECK (length(trim(data_category)) > 0),
    CONSTRAINT retention_policy_retention_period_positive CHECK (retention_period_days > 0),
    UNIQUE(data_category, table_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_consent_type ON user_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_user_consents_created_at ON user_consents(created_at);
CREATE INDEX IF NOT EXISTS idx_user_consents_expires_at ON user_consents(expires_at);

CREATE INDEX IF NOT EXISTS idx_data_processing_user_id ON data_processing_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_activity_type ON data_processing_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_data_processing_legal_basis ON data_processing_activities(legal_basis);
CREATE INDEX IF NOT EXISTS idx_data_processing_created_at ON data_processing_activities(created_at);

CREATE INDEX IF NOT EXISTS idx_dsar_user_id ON data_subject_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dsar_request_type ON data_subject_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_dsar_status ON data_subject_requests(status);
CREATE INDEX IF NOT EXISTS idx_dsar_created_at ON data_subject_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_dsar_deadline ON data_subject_requests(deadline);

CREATE INDEX IF NOT EXISTS idx_data_sharing_user_id ON data_sharing_log(user_id);
CREATE INDEX IF NOT EXISTS idx_data_sharing_third_party ON data_sharing_log(third_party);
CREATE INDEX IF NOT EXISTS idx_data_sharing_shared_at ON data_sharing_log(shared_at);

CREATE INDEX IF NOT EXISTS idx_pia_risk_level ON privacy_impact_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_pia_status ON privacy_impact_assessments(status);
CREATE INDEX IF NOT EXISTS idx_pia_created_at ON privacy_impact_assessments(created_at);

CREATE INDEX IF NOT EXISTS idx_data_breach_incident_number ON data_breach_incidents(incident_number);
CREATE INDEX IF NOT EXISTS idx_data_breach_status ON data_breach_incidents(status);
CREATE INDEX IF NOT EXISTS idx_data_breach_severity ON data_breach_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_data_breach_discovered_at ON data_breach_incidents(discovered_at);

CREATE INDEX IF NOT EXISTS idx_retention_policy_data_category ON data_retention_policies(data_category);
CREATE INDEX IF NOT EXISTS idx_retention_policy_table_name ON data_retention_policies(table_name);
CREATE INDEX IF NOT EXISTS idx_retention_policy_next_review ON data_retention_policies(next_review_at);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_privacy_impact_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_privacy_impact_assessments_updated_at
    BEFORE UPDATE ON privacy_impact_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_privacy_impact_assessments_updated_at();

CREATE OR REPLACE FUNCTION update_data_retention_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_data_retention_policies_updated_at
    BEFORE UPDATE ON data_retention_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_data_retention_policies_updated_at();

-- Function to get user consent summary
CREATE OR REPLACE FUNCTION get_user_consent_summary(p_user_id UUID)
RETURNS TABLE (
    consent_type VARCHAR,
    granted BOOLEAN,
    granted_at TIMESTAMP WITH TIME ZONE,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (uc.consent_type)
        uc.consent_type,
        uc.granted,
        uc.created_at,
        uc.withdrawn_at,
        uc.expires_at,
        (uc.granted AND uc.withdrawn_at IS NULL AND (uc.expires_at IS NULL OR uc.expires_at > NOW())) as is_valid
    FROM user_consents uc
    WHERE uc.user_id = p_user_id
    ORDER BY uc.consent_type, uc.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending DSARs
CREATE OR REPLACE FUNCTION get_pending_dsar_summary()
RETURNS TABLE (
    request_id UUID,
    user_id UUID,
    request_type VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE,
    deadline TIMESTAMP WITH TIME ZONE,
    days_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dsr.id,
        dsr.user_id,
        dsr.request_type,
        dsr.created_at,
        dsr.deadline,
        EXTRACT(DAY FROM dsr.deadline - NOW())::INTEGER as days_remaining
    FROM data_subject_requests dsr
    WHERE dsr.status = 'pending' AND dsr.deadline > NOW()
    ORDER BY dsr.deadline ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired data based on retention policies
CREATE OR REPLACE FUNCTION cleanup_data_by_retention_policy()
RETURNS TABLE (
    data_category VARCHAR,
    records_affected BIGINT,
    cleanup_action VARCHAR
) AS $$
DECLARE
    policy_record RECORD;
    cleanup_count BIGINT;
BEGIN
    FOR policy_record IN 
        SELECT * FROM data_retention_policies 
        WHERE auto_delete = true 
        AND next_review_at <= NOW()
    LOOP
        -- This is a placeholder - actual cleanup would depend on table structure
        -- For now, we'll return simulated results
        cleanup_count := 0;
        
        RETURN QUERY SELECT 
            policy_record.data_category,
            cleanup_count,
            CASE 
                WHEN policy_record.anonymize_before_delete THEN 'anonymized'
                ELSE 'deleted'
            END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Insert default retention policies
INSERT INTO data_retention_policies (data_category, table_name, retention_period_days, legal_basis, auto_delete, anonymize_before_delete)
VALUES 
    ('user_data', 'users', 2555, 'Contractual obligation and legitimate interest', false, true),
    ('audit_logs', 'audit_logs', 2555, 'Legal obligation', false, true),
    ('trading_data', 'trades', 3650, 'Legal obligation and regulatory requirements', false, false),
    ('compliance_data', 'kyc_documents', 3650, 'Legal obligation', false, false),
    ('temporary_data', 'sessions', 1, 'Legitimate interest', true, false),
    ('marketing_data', 'marketing_consent', 1095, 'Consent', true, false)
ON CONFLICT (data_category, table_name) DO NOTHING;

-- Create views for easy access to compliance data
CREATE OR REPLACE VIEW active_user_consents AS
SELECT 
    uc.user_id,
    uc.consent_type,
    uc.granted,
    uc.created_at as granted_at,
    uc.withdrawn_at,
    uc.expires_at,
    (uc.granted AND uc.withdrawn_at IS NULL AND (uc.expires_at IS NULL OR uc.expires_at > NOW())) as is_active
FROM user_consents uc
WHERE uc.granted = true AND uc.withdrawn_at IS NULL;

CREATE OR REPLACE VIEW data_processing_summary AS
SELECT 
    dpa.activity_type,
    dpa.legal_basis,
    COUNT(*) as activity_count,
    COUNT(DISTINCT dpa.user_id) as unique_users,
    MAX(dpa.created_at) as last_activity
FROM data_processing_activities dpa
GROUP BY dpa.activity_type, dpa.legal_basis
ORDER BY activity_count DESC;

CREATE OR REPLACE VIEW dsar_status_summary AS
SELECT 
    dsr.request_type,
    dsr.status,
    COUNT(*) as request_count,
    AVG(EXTRACT(EPOCH FROM (dsr.completed_at - dsr.created_at))/86400) as avg_completion_days
FROM data_subject_requests dsr
GROUP BY dsr.request_type, dsr.status
ORDER BY request_count DESC;
