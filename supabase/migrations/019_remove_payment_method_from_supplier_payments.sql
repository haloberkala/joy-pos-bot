-- Migration: Remove payment_method from supplier_payments
-- Description: Simplify supplier payment process by removing payment method selection
-- Date: 2024

-- =====================================================
-- 1. Drop the payment_method column from supplier_payments
-- =====================================================
ALTER TABLE supplier_payments 
DROP COLUMN IF EXISTS payment_method;

-- =====================================================
-- DONE
-- =====================================================
-- Migration completed successfully!
-- Removed: payment_method column from supplier_payments table
-- The payment form is now simplified to only show debt info and payment amount

