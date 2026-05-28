-- ==========================================
-- INIT DATABASE - STORES & EMPLOYEES
-- ==========================================

-- ==========================================
-- 1. STORES TABLE
-- ==========================================

DROP TABLE IF EXISTS stores CASCADE;

CREATE TABLE stores (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stores_name ON stores(name);

-- RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stores_select_policy"
  ON stores FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "stores_insert_policy"
  ON stores FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'owner');

CREATE POLICY "stores_update_policy"
  ON stores FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'owner')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'owner');

CREATE POLICY "stores_delete_policy"
  ON stores FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'owner');

-- Trigger
CREATE OR REPLACE FUNCTION update_stores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_stores_updated_at();

-- Demo data
INSERT INTO stores (id, name, address, phone) VALUES
  (1, 'Toko Berkah - Bangunan', 'Jl. Merdeka No. 123, Banjarmasin', '0511-12345678'),
  (2, 'Toko Berkah - Makanan', 'Jl. Sudirman No. 456, Banjarmasin', '0511-87654321'),
  (3, 'Toko Berkah - Elektronik', 'Jl. Gatot Subroto No. 789, Banjarmasin', '0511-11223344');

SELECT setval('stores_id_seq', (SELECT MAX(id) FROM stores));

-- ==========================================
-- 2. EMPLOYEES TABLE
-- ==========================================

DROP TABLE IF EXISTS employees CASCADE;

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_employees_store_id ON employees(store_id);
CREATE INDEX idx_employees_username ON employees(username);
CREATE INDEX idx_employees_role ON employees(role);

-- RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees_select_policy"
  ON employees FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

CREATE POLICY "employees_insert_policy"
  ON employees FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

CREATE POLICY "employees_update_policy"
  ON employees FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

CREATE POLICY "employees_delete_policy"
  ON employees FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

-- Trigger
CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_employees_updated_at();

-- Demo data
INSERT INTO employees (store_id, username, name, phone, role, is_active) VALUES
  (1, 'admin1', 'Budi Admin', '0812-1111-1111', 'admin', true),
  (1, 'kasir1', 'Siti Kasir', '0812-2222-2222', 'cashier', true),
  (2, 'admin2', 'Andi Admin', '0812-3333-3333', 'admin', true),
  (2, 'kasir2', 'Dewi Kasir', '0812-4444-4444', 'cashier', true),
  (3, 'admin3', 'Rudi Admin', '0812-5555-5555', 'admin', true),
  (3, 'kasir3', 'Maya Kasir', '0812-6666-6666', 'cashier', true);

-- ==========================================
-- VERIFY
-- ==========================================

SELECT 'Stores:' as info;
SELECT id, name FROM stores ORDER BY id;

SELECT 'Employees:' as info;
SELECT e.username, e.name, e.role, s.name as store_name
FROM employees e
LEFT JOIN stores s ON e.store_id = s.id
ORDER BY e.store_id, e.role;
