-- ==========================================
-- MIGRATION 018: REMOVE MIN QTY COLUMNS
-- ==========================================

-- Remove wholesale_min_qty and special_min_qty columns from products table
-- This POS system uses "Manual Select Price Tier" where cashier manually selects
-- the price tier (Retail/Wholesale/Special) during transaction, not based on quantity

-- ==========================================
-- 1. DROP MIN QTY COLUMNS
-- ==========================================

-- Drop wholesale minimum quantity column
ALTER TABLE products DROP COLUMN IF EXISTS wholesale_min_qty;

-- Drop special minimum quantity column
ALTER TABLE products DROP COLUMN IF EXISTS special_min_qty;

-- ==========================================
-- 2. VERIFY FINAL STRUCTURE
-- ==========================================

-- Check products table structure after cleanup
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

SELECT '=== MIGRATION 018 COMPLETE ===' as info;
SELECT 'Removed columns: wholesale_min_qty, special_min_qty' as info;
SELECT 'Price tiers (Retail/Wholesale/Special) are now manually selected by cashier' as info;
SELECT 'No automatic price tier selection based on quantity' as info;
