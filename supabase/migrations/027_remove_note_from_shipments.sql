-- Migration: Remove note column from shipments table
-- Date: 2026-05-23
-- Description: Remove the note field from shipments as it's not needed

-- Drop the note column
ALTER TABLE shipments DROP COLUMN IF EXISTS note;
