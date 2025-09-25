-- Migration: Futurist Sandbox Tables
-- Description: Creates tables for 2030 market simulations, sandbox environments, and advanced trading strategy testing
-- Version: 009
-- Date: 2024-01-15

-- Simulation Environments Table
CREATE TABLE IF NOT EXISTS simulation_environments (
    id SERIAL PRIMARY KEY,
    environment_id VARCHAR(50) NOT NULL UNIQUE,
    environment_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    characteristics JSONB NOT NULL,
    technologies TEXT[] NOT NULL,
    market_participants TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Market Scenarios Table
CREATE TABLE IF NOT EXISTS market_scenarios (
    id SERIAL PRIMARY KEY,
    scenario_id VARCHAR(50) NOT NULL UNIQUE,
    scenario_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    timeframe VARCHAR(50) NOT NULL,
    key_events TEXT[] NOT NULL,
    market_impact JSONB NOT NULL,
    probability DECIMAL(5, 4) NOT NULL CHECK (probability >= 0 AND probability <= 1),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Models Table
CREATE TABLE IF NOT EXISTS ai_models (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(50) NOT NULL UNIQUE,
    model_name VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL,
    capabilities TEXT[] NOT NULL,
    accuracy DECIMAL(5, 4) NOT NULL,
    processing_speed VARCHAR(50) NOT NULL,
    training_data TEXT,
    specializations TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quantum Simulators Table
CREATE TABLE IF NOT EXISTS quantum_simulators (
    id SERIAL PRIMARY KEY,
    simulator_id VARCHAR(50) NOT NULL UNIQUE,
    simulator_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    algorithms TEXT[] NOT NULL,
    capabilities TEXT[] NOT NULL,
    qubits INTEGER NOT NULL,
    coherence_time VARCHAR(50) NOT NULL,
    error_rate DECIMAL(8, 6) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Emerging Technology Models Table
CREATE TABLE IF NOT EXISTS emerging_tech_models (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(50) NOT NULL UNIQUE,
    model_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    technologies TEXT[] NOT NULL,
    capabilities TEXT[] NOT NULL,
    adoption_rate DECIMAL(5, 4) NOT NULL,
    market_impact VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sandbox Sessions Table
CREATE TABLE IF NOT EXISTS sandbox_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    environment_id VARCHAR(50) NOT NULL,
    scenario_id VARCHAR(50) NOT NULL,
    strategy_name VARCHAR(100) NOT NULL,
    strategy_description TEXT,
    parameters JSONB,
    initial_capital DECIMAL(20, 8) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (environment_id) REFERENCES simulation_environments(environment_id),
    FOREIGN KEY (scenario_id) REFERENCES market_scenarios(scenario_id)
);

-- Simulation Results Table
CREATE TABLE IF NOT EXISTS simulation_results (
    id SERIAL PRIMARY KEY,
    result_id VARCHAR(255) NOT NULL UNIQUE,
    session_id VARCHAR(255) NOT NULL,
    simulation_type VARCHAR(20) NOT NULL CHECK (simulation_type IN ('backtest', 'forward_test', 'stress_test', 'monte_carlo')),
    total_return DECIMAL(10, 6) NOT NULL,
    annualized_return DECIMAL(10, 6) NOT NULL,
    volatility DECIMAL(10, 6) NOT NULL,
    sharpe_ratio DECIMAL(10, 6) NOT NULL,
    max_drawdown DECIMAL(10, 6) NOT NULL,
    win_rate DECIMAL(5, 4) NOT NULL,
    profit_factor DECIMAL(10, 4) NOT NULL,
    var_95 DECIMAL(10, 6),
    expected_shortfall DECIMAL(10, 6),
    final_capital DECIMAL(20, 8) NOT NULL,
    total_trades INTEGER DEFAULT 0,
    successful_trades INTEGER DEFAULT 0,
    failed_trades INTEGER DEFAULT 0,
    results_data JSONB NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sandbox_sessions(session_id)
);

-- Strategy Performance Table
CREATE TABLE IF NOT EXISTS strategy_performance (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    metric_name VARCHAR(50) NOT NULL,
    metric_value DECIMAL(20, 8) NOT NULL,
    benchmark_value DECIMAL(20, 8),
    outperformance DECIMAL(10, 6),
    calculation_date DATE NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sandbox_sessions(session_id)
);

-- Risk Metrics Table
CREATE TABLE IF NOT EXISTS risk_metrics (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    var_95 DECIMAL(10, 6),
    var_99 DECIMAL(10, 6),
    expected_shortfall_95 DECIMAL(10, 6),
    expected_shortfall_99 DECIMAL(10, 6),
    maximum_drawdown DECIMAL(10, 6),
    beta DECIMAL(10, 6),
    tracking_error DECIMAL(10, 6),
    information_ratio DECIMAL(10, 6),
    calculation_date DATE NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sandbox_sessions(session_id)
);

-- Trade History Table
CREATE TABLE IF NOT EXISTS trade_history (
    id SERIAL PRIMARY KEY,
    trade_id VARCHAR(255) NOT NULL UNIQUE,
    session_id VARCHAR(255) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    quantity DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    pnl DECIMAL(20, 8),
    fees DECIMAL(20, 8) DEFAULT 0,
    slippage DECIMAL(20, 8) DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES sandbox_sessions(session_id)
);

-- Monte Carlo Results Table
CREATE TABLE IF NOT EXISTS monte_carlo_results (
    id SERIAL PRIMARY KEY,
    result_id VARCHAR(255) NOT NULL UNIQUE,
    session_id VARCHAR(255) NOT NULL,
    simulations_count INTEGER NOT NULL,
    mean_return DECIMAL(10, 6) NOT NULL,
    median_return DECIMAL(10, 6) NOT NULL,
    std_deviation DECIMAL(10, 6) NOT NULL,
    min_return DECIMAL(10, 6) NOT NULL,
    max_return DECIMAL(10, 6) NOT NULL,
    var_95 DECIMAL(10, 6) NOT NULL,
    var_99 DECIMAL(10, 6) NOT NULL,
    expected_shortfall_95 DECIMAL(10, 6) NOT NULL,
    return_distribution JSONB NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sandbox_sessions(session_id)
);

-- Stress Test Results Table
CREATE TABLE IF NOT EXISTS stress_test_results (
    id SERIAL PRIMARY KEY,
    result_id VARCHAR(255) NOT NULL UNIQUE,
    session_id VARCHAR(255) NOT NULL,
    scenario_name VARCHAR(100) NOT NULL,
    scenario_description TEXT,
    impact_level VARCHAR(20) NOT NULL,
    portfolio_loss DECIMAL(10, 6) NOT NULL,
    recovery_time_days INTEGER,
    confidence_level DECIMAL(5, 4),
    worst_case_scenario JSONB,
    risk_limits JSONB NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sandbox_sessions(session_id)
);

-- Simulation Analytics Table
CREATE TABLE IF NOT EXISTS simulation_analytics (
    id SERIAL PRIMARY KEY,
    analytics_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    analytics_date DATE NOT NULL,
    total_sessions INTEGER NOT NULL DEFAULT 0,
    completed_simulations INTEGER NOT NULL DEFAULT 0,
    active_sessions INTEGER NOT NULL DEFAULT 0,
    failed_sessions INTEGER NOT NULL DEFAULT 0,
    environment_usage JSONB NOT NULL,
    scenario_usage JSONB NOT NULL,
    performance_stats JSONB NOT NULL,
    top_strategies JSONB NOT NULL,
    risk_analysis JSONB NOT NULL,
    trends JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sandbox Audit Trail Table
CREATE TABLE IF NOT EXISTS sandbox_audit_trail (
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
CREATE INDEX IF NOT EXISTS idx_sandbox_sessions_user_id ON sandbox_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_sessions_environment ON sandbox_sessions(environment_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_sessions_scenario ON sandbox_sessions(scenario_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_sessions_status ON sandbox_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sandbox_sessions_created_at ON sandbox_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_simulation_results_session_id ON simulation_results(session_id);
CREATE INDEX IF NOT EXISTS idx_simulation_results_type ON simulation_results(simulation_type);
CREATE INDEX IF NOT EXISTS idx_simulation_results_executed_at ON simulation_results(executed_at);

CREATE INDEX IF NOT EXISTS idx_strategy_performance_session ON strategy_performance(session_id);
CREATE INDEX IF NOT EXISTS idx_strategy_performance_date ON strategy_performance(calculation_date);

CREATE INDEX IF NOT EXISTS idx_risk_metrics_session ON risk_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_risk_metrics_date ON risk_metrics(calculation_date);

CREATE INDEX IF NOT EXISTS idx_trade_history_session ON trade_history(session_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_timestamp ON trade_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_trade_history_symbol ON trade_history(symbol);

CREATE INDEX IF NOT EXISTS idx_monte_carlo_session ON monte_carlo_results(session_id);
CREATE INDEX IF NOT EXISTS idx_monte_carlo_executed_at ON monte_carlo_results(executed_at);

CREATE INDEX IF NOT EXISTS idx_stress_test_session ON stress_test_results(session_id);
CREATE INDEX IF NOT EXISTS idx_stress_test_executed_at ON stress_test_results(executed_at);

CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON simulation_analytics(user_id, analytics_date);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON simulation_analytics(analytics_date);

CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON sandbox_audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON sandbox_audit_trail(timestamp);

-- Create Views for Analytics
CREATE OR REPLACE VIEW sandbox_session_summary AS
SELECT 
    user_id,
    COUNT(*) as total_sessions,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_sessions,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_sessions,
    AVG(initial_capital) as avg_initial_capital,
    MAX(created_at) as last_session_date
FROM sandbox_sessions
GROUP BY user_id;

CREATE OR REPLACE VIEW simulation_performance_summary AS
SELECT 
    s.user_id,
    s.environment_id,
    s.scenario_id,
    COUNT(*) as total_simulations,
    AVG(sr.total_return) as avg_total_return,
    AVG(sr.sharpe_ratio) as avg_sharpe_ratio,
    AVG(sr.volatility) as avg_volatility,
    AVG(sr.max_drawdown) as avg_max_drawdown,
    AVG(sr.win_rate) as avg_win_rate,
    AVG(sr.profit_factor) as avg_profit_factor
FROM sandbox_sessions s
JOIN simulation_results sr ON s.session_id = sr.session_id
GROUP BY s.user_id, s.environment_id, s.scenario_id;

CREATE OR REPLACE VIEW environment_performance_analysis AS
SELECT 
    environment_id,
    COUNT(*) as total_sessions,
    AVG(sr.total_return) as avg_return,
    AVG(sr.sharpe_ratio) as avg_sharpe,
    AVG(sr.volatility) as avg_volatility,
    COUNT(CASE WHEN sr.total_return > 0 THEN 1 END) as profitable_sessions,
    (COUNT(CASE WHEN sr.total_return > 0 THEN 1 END) * 100.0 / COUNT(*)) as success_rate
FROM sandbox_sessions s
JOIN simulation_results sr ON s.session_id = sr.session_id
GROUP BY environment_id;

CREATE OR REPLACE VIEW scenario_performance_analysis AS
SELECT 
    scenario_id,
    COUNT(*) as total_sessions,
    AVG(sr.total_return) as avg_return,
    AVG(sr.sharpe_ratio) as avg_sharpe,
    AVG(sr.volatility) as avg_volatility,
    COUNT(CASE WHEN sr.total_return > 0 THEN 1 END) as profitable_sessions,
    (COUNT(CASE WHEN sr.total_return > 0 THEN 1 END) * 100.0 / COUNT(*)) as success_rate
FROM sandbox_sessions s
JOIN simulation_results sr ON s.session_id = sr.session_id
GROUP BY scenario_id;

CREATE OR REPLACE VIEW daily_simulation_stats AS
SELECT 
    DATE(s.created_at) as date,
    COUNT(*) as sessions_created,
    COUNT(sr.session_id) as simulations_completed,
    AVG(sr.total_return) as avg_return,
    AVG(sr.sharpe_ratio) as avg_sharpe,
    COUNT(DISTINCT s.environment_id) as environments_used,
    COUNT(DISTINCT s.scenario_id) as scenarios_used
FROM sandbox_sessions s
LEFT JOIN simulation_results sr ON s.session_id = sr.session_id
GROUP BY DATE(s.created_at)
ORDER BY date DESC;

-- Create Triggers for Audit Logging
CREATE OR REPLACE FUNCTION sandbox_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO sandbox_audit_trail (audit_id, entity_type, entity_id, action, new_values, user_id)
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
        INSERT INTO sandbox_audit_trail (audit_id, entity_type, entity_id, action, old_values, new_values, user_id)
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
        INSERT INTO sandbox_audit_trail (audit_id, entity_type, entity_id, action, old_values, user_id)
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
CREATE TRIGGER sandbox_sessions_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sandbox_sessions
    FOR EACH ROW EXECUTE FUNCTION sandbox_audit_trigger();

CREATE TRIGGER simulation_results_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON simulation_results
    FOR EACH ROW EXECUTE FUNCTION sandbox_audit_trigger();

-- Insert Sample Data
-- Simulation Environments
INSERT INTO simulation_environments (environment_id, environment_name, description, characteristics, technologies, market_participants)
VALUES 
    ('quantum_economy', 'Quantum Economy 2030', 'Simulation of markets in a quantum computing dominated economy', '{"processingPower": "exponential", "aiCapabilities": "superhuman", "marketEfficiency": 0.99, "volatility": "ultra_low", "liquidity": "infinite"}', ARRAY['quantum_computing', 'quantum_encryption', 'quantum_ai'], ARRAY['quantum_ai_traders', 'quantum_hedge_funds', 'quantum_banks']),
    ('ai_dominated', 'AI-Dominated Markets 2030', 'Markets where AI systems control 90%+ of trading activity', '{"processingPower": "superhuman", "aiCapabilities": "general_ai", "marketEfficiency": 0.95, "volatility": "low", "liquidity": "high"}', ARRAY['artificial_general_intelligence', 'neural_networks', 'deep_learning'], ARRAY['ai_trading_agents', 'algorithmic_funds', 'ai_banks']),
    ('metaverse_economy', 'Metaverse Economy 2030', 'Virtual world economies with digital assets and virtual currencies', '{"processingPower": "high", "aiCapabilities": "advanced", "marketEfficiency": 0.85, "volatility": "high", "liquidity": "medium"}', ARRAY['virtual_reality', 'augmented_reality', 'blockchain'], ARRAY['virtual_traders', 'nft_investors', 'virtual_banks']),
    ('sustainable_finance', 'Sustainable Finance 2030', 'Markets focused on ESG and sustainable investments', '{"processingPower": "high", "aiCapabilities": "advanced", "marketEfficiency": 0.90, "volatility": "medium", "liquidity": "high"}', ARRAY['esg_analytics', 'carbon_tracking', 'sustainable_ai'], ARRAY['esg_funds', 'impact_investors', 'sustainable_banks']),
    ('space_economy', 'Space Economy 2030', 'Markets for space-based assets and interplanetary commerce', '{"processingPower": "high", "aiCapabilities": "advanced", "marketEfficiency": 0.80, "volatility": "very_high", "liquidity": "low"}', ARRAY['space_mining', 'satellite_networks', 'space_tourism'], ARRAY['space_corporations', 'asteroid_miners', 'space_tourists'])
ON CONFLICT (environment_id) DO NOTHING;

-- Market Scenarios
INSERT INTO market_scenarios (scenario_id, scenario_name, description, timeframe, key_events, market_impact, probability)
VALUES 
    ('technological_singularity', 'Technological Singularity', 'Rapid technological advancement leading to market transformation', '2024-2030', ARRAY['AGI breakthrough in 2025', 'Quantum supremacy achieved in 2026', 'Full automation by 2028'], '{"volatility": "extreme", "growth": "exponential", "disruption": "complete"}', 0.15),
    ('climate_transition', 'Climate Transition Economy', 'Global transition to carbon-neutral economy', '2024-2030', ARRAY['Carbon pricing global by 2025', 'Renewable energy dominance by 2027', 'Fossil fuel phase-out by 2029'], '{"volatility": "high", "growth": "moderate", "disruption": "significant"}', 0.40),
    ('digital_sovereignty', 'Digital Sovereignty Wars', 'Nation-states competing for digital and technological dominance', '2024-2030', ARRAY['Digital currency wars in 2025', 'AI regulation conflicts in 2026', 'Quantum encryption race in 2027'], '{"volatility": "very_high", "growth": "moderate", "disruption": "major"}', 0.25),
    ('metaverse_dominance', 'Metaverse Economic Dominance', 'Virtual worlds become primary economic activity centers', '2024-2030', ARRAY['Metaverse adoption 50% by 2026', 'Virtual work becomes norm by 2027', 'Digital assets surpass physical by 2028'], '{"volatility": "high", "growth": "exponential", "disruption": "transformative"}', 0.35),
    ('space_commercialization', 'Space Commercialization Boom', 'Space becomes major economic frontier', '2024-2030', ARRAY['Space tourism mainstream by 2025', 'Asteroid mining begins in 2026', 'Lunar bases established by 2028'], '{"volatility": "extreme", "growth": "exponential", "disruption": "revolutionary"}', 0.20)
ON CONFLICT (scenario_id) DO NOTHING;

-- AI Models
INSERT INTO ai_models (model_id, model_name, version, capabilities, accuracy, processing_speed, training_data, specializations)
VALUES 
    ('gpt_10', 'GPT-10 Market Predictor', '10.0', ARRAY['market_prediction', 'sentiment_analysis', 'risk_assessment'], 0.94, 'real_time', 'all_market_data_2020_2030', ARRAY['crypto_markets', 'traditional_finance', 'emerging_tech']),
    ('quantum_ai_trader', 'Quantum AI Trader', '1.0', ARRAY['quantum_optimization', 'multi_dimensional_analysis', 'quantum_risk_modeling'], 0.98, 'instantaneous', 'quantum_financial_data', ARRAY['quantum_finance', 'high_frequency_trading', 'complex_derivatives']),
    ('metaverse_ai', 'Metaverse AI Economist', '2.0', ARRAY['virtual_economy_modeling', 'nft_valuation', 'virtual_real_estate_analysis'], 0.89, 'real_time', 'metaverse_economic_data', ARRAY['metaverse_markets', 'nft_trading', 'virtual_currencies']),
    ('sustainability_ai', 'Sustainability AI Advisor', '3.0', ARRAY['esg_analysis', 'carbon_footprint_tracking', 'impact_measurement'], 0.92, 'real_time', 'esg_sustainability_data', ARRAY['esg_investing', 'carbon_trading', 'sustainable_finance'])
ON CONFLICT (model_id) DO NOTHING;

-- Quantum Simulators
INSERT INTO quantum_simulators (simulator_id, simulator_name, description, algorithms, capabilities, qubits, coherence_time, error_rate)
VALUES 
    ('quantum_portfolio_optimizer', 'Quantum Portfolio Optimizer', 'Uses quantum algorithms for portfolio optimization', ARRAY['QAOA', 'VQE', 'Quantum_Annealing'], ARRAY['portfolio_optimization', 'risk_parity', 'factor_investing'], 1000, '100ms', 0.001),
    ('quantum_risk_model', 'Quantum Risk Model', 'Quantum-enhanced risk modeling and stress testing', ARRAY['Quantum_Monte_Carlo', 'Quantum_VaR', 'Quantum_Stress_Testing'], ARRAY['var_calculation', 'stress_testing', 'correlation_analysis'], 500, '50ms', 0.002),
    ('quantum_arbitrage', 'Quantum Arbitrage Detector', 'Quantum algorithms for detecting arbitrage opportunities', ARRAY['Quantum_Grover_Search', 'Quantum_Amplitude_Amplification'], ARRAY['arbitrage_detection', 'market_inefficiency_identification'], 200, '25ms', 0.005)
ON CONFLICT (simulator_id) DO NOTHING;

-- Emerging Technology Models
INSERT INTO emerging_tech_models (model_id, model_name, description, technologies, capabilities, adoption_rate, market_impact)
VALUES 
    ('brain_computer_interface', 'Brain-Computer Interface Trading', 'Direct neural interface for trading decisions', ARRAY['neural_implants', 'brain_signal_processing', 'thought_to_action'], ARRAY['instantaneous_decisions', 'emotion_based_trading', 'subconscious_analysis'], 0.15, 'revolutionary'),
    ('augmented_reality_trading', 'Augmented Reality Trading Interface', 'AR-enhanced trading environments', ARRAY['holographic_displays', 'gesture_control', 'spatial_computing'], ARRAY['3d_market_visualization', 'gesture_based_trading', 'immersive_analysis'], 0.60, 'significant'),
    ('autonomous_vehicles_economy', 'Autonomous Vehicles Economy', 'Economic models for autonomous vehicle market', ARRAY['self_driving_cars', 'autonomous_delivery', 'mobility_as_service'], ARRAY['transportation_disruption', 'new_revenue_models', 'infrastructure_changes'], 0.80, 'transformative'),
    ('synthetic_biology', 'Synthetic Biology Markets', 'Markets for synthetic biology products', ARRAY['synthetic_organisms', 'bio_manufacturing', 'personalized_medicine'], ARRAY['biotech_disruption', 'new_manufacturing', 'healthcare_transformation'], 0.30, 'major')
ON CONFLICT (model_id) DO NOTHING;

-- Create Functions for Sandbox Operations
CREATE OR REPLACE FUNCTION get_user_sandbox_summary(
    p_user_id VARCHAR,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_sessions BIGINT,
    completed_sessions BIGINT,
    active_sessions BIGINT,
    failed_sessions BIGINT,
    avg_initial_capital DECIMAL,
    avg_total_return DECIMAL,
    avg_sharpe_ratio DECIMAL,
    avg_volatility DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
        SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active_sessions,
        SUM(CASE WHEN s.status = 'failed' THEN 1 ELSE 0 END) as failed_sessions,
        AVG(s.initial_capital) as avg_initial_capital,
        AVG(sr.total_return) as avg_total_return,
        AVG(sr.sharpe_ratio) as avg_sharpe_ratio,
        AVG(sr.volatility) as avg_volatility
    FROM sandbox_sessions s
    LEFT JOIN simulation_results sr ON s.session_id = sr.session_id
    WHERE s.user_id = p_user_id
    AND DATE(s.created_at) BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_environment_performance(
    p_environment_id VARCHAR,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '90 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_sessions BIGINT,
    avg_return DECIMAL,
    avg_sharpe DECIMAL,
    avg_volatility DECIMAL,
    success_rate DECIMAL,
    profitable_sessions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_sessions,
        AVG(sr.total_return) as avg_return,
        AVG(sr.sharpe_ratio) as avg_sharpe,
        AVG(sr.volatility) as avg_volatility,
        (COUNT(CASE WHEN sr.total_return > 0 THEN 1 END) * 100.0 / COUNT(*)) as success_rate,
        COUNT(CASE WHEN sr.total_return > 0 THEN 1 END) as profitable_sessions
    FROM sandbox_sessions s
    JOIN simulation_results sr ON s.session_id = sr.session_id
    WHERE s.environment_id = p_environment_id
    AND DATE(s.created_at) BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_simulation_statistics(
    p_simulation_type VARCHAR DEFAULT NULL,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_simulations BIGINT,
    avg_return DECIMAL,
    median_return DECIMAL,
    avg_volatility DECIMAL,
    avg_sharpe DECIMAL,
    avg_max_drawdown DECIMAL,
    best_return DECIMAL,
    worst_return DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_simulations,
        AVG(sr.total_return) as avg_return,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sr.total_return) as median_return,
        AVG(sr.volatility) as avg_volatility,
        AVG(sr.sharpe_ratio) as avg_sharpe,
        AVG(sr.max_drawdown) as avg_max_drawdown,
        MAX(sr.total_return) as best_return,
        MIN(sr.total_return) as worst_return
    FROM simulation_results sr
    JOIN sandbox_sessions s ON sr.session_id = s.session_id
    WHERE (p_simulation_type IS NULL OR sr.simulation_type = p_simulation_type)
    AND DATE(sr.executed_at) BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Grant Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON simulation_environments TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON market_scenarios TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_models TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON quantum_simulators TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON emerging_tech_models TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON sandbox_sessions TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON simulation_results TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON strategy_performance TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON risk_metrics TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON trade_history TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON monte_carlo_results TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON stress_test_results TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON simulation_analytics TO finnexusai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON sandbox_audit_trail TO finnexusai_user;

GRANT SELECT ON sandbox_session_summary TO finnexusai_user;
GRANT SELECT ON simulation_performance_summary TO finnexusai_user;
GRANT SELECT ON environment_performance_analysis TO finnexusai_user;
GRANT SELECT ON scenario_performance_analysis TO finnexusai_user;
GRANT SELECT ON daily_simulation_stats TO finnexusai_user;

GRANT EXECUTE ON FUNCTION get_user_sandbox_summary(VARCHAR, DATE, DATE) TO finnexusai_user;
GRANT EXECUTE ON FUNCTION calculate_environment_performance(VARCHAR, DATE, DATE) TO finnexusai_user;
GRANT EXECUTE ON FUNCTION get_simulation_statistics(VARCHAR, DATE, DATE) TO finnexusai_user;

-- Create Comments
COMMENT ON TABLE simulation_environments IS 'Simulation environments for 2030 market scenarios';
COMMENT ON TABLE market_scenarios IS 'Market scenarios with probability and impact data';
COMMENT ON TABLE ai_models IS 'AI models available for market simulation';
COMMENT ON TABLE quantum_simulators IS 'Quantum computing simulators for financial modeling';
COMMENT ON TABLE emerging_tech_models IS 'Emerging technology models for future market simulation';
COMMENT ON TABLE sandbox_sessions IS 'Sandbox simulation sessions created by users';
COMMENT ON TABLE simulation_results IS 'Results from sandbox simulations';
COMMENT ON TABLE strategy_performance IS 'Performance metrics for trading strategies';
COMMENT ON TABLE risk_metrics IS 'Risk metrics calculated for simulations';
COMMENT ON TABLE trade_history IS 'Trade history from simulated sessions';
COMMENT ON TABLE monte_carlo_results IS 'Results from Monte Carlo simulations';
COMMENT ON TABLE stress_test_results IS 'Results from stress testing scenarios';
COMMENT ON TABLE simulation_analytics IS 'Analytics and insights from sandbox usage';
COMMENT ON TABLE sandbox_audit_trail IS 'Audit trail for sandbox operations';

COMMENT ON VIEW sandbox_session_summary IS 'Summary of sandbox sessions by user';
COMMENT ON VIEW simulation_performance_summary IS 'Performance summary of simulations by user and environment';
COMMENT ON VIEW environment_performance_analysis IS 'Performance analysis by simulation environment';
COMMENT ON VIEW scenario_performance_analysis IS 'Performance analysis by market scenario';
COMMENT ON VIEW daily_simulation_stats IS 'Daily statistics for sandbox simulations';

-- Migration Complete
INSERT INTO migration_history (version, description, applied_at) 
VALUES ('009', 'Futurist Sandbox Tables', NOW());

