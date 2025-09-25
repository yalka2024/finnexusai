-- Migration: Cross-Exchange Arbitrage Tables
-- Description: Creates tables for cross-exchange arbitrage trading, opportunity tracking, and performance monitoring
-- Version: 007
-- Date: 2024-01-15

-- Arbitrage Exchanges Table
CREATE TABLE IF NOT EXISTS arbitrage_exchanges (
    id SERIAL PRIMARY KEY,
    exchange_id VARCHAR(50) NOT NULL UNIQUE,
    exchange_name VARCHAR(100) NOT NULL,
    exchange_type VARCHAR(20) NOT NULL CHECK (exchange_type IN ('centralized', 'decentralized')),
    region VARCHAR(50) NOT NULL,
    trading_pairs INTEGER NOT NULL,
    daily_volume DECIMAL(20, 2) NOT NULL,
    maker_fee DECIMAL(8, 6) NOT NULL,
    taker_fee DECIMAL(8, 6) NOT NULL,
    withdrawal_fee VARCHAR(50),
    supported_assets TEXT[] NOT NULL,
    public_api_url VARCHAR(255),
    websocket_url VARCHAR(255),
    private_api_url VARCHAR(255),
    latency_ms INTEGER NOT NULL,
    reliability_percentage DECIMAL(5, 2) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Arbitrage Strategies Table
CREATE TABLE IF NOT EXISTS arbitrage_strategies (
    id SERIAL PRIMARY KEY,
    strategy_id VARCHAR(50) NOT NULL UNIQUE,
    strategy_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    min_spread DECIMAL(8, 6),
    max_spread DECIMAL(8, 6),
    min_profit DECIMAL(8, 6),
    max_execution_time_ms INTEGER,
    execution_speed VARCHAR(20) NOT NULL CHECK (execution_speed IN ('ultra_fast', 'fast', 'medium', 'slow')),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    supported_exchanges TEXT[] NOT NULL,
    supported_symbols TEXT[] NOT NULL,
    profitability VARCHAR(20) NOT NULL CHECK (profitability IN ('low', 'medium', 'high')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Execution Algorithms Table
CREATE TABLE IF NOT EXISTS execution_algorithms (
    id SERIAL PRIMARY KEY,
    algorithm_id VARCHAR(50) NOT NULL UNIQUE,
    algorithm_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    parameters JSONB NOT NULL,
    use_cases TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Arbitrage Opportunities Table
CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
    id SERIAL PRIMARY KEY,
    opportunity_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    buy_exchange VARCHAR(50) NOT NULL,
    sell_exchange VARCHAR(50) NOT NULL,
    buy_price DECIMAL(20, 8) NOT NULL,
    sell_price DECIMAL(20, 8) NOT NULL,
    spread DECIMAL(20, 8) NOT NULL,
    spread_percentage DECIMAL(8, 6) NOT NULL,
    potential_profit DECIMAL(20, 8) NOT NULL,
    liquidity DECIMAL(20, 8) NOT NULL,
    strategy_used VARCHAR(50),
    risk_score DECIMAL(5, 4),
    status VARCHAR(20) NOT NULL CHECK (status IN ('detected', 'executing', 'completed', 'failed', 'expired')),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP WITH TIME ZONE,
    expired_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (buy_exchange) REFERENCES arbitrage_exchanges(exchange_id),
    FOREIGN KEY (sell_exchange) REFERENCES arbitrage_exchanges(exchange_id),
    FOREIGN KEY (strategy_used) REFERENCES arbitrage_strategies(strategy_id)
);

-- Arbitrage Executions Table
CREATE TABLE IF NOT EXISTS arbitrage_executions (
    id SERIAL PRIMARY KEY,
    execution_id VARCHAR(255) NOT NULL UNIQUE,
    opportunity_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    position_size DECIMAL(20, 8) NOT NULL,
    algorithm_used VARCHAR(50) NOT NULL,
    buy_exchange VARCHAR(50) NOT NULL,
    sell_exchange VARCHAR(50) NOT NULL,
    buy_order_id VARCHAR(255),
    sell_order_id VARCHAR(255),
    buy_price DECIMAL(20, 8),
    sell_price DECIMAL(20, 8),
    buy_fees DECIMAL(20, 8),
    sell_fees DECIMAL(20, 8),
    total_fees DECIMAL(20, 8),
    slippage DECIMAL(8, 6),
    actual_profit DECIMAL(20, 8),
    execution_time_ms INTEGER,
    status VARCHAR(20) NOT NULL CHECK (status IN ('executing', 'completed', 'failed', 'cancelled')),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (opportunity_id) REFERENCES arbitrage_opportunities(opportunity_id),
    FOREIGN KEY (buy_exchange) REFERENCES arbitrage_exchanges(exchange_id),
    FOREIGN KEY (sell_exchange) REFERENCES arbitrage_exchanges(exchange_id),
    FOREIGN KEY (algorithm_used) REFERENCES execution_algorithms(algorithm_id)
);

-- Market Data Snapshot Table
CREATE TABLE IF NOT EXISTS market_data_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_id VARCHAR(255) NOT NULL UNIQUE,
    exchange_id VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    bid_price DECIMAL(20, 8) NOT NULL,
    ask_price DECIMAL(20, 8) NOT NULL,
    volume DECIMAL(20, 8) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    latency_ms INTEGER,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive')),
    FOREIGN KEY (exchange_id) REFERENCES arbitrage_exchanges(exchange_id)
);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS arbitrage_performance_metrics (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    total_trades INTEGER DEFAULT 0,
    successful_trades INTEGER DEFAULT 0,
    failed_trades INTEGER DEFAULT 0,
    total_profit DECIMAL(20, 8) DEFAULT 0,
    total_loss DECIMAL(20, 8) DEFAULT 0,
    net_profit DECIMAL(20, 8) DEFAULT 0,
    win_rate DECIMAL(5, 4) DEFAULT 0,
    average_profit DECIMAL(20, 8) DEFAULT 0,
    average_loss DECIMAL(20, 8) DEFAULT 0,
    profit_factor DECIMAL(8, 4) DEFAULT 0,
    sharpe_ratio DECIMAL(8, 4) DEFAULT 0,
    max_drawdown DECIMAL(8, 6) DEFAULT 0,
    daily_pnl DECIMAL(20, 8) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- Risk Management Table
CREATE TABLE IF NOT EXISTS arbitrage_risk_management (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    max_daily_loss DECIMAL(20, 8) NOT NULL,
    max_position_exposure DECIMAL(20, 8) NOT NULL,
    max_leverage_ratio DECIMAL(5, 2) NOT NULL,
    correlation_limit DECIMAL(5, 4) NOT NULL,
    volatility_threshold DECIMAL(8, 6) NOT NULL,
    liquidity_threshold DECIMAL(20, 8) NOT NULL,
    min_profit_threshold DECIMAL(8, 6) NOT NULL,
    max_slippage_tolerance DECIMAL(8, 6) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Liquidity Analysis Table
CREATE TABLE IF NOT EXISTS liquidity_analysis (
    id SERIAL PRIMARY KEY,
    analysis_id VARCHAR(255) NOT NULL UNIQUE,
    exchange_id VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    min_liquidity DECIMAL(20, 8) NOT NULL,
    optimal_liquidity DECIMAL(20, 8) NOT NULL,
    max_liquidity DECIMAL(20, 8) NOT NULL,
    bid_ask_spread DECIMAL(8, 6) NOT NULL,
    order_book_depth INTEGER NOT NULL,
    market_impact DECIMAL(8, 6) NOT NULL,
    slippage DECIMAL(8, 6) NOT NULL,
    liquidity_level VARCHAR(20) NOT NULL CHECK (liquidity_level IN ('low', 'medium', 'high')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exchange_id) REFERENCES arbitrage_exchanges(exchange_id)
);

-- Profit Tracking Table
CREATE TABLE IF NOT EXISTS arbitrage_profit_tracking (
    id SERIAL PRIMARY KEY,
    tracking_id VARCHAR(255) NOT NULL UNIQUE,
    execution_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    expected_profit DECIMAL(20, 8) NOT NULL,
    actual_profit DECIMAL(20, 8) NOT NULL,
    profit_variance DECIMAL(20, 8) NOT NULL,
    profit_percentage DECIMAL(8, 6) NOT NULL,
    fees_paid DECIMAL(20, 8) NOT NULL,
    slippage_cost DECIMAL(20, 8) NOT NULL,
    net_profit DECIMAL(20, 8) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (execution_id) REFERENCES arbitrage_executions(execution_id)
);

-- Arbitrage Audit Trail Table
CREATE TABLE IF NOT EXISTS arbitrage_audit_trail (
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
CREATE INDEX IF NOT EXISTS idx_arbitrage_opportunities_symbol ON arbitrage_opportunities(symbol);
CREATE INDEX IF NOT EXISTS idx_arbitrage_opportunities_exchanges ON arbitrage_opportunities(buy_exchange, sell_exchange);
CREATE INDEX IF NOT EXISTS idx_arbitrage_opportunities_status ON arbitrage_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_arbitrage_opportunities_detected_at ON arbitrage_opportunities(detected_at);
CREATE INDEX IF NOT EXISTS idx_arbitrage_opportunities_user_id ON arbitrage_opportunities(user_id);

CREATE INDEX IF NOT EXISTS idx_arbitrage_executions_opportunity_id ON arbitrage_executions(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_arbitrage_executions_user_id ON arbitrage_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_arbitrage_executions_status ON arbitrage_executions(status);
CREATE INDEX IF NOT EXISTS idx_arbitrage_executions_start_time ON arbitrage_executions(start_time);

CREATE INDEX IF NOT EXISTS idx_market_data_snapshots_exchange_symbol ON market_data_snapshots(exchange_id, symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_snapshots_timestamp ON market_data_snapshots(timestamp);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_date ON arbitrage_performance_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_date ON arbitrage_performance_metrics(date);

CREATE INDEX IF NOT EXISTS idx_liquidity_analysis_exchange_symbol ON liquidity_analysis(exchange_id, symbol);
CREATE INDEX IF NOT EXISTS idx_liquidity_analysis_timestamp ON liquidity_analysis(timestamp);

CREATE INDEX IF NOT EXISTS idx_profit_tracking_execution_id ON arbitrage_profit_tracking(execution_id);
CREATE INDEX IF NOT EXISTS idx_profit_tracking_user_id ON arbitrage_profit_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_profit_tracking_timestamp ON arbitrage_profit_tracking(timestamp);

CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON arbitrage_audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON arbitrage_audit_trail(timestamp);

-- Create Views for Analytics
CREATE OR REPLACE VIEW arbitrage_performance_summary AS
SELECT 
    user_id,
    COUNT(*) as total_opportunities,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_executions,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_executions,
    AVG(spread_percentage) as avg_spread_percentage,
    MAX(spread_percentage) as max_spread_percentage,
    AVG(potential_profit) as avg_potential_profit,
    SUM(potential_profit) as total_potential_profit
FROM arbitrage_opportunities
GROUP BY user_id;

CREATE OR REPLACE VIEW arbitrage_execution_summary AS
SELECT 
    user_id,
    COUNT(*) as total_executions,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_executions,
    AVG(actual_profit) as avg_actual_profit,
    SUM(actual_profit) as total_actual_profit,
    AVG(execution_time_ms) as avg_execution_time,
    AVG(slippage) as avg_slippage
FROM arbitrage_executions
GROUP BY user_id;

CREATE OR REPLACE VIEW exchange_performance_analysis AS
SELECT 
    buy_exchange,
    sell_exchange,
    COUNT(*) as total_opportunities,
    AVG(spread_percentage) as avg_spread,
    AVG(potential_profit) as avg_profit,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_executions,
    (SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as success_rate
FROM arbitrage_opportunities
GROUP BY buy_exchange, sell_exchange;

CREATE OR REPLACE VIEW daily_arbitrage_stats AS
SELECT 
    DATE(detected_at) as date,
    COUNT(*) as opportunities_detected,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as opportunities_executed,
    AVG(spread_percentage) as avg_spread,
    SUM(potential_profit) as total_potential_profit,
    COUNT(DISTINCT symbol) as symbols_traded,
    COUNT(DISTINCT buy_exchange) as exchanges_used
FROM arbitrage_opportunities
GROUP BY DATE(detected_at)
ORDER BY date DESC;

-- Create Triggers for Audit Logging
CREATE OR REPLACE FUNCTION arbitrage_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO arbitrage_audit_trail (audit_id, entity_type, entity_id, action, new_values, user_id)
        VALUES (
            'audit_' || NEW.id || '_' || EXTRACT(EPOCH FROM NOW()),
            TG_TABLE_NAME,
            NEW.id::TEXT,
            'INSERT',
            row_to_json(NEW),
            NEW.user_id
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO arbitrage_audit_trail (audit_id, entity_type, entity_id, action, old_values, new_values, user_id)
        VALUES (
            'audit_' || NEW.id || '_' || EXTRACT(EPOCH FROM NOW()),
            TG_TABLE_NAME,
            NEW.id::TEXT,
            'UPDATE',
            row_to_json(OLD),
            row_to_json(NEW),
            NEW.user_id
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO arbitrage_audit_trail (audit_id, entity_type, entity_id, action, old_values, user_id)
        VALUES (
            'audit_' || OLD.id || '_' || EXTRACT(EPOCH FROM NOW()),
            TG_TABLE_NAME,
            OLD.id::TEXT,
            'DELETE',
            row_to_json(OLD),
            OLD.user_id
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers
CREATE TRIGGER arbitrage_opportunities_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON arbitrage_opportunities
    FOR EACH ROW EXECUTE FUNCTION arbitrage_audit_trigger();

CREATE TRIGGER arbitrage_executions_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON arbitrage_executions
    FOR EACH ROW EXECUTE FUNCTION arbitrage_audit_trigger();

-- Insert Sample Data
-- Arbitrage Exchanges
INSERT INTO arbitrage_exchanges (exchange_id, exchange_name, exchange_type, region, trading_pairs, daily_volume, maker_fee, taker_fee, withdrawal_fee, supported_assets, public_api_url, websocket_url, private_api_url, latency_ms, reliability_percentage, status)
VALUES 
    ('binance', 'Binance', 'centralized', 'global', 1500, 50000000000.00, 0.001000, 0.001000, 'variable', ARRAY['BTC', 'ETH', 'USDT', 'BNB', 'ADA', 'DOT', 'LINK'], 'https://api.binance.com', 'wss://stream.binance.com:9443/ws', 'https://api.binance.com', 50, 99.90, 'active'),
    ('coinbase_pro', 'Coinbase Pro', 'centralized', 'us', 200, 8000000000.00, 0.005000, 0.005000, 'variable', ARRAY['BTC', 'ETH', 'LTC', 'BCH', 'XRP', 'ADA', 'DOT'], 'https://api.exchange.coinbase.com', 'wss://ws-feed.exchange.coinbase.com', 'https://api.exchange.coinbase.com', 80, 99.80, 'active'),
    ('kraken', 'Kraken', 'centralized', 'global', 400, 12000000000.00, 0.001600, 0.002600, 'variable', ARRAY['BTC', 'ETH', 'LTC', 'BCH', 'XRP', 'ADA', 'DOT', 'LINK'], 'https://api.kraken.com', 'wss://ws.kraken.com', 'https://api.kraken.com', 70, 99.70, 'active'),
    ('uniswap_v3', 'Uniswap V3', 'decentralized', 'global', 8000, 2000000000.00, 0.003000, 0.003000, '0', ARRAY['ETH', 'USDC', 'USDT', 'WBTC', 'DAI', 'UNI'], 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', 'wss://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', 'https://api.thegraph.com', 100, 99.50, 'active'),
    ('sushiswap', 'SushiSwap', 'decentralized', 'global', 5000, 800000000.00, 0.002500, 0.002500, '0', ARRAY['ETH', 'USDC', 'USDT', 'WBTC', 'DAI', 'SUSHI'], 'https://api.thegraph.com/subgraphs/name/sushiswap/exchange', 'wss://api.thegraph.com/subgraphs/name/sushiswap/exchange', 'https://api.thegraph.com', 120, 99.30, 'active')
ON CONFLICT (exchange_id) DO NOTHING;

-- Arbitrage Strategies
INSERT INTO arbitrage_strategies (strategy_id, strategy_name, description, min_spread, max_spread, min_profit, max_execution_time_ms, execution_speed, risk_level, supported_exchanges, supported_symbols, profitability)
VALUES 
    ('cross_exchange', 'Cross-Exchange Arbitrage', 'Exploits price differences between exchanges', 0.002000, 0.010000, 0.002000, 30000, 'fast', 'medium', ARRAY['binance', 'coinbase_pro', 'kraken'], ARRAY['BTC', 'ETH', 'USDT'], 'high'),
    ('triangular', 'Triangular Arbitrage', 'Exploits price inconsistencies in triangular relationships', 0.001000, 0.005000, 0.001000, 10000, 'ultra_fast', 'low', ARRAY['binance'], ARRAY['BTC', 'ETH', 'USDT'], 'medium'),
    ('statistical', 'Statistical Arbitrage', 'Based on statistical relationships between assets', 0.001000, 0.003000, 0.001000, 60000, 'medium', 'high', ARRAY['binance', 'coinbase_pro', 'kraken'], ARRAY['BTC', 'ETH', 'ADA', 'DOT'], 'medium'),
    ('funding_rate', 'Funding Rate Arbitrage', 'Exploits funding rate differences in perpetual futures', 0.000100, 0.001000, 0.000100, 300000, 'slow', 'low', ARRAY['binance', 'coinbase_pro'], ARRAY['BTC', 'ETH'], 'low')
ON CONFLICT (strategy_id) DO NOTHING;

-- Execution Algorithms
INSERT INTO execution_algorithms (algorithm_id, algorithm_name, description, parameters, use_cases)
VALUES 
    ('twap', 'TWAP (Time-Weighted Average Price)', 'Distributes order execution over time to minimize market impact', '{"timeHorizon": 300, "sliceSize": 1000, "maxSlices": 50}', ARRAY['large_orders', 'low_liquidity', 'volatile_markets']),
    ('vwap', 'VWAP (Volume-Weighted Average Price)', 'Executes orders proportional to market volume', '{"volumeTarget": 0.1, "timeHorizon": 3600, "participationRate": 0.2}', ARRAY['benchmark_trading', 'institutional_orders', 'volume_matching']),
    ('iceberg', 'Iceberg Orders', 'Hides large orders by showing only small portions', '{"displaySize": 500, "hiddenSize": 5000, "refreshRate": 30}', ARRAY['large_orders', 'stealth_trading', 'minimize_impact']),
    ('market', 'Market Orders', 'Immediate execution at current market price', '{"maxSlippage": 0.005, "timeout": 5000, "retryAttempts": 3}', ARRAY['urgent_execution', 'small_orders', 'high_liquidity'])
ON CONFLICT (algorithm_id) DO NOTHING;

-- Create Functions for Arbitrage Operations
CREATE OR REPLACE FUNCTION get_arbitrage_opportunities(
    p_symbol VARCHAR,
    p_min_spread DECIMAL DEFAULT 0.002,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    opportunity_id VARCHAR,
    symbol VARCHAR,
    buy_exchange VARCHAR,
    sell_exchange VARCHAR,
    buy_price DECIMAL,
    sell_price DECIMAL,
    spread DECIMAL,
    spread_percentage DECIMAL,
    potential_profit DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ao.opportunity_id,
        ao.symbol,
        ao.buy_exchange,
        ao.sell_exchange,
        ao.buy_price,
        ao.sell_price,
        ao.spread,
        ao.spread_percentage,
        ao.potential_profit
    FROM arbitrage_opportunities ao
    WHERE ao.symbol = p_symbol
    AND ao.spread_percentage >= p_min_spread
    AND ao.status = 'detected'
    ORDER BY ao.spread_percentage DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_arbitrage_profit(
    p_buy_price DECIMAL,
    p_sell_price DECIMAL,
    p_position_size DECIMAL,
    p_buy_fee DECIMAL,
    p_sell_fee DECIMAL
)
RETURNS TABLE (
    gross_profit DECIMAL,
    total_fees DECIMAL,
    net_profit DECIMAL,
    profit_percentage DECIMAL
) AS $$
DECLARE
    buy_cost DECIMAL;
    sell_revenue DECIMAL;
    gross_profit_calc DECIMAL;
    total_fees_calc DECIMAL;
    net_profit_calc DECIMAL;
    profit_percentage_calc DECIMAL;
BEGIN
    buy_cost := p_position_size * p_buy_price;
    sell_revenue := p_position_size * p_sell_price;
    gross_profit_calc := sell_revenue - buy_cost;
    total_fees_calc := buy_cost * p_buy_fee + sell_revenue * p_sell_fee;
    net_profit_calc := gross_profit_calc - total_fees_calc;
    profit_percentage_calc := (net_profit_calc / buy_cost) * 100;
    
    RETURN QUERY SELECT gross_profit_calc, total_fees_calc, net_profit_calc, profit_percentage_calc;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_arbitrage_performance(
    p_user_id VARCHAR,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_executions BIGINT,
    successful_executions BIGINT,
    total_profit DECIMAL,
    avg_profit DECIMAL,
    win_rate DECIMAL,
    avg_execution_time DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_executions,
        SUM(CASE WHEN ae.status = 'completed' THEN 1 ELSE 0 END) as successful_executions,
        SUM(ae.actual_profit) as total_profit,
        AVG(ae.actual_profit) as avg_profit,
        (SUM(CASE WHEN ae.status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as win_rate,
        AVG(ae.execution_time_ms) as avg_execution_time
    FROM arbitrage_executions ae
    WHERE ae.user_id = p_user_id
    AND DATE(ae.start_time) BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Grant Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON arbitrage_exchanges TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON arbitrage_strategies TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON execution_algorithms TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON arbitrage_opportunities TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON arbitrage_executions TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON market_data_snapshots TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON arbitrage_performance_metrics TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON arbitrage_risk_management TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON liquidity_analysis TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON arbitrage_profit_tracking TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON arbitrage_audit_trail TO finnexusai_user;

GRANT SELECT ON arbitrage_performance_summary TO finnexusai_user;
GRANT SELECT ON arbitrage_execution_summary TO finnexusai_user;
GRANT SELECT ON exchange_performance_analysis TO finnexusai_user;
GRANT SELECT ON daily_arbitrage_stats TO finnexusai_user;

GRANT EXECUTE ON FUNCTION get_arbitrage_opportunities(VARCHAR, DECIMAL, INTEGER) TO finnexusai_user;
GRANT EXECUTE ON FUNCTION calculate_arbitrage_profit(DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL) TO finnexusai_user;
GRANT EXECUTE ON FUNCTION get_user_arbitrage_performance(VARCHAR, DATE, DATE) TO finnexusai_user;

-- Create Comments
COMMENT ON TABLE arbitrage_exchanges IS 'Supported exchanges for arbitrage trading';
COMMENT ON TABLE arbitrage_strategies IS 'Available arbitrage strategies and their parameters';
COMMENT ON TABLE execution_algorithms IS 'Order execution algorithms for arbitrage trading';
COMMENT ON TABLE arbitrage_opportunities IS 'Detected arbitrage opportunities';
COMMENT ON TABLE arbitrage_executions IS 'Arbitrage execution records';
COMMENT ON TABLE market_data_snapshots IS 'Market data snapshots for price analysis';
COMMENT ON TABLE arbitrage_performance_metrics IS 'Daily performance metrics for arbitrage trading';
COMMENT ON TABLE arbitrage_risk_management IS 'Risk management parameters for arbitrage trading';
COMMENT ON TABLE liquidity_analysis IS 'Liquidity analysis for arbitrage opportunities';
COMMENT ON TABLE arbitrage_profit_tracking IS 'Detailed profit tracking for arbitrage executions';
COMMENT ON TABLE arbitrage_audit_trail IS 'Audit trail for arbitrage operations';

COMMENT ON VIEW arbitrage_performance_summary IS 'Performance summary for arbitrage opportunities';
COMMENT ON VIEW arbitrage_execution_summary IS 'Execution summary for arbitrage trades';
COMMENT ON VIEW exchange_performance_analysis IS 'Exchange performance analysis for arbitrage';
COMMENT ON VIEW daily_arbitrage_stats IS 'Daily statistics for arbitrage activities';

-- Migration Complete
INSERT INTO migration_history (version, description, applied_at) 
VALUES ('007', 'Cross-Exchange Arbitrage Tables', NOW());

