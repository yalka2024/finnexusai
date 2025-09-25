-- Migration: High-Frequency Trading (HFT) Tables
-- Description: Creates tables for HFT order management, execution tracking, and performance monitoring
-- Version: 005
-- Date: 2024-01-15

-- HFT Orders Table
CREATE TABLE IF NOT EXISTS hft_orders (
    id VARCHAR(255) PRIMARY KEY,
    client_id VARCHAR(255) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    quantity DECIMAL(20, 8) NOT NULL CHECK (quantity > 0),
    price DECIMAL(20, 8),
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('market', 'limit', 'stop', 'iceberg', 'twap', 'vwap')),
    time_in_force VARCHAR(10) NOT NULL CHECK (time_in_force IN ('IOC', 'FOK', 'GTC')),
    iceberg BOOLEAN DEFAULT FALSE,
    display_size DECIMAL(20, 8) DEFAULT 0,
    hidden_size DECIMAL(20, 8) DEFAULT 0,
    co_location_server VARCHAR(100),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'filled', 'partially_filled', 'cancelled', 'rejected')),
    remaining_quantity DECIMAL(20, 8) DEFAULT 0,
    filled_quantity DECIMAL(20, 8) DEFAULT 0,
    average_fill_price DECIMAL(20, 8),
    total_fill_value DECIMAL(20, 8),
    execution_time_ms DECIMAL(10, 3),
    risk_check_passed BOOLEAN DEFAULT FALSE,
    risk_check_latency_ms DECIMAL(10, 3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    filled_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- HFT Fills Table
CREATE TABLE IF NOT EXISTS hft_fills (
    id VARCHAR(255) PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    match_order_id VARCHAR(255),
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    quantity DECIMAL(20, 8) NOT NULL CHECK (quantity > 0),
    price DECIMAL(20, 8) NOT NULL CHECK (price > 0),
    fill_value DECIMAL(20, 8) NOT NULL,
    co_location_server VARCHAR(100),
    execution_latency_ms DECIMAL(10, 3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES hft_orders(id) ON DELETE CASCADE
);

-- HFT Co-location Servers Table
CREATE TABLE IF NOT EXISTS hft_co_location_servers (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(100) NOT NULL,
    latency_ms DECIMAL(10, 3) NOT NULL,
    exchanges TEXT[] NOT NULL,
    capacity_orders_per_second INTEGER NOT NULL,
    features TEXT[] NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HFT Market Data Feeds Table
CREATE TABLE IF NOT EXISTS hft_market_data_feeds (
    id VARCHAR(100) PRIMARY KEY,
    exchange VARCHAR(100) NOT NULL,
    protocol VARCHAR(20) NOT NULL,
    latency_ms DECIMAL(10, 3) NOT NULL,
    throughput_updates_per_second INTEGER NOT NULL,
    compression VARCHAR(20),
    multicast BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HFT Performance Metrics Table
CREATE TABLE IF NOT EXISTS hft_performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    value DECIMAL(15, 6) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    co_location_server VARCHAR(100),
    additional_data JSONB
);

-- HFT Risk Controls Table
CREATE TABLE IF NOT EXISTS hft_risk_controls (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(255) NOT NULL,
    control_type VARCHAR(50) NOT NULL,
    symbol VARCHAR(50),
    limit_value DECIMAL(20, 8) NOT NULL,
    current_value DECIMAL(20, 8) DEFAULT 0,
    threshold_percentage DECIMAL(5, 2) DEFAULT 80.00,
    enforcement_action VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'breached')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HFT Memory Pool Status Table
CREATE TABLE IF NOT EXISTS hft_memory_pool_status (
    id SERIAL PRIMARY KEY,
    pool_name VARCHAR(100) NOT NULL,
    total_size_bytes BIGINT NOT NULL,
    used_size_bytes BIGINT DEFAULT 0,
    element_size_bytes INTEGER NOT NULL,
    total_elements INTEGER NOT NULL,
    used_elements INTEGER DEFAULT 0,
    utilization_percentage DECIMAL(5, 2) DEFAULT 0.00,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HFT Lock-Free Queue Status Table
CREATE TABLE IF NOT EXISTS hft_lock_free_queue_status (
    id SERIAL PRIMARY KEY,
    queue_name VARCHAR(100) NOT NULL,
    queue_type VARCHAR(50) NOT NULL,
    capacity INTEGER NOT NULL,
    current_size INTEGER DEFAULT 0,
    throughput_operations_per_second INTEGER,
    utilization_percentage DECIMAL(5, 2) DEFAULT 0.00,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HFT FPGA Status Table
CREATE TABLE IF NOT EXISTS hft_fpga_status (
    id SERIAL PRIMARY KEY,
    component_name VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    latency_ms DECIMAL(10, 3),
    throughput_operations_per_second INTEGER,
    temperature_celsius DECIMAL(5, 2),
    utilization_percentage DECIMAL(5, 2) DEFAULT 0.00,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'error', 'maintenance')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HFT Order Book Snapshot Table
CREATE TABLE IF NOT EXISTS hft_order_book_snapshots (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    price_level DECIMAL(20, 8) NOT NULL,
    total_quantity DECIMAL(20, 8) NOT NULL,
    order_count INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HFT Latency Benchmarks Table
CREATE TABLE IF NOT EXISTS hft_latency_benchmarks (
    id SERIAL PRIMARY KEY,
    operation VARCHAR(100) NOT NULL,
    latency_ms DECIMAL(10, 3) NOT NULL,
    throughput_operations_per_second INTEGER,
    description TEXT,
    components TEXT[],
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HFT Audit Log Table
CREATE TABLE IF NOT EXISTS hft_audit_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    order_id VARCHAR(255),
    client_id VARCHAR(255),
    symbol VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    latency_ms DECIMAL(10, 3),
    co_location_server VARCHAR(100),
    user_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_hft_orders_client_id ON hft_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_hft_orders_symbol ON hft_orders(symbol);
CREATE INDEX IF NOT EXISTS idx_hft_orders_status ON hft_orders(status);
CREATE INDEX IF NOT EXISTS idx_hft_orders_created_at ON hft_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_hft_orders_co_location_server ON hft_orders(co_location_server);

CREATE INDEX IF NOT EXISTS idx_hft_fills_order_id ON hft_fills(order_id);
CREATE INDEX IF NOT EXISTS idx_hft_fills_symbol ON hft_fills(symbol);
CREATE INDEX IF NOT EXISTS idx_hft_fills_created_at ON hft_fills(created_at);

CREATE INDEX IF NOT EXISTS idx_hft_performance_metrics_metric_type ON hft_performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_hft_performance_metrics_timestamp ON hft_performance_metrics(timestamp);

CREATE INDEX IF NOT EXISTS idx_hft_risk_controls_client_id ON hft_risk_controls(client_id);
CREATE INDEX IF NOT EXISTS idx_hft_risk_controls_control_type ON hft_risk_controls(control_type);
CREATE INDEX IF NOT EXISTS idx_hft_risk_controls_symbol ON hft_risk_controls(symbol);

CREATE INDEX IF NOT EXISTS idx_hft_audit_log_event_type ON hft_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_hft_audit_log_order_id ON hft_audit_log(order_id);
CREATE INDEX IF NOT EXISTS idx_hft_audit_log_client_id ON hft_audit_log(client_id);
CREATE INDEX IF NOT EXISTS idx_hft_audit_log_timestamp ON hft_audit_log(timestamp);

-- Create Views for Analytics
CREATE OR REPLACE VIEW hft_order_summary AS
SELECT 
    client_id,
    symbol,
    COUNT(*) as total_orders,
    SUM(CASE WHEN status = 'filled' THEN 1 ELSE 0 END) as filled_orders,
    SUM(CASE WHEN status = 'partially_filled' THEN 1 ELSE 0 END) as partially_filled_orders,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_orders,
    AVG(execution_time_ms) as avg_execution_time_ms,
    MIN(execution_time_ms) as min_execution_time_ms,
    MAX(execution_time_ms) as max_execution_time_ms,
    SUM(filled_quantity * average_fill_price) as total_volume
FROM hft_orders
GROUP BY client_id, symbol;

CREATE OR REPLACE VIEW hft_performance_summary AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    metric_type,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    COUNT(*) as measurement_count
FROM hft_performance_metrics
GROUP BY DATE_TRUNC('hour', timestamp), metric_type
ORDER BY hour DESC, metric_type;

CREATE OR REPLACE VIEW hft_latency_summary AS
SELECT 
    operation,
    AVG(latency_ms) as avg_latency_ms,
    MIN(latency_ms) as min_latency_ms,
    MAX(latency_ms) as max_latency_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) as p99_latency_ms,
    COUNT(*) as measurement_count
FROM hft_performance_metrics
WHERE metric_type = 'latency'
GROUP BY operation
ORDER BY avg_latency_ms;

-- Create Triggers for Audit Logging
CREATE OR REPLACE FUNCTION hft_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO hft_audit_log (event_type, order_id, client_id, symbol, action, new_value)
        VALUES ('ORDER_CREATED', NEW.id, NEW.client_id, NEW.symbol, 'INSERT', row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO hft_audit_log (event_type, order_id, client_id, symbol, action, old_value, new_value)
        VALUES ('ORDER_UPDATED', NEW.id, NEW.client_id, NEW.symbol, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO hft_audit_log (event_type, order_id, client_id, symbol, action, old_value)
        VALUES ('ORDER_DELETED', OLD.id, OLD.client_id, OLD.symbol, 'DELETE', row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hft_orders_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON hft_orders
    FOR EACH ROW EXECUTE FUNCTION hft_audit_trigger();

-- Insert Sample Co-location Servers
INSERT INTO hft_co_location_servers (id, name, location, latency_ms, exchanges, capacity_orders_per_second, features, status)
VALUES 
    ('nyse_ny4', 'NYSE NY4 Data Center', 'New York', 0.100, ARRAY['NYSE', 'NASDAQ', 'BATS'], 100000, ARRAY['direct_market_access', 'market_data_feed', 'risk_controls'], 'active'),
    ('nasdaq_carteret', 'NASDAQ Carteret Data Center', 'New Jersey', 0.150, ARRAY['NASDAQ', 'BATS', 'IEX'], 150000, ARRAY['direct_market_access', 'market_data_feed', 'risk_controls'], 'active'),
    ('lse_london', 'LSE London Data Center', 'London', 0.200, ARRAY['LSE', 'LME', 'ICE'], 80000, ARRAY['direct_market_access', 'market_data_feed', 'risk_controls'], 'active'),
    ('tse_tokyo', 'TSE Tokyo Data Center', 'Tokyo', 0.250, ARRAY['TSE', 'OSE', 'FSE'], 60000, ARRAY['direct_market_access', 'market_data_feed', 'risk_controls'], 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert Sample Market Data Feeds
INSERT INTO hft_market_data_feeds (id, exchange, protocol, latency_ms, throughput_updates_per_second, compression, multicast, status)
VALUES 
    ('nyse_udp', 'NYSE', 'UDP', 0.020, 1000000, 'lz4', true, 'active'),
    ('nasdaq_udp', 'NASDAQ', 'UDP', 0.025, 1500000, 'lz4', true, 'active'),
    ('bats_udp', 'BATS', 'UDP', 0.030, 800000, 'lz4', true, 'active'),
    ('cme_udp', 'CME', 'UDP', 0.040, 600000, 'lz4', true, 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert Sample Latency Benchmarks
INSERT INTO hft_latency_benchmarks (operation, latency_ms, throughput_operations_per_second, description, components)
VALUES 
    ('order_entry', 0.050, 1000000, 'Time from order submission to order book entry', ARRAY['validation', 'risk_check', 'order_book_insert']),
    ('order_matching', 0.030, 1000000, 'Time for order matching and fill generation', ARRAY['matching_algorithm', 'fill_calculation', 'trade_creation']),
    ('risk_check', 0.010, 5000000, 'Time for real-time risk validation', ARRAY['position_check', 'velocity_check', 'exposure_check']),
    ('market_data', 0.020, 10000000, 'Time for market data update processing', ARRAY['data_parsing', 'price_update', 'order_book_update']),
    ('total_execution', 0.110, 1000000, 'End-to-end order execution time', ARRAY['order_entry', 'matching', 'risk_check', 'market_data'])
ON CONFLICT DO NOTHING;

-- Insert Sample FPGA Status
INSERT INTO hft_fpga_status (component_name, enabled, latency_ms, throughput_operations_per_second, temperature_celsius, utilization_percentage, status)
VALUES 
    ('Order Matching', true, 0.050, 1000000, 45.2, 75.5, 'active'),
    ('Market Data Processing', true, 0.020, 10000000, 42.1, 68.3, 'active'),
    ('Risk Calculation', true, 0.010, 5000000, 38.7, 82.1, 'active'),
    ('Order Routing', true, 0.030, 2000000, 41.5, 71.8, 'active')
ON CONFLICT DO NOTHING;

-- Create Functions for HFT Operations
CREATE OR REPLACE FUNCTION get_hft_order_stats(p_client_id VARCHAR, p_symbol VARCHAR DEFAULT NULL)
RETURNS TABLE (
    total_orders BIGINT,
    filled_orders BIGINT,
    avg_execution_time_ms DECIMAL,
    total_volume DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'filled' THEN 1 ELSE 0 END) as filled_orders,
        AVG(execution_time_ms) as avg_execution_time_ms,
        SUM(filled_quantity * average_fill_price) as total_volume
    FROM hft_orders
    WHERE client_id = p_client_id
    AND (p_symbol IS NULL OR symbol = p_symbol);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_hft_performance_metrics(p_metric_type VARCHAR, p_hours INTEGER DEFAULT 24)
RETURNS TABLE (
    metric_name VARCHAR,
    avg_value DECIMAL,
    min_value DECIMAL,
    max_value DECIMAL,
    measurement_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.metric_name,
        AVG(pm.value) as avg_value,
        MIN(pm.value) as min_value,
        MAX(pm.value) as max_value,
        COUNT(*) as measurement_count
    FROM hft_performance_metrics pm
    WHERE pm.metric_type = p_metric_type
    AND pm.timestamp >= NOW() - INTERVAL '1 hour' * p_hours
    GROUP BY pm.metric_name
    ORDER BY avg_value;
END;
$$ LANGUAGE plpgsql;

-- Create Materialized Views for Performance
CREATE MATERIALIZED VIEW IF NOT EXISTS hft_hourly_performance AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    metric_type,
    metric_name,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    COUNT(*) as measurement_count
FROM hft_performance_metrics
GROUP BY DATE_TRUNC('hour', timestamp), metric_type, metric_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hft_hourly_performance_unique 
ON hft_hourly_performance (hour, metric_type, metric_name);

-- Refresh Materialized View Function
CREATE OR REPLACE FUNCTION refresh_hft_hourly_performance()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY hft_hourly_performance;
END;
$$ LANGUAGE plpgsql;

-- Grant Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON hft_orders TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON hft_fills TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON hft_co_location_servers TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON hft_market_data_feeds TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON hft_performance_metrics TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON hft_risk_controls TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON hft_memory_pool_status TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON hft_lock_free_queue_status TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON hft_fpga_status TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON hft_order_book_snapshots TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON hft_latency_benchmarks TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON hft_audit_log TO finnexusai_user;

GRANT SELECT ON hft_order_summary TO finnexusai_user;
GRANT SELECT ON hft_performance_summary TO finnexusai_user;
GRANT SELECT ON hft_latency_summary TO finnexusai_user;
GRANT SELECT ON hft_hourly_performance TO finnexusai_user;

GRANT EXECUTE ON FUNCTION get_hft_order_stats(VARCHAR, VARCHAR) TO finnexusai_user;
GRANT EXECUTE ON FUNCTION get_hft_performance_metrics(VARCHAR, INTEGER) TO finnexusai_user;
GRANT EXECUTE ON FUNCTION refresh_hft_hourly_performance() TO finnexusai_user;

-- Create Comments
COMMENT ON TABLE hft_orders IS 'High-frequency trading orders with ultra-low latency execution';
COMMENT ON TABLE hft_fills IS 'Individual fills for HFT orders';
COMMENT ON TABLE hft_co_location_servers IS 'Co-location servers for ultra-low latency trading';
COMMENT ON TABLE hft_market_data_feeds IS 'Ultra-low latency market data feeds';
COMMENT ON TABLE hft_performance_metrics IS 'Real-time performance metrics for HFT operations';
COMMENT ON TABLE hft_risk_controls IS 'Risk control limits for HFT trading';
COMMENT ON TABLE hft_memory_pool_status IS 'Memory pool utilization status';
COMMENT ON TABLE hft_lock_free_queue_status IS 'Lock-free queue performance status';
COMMENT ON TABLE hft_fpga_status IS 'FPGA acceleration component status';
COMMENT ON TABLE hft_order_book_snapshots IS 'Order book snapshots for analysis';
COMMENT ON TABLE hft_latency_benchmarks IS 'Latency benchmarks for different operations';
COMMENT ON TABLE hft_audit_log IS 'Audit log for HFT operations';

COMMENT ON VIEW hft_order_summary IS 'Summary statistics for HFT orders by client and symbol';
COMMENT ON VIEW hft_performance_summary IS 'Performance metrics summary by hour';
COMMENT ON VIEW hft_latency_summary IS 'Latency statistics summary by operation';
COMMENT ON MATERIALIZED VIEW hft_hourly_performance IS 'Materialized view for hourly performance metrics';

-- Migration Complete
INSERT INTO migration_history (version, description, applied_at) 
VALUES ('005', 'High-Frequency Trading (HFT) Tables', NOW());

