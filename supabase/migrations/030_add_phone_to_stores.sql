-- Migration: Add phone field to stores table
-- Date: 2026-07-27
-- Purpose: Add phone number field for store contact information on receipts

ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN stores.phone IS 'Store phone number displayed on receipts';
