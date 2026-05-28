-- ==========================================
-- SALES & TRANSACTIONS
-- ==========================================

-- ==========================================
-- 1. SALES TABLE
-- ==========================================

DROP TABLE IF EXISTS sales CASCADE;

CREATE TABLE sales (
  id BIGSERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sub_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax DECIMAL(15,2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(15,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'qris', 'debt')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'debt', 'partial', 'refunded')),
  amount_received DECIMAL(15,2) NOT NULL DEFAULT 0,
  change_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  due_date DATE,
  note TEXT,
  cashier_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_store_id ON sales(store_id);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX idx_sales_sale_date ON sales(sale_date);
CREATE INDEX idx_sales_payment_status ON sales(payment_status);

-- RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_select_policy"
  ON sales FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

CREATE POLICY "sales_insert_policy"
  ON sales FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'cashier')
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

CREATE POLICY "sales_update_policy"
  ON sales FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

-- Trigger
CREATE OR REPLACE FUNCTION update_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_updated_at();

-- ==========================================
-- 2. SALE ITEMS TABLE
-- ==========================================

DROP TABLE IF EXISTS sale_items CASCADE;

CREATE TABLE sale_items (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_code TEXT,
  quantity INTEGER NOT NULL,
  price_per_unit DECIMAL(15,2) NOT NULL,
  cost_per_unit DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(15,2) NOT NULL,
  price_mode TEXT CHECK (price_mode IN ('retail', 'wholesale', 'special')),
  is_service BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);

-- RLS
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sale_items_select_policy"
  ON sale_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_items.sale_id
      AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
        OR
        s.store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
      )
    )
  );

CREATE POLICY "sale_items_insert_policy"
  ON sale_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_items.sale_id
      AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
        OR
        (
          (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'cashier')
          AND s.store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
        )
      )
    )
  );

-- ==========================================
-- 3. SHIPMENTS TABLE
-- ==========================================

DROP TABLE IF EXISTS shipments CASCADE;

CREATE TABLE shipments (
  id BIGSERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sale_id BIGINT REFERENCES sales(id) ON DELETE SET NULL,
  invoice_number TEXT,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  items_description TEXT,
  shipping_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shipments_store_id ON shipments(store_id);
CREATE INDEX idx_shipments_sale_id ON shipments(sale_id);

-- RLS
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shipments_select_policy"
  ON shipments FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

CREATE POLICY "shipments_insert_policy"
  ON shipments FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'cashier')
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

CREATE POLICY "shipments_update_policy"
  ON shipments FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'cashier')
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

-- Trigger
CREATE OR REPLACE FUNCTION update_shipments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_shipments_updated_at();

-- ==========================================
-- VERIFY
-- ==========================================

SELECT 'Tables created:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sales', 'sale_items', 'shipments')
ORDER BY table_name;
