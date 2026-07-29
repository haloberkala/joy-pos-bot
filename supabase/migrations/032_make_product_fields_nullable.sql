-- Migration 032: Make Product Optional Fields Nullable

-- REQUIRED FIELDS (NOT NULL):
-- - category_id (must have a category)
-- - main_product_id (must have a main product name)
-- - unit_id (must have a unit of measurement)

-- OPTIONAL FIELDS (NULLABLE):
-- - brand_id (not all products have brands, e.g., generic nails)
-- - variant_id (optional variant)
-- - specification_id (optional specification)
-- - size_id (optional size/content)

-- 1. Ensure optional fields are nullable (drop NOT NULL if exists)
ALTER TABLE products ALTER COLUMN brand_id DROP NOT NULL IF EXISTS;
ALTER TABLE products ALTER COLUMN variant_id DROP NOT NULL IF EXISTS;
ALTER TABLE products ALTER COLUMN specification_id DROP NOT NULL IF EXISTS;
ALTER TABLE products ALTER COLUMN size_id DROP NOT NULL IF EXISTS;

-- 2. Ensure required fields are NOT NULL
-- First, update any existing NULL values to a default (if any exist)
-- For category_id: if NULL, we cannot fix automatically - must be handled manually
-- For main_product_id: if NULL, we cannot fix automatically - must be handled manually
-- For unit_id: if NULL, we cannot fix automatically - must be handled manually

-- Check if there are NULL values before enforcing NOT NULL
DO $$ 
BEGIN
  -- Only set NOT NULL if no NULL values exist
  IF NOT EXISTS (SELECT 1 FROM products WHERE category_id IS NULL LIMIT 1) THEN
    ALTER TABLE products ALTER COLUMN category_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'WARNING: category_id has NULL values. Please fix data before enforcing NOT NULL.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM products WHERE main_product_id IS NULL LIMIT 1) THEN
    ALTER TABLE products ALTER COLUMN main_product_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'WARNING: main_product_id has NULL values. Please fix data before enforcing NOT NULL.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM products WHERE unit_id IS NULL LIMIT 1) THEN
    ALTER TABLE products ALTER COLUMN unit_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'WARNING: unit_id has NULL values. Please fix data before enforcing NOT NULL.';
  END IF;
END $$;

-- 3. Add documentation comments
COMMENT ON COLUMN products.category_id IS 'REQUIRED - Category of the product';
COMMENT ON COLUMN products.main_product_id IS 'REQUIRED - Main product name/type';
COMMENT ON COLUMN products.unit_id IS 'REQUIRED - Unit of measurement';
COMMENT ON COLUMN products.brand_id IS 'OPTIONAL - Brand (nullable for generic products)';
COMMENT ON COLUMN products.variant_id IS 'OPTIONAL - Variant specification (nullable)';
COMMENT ON COLUMN products.specification_id IS 'OPTIONAL - Additional specification (nullable)';
COMMENT ON COLUMN products.size_id IS 'OPTIONAL - Size or content amount (nullable)';

-- 4. Verify final schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('category_id', 'brand_id', 'main_product_id', 'variant_id', 'specification_id', 'size_id', 'unit_id')
ORDER BY column_name;
