-- ==========================================
-- GRANT FULL ACCESS TO CUSTOMERS TABLE
-- ==========================================
-- Since RLS is disabled and we use custom auth,
-- we need to grant explicit permissions to anon and authenticated roles

-- Grant all permissions to anon role (used by Supabase client)
GRANT ALL ON customers TO anon;
GRANT ALL ON customers TO authenticated;

-- Grant usage on sequence (for auto-increment id)
GRANT USAGE, SELECT ON SEQUENCE customers_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE customers_id_seq TO authenticated;

-- Verify grants
SELECT 'Customers table grants:' as info;
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'customers'
ORDER BY grantee, privilege_type;

SELECT 'Sequence grants:' as info;
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_usage_grants
WHERE object_name = 'customers_id_seq'
ORDER BY grantee, privilege_type;
