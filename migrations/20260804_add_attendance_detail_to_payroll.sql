-- ============================================================
-- Migration: Add Attendance Detail to Payroll
-- Tanggal: 2026-08-04
-- Deskripsi:
--   Menambahkan kolom complete_days dan partial_days ke tabel payrolls
--   untuk menampilkan detail kehadiran pada slip gaji.
-- ============================================================

-- Tambah kolom complete_days dan partial_days
ALTER TABLE public.payrolls
  ADD COLUMN IF NOT EXISTS complete_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partial_days integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.payrolls.complete_days IS 
  'Jumlah hari hadir penuh (status = complete). Digunakan untuk informasi detail pada slip gaji.';

COMMENT ON COLUMN public.payrolls.partial_days IS 
  'Jumlah hari hadir sebagian (status = partial). Digunakan untuk informasi detail pada slip gaji.';

-- Update existing payrolls untuk set default value
-- (jika ada data existing, set ke 0 agar tidak null)
UPDATE public.payrolls
SET complete_days = 0, partial_days = 0
WHERE complete_days IS NULL OR partial_days IS NULL;

-- ============================================================
-- Verifikasi (jalankan setelah migration):
-- ============================================================

-- Cek kolom baru ada:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'payrolls' 
-- AND column_name IN ('complete_days', 'partial_days');

-- ============================================================
-- CATATAN:
-- ============================================================
-- Kolom ini hanya untuk informasi UI. Perhitungan total_salary tetap
-- menggunakan days_present (completeDays + partialDays).
-- 
-- Formula:
--   days_present = complete_days + partial_days
--   total_salary = (complete_days * daily_salary) + (partial_days * daily_salary / 2)
-- ============================================================
