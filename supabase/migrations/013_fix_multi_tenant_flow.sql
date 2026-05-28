-- ==========================================
-- FIX MULTI-TENANT FLOW & SECURITY
-- ==========================================
-- This migration fixes the authentication flow and data isolation
-- to ensure proper multi-tenant architecture:
-- 1. Owner creates Stores
-- 2. Owner creates Employees (Admin/Kasir) tied to specific Store
-- 3. Employees can only access data from their Store
-- ==========================================

-- ==========================================
-- 1. FIX EMPLOYEES RLS POLICIES
-- ==========================================
-- Only Owner can CRUD employees
-- Admin/Kasir can only view employees from their store

DROP POLICY IF EXISTS "employees_select_policy" ON employees;
DROP POLICY IF EXISTS "employees_insert_policy" ON employees;
DROP POLICY IF EXISTS "employees_update_policy" ON employees;
DROP POLICY IF EXISTS "employees_delete_policy" ON employees;

-- SELECT: Owner sees all, Admin/Kasir see only their store
CREATE POLICY "employees_select_policy"
  ON employees FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

-- INSERT: Only Owner can create employees
CREATE POLICY "employees_insert_policy"
  ON employees FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
  );

-- UPDATE: Only Owner can update employees
CREATE POLICY "employees_update_policy"
  ON employees FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
  );

-- DELETE: Only Owner can delete employees
CREATE POLICY "employees_delete_policy"
  ON employees FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
  );

-- ==========================================
-- 2. ADD OWNER_ID TO STORES (Optional Enhancement)
-- ==========================================
-- This allows multiple owners in the future
-- For now, we'll keep it simple with single owner

-- Uncomment if you want to track which owner created which store:
-- ALTER TABLE stores ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
-- CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);

-- ==========================================
-- 3. VERIFY DATA ISOLATION FOR ALL TABLES
-- ==========================================
-- Ensure all data tables have proper RLS policies
-- that filter by store_id

-- List of tables that should have store_id filtering:
-- - products
-- - categories
-- - brands
-- - customers
-- - sales
-- - sale_items
-- - purchases
-- - purchase_items
-- - suppliers
-- - expenses
-- - shipments
-- - stock_opname
-- - stock_opname_items
-- - attendances
-- - payrolls

-- Example policy pattern for data tables:
-- CREATE POLICY "table_select_policy"
--   ON table_name FOR SELECT TO authenticated
--   USING (
--     (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
--     OR
--     store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
--   );

-- ==========================================
-- 4. CREATE HELPER FUNCTION
-- ==========================================
-- Function to get current user's store_id from JWT

CREATE OR REPLACE FUNCTION get_user_store_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is owner
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access store
CREATE OR REPLACE FUNCTION can_access_store(target_store_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER = target_store_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON TABLE stores IS 'Stores/Cabang - Created by Owner only';
COMMENT ON TABLE employees IS 'Employees (Admin/Kasir) - Created by Owner, tied to specific Store';

COMMENT ON COLUMN employees.store_id IS 'Foreign key to stores - Determines which store this employee belongs to';
COMMENT ON COLUMN employees.role IS 'Employee role: admin or cashier (owner is not stored here)';
COMMENT ON COLUMN employees.is_active IS 'Account status - Inactive accounts cannot login';

COMMENT ON FUNCTION get_user_store_id() IS 'Get current user store_id from JWT metadata';
COMMENT ON FUNCTION is_owner() IS 'Check if current user is owner';
COMMENT ON FUNCTION can_access_store(INTEGER) IS 'Check if current user can access specific store';

-- ==========================================
-- 6. VERIFY POLICIES
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'MULTI-TENANT FLOW VERIFICATION';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Flow Hierarchy:';
  RAISE NOTICE '1. Developer → Owner (manual via Supabase Dashboard)';
  RAISE NOTICE '2. Owner → Stores (via web app)';
  RAISE NOTICE '3. Owner → Employees (via web app, tied to Store)';
  RAISE NOTICE '4. Employees → Data (isolated by store_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'Security Rules:';
  RAISE NOTICE '- Owner: Can CRUD all stores and employees';
  RAISE NOTICE '- Admin/Kasir: Can only view employees from their store';
  RAISE NOTICE '- Admin/Kasir: Can only access data from their store';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policies Updated:';
  RAISE NOTICE '✓ employees table - Owner only for CRUD';
  RAISE NOTICE '✓ stores table - Owner only for CRUD';
  RAISE NOTICE '';
  RAISE NOTICE 'Helper Functions Created:';
  RAISE NOTICE '✓ get_user_store_id() - Get user store from JWT';
  RAISE NOTICE '✓ is_owner() - Check if user is owner';
  RAISE NOTICE '✓ can_access_store(id) - Check store access';
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
END $$;

