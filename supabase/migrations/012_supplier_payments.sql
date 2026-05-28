-- Migration: Supplier Payments & Purchase Payment Status
-- Description: Add payment tracking for purchases and supplier debt management
-- Date: 2024

-- =====================================================
-- 1. Add payment_status to purchases table
-- =====================================================
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'paid' CHECK (payment_status IN ('paid', 'partial', 'unpaid'));

-- Update existing purchases to 'paid' status
UPDATE purchases SET payment_status = 'paid' WHERE payment_status IS NULL;

-- =====================================================
-- 2. Create supplier_payments table
-- =====================================================
CREATE TABLE IF NOT EXISTS supplier_payments (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  purchase_id BIGINT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'check', 'other')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_supplier_payments_store ON supplier_payments(store_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_purchase ON supplier_payments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_date ON supplier_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON purchases(payment_status);

-- =====================================================
-- 4. Create function for updated_at trigger (if not exists)
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. Create trigger for updated_at
-- =====================================================
DROP TRIGGER IF EXISTS update_supplier_payments_updated_at ON supplier_payments;
CREATE TRIGGER update_supplier_payments_updated_at
  BEFORE UPDATE ON supplier_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. Create function to calculate total paid for purchase
-- =====================================================
CREATE OR REPLACE FUNCTION get_total_paid_for_purchase(p_purchase_id BIGINT)
RETURNS DECIMAL(15, 2) AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) FROM supplier_payments WHERE purchase_id = p_purchase_id),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. Create function to auto-update purchase payment status
-- =====================================================
CREATE OR REPLACE FUNCTION update_purchase_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total_amount DECIMAL(15, 2);
  v_total_paid DECIMAL(15, 2);
  v_new_status VARCHAR(20);
BEGIN
  -- Get purchase total amount
  SELECT total_amount INTO v_total_amount
  FROM purchases
  WHERE id = COALESCE(NEW.purchase_id, OLD.purchase_id);

  -- Calculate total paid
  v_total_paid := get_total_paid_for_purchase(COALESCE(NEW.purchase_id, OLD.purchase_id));

  -- Determine new status
  IF v_total_paid >= v_total_amount THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'unpaid';
  END IF;

  -- Update purchase status
  UPDATE purchases
  SET payment_status = v_new_status,
      updated_at = NOW()
  WHERE id = COALESCE(NEW.purchase_id, OLD.purchase_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. Create trigger to auto-update payment status
-- =====================================================
DROP TRIGGER IF EXISTS trigger_update_purchase_payment_status ON supplier_payments;
CREATE TRIGGER trigger_update_purchase_payment_status
  AFTER INSERT OR UPDATE OR DELETE ON supplier_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_payment_status();

-- =====================================================
-- 9. Enable RLS on supplier_payments
-- =====================================================
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 10. Create RLS policies for supplier_payments
-- =====================================================

-- Policy: Users can view supplier payments for their store
DROP POLICY IF EXISTS "Users can view supplier payments for their store" ON supplier_payments;
CREATE POLICY "Users can view supplier payments for their store"
  ON supplier_payments FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

-- Policy: Owner and Admin can insert supplier payments
DROP POLICY IF EXISTS "Owner and Admin can insert supplier payments" ON supplier_payments;
CREATE POLICY "Owner and Admin can insert supplier payments"
  ON supplier_payments FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('owner', 'admin')
  );

-- Policy: Owner and Admin can update supplier payments
DROP POLICY IF EXISTS "Owner and Admin can update supplier payments" ON supplier_payments;
CREATE POLICY "Owner and Admin can update supplier payments"
  ON supplier_payments FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('owner', 'admin')
  );

-- Policy: Only Owner can delete supplier payments
DROP POLICY IF EXISTS "Only Owner can delete supplier payments" ON supplier_payments;
CREATE POLICY "Only Owner can delete supplier payments"
  ON supplier_payments FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
  );

-- =====================================================
-- 11. Create view for supplier debt summary
-- =====================================================
CREATE OR REPLACE VIEW supplier_debt_summary AS
SELECT 
  p.id AS purchase_id,
  p.store_id,
  p.supplier_id,
  s.name AS supplier_name,
  p.reference_no,
  p.purchase_date,
  p.total_amount,
  p.payment_status,
  COALESCE(
    (SELECT SUM(amount) FROM supplier_payments WHERE purchase_id = p.id),
    0
  ) AS total_paid,
  p.total_amount - COALESCE(
    (SELECT SUM(amount) FROM supplier_payments WHERE purchase_id = p.id),
    0
  ) AS remaining_amount,
  p.note,
  p.created_at,
  p.updated_at
FROM purchases p
LEFT JOIN suppliers s ON s.id = p.supplier_id
WHERE p.payment_status IN ('unpaid', 'partial')
ORDER BY p.purchase_date DESC;

-- =====================================================
-- 12. Grant permissions on view
-- =====================================================
GRANT SELECT ON supplier_debt_summary TO authenticated;

-- =====================================================
-- DONE
-- =====================================================
-- Migration completed successfully!
-- Tables created: supplier_payments
-- Views created: supplier_debt_summary
-- Functions created: get_total_paid_for_purchase, update_purchase_payment_status
-- Triggers created: trigger_update_purchase_payment_status
-- RLS policies: Enabled and configured
