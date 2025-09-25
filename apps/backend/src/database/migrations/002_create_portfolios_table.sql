-- Migration: 002_create_portfolios_table.sql
-- Description: Create portfolios table for portfolio management
-- Author: FinNexusAI Development Team
-- Date: 2024-01-15

-- Create portfolios table
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Portfolio Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'standard' CHECK (type IN ('standard', 'retirement', 'education', 'trading', 'defi', 'nft')),
    
    -- Portfolio Configuration
    risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('conservative', 'moderate', 'aggressive')),
    rebalancing_frequency VARCHAR(20) DEFAULT 'monthly' CHECK (rebalancing_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually', 'manual')),
    auto_rebalancing BOOLEAN DEFAULT TRUE,
    rebalancing_threshold DECIMAL(5,2) DEFAULT 5.00, -- Percentage threshold for rebalancing
    
    -- Portfolio Metrics
    total_value DECIMAL(20,8) DEFAULT 0.00000000,
    total_cost_basis DECIMAL(20,8) DEFAULT 0.00000000,
    total_return DECIMAL(20,8) DEFAULT 0.00000000,
    total_return_percentage DECIMAL(10,4) DEFAULT 0.0000,
    daily_pnl DECIMAL(20,8) DEFAULT 0.00000000,
    daily_pnl_percentage DECIMAL(10,4) DEFAULT 0.0000,
    
    -- Risk Metrics
    volatility DECIMAL(10,6) DEFAULT 0.000000,
    sharpe_ratio DECIMAL(10,6) DEFAULT 0.000000,
    max_drawdown DECIMAL(10,6) DEFAULT 0.000000,
    beta DECIMAL(10,6) DEFAULT 1.000000,
    alpha DECIMAL(10,6) DEFAULT 0.000000,
    var_95 DECIMAL(10,6) DEFAULT 0.000000, -- Value at Risk at 95% confidence
    var_99 DECIMAL(10,6) DEFAULT 0.000000, -- Value at Risk at 99% confidence
    
    -- Asset Allocation
    target_allocation JSONB DEFAULT '{}', -- Target asset allocation
    current_allocation JSONB DEFAULT '{}', -- Current asset allocation
    sector_allocation JSONB DEFAULT '{}', -- Sector allocation
    geographic_allocation JSONB DEFAULT '{}', -- Geographic allocation
    
    -- Performance Tracking
    inception_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_rebalanced_at TIMESTAMP,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'closed')),
    is_public BOOLEAN DEFAULT FALSE,
    is_taxable BOOLEAN DEFAULT TRUE,
    
    -- Compliance
    compliance_checks JSONB DEFAULT '{}',
    risk_warnings JSONB DEFAULT '{}',
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT portfolios_name_check CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 255),
    CONSTRAINT portfolios_total_value_check CHECK (total_value >= 0),
    CONSTRAINT portfolios_rebalancing_threshold_check CHECK (rebalancing_threshold >= 0 AND rebalancing_threshold <= 100)
);

-- Create indexes for performance
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_portfolios_status ON portfolios(status);
CREATE INDEX idx_portfolios_type ON portfolios(type);
CREATE INDEX idx_portfolios_risk_level ON portfolios(risk_level);
CREATE INDEX idx_portfolios_created_at ON portfolios(created_at);
CREATE INDEX idx_portfolios_last_updated ON portfolios(last_updated_at);
CREATE INDEX idx_portfolios_total_value ON portfolios(total_value);

-- Create composite indexes
CREATE INDEX idx_portfolios_user_status ON portfolios(user_id, status);
CREATE INDEX idx_portfolios_user_type ON portfolios(user_id, type);
CREATE INDEX idx_portfolios_user_active ON portfolios(user_id) WHERE status = 'active';

-- Create trigger for updated_at
CREATE TRIGGER update_portfolios_updated_at 
    BEFORE UPDATE ON portfolios 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE portfolios IS 'Portfolio management table with comprehensive portfolio tracking';
COMMENT ON COLUMN portfolios.id IS 'Unique portfolio identifier (UUID)';
COMMENT ON COLUMN portfolios.user_id IS 'Reference to the portfolio owner';
COMMENT ON COLUMN portfolios.name IS 'Portfolio display name';
COMMENT ON COLUMN portfolios.type IS 'Type of portfolio (standard, retirement, etc.)';
COMMENT ON COLUMN portfolios.risk_level IS 'Portfolio risk tolerance level';
COMMENT ON COLUMN portfolios.total_value IS 'Current total portfolio value';
COMMENT ON COLUMN portfolios.total_cost_basis IS 'Total cost basis of all holdings';
COMMENT ON COLUMN portfolios.total_return IS 'Total return in base currency';
COMMENT ON COLUMN portfolios.total_return_percentage IS 'Total return as percentage';
COMMENT ON COLUMN portfolios.daily_pnl IS 'Daily profit/loss in base currency';
COMMENT ON COLUMN portfolios.daily_pnl_percentage IS 'Daily profit/loss as percentage';
COMMENT ON COLUMN portfolios.volatility IS 'Portfolio volatility (standard deviation)';
COMMENT ON COLUMN portfolios.sharpe_ratio IS 'Risk-adjusted return ratio';
COMMENT ON COLUMN portfolios.max_drawdown IS 'Maximum drawdown experienced';
COMMENT ON COLUMN portfolios.beta IS 'Portfolio beta relative to market';
COMMENT ON COLUMN portfolios.alpha IS 'Portfolio alpha (excess return)';
COMMENT ON COLUMN portfolios.var_95 IS 'Value at Risk at 95% confidence level';
COMMENT ON COLUMN portfolios.var_99 IS 'Value at Risk at 99% confidence level';
COMMENT ON COLUMN portfolios.target_allocation IS 'JSONB target asset allocation';
COMMENT ON COLUMN portfolios.current_allocation IS 'JSONB current asset allocation';
COMMENT ON COLUMN portfolios.sector_allocation IS 'JSONB sector allocation breakdown';
COMMENT ON COLUMN portfolios.geographic_allocation IS 'JSONB geographic allocation breakdown';
COMMENT ON COLUMN portfolios.compliance_checks IS 'JSONB compliance check results';
COMMENT ON COLUMN portfolios.risk_warnings IS 'JSONB risk warnings and alerts';
