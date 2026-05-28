-- ==========================================
-- REMOVE EMAIL FROM CUSTOMERS TABLE
-- ==========================================
-- Email field is not needed for customer management

-- Drop email column
ALTER TABLE customers DROP COLUMN IF EXISTS email;

-- ==========================================
-- VERIFY
-- ==========================================

SELECT 'Customers table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'customers'
ORDER BY ordinal_position;
