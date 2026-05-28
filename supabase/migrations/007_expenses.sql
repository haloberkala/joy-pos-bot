-- ==========================================
-- EXPENSES (PENGELUARAN)
-- ==========================================

-- ==========================================
-- 1. EXPENSE CATEGORIES TABLE
-- ==========================================

DROP TABLE IF EXISTS expense_categories CASCADE;

CREATE TABLE expense_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO expense_categories (name, description) VALUES
  ('Gaji Karyawan', 'Pembayaran gaji dan tunjangan karyawan'),
  ('Sewa Toko', 'Biaya sewa tempat usaha'),
  ('Listrik & Air', 'Tagihan utilitas'),
  ('Transportasi', 'Biaya transportasi dan pengiriman'),
  ('Perlengkapan', 'Pembelian perlengkapan toko'),
  ('Promosi & Marketing', 'Biaya iklan dan promosi'),
  ('Pajak', 'Pembayaran pajak'),
  ('Lain-lain', 'Pengeluaran lainnya');

-- ==========================================
-- 2. EXPENSES TABLE
-- ==========================================

DROP TABLE IF EXISTS expenses CASCADE;

CREATE TABLE expenses (
  id BIGSERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES expense_categories(id),
  title TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_store_id ON expenses(store_id);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);

-- RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_select_policy"
  ON expenses FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

CREATE POLICY "expenses_insert_policy"
  ON expenses FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin')
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

CREATE POLICY "expenses_update_policy"
  ON expenses FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

CREATE POLICY "expenses_delete_policy"
  ON expenses FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

-- Trigger
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expenses_updated_at();

-- RLS for expense_categories (read-only for all authenticated users)
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_categories_select_policy"
  ON expense_categories FOR SELECT TO authenticated
  USING (true);

-- ==========================================
-- VERIFY
-- ==========================================

SELECT 'Tables created:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('expense_categories', 'expenses')
ORDER BY table_name;
