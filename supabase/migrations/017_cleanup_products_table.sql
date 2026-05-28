-- ==========================================
-- MIGRATION 017: CLEANUP PRODUCTS TABLE
-- ==========================================

-- Remove deprecated and unused columns from products table

-- ==========================================
-- 1. DROP DEPRECATED COLUMNS
-- ==========================================

-- Drop old text-based unit columns (replaced by unit_id FK)
ALTER TABLE products DROP COLUMN IF EXISTS unit;
ALTER TABLE products DROP COLUMN IF EXISTS unit_abbr;

-- Drop old text-based category column (replaced by category_id FK)
ALTER TABLE products DROP COLUMN IF EXISTS category;

-- Drop expiry_date column (not needed for this POS system)
ALTER TABLE products DROP COLUMN IF EXISTS expiry_date;

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

SELECT '=== MIGRATION 017 COMPLETE ===' as info;
SELECT 'Removed deprecated columns: unit, unit_abbr, category, expiry_date' as info;
SELECT 'Products table now uses only: unit_id, category_id, brand_id (FK relationships)' as info;
