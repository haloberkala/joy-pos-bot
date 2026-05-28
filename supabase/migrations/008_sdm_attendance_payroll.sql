-- ==========================================
-- SDM: ATTENDANCE & PAYROLL
-- ==========================================

-- ==========================================
-- 1. ATTENDANCES TABLE
-- ==========================================

DROP TABLE IF EXISTS attendances CASCADE;

CREATE TABLE attendances (
  id BIGSERIAL PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  clock_in TIME,
  clock_out TIME,
  duration_minutes INTEGER,
  status TEXT NOT NULL CHECK (status IN ('hadir', 'alpha', 'izin', 'sakit', 'cuti')),
  note TEXT,
  is_manual_edit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, attendance_date)
);

CREATE INDEX idx_attendances_employee_id ON attendances(employee_id);
CREATE INDEX idx_attendances_store_id ON attendances(store_id);
CREATE INDEX idx_attendances_date ON attendances(attendance_date);

-- RLS
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendances_select_policy"
  ON attendances FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

CREATE POLICY "attendances_insert_policy"
  ON attendances FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

CREATE POLICY "attendances_update_policy"
  ON attendances FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

CREATE POLICY "attendances_delete_policy"
  ON attendances FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

-- Trigger
CREATE OR REPLACE FUNCTION update_attendances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendances_updated_at
  BEFORE UPDATE ON attendances
  FOR EACH ROW
  EXECUTE FUNCTION update_attendances_updated_at();

-- ==========================================
-- 2. PAYROLLS TABLE
-- ==========================================

DROP TABLE IF EXISTS payrolls CASCADE;

CREATE TABLE payrolls (
  id BIGSERIAL PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  daily_salary DECIMAL(15, 2) NOT NULL,
  days_present INTEGER NOT NULL DEFAULT 0,
  total_salary DECIMAL(15, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'transferred')),
  transferred_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, month, year)
);

CREATE INDEX idx_payrolls_employee_id ON payrolls(employee_id);
CREATE INDEX idx_payrolls_store_id ON payrolls(store_id);
CREATE INDEX idx_payrolls_period ON payrolls(year, month);

-- RLS
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payrolls_select_policy"
  ON payrolls FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

CREATE POLICY "payrolls_insert_policy"
  ON payrolls FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

CREATE POLICY "payrolls_update_policy"
  ON payrolls FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

CREATE POLICY "payrolls_delete_policy"
  ON payrolls FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );

-- Trigger
CREATE OR REPLACE FUNCTION update_payrolls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payrolls_updated_at
  BEFORE UPDATE ON payrolls
  FOR EACH ROW
  EXECUTE FUNCTION update_payrolls_updated_at();

-- ==========================================
-- VERIFY
-- ==========================================

SELECT 'Tables created:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('attendances', 'payrolls')
ORDER BY table_name;
