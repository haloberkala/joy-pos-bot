-- ==========================================
-- TEST CUSTOMER INSERT
-- ==========================================
-- Manual test to verify customers table is working

-- Check table structure
SELECT 'Table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'customers'
ORDER BY ordinal_position;

-- Check RLS status
SELECT 'RLS Status:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'customers';

-- Try manual insert
SELECT 'Attempting manual insert...' as info;
INSERT INTO customers (store_id, name, phone, address, email)
VALUES (1, 'Test Customer', '0812-1234-5678', 'Test Address', 'test@example.com')
RETURNING *;

-- Verify insert
SELECT 'Customers in database:' as info;
SELECT * FROM customers ORDER BY created_at DESC LIMIT 5;

-- Clean up test data
DELETE FROM customers WHERE name = 'Test Customer';

SELECT 'Test complete!' as info;
