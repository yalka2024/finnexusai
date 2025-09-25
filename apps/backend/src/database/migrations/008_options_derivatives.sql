-- Migration: Options and Derivatives Trading Tables
-- Description: Creates tables for options and derivatives trading, pricing models, Greeks calculation, and risk management
-- Version: 008
-- Date: 2024-01-15

-- Options Contracts Table
CREATE TABLE IF NOT EXISTS options_contracts (
    id SERIAL PRIMARY KEY,
    contract_symbol VARCHAR(50) NOT NULL UNIQUE,
    underlying_asset VARCHAR(20) NOT NULL,
    contract_type VARCHAR(10) NOT NULL CHECK (contract_type IN ('call', 'put')),
    strike_price DECIMAL(20, 8) NOT NULL,
    expiration_date DATE NOT NULL,
    contract_size DECIMAL(20, 8) NOT NULL,
    premium DECIMAL(20, 8) NOT NULL,
    intrinsic_value DECIMAL(20, 8) NOT NULL DEFAULT 0,
    time_value DECIMAL(20, 8) NOT NULL DEFAULT 0,
    volume INTEGER DEFAULT 0,
    open_interest INTEGER DEFAULT 0,
    bid_price DECIMAL(20, 8),
    ask_price DECIMAL(20, 8),
    last_price DECIMAL(20, 8),
    delta DECIMAL(10, 6),
    gamma DECIMAL(10, 8),
    theta DECIMAL(10, 4),
    vega DECIMAL(10, 4),
    rho DECIMAL(10, 4),
    implied_volatility DECIMAL(8, 6),
    days_to_expiration INTEGER,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Futures Contracts Table
CREATE TABLE IF NOT EXISTS futures_contracts (
    id SERIAL PRIMARY KEY,
    contract_symbol VARCHAR(50) NOT NULL UNIQUE,
    underlying_asset VARCHAR(20) NOT NULL,
    contract_type VARCHAR(20) NOT NULL CHECK (contract_type IN ('futures', 'perpetual')),
    contract_size DECIMAL(20, 8) NOT NULL,
    expiration_date DATE,
    settlement_type VARCHAR(20) NOT NULL CHECK (settlement_type IN ('physical', 'cash')),
    margin_requirement DECIMAL(8, 6) NOT NULL,
    maintenance_margin DECIMAL(8, 6) NOT NULL,
    initial_margin DECIMAL(20, 8) NOT NULL,
    current_price DECIMAL(20, 8) NOT NULL,
    volume INTEGER DEFAULT 0,
    open_interest INTEGER DEFAULT 0,
    funding_rate DECIMAL(10, 8),
    next_funding_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Swaps Contracts Table
CREATE TABLE IF NOT EXISTS swaps_contracts (
    id SERIAL PRIMARY KEY,
    contract_symbol VARCHAR(50) NOT NULL UNIQUE,
    contract_type VARCHAR(30) NOT NULL CHECK (contract_type IN ('interest_rate_swap', 'currency_swap', 'credit_default_swap')),
    notional_amount DECIMAL(20, 8) NOT NULL,
    fixed_rate DECIMAL(10, 8),
    floating_rate VARCHAR(50),
    tenor VARCHAR(10) NOT NULL,
    payment_frequency VARCHAR(20) NOT NULL,
    day_count_convention VARCHAR(20),
    effective_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    current_value DECIMAL(20, 8) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'matured')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pricing Models Table
CREATE TABLE IF NOT EXISTS pricing_models (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(50) NOT NULL UNIQUE,
    model_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    parameters TEXT[] NOT NULL,
    formula TEXT,
    assumptions TEXT[] NOT NULL,
    accuracy_level VARCHAR(20) NOT NULL,
    limitations TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Volatility Models Table
CREATE TABLE IF NOT EXISTS volatility_models (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(50) NOT NULL UNIQUE,
    model_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    calculation_method TEXT NOT NULL,
    timeframes TEXT[] NOT NULL,
    advantages TEXT[] NOT NULL,
    disadvantages TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Options Strategies Table
CREATE TABLE IF NOT EXISTS options_strategies (
    id SERIAL PRIMARY KEY,
    strategy_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    strategy_name VARCHAR(100) NOT NULL,
    strategy_type VARCHAR(50) NOT NULL,
    underlying_asset VARCHAR(20) NOT NULL,
    total_delta DECIMAL(10, 4) NOT NULL DEFAULT 0,
    total_gamma DECIMAL(10, 6) NOT NULL DEFAULT 0,
    total_theta DECIMAL(10, 4) NOT NULL DEFAULT 0,
    total_vega DECIMAL(10, 4) NOT NULL DEFAULT 0,
    total_rho DECIMAL(10, 4) NOT NULL DEFAULT 0,
    target_delta DECIMAL(10, 4),
    target_gamma DECIMAL(10, 6),
    target_theta DECIMAL(10, 4),
    target_vega DECIMAL(10, 4),
    target_rho DECIMAL(10, 4),
    max_delta_exposure DECIMAL(20, 8),
    max_gamma_exposure DECIMAL(20, 8),
    max_theta_exposure DECIMAL(20, 8),
    max_vega_exposure DECIMAL(20, 8),
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'closed')),
    unrealized_pnl DECIMAL(20, 8) DEFAULT 0,
    realized_pnl DECIMAL(20, 8) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Strategy Legs Table
CREATE TABLE IF NOT EXISTS strategy_legs (
    id SERIAL PRIMARY KEY,
    strategy_id VARCHAR(255) NOT NULL,
    leg_number INTEGER NOT NULL,
    contract_symbol VARCHAR(50) NOT NULL,
    option_type VARCHAR(10) NOT NULL CHECK (option_type IN ('call', 'put')),
    strike_price DECIMAL(20, 8) NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('buy', 'sell')),
    delta DECIMAL(10, 6),
    gamma DECIMAL(10, 8),
    theta DECIMAL(10, 4),
    vega DECIMAL(10, 4),
    rho DECIMAL(10, 4),
    FOREIGN KEY (strategy_id) REFERENCES options_strategies(strategy_id) ON DELETE CASCADE,
    FOREIGN KEY (contract_symbol) REFERENCES options_contracts(contract_symbol)
);

-- Derivatives Positions Table
CREATE TABLE IF NOT EXISTS derivatives_positions (
    id SERIAL PRIMARY KEY,
    position_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    contract_symbol VARCHAR(50) NOT NULL,
    contract_type VARCHAR(20) NOT NULL CHECK (contract_type IN ('option', 'future', 'swap')),
    position_type VARCHAR(10) NOT NULL CHECK (position_type IN ('long', 'short')),
    quantity DECIMAL(20, 8) NOT NULL,
    entry_price DECIMAL(20, 8) NOT NULL,
    current_price DECIMAL(20, 8) NOT NULL,
    unrealized_pnl DECIMAL(20, 8) NOT NULL DEFAULT 0,
    realized_pnl DECIMAL(20, 8) NOT NULL DEFAULT 0,
    margin_used DECIMAL(20, 8) NOT NULL DEFAULT 0,
    delta_exposure DECIMAL(20, 8) NOT NULL DEFAULT 0,
    gamma_exposure DECIMAL(20, 8) NOT NULL DEFAULT 0,
    theta_exposure DECIMAL(20, 8) NOT NULL DEFAULT 0,
    vega_exposure DECIMAL(20, 8) NOT NULL DEFAULT 0,
    rho_exposure DECIMAL(20, 8) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL CHECK (status IN ('open', 'closed', 'expired')),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Derivatives Trades Table
CREATE TABLE IF NOT EXISTS derivatives_trades (
    id SERIAL PRIMARY KEY,
    trade_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    contract_symbol VARCHAR(50) NOT NULL,
    trade_type VARCHAR(10) NOT NULL CHECK (trade_type IN ('buy', 'sell')),
    quantity DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('market', 'limit', 'stop')),
    strategy_id VARCHAR(255),
    margin_requirement DECIMAL(20, 8) NOT NULL,
    fees DECIMAL(20, 8) NOT NULL DEFAULT 0,
    counterparty VARCHAR(100),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'filled', 'cancelled', 'rejected')),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (strategy_id) REFERENCES options_strategies(strategy_id)
);

-- Portfolio Risk Metrics Table
CREATE TABLE IF NOT EXISTS portfolio_risk_metrics (
    id SERIAL PRIMARY KEY,
    portfolio_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    calculation_date DATE NOT NULL,
    total_delta DECIMAL(20, 8) NOT NULL DEFAULT 0,
    total_gamma DECIMAL(20, 8) NOT NULL DEFAULT 0,
    total_theta DECIMAL(20, 8) NOT NULL DEFAULT 0,
    total_vega DECIMAL(20, 8) NOT NULL DEFAULT 0,
    total_rho DECIMAL(20, 8) NOT NULL DEFAULT 0,
    portfolio_value DECIMAL(20, 8) NOT NULL DEFAULT 0,
    margin_requirement DECIMAL(20, 8) NOT NULL DEFAULT 0,
    var_95 DECIMAL(20, 8) NOT NULL DEFAULT 0,
    expected_shortfall DECIMAL(20, 8) NOT NULL DEFAULT 0,
    max_drawdown DECIMAL(8, 6) NOT NULL DEFAULT 0,
    sharpe_ratio DECIMAL(8, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(portfolio_id, calculation_date)
);

-- Greeks History Table
CREATE TABLE IF NOT EXISTS greeks_history (
    id SERIAL PRIMARY KEY,
    contract_symbol VARCHAR(50) NOT NULL,
    calculation_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    underlying_price DECIMAL(20, 8) NOT NULL,
    option_price DECIMAL(20, 8) NOT NULL,
    delta DECIMAL(10, 6) NOT NULL,
    gamma DECIMAL(10, 8) NOT NULL,
    theta DECIMAL(10, 4) NOT NULL,
    vega DECIMAL(10, 4) NOT NULL,
    rho DECIMAL(10, 4) NOT NULL,
    implied_volatility DECIMAL(8, 6) NOT NULL,
    time_to_expiry DECIMAL(10, 6) NOT NULL,
    FOREIGN KEY (contract_symbol) REFERENCES options_contracts(contract_symbol)
);

-- Volatility Surface Table
CREATE TABLE IF NOT EXISTS volatility_surface (
    id SERIAL PRIMARY KEY,
    underlying_asset VARCHAR(20) NOT NULL,
    calculation_date DATE NOT NULL,
    strike_price DECIMAL(20, 8) NOT NULL,
    time_to_expiry DECIMAL(10, 6) NOT NULL,
    implied_volatility DECIMAL(8, 6) NOT NULL,
    historical_volatility DECIMAL(8, 6),
    realized_volatility DECIMAL(8, 6),
    volume_weighted_volatility DECIMAL(8, 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(underlying_asset, calculation_date, strike_price, time_to_expiry)
);

-- Risk Limits Table
CREATE TABLE IF NOT EXISTS risk_limits (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    max_daily_loss DECIMAL(20, 8) NOT NULL,
    max_position_exposure DECIMAL(20, 8) NOT NULL,
    max_leverage_ratio DECIMAL(5, 2) NOT NULL,
    max_delta_exposure DECIMAL(20, 8) NOT NULL,
    max_gamma_exposure DECIMAL(20, 8) NOT NULL,
    max_theta_exposure DECIMAL(20, 8) NOT NULL,
    max_vega_exposure DECIMAL(20, 8) NOT NULL,
    max_rho_exposure DECIMAL(20, 8) NOT NULL,
    correlation_limit DECIMAL(5, 4) NOT NULL,
    volatility_threshold DECIMAL(8, 6) NOT NULL,
    liquidity_threshold DECIMAL(20, 8) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Derivatives Audit Trail Table
CREATE TABLE IF NOT EXISTS derivatives_audit_trail (
    id SERIAL PRIMARY KEY,
    audit_id VARCHAR(255) NOT NULL UNIQUE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_options_contracts_underlying ON options_contracts(underlying_asset);
CREATE INDEX IF NOT EXISTS idx_options_contracts_expiration ON options_contracts(expiration_date);
CREATE INDEX IF NOT EXISTS idx_options_contracts_type_strike ON options_contracts(contract_type, strike_price);
CREATE INDEX IF NOT EXISTS idx_options_contracts_status ON options_contracts(status);

CREATE INDEX IF NOT EXISTS idx_futures_contracts_underlying ON futures_contracts(underlying_asset);
CREATE INDEX IF NOT EXISTS idx_futures_contracts_type ON futures_contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_futures_contracts_expiration ON futures_contracts(expiration_date);

CREATE INDEX IF NOT EXISTS idx_swaps_contracts_type ON swaps_contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_swaps_contracts_maturity ON swaps_contracts(maturity_date);

CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON options_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_type ON options_strategies(strategy_type);
CREATE INDEX IF NOT EXISTS idx_strategies_status ON options_strategies(status);

CREATE INDEX IF NOT EXISTS idx_strategy_legs_strategy_id ON strategy_legs(strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_legs_contract ON strategy_legs(contract_symbol);

CREATE INDEX IF NOT EXISTS idx_positions_user_id ON derivatives_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_contract ON derivatives_positions(contract_symbol);
CREATE INDEX IF NOT EXISTS idx_positions_status ON derivatives_positions(status);

CREATE INDEX IF NOT EXISTS idx_trades_user_id ON derivatives_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_contract ON derivatives_trades(contract_symbol);
CREATE INDEX IF NOT EXISTS idx_trades_executed_at ON derivatives_trades(executed_at);

CREATE INDEX IF NOT EXISTS idx_risk_metrics_portfolio_date ON portfolio_risk_metrics(portfolio_id, calculation_date);
CREATE INDEX IF NOT EXISTS idx_risk_metrics_user_id ON portfolio_risk_metrics(user_id);

CREATE INDEX IF NOT EXISTS idx_greeks_history_contract_time ON greeks_history(contract_symbol, calculation_time);
CREATE INDEX IF NOT EXISTS idx_greeks_history_time ON greeks_history(calculation_time);

CREATE INDEX IF NOT EXISTS idx_volatility_surface_asset_date ON volatility_surface(underlying_asset, calculation_date);
CREATE INDEX IF NOT EXISTS idx_volatility_surface_strike_expiry ON volatility_surface(strike_price, time_to_expiry);

CREATE INDEX IF NOT EXISTS idx_risk_limits_user_id ON risk_limits(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON derivatives_audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON derivatives_audit_trail(timestamp);

-- Create Views for Analytics
CREATE OR REPLACE VIEW derivatives_portfolio_summary AS
SELECT 
    user_id,
    COUNT(*) as total_positions,
    SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_positions,
    SUM(unrealized_pnl) as total_unrealized_pnl,
    SUM(realized_pnl) as total_realized_pnl,
    SUM(margin_used) as total_margin_used,
    SUM(delta_exposure) as total_delta_exposure,
    SUM(gamma_exposure) as total_gamma_exposure,
    SUM(theta_exposure) as total_theta_exposure,
    SUM(vega_exposure) as total_vega_exposure
FROM derivatives_positions
GROUP BY user_id;

CREATE OR REPLACE VIEW options_strategy_performance AS
SELECT 
    s.strategy_id,
    s.user_id,
    s.strategy_name,
    s.strategy_type,
    s.unrealized_pnl,
    s.realized_pnl,
    s.total_delta,
    s.total_gamma,
    s.total_theta,
    s.total_vega,
    COUNT(l.id) as total_legs,
    s.created_at,
    s.updated_at
FROM options_strategies s
LEFT JOIN strategy_legs l ON s.strategy_id = l.strategy_id
GROUP BY s.strategy_id, s.user_id, s.strategy_name, s.strategy_type, s.unrealized_pnl, s.realized_pnl, s.total_delta, s.total_gamma, s.total_theta, s.total_vega, s.created_at, s.updated_at;

CREATE OR REPLACE VIEW daily_greeks_summary AS
SELECT 
    DATE(calculation_time) as date,
    contract_symbol,
    AVG(delta) as avg_delta,
    AVG(gamma) as avg_gamma,
    AVG(theta) as avg_theta,
    AVG(vega) as avg_vega,
    AVG(rho) as avg_rho,
    AVG(implied_volatility) as avg_implied_volatility
FROM greeks_history
GROUP BY DATE(calculation_time), contract_symbol
ORDER BY date DESC;

CREATE OR REPLACE VIEW volatility_surface_summary AS
SELECT 
    underlying_asset,
    calculation_date,
    COUNT(*) as total_points,
    AVG(implied_volatility) as avg_implied_volatility,
    MIN(implied_volatility) as min_implied_volatility,
    MAX(implied_volatility) as max_implied_volatility,
    STDDEV(implied_volatility) as vol_std_deviation
FROM volatility_surface
GROUP BY underlying_asset, calculation_date
ORDER BY calculation_date DESC;

-- Create Triggers for Audit Logging
CREATE OR REPLACE FUNCTION derivatives_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO derivatives_audit_trail (audit_id, entity_type, entity_id, action, new_values, user_id)
        VALUES (
            'audit_' || NEW.id || '_' || EXTRACT(EPOCH FROM NOW()),
            TG_TABLE_NAME,
            NEW.id::TEXT,
            'INSERT',
            row_to_json(NEW),
            COALESCE(NEW.user_id, 'system')
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO derivatives_audit_trail (audit_id, entity_type, entity_id, action, old_values, new_values, user_id)
        VALUES (
            'audit_' || NEW.id || '_' || EXTRACT(EPOCH FROM NOW()),
            TG_TABLE_NAME,
            NEW.id::TEXT,
            'UPDATE',
            row_to_json(OLD),
            row_to_json(NEW),
            COALESCE(NEW.user_id, 'system')
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO derivatives_audit_trail (audit_id, entity_type, entity_id, action, old_values, user_id)
        VALUES (
            'audit_' || OLD.id || '_' || EXTRACT(EPOCH FROM NOW()),
            TG_TABLE_NAME,
            OLD.id::TEXT,
            'DELETE',
            row_to_json(OLD),
            COALESCE(OLD.user_id, 'system')
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers
CREATE TRIGGER options_contracts_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON options_contracts
    FOR EACH ROW EXECUTE FUNCTION derivatives_audit_trigger();

CREATE TRIGGER futures_contracts_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON futures_contracts
    FOR EACH ROW EXECUTE FUNCTION derivatives_audit_trigger();

CREATE TRIGGER swaps_contracts_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON swaps_contracts
    FOR EACH ROW EXECUTE FUNCTION derivatives_audit_trigger();

CREATE TRIGGER options_strategies_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON options_strategies
    FOR EACH ROW EXECUTE FUNCTION derivatives_audit_trigger();

CREATE TRIGGER derivatives_positions_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON derivatives_positions
    FOR EACH ROW EXECUTE FUNCTION derivatives_audit_trigger();

CREATE TRIGGER derivatives_trades_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON derivatives_trades
    FOR EACH ROW EXECUTE FUNCTION derivatives_audit_trigger();

-- Insert Sample Data
-- Pricing Models
INSERT INTO pricing_models (model_id, model_name, description, parameters, formula, assumptions, accuracy_level, limitations)
VALUES 
    ('black_scholes', 'Black-Scholes Model', 'Standard options pricing model for European options', ARRAY['spot_price', 'strike_price', 'time_to_expiry', 'risk_free_rate', 'volatility'], 'C = S*N(d1) - K*e^(-r*T)*N(d2)', ARRAY['lognormal_price_distribution', 'constant_volatility', 'no_dividends', 'european_exercise'], 'high_for_vanilla_options', ARRAY['constant_volatility', 'no_jumps', 'european_only']),
    ('binomial_tree', 'Binomial Tree Model', 'Discrete-time model for American and exotic options', ARRAY['spot_price', 'strike_price', 'time_to_expiry', 'risk_free_rate', 'volatility', 'time_steps'], 'Recursive calculation through binomial lattice', ARRAY['discrete_time', 'recombining_tree', 'risk_neutral_probability'], 'high_for_american_options', ARRAY['computational_intensive', 'discrete_time']),
    ('monte_carlo', 'Monte Carlo Simulation', 'Numerical method for complex derivatives pricing', ARRAY['spot_price', 'strike_price', 'time_to_expiry', 'risk_free_rate', 'volatility', 'simulations'], 'Statistical simulation of price paths', ARRAY['risk_neutral_measure', 'independent_random_variables'], 'high_for_complex_payoffs', ARRAY['computational_intensive', 'statistical_error']),
    ('heston_model', 'Heston Stochastic Volatility Model', 'Model with stochastic volatility for better volatility smile fitting', ARRAY['spot_price', 'strike_price', 'time_to_expiry', 'risk_free_rate', 'initial_volatility', 'long_term_volatility', 'mean_reversion', 'volatility_of_volatility', 'correlation'], 'Complex stochastic differential equations', ARRAY['stochastic_volatility', 'mean_reverting_volatility'], 'high_for_volatility_smile', ARRAY['complex_calibration', 'computational_intensive'])
ON CONFLICT (model_id) DO NOTHING;

-- Volatility Models
INSERT INTO volatility_models (model_id, model_name, description, calculation_method, timeframes, advantages, disadvantages)
VALUES 
    ('historical_volatility', 'Historical Volatility', 'Volatility calculated from historical price data', 'Standard deviation of logarithmic returns', ARRAY['1D', '7D', '30D', '90D', '1Y'], ARRAY['simple', 'data_driven', 'backtestable'], ARRAY['backward_looking', 'lagging_indicator']),
    ('implied_volatility', 'Implied Volatility', 'Volatility implied by current option prices', 'Inverse pricing model calculation', ARRAY['1D', '7D', '30D', '90D', '1Y'], ARRAY['forward_looking', 'market_expectations'], ARRAY['model_dependent', 'bid_ask_spread']),
    ('garch', 'GARCH Volatility Model', 'Generalized Autoregressive Conditional Heteroskedasticity', 'Time-varying volatility model', ARRAY['1D', '7D', '30D'], ARRAY['time_varying', 'volatility_clustering'], ARRAY['complex_calibration', 'parameter_stability']),
    ('realized_volatility', 'Realized Volatility', 'Volatility calculated from intraday price movements', 'Sum of squared returns over time period', ARRAY['1D', '7D', '30D'], ARRAY['high_frequency_data', 'accurate_measure'], ARRAY['microstructure_noise', 'data_intensive'])
ON CONFLICT (model_id) DO NOTHING;

-- Sample Options Contracts
INSERT INTO options_contracts (contract_symbol, underlying_asset, contract_type, strike_price, expiration_date, contract_size, premium, intrinsic_value, time_value, volume, open_interest, bid_price, ask_price, last_price, delta, gamma, theta, vega, rho, implied_volatility, days_to_expiration, status)
VALUES 
    ('BTC_CALL_45000_20240329', 'BTC', 'call', 45000.00000000, '2024-03-29', 0.10000000, 2500.00000000, 0.00000000, 2500.00000000, 1250, 8500, 2400.00000000, 2600.00000000, 2500.00000000, 0.650000, 0.00010000, -15.5000, 125.7500, 8.2500, 0.450000, 45, 'active'),
    ('BTC_PUT_44000_20240329', 'BTC', 'put', 44000.00000000, '2024-03-29', 0.10000000, 1800.00000000, 0.00000000, 1800.00000000, 980, 6200, 1750.00000000, 1850.00000000, 1800.00000000, -0.350000, 0.00010000, -12.2500, 110.5000, -5.7500, 0.420000, 45, 'active'),
    ('ETH_CALL_3000_20240426', 'ETH', 'call', 3000.00000000, '2024-04-26', 1.00000000, 180.00000000, 0.00000000, 180.00000000, 2100, 15000, 175.00000000, 185.00000000, 180.00000000, 0.550000, 0.00020000, -8.5000, 45.2500, 3.7500, 0.550000, 73, 'active')
ON CONFLICT (contract_symbol) DO NOTHING;

-- Sample Futures Contracts
INSERT INTO futures_contracts (contract_symbol, underlying_asset, contract_type, contract_size, expiration_date, settlement_type, margin_requirement, maintenance_margin, initial_margin, current_price, volume, open_interest, funding_rate, next_funding_time, status)
VALUES 
    ('BTC_FUTURES_20240329', 'BTC', 'futures', 0.10000000, '2024-03-29', 'physical', 0.050000, 0.030000, 2250.00000000, 45000.00000000, 25000, 150000, 0.00010000, NOW() + INTERVAL '8 hours', 'active'),
    ('ETH_FUTURES_20240426', 'ETH', 'futures', 1.00000000, '2024-04-26', 'physical', 0.080000, 0.050000, 240.00000000, 3000.00000000, 45000, 300000, 0.00020000, NOW() + INTERVAL '8 hours', 'active'),
    ('PERP_BTC_USDT', 'BTC', 'perpetual', 0.00100000, NULL, 'cash', 0.010000, 0.005000, 45.00000000, 45000.00000000, 100000, 500000, 0.00010000, NOW() + INTERVAL '8 hours', 'active')
ON CONFLICT (contract_symbol) DO NOTHING;

-- Sample Swaps Contracts
INSERT INTO swaps_contracts (contract_symbol, contract_type, notional_amount, fixed_rate, floating_rate, tenor, payment_frequency, day_count_convention, effective_date, maturity_date, current_value, status)
VALUES 
    ('IRS_USD_2Y', 'interest_rate_swap', 1000000.00000000, 0.04500000, 'SOFR', '2Y', 'quarterly', 'ACT/360', '2024-01-01', '2026-01-01', 12500.00000000, 'active'),
    ('CCS_BTC_ETH', 'currency_swap', 10.00000000, NULL, NULL, '1Y', 'monthly', 'ACT/365', '2024-01-01', '2025-01-01', 850.00000000, 'active'),
    ('CDS_TECH_BOND', 'credit_default_swap', 10000000.00000000, 0.02500000, NULL, '3Y', 'quarterly', 'ACT/360', '2024-01-01', '2027-01-01', -125000.00000000, 'active')
ON CONFLICT (contract_symbol) DO NOTHING;

-- Create Functions for Derivatives Operations
CREATE OR REPLACE FUNCTION calculate_option_price_bs(
    p_spot_price DECIMAL,
    p_strike_price DECIMAL,
    p_time_to_expiry DECIMAL,
    p_risk_free_rate DECIMAL,
    p_volatility DECIMAL,
    p_option_type VARCHAR
)
RETURNS TABLE (
    option_price DECIMAL,
    delta DECIMAL,
    gamma DECIMAL,
    theta DECIMAL,
    vega DECIMAL,
    rho DECIMAL
) AS $$
DECLARE
    d1 DECIMAL;
    d2 DECIMAL;
    nd1 DECIMAL;
    nd2 DECIMAL;
    n_d1 DECIMAL;
    n_d2 DECIMAL;
    call_price DECIMAL;
    put_price DECIMAL;
    option_price_calc DECIMAL;
    delta_calc DECIMAL;
    gamma_calc DECIMAL;
    theta_calc DECIMAL;
    vega_calc DECIMAL;
    rho_calc DECIMAL;
BEGIN
    -- Calculate d1 and d2
    d1 := (LN(p_spot_price / p_strike_price) + (p_risk_free_rate + 0.5 * p_volatility * p_volatility) * p_time_to_expiry) / (p_volatility * SQRT(p_time_to_expiry));
    d2 := d1 - p_volatility * SQRT(p_time_to_expiry);
    
    -- Normal CDF approximations (simplified)
    nd1 := 0.5 * (1 + ERF(d1 / SQRT(2)));
    nd2 := 0.5 * (1 + ERF(d2 / SQRT(2)));
    n_d1 := 0.5 * (1 + ERF(-d1 / SQRT(2)));
    n_d2 := 0.5 * (1 + ERF(-d2 / SQRT(2)));
    
    -- Calculate option prices
    call_price := p_spot_price * nd1 - p_strike_price * EXP(-p_risk_free_rate * p_time_to_expiry) * nd2;
    put_price := p_strike_price * EXP(-p_risk_free_rate * p_time_to_expiry) * n_d2 - p_spot_price * n_d1;
    
    -- Select appropriate price
    IF p_option_type = 'call' THEN
        option_price_calc := call_price;
        delta_calc := nd1;
        rho_calc := p_strike_price * p_time_to_expiry * EXP(-p_risk_free_rate * p_time_to_expiry) * nd2;
    ELSE
        option_price_calc := put_price;
        delta_calc := nd1 - 1;
        rho_calc := -p_strike_price * p_time_to_expiry * EXP(-p_risk_free_rate * p_time_to_expiry) * n_d2;
    END IF;
    
    -- Calculate other Greeks
    gamma_calc := EXP(-0.5 * d1 * d1) / (p_spot_price * p_volatility * SQRT(2 * PI() * p_time_to_expiry));
    theta_calc := -p_spot_price * EXP(-0.5 * d1 * d1) * p_volatility / (2 * SQRT(2 * PI() * p_time_to_expiry)) - p_risk_free_rate * p_strike_price * EXP(-p_risk_free_rate * p_time_to_expiry) * nd2;
    vega_calc := p_spot_price * SQRT(p_time_to_expiry) * EXP(-0.5 * d1 * d1) / SQRT(2 * PI());
    
    RETURN QUERY SELECT option_price_calc, delta_calc, gamma_calc, theta_calc, vega_calc, rho_calc;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_portfolio_greeks(
    p_user_id VARCHAR,
    p_calculation_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_delta DECIMAL,
    total_gamma DECIMAL,
    total_theta DECIMAL,
    total_vega DECIMAL,
    total_rho DECIMAL,
    portfolio_value DECIMAL,
    margin_requirement DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(p.delta_exposure), 0) as total_delta,
        COALESCE(SUM(p.gamma_exposure), 0) as total_gamma,
        COALESCE(SUM(p.theta_exposure), 0) as total_theta,
        COALESCE(SUM(p.vega_exposure), 0) as total_vega,
        COALESCE(SUM(p.rho_exposure), 0) as total_rho,
        COALESCE(SUM(p.current_price * p.quantity), 0) as portfolio_value,
        COALESCE(SUM(p.margin_used), 0) as margin_requirement
    FROM derivatives_positions p
    WHERE p.user_id = p_user_id
    AND p.status = 'open';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_var_portfolio(
    p_user_id VARCHAR,
    p_confidence_level DECIMAL DEFAULT 0.95,
    p_time_horizon INTEGER DEFAULT 1
)
RETURNS TABLE (
    var_amount DECIMAL,
    expected_shortfall DECIMAL,
    confidence_level DECIMAL
) AS $$
DECLARE
    portfolio_value DECIMAL;
    volatility_estimate DECIMAL;
    var_calc DECIMAL;
    es_calc DECIMAL;
BEGIN
    -- Get portfolio value
    SELECT COALESCE(SUM(current_price * quantity), 0) INTO portfolio_value
    FROM derivatives_positions
    WHERE user_id = p_user_id AND status = 'open';
    
    -- Simplified volatility estimate (in practice, use more sophisticated methods)
    volatility_estimate := 0.20; -- 20% daily volatility
    
    -- Calculate VaR (simplified normal distribution)
    var_calc := portfolio_value * volatility_estimate * SQRT(p_time_horizon) * 
                (1 + ERF(2 * p_confidence_level - 1) * SQRT(2)) / 2;
    
    -- Calculate Expected Shortfall (simplified)
    es_calc := var_calc * 1.3; -- Rough approximation
    
    RETURN QUERY SELECT var_calc, es_calc, p_confidence_level;
END;
$$ LANGUAGE plpgsql;

-- Grant Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON options_contracts TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON futures_contracts TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON swaps_contracts TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON pricing_models TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON volatility_models TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON options_strategies TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON strategy_legs TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON derivatives_positions TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON derivatives_trades TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON portfolio_risk_metrics TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greeks_history TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON volatility_surface TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON risk_limits TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON derivatives_audit_trail TO finnexusai_user;

GRANT SELECT ON derivatives_portfolio_summary TO finnexusai_user;
GRANT SELECT ON options_strategy_performance TO finnexusai_user;
GRANT SELECT ON daily_greeks_summary TO finnexusai_user;
GRANT SELECT ON volatility_surface_summary TO finnexusai_user;

GRANT EXECUTE ON FUNCTION calculate_option_price_bs(DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, VARCHAR) TO finnexusai_user;
GRANT EXECUTE ON FUNCTION get_portfolio_greeks(VARCHAR, DATE) TO finnexusai_user;
GRANT EXECUTE ON FUNCTION calculate_var_portfolio(VARCHAR, DECIMAL, INTEGER) TO finnexusai_user;

-- Create Comments
COMMENT ON TABLE options_contracts IS 'Options contracts with pricing and Greeks data';
COMMENT ON TABLE futures_contracts IS 'Futures contracts with margin and funding data';
COMMENT ON TABLE swaps_contracts IS 'Interest rate, currency, and credit default swaps';
COMMENT ON TABLE pricing_models IS 'Options pricing models and their parameters';
COMMENT ON TABLE volatility_models IS 'Volatility calculation models and methods';
COMMENT ON TABLE options_strategies IS 'Options trading strategies with Greeks targets';
COMMENT ON TABLE strategy_legs IS 'Individual legs of options strategies';
COMMENT ON TABLE derivatives_positions IS 'Derivatives positions with risk exposures';
COMMENT ON TABLE derivatives_trades IS 'Derivatives trade execution records';
COMMENT ON TABLE portfolio_risk_metrics IS 'Portfolio-level risk metrics and analytics';
COMMENT ON TABLE greeks_history IS 'Historical Greeks data for options contracts';
COMMENT ON TABLE volatility_surface IS 'Volatility surface data for options pricing';
COMMENT ON TABLE risk_limits IS 'Risk limits and constraints for derivatives trading';
COMMENT ON TABLE derivatives_audit_trail IS 'Audit trail for derivatives operations';

COMMENT ON VIEW derivatives_portfolio_summary IS 'Summary of derivatives portfolio positions and exposures';
COMMENT ON VIEW options_strategy_performance IS 'Performance metrics for options strategies';
COMMENT ON VIEW daily_greeks_summary IS 'Daily summary of options Greeks data';
COMMENT ON VIEW volatility_surface_summary IS 'Summary statistics for volatility surface data';

-- Migration Complete
INSERT INTO migration_history (version, description, applied_at) 
VALUES ('008', 'Options and Derivatives Trading Tables', NOW());

