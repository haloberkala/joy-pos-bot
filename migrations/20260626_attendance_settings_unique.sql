-- Menambahkan UNIQUE constraint pada kolom store_id
ALTER TABLE public.attendance_settings
ADD CONSTRAINT attendance_settings_store_id_key UNIQUE (store_id);
