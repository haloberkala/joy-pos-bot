-- ==========================================
-- VERIFY CASCADE DELETE IMPLEMENTATION
-- ==========================================

-- 1. Check all foreign key constraints with CASCADE
SELECT 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc 
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (ccu.table_name = 'stores' OR ccu.table_name = 'sales' OR ccu.table_name = 'purchases' 
       OR ccu.table_name = 'stock_opnames' OR ccu.table_name = 'employees')
ORDER BY tc.table_name, kcu.column_name;

-- 2. Check for any orphaned data (store_id = NULL)
SELECT 'Orphaned Categories' as check_name, COUNT(*) as count FROM categories WHERE store_id IS NULL
UNION ALL
SELECT 'Orphaned Brands', COUNT(*) FROM brands WHERE store_id IS NULL
UNION ALL
SELECT 'Orphaned Units', COUNT(*) FROM units WHERE store_id IS NULL
UNION ALL
SELECT 'Orphaned Products', COUNT(*) FROM products WHERE store_id IS NULL
UNION ALL
SELECT 'Orphaned Customers', COUNT(*) FROM customers WHERE store_id IS NULL
UNION ALL
SELECT 'Orphaned Suppliers', COUNT(*) FROM suppliers WHERE store_id IS NULL
UNION ALL
SELECT 'Orphaned Sales', COUNT(*) FROM sales WHERE store_id IS NULL
UNION ALL
SELECT 'Orphaned Purchases', COUNT(*) FROM purchases WHERE store_id IS NULL;

-- 3. Check supplier_payments.store_id data type
SELECT 
  table_name,
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'supplier_payments' AND column_name = 'store_id';

-- 4. Check stores.id data type
SELECT 
  table_name,
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'stores' AND column_name = 'id';
