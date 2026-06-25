-- ============================================================
-- Migration: Attendance Settings
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS attendance_settings_id_seq;

CREATE TABLE IF NOT EXISTS public.attendance_settings (
  id integer NOT NULL DEFAULT nextval('attendance_settings_id_seq'::regclass),
  store_id integer NOT NULL UNIQUE,
  shift_start time without time zone DEFAULT '08:00',
  shift_end time without time zone DEFAULT '17:00',
  grace_period_minutes integer DEFAULT 15,
  break_start time without time zone DEFAULT '12:00',
  break_end time without time zone DEFAULT '13:00',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_settings_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_settings_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE
);
