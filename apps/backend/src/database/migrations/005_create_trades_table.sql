-- Migration: 005_create_trades_table.sql
-- Description: Create trades table for trade execution and tracking
-- Author: FinNexusAI Development Team
-- Date: 2024-01-15

-- Create trade_status enum
CREATE TYPE trade_status_enum AS ENUM (
    'pending',
    'submitted',
    'processing',
    'filled',
    'partially_filled',
    'cancelled',
    'rejected',
    'expired',
    'failed'
);

-- Create trade_type enum
CREATE TYPE trade_type_enum AS ENUM (
    'market',
    'limit',
    'stop',
    'stop_limit',
    'trailing_stop',
    'oco', -- One-Cancels-Other
    'iceberg',
    'twap', -- Time-Weighted Average Price
    'vwap'  -- Volume-Weighted Average Price
);

-- Create trade_side enum
CREATE TYPE trade_side_enum AS ENUM (
    'buy',
    'sell'
);

-- Create trades table
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    
    -- Trade Identification
    external_order_id VARCHAR(255), -- Exchange order ID
    client_order_id VARCHAR(255), -- Client-generated order ID
    
    -- Trade Details
    side trade_side_enum NOT NULL,
    type trade_type_enum NOT NULL DEFAULT 'market',
    status trade_status_enum NOT NULL DEFAULT 'pending',
    
    -- Quantity and Price
    quantity DECIMAL(20,8) NOT NULL,
    price DECIMAL(20,8), -- For limit orders
    stop_price DECIMAL(20,8), -- For stop orders
    limit_price DECIMAL(20,8), -- For stop-limit orders
    average_fill_price DECIMAL(20,8) DEFAULT 0.00000000,
    
    -- Execution Details
    filled_quantity DECIMAL(20,8) DEFAULT 0.00000000,
    remaining_quantity DECIMAL(20,8),
    total_value DECIMAL(20,8) DEFAULT 0.00000000,
    
    -- Fees and Costs
    commission DECIMAL(20,8) DEFAULT 0.00000000,
    commission_asset VARCHAR(20),
    network_fee DECIMAL(20,8) DEFAULT 0.00000000,
    network_fee_asset VARCHAR(20),
    total_fees DECIMAL(20,8) DEFAULT 0.00000000,
    
    -- Trading Pair Information
    trading_pair VARCHAR(50),
    base_asset VARCHAR(20),
    quote_asset VARCHAR(20),
    
    -- Order Management
    time_in_force VARCHAR(20) DEFAULT 'GTC' CHECK (time_in_force IN ('GTC', 'IOC', 'FOK', 'GTD')),
    expires_at TIMESTAMP,
    
    -- Execution Information
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    filled_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Exchange Information
    exchange VARCHAR(100),
    exchange_order_id VARCHAR(255),
    exchange_timestamp TIMESTAMP,
    
    -- Strategy Information
    strategy_type VARCHAR(100), -- e.g., 'momentum', 'mean_reversion', 'dca'
    strategy_id UUID, -- Reference to strategy execution
    signal_id UUID, -- Reference to trading signal
    
    -- Risk Management
    stop_loss_price DECIMAL(20,8),
    take_profit_price DECIMAL(20,8),
    trailing_stop_distance DECIMAL(20,8),
    max_slippage DECIMAL(5,2), -- Maximum slippage percentage
    
    -- Metadata
    notes TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT trades_quantity_check CHECK (quantity > 0),
    CONSTRAINT trades_price_check CHECK (price IS NULL OR price > 0),
    CONSTRAINT trades_stop_price_check CHECK (stop_price IS NULL OR stop_price > 0),
    CONSTRAINT trades_limit_price_check CHECK (limit_price IS NULL OR limit_price > 0),
    CONSTRAINT trades_average_fill_price_check CHECK (average_fill_price >= 0),
    CONSTRAINT trades_filled_quantity_check CHECK (filled_quantity >= 0),
    CONSTRAINT trades_remaining_quantity_check CHECK (remaining_quantity IS NULL OR remaining_quantity >= 0),
    CONSTRAINT trades_total_value_check CHECK (total_value >= 0),
    CONSTRAINT trades_commission_check CHECK (commission >= 0),
    CONSTRAINT trades_network_fee_check CHECK (network_fee >= 0),
    CONSTRAINT trades_total_fees_check CHECK (total_fees >= 0),
    CONSTRAINT trades_max_slippage_check CHECK (max_slippage IS NULL OR (max_slippage >= 0 AND max_slippage <= 100))
);

-- Create indexes for performance
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_portfolio_id ON trades(portfolio_id);
CREATE INDEX idx_trades_asset_id ON trades(asset_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_side ON trades(side);
CREATE INDEX idx_trades_type ON trades(type);
CREATE INDEX idx_trades_submitted_at ON trades(submitted_at);
CREATE INDEX idx_trades_filled_at ON trades(filled_at);
CREATE INDEX idx_trades_exchange ON trades(exchange);
CREATE INDEX idx_trades_strategy_type ON trades(strategy_type);
CREATE INDEX idx_trades_strategy_id ON trades(strategy_id);
CREATE INDEX idx_trades_signal_id ON trades(signal_id);
CREATE INDEX idx_trades_created_at ON trades(created_at);
CREATE INDEX idx_trades_updated_at ON trades(updated_at);

-- Create composite indexes
CREATE INDEX idx_trades_user_status ON trades(user_id, status);
CREATE INDEX idx_trades_portfolio_status ON trades(portfolio_id, status);
CREATE INDEX idx_trades_asset_status ON trades(asset_id, status);
CREATE INDEX idx_trades_user_created ON trades(user_id, created_at);
CREATE INDEX idx_trades_portfolio_created ON trades(portfolio_id, created_at);
CREATE INDEX idx_trades_user_filled ON trades(user_id, filled_at) WHERE status = 'filled';
CREATE INDEX idx_trades_portfolio_filled ON trades(portfolio_id, filled_at) WHERE status = 'filled';

-- Create partial indexes for active trades
CREATE INDEX idx_trades_pending ON trades(id) WHERE status IN ('pending', 'submitted', 'processing');
CREATE INDEX idx_trades_filled ON trades(id) WHERE status = 'filled';
CREATE INDEX idx_trades_cancelled ON trades(id) WHERE status = 'cancelled';

-- Create GIN indexes for JSONB columns
CREATE INDEX idx_trades_metadata_gin ON trades USING GIN(metadata);
CREATE INDEX idx_trades_tags_gin ON trades USING GIN(tags);

-- Create trigger for updated_at
CREATE TRIGGER update_trades_updated_at 
    BEFORE UPDATE ON trades 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate remaining quantity
CREATE OR REPLACE FUNCTION calculate_remaining_quantity()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate remaining quantity
    IF NEW.quantity IS NOT NULL AND NEW.filled_quantity IS NOT NULL THEN
        NEW.remaining_quantity = NEW.quantity - NEW.filled_quantity;
    END IF;
    
    -- Calculate total value
    IF NEW.filled_quantity IS NOT NULL AND NEW.average_fill_price IS NOT NULL THEN
        NEW.total_value = NEW.filled_quantity * NEW.average_fill_price;
    END IF;
    
    -- Calculate total fees
    NEW.total_fees = COALESCE(NEW.commission, 0) + COALESCE(NEW.network_fee, 0);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic calculations
CREATE TRIGGER calculate_trades_metrics 
    BEFORE INSERT OR UPDATE ON trades 
    FOR EACH ROW 
    EXECUTE FUNCTION calculate_remaining_quantity();

-- Create function to update trade status based on fills
CREATE OR REPLACE FUNCTION update_trade_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update status based on filled quantity
    IF NEW.filled_quantity > 0 AND NEW.filled_quantity < NEW.quantity THEN
        NEW.status = 'partially_filled';
    ELSIF NEW.filled_quantity = NEW.quantity AND NEW.filled_quantity > 0 THEN
        NEW.status = 'filled';
        NEW.filled_at = CURRENT_TIMESTAMP;
    ELSIF NEW.filled_quantity = 0 AND NEW.status = 'processing' THEN
        NEW.status = 'pending';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for status updates
CREATE TRIGGER update_trades_status 
    BEFORE UPDATE ON trades 
    FOR EACH ROW 
    EXECUTE FUNCTION update_trade_status();

-- Add comments for documentation
COMMENT ON TABLE trades IS 'Trade execution and tracking with comprehensive order management';
COMMENT ON COLUMN trades.id IS 'Unique trade identifier (UUID)';
COMMENT ON COLUMN trades.user_id IS 'Reference to the user who placed the trade';
COMMENT ON COLUMN trades.portfolio_id IS 'Reference to the portfolio';
COMMENT ON COLUMN trades.asset_id IS 'Reference to the asset being traded';
COMMENT ON COLUMN trades.external_order_id IS 'Exchange-provided order ID';
COMMENT ON COLUMN trades.client_order_id IS 'Client-generated order ID';
COMMENT ON COLUMN trades.side IS 'Trade side (buy or sell)';
COMMENT ON COLUMN trades.type IS 'Order type (market, limit, stop, etc.)';
COMMENT ON COLUMN trades.status IS 'Current trade status';
COMMENT ON COLUMN trades.quantity IS 'Order quantity';
COMMENT ON COLUMN trades.price IS 'Order price (for limit orders)';
COMMENT ON COLUMN trades.stop_price IS 'Stop price (for stop orders)';
COMMENT ON COLUMN trades.limit_price IS 'Limit price (for stop-limit orders)';
COMMENT ON COLUMN trades.average_fill_price IS 'Average fill price';
COMMENT ON COLUMN trades.filled_quantity IS 'Quantity filled so far';
COMMENT ON COLUMN trades.remaining_quantity IS 'Remaining quantity to fill';
COMMENT ON COLUMN trades.total_value IS 'Total value of filled quantity';
COMMENT ON COLUMN trades.commission IS 'Commission fee paid';
COMMENT ON COLUMN trades.commission_asset IS 'Asset used to pay commission';
COMMENT ON COLUMN trades.network_fee IS 'Network/blockchain fee paid';
COMMENT ON COLUMN trades.network_fee_asset IS 'Asset used to pay network fee';
COMMENT ON COLUMN trades.total_fees IS 'Total fees paid (commission + network)';
COMMENT ON COLUMN trades.trading_pair IS 'Trading pair (e.g., BTC/USDT)';
COMMENT ON COLUMN trades.base_asset IS 'Base asset in trading pair';
COMMENT ON COLUMN trades.quote_asset IS 'Quote asset in trading pair';
COMMENT ON COLUMN trades.time_in_force IS 'Order time in force';
COMMENT ON COLUMN trades.expires_at IS 'Order expiration time';
COMMENT ON COLUMN trades.submitted_at IS 'Order submission time';
COMMENT ON COLUMN trades.filled_at IS 'Order fill completion time';
COMMENT ON COLUMN trades.cancelled_at IS 'Order cancellation time';
COMMENT ON COLUMN trades.exchange IS 'Exchange where order was placed';
COMMENT ON COLUMN trades.exchange_order_id IS 'Exchange-specific order ID';
COMMENT ON COLUMN trades.exchange_timestamp IS 'Exchange timestamp';
COMMENT ON COLUMN trades.strategy_type IS 'Trading strategy type';
COMMENT ON COLUMN trades.strategy_id IS 'Reference to strategy execution';
COMMENT ON COLUMN trades.signal_id IS 'Reference to trading signal';
COMMENT ON COLUMN trades.stop_loss_price IS 'Stop loss price';
COMMENT ON COLUMN trades.take_profit_price IS 'Take profit price';
COMMENT ON COLUMN trades.trailing_stop_distance IS 'Trailing stop distance';
COMMENT ON COLUMN trades.max_slippage IS 'Maximum acceptable slippage percentage';
COMMENT ON COLUMN trades.notes IS 'User notes about the trade';
COMMENT ON COLUMN trades.tags IS 'Array of tags for categorization';
COMMENT ON COLUMN trades.metadata IS 'JSONB additional trade metadata';
