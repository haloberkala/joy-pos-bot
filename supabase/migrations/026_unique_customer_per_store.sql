-- ==========================================
-- UNIQUE CUSTOMER NAME AND PHONE PER STORE
-- ==========================================
-- Prevent duplicate customer names and phone numbers within the same store

-- Add unique constraint for phone per store
ALTER TABLE customers 
ADD CONSTRAINT customers_store_phone_unique 
UNIQUE (store_id, phone);

-- Add unique constraint for name per store
ALTER TABLE customers 
ADD CONSTRAINT customers_store_name_unique 
UNIQUE (store_id, name);

-- ==========================================
-- VERIFY
-- ==========================================

SELECT 'Customers table constraints:' as info;
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'customers'::regclass
AND contype = 'u'
ORDER BY conname;
