-- Migration: Sharia Compliance Tables
-- Description: Creates tables for Sharia-compliant trading, Islamic finance instruments, and compliance tracking
-- Version: 006
-- Date: 2024-01-15

-- Sharia Compliance Rules Table
CREATE TABLE IF NOT EXISTS sharia_compliance_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    rule_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    requirement_type VARCHAR(50) NOT NULL,
    threshold_value DECIMAL(10, 4),
    enforcement_level VARCHAR(20) NOT NULL CHECK (enforcement_level IN ('mandatory', 'recommended', 'optional')),
    sharia_board VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Halal Business Sectors Table
CREATE TABLE IF NOT EXISTS halal_business_sectors (
    id SERIAL PRIMARY KEY,
    sector_name VARCHAR(100) NOT NULL,
    sub_sector VARCHAR(100),
    compliance_status VARCHAR(20) NOT NULL CHECK (compliance_status IN ('halal', 'haram', 'mashbooh')),
    description TEXT,
    sharia_rationale TEXT,
    examples TEXT[],
    restrictions TEXT[],
    sharia_board_approval VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Islamic Financial Instruments Table
CREATE TABLE IF NOT EXISTS islamic_financial_instruments (
    id SERIAL PRIMARY KEY,
    instrument_name VARCHAR(100) NOT NULL,
    instrument_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    risk_sharing_model VARCHAR(50) NOT NULL,
    profit_sharing_model VARCHAR(50) NOT NULL,
    compliance_status VARCHAR(20) NOT NULL CHECK (compliance_status IN ('sharia_compliant', 'conditional', 'prohibited')),
    features TEXT[],
    requirements TEXT[],
    restrictions TEXT[],
    sharia_board_certification VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sharia Supervisory Boards Table
CREATE TABLE IF NOT EXISTS sharia_supervisory_boards (
    id SERIAL PRIMARY KEY,
    board_code VARCHAR(20) NOT NULL UNIQUE,
    board_name VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    description TEXT,
    standards TEXT[],
    certifications TEXT[],
    website_url VARCHAR(255),
    contact_email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sharia Advisors Table
CREATE TABLE IF NOT EXISTS sharia_advisors (
    id SERIAL PRIMARY KEY,
    advisor_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(100),
    specialization TEXT[],
    affiliated_board VARCHAR(100),
    certifications TEXT[],
    experience_years INTEGER,
    biography TEXT,
    contact_email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Investment Compliance Checks Table
CREATE TABLE IF NOT EXISTS investment_compliance_checks (
    id SERIAL PRIMARY KEY,
    check_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    investment_name VARCHAR(255) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    sub_sector VARCHAR(100),
    instrument_type VARCHAR(50),
    compliance_status VARCHAR(20) NOT NULL CHECK (compliance_status IN ('compliant', 'non_compliant', 'requires_review')),
    compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
    is_halal BOOLEAN NOT NULL,
    riba_compliant BOOLEAN,
    gharar_compliant BOOLEAN,
    asset_backing_ratio DECIMAL(5, 4),
    sharia_board VARCHAR(100),
    certification_status VARCHAR(50),
    issues TEXT[],
    recommendations TEXT[],
    checked_by VARCHAR(255),
    check_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Islamic Portfolios Table
CREATE TABLE IF NOT EXISTS islamic_portfolios (
    id SERIAL PRIMARY KEY,
    portfolio_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    portfolio_name VARCHAR(255) NOT NULL,
    portfolio_type VARCHAR(50) NOT NULL CHECK (portfolio_type IN ('islamic_portfolio', 'halal_fund', 'sukuk_portfolio')),
    total_value DECIMAL(20, 2) NOT NULL,
    expected_return DECIMAL(5, 4),
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'moderate', 'high')),
    sharia_board VARCHAR(100),
    certification_status VARCHAR(50),
    compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
    zakat_obligation DECIMAL(20, 2),
    last_compliance_check TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio Instruments Table
CREATE TABLE IF NOT EXISTS portfolio_instruments (
    id SERIAL PRIMARY KEY,
    portfolio_id VARCHAR(255) NOT NULL,
    instrument_id VARCHAR(255) NOT NULL,
    instrument_name VARCHAR(255) NOT NULL,
    instrument_type VARCHAR(50) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    sub_sector VARCHAR(100),
    quantity DECIMAL(20, 8),
    value DECIMAL(20, 2) NOT NULL,
    weight DECIMAL(5, 4) NOT NULL CHECK (weight >= 0 AND weight <= 1),
    expected_return DECIMAL(5, 4),
    is_sharia_compliant BOOLEAN NOT NULL,
    compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
    sharia_board VARCHAR(100),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (portfolio_id) REFERENCES islamic_portfolios(portfolio_id) ON DELETE CASCADE
);

-- Zakat Calculations Table
CREATE TABLE IF NOT EXISTS zakat_calculations (
    id SERIAL PRIMARY KEY,
    calculation_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    portfolio_id VARCHAR(255),
    calculation_date DATE NOT NULL,
    total_assets DECIMAL(20, 2) NOT NULL,
    zakatable_assets DECIMAL(20, 2) NOT NULL,
    nisab_threshold DECIMAL(20, 2) NOT NULL,
    zakat_rate DECIMAL(5, 4) NOT NULL,
    zakat_amount DECIMAL(20, 2) NOT NULL,
    is_above_nisab BOOLEAN NOT NULL,
    exemptions JSONB,
    calculation_method VARCHAR(50),
    sharia_board_approval VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Riba Detection Log Table
CREATE TABLE IF NOT EXISTS riba_detection_log (
    id SERIAL PRIMARY KEY,
    detection_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    instrument_name VARCHAR(255),
    interest_rate DECIMAL(5, 4),
    return_rate DECIMAL(5, 4),
    riba_type VARCHAR(50),
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    action_taken VARCHAR(100),
    is_resolved BOOLEAN DEFAULT FALSE,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Gharar Detection Log Table
CREATE TABLE IF NOT EXISTS gharar_detection_log (
    id SERIAL PRIMARY KEY,
    detection_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    instrument_name VARCHAR(255),
    volatility DECIMAL(5, 4),
    leverage_ratio DECIMAL(5, 2),
    uncertainty_level VARCHAR(20) CHECK (uncertainty_level IN ('low', 'medium', 'high', 'excessive')),
    gharar_type VARCHAR(50),
    description TEXT,
    action_taken VARCHAR(100),
    is_resolved BOOLEAN DEFAULT FALSE,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Islamic Finance Transactions Table
CREATE TABLE IF NOT EXISTS islamic_finance_transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('mudaraba', 'musharaka', 'ijara', 'sukuk', 'takaful', 'murabaha')),
    instrument_name VARCHAR(255) NOT NULL,
    counterparty VARCHAR(255),
    transaction_amount DECIMAL(20, 2) NOT NULL,
    profit_rate DECIMAL(5, 4),
    risk_sharing_model VARCHAR(50),
    asset_backing_ratio DECIMAL(5, 4),
    sharia_board_approval VARCHAR(100),
    compliance_status VARCHAR(20) CHECK (compliance_status IN ('approved', 'pending', 'rejected')),
    transaction_date DATE NOT NULL,
    maturity_date DATE,
    status VARCHAR(20) CHECK (status IN ('active', 'completed', 'terminated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Compliance Audit Trail Table
CREATE TABLE IF NOT EXISTS compliance_audit_trail (
    id SERIAL PRIMARY KEY,
    audit_id VARCHAR(255) NOT NULL UNIQUE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    compliance_status_old VARCHAR(20),
    compliance_status_new VARCHAR(20),
    sharia_board_old VARCHAR(100),
    sharia_board_new VARCHAR(100),
    user_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_halal_sectors_compliance ON halal_business_sectors(compliance_status);
CREATE INDEX IF NOT EXISTS idx_halal_sectors_active ON halal_business_sectors(is_active);
CREATE INDEX IF NOT EXISTS idx_islamic_instruments_type ON islamic_financial_instruments(instrument_type);
CREATE INDEX IF NOT EXISTS idx_islamic_instruments_compliance ON islamic_financial_instruments(compliance_status);

CREATE INDEX IF NOT EXISTS idx_investment_checks_user_id ON investment_compliance_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_checks_compliance ON investment_compliance_checks(compliance_status);
CREATE INDEX IF NOT EXISTS idx_investment_checks_timestamp ON investment_compliance_checks(check_timestamp);

CREATE INDEX IF NOT EXISTS idx_islamic_portfolios_user_id ON islamic_portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_islamic_portfolios_type ON islamic_portfolios(portfolio_type);
CREATE INDEX IF NOT EXISTS idx_islamic_portfolios_compliance ON islamic_portfolios(compliance_score);

CREATE INDEX IF NOT EXISTS idx_portfolio_instruments_portfolio_id ON portfolio_instruments(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_instruments_compliance ON portfolio_instruments(is_sharia_compliant);

CREATE INDEX IF NOT EXISTS idx_zakat_calculations_user_id ON zakat_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_zakat_calculations_date ON zakat_calculations(calculation_date);

CREATE INDEX IF NOT EXISTS idx_riba_detection_user_id ON riba_detection_log(user_id);
CREATE INDEX IF NOT EXISTS idx_riba_detection_severity ON riba_detection_log(severity);
CREATE INDEX IF NOT EXISTS idx_riba_detection_timestamp ON riba_detection_log(detected_at);

CREATE INDEX IF NOT EXISTS idx_gharar_detection_user_id ON gharar_detection_log(user_id);
CREATE INDEX IF NOT EXISTS idx_gharar_detection_level ON gharar_detection_log(uncertainty_level);
CREATE INDEX IF NOT EXISTS idx_gharar_detection_timestamp ON gharar_detection_log(detected_at);

CREATE INDEX IF NOT EXISTS idx_islamic_transactions_user_id ON islamic_finance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_islamic_transactions_type ON islamic_finance_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_islamic_transactions_status ON islamic_finance_transactions(status);

CREATE INDEX IF NOT EXISTS idx_compliance_audit_entity ON compliance_audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_timestamp ON compliance_audit_trail(timestamp);

-- Create Views for Analytics
CREATE OR REPLACE VIEW sharia_compliance_summary AS
SELECT 
    user_id,
    COUNT(*) as total_checks,
    SUM(CASE WHEN compliance_status = 'compliant' THEN 1 ELSE 0 END) as compliant_investments,
    SUM(CASE WHEN compliance_status = 'non_compliant' THEN 1 ELSE 0 END) as non_compliant_investments,
    AVG(compliance_score) as avg_compliance_score,
    MAX(check_timestamp) as last_check_date
FROM investment_compliance_checks
GROUP BY user_id;

CREATE OR REPLACE VIEW islamic_portfolio_performance AS
SELECT 
    p.portfolio_id,
    p.user_id,
    p.portfolio_name,
    p.total_value,
    p.expected_return,
    p.compliance_score,
    p.zakat_obligation,
    COUNT(pi.instrument_id) as total_instruments,
    AVG(pi.compliance_score) as avg_instrument_compliance
FROM islamic_portfolios p
LEFT JOIN portfolio_instruments pi ON p.portfolio_id = pi.portfolio_id
GROUP BY p.portfolio_id, p.user_id, p.portfolio_name, p.total_value, p.expected_return, p.compliance_score, p.zakat_obligation;

CREATE OR REPLACE VIEW riba_detection_summary AS
SELECT 
    user_id,
    COUNT(*) as total_detections,
    SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_detections,
    SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_detections,
    SUM(CASE WHEN is_resolved THEN 1 ELSE 0 END) as resolved_detections,
    MAX(detected_at) as last_detection_date
FROM riba_detection_log
GROUP BY user_id;

CREATE OR REPLACE VIEW zakat_obligations_summary AS
SELECT 
    user_id,
    COUNT(*) as total_calculations,
    SUM(zakat_amount) as total_zakat_amount,
    AVG(zakatable_assets) as avg_zakatable_assets,
    MAX(calculation_date) as last_calculation_date
FROM zakat_calculations
WHERE is_above_nisab = true
GROUP BY user_id;

-- Create Triggers for Audit Logging
CREATE OR REPLACE FUNCTION sharia_compliance_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO compliance_audit_trail (audit_id, entity_type, entity_id, action, new_values, compliance_status_new, sharia_board_new, user_id)
        VALUES (
            'audit_' || NEW.id || '_' || EXTRACT(EPOCH FROM NOW()),
            TG_TABLE_NAME,
            NEW.id::TEXT,
            'INSERT',
            row_to_json(NEW),
            NEW.compliance_status,
            NEW.sharia_board,
            NEW.user_id
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO compliance_audit_trail (audit_id, entity_type, entity_id, action, old_values, new_values, compliance_status_old, compliance_status_new, sharia_board_old, sharia_board_new, user_id)
        VALUES (
            'audit_' || NEW.id || '_' || EXTRACT(EPOCH FROM NOW()),
            TG_TABLE_NAME,
            NEW.id::TEXT,
            'UPDATE',
            row_to_json(OLD),
            row_to_json(NEW),
            OLD.compliance_status,
            NEW.compliance_status,
            OLD.sharia_board,
            NEW.sharia_board,
            NEW.user_id
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO compliance_audit_trail (audit_id, entity_type, entity_id, action, old_values, compliance_status_old, sharia_board_old, user_id)
        VALUES (
            'audit_' || OLD.id || '_' || EXTRACT(EPOCH FROM NOW()),
            TG_TABLE_NAME,
            OLD.id::TEXT,
            'DELETE',
            row_to_json(OLD),
            OLD.compliance_status,
            OLD.sharia_board,
            OLD.user_id
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers
CREATE TRIGGER investment_compliance_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON investment_compliance_checks
    FOR EACH ROW EXECUTE FUNCTION sharia_compliance_audit_trigger();

CREATE TRIGGER islamic_portfolio_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON islamic_portfolios
    FOR EACH ROW EXECUTE FUNCTION sharia_compliance_audit_trigger();

CREATE TRIGGER islamic_transaction_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON islamic_finance_transactions
    FOR EACH ROW EXECUTE FUNCTION sharia_compliance_audit_trigger();

-- Insert Sample Data
-- Sharia Compliance Rules
INSERT INTO sharia_compliance_rules (rule_name, rule_type, description, requirement_type, threshold_value, enforcement_level, sharia_board)
VALUES 
    ('Asset Backing Requirement', 'asset_backing', 'All financial instruments must be backed by tangible assets', 'minimum_asset_ratio', 0.7000, 'mandatory', 'AAOIFI'),
    ('Profit Loss Sharing', 'profit_loss_sharing', 'Returns must be based on actual profit/loss sharing', 'no_guaranteed_returns', NULL, 'mandatory', 'AAOIFI'),
    ('Ethical Investment Screening', 'ethical_screening', 'Investments must pass ethical screening criteria', 'halal_business_activities', NULL, 'mandatory', 'IFSB'),
    ('Transparency and Disclosure', 'transparency', 'Full disclosure of all terms and conditions', 'clear_terms', NULL, 'mandatory', 'OIC_FIQH_ACADEMY')
ON CONFLICT (rule_name) DO NOTHING;

-- Halal Business Sectors
INSERT INTO halal_business_sectors (sector_name, sub_sector, compliance_status, description, sharia_rationale, examples, restrictions)
VALUES 
    ('Technology', 'Software Development', 'halal', 'Software and technology development', 'Serves human welfare and innovation', ARRAY['Mobile Apps', 'Enterprise Software', 'AI/ML'], NULL),
    ('Technology', 'Clean Energy', 'halal', 'Renewable and clean energy', 'Environmental sustainability and human welfare', ARRAY['Solar Power', 'Wind Energy', 'Hydroelectric'], NULL),
    ('Healthcare', 'Pharmaceuticals', 'halal', 'Medicine production and distribution', 'Essential for human health and welfare', ARRAY['Generic Drugs', 'Vaccines', 'Medical Devices'], NULL),
    ('Education', 'Educational Technology', 'halal', 'Educational software and platforms', 'Promotes knowledge and learning', ARRAY['E-learning', 'Educational Apps', 'Online Courses'], NULL),
    ('Banking & Finance', 'Conventional Banking', 'haram', 'Interest-based banking services', 'Involves riba (interest) which is prohibited', ARRAY['Interest Loans', 'Credit Cards', 'Savings Accounts'], ARRAY['Interest payments', 'Compound interest', 'Usury']),
    ('Alcohol & Tobacco', 'Alcohol Production', 'haram', 'Alcohol manufacturing and distribution', 'Alcohol is prohibited in Islam', ARRAY['Breweries', 'Distilleries', 'Wineries'], ARRAY['Alcohol consumption', 'Alcohol sales', 'Alcohol advertising']),
    ('Gambling & Gaming', 'Casinos', 'haram', 'Gambling establishments', 'Gambling (maysir) is prohibited', ARRAY['Casinos', 'Sports Betting', 'Online Gaming'], ARRAY['Gambling activities', 'Betting', 'Lottery'])
ON CONFLICT DO NOTHING;

-- Islamic Financial Instruments
INSERT INTO islamic_financial_instruments (instrument_name, instrument_type, description, risk_sharing_model, profit_sharing_model, compliance_status, features, requirements)
VALUES 
    ('Mudaraba', 'profit_sharing', 'Partnership where one party provides capital and another provides expertise', 'capital_provider_bears_losses', 'agreed_ratio', 'sharia_compliant', ARRAY['profit_sharing', 'loss_bearing', 'no_guaranteed_return'], ARRAY['capital_contribution', 'expertise_contribution', 'profit_sharing_agreement']),
    ('Musharaka', 'joint_venture', 'Partnership where all parties contribute capital and share profits/losses', 'proportional_to_contribution', 'proportional_to_contribution', 'sharia_compliant', ARRAY['joint_ownership', 'profit_loss_sharing', 'management_participation'], ARRAY['capital_contribution', 'profit_loss_sharing', 'management_agreement']),
    ('Ijara', 'leasing', 'Leasing arrangement where assets are leased for a specified period', 'lessor_bears_asset_risk', 'lease_rental', 'sharia_compliant', ARRAY['asset_ownership', 'lease_rental', 'asset_management'], ARRAY['asset_ownership', 'lease_agreement', 'asset_valuation']),
    ('Sukuk', 'islamic_bonds', 'Asset-backed securities representing ownership in tangible assets', 'asset_based', 'asset_returns', 'sharia_compliant', ARRAY['asset_backing', 'ownership_certificates', 'tradable'], ARRAY['asset_backing', 'ownership_documentation', 'trading_compliance']),
    ('Takaful', 'islamic_insurance', 'Mutual insurance based on cooperation and shared responsibility', 'mutual_risk_sharing', 'surplus_distribution', 'sharia_compliant', ARRAY['mutual_help', 'surplus_sharing', 'no_gharar'], ARRAY['mutual_cooperation', 'risk_sharing', 'surplus_agreement'])
ON CONFLICT DO NOTHING;

-- Sharia Supervisory Boards
INSERT INTO sharia_supervisory_boards (board_code, board_name, country, description, standards, certifications, website_url, contact_email)
VALUES 
    ('AAOIFI', 'Accounting and Auditing Organization for Islamic Financial Institutions', 'Bahrain', 'Leading international standard-setting body for Islamic finance', ARRAY['AAOIFI Sharia Standards', 'Accounting Standards', 'Governance Standards'], ARRAY['AAOIFI Certified'], 'https://aaoifi.com', 'info@aaoifi.com'),
    ('IFSB', 'Islamic Financial Services Board', 'Malaysia', 'International standard-setting organization for Islamic financial services', ARRAY['IFSB Standards', 'Risk Management', 'Capital Adequacy'], ARRAY['IFSB Compliant'], 'https://ifsb.org', 'info@ifsb.org'),
    ('OIC_FIQH', 'Organization of Islamic Cooperation Fiqh Academy', 'Saudi Arabia', 'Premier Islamic jurisprudence body', ARRAY['Fiqh Resolutions', 'Sharia Rulings', 'Islamic Law'], ARRAY['OIC Fiqh Approved'], 'https://fiqhacademy.org', 'info@fiqhacademy.org'),
    ('SRB', 'Shariyah Review Bureau', 'Bahrain', 'Leading Sharia advisory and certification body', ARRAY['Sharia Compliance', 'Product Certification', 'Audit Services'], ARRAY['SRB Certified'], 'https://shariyah.com', 'info@shariyah.com'),
    ('DIFC_SC', 'Dubai International Financial Centre Sharia Council', 'UAE', 'Sharia council for Dubai financial center', ARRAY['DIFC Sharia Standards', 'Product Approval', 'Compliance Monitoring'], ARRAY['DIFC Sharia Approved'], 'https://difc.ae', 'sharia@difc.ae')
ON CONFLICT (board_code) DO NOTHING;

-- Sharia Advisors
INSERT INTO sharia_advisors (advisor_code, name, title, specialization, affiliated_board, certifications, experience_years, biography, contact_email)
VALUES 
    ('DR_MANSOOR', 'Dr. Muhammad Tahir Mansoor', 'Sharia Scholar', ARRAY['Islamic Finance', 'Sukuk', 'Takaful'], 'AAOIFI', ARRAY['AAOIFI Certified Scholar'], 25, 'Leading Islamic finance scholar with extensive experience in sukuk and takaful', 'mansoor@aaoifi.com'),
    ('DR_GHUDDAH', 'Dr. Abdul Sattar Abu Ghuddah', 'Sharia Advisor', ARRAY['Islamic Banking', 'Mudaraba', 'Musharaka'], 'IFSB', ARRAY['IFSB Certified Advisor'], 30, 'Renowned Islamic banking expert specializing in partnership-based financing', 'ghuddah@ifsb.org'),
    ('SHEIKH_YAQUBY', 'Sheikh Nizam Yaquby', 'Sharia Scholar', ARRAY['Islamic Finance', 'Compliance', 'Product Development'], 'DIFC Sharia Council', ARRAY['DIFC Sharia Council Member'], 20, 'Expert in Islamic finance compliance and product development', 'yaquby@difc.ae')
ON CONFLICT (advisor_code) DO NOTHING;

-- Create Functions for Sharia Operations
CREATE OR REPLACE FUNCTION check_halal_compliance(
    p_sector VARCHAR,
    p_sub_sector VARCHAR DEFAULT NULL,
    p_instrument_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    is_halal BOOLEAN,
    compliance_status VARCHAR,
    issues TEXT[],
    recommendations TEXT[]
) AS $$
DECLARE
    sector_compliance VARCHAR;
    issues TEXT[] := '{}';
    recommendations TEXT[] := '{}';
BEGIN
    -- Check sector compliance
    SELECT compliance_status INTO sector_compliance
    FROM halal_business_sectors
    WHERE sector_name = p_sector
    AND (p_sub_sector IS NULL OR sub_sector = p_sub_sector)
    LIMIT 1;
    
    IF sector_compliance IS NULL THEN
        issues := array_append(issues, 'Sector not found in database');
        recommendations := array_append(recommendations, 'Contact Sharia board for review');
        RETURN QUERY SELECT FALSE, 'requires_review', issues, recommendations;
    ELSIF sector_compliance = 'haram' THEN
        issues := array_append(issues, 'Sector is prohibited (haram)');
        recommendations := array_append(recommendations, 'Choose halal alternative sector');
        RETURN QUERY SELECT FALSE, 'non_compliant', issues, recommendations;
    ELSE
        RETURN QUERY SELECT TRUE, 'compliant', issues, recommendations;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_zakat_obligation(
    p_user_id VARCHAR,
    p_total_assets DECIMAL,
    p_zakatable_assets DECIMAL,
    p_nisab_threshold DECIMAL DEFAULT 2000.00,
    p_zakat_rate DECIMAL DEFAULT 0.025
)
RETURNS TABLE (
    is_above_nisab BOOLEAN,
    zakat_amount DECIMAL,
    nisab_threshold DECIMAL,
    zakat_rate DECIMAL
) AS $$
BEGIN
    IF p_zakatable_assets >= p_nisab_threshold THEN
        RETURN QUERY SELECT TRUE, p_zakatable_assets * p_zakat_rate, p_nisab_threshold, p_zakat_rate;
    ELSE
        RETURN QUERY SELECT FALSE, 0.00, p_nisab_threshold, p_zakat_rate;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_islamic_portfolio_summary(p_user_id VARCHAR)
RETURNS TABLE (
    total_portfolios BIGINT,
    total_value DECIMAL,
    avg_compliance_score DECIMAL,
    total_zakat_obligation DECIMAL,
    last_compliance_check TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_portfolios,
        SUM(p.total_value) as total_value,
        AVG(p.compliance_score) as avg_compliance_score,
        SUM(p.zakat_obligation) as total_zakat_obligation,
        MAX(p.last_compliance_check) as last_compliance_check
    FROM islamic_portfolios p
    WHERE p.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Grant Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON sharia_compliance_rules TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON halal_business_sectors TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON islamic_financial_instruments TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON sharia_supervisory_boards TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON sharia_advisors TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON investment_compliance_checks TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON islamic_portfolios TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON portfolio_instruments TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON zakat_calculations TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON riba_detection_log TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON gharar_detection_log TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON islamic_finance_transactions TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_audit_trail TO finnexusai_user;

GRANT SELECT ON sharia_compliance_summary TO finnexusai_user;
GRANT SELECT ON islamic_portfolio_performance TO finnexusai_user;
GRANT SELECT ON riba_detection_summary TO finnexusai_user;
GRANT SELECT ON zakat_obligations_summary TO finnexusai_user;

GRANT EXECUTE ON FUNCTION check_halal_compliance(VARCHAR, VARCHAR, VARCHAR) TO finnexusai_user;
GRANT EXECUTE ON FUNCTION calculate_zakat_obligation(VARCHAR, DECIMAL, DECIMAL, DECIMAL, DECIMAL) TO finnexusai_user;
GRANT EXECUTE ON FUNCTION get_islamic_portfolio_summary(VARCHAR) TO finnexusai_user;

-- Create Comments
COMMENT ON TABLE sharia_compliance_rules IS 'Sharia compliance rules and requirements';
COMMENT ON TABLE halal_business_sectors IS 'Halal and haram business sectors for investment screening';
COMMENT ON TABLE islamic_financial_instruments IS 'Islamic financial instruments and their compliance status';
COMMENT ON TABLE sharia_supervisory_boards IS 'Sharia supervisory boards and their standards';
COMMENT ON TABLE sharia_advisors IS 'Sharia advisors and scholars';
COMMENT ON TABLE investment_compliance_checks IS 'Investment compliance check results';
COMMENT ON TABLE islamic_portfolios IS 'Sharia-compliant investment portfolios';
COMMENT ON TABLE portfolio_instruments IS 'Instruments within Islamic portfolios';
COMMENT ON TABLE zakat_calculations IS 'Zakat calculation records';
COMMENT ON TABLE riba_detection_log IS 'Riba (interest) detection and monitoring';
COMMENT ON TABLE gharar_detection_log IS 'Gharar (uncertainty) detection and monitoring';
COMMENT ON TABLE islamic_finance_transactions IS 'Islamic finance transactions tracking';
COMMENT ON TABLE compliance_audit_trail IS 'Audit trail for compliance changes';

COMMENT ON VIEW sharia_compliance_summary IS 'Summary of Sharia compliance checks by user';
COMMENT ON VIEW islamic_portfolio_performance IS 'Performance metrics for Islamic portfolios';
COMMENT ON VIEW riba_detection_summary IS 'Summary of riba detection incidents';
COMMENT ON VIEW zakat_obligations_summary IS 'Summary of zakat obligations by user';

-- Migration Complete
INSERT INTO migration_history (version, description, applied_at) 
VALUES ('006', 'Sharia Compliance Tables', NOW());

