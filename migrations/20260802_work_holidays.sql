-- ============================================================
-- Migration: Work Calendar — Hari Libur
-- Tanggal: 2026-08-02
-- Deskripsi:
--   Tabel work_holidays menjadi referensi hari libur untuk
--   attendance engine. Mendukung dua jenis libur:
--     - national : berlaku semua toko (store_id IS NULL)
--     - store    : libur khusus satu toko (store_id NOT NULL)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.work_holidays (
  id         serial PRIMARY KEY,
  store_id   integer REFERENCES public.stores(id) ON DELETE CASCADE,
  -- NULL  = hari libur nasional (berlaku semua toko)
  -- nilai = hari libur khusus toko tersebut
  date       date    NOT NULL,
  name       text    NOT NULL,
  type       text    NOT NULL DEFAULT 'national'
             CHECK (type IN ('national', 'store')),
  created_at timestamptz DEFAULT now(),

  -- Satu tanggal hanya boleh muncul sekali per (store_id, date).
  -- NULLS NOT DISTINCT memastikan dua baris national (NULL, date) juga unik.
  UNIQUE NULLS NOT DISTINCT (store_id, date)
);

-- Index untuk lookup cepat saat import: WHERE date = ANY($dates) AND (store_id = $n OR store_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_work_holidays_date_store
  ON public.work_holidays (date, store_id);

-- ============================================================
-- Verifikasi:
--   SELECT * FROM public.work_holidays ORDER BY date;
-- ============================================================
