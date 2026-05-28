-- ==========================================
-- REMOVE ICON COLUMN FROM CATEGORIES
-- ==========================================

-- Remove icon column from categories table
ALTER TABLE categories DROP COLUMN IF EXISTS icon;

-- Verify the change
SELECT 'Categories table after removing icon column:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;
