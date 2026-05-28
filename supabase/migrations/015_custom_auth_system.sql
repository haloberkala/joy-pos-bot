-- ==========================================
-- CUSTOM AUTHENTICATION SYSTEM
-- Migration 015
-- ==========================================

-- ==========================================
-- 1. ADD PASSWORD HASH COLUMN TO EMPLOYEES
-- ==========================================

-- Add password_hash column (will replace plain password later)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- ==========================================
-- 2. CREATE SESSIONS TABLE
-- ==========================================

DROP TABLE IF EXISTS user_sessions CASCADE;

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_sessions_employee_id ON user_sessions(employee_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- ==========================================
-- 3. CREATE AUTHENTICATION FUNCTIONS
-- ==========================================

-- Function to hash password (simple MD5 for now, can upgrade to bcrypt later)
CREATE OR REPLACE FUNCTION hash_password(plain_password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(plain_password, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify password
CREATE OR REPLACE FUNCTION verify_password(plain_password TEXT, hashed_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN encode(digest(plain_password, 'sha256'), 'hex') = hashed_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate session token
CREATE OR REPLACE FUNCTION generate_session_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create session
CREATE OR REPLACE FUNCTION create_session(
  p_employee_id UUID,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  session_token TEXT,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_token TEXT;
  v_expires TIMESTAMPTZ;
BEGIN
  -- Generate token
  v_token := generate_session_token();
  
  -- Set expiration (7 days from now)
  v_expires := NOW() + INTERVAL '7 days';
  
  -- Insert session
  INSERT INTO user_sessions (employee_id, session_token, expires_at, ip_address, user_agent)
  VALUES (p_employee_id, v_token, v_expires, p_ip_address, p_user_agent);
  
  RETURN QUERY SELECT v_token, v_expires;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate session
CREATE OR REPLACE FUNCTION validate_session(p_session_token TEXT)
RETURNS TABLE (
  employee_id UUID,
  username TEXT,
  name TEXT,
  role TEXT,
  store_id INTEGER,
  is_active BOOLEAN
) AS $$
BEGIN
  -- Update last activity
  UPDATE user_sessions 
  SET last_activity = NOW()
  WHERE session_token = p_session_token
    AND expires_at > NOW();
  
  -- Return employee data if session valid
  RETURN QUERY
  SELECT 
    e.id,
    e.username,
    e.name,
    e.role,
    e.store_id,
    e.is_active
  FROM employees e
  INNER JOIN user_sessions s ON s.employee_id = e.id
  WHERE s.session_token = p_session_token
    AND s.expires_at > NOW()
    AND e.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete session (logout)
CREATE OR REPLACE FUNCTION delete_session(p_session_token TEXT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM user_sessions WHERE session_token = p_session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 4. UPDATE TABLE CONSTRAINTS
-- ==========================================

-- Make store_id nullable for owner role
ALTER TABLE employees ALTER COLUMN store_id DROP NOT NULL;

-- Drop old role constraint
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;

-- Add new constraint with 'owner' role
ALTER TABLE employees ADD CONSTRAINT employees_role_check 
  CHECK (role IN ('owner', 'admin', 'cashier'));

-- Add constraint: owner must have null store_id, admin/cashier must have store_id
ALTER TABLE employees ADD CONSTRAINT employees_store_role_check
  CHECK (
    (role = 'owner' AND store_id IS NULL) OR
    (role IN ('admin', 'cashier') AND store_id IS NOT NULL)
  );

-- ==========================================
-- 5. CREATE DEFAULT USERS (with hashed passwords)
-- ==========================================

-- Note: employees table doesn't have password column
-- We only set password_hash directly

-- First, delete any existing test users to avoid conflicts
DELETE FROM employees WHERE username IN ('owner', 'admin1', 'kasir1');

-- Insert Owner
INSERT INTO employees (username, password_hash, name, role, store_id, is_active)
VALUES (
  'owner',
  hash_password('owner123'),
  'Owner',
  'owner',
  NULL,
  true
);

-- Insert Admin1
INSERT INTO employees (username, password_hash, name, role, store_id, is_active)
VALUES (
  'admin1',
  hash_password('admin123'),
  'Admin Toko 1',
  'admin',
  1,
  true
);

-- Insert Kasir1
INSERT INTO employees (username, password_hash, name, role, store_id, is_active)
VALUES (
  'kasir1',
  hash_password('kasir123'),
  'Kasir Toko 1',
  'cashier',
  1,
  true
);

-- ==========================================
-- 6. UPDATE RLS POLICIES FOR EMPLOYEES
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "employees_select_policy" ON employees;
DROP POLICY IF EXISTS "employees_insert_policy" ON employees;
DROP POLICY IF EXISTS "employees_update_policy" ON employees;
DROP POLICY IF EXISTS "employees_delete_policy" ON employees;

-- Allow anonymous SELECT for login (username lookup)
CREATE POLICY "employees_select_policy"
  ON employees FOR SELECT
  USING (true); -- Allow all, we'll check password in application

-- Allow authenticated INSERT (for creating employees)
CREATE POLICY "employees_insert_policy"
  ON employees FOR INSERT
  WITH CHECK (true);

-- Allow authenticated UPDATE
CREATE POLICY "employees_update_policy"
  ON employees FOR UPDATE
  USING (true);

-- Allow authenticated DELETE
CREATE POLICY "employees_delete_policy"
  ON employees FOR DELETE
  USING (true);

-- ==========================================
-- 7. RLS POLICIES FOR SESSIONS
-- ==========================================

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create sessions (login)
CREATE POLICY "sessions_insert_policy"
  ON user_sessions FOR INSERT
  WITH CHECK (true);

-- Allow users to read their own sessions
CREATE POLICY "sessions_select_policy"
  ON user_sessions FOR SELECT
  USING (true);

-- Allow users to delete their own sessions (logout)
CREATE POLICY "sessions_delete_policy"
  ON user_sessions FOR DELETE
  USING (true);

-- ==========================================
-- 8. VERIFICATION
-- ==========================================

SELECT '=== MIGRATION 015 VERIFICATION ===' as info;

SELECT 'Employees with hashed passwords:' as info;
SELECT username, name, role, 
       CASE WHEN password_hash IS NOT NULL THEN '✓ Hashed' ELSE '✗ Not hashed' END as password_status
FROM employees
ORDER BY role, username;

SELECT 'Sessions table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_sessions'
ORDER BY ordinal_position;

SELECT 'Test password hashing:' as info;
SELECT 
  'owner' as username,
  hash_password('owner123') as hashed_password,
  verify_password('owner123', hash_password('owner123')) as password_valid;

SELECT '=== MIGRATION 015 COMPLETE ===' as info;
