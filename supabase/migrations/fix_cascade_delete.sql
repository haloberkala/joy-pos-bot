-- ==========================================
-- FIX CASCADE DELETE FOR ALL STORE-RELATED TABLES
-- ==========================================

-- This script ensures that when a store is deleted,
-- ALL related data is automatically deleted (CASCADE)

-- ==========================================
-- 1. EMPLOYEES (nullable for owner)
-- ==========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_store_id_fkey;
    ALTER TABLE employees ADD CONSTRAINT employees_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==========================================
-- 2. PRODUCTS
-- ==========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE products DROP CONSTRAINT IF EXISTS products_store_id_fkey;
    ALTER TABLE products ADD CONSTRAINT products_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==========================================
-- 3. CATEGORIES
-- ==========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_store_id_fkey;
    ALTER TABLE categories ADD CONSTRAINT categories_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==========================================
-- 4. BRANDS
-- ==========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE brands DROP CONSTRAINT IF EXISTS brands_store_id_fkey;
    ALTER TABLE brands ADD CONSTRAINT brands_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==========================================
-- 5. UNITS
-- ==========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'units' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE units DROP CONSTRAINT IF EXISTS units_store_id_fkey;
    ALTER TABLE units ADD CONSTRAINT units_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==========================================
-- 6. CUSTOMERS
-- ==========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_store_id_fkey;
    ALTER TABLE customers ADD CONSTRAINT customers_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==========================================
-- 7. SUPPLIERS
-- ==========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_store_id_fkey;
    ALTER TABLE suppliers ADD CONSTRAINT suppliers_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==========================================
-- 8. SALES (Transactions)
-- ==========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_store_id_fkey;
    ALTER TABLE sales ADD CONSTRAINT sales_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==========================================
-- 9. PURCHASES (Kulakan)
-- ==========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchases' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_store_id_fkey;
    ALTER TABLE purchases ADD CONSTRAINT purchases_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==========================================
-- 10. SHIPMENTS (Pengiriman)
-- ==========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shipments' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_store_id_fkey;
    ALTER TABLE shipments ADD CONSTRAINT shipments_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==========================================
-- 11. EXPENSES (Pengeluaran)
-- ==========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_store_id_fkey;
    ALTER TABLE expenses ADD CONSTRAINT expenses_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==========================================
-- 12. EXPENSE_CATEGORIES
-- ==========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expense_categories' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE expense_categories DROP CONSTRAINT IF EXISTS expense_categories_store_id_fkey;
    ALTER TABLE expense_categories ADD CONSTRAINT expense_categories_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==========================================
-- 13. STOCK_OPNAMES
-- ==========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_opnames' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE stock_opnames DROP CONSTRAINT IF EXISTS stock_opnames_store_id_fkey;
    ALTER TABLE stock_opnames ADD CONSTRAINT stock_opnames_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==========================================
-- 14. ATTENDANCES (Absensi)
-- ==========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendances' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_store_id_fkey;
    ALTER TABLE attendances ADD CONSTRAINT attendances_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==========================================
-- 15. PAYROLLS (Gaji)
-- ==========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payrolls' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE payrolls DROP CONSTRAINT IF EXISTS payrolls_store_id_fkey;
    ALTER TABLE payrolls ADD CONSTRAINT payrolls_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==========================================
-- 16. DEBT_PAYMENTS (Pembayaran Utang)
-- ==========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'debt_payments' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE debt_payments DROP CONSTRAINT IF EXISTS debt_payments_store_id_fkey;
    ALTER TABLE debt_payments ADD CONSTRAINT debt_payments_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==========================================
-- 17. SUPPLIER_PAYMENTS (Pembayaran Supplier)
-- ==========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supplier_payments' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE supplier_payments DROP CONSTRAINT IF EXISTS supplier_payments_store_id_fkey;
    ALTER TABLE supplier_payments ADD CONSTRAINT supplier_payments_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==========================================
-- 18. CLEAN UP ORPHANED DATA
-- ==========================================

-- Delete all data with NULL store_id (orphaned data)
-- Only for tables that have store_id column

DO $$
BEGIN
  -- Categories
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'store_id') THEN
    DELETE FROM categories WHERE store_id IS NULL;
  END IF;
  
  -- Brands
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brands' AND column_name = 'store_id') THEN
    DELETE FROM brands WHERE store_id IS NULL;
  END IF;
  
  -- Units
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'store_id') THEN
    DELETE FROM units WHERE store_id IS NULL;
  END IF;
  
  -- Products
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'store_id') THEN
    DELETE FROM products WHERE store_id IS NULL;
  END IF;
  
  -- Customers
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'store_id') THEN
    DELETE FROM customers WHERE store_id IS NULL;
  END IF;
  
  -- Suppliers
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'store_id') THEN
    DELETE FROM suppliers WHERE store_id IS NULL;
  END IF;
END $$;

-- Note: employees with NULL store_id are allowed (for owner role)

-- ==========================================
-- 19. CHILD TABLES (CASCADE via parent)
-- ==========================================

-- These tables don't have store_id directly,
-- but will be deleted via CASCADE from their parent tables

-- ==========================================
-- 19. CHILD TABLES (CASCADE via parent)
-- ==========================================

-- These tables don't have store_id directly,
-- but will be deleted via CASCADE from their parent tables

-- DEBT_PAYMENTS → CASCADE from SALES
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'debt_payments'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'debt_payments' AND column_name = 'sale_id'
  ) THEN
    ALTER TABLE debt_payments DROP CONSTRAINT IF EXISTS debt_payments_sale_id_fkey;
    ALTER TABLE debt_payments ADD CONSTRAINT debt_payments_sale_id_fkey 
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE;
  END IF;
END $$;

-- SALE_ITEMS → CASCADE from SALES
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'sale_items'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sale_items' AND column_name = 'sale_id'
  ) THEN
    ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS sale_items_sale_id_fkey;
    ALTER TABLE sale_items ADD CONSTRAINT sale_items_sale_id_fkey 
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE;
  END IF;
END $$;

-- PURCHASE_ITEMS → CASCADE from PURCHASES
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_items'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_items' AND column_name = 'purchase_id'
  ) THEN
    ALTER TABLE purchase_items DROP CONSTRAINT IF EXISTS purchase_items_purchase_id_fkey;
    ALTER TABLE purchase_items ADD CONSTRAINT purchase_items_purchase_id_fkey 
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE;
  END IF;
END $$;

-- STOCK_OPNAME_ITEMS → CASCADE from STOCK_OPNAMES (column name is opname_id, not stock_opname_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_opname_items'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_opname_items' AND column_name = 'opname_id'
  ) THEN
    ALTER TABLE stock_opname_items DROP CONSTRAINT IF EXISTS stock_opname_items_opname_id_fkey;
    ALTER TABLE stock_opname_items ADD CONSTRAINT stock_opname_items_opname_id_fkey 
      FOREIGN KEY (opname_id) REFERENCES stock_opnames(id) ON DELETE CASCADE;
  END IF;
END $$;

-- USER_SESSIONS → CASCADE from EMPLOYEES
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_sessions' AND column_name = 'employee_id'
  ) THEN
    ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS user_sessions_employee_id_fkey;
    ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_employee_id_fkey 
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
  END IF;
END $$;

-- FIX: supplier_payments.store_id type mismatch (bigint vs integer)
-- Change store_id from bigint to integer to match stores.id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supplier_payments' 
    AND column_name = 'store_id' 
    AND data_type = 'bigint'
  ) THEN
    -- Drop all RLS policies first (they depend on the column)
    DROP POLICY IF EXISTS "Users can view supplier payments for their store" ON supplier_payments;
    DROP POLICY IF EXISTS "Users can insert supplier payments for their store" ON supplier_payments;
    DROP POLICY IF EXISTS "Users can update supplier payments for their store" ON supplier_payments;
    DROP POLICY IF EXISTS "Users can delete supplier payments for their store" ON supplier_payments;
    DROP POLICY IF EXISTS "supplier_payments_select_policy" ON supplier_payments;
    DROP POLICY IF EXISTS "supplier_payments_insert_policy" ON supplier_payments;
    DROP POLICY IF EXISTS "supplier_payments_update_policy" ON supplier_payments;
    DROP POLICY IF EXISTS "supplier_payments_delete_policy" ON supplier_payments;
    
    -- Drop constraint
    ALTER TABLE supplier_payments DROP CONSTRAINT IF EXISTS supplier_payments_store_id_fkey;
    
    -- Change column type
    ALTER TABLE supplier_payments ALTER COLUMN store_id TYPE integer;
    
    -- Re-add constraint with CASCADE
    ALTER TABLE supplier_payments ADD CONSTRAINT supplier_payments_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
    
    -- Recreate RLS policies
    CREATE POLICY "supplier_payments_select_policy"
      ON supplier_payments FOR SELECT TO authenticated
      USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
        OR
        store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
      );
    
    CREATE POLICY "supplier_payments_insert_policy"
      ON supplier_payments FOR INSERT TO authenticated
      WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
        OR
        (
          (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin')
          AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
        )
      );
    
    CREATE POLICY "supplier_payments_update_policy"
      ON supplier_payments FOR UPDATE TO authenticated
      USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
        OR
        (
          (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
          AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
        )
      );
    
    CREATE POLICY "supplier_payments_delete_policy"
      ON supplier_payments FOR DELETE TO authenticated
      USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
        OR
        (
          (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
          AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
        )
      );
  END IF;
END $$;

-- ==========================================
-- 20. VERIFICATION
-- ==========================================

SELECT '=== CASCADE DELETE VERIFICATION ===' as info;

SELECT 'Foreign key constraints with CASCADE:' as info;
SELECT 
  tc.table_name, 
  tc.constraint_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name LIKE '%store_id%'
  AND rc.delete_rule = 'CASCADE'
ORDER BY tc.table_name;

SELECT '=== FIX COMPLETE ===' as info;
