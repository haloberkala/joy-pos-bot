-- ==========================================
-- ADD FINGERPRINT ID FOR BIOMETRIC INTEGRATION
-- Migration 029
-- ==========================================

-- Add fingerprint_id field for biometric device integration
ALTER TABLE employees ADD COLUMN IF NOT EXISTS fingerprint_id TEXT;

-- Add unique constraint to prevent duplicate fingerprint registrations
-- Using partial index to allow multiple NULLs but unique non-NULL values
CREATE UNIQUE INDEX IF NOT EXISTS unique_fingerprint_id 
  ON employees(fingerprint_id) 
  WHERE fingerprint_id IS NOT NULL;

-- Add index for faster lookup
CREATE INDEX IF NOT EXISTS idx_employees_fingerprint_id ON employees(fingerprint_id);

-- Add comment for clarity
COMMENT ON COLUMN employees.fingerprint_id IS 'Unique ID from biometric fingerprint device';

-- ==========================================
-- VERIFICATION
-- ==========================================

SELECT '=== MIGRATION 029 VERIFICATION ===' as info;

SELECT 'Employees table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'employees'
AND column_name = 'fingerprint_id';

SELECT 'Indexes:' as info;
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'employees'
AND indexname LIKE '%fingerprint%';

SELECT '=== MIGRATION 029 COMPLETE ===' as info;
