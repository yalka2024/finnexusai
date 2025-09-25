-- Migration: 004_create_holdings_table.sql
-- Description: Create holdings table for portfolio asset holdings
-- Author: FinNexusAI Development Team
-- Date: 2024-01-15

-- Create holdings table
CREATE TABLE holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    
    -- Holding Information
    quantity DECIMAL(20,8) NOT NULL DEFAULT 0.00000000,
    average_cost DECIMAL(20,8) NOT NULL DEFAULT 0.00000000,
    total_cost_basis DECIMAL(20,8) NOT NULL DEFAULT 0.00000000,
    
    -- Current Valuation
    current_price DECIMAL(20,8),
    current_value DECIMAL(20,8) DEFAULT 0.00000000,
    unrealized_pnl DECIMAL(20,8) DEFAULT 0.00000000,
    unrealized_pnl_percentage DECIMAL(10,4) DEFAULT 0.0000,
    
    -- Performance Metrics
    total_return DECIMAL(20,8) DEFAULT 0.00000000,
    total_return_percentage DECIMAL(10,4) DEFAULT 0.0000,
    daily_pnl DECIMAL(20,8) DEFAULT 0.00000000,
    daily_pnl_percentage DECIMAL(10,4) DEFAULT 0.0000,
    
    -- Allocation Information
    target_allocation_percentage DECIMAL(5,2) DEFAULT 0.00,
    current_allocation_percentage DECIMAL(5,2) DEFAULT 0.00,
    allocation_deviation DECIMAL(5,2) DEFAULT 0.00,
    
    -- Risk Metrics
    weight_in_portfolio DECIMAL(5,2) DEFAULT 0.00,
    contribution_to_return DECIMAL(10,6) DEFAULT 0.000000,
    contribution_to_risk DECIMAL(10,6) DEFAULT 0.000000,
    
    -- Trading Information
    first_purchase_date TIMESTAMP,
    last_purchase_date TIMESTAMP,
    last_sale_date TIMESTAMP,
    total_purchased DECIMAL(20,8) DEFAULT 0.00000000,
    total_sold DECIMAL(20,8) DEFAULT 0.00000000,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'transferred', 'delisted')),
    is_rebalanced BOOLEAN DEFAULT FALSE,
    rebalance_priority INTEGER DEFAULT 0,
    
    -- Metadata
    notes TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_rebalanced_at TIMESTAMP,
    
    CONSTRAINT holdings_quantity_check CHECK (quantity >= 0),
    CONSTRAINT holdings_average_cost_check CHECK (average_cost >= 0),
    CONSTRAINT holdings_total_cost_basis_check CHECK (total_cost_basis >= 0),
    CONSTRAINT holdings_current_value_check CHECK (current_value >= 0),
    CONSTRAINT holdings_target_allocation_check CHECK (target_allocation_percentage >= 0 AND target_allocation_percentage <= 100),
    CONSTRAINT holdings_current_allocation_check CHECK (current_allocation_percentage >= 0 AND current_allocation_percentage <= 100),
    CONSTRAINT holdings_weight_check CHECK (weight_in_portfolio >= 0 AND weight_in_portfolio <= 100),
    CONSTRAINT holdings_rebalance_priority_check CHECK (rebalance_priority >= 0),
    
    -- Ensure unique portfolio-asset combination
    UNIQUE(portfolio_id, asset_id)
);

-- Create indexes for performance
CREATE INDEX idx_holdings_portfolio_id ON holdings(portfolio_id);
CREATE INDEX idx_holdings_asset_id ON holdings(asset_id);
CREATE INDEX idx_holdings_status ON holdings(status);
CREATE INDEX idx_holdings_quantity ON holdings(quantity);
CREATE INDEX idx_holdings_current_value ON holdings(current_value);
CREATE INDEX idx_holdings_unrealized_pnl ON holdings(unrealized_pnl);
CREATE INDEX idx_holdings_allocation_deviation ON holdings(allocation_deviation);
CREATE INDEX idx_holdings_created_at ON holdings(created_at);
CREATE INDEX idx_holdings_updated_at ON holdings(updated_at);
CREATE INDEX idx_holdings_last_rebalanced ON holdings(last_rebalanced_at);

-- Create composite indexes
CREATE INDEX idx_holdings_portfolio_status ON holdings(portfolio_id, status);
CREATE INDEX idx_holdings_portfolio_active ON holdings(portfolio_id) WHERE status = 'active';
CREATE INDEX idx_holdings_asset_active ON holdings(asset_id) WHERE status = 'active';
CREATE INDEX idx_holdings_rebalance_priority ON holdings(portfolio_id, rebalance_priority) WHERE status = 'active';

-- Create partial indexes for active holdings
CREATE INDEX idx_holdings_active_quantity ON holdings(quantity) WHERE status = 'active' AND quantity > 0;
CREATE INDEX idx_holdings_active_value ON holdings(current_value) WHERE status = 'active' AND current_value > 0;
CREATE INDEX idx_holdings_active_pnl ON holdings(unrealized_pnl) WHERE status = 'active';

-- Create GIN indexes for JSONB columns
CREATE INDEX idx_holdings_metadata_gin ON holdings USING GIN(metadata);
CREATE INDEX idx_holdings_tags_gin ON holdings USING GIN(tags);

-- Create trigger for updated_at
CREATE TRIGGER update_holdings_updated_at 
    BEFORE UPDATE ON holdings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate current value and P&L
CREATE OR REPLACE FUNCTION calculate_holding_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate current value
    IF NEW.current_price IS NOT NULL AND NEW.quantity IS NOT NULL THEN
        NEW.current_value = NEW.quantity * NEW.current_price;
    END IF;
    
    -- Calculate unrealized P&L
    IF NEW.current_value IS NOT NULL AND NEW.total_cost_basis IS NOT NULL THEN
        NEW.unrealized_pnl = NEW.current_value - NEW.total_cost_basis;
        
        -- Calculate unrealized P&L percentage
        IF NEW.total_cost_basis > 0 THEN
            NEW.unrealized_pnl_percentage = (NEW.unrealized_pnl / NEW.total_cost_basis) * 100;
        ELSE
            NEW.unrealized_pnl_percentage = 0;
        END IF;
    END IF;
    
    -- Calculate total return
    IF NEW.total_cost_basis IS NOT NULL AND NEW.total_cost_basis > 0 THEN
        NEW.total_return = NEW.unrealized_pnl;
        NEW.total_return_percentage = NEW.unrealized_pnl_percentage;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic metric calculations
CREATE TRIGGER calculate_holdings_metrics 
    BEFORE INSERT OR UPDATE ON holdings 
    FOR EACH ROW 
    EXECUTE FUNCTION calculate_holding_metrics();

-- Create function to update allocation percentages
CREATE OR REPLACE FUNCTION update_allocation_percentages()
RETURNS TRIGGER AS $$
DECLARE
    portfolio_total_value DECIMAL(20,8);
BEGIN
    -- Get portfolio total value
    SELECT total_value INTO portfolio_total_value 
    FROM portfolios 
    WHERE id = NEW.portfolio_id;
    
    -- Calculate current allocation percentage
    IF portfolio_total_value > 0 AND NEW.current_value IS NOT NULL THEN
        NEW.current_allocation_percentage = (NEW.current_value / portfolio_total_value) * 100;
        
        -- Calculate allocation deviation
        IF NEW.target_allocation_percentage IS NOT NULL THEN
            NEW.allocation_deviation = NEW.current_allocation_percentage - NEW.target_allocation_percentage;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for allocation calculations
CREATE TRIGGER update_holdings_allocation 
    BEFORE INSERT OR UPDATE ON holdings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_allocation_percentages();

-- Add comments for documentation
COMMENT ON TABLE holdings IS 'Portfolio asset holdings with comprehensive tracking and metrics';
COMMENT ON COLUMN holdings.id IS 'Unique holding identifier (UUID)';
COMMENT ON COLUMN holdings.portfolio_id IS 'Reference to the portfolio';
COMMENT ON COLUMN holdings.asset_id IS 'Reference to the asset';
COMMENT ON COLUMN holdings.quantity IS 'Current quantity of the asset held';
COMMENT ON COLUMN holdings.average_cost IS 'Average cost per unit';
COMMENT ON COLUMN holdings.total_cost_basis IS 'Total cost basis of the holding';
COMMENT ON COLUMN holdings.current_price IS 'Current market price of the asset';
COMMENT ON COLUMN holdings.current_value IS 'Current market value of the holding';
COMMENT ON COLUMN holdings.unrealized_pnl IS 'Unrealized profit/loss';
COMMENT ON COLUMN holdings.unrealized_pnl_percentage IS 'Unrealized profit/loss as percentage';
COMMENT ON COLUMN holdings.total_return IS 'Total return (realized + unrealized)';
COMMENT ON COLUMN holdings.total_return_percentage IS 'Total return as percentage';
COMMENT ON COLUMN holdings.daily_pnl IS 'Daily profit/loss';
COMMENT ON COLUMN holdings.daily_pnl_percentage IS 'Daily profit/loss as percentage';
COMMENT ON COLUMN holdings.target_allocation_percentage IS 'Target allocation percentage in portfolio';
COMMENT ON COLUMN holdings.current_allocation_percentage IS 'Current allocation percentage in portfolio';
COMMENT ON COLUMN holdings.allocation_deviation IS 'Deviation from target allocation';
COMMENT ON COLUMN holdings.weight_in_portfolio IS 'Weight of this holding in portfolio';
COMMENT ON COLUMN holdings.contribution_to_return IS 'Contribution to portfolio return';
COMMENT ON COLUMN holdings.contribution_to_risk IS 'Contribution to portfolio risk';
COMMENT ON COLUMN holdings.first_purchase_date IS 'Date of first purchase';
COMMENT ON COLUMN holdings.last_purchase_date IS 'Date of last purchase';
COMMENT ON COLUMN holdings.last_sale_date IS 'Date of last sale';
COMMENT ON COLUMN holdings.total_purchased IS 'Total quantity purchased over time';
COMMENT ON COLUMN holdings.total_sold IS 'Total quantity sold over time';
COMMENT ON COLUMN holdings.status IS 'Current status of the holding';
COMMENT ON COLUMN holdings.is_rebalanced IS 'Whether this holding has been rebalanced';
COMMENT ON COLUMN holdings.rebalance_priority IS 'Priority for rebalancing (higher = more priority)';
COMMENT ON COLUMN holdings.notes IS 'User notes about this holding';
COMMENT ON COLUMN holdings.tags IS 'Array of tags for categorization';
COMMENT ON COLUMN holdings.metadata IS 'JSONB additional holding metadata';
