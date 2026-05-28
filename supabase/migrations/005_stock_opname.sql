-- ==========================================
-- STOCK OPNAME
-- ==========================================

-- ==========================================
-- 1. STOCK OPNAMES TABLE
-- ==========================================

DROP TABLE IF EXISTS stock_opnames CASCADE;

CREATE TABLE stock_opnames (
  id BIGSERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  opname_number TEXT NOT NULL UNIQUE,
  opname_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_opnames_store_id ON stock_opnames(store_id);
CREATE INDEX idx_stock_opnames_opname_number ON stock_opnames(opname_number);
CREATE INDEX idx_stock_opnames_status ON stock_opnames(status);

-- RLS
ALTER TABLE stock_opnames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_opnames_select_policy"
  ON stock_opnames FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

CREATE POLICY "stock_opnames_insert_policy"
  ON stock_opnames FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin')
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

CREATE POLICY "stock_opnames_update_policy"
  ON stock_opnames FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

-- Trigger
CREATE OR REPLACE FUNCTION update_stock_opnames_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_opnames_updated_at
  BEFORE UPDATE ON stock_opnames
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_opnames_updated_at();

-- ==========================================
-- 2. STOCK OPNAME ITEMS TABLE
-- ==========================================

DROP TABLE IF EXISTS stock_opname_items CASCADE;

CREATE TABLE stock_opname_items (
  id BIGSERIAL PRIMARY KEY,
  opname_id BIGINT NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  system_stock INTEGER NOT NULL,
  physical_stock INTEGER NOT NULL,
  difference INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_opname_items_opname_id ON stock_opname_items(opname_id);
CREATE INDEX idx_stock_opname_items_product_id ON stock_opname_items(product_id);

-- RLS
ALTER TABLE stock_opname_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_opname_items_select_policy"
  ON stock_opname_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stock_opnames so
      WHERE so.id = stock_opname_items.opname_id
      AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
        OR
        so.store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
      )
    )
  );

CREATE POLICY "stock_opname_items_insert_policy"
  ON stock_opname_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stock_opnames so
      WHERE so.id = stock_opname_items.opname_id
      AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
        OR
        (
          (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
          AND so.store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
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
AND table_name IN ('stock_opnames', 'stock_opname_items')
ORDER BY table_name;
