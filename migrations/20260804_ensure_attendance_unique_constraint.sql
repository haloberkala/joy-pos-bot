-- ============================================================
-- Migration: Ensure Attendance Unique Constraint
-- Tanggal: 2026-08-04
-- Deskripsi:
--   Memastikan UNIQUE constraint (employee_id, attendance_date) ada
--   dan membersihkan duplicate data jika ada.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Identifikasi dan bersihkan duplicate attendance
-- ─────────────────────────────────────────────────────────────

-- Cek duplicate (untuk logging)
DO $$
DECLARE
  duplicate_count integer;
BEGIN
  SELECT COUNT(*)
  INTO duplicate_count
  FROM (
    SELECT employee_id, attendance_date, COUNT(*) as cnt
    FROM public.attendances
    GROUP BY employee_id, attendance_date
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Found % duplicate attendance records. Cleaning up...', duplicate_count;
  END IF;
END $$;

-- Hapus duplicate, simpan hanya yang paling baru (berdasarkan updated_at atau id terbesar)
-- Prioritas: is_manual_edit = true > updated_at terbaru > id terbesar
DELETE FROM public.attendances a
WHERE a.id NOT IN (
  SELECT DISTINCT ON (employee_id, attendance_date)
    id
  FROM public.attendances
  ORDER BY 
    employee_id, 
    attendance_date,
    is_manual_edit DESC NULLS LAST,  -- manual edit prioritas tertinggi
    updated_at DESC NULLS LAST,      -- yang terbaru
    id DESC                          -- id terbesar sebagai tiebreaker
);

-- ─────────────────────────────────────────────────────────────
-- 2. Tambah UNIQUE constraint jika belum ada
-- ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Cek apakah constraint sudah ada
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'attendances_employee_date_unique'
    AND conrelid = 'public.attendances'::regclass
  ) THEN
    -- Tambah constraint
    ALTER TABLE public.attendances 
    ADD CONSTRAINT attendances_employee_date_unique 
    UNIQUE (employee_id, attendance_date);
    
    RAISE NOTICE 'UNIQUE constraint attendances_employee_date_unique created successfully';
  ELSE
    RAISE NOTICE 'UNIQUE constraint attendances_employee_date_unique already exists';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Verifikasi
-- ─────────────────────────────────────────────────────────────

-- Cek constraint ada
DO $$
DECLARE
  constraint_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'attendances_employee_date_unique'
    AND conrelid = 'public.attendances'::regclass
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    RAISE NOTICE 'Verification: UNIQUE constraint is active ✓';
  ELSE
    RAISE EXCEPTION 'Verification FAILED: UNIQUE constraint not found!';
  END IF;
END $$;

-- Cek tidak ada duplicate lagi
DO $$
DECLARE
  remaining_duplicates integer;
BEGIN
  SELECT COUNT(*)
  INTO remaining_duplicates
  FROM (
    SELECT employee_id, attendance_date, COUNT(*) as cnt
    FROM public.attendances
    GROUP BY employee_id, attendance_date
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF remaining_duplicates = 0 THEN
    RAISE NOTICE 'Verification: No duplicate records found ✓';
  ELSE
    RAISE EXCEPTION 'Verification FAILED: Still have % duplicate records!', remaining_duplicates;
  END IF;
END $$;

-- ============================================================
-- CATATAN:
-- ============================================================
-- Migration ini bersifat idempotent (aman dijalankan berkali-kali)
-- Jika constraint sudah ada, migration akan skip create constraint
-- Jika tidak ada duplicate, cleanup akan skip
-- ============================================================
