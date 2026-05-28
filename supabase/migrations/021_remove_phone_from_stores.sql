-- ==========================================
-- REMOVE PHONE COLUMN FROM STORES TABLE
-- ==========================================
-- Simplification: Phone number is no longer needed for store management

-- Drop the phone column
ALTER TABLE stores DROP COLUMN IF EXISTS phone;

-- ==========================================
-- VERIFY
-- ==========================================

SELECT 'Column dropped:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stores' 
AND table_schema = 'public'
ORDER BY ordinal_position;
