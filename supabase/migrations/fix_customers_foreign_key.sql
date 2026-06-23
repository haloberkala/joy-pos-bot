-- ==========================================
-- FIX CUSTOMERS FOREIGN KEY ISSUE
-- ==========================================

-- Check current stores
SELECT 'Current stores in database:' as info;
SELECT id, name FROM stores ORDER BY id;

-- Check if store_id 1 exists
SELECT 'Does store_id 1 exist?' as info;
SELECT EXISTS(SELECT 1 FROM stores WHERE id = 1) as store_1_exists;

-- If no stores exist, create default store
INSERT INTO stores (id, name, address)
SELECT 1, 'Toko Utama', 'Alamat Toko'
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE id = 1);

-- Verify
SELECT 'Stores after fix:' as info;
SELECT id, name FROM stores ORDER BY id;

-- Now test customer insert
SELECT 'Testing customer insert...' as info;
INSERT INTO customers (store_id, name, phone, address)
VALUES (1, 'Test Customer', '0812-TEST-123', 'Test Address')
RETURNING *;

-- Clean up test
DELETE FROM customers WHERE name = 'Test Customer';

SELECT 'Fix complete!' as info;
