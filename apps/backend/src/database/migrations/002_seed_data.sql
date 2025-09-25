-- Seed data migration
-- This migration inserts initial data for testing and development

-- Insert initial assets
INSERT INTO assets (symbol, name, asset_type, description) VALUES
('BTC', 'Bitcoin', 'cryptocurrency', 'The first and largest cryptocurrency by market cap'),
('ETH', 'Ethereum', 'cryptocurrency', 'Smart contract platform and cryptocurrency'),
('USDT', 'Tether', 'cryptocurrency', 'USD-pegged stablecoin'),
('USDC', 'USD Coin', 'cryptocurrency', 'USD-pegged stablecoin'),
('BNB', 'Binance Coin', 'cryptocurrency', 'Binance exchange native token'),
('ADA', 'Cardano', 'cryptocurrency', 'Blockchain platform for smart contracts'),
('SOL', 'Solana', 'cryptocurrency', 'High-performance blockchain platform'),
('DOT', 'Polkadot', 'cryptocurrency', 'Multi-chain blockchain platform'),
('DOGE', 'Dogecoin', 'cryptocurrency', 'Meme cryptocurrency'),
('AVAX', 'Avalanche', 'cryptocurrency', 'Blockchain platform for decentralized applications'),
('AAPL', 'Apple Inc.', 'stock', 'Technology company stock'),
('GOOGL', 'Alphabet Inc.', 'stock', 'Technology company stock'),
('MSFT', 'Microsoft Corporation', 'stock', 'Technology company stock'),
('TSLA', 'Tesla Inc.', 'stock', 'Electric vehicle company stock'),
('AMZN', 'Amazon.com Inc.', 'stock', 'E-commerce and cloud computing company'),
('META', 'Meta Platforms Inc.', 'stock', 'Social media and virtual reality company'),
('NVDA', 'NVIDIA Corporation', 'stock', 'Graphics processing and AI company'),
('SPY', 'SPDR S&P 500 ETF', 'etf', 'S&P 500 index ETF'),
('QQQ', 'Invesco QQQ Trust', 'etf', 'NASDAQ-100 index ETF'),
('VTI', 'Vanguard Total Stock Market ETF', 'etf', 'Total stock market index ETF')
ON CONFLICT (symbol) DO NOTHING;

-- Insert sample asset prices
INSERT INTO asset_prices (asset_id, price, volume_24h, price_change_24h, price_change_percentage_24h, high_24h, low_24h)
SELECT 
    id,
    CASE 
        WHEN symbol = 'BTC' THEN 45000.00
        WHEN symbol = 'ETH' THEN 3200.00
        WHEN symbol = 'USDT' THEN 1.00
        WHEN symbol = 'USDC' THEN 1.00
        WHEN symbol = 'BNB' THEN 320.00
        WHEN symbol = 'ADA' THEN 0.45
        WHEN symbol = 'SOL' THEN 95.00
        WHEN symbol = 'DOT' THEN 6.50
        WHEN symbol = 'DOGE' THEN 0.08
        WHEN symbol = 'AVAX' THEN 35.00
        WHEN symbol = 'AAPL' THEN 180.00
        WHEN symbol = 'GOOGL' THEN 2800.00
        WHEN symbol = 'MSFT' THEN 420.00
        WHEN symbol = 'TSLA' THEN 250.00
        WHEN symbol = 'AMZN' THEN 150.00
        WHEN symbol = 'META' THEN 350.00
        WHEN symbol = 'NVDA' THEN 480.00
        WHEN symbol = 'SPY' THEN 450.00
        WHEN symbol = 'QQQ' THEN 380.00
        WHEN symbol = 'VTI' THEN 240.00
    END,
    1000000000,
    CASE 
        WHEN symbol IN ('BTC', 'ETH', 'SOL', 'AVAX') THEN 1500.00
        WHEN symbol IN ('USDT', 'USDC') THEN 0.00
        ELSE 50.00
    END,
    CASE 
        WHEN symbol IN ('BTC', 'ETH', 'SOL', 'AVAX') THEN 3.5
        WHEN symbol IN ('USDT', 'USDC') THEN 0.0
        ELSE 1.2
    END,
    CASE 
        WHEN symbol = 'BTC' THEN 46000.00
        WHEN symbol = 'ETH' THEN 3300.00
        WHEN symbol = 'USDT' THEN 1.01
        WHEN symbol = 'USDC' THEN 1.01
        WHEN symbol = 'BNB' THEN 330.00
        WHEN symbol = 'ADA' THEN 0.47
        WHEN symbol = 'SOL' THEN 98.00
        WHEN symbol = 'DOT' THEN 6.70
        WHEN symbol = 'DOGE' THEN 0.085
        WHEN symbol = 'AVAX' THEN 36.00
        WHEN symbol = 'AAPL' THEN 185.00
        WHEN symbol = 'GOOGL' THEN 2850.00
        WHEN symbol = 'MSFT' THEN 425.00
        WHEN symbol = 'TSLA' THEN 255.00
        WHEN symbol = 'AMZN' THEN 155.00
        WHEN symbol = 'META' THEN 355.00
        WHEN symbol = 'NVDA' THEN 485.00
        WHEN symbol = 'SPY' THEN 455.00
        WHEN symbol = 'QQQ' THEN 385.00
        WHEN symbol = 'VTI' THEN 245.00
    END,
    CASE 
        WHEN symbol = 'BTC' THEN 44000.00
        WHEN symbol = 'ETH' THEN 3100.00
        WHEN symbol = 'USDT' THEN 0.99
        WHEN symbol = 'USDC' THEN 0.99
        WHEN symbol = 'BNB' THEN 310.00
        WHEN symbol = 'ADA' THEN 0.43
        WHEN symbol = 'SOL' THEN 92.00
        WHEN symbol = 'DOT' THEN 6.30
        WHEN symbol = 'DOGE' THEN 0.075
        WHEN symbol = 'AVAX' THEN 34.00
        WHEN symbol = 'AAPL' THEN 175.00
        WHEN symbol = 'GOOGL' THEN 2750.00
        WHEN symbol = 'MSFT' THEN 415.00
        WHEN symbol = 'TSLA' THEN 245.00
        WHEN symbol = 'AMZN' THEN 145.00
        WHEN symbol = 'META' THEN 345.00
        WHEN symbol = 'NVDA' THEN 475.00
        WHEN symbol = 'SPY' THEN 445.00
        WHEN symbol = 'QQQ' THEN 375.00
        WHEN symbol = 'VTI' THEN 235.00
    END
FROM assets
WHERE symbol IN ('BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'ADA', 'SOL', 'DOT', 'DOGE', 'AVAX', 
                 'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'SPY', 'QQQ', 'VTI')
ON CONFLICT (asset_id, timestamp) DO NOTHING;

-- Create a default admin user (password: admin123 - should be changed immediately)
-- Password hash for 'admin123' using bcrypt with 12 rounds
INSERT INTO users (email, username, password_hash, first_name, last_name, status, role, email_verified) VALUES
('admin@finainexus.com', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4KqXGQJQ7.', 'System', 'Administrator', 'active', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- Create a demo user (password: demo123)
-- Password hash for 'demo123' using bcrypt with 12 rounds
INSERT INTO users (email, username, password_hash, first_name, last_name, status, role, email_verified) VALUES
('demo@finainexus.com', 'demo', '$2b$12$rQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4KqXGQJQ7.', 'Demo', 'User', 'active', 'user', true)
ON CONFLICT (email) DO NOTHING;

-- Create user profiles for the demo users
INSERT INTO user_profiles (user_id, bio, timezone, language, currency, risk_tolerance, investment_goals)
SELECT 
    u.id,
    CASE 
        WHEN u.role = 'admin' THEN 'System administrator account'
        ELSE 'Demo user account for testing the platform'
    END,
    'UTC',
    'en',
    'USD',
    'moderate',
    ARRAY['Long-term growth', 'Diversification']
FROM users u
WHERE u.email IN ('admin@finainexus.com', 'demo@finainexus.com')
ON CONFLICT (user_id) DO NOTHING;

-- Create sample portfolios for demo user
INSERT INTO portfolios (user_id, name, description, initial_balance, current_balance, total_return, total_return_percentage)
SELECT 
    u.id,
    'My Crypto Portfolio',
    'Diversified cryptocurrency portfolio focusing on major coins',
    10000.00,
    11250.00,
    1250.00,
    12.50
FROM users u
WHERE u.email = 'demo@finainexus.com'
ON CONFLICT DO NOTHING;

INSERT INTO portfolios (user_id, name, description, initial_balance, current_balance, total_return, total_return_percentage)
SELECT 
    u.id,
    'Tech Stocks Portfolio',
    'Technology-focused stock portfolio',
    5000.00,
    5250.00,
    250.00,
    5.00
FROM users u
WHERE u.email = 'demo@finainexus.com'
ON CONFLICT DO NOTHING;

-- Create sample portfolio holdings for the crypto portfolio
INSERT INTO portfolio_holdings (portfolio_id, asset_id, quantity, average_cost, current_value, unrealized_pnl, unrealized_pnl_percentage)
SELECT 
    p.id,
    a.id,
    CASE 
        WHEN a.symbol = 'BTC' THEN 0.1
        WHEN a.symbol = 'ETH' THEN 2.0
        WHEN a.symbol = 'SOL' THEN 10.0
        WHEN a.symbol = 'ADA' THEN 1000.0
    END,
    CASE 
        WHEN a.symbol = 'BTC' THEN 42000.00
        WHEN a.symbol = 'ETH' THEN 3000.00
        WHEN a.symbol = 'SOL' THEN 90.00
        WHEN a.symbol = 'ADA' THEN 0.40
    END,
    CASE 
        WHEN a.symbol = 'BTC' THEN 4500.00
        WHEN a.symbol = 'ETH' THEN 6400.00
        WHEN a.symbol = 'SOL' THEN 950.00
        WHEN a.symbol = 'ADA' THEN 450.00
    END,
    CASE 
        WHEN a.symbol = 'BTC' THEN 300.00
        WHEN a.symbol = 'ETH' THEN 800.00
        WHEN a.symbol = 'SOL' THEN 50.00
        WHEN a.symbol = 'ADA' THEN 50.00
    END,
    CASE 
        WHEN a.symbol = 'BTC' THEN 7.14
        WHEN a.symbol = 'ETH' THEN 14.29
        WHEN a.symbol = 'SOL' THEN 5.56
        WHEN a.symbol = 'ADA' THEN 12.50
    END
FROM portfolios p
JOIN users u ON p.user_id = u.id
JOIN assets a ON a.symbol IN ('BTC', 'ETH', 'SOL', 'ADA')
WHERE u.email = 'demo@finainexus.com' AND p.name = 'My Crypto Portfolio'
ON CONFLICT (portfolio_id, asset_id) DO NOTHING;

-- Create sample portfolio holdings for the tech stocks portfolio
INSERT INTO portfolio_holdings (portfolio_id, asset_id, quantity, average_cost, current_value, unrealized_pnl, unrealized_pnl_percentage)
SELECT 
    p.id,
    a.id,
    CASE 
        WHEN a.symbol = 'AAPL' THEN 10.0
        WHEN a.symbol = 'GOOGL' THEN 1.0
        WHEN a.symbol = 'MSFT' THEN 5.0
        WHEN a.symbol = 'TSLA' THEN 2.0
    END,
    CASE 
        WHEN a.symbol = 'AAPL' THEN 175.00
        WHEN a.symbol = 'GOOGL' THEN 2750.00
        WHEN a.symbol = 'MSFT' THEN 415.00
        WHEN a.symbol = 'TSLA' THEN 245.00
    END,
    CASE 
        WHEN a.symbol = 'AAPL' THEN 1800.00
        WHEN a.symbol = 'GOOGL' THEN 2800.00
        WHEN a.symbol = 'MSFT' THEN 2100.00
        WHEN a.symbol = 'TSLA' THEN 500.00
    END,
    CASE 
        WHEN a.symbol = 'AAPL' THEN 50.00
        WHEN a.symbol = 'GOOGL' THEN 50.00
        WHEN a.symbol = 'MSFT' THEN 25.00
        WHEN a.symbol = 'TSLA' THEN 10.00
    END,
    CASE 
        WHEN a.symbol = 'AAPL' THEN 2.86
        WHEN a.symbol = 'GOOGL' THEN 1.82
        WHEN a.symbol = 'MSFT' THEN 1.20
        WHEN a.symbol = 'TSLA' THEN 2.04
    END
FROM portfolios p
JOIN users u ON p.user_id = u.id
JOIN assets a ON a.symbol IN ('AAPL', 'GOOGL', 'MSFT', 'TSLA')
WHERE u.email = 'demo@finainexus.com' AND p.name = 'Tech Stocks Portfolio'
ON CONFLICT (portfolio_id, asset_id) DO NOTHING;

-- Create sample notifications for demo user
INSERT INTO notifications (user_id, title, message, type, data)
SELECT 
    u.id,
    'Welcome to FinNexusAI!',
    'Welcome to your new financial management platform. Start by exploring your portfolio and creating new investment strategies.',
    'info',
    '{"category": "onboarding"}'
FROM users u
WHERE u.email = 'demo@finainexus.com'
ON CONFLICT DO NOTHING;

INSERT INTO notifications (user_id, title, message, type, data)
SELECT 
    u.id,
    'Portfolio Performance Update',
    'Your crypto portfolio has gained 12.5% this month. Great performance!',
    'success',
    '{"category": "performance", "portfolio_id": "crypto"}'
FROM users u
WHERE u.email = 'demo@finainexus.com'
ON CONFLICT DO NOTHING;
