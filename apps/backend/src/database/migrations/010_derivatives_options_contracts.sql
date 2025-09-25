-- Derivatives: Options Contracts
-- Migration: 010
-- Generated: 2025-09-21T18:24:38.155Z

CREATE TABLE IF NOT EXISTS options_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL,
    contract_type VARCHAR(10) NOT NULL CHECK (contract_type IN ('call', 'put')),
    strike_price DECIMAL(20,8) NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    underlying_asset VARCHAR(20) NOT NULL,
    contract_size DECIMAL(20,8) NOT NULL,
    premium DECIMAL(20,8) NOT NULL,
    delta DECIMAL(10,6) DEFAULT 0,
    gamma DECIMAL(10,6) DEFAULT 0,
    theta DECIMAL(10,6) DEFAULT 0,
    vega DECIMAL(10,6) DEFAULT 0,
    rho DECIMAL(10,6) DEFAULT 0,
    implied_volatility DECIMAL(8,4) DEFAULT 0,
    open_interest BIGINT DEFAULT 0,
    volume BIGINT DEFAULT 0,
    bid_price DECIMAL(20,8),
    ask_price DECIMAL(20,8),
    last_price DECIMAL(20,8),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_options_symbol ON options_contracts(symbol);
CREATE INDEX idx_options_expiry ON options_contracts(expiry_date);
CREATE INDEX idx_options_underlying ON options_contracts(underlying_asset);
CREATE INDEX idx_options_active ON options_contracts(is_active);

-- Insert sample options contracts
INSERT INTO options_contracts (symbol, contract_type, strike_price, expiry_date, underlying_asset, contract_size, premium, implied_volatility) VALUES
('BTC-240315-C-50000', 'call', 50000.00, '2024-03-15 23:59:59', 'BTC', 1.0, 2500.00, 0.45),
('BTC-240315-P-45000', 'put', 45000.00, '2024-03-15 23:59:59', 'BTC', 1.0, 1800.00, 0.42),
('ETH-240329-C-3000', 'call', 3000.00, '2024-03-29 23:59:59', 'ETH', 1.0, 450.00, 0.55),
('ETH-240329-P-2500', 'put', 2500.00, '2024-03-29 23:59:59', 'ETH', 1.0, 320.00, 0.52);