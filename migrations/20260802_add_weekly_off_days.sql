-- ============================================================
-- Migration: Libur Mingguan (Weekly Off Days)
-- Tanggal: 2026-08-02
-- Deskripsi:
--   Tambah kolom weekly_off_days ke attendance_settings.
--   Berisi array integer hari-hari yang selalu libur setiap minggu.
--
--   Konvensi nilai (sama dengan JavaScript Date.getDay()):
--     0 = Minggu  (Sunday)
--     1 = Senin   (Monday)
--     2 = Selasa  (Tuesday)
--     3 = Rabu    (Wednesday)
--     4 = Kamis   (Thursday)
--     5 = Jumat   (Friday)
--     6 = Sabtu   (Saturday)
--
--   Contoh: {0, 6} = Minggu dan Sabtu selalu libur.
-- ============================================================

ALTER TABLE public.attendance_settings
  ADD COLUMN IF NOT EXISTS weekly_off_days integer[] NOT NULL DEFAULT '{}';

-- ============================================================
-- Verifikasi:
--   SELECT store_id, weekly_off_days FROM public.attendance_settings;
-- ============================================================
