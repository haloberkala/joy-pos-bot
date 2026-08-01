-- Migration: Add Index for Product Duplicate Detection Performance
-- Date: 2026-08-01
-- Purpose: Optimize duplicate product validation by master data combination
--
-- This index significantly improves performance for:
-- 1. Duplicate product detection (Brand + MainProduct + Variant + Spec + Size)
-- 2. Product search by master data combination
-- 3. Validation queries in BulkProductModal and ImportProductModal
--
-- Expected Performance Improvement:
-- - Before: Sequential scan (~100-500ms for 10k products)
-- - After: Index scan (~5-20ms for 10k products)
-- - Improvement: 10-50x faster

-- ═══════════════════════════════════════════════════════════════════
-- CREATE INDEX FOR DUPLICATE DETECTION
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_products_master_data_combination
ON products (
    store_id,
    brand_id,
    main_product_id,
    variant_id,
    specification_id,
    size_id
)
WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════

COMMENT ON INDEX idx_products_master_data_combination IS 
'Composite index for fast duplicate product detection by master data combination. Used by validation layer to prevent duplicate products with same Brand+MainProduct+Variant+Specification+Size.';

-- ═══════════════════════════════════════════════════════════════════
-- VERIFICATION QUERY
-- ═══════════════════════════════════════════════════════════════════

-- Run this query to verify index is being used:
-- EXPLAIN ANALYZE
-- SELECT id, name, code, quantity, selling_price_retail
-- FROM products
-- WHERE store_id = 1
--   AND brand_id = 1
--   AND main_product_id = 2
--   AND variant_id IS NULL
--   AND specification_id IS NULL
--   AND size_id = 3
--   AND is_active = true;

-- Expected: "Index Scan using idx_products_master_data_combination"

-- ═══════════════════════════════════════════════════════════════════
-- ROLLBACK (if needed)
-- ═══════════════════════════════════════════════════════════════════

-- To rollback this migration:
-- DROP INDEX IF EXISTS idx_products_master_data_combination;
