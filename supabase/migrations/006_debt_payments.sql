-- ==========================================
-- DEBT PAYMENTS (CICILAN UTANG)
-- ==========================================

DROP TABLE IF EXISTS debt_payments CASCADE;

CREATE TABLE debt_payments (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_debt_payments_sale_id ON debt_payments(sale_id);
CREATE INDEX idx_debt_payments_payment_date ON debt_payments(payment_date);

-- RLS
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "debt_payments_select_policy"
  ON debt_payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = debt_payments.sale_id
      AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
        OR
        s.store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
      )
    )
  );

CREATE POLICY "debt_payments_insert_policy"
  ON debt_payments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = debt_payments.sale_id
      AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
        OR
        (
          (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'cashier')
          AND s.store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
        )
      )
    )
  );

-- ==========================================
-- FUNCTION: Auto-update sale payment_status when debt is paid
-- ==========================================

CREATE OR REPLACE FUNCTION update_sale_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  sale_record RECORD;
  total_paid DECIMAL(15, 2);
BEGIN
  -- Get sale info
  SELECT * INTO sale_record FROM sales WHERE id = NEW.sale_id;
  
  -- Calculate total paid
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM debt_payments
  WHERE sale_id = NEW.sale_id;
  
  -- Update payment_status if fully paid
  IF total_paid >= sale_record.grand_total THEN
    UPDATE sales
    SET payment_status = 'paid'
    WHERE id = NEW.sale_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER debt_payment_update_status
  AFTER INSERT ON debt_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_sale_payment_status();

-- ==========================================
-- VERIFY
-- ==========================================

SELECT 'Table created:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'debt_payments';

SELECT 'Trigger created:' as info;
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'debt_payment_update_status';
