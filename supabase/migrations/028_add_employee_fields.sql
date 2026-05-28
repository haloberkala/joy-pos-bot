-- ==========================================
-- ADD EMPLOYEE FIELDS FOR SDM MODULE
-- Migration 028
-- ==========================================

-- Add position field (job title)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS position TEXT DEFAULT 'Staff';

-- Add daily_salary field for payroll calculation
ALTER TABLE employees ADD COLUMN IF NOT EXISTS daily_salary DECIMAL(15, 2) DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN employees.position IS 'Job title or position of the employee';
COMMENT ON COLUMN employees.daily_salary IS 'Daily salary for payroll calculation';

-- Update existing employees with default values
UPDATE employees 
SET 
  position = CASE 
    WHEN role = 'owner' THEN 'Owner'
    WHEN role = 'admin' THEN 'Kepala Toko'
    WHEN role = 'cashier' THEN 'Kasir'
    ELSE 'Staff'
  END,
  daily_salary = CASE 
    WHEN role = 'owner' THEN 0
    WHEN role = 'admin' THEN 150000
    WHEN role = 'cashier' THEN 100000
    ELSE 0
  END
WHERE position IS NULL OR daily_salary = 0;

-- ==========================================
-- VERIFICATION
-- ==========================================

SELECT '=== MIGRATION 028 VERIFICATION ===' as info;

SELECT 'Employees table structure:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'employees'
AND column_name IN ('position', 'daily_salary')
ORDER BY ordinal_position;

SELECT 'Sample employee data:' as info;
SELECT username, name, role, position, daily_salary
FROM employees
LIMIT 5;

SELECT '=== MIGRATION 028 COMPLETE ===' as info;
