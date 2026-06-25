-- ============================================================
-- Migration: ZKTeco Attendance Import Support
-- Tanggal: 2026-06-25
-- Deskripsi:
--   1. Tambah kolom penalty_minutes ke tabel attendances
--   2. Tambah UNIQUE constraint (employee_id, attendance_date)
--      agar UPSERT tidak membuat duplikat
-- ============================================================

-- 1. Tambah kolom penalty_minutes
--    (menyimpan total menit keterlambatan dari kolom "Total Min" ZKTeco)
ALTER TABLE public.attendances
  ADD COLUMN IF NOT EXISTS penalty_minutes integer NOT NULL DEFAULT 0;

-- 2. Tambah UNIQUE constraint untuk mendukung UPSERT
--    onConflict: 'employee_id,attendance_date'
--
--    CATATAN: Jika sudah ada data duplikat di tabel, hapus dulu duplikatnya
--    sebelum menjalankan perintah ini, karena constraint akan gagal jika
--    ada baris dengan kombinasi (employee_id, attendance_date) yang sama.
--
--    Cek duplikat (jalankan dulu untuk verifikasi):
--    SELECT employee_id, attendance_date, COUNT(*) as cnt
--    FROM public.attendances
--    GROUP BY employee_id, attendance_date
--    HAVING COUNT(*) > 1;

ALTER TABLE public.attendances
  ADD CONSTRAINT attendances_employee_date_unique
  UNIQUE (employee_id, attendance_date);

-- ============================================================
-- Verifikasi (jalankan setelah migration):
-- ============================================================

-- Cek kolom baru ada:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'attendances' AND column_name = 'penalty_minutes';

-- Cek constraint ada:
-- SELECT constraint_name, constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_name = 'attendances' AND constraint_name = 'attendances_employee_date_unique';
