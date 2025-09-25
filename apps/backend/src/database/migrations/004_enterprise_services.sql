-- Enterprise Services Database Migration
-- This migration creates tables for the new enterprise-grade services

-- Market Data Table
CREATE TABLE IF NOT EXISTS market_data (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    volume DECIMAL(20, 8),
    change_24h DECIMAL(10, 4),
    high_24h DECIMAL(20, 8),
    low_24h DECIMAL(20, 8),
    provider VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    bid DECIMAL(20, 8),
    ask DECIMAL(20, 8),
    price_change DECIMAL(20, 8),
    price_change_percent DECIMAL(10, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, provider, timestamp)
);

-- ML Model Training Data Table
CREATE TABLE IF NOT EXISTS ml_training_data (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    features JSONB NOT NULL,
    labels JSONB NOT NULL,
    accuracy DECIMAL(5, 4),
    loss DECIMAL(10, 6),
    training_time INTEGER, -- in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ML Model Predictions Table
CREATE TABLE IF NOT EXISTS ml_predictions (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    symbol VARCHAR(20),
    prediction_type VARCHAR(50) NOT NULL,
    input_data JSONB NOT NULL,
    prediction_result JSONB NOT NULL,
    confidence DECIMAL(5, 4),
    accuracy DECIMAL(5, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blockchain Transactions Table
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    id SERIAL PRIMARY KEY,
    chain VARCHAR(50) NOT NULL,
    hash VARCHAR(100) NOT NULL,
    block_number BIGINT,
    from_address VARCHAR(100),
    to_address VARCHAR(100),
    value DECIMAL(30, 18),
    gas_used BIGINT,
    gas_price DECIMAL(20, 9),
    status VARCHAR(20) DEFAULT 'pending',
    transaction_type VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(chain, hash)
);

-- Blockchain Balances Table
CREATE TABLE IF NOT EXISTS blockchain_balances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    chain VARCHAR(50) NOT NULL,
    address VARCHAR(100) NOT NULL,
    token_address VARCHAR(100),
    balance DECIMAL(30, 18) NOT NULL,
    balance_formatted DECIMAL(30, 8),
    price_usd DECIMAL(20, 8),
    value_usd DECIMAL(20, 8),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, chain, address, token_address)
);

-- DeFi Protocol Data Table
CREATE TABLE IF NOT EXISTS defi_protocol_data (
    id SERIAL PRIMARY KEY,
    protocol VARCHAR(100) NOT NULL,
    chain VARCHAR(50) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    total_value_locked DECIMAL(30, 8),
    total_volume DECIMAL(30, 8),
    total_fees DECIMAL(30, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments Table (Enhanced)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(100) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    method VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    transaction_id VARCHAR(100),
    provider VARCHAR(50) NOT NULL,
    fees DECIMAL(20, 8) DEFAULT 0,
    exchange_rate DECIMAL(20, 8),
    metadata JSONB,
    risk_score DECIMAL(5, 4),
    fraud_check JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    method_type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    external_id VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KYC Verifications Table
CREATE TABLE IF NOT EXISTS kyc_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    verification_level VARCHAR(20) DEFAULT 'basic',
    documents JSONB,
    verification_result JSONB,
    provider VARCHAR(50),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- AML Screenings Table
CREATE TABLE IF NOT EXISTS aml_screenings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    transaction_data JSONB,
    screening_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    risk_score DECIMAL(5, 4),
    risk_level VARCHAR(20),
    screening_result JSONB,
    provider VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Security Events Table
CREATE TABLE IF NOT EXISTS security_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    event_data JSONB,
    threat_level VARCHAR(20),
    action_taken VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Encryption Keys Table
CREATE TABLE IF NOT EXISTS encryption_keys (
    id SERIAL PRIMARY KEY,
    key_id VARCHAR(100) UNIQUE NOT NULL,
    algorithm VARCHAR(50) NOT NULL,
    key_type VARCHAR(50) NOT NULL,
    encrypted_key BYTEA NOT NULL,
    key_hash VARCHAR(64) NOT NULL,
    usage_count INTEGER DEFAULT 0,
    max_usage INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE,
    rotated_at TIMESTAMP WITH TIME ZONE
);

-- Streaming Subscriptions Table
CREATE TABLE IF NOT EXISTS streaming_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    topic VARCHAR(100) NOT NULL,
    client_id VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE,
    message_count INTEGER DEFAULT 0
);

-- System Logs Table
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    service VARCHAR(50),
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Actions Table
CREATE TABLE IF NOT EXISTS admin_actions (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL,
    target_user_id INTEGER REFERENCES users(id),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Activities Table
CREATE TABLE IF NOT EXISTS user_activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timestamp ON market_data(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_provider_timestamp ON market_data(provider, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_model_created ON ml_predictions(model_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_chain_hash ON blockchain_transactions(chain, hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_user_id ON blockchain_transactions(from_address, to_address);
CREATE INDEX IF NOT EXISTS idx_payments_user_id_created ON payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_user_id ON kyc_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_aml_screenings_user_id ON aml_screenings(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type_created ON security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_key_id ON encryption_keys(key_id);
CREATE INDEX IF NOT EXISTS idx_streaming_subscriptions_user_topic ON streaming_subscriptions(user_id, topic);
CREATE INDEX IF NOT EXISTS idx_system_logs_level_created ON system_logs(level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id_created ON user_activities(user_id, created_at DESC);

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_blockchain_transactions_updated_at BEFORE UPDATE ON blockchain_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial data
INSERT INTO encryption_keys (key_id, algorithm, key_type, encrypted_key, key_hash) VALUES 
('master', 'aes256', 'master', '\x0123456789abcdef', 'master_key_hash'),
('auth', 'hmac-sha256', 'authentication', '\xfedcba9876543210', 'auth_key_hash')
ON CONFLICT (key_id) DO NOTHING;

-- Create views for analytics
CREATE OR REPLACE VIEW market_data_summary AS
SELECT 
    symbol,
    provider,
    COUNT(*) as data_points,
    AVG(price) as avg_price,
    MIN(price) as min_price,
    MAX(price) as max_price,
    AVG(volume) as avg_volume,
    MIN(timestamp) as first_data,
    MAX(timestamp) as last_data
FROM market_data
GROUP BY symbol, provider;

CREATE OR REPLACE VIEW payment_summary AS
SELECT 
    DATE(created_at) as date,
    method,
    currency,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount,
    SUM(fees) as total_fees
FROM payments
GROUP BY DATE(created_at), method, currency;

CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    user_id,
    activity_type,
    DATE(created_at) as date,
    COUNT(*) as activity_count
FROM user_activities
GROUP BY user_id, activity_type, DATE(created_at);

COMMENT ON TABLE market_data IS 'Real-time market data from various providers';
COMMENT ON TABLE ml_training_data IS 'Training data for machine learning models';
COMMENT ON TABLE ml_predictions IS 'AI/ML model predictions and results';
COMMENT ON TABLE blockchain_transactions IS 'Blockchain transaction records';
COMMENT ON TABLE blockchain_balances IS 'User blockchain wallet balances';
COMMENT ON TABLE defi_protocol_data IS 'DeFi protocol data and metrics';
COMMENT ON TABLE payments IS 'Payment transaction records';
COMMENT ON TABLE payment_methods IS 'User payment methods';
COMMENT ON TABLE kyc_verifications IS 'KYC verification records';
COMMENT ON TABLE aml_screenings IS 'AML screening results';
COMMENT ON TABLE security_events IS 'Security events and threats';
COMMENT ON TABLE encryption_keys IS 'Encryption keys for quantum-resistant security';
COMMENT ON TABLE streaming_subscriptions IS 'Real-time streaming subscriptions';
COMMENT ON TABLE system_logs IS 'System application logs';
COMMENT ON TABLE admin_actions IS 'Administrative actions audit trail';
COMMENT ON TABLE user_activities IS 'User activity tracking';

