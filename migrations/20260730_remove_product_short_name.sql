-- Migration: Remove products.short_name column
-- Date: 2026-07-30
-- Purpose: Make master data the single source of truth for short names
--          Product receipt names will be dynamically calculated from master data

-- CRITICAL: products.name remains unchanged (snapshot for history/audit)
-- Only products.short_name is removed

BEGIN;

-- Drop the short_name column from products table
ALTER TABLE products DROP COLUMN IF EXISTS short_name;

-- Verify the column is removed
-- You can check with: \d products (in psql) or SELECT * FROM information_schema.columns WHERE table_name = 'products';

COMMIT;

-- Notes:
-- 1. products.name is preserved - it's a snapshot of the full product name
-- 2. Receipt names will be dynamically calculated using generateProductShortName()
-- 3. This change makes master data (categories, brands, main_products, etc.) the single source of truth
-- 4. When admins update master.short_name, all products immediately reflect the change in UI/receipts
