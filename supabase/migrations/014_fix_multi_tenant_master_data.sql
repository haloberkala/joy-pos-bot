-- ==========================================
-- FIX MULTI-TENANT MASTER DATA & UNIT STANDARDIZATION
-- Migration 014
-- ==========================================

-- ==========================================
-- 1. ADD store_id TO categories TABLE
-- ==========================================

-- Add store_id column to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS store_id INTEGER;

-- Add foreign key constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'categories_store_id_fkey'
  ) THEN
    ALTER TABLE categories 
    ADD CONSTRAINT categories_store_id_fkey 
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON categories(store_id);

-- Update existing categories to have NULL store_id (will be set by stores)
-- Note: Existing default categories will remain with NULL store_id for backward compatibility

-- ==========================================
-- 2. ADD store_id TO brands TABLE
-- ==========================================

-- Add store_id column to brands
ALTER TABLE brands ADD COLUMN IF NOT EXISTS store_id INTEGER;

-- Remove UNIQUE constraint from name (brands can have same name across stores)
ALTER TABLE brands DROP CONSTRAINT IF EXISTS brands_name_key;

-- Add composite unique constraint (name + store_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'brands_name_store_id_unique'
  ) THEN
    ALTER TABLE brands 
    ADD CONSTRAINT brands_name_store_id_unique 
    UNIQUE (name, store_id);
  END IF;
END $$;

-- Add foreign key constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'brands_store_id_fkey'
  ) THEN
    ALTER TABLE brands 
    ADD CONSTRAINT brands_store_id_fkey 
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_brands_store_id ON brands(store_id);

-- Add category_id column if not exists (for brand-category relation)
ALTER TABLE brands ADD COLUMN IF NOT EXISTS category_id INTEGER;

-- Add foreign key for category_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'brands_category_id_fkey'
  ) THEN
    ALTER TABLE brands 
    ADD CONSTRAINT brands_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ==========================================
-- 3. CREATE units TABLE (NEW)
-- ==========================================

DROP TABLE IF EXISTS units CASCADE;

CREATE TABLE units (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Pieces", "Kilogram", "Liter", "Box"
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT units_name_store_id_unique UNIQUE (name, store_id)
);

-- Create index for better query performance
CREATE INDEX idx_units_store_id ON units(store_id);

-- Insert default units (will be NULL store_id for seeding purposes)
-- Each store should create their own units
INSERT INTO units (store_id, name, description) 
SELECT 
  s.id,
  u.name,
  u.description
FROM stores s
CROSS JOIN (
  VALUES 
    ('Pcs', 'Pieces / Satuan'),
    ('Box', 'Box / Kotak'),
    ('Kg', 'Kilogram'),
    ('Gram', 'Gram'),
    ('Liter', 'Liter'),
    ('Ml', 'Mililiter'),
    ('Pack', 'Pack / Bungkus'),
    ('Lusin', 'Lusin (12 pcs)'),
    ('Karton', 'Karton'),
    ('Botol', 'Botol'),
    ('Kaleng', 'Kaleng'),
    ('Cup', 'Cup / Gelas')
) AS u(name, description)
ON CONFLICT (name, store_id) DO NOTHING;

-- ==========================================
-- 4. UPDATE products TABLE
-- ==========================================

-- Add unit_id column to products (will replace unit text field)
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_id INTEGER;

-- Add foreign key constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_unit_id_fkey'
  ) THEN
    ALTER TABLE products 
    ADD CONSTRAINT products_unit_id_fkey 
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS idx_products_unit_id ON products(unit_id);

-- Migrate existing unit text data to unit_id (best effort)
-- This will try to match existing unit text with unit names
UPDATE products p
SET unit_id = u.id
FROM units u
WHERE p.store_id = u.store_id
  AND LOWER(TRIM(p.unit)) = LOWER(u.name)
  AND p.unit_id IS NULL
  AND p.unit IS NOT NULL;

-- Note: unit and unit_abbr columns will be kept for backward compatibility
-- but should not be used in new code. Use unit_id instead.

-- ==========================================
-- 5. UPDATE RLS POLICIES FOR categories
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "categories_select_policy" ON categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON categories;
DROP POLICY IF EXISTS "categories_update_policy" ON categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON categories;

-- SELECT: Users can only see categories from their store
CREATE POLICY "categories_select_policy"
  ON categories FOR SELECT TO authenticated
  USING (
    store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

-- INSERT: Owner and Admin can create categories for their store
CREATE POLICY "categories_insert_policy"
  ON categories FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('owner', 'admin')
    AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

-- UPDATE: Owner and Admin can update categories from their store
CREATE POLICY "categories_update_policy"
  ON categories FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('owner', 'admin')
    AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

-- DELETE: Owner can delete categories from their store
CREATE POLICY "categories_delete_policy"
  ON categories FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

-- ==========================================
-- 6. UPDATE RLS POLICIES FOR brands
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "brands_select_policy" ON brands;
DROP POLICY IF EXISTS "brands_insert_policy" ON brands;
DROP POLICY IF EXISTS "brands_update_policy" ON brands;
DROP POLICY IF EXISTS "brands_delete_policy" ON brands;

-- SELECT: Users can only see brands from their store
CREATE POLICY "brands_select_policy"
  ON brands FOR SELECT TO authenticated
  USING (
    store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

-- INSERT: Owner and Admin can create brands for their store
CREATE POLICY "brands_insert_policy"
  ON brands FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('owner', 'admin')
    AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

-- UPDATE: Owner and Admin can update brands from their store
CREATE POLICY "brands_update_policy"
  ON brands FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('owner', 'admin')
    AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

-- DELETE: Owner can delete brands from their store
CREATE POLICY "brands_delete_policy"
  ON brands FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

-- ==========================================
-- 7. CREATE RLS POLICIES FOR units
-- ==========================================

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can only see units from their store
CREATE POLICY "units_select_policy"
  ON units FOR SELECT TO authenticated
  USING (
    store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

-- INSERT: Owner and Admin can create units for their store
CREATE POLICY "units_insert_policy"
  ON units FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('owner', 'admin')
    AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

-- UPDATE: Owner and Admin can update units from their store
CREATE POLICY "units_update_policy"
  ON units FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('owner', 'admin')
    AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

-- DELETE: Owner can delete units from their store
CREATE POLICY "units_delete_policy"
  ON units FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

-- ==========================================
-- 8. HELPER FUNCTIONS
-- ==========================================

-- Function to get user's store_id from JWT
CREATE OR REPLACE FUNCTION get_user_store_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has role
CREATE OR REPLACE FUNCTION user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'user_metadata' ->> 'role') = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has any of the roles
CREATE OR REPLACE FUNCTION user_has_any_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'user_metadata' ->> 'role') = ANY(required_roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 9. VERIFICATION
-- ==========================================

SELECT '=== MIGRATION 014 VERIFICATION ===' as info;

SELECT 'Categories table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'categories' 
AND column_name IN ('id', 'name', 'store_id')
ORDER BY ordinal_position;

SELECT 'Brands table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'brands' 
AND column_name IN ('id', 'name', 'store_id', 'category_id')
ORDER BY ordinal_position;

SELECT 'Units table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'units'
ORDER BY ordinal_position;

SELECT 'Products table - unit columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('unit', 'unit_abbr', 'unit_id')
ORDER BY ordinal_position;

SELECT 'Units count per store:' as info;
SELECT s.name as store_name, COUNT(u.id) as units_count
FROM stores s
LEFT JOIN units u ON u.store_id = s.id
GROUP BY s.id, s.name
ORDER BY s.name;

SELECT '=== MIGRATION 014 COMPLETE ===' as info;
