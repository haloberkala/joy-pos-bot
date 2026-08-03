-- ============================================================
-- Migration: Attendance Simplification - Remove breaks table
-- Tanggal: 2026-08-04 (Final Revision)
-- Deskripsi:
--   Penyederhanaan konfigurasi break:
--   - Hapus tabel attendance_breaks (tidak diperlukan lagi)
--   - Break configuration langsung di attendance_settings
--   - Hanya satu break per toko (bukan entity terpisah)
--
--   Filosofi: Break adalah KONFIGURASI, bukan MASTER DATA
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Drop attendance_breaks table (jika ada)
-- ─────────────────────────────────────────────────────────────

-- Drop triggers dan functions terlebih dahulu
DROP TRIGGER IF EXISTS check_break_overlap ON public.attendance_breaks;
DROP FUNCTION IF EXISTS validate_break_overlap();

-- Drop table
DROP TABLE IF EXISTS public.attendance_breaks CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 2. Tambah kolom break ke attendance_settings
-- ─────────────────────────────────────────────────────────────

-- Kolom break_start dan break_end sudah ada (legacy)
-- Tambah break_return_tolerance_minutes jika belum ada
ALTER TABLE public.attendance_settings
  ADD COLUMN IF NOT EXISTS break_return_tolerance_minutes integer NOT NULL DEFAULT 15;

COMMENT ON COLUMN public.attendance_settings.break_start IS 
  'Waktu mulai jam istirahat. Digunakan sebagai Break Out Window start.';

COMMENT ON COLUMN public.attendance_settings.break_end IS 
  'Waktu selesai jam istirahat. Digunakan sebagai Break Out Window end dan Break In Window start.';

COMMENT ON COLUMN public.attendance_settings.break_return_tolerance_minutes IS 
  'Toleransi kembali dari istirahat (menit). Break In Window = [break_end, break_end + tolerance]. Default: 15 menit.';

-- ─────────────────────────────────────────────────────────────
-- 3. Tambah kolom break checkpoints ke attendances
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.attendances
  ADD COLUMN IF NOT EXISTS break_out time,
  ADD COLUMN IF NOT EXISTS break_in time;

-- Index untuk query performance
CREATE INDEX IF NOT EXISTS idx_attendances_break_times
  ON public.attendances (break_out, break_in) 
  WHERE break_out IS NOT NULL OR break_in IS NOT NULL;

COMMENT ON COLUMN public.attendances.break_out IS 
  'Waktu scan Break Out (scan pertama dalam Break Out Window setelah clockIn). Checkpoint kehadiran.';

COMMENT ON COLUMN public.attendances.break_in IS 
  'Waktu scan Break In (scan pertama dalam Break In Window setelah break_end). Checkpoint kehadiran.';

COMMENT ON COLUMN public.attendances.duration_minutes IS 
  'DEPRECATED: Durasi kerja efektif (domain Payroll, bukan Attendance Engine). Engine baru tidak mengisi kolom ini.';

COMMENT ON COLUMN public.attendances.penalty_minutes IS 
  'DEPRECATED: Keterlambatan (domain Payroll, bukan Attendance Engine). Engine baru tidak mengisi kolom ini.';

-- ─────────────────────────────────────────────────────────────
-- 4. Update status constraint
-- ─────────────────────────────────────────────────────────────

-- Drop old constraint if exists
ALTER TABLE public.attendances 
  DROP CONSTRAINT IF EXISTS attendances_status_check;

-- Add new constraint - ONLY new statuses
ALTER TABLE public.attendances
  ADD CONSTRAINT attendances_status_check 
  CHECK (status IN ('complete', 'partial', 'incomplete'));

COMMENT ON COLUMN public.attendances.status IS 
  'Status attendance: ONLY "complete", "partial", "incomplete"';

-- ─────────────────────────────────────────────────────────────
-- Verifikasi (jalankan setelah migration):
-- ─────────────────────────────────────────────────────────────

-- Cek tabel attendance_breaks sudah terhapus:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name = 'attendance_breaks';
-- (Harus return 0 rows)

-- Cek kolom break di attendance_settings:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'attendance_settings' 
-- AND column_name IN ('break_start', 'break_end', 'break_return_tolerance_minutes');

-- Cek kolom break checkpoints di attendances:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'attendances' 
-- AND column_name IN ('break_out', 'break_in');

-- ============================================================
-- CATATAN MIGRASI:
-- ============================================================

-- Jika migration 20260803_attendance_breaks.sql sudah dijalankan:
--   → Migration ini akan menghapus tabel attendance_breaks
--   → Data break (jika ada) akan hilang, tapi tidak masalah karena
--     sekarang konfigurasi break ada di attendance_settings

-- Jika migration 20260803 belum dijalankan:
--   → Tidak ada tabel yang perlu dihapus
--   → Migration ini hanya menambah kolom yang diperlukan

-- Backward compatibility:
--   → Field break_start dan break_end sudah ada sejak lama
--   → Engine akan membaca dari attendance_settings langsung
--   → Tidak ada breaking change untuk data yang sudah ada

