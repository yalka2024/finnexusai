-- Migration: 013_perpetuals_contracts
-- Generated: 2025-09-21T18:24:38.159Z

-- Placeholder migration content
-- TODO: Implement specific migration logic for 013_perpetuals_contracts

CREATE TABLE IF NOT EXISTS perpetuals_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add specific implementation here
SELECT 'Migration 013 executed successfully' as result;