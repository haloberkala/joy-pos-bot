-- =====================================================
-- MIGRATION: Database Invoice Generator
-- Purpose: Generate unique sequential invoice numbers
-- Safe for concurrent transactions
-- =====================================================

-- Step 1: Create sequence for invoice numbering
-- This ensures thread-safe, atomic invoice number generation
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  NO CYCLE;

-- Step 2: Create function to generate invoice numbers
-- Format: INV-YYYYMMDD-000001
CREATE OR REPLACE FUNCTION generate_invoice_number(p_store_id integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_sequence_num bigint;
  v_date_part text;
  v_invoice_number text;
BEGIN
  -- Get next sequence value (atomic, thread-safe)
  v_sequence_num := nextval('invoice_number_seq');
  
  -- Format date as YYYYMMDD
  v_date_part := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  -- Format invoice: INV-YYYYMMDD-000001
  -- Use lpad to ensure 6 digits with leading zeros
  v_invoice_number := 'INV-' || v_date_part || '-' || lpad(v_sequence_num::text, 6, '0');
  
  RETURN v_invoice_number;
END;
$$;

-- Step 3: Update create_sale_transaction to use database-generated invoice
CREATE OR REPLACE FUNCTION create_sale_transaction(
  p_sale jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale_id integer;
  v_invoice text;
  v_item jsonb;
  v_result jsonb;
BEGIN
  -- Generate invoice number using sequence (thread-safe)
  v_invoice := generate_invoice_number((p_sale->>'store_id')::int);
  
  -- Insert sale record with generated invoice
  INSERT INTO sales (
    store_id,
    customer_id,
    invoice_number,
    sale_date,
    sub_total,
    discount,
    tax,
    grand_total,
    payment_method,
    payment_status,
    amount_received,
    change_amount,
    due_date,
    note,
    cashier_name
  )
  VALUES (
    (p_sale->>'store_id')::int,
    (p_sale->>'customer_id')::int,
    v_invoice,  -- Use generated invoice
    COALESCE((p_sale->>'sale_date')::timestamp, CURRENT_TIMESTAMP),
    (p_sale->>'sub_total')::numeric,
    COALESCE((p_sale->>'discount')::numeric, 0),
    COALESCE((p_sale->>'tax')::numeric, 0),
    (p_sale->>'grand_total')::numeric,
    (p_sale->>'payment_method')::text,
    (p_sale->>'payment_status')::text,
    (p_sale->>'amount_received')::numeric,
    (p_sale->>'change_amount')::numeric,
    (p_sale->>'due_date')::timestamp,
    (p_sale->>'note')::text,
    (p_sale->>'cashier_name')::text
  )
  RETURNING id INTO v_sale_id;
  
  -- Insert sale items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO sale_items (
      sale_id,
      product_id,
      product_name,
      product_code,
      quantity,
      price_per_unit,
      cost_per_unit,
      total_price,
      price_mode,
      is_service
    )
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::int,
      (v_item->>'product_name')::text,
      (v_item->>'product_code')::text,
      (v_item->>'quantity')::int,
      (v_item->>'price_per_unit')::numeric,
      (v_item->>'cost_per_unit')::numeric,
      (v_item->>'total_price')::numeric,
      (v_item->>'price_mode')::text,
      COALESCE((v_item->>'is_service')::boolean, false)
    );
    
    -- Update product stock (only for non-service items)
    IF (v_item->>'product_id') IS NOT NULL AND 
       COALESCE((v_item->>'is_service')::boolean, false) = false THEN
      UPDATE products
      SET quantity = quantity - (v_item->>'quantity')::int
      WHERE id = (v_item->>'product_id')::int;
    END IF;
  END LOOP;
  
  -- Return complete sale record as JSON
  SELECT row_to_json(s.*) INTO v_result
  FROM sales s
  WHERE s.id = v_sale_id;
  
  RETURN v_result;
END;
$$;

-- Step 4: Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_invoice_number(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION create_sale_transaction(jsonb, jsonb) TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE invoice_number_seq TO authenticated;

-- Step 5: Add helpful comments
COMMENT ON SEQUENCE invoice_number_seq IS 'Global sequence for generating unique invoice numbers across all stores';
COMMENT ON FUNCTION generate_invoice_number(integer) IS 'Generates unique invoice number in format INV-YYYYMMDD-000001. Thread-safe using PostgreSQL SEQUENCE.';
COMMENT ON FUNCTION create_sale_transaction(jsonb, jsonb) IS 'Creates sale transaction with auto-generated invoice number. Handles sale insertion, items, and stock updates atomically.';

-- =====================================================
-- VERIFICATION QUERIES (Optional - for testing)
-- =====================================================

-- Test invoice generation (should return INV-YYYYMMDD-000001, INV-YYYYMMDD-000002, etc.)
-- SELECT generate_invoice_number(1);
-- SELECT generate_invoice_number(1);
-- SELECT generate_invoice_number(2);

-- Check current sequence value
-- SELECT currval('invoice_number_seq');

-- Reset sequence if needed (USE WITH CAUTION - only for testing)
-- SELECT setval('invoice_number_seq', 1, false);
