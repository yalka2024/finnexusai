-- Migration: 003_create_assets_table.sql
-- Description: Create assets table for supported trading assets
-- Author: FinNexusAI Development Team
-- Date: 2024-01-15

-- Create asset_types enum
CREATE TYPE asset_type_enum AS ENUM (
    'cryptocurrency',
    'stock',
    'etf',
    'bond',
    'commodity',
    'forex',
    'derivative',
    'nft',
    'real_estate',
    'private_equity'
);

-- Create assets table
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Asset Identification
    symbol VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(500),
    asset_type asset_type_enum NOT NULL,
    
    -- Asset Classification
    category VARCHAR(100),
    sector VARCHAR(100),
    industry VARCHAR(100),
    market_cap_category VARCHAR(20) CHECK (market_cap_category IN ('large_cap', 'mid_cap', 'small_cap', 'micro_cap', 'nano_cap')),
    
    -- Basic Information
    description TEXT,
    website VARCHAR(500),
    whitepaper_url VARCHAR(500),
    logo_url VARCHAR(500),
    
    -- Market Information
    current_price DECIMAL(20,8),
    price_change_24h DECIMAL(20,8) DEFAULT 0.00000000,
    price_change_percentage_24h DECIMAL(10,4) DEFAULT 0.0000,
    market_cap DECIMAL(20,2),
    volume_24h DECIMAL(20,2),
    circulating_supply DECIMAL(20,8),
    total_supply DECIMAL(20,8),
    max_supply DECIMAL(20,8),
    
    -- Trading Information
    trading_pair VARCHAR(50), -- e.g., 'BTC/USDT'
    base_currency VARCHAR(10),
    quote_currency VARCHAR(10),
    min_trade_amount DECIMAL(20,8),
    max_trade_amount DECIMAL(20,8),
    tick_size DECIMAL(20,8), -- Minimum price increment
    lot_size DECIMAL(20,8), -- Minimum quantity increment
    
    -- Risk Metrics
    volatility DECIMAL(10,6) DEFAULT 0.000000,
    beta DECIMAL(10,6) DEFAULT 1.000000,
    sharpe_ratio DECIMAL(10,6) DEFAULT 0.000000,
    risk_rating VARCHAR(20) DEFAULT 'medium' CHECK (risk_rating IN ('low', 'medium', 'high', 'very_high')),
    
    -- Blockchain Information (for cryptocurrencies)
    blockchain VARCHAR(100),
    contract_address VARCHAR(255),
    decimals INTEGER DEFAULT 18,
    token_standard VARCHAR(20) CHECK (token_standard IN ('ERC20', 'ERC721', 'ERC1155', 'BEP20', 'TRC20', 'SPL')),
    
    -- Regulatory Information
    regulatory_status VARCHAR(50) DEFAULT 'active' CHECK (regulatory_status IN ('active', 'restricted', 'suspended', 'delisted')),
    compliance_flags JSONB DEFAULT '{}',
    jurisdiction VARCHAR(100),
    regulatory_classification VARCHAR(100),
    
    -- Exchange Information
    supported_exchanges JSONB DEFAULT '[]',
    primary_exchange VARCHAR(100),
    listing_date TIMESTAMP,
    
    -- Metadata
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'delisted')),
    is_tradable BOOLEAN DEFAULT TRUE,
    is_withdrawable BOOLEAN DEFAULT TRUE,
    is_depositable BOOLEAN DEFAULT TRUE,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_price_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT assets_symbol_check CHECK (symbol ~* '^[A-Z0-9._-]{1,20}$'),
    CONSTRAINT assets_price_check CHECK (current_price IS NULL OR current_price >= 0),
    CONSTRAINT assets_market_cap_check CHECK (market_cap IS NULL OR market_cap >= 0),
    CONSTRAINT assets_volume_check CHECK (volume_24h IS NULL OR volume_24h >= 0),
    CONSTRAINT assets_supply_check CHECK (
        (circulating_supply IS NULL OR circulating_supply >= 0) AND
        (total_supply IS NULL OR total_supply >= 0) AND
        (max_supply IS NULL OR max_supply >= 0)
    ),
    CONSTRAINT assets_trade_amount_check CHECK (
        (min_trade_amount IS NULL OR min_trade_amount > 0) AND
        (max_trade_amount IS NULL OR max_trade_amount > 0)
    )
);

-- Create indexes for performance
CREATE INDEX idx_assets_symbol ON assets(symbol);
CREATE INDEX idx_assets_asset_type ON assets(asset_type);
CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_assets_sector ON assets(sector);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_is_tradable ON assets(is_tradable);
CREATE INDEX idx_assets_created_at ON assets(created_at);
CREATE INDEX idx_assets_last_price_update ON assets(last_price_update);
CREATE INDEX idx_assets_market_cap ON assets(market_cap);
CREATE INDEX idx_assets_volume_24h ON assets(volume_24h);

-- Create composite indexes
CREATE INDEX idx_assets_type_status ON assets(asset_type, status);
CREATE INDEX idx_assets_tradable_status ON assets(is_tradable, status);
CREATE INDEX idx_assets_exchange_tradable ON assets(primary_exchange, is_tradable);

-- Create partial indexes for active assets
CREATE INDEX idx_assets_active ON assets(symbol) WHERE status = 'active';
CREATE INDEX idx_assets_tradable ON assets(symbol) WHERE is_tradable = TRUE AND status = 'active';

-- Create GIN indexes for JSONB columns
CREATE INDEX idx_assets_supported_exchanges_gin ON assets USING GIN(supported_exchanges);
CREATE INDEX idx_assets_compliance_flags_gin ON assets USING GIN(compliance_flags);
CREATE INDEX idx_assets_metadata_gin ON assets USING GIN(metadata);
CREATE INDEX idx_assets_tags_gin ON assets USING GIN(tags);

-- Create trigger for updated_at
CREATE TRIGGER update_assets_updated_at 
    BEFORE UPDATE ON assets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to update last_price_update
CREATE OR REPLACE FUNCTION update_last_price_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_price_update = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for last_price_update
CREATE TRIGGER update_assets_last_price_update 
    BEFORE UPDATE OF current_price, price_change_24h, price_change_percentage_24h, market_cap, volume_24h ON assets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_last_price_update();

-- Add comments for documentation
COMMENT ON TABLE assets IS 'Supported trading assets with comprehensive market data';
COMMENT ON COLUMN assets.id IS 'Unique asset identifier (UUID)';
COMMENT ON COLUMN assets.symbol IS 'Asset trading symbol (unique)';
COMMENT ON COLUMN assets.name IS 'Asset display name';
COMMENT ON COLUMN assets.full_name IS 'Full asset name or description';
COMMENT ON COLUMN assets.asset_type IS 'Type of asset (cryptocurrency, stock, etc.)';
COMMENT ON COLUMN assets.current_price IS 'Current market price';
COMMENT ON COLUMN assets.price_change_24h IS '24-hour price change in base currency';
COMMENT ON COLUMN assets.price_change_percentage_24h IS '24-hour price change as percentage';
COMMENT ON COLUMN assets.market_cap IS 'Market capitalization';
COMMENT ON COLUMN assets.volume_24h IS '24-hour trading volume';
COMMENT ON COLUMN assets.circulating_supply IS 'Currently circulating supply';
COMMENT ON COLUMN assets.total_supply IS 'Total supply';
COMMENT ON COLUMN assets.max_supply IS 'Maximum supply';
COMMENT ON COLUMN assets.trading_pair IS 'Primary trading pair';
COMMENT ON COLUMN assets.base_currency IS 'Base currency for trading';
COMMENT ON COLUMN assets.quote_currency IS 'Quote currency for trading';
COMMENT ON COLUMN assets.min_trade_amount IS 'Minimum tradeable amount';
COMMENT ON COLUMN assets.max_trade_amount IS 'Maximum tradeable amount';
COMMENT ON COLUMN assets.tick_size IS 'Minimum price increment';
COMMENT ON COLUMN assets.lot_size IS 'Minimum quantity increment';
COMMENT ON COLUMN assets.blockchain IS 'Blockchain network (for cryptocurrencies)';
COMMENT ON COLUMN assets.contract_address IS 'Smart contract address (for tokens)';
COMMENT ON COLUMN assets.decimals IS 'Number of decimal places';
COMMENT ON COLUMN assets.token_standard IS 'Token standard (ERC20, BEP20, etc.)';
COMMENT ON COLUMN assets.regulatory_status IS 'Current regulatory status';
COMMENT ON COLUMN assets.compliance_flags IS 'JSONB compliance flags and warnings';
COMMENT ON COLUMN assets.supported_exchanges IS 'JSONB array of supported exchanges';
COMMENT ON COLUMN assets.primary_exchange IS 'Primary exchange for trading';
COMMENT ON COLUMN assets.tags IS 'Array of asset tags for categorization';
COMMENT ON COLUMN assets.metadata IS 'JSONB additional asset metadata';
