-- Migration: Add unique constraint on attendances (employee_id, attendance_date)
-- Date: 2026-08-02
-- Purpose: Ensure one attendance record per employee per day

-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'attendances_employee_date_unique'
  ) THEN
    ALTER TABLE attendances 
    ADD CONSTRAINT attendances_employee_date_unique 
    UNIQUE (employee_id, attendance_date);
  END IF;
END $$;
