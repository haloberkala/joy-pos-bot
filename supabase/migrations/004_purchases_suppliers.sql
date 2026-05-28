-- ==========================================
-- PURCHASES & SUPPLIERS
-- ==========================================

-- ==========================================
-- 1. SUPPLIERS TABLE
-- ==========================================

DROP TABLE IF EXISTS suppliers CASCADE;

CREATE TABLE suppliers (
  id BIGSERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_store_id ON suppliers(store_id);

-- RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_select_policy"
  ON suppliers FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

CREATE POLICY "suppliers_insert_policy"
  ON suppliers FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin')
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

CREATE POLICY "suppliers_update_policy"
  ON suppliers FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

CREATE POLICY "suppliers_delete_policy"
  ON suppliers FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

-- Trigger
CREATE OR REPLACE FUNCTION update_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_suppliers_updated_at();

-- ==========================================
-- 2. PURCHASES TABLE
-- ==========================================

DROP TABLE IF EXISTS purchases CASCADE;

CREATE TABLE purchases (
  id BIGSERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  reference_no TEXT NOT NULL UNIQUE,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  image_proof TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchases_store_id ON purchases(store_id);
CREATE INDEX idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX idx_purchases_reference_no ON purchases(reference_no);
CREATE INDEX idx_purchases_purchase_date ON purchases(purchase_date);

-- RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchases_select_policy"
  ON purchases FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

CREATE POLICY "purchases_insert_policy"
  ON purchases FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'cashier')
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

CREATE POLICY "purchases_update_policy"
  ON purchases FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

-- Trigger
CREATE OR REPLACE FUNCTION update_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_purchases_updated_at();

-- ==========================================
-- 3. PURCHASE ITEMS TABLE
-- ==========================================

DROP TABLE IF EXISTS purchase_items CASCADE;

CREATE TABLE purchase_items (
  id BIGSERIAL PRIMARY KEY,
  purchase_id BIGINT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_code TEXT,
  quantity INTEGER NOT NULL,
  cost_price DECIMAL(15,2) NOT NULL,
  sub_total DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product_id ON purchase_items(product_id);

-- RLS
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_items_select_policy"
  ON purchase_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchases p
      WHERE p.id = purchase_items.purchase_id
      AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
        OR
        p.store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
      )
    )
  );

CREATE POLICY "purchase_items_insert_policy"
  ON purchase_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchases p
      WHERE p.id = purchase_items.purchase_id
      AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
        OR
        (
          (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'cashier')
          AND p.store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
        )
      )
    )
  );

-- ==========================================
-- VERIFY
-- ==========================================

SELECT 'Tables created:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('suppliers', 'purchases', 'purchase_items')
ORDER BY table_name;
