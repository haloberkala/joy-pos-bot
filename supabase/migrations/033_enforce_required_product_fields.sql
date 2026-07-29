-- Migration 033: Enforce Required Product Fields
-- This migration ensures all product fields that should be mandatory are set to NOT NULL

-- CONTEXT:
-- Previous migration (032) only handled master data relationships (category, main_product, unit, brand, variant, spec, size)
-- This migration enforces NOT NULL on operational fields: code, quantities, prices, min quantities

-- IMPORTANT - OVERSELLING BEHAVIOR:
-- The POS system allows negative stock (overselling) until Stock Opname is performed.
-- Therefore, quantity field must be NOT NULL but CAN BE NEGATIVE.
-- Example valid quantities: -15, -2, 0, 10, 100

-- REQUIRED FIELDS TO ENFORCE:
-- 1. code (Barcode/SKU) - every product must have unique identifier
-- 2. quantity (Stok Awal) - must track inventory, CAN BE NEGATIVE
-- 3. min_stock_alert (Stok Minimum) - for reorder alerts, must be >= 0
-- 4. cost_price (Harga Modal) - must know cost, must be >= 0
-- 5. selling_price_retail (Harga Jual Eceran) - must have retail price, must be >= 0
-- 6. selling_price_wholesale (Harga Jual Grosir) - must have wholesale price, must be >= 0
-- 7. wholesale_min_qty (Min. Qty Grosir) - wholesale quantity threshold, must be >= 0
-- 8. selling_price_special (Harga Jual Spesial) - must have special price, must be >= 0
-- 9. special_min_qty (Min. Qty Spesial) - special price quantity threshold, must be >= 0

-- Step 1: Update NULL values to safe defaults for existing data
UPDATE products 
SET 
  quantity = COALESCE(quantity, 0),
  min_stock_alert = COALESCE(min_stock_alert, 0),
  cost_price = COALESCE(cost_price, 0),
  selling_price_retail = COALESCE(selling_price_retail, 0),
  selling_price_wholesale = COALESCE(selling_price_wholesale, selling_price_retail, 0),
  wholesale_min_qty = COALESCE(wholesale_min_qty, 0),
  selling_price_special = COALESCE(selling_price_special, selling_price_retail, 0),
  special_min_qty = COALESCE(special_min_qty, 0)
WHERE 
  quantity IS NULL 
  OR min_stock_alert IS NULL
  OR cost_price IS NULL
  OR selling_price_retail IS NULL
  OR selling_price_wholesale IS NULL
  OR wholesale_min_qty IS NULL
  OR selling_price_special IS NULL
  OR special_min_qty IS NULL;

-- Step 2: Enforce NOT NULL constraints
-- code is already unique and should be NOT NULL
ALTER TABLE products ALTER COLUMN code SET NOT NULL;

-- Inventory fields
ALTER TABLE products ALTER COLUMN quantity SET NOT NULL;
ALTER TABLE products ALTER COLUMN min_stock_alert SET NOT NULL;

-- Price fields
ALTER TABLE products ALTER COLUMN cost_price SET NOT NULL;
ALTER TABLE products ALTER COLUMN selling_price_retail SET NOT NULL;
ALTER TABLE products ALTER COLUMN selling_price_wholesale SET NOT NULL;
ALTER TABLE products ALTER COLUMN selling_price_special SET NOT NULL;

-- Min quantity thresholds
ALTER TABLE products ALTER COLUMN wholesale_min_qty SET NOT NULL;
ALTER TABLE products ALTER COLUMN special_min_qty SET NOT NULL;

-- Step 3: Add constraints for price validation (prices should be >= 0)
ALTER TABLE products ADD CONSTRAINT products_cost_price_positive CHECK (cost_price >= 0);
ALTER TABLE products ADD CONSTRAINT products_retail_price_positive CHECK (selling_price_retail >= 0);
ALTER TABLE products ADD CONSTRAINT products_wholesale_price_positive CHECK (selling_price_wholesale >= 0);
ALTER TABLE products ADD CONSTRAINT products_special_price_positive CHECK (selling_price_special >= 0);

-- Step 4: Add constraints for non-negative fields (NOT including quantity - overselling allowed)
ALTER TABLE products ADD CONSTRAINT products_min_stock_non_negative CHECK (min_stock_alert >= 0);
ALTER TABLE products ADD CONSTRAINT products_wholesale_min_qty_non_negative CHECK (wholesale_min_qty >= 0);
ALTER TABLE products ADD CONSTRAINT products_special_min_qty_non_negative CHECK (special_min_qty >= 0);

-- NOTE: NO CHECK constraint on quantity field - negative stock is allowed (overselling)

-- Step 5: Update column comments for documentation
COMMENT ON COLUMN products.code IS 'REQUIRED - Unique barcode/SKU for the product';
COMMENT ON COLUMN products.quantity IS 'REQUIRED - Current stock quantity (can be negative for overselling)';
COMMENT ON COLUMN products.min_stock_alert IS 'REQUIRED - Minimum stock level for reorder alert (>= 0)';
COMMENT ON COLUMN products.cost_price IS 'REQUIRED - Product cost/purchase price (>= 0)';
COMMENT ON COLUMN products.selling_price_retail IS 'REQUIRED - Retail selling price (>= 0)';
COMMENT ON COLUMN products.selling_price_wholesale IS 'REQUIRED - Wholesale selling price (>= 0)';
COMMENT ON COLUMN products.wholesale_min_qty IS 'REQUIRED - Minimum quantity for wholesale price (>= 0)';
COMMENT ON COLUMN products.selling_price_special IS 'REQUIRED - Special/promotional selling price (>= 0)';
COMMENT ON COLUMN products.special_min_qty IS 'REQUIRED - Minimum quantity for special price (>= 0)';

-- Step 6: Verify final schema for all required fields
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN (
    'code', 'quantity', 'min_stock_alert', 
    'cost_price', 'selling_price_retail', 'selling_price_wholesale',
    'wholesale_min_qty', 'selling_price_special', 'special_min_qty'
  )
ORDER BY column_name;

-- Step 7: Verify constraints
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'products'::regclass
  AND conname LIKE 'products_%'
ORDER BY conname;

