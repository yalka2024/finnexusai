-- Sharia Compliance Audit
-- Migration: 026
-- Generated: 2025-09-21T18:24:38.166Z

CREATE TABLE IF NOT EXISTS sharia_compliance_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_symbol VARCHAR(20) NOT NULL,
    compliance_check_type VARCHAR(50) NOT NULL,
    is_halal BOOLEAN NOT NULL,
    compliance_score DECIMAL(5,2) CHECK (compliance_score >= 0 AND compliance_score <= 100),
    audit_details JSONB,
    auditor_id UUID,
    audit_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    zk_proof_hash VARCHAR(64),
    verification_status VARCHAR(20) DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS zk_proofs_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proof_type VARCHAR(50) NOT NULL,
    proof_data TEXT NOT NULL,
    public_inputs JSONB,
    verification_key_hash VARCHAR(64),
    is_valid BOOLEAN,
    verification_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gas_used BIGINT,
    block_number BIGINT
);

CREATE INDEX idx_sharia_asset ON sharia_compliance_audit(asset_symbol);
CREATE INDEX idx_sharia_halal ON sharia_compliance_audit(is_halal);
CREATE INDEX idx_zk_proof_type ON zk_proofs_verification(proof_type);
CREATE INDEX idx_zk_valid ON zk_proofs_verification(is_valid);

-- Insert sample compliance data
INSERT INTO sharia_compliance_audit (asset_symbol, compliance_check_type, is_halal, compliance_score, audit_details) VALUES
('BTC', 'cryptocurrency_compliance', true, 95.5, '{"riba_check": "passed", "gharar_check": "passed"}'),
('ETH', 'cryptocurrency_compliance', true, 92.3, '{"riba_check": "passed", "gharar_check": "passed"}'),
('USDT', 'stablecoin_compliance', false, 45.2, '{"riba_check": "failed", "interest_bearing": true}');