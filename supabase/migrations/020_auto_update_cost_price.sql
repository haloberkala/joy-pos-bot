-- ==========================================
-- AUTO UPDATE PRODUCT COST PRICE ON PURCHASE
-- ==========================================
-- This trigger automatically updates the cost_price in products table
-- when a new purchase is recorded with a different cost price

CREATE OR REPLACE FUNCTION update_product_cost_price_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  -- Update cost price in products table if product_id exists
  IF NEW.product_id IS NOT NULL THEN
    UPDATE products
    SET 
      cost_price = NEW.cost_price,
      updated_at = NOW()
    WHERE id = NEW.product_id
    AND cost_price != NEW.cost_price; -- Only update if price changed
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on purchase_items
DROP TRIGGER IF EXISTS trigger_update_cost_price ON purchase_items;

CREATE TRIGGER trigger_update_cost_price
  AFTER INSERT ON purchase_items
  FOR EACH ROW
  EXECUTE FUNCTION update_product_cost_price_on_purchase();

-- ==========================================
-- VERIFY
-- ==========================================

SELECT 'Trigger created:' as info;
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_cost_price';
