-- ==========================================
-- CATEGORIES & BRANDS
-- ==========================================

-- ==========================================
-- 1. CATEGORIES TABLE
-- ==========================================

DROP TABLE IF EXISTS categories CASCADE;

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, icon, description) VALUES
  ('Sembako', '🌾', 'Bahan makanan pokok'),
  ('Snack', '🍪', 'Makanan ringan dan camilan'),
  ('Minuman', '🥤', 'Minuman kemasan dan segar'),
  ('Kebersihan', '🧼', 'Produk kebersihan dan sanitasi'),
  ('Elektronik', '📱', 'Perangkat elektronik'),
  ('Pakaian', '👕', 'Pakaian dan aksesoris'),
  ('Kesehatan', '💊', 'Produk kesehatan dan obat-obatan'),
  ('Lain-lain', '📦', 'Produk lainnya');

-- ==========================================
-- 2. BRANDS TABLE
-- ==========================================

DROP TABLE IF EXISTS brands CASCADE;

CREATE TABLE brands (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default brands
INSERT INTO brands (name, description) VALUES
  ('Indofood', 'Produsen makanan dan minuman'),
  ('Wings', 'Produsen produk rumah tangga'),
  ('Unilever', 'Produsen produk konsumen'),
  ('Nestle', 'Produsen makanan dan minuman'),
  ('Mayora', 'Produsen makanan ringan'),
  ('ABC', 'Produsen bumbu dan saus'),
  ('Indomie', 'Produsen mie instan'),
  ('Aqua', 'Produsen air mineral'),
  ('Coca-Cola', 'Produsen minuman'),
  ('Generic', 'Tanpa merek');

-- ==========================================
-- 3. UPDATE PRODUCTS TABLE
-- ==========================================

-- Add new columns if they don't exist
DO $$ 
BEGIN
  -- Add category_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE products ADD COLUMN category_id INTEGER;
  END IF;

  -- Add brand_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE products ADD COLUMN brand_id INTEGER;
  END IF;

  -- Add unit column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'unit'
  ) THEN
    ALTER TABLE products ADD COLUMN unit TEXT;
  END IF;

  -- Add unit_abbr column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'unit_abbr'
  ) THEN
    ALTER TABLE products ADD COLUMN unit_abbr TEXT;
  END IF;

  -- Add expiry_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'expiry_date'
  ) THEN
    ALTER TABLE products ADD COLUMN expiry_date DATE;
  END IF;
END $$;

-- Add foreign key constraints
DO $$ 
BEGIN
  -- Add category_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_category_id_fkey'
  ) THEN
    ALTER TABLE products 
    ADD CONSTRAINT products_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
  END IF;

  -- Add brand_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_brand_id_fkey'
  ) THEN
    ALTER TABLE products 
    ADD CONSTRAINT products_brand_id_fkey 
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);

-- ==========================================
-- 4. RLS POLICIES
-- ==========================================

-- Categories (read-only for all authenticated users)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "categories_select_policy" ON categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON categories;
DROP POLICY IF EXISTS "categories_update_policy" ON categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON categories;

-- Allow SELECT for all authenticated users
CREATE POLICY "categories_select_policy"
  ON categories FOR SELECT TO authenticated
  USING (true);

-- Allow INSERT for owner and admin
CREATE POLICY "categories_insert_policy"
  ON categories FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('owner', 'admin')
  );

-- Allow UPDATE for owner and admin
CREATE POLICY "categories_update_policy"
  ON categories FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('owner', 'admin')
  );

-- Allow DELETE for owner only
CREATE POLICY "categories_delete_policy"
  ON categories FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
  );

-- Brands (read-only for all authenticated users)
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "brands_select_policy" ON brands;
DROP POLICY IF EXISTS "brands_insert_policy" ON brands;
DROP POLICY IF EXISTS "brands_update_policy" ON brands;
DROP POLICY IF EXISTS "brands_delete_policy" ON brands;

-- Allow SELECT for all authenticated users
CREATE POLICY "brands_select_policy"
  ON brands FOR SELECT TO authenticated
  USING (true);

-- Allow INSERT for owner and admin
CREATE POLICY "brands_insert_policy"
  ON brands FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('owner', 'admin')
  );

-- Allow UPDATE for owner and admin
CREATE POLICY "brands_update_policy"
  ON brands FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('owner', 'admin')
  );

-- Allow DELETE for owner only
CREATE POLICY "brands_delete_policy"
  ON brands FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
  );

-- ==========================================
-- VERIFY
-- ==========================================

SELECT 'Tables created:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('categories', 'brands')
ORDER BY table_name;

SELECT 'Categories count:' as info, COUNT(*) as count FROM categories;
SELECT 'Brands count:' as info, COUNT(*) as count FROM brands;

SELECT 'Products columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('category_id', 'brand_id', 'unit', 'unit_abbr', 'expiry_date')
ORDER BY column_name;
