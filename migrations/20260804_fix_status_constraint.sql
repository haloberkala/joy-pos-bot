-- ============================================================
-- Migration: Fix Attendance Status Constraint
-- Tanggal: 2026-08-04
-- Deskripsi:
--   ONLY accept new statuses: complete, partial, incomplete
--   NO legacy statuses supported
-- ============================================================

-- Drop old constraint if exists
ALTER TABLE public.attendances 
  DROP CONSTRAINT IF EXISTS attendances_status_check;

-- Add new constraint - ONLY new statuses
ALTER TABLE public.attendances
  ADD CONSTRAINT attendances_status_check 
  CHECK (status IN ('complete', 'partial', 'incomplete'));

COMMENT ON COLUMN public.attendances.status IS 
  'Status attendance: ONLY "complete", "partial", "incomplete". Legacy statuses not supported.';

-- Verify
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'attendances_status_check';
