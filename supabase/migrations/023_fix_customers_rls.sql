-- ==========================================
-- FIX CUSTOMERS RLS FOR CUSTOM AUTH
-- ==========================================
-- Since custom auth doesn't use Supabase Auth (auth.uid()),
-- we need to disable RLS and rely on application-level security

-- Drop existing policies
DROP POLICY IF EXISTS "customers_select_policy" ON customers;
DROP POLICY IF EXISTS "customers_insert_policy" ON customers;
DROP POLICY IF EXISTS "customers_update_policy" ON customers;
DROP POLICY IF EXISTS "customers_delete_policy" ON customers;

-- Disable RLS for customers table
-- Application will handle security through session validation
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- VERIFY
-- ==========================================

SELECT 'Customers RLS Status:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'customers';

SELECT 'Note: RLS disabled - security handled at application level' as info;

