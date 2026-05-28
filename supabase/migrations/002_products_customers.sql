-- ==========================================
-- PRODUCTS & CUSTOMERS
-- ==========================================

-- ==========================================
-- 1. PRODUCTS TABLE
-- ==========================================

DROP TABLE IF EXISTS products CASCADE;

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_alert INTEGER DEFAULT 5,
  cost_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  selling_price_retail DECIMAL(15,2) NOT NULL,
  selling_price_wholesale DECIMAL(15,2) NOT NULL,
  selling_price_special DECIMAL(15,2) NOT NULL,
  wholesale_min_qty INTEGER DEFAULT 10,
  special_min_qty INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, code)
);

CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category);

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select_policy"
  ON products FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

CREATE POLICY "products_insert_policy"
  ON products FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

CREATE POLICY "products_update_policy"
  ON products FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

CREATE POLICY "products_delete_policy"
  ON products FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

-- Trigger
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- Demo data (Toko 1 - Bangunan)
INSERT INTO products (store_id, code, name, category, quantity, cost_price, selling_price_retail, selling_price_wholesale, selling_price_special) VALUES
  (1, 'SMN001', 'Semen Gresik 50kg', 'Semen', 100, 55000, 65000, 62000, 60000),
  (1, 'PSR001', 'Pasir Cor 1 Truk', 'Pasir', 50, 800000, 950000, 900000, 850000),
  (1, 'BTU001', 'Batu Bata Merah', 'Bata', 5000, 800, 1000, 950, 900),
  (1, 'CTM001', 'Cat Tembok Avian 5kg', 'Cat', 30, 180000, 220000, 210000, 200000),
  (1, 'BSI001', 'Besi Beton 10mm', 'Besi', 200, 85000, 105000, 100000, 95000);

-- Demo data (Toko 2 - Makanan)
INSERT INTO products (store_id, code, name, category, quantity, cost_price, selling_price_retail, selling_price_wholesale, selling_price_special) VALUES
  (2, 'BRS001', 'Beras Premium 5kg', 'Beras', 100, 55000, 65000, 62000, 60000),
  (2, 'MYK001', 'Minyak Goreng 2L', 'Minyak', 80, 28000, 35000, 33000, 31000),
  (2, 'GLA001', 'Gula Pasir 1kg', 'Gula', 150, 12000, 15000, 14000, 13000),
  (2, 'TPG001', 'Tepung Terigu 1kg', 'Tepung', 120, 9000, 12000, 11000, 10000),
  (2, 'TLR001', 'Telur Ayam 1kg', 'Telur', 200, 25000, 30000, 28000, 27000);

-- Demo data (Toko 3 - Elektronik)
INSERT INTO products (store_id, code, name, category, quantity, cost_price, selling_price_retail, selling_price_wholesale, selling_price_special) VALUES
  (3, 'HP001', 'HP Samsung A54', 'Handphone', 10, 4500000, 5200000, 5000000, 4800000),
  (3, 'LP001', 'Laptop Asus Vivobook', 'Laptop', 5, 6500000, 7500000, 7200000, 7000000),
  (3, 'TV001', 'TV LED 32 inch', 'TV', 8, 1800000, 2200000, 2100000, 2000000),
  (3, 'KB001', 'Kabel HDMI 2m', 'Aksesoris', 50, 25000, 40000, 35000, 30000),
  (3, 'CH001', 'Charger Fast Charging', 'Aksesoris', 100, 35000, 50000, 45000, 40000);

-- ==========================================
-- 2. CUSTOMERS TABLE
-- ==========================================

DROP TABLE IF EXISTS customers CASCADE;

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_store_id ON customers(store_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers(name);

-- RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select_policy"
  ON customers FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

CREATE POLICY "customers_insert_policy"
  ON customers FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'cashier')
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

CREATE POLICY "customers_update_policy"
  ON customers FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'cashier')
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

CREATE POLICY "customers_delete_policy"
  ON customers FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

-- Trigger
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- Demo data
INSERT INTO customers (store_id, name, phone, address) VALUES
  (1, 'Toko Maju Jaya', '0812-1111-1111', 'Jl. Pasar No. 10'),
  (1, 'CV Berkah Abadi', '0812-2222-2222', 'Jl. Industri No. 25'),
  (2, 'Warung Ibu Siti', '0812-3333-3333', 'Jl. Raya No. 15'),
  (2, 'Toko Sembako Makmur', '0812-4444-4444', 'Jl. Pasar Baru No. 8'),
  (3, 'Toko Elektronik Jaya', '0812-5555-5555', 'Jl. Sudirman No. 100'),
  (3, 'CV Teknologi Maju', '0812-6666-6666', 'Jl. Ahmad Yani No. 50');

-- ==========================================
-- VERIFY
-- ==========================================

SELECT 'Products:' as info;
SELECT p.code, p.name, p.category, s.name as store_name, p.quantity, p.selling_price_retail
FROM products p
LEFT JOIN stores s ON p.store_id = s.id
ORDER BY p.store_id, p.category, p.name
LIMIT 10;

SELECT 'Customers:' as info;
SELECT c.name, c.phone, s.name as store_name
FROM customers c
LEFT JOIN stores s ON c.store_id = s.id
ORDER BY c.store_id, c.name;
