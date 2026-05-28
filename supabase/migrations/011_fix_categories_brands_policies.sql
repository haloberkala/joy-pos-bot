-- ==========================================
-- FIX CATEGORIES & BRANDS RLS POLICIES
-- ==========================================

-- ==========================================
-- 1. FIX CATEGORIES POLICIES
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "categories_select_policy" ON categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON categories;
DROP POLICY IF EXISTS "categories_update_policy" ON categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON categories;

-- Allow SELECT for all authenticated users
CREATE POLICY "categories_select_policy"
  ON categories FOR SELECT TO authenticated
  USING (true);

-- Allow INSERT for owner and admin
CREATE POLICY "categories_insert_policy"
  ON categories FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('owner', 'admin')
  );

-- Allow UPDATE for owner and admin
CREATE POLICY "categories_update_policy"
  ON categories FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('owner', 'admin')
  );

-- Allow DELETE for owner only
CREATE POLICY "categories_delete_policy"
  ON categories FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
  );

-- ==========================================
-- 2. FIX BRANDS POLICIES
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "brands_select_policy" ON brands;
DROP POLICY IF EXISTS "brands_insert_policy" ON brands;
DROP POLICY IF EXISTS "brands_update_policy" ON brands;
DROP POLICY IF EXISTS "brands_delete_policy" ON brands;

-- Allow SELECT for all authenticated users
CREATE POLICY "brands_select_policy"
  ON brands FOR SELECT TO authenticated
  USING (true);

-- Allow INSERT for owner and admin
CREATE POLICY "brands_insert_policy"
  ON brands FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('owner', 'admin')
  );

-- Allow UPDATE for owner and admin
CREATE POLICY "brands_update_policy"
  ON brands FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('owner', 'admin')
  );

-- Allow DELETE for owner only
CREATE POLICY "brands_delete_policy"
  ON brands FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
  );

-- ==========================================
-- VERIFY
-- ==========================================

SELECT 'Policies created:' as info;
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('categories', 'brands')
ORDER BY tablename, cmd;
