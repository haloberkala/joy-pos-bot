-- ==========================================
-- CATEGORY-BRAND RELATION
-- ==========================================

-- Add category_id to brands table
ALTER TABLE brands ADD COLUMN IF NOT EXISTS category_id INTEGER;

-- Add foreign key constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'brands_category_id_fkey'
  ) THEN
    ALTER TABLE brands 
    ADD CONSTRAINT brands_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_brands_category_id ON brands(category_id);

-- Update existing brands with default category relationships
-- You can customize these mappings based on your business logic
UPDATE brands SET category_id = 1 WHERE name IN ('Indofood', 'ABC', 'Indomie'); -- Sembako
UPDATE brands SET category_id = 2 WHERE name IN ('Mayora'); -- Snack
UPDATE brands SET category_id = 3 WHERE name IN ('Aqua', 'Coca-Cola'); -- Minuman
UPDATE brands SET category_id = 4 WHERE name IN ('Wings', 'Unilever'); -- Kebersihan
UPDATE brands SET category_id = 5 WHERE name IN ('Nestle'); -- Elektronik (or you can change this)
UPDATE brands SET category_id = 8 WHERE name = 'Generic'; -- Lain-lain

-- Verify
SELECT 'Brands with categories:' as info;
SELECT b.id, b.name, c.name as category_name, c.icon
FROM brands b
LEFT JOIN categories c ON b.category_id = c.id
ORDER BY c.name, b.name;
