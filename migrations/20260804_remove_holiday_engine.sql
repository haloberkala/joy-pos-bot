-- ============================================================
-- Migration: Remove Holiday Engine
-- Tanggal: 2026-08-04
-- Deskripsi:
--   Hapus work_holidays table dan weekly_off_days column
--   karena konsep holiday sudah deprecated
-- ============================================================

-- Drop work_holidays table
DROP TABLE IF EXISTS public.work_holidays CASCADE;

-- Drop weekly_off_days column from attendance_settings
ALTER TABLE public.attendance_settings 
  DROP COLUMN IF EXISTS weekly_off_days;

-- Drop index if exists
DROP INDEX IF EXISTS public.idx_work_holidays_date_store;
