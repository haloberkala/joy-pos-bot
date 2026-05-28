-- ==========================================
-- MIGRATION 016: INDEPENDENT CATEGORY & BRAND
-- ==========================================

-- This migration removes the direct relationship between categories and brands
-- making them independent master data that only connect at the product level

-- ==========================================
-- 1. REMOVE CATEGORY_ID FROM BRANDS
-- ==========================================

-- Drop the foreign key constraint
ALTER TABLE brands DROP CONSTRAINT IF EXISTS brands_category_id_fkey;

-- Drop the column
ALTER TABLE brands DROP COLUMN IF EXISTS category_id;

-- ==========================================
-- 2. VERIFY STRUCTURE
-- ==========================================

-- Check brands table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'brands'
ORDER BY ordinal_position;

-- Check categories table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;

-- Check products table structure (should still have both category_id and brand_id)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('category_id', 'brand_id')
ORDER BY ordinal_position;

SELECT '=== MIGRATION 016 COMPLETE ===' as info;
SELECT 'Categories and Brands are now independent master data' as info;
SELECT 'They only connect at the product level via products.category_id and products.brand_id' as info;
