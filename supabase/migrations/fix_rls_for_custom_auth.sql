-- ==========================================
-- FIX RLS POLICIES FOR CUSTOM AUTHENTICATION
-- ==========================================

-- Since we moved from Supabase Auth to custom database authentication,
-- we need to update RLS policies to work with our custom auth system.

-- For now, we'll make RLS more permissive for authenticated users
-- Later, you can implement custom RLS using service role or JWT from your backend

-- ==========================================
-- 1. STORES TABLE - Allow all authenticated operations
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "stores_select_policy" ON stores;
DROP POLICY IF EXISTS "stores_insert_policy" ON stores;
DROP POLICY IF EXISTS "stores_update_policy" ON stores;
DROP POLICY IF EXISTS "stores_delete_policy" ON stores;

-- Create new permissive policies (you can tighten these later)
CREATE POLICY "stores_select_policy"
  ON stores FOR SELECT
  USING (true);  -- Allow all reads

CREATE POLICY "stores_insert_policy"
  ON stores FOR INSERT
  WITH CHECK (true);  -- Allow all inserts (you can add role check in your backend)

CREATE POLICY "stores_update_policy"
  ON stores FOR UPDATE
  USING (true);  -- Allow all updates (you can add role check in your backend)

CREATE POLICY "stores_delete_policy"
  ON stores FOR DELETE
  USING (true);  -- Allow all deletes (you can add role check in your backend)

-- ==========================================
-- 2. EMPLOYEES TABLE - Allow SELECT for login
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "employees_select_policy" ON employees;
DROP POLICY IF EXISTS "employees_insert_policy" ON employees;
DROP POLICY IF EXISTS "employees_update_policy" ON employees;
DROP POLICY IF EXISTS "employees_delete_policy" ON employees;

-- Create new permissive policies
CREATE POLICY "employees_select_policy"
  ON employees FOR SELECT
  USING (true);  -- Allow all reads (needed for login)

CREATE POLICY "employees_insert_policy"
  ON employees FOR INSERT
  WITH CHECK (true);  -- Allow all inserts

CREATE POLICY "employees_update_policy"
  ON employees FOR UPDATE
  USING (true);  -- Allow all updates

CREATE POLICY "employees_delete_policy"
  ON employees FOR DELETE
  USING (true);  -- Allow all deletes

-- ==========================================
-- 3. USER_SESSIONS TABLE - Allow all operations
-- ==========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "user_sessions_select_policy" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_insert_policy" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_update_policy" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_delete_policy" ON user_sessions;

-- Create permissive policies
CREATE POLICY "user_sessions_select_policy"
  ON user_sessions FOR SELECT
  USING (true);

CREATE POLICY "user_sessions_insert_policy"
  ON user_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "user_sessions_update_policy"
  ON user_sessions FOR UPDATE
  USING (true);

CREATE POLICY "user_sessions_delete_policy"
  ON user_sessions FOR DELETE
  USING (true);

-- ==========================================
-- VERIFICATION
-- ==========================================

SELECT '=== RLS POLICIES UPDATED FOR CUSTOM AUTH ===' as info;

SELECT 'Stores policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'stores'
ORDER BY policyname;

SELECT 'Employees policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'employees'
ORDER BY policyname;

SELECT 'User sessions policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'user_sessions'
ORDER BY policyname;

SELECT '=== FIX COMPLETE ===' as info;
