-- ==========================================
-- FIX ALL RLS POLICIES FOR CUSTOM AUTHENTICATION
-- ==========================================

-- This script removes all auth.jwt() dependencies from RLS policies
-- and makes them permissive for custom authentication system

-- ==========================================
-- 1. STORES
-- ==========================================
DROP POLICY IF EXISTS "stores_select_policy" ON stores;
DROP POLICY IF EXISTS "stores_insert_policy" ON stores;
DROP POLICY IF EXISTS "stores_update_policy" ON stores;
DROP POLICY IF EXISTS "stores_delete_policy" ON stores;

CREATE POLICY "stores_select_policy" ON stores FOR SELECT USING (true);
CREATE POLICY "stores_insert_policy" ON stores FOR INSERT WITH CHECK (true);
CREATE POLICY "stores_update_policy" ON stores FOR UPDATE USING (true);
CREATE POLICY "stores_delete_policy" ON stores FOR DELETE USING (true);

-- ==========================================
-- 2. EMPLOYEES
-- ==========================================
DROP POLICY IF EXISTS "employees_select_policy" ON employees;
DROP POLICY IF EXISTS "employees_insert_policy" ON employees;
DROP POLICY IF EXISTS "employees_update_policy" ON employees;
DROP POLICY IF EXISTS "employees_delete_policy" ON employees;

CREATE POLICY "employees_select_policy" ON employees FOR SELECT USING (true);
CREATE POLICY "employees_insert_policy" ON employees FOR INSERT WITH CHECK (true);
CREATE POLICY "employees_update_policy" ON employees FOR UPDATE USING (true);
CREATE POLICY "employees_delete_policy" ON employees FOR DELETE USING (true);

-- ==========================================
-- 3. PRODUCTS
-- ==========================================
DROP POLICY IF EXISTS "products_select_policy" ON products;
DROP POLICY IF EXISTS "products_insert_policy" ON products;
DROP POLICY IF EXISTS "products_update_policy" ON products;
DROP POLICY IF EXISTS "products_delete_policy" ON products;

CREATE POLICY "products_select_policy" ON products FOR SELECT USING (true);
CREATE POLICY "products_insert_policy" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "products_update_policy" ON products FOR UPDATE USING (true);
CREATE POLICY "products_delete_policy" ON products FOR DELETE USING (true);

-- ==========================================
-- 4. CATEGORIES
-- ==========================================
DROP POLICY IF EXISTS "categories_select_policy" ON categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON categories;
DROP POLICY IF EXISTS "categories_update_policy" ON categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON categories;

CREATE POLICY "categories_select_policy" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_insert_policy" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "categories_update_policy" ON categories FOR UPDATE USING (true);
CREATE POLICY "categories_delete_policy" ON categories FOR DELETE USING (true);

-- ==========================================
-- 5. BRANDS
-- ==========================================
DROP POLICY IF EXISTS "brands_select_policy" ON brands;
DROP POLICY IF EXISTS "brands_insert_policy" ON brands;
DROP POLICY IF EXISTS "brands_update_policy" ON brands;
DROP POLICY IF EXISTS "brands_delete_policy" ON brands;

CREATE POLICY "brands_select_policy" ON brands FOR SELECT USING (true);
CREATE POLICY "brands_insert_policy" ON brands FOR INSERT WITH CHECK (true);
CREATE POLICY "brands_update_policy" ON brands FOR UPDATE USING (true);
CREATE POLICY "brands_delete_policy" ON brands FOR DELETE USING (true);

-- ==========================================
-- 6. UNITS
-- ==========================================
DROP POLICY IF EXISTS "units_select_policy" ON units;
DROP POLICY IF EXISTS "units_insert_policy" ON units;
DROP POLICY IF EXISTS "units_update_policy" ON units;
DROP POLICY IF EXISTS "units_delete_policy" ON units;

CREATE POLICY "units_select_policy" ON units FOR SELECT USING (true);
CREATE POLICY "units_insert_policy" ON units FOR INSERT WITH CHECK (true);
CREATE POLICY "units_update_policy" ON units FOR UPDATE USING (true);
CREATE POLICY "units_delete_policy" ON units FOR DELETE USING (true);

-- ==========================================
-- 7. CUSTOMERS
-- ==========================================
DROP POLICY IF EXISTS "customers_select_policy" ON customers;
DROP POLICY IF EXISTS "customers_insert_policy" ON customers;
DROP POLICY IF EXISTS "customers_update_policy" ON customers;
DROP POLICY IF EXISTS "customers_delete_policy" ON customers;

CREATE POLICY "customers_select_policy" ON customers FOR SELECT USING (true);
CREATE POLICY "customers_insert_policy" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "customers_update_policy" ON customers FOR UPDATE USING (true);
CREATE POLICY "customers_delete_policy" ON customers FOR DELETE USING (true);

-- ==========================================
-- 8. SUPPLIERS
-- ==========================================
DROP POLICY IF EXISTS "suppliers_select_policy" ON suppliers;
DROP POLICY IF EXISTS "suppliers_insert_policy" ON suppliers;
DROP POLICY IF EXISTS "suppliers_update_policy" ON suppliers;
DROP POLICY IF EXISTS "suppliers_delete_policy" ON suppliers;

CREATE POLICY "suppliers_select_policy" ON suppliers FOR SELECT USING (true);
CREATE POLICY "suppliers_insert_policy" ON suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "suppliers_update_policy" ON suppliers FOR UPDATE USING (true);
CREATE POLICY "suppliers_delete_policy" ON suppliers FOR DELETE USING (true);

-- ==========================================
-- 9. SALES
-- ==========================================
DROP POLICY IF EXISTS "sales_select_policy" ON sales;
DROP POLICY IF EXISTS "sales_insert_policy" ON sales;
DROP POLICY IF EXISTS "sales_update_policy" ON sales;
DROP POLICY IF EXISTS "sales_delete_policy" ON sales;

CREATE POLICY "sales_select_policy" ON sales FOR SELECT USING (true);
CREATE POLICY "sales_insert_policy" ON sales FOR INSERT WITH CHECK (true);
CREATE POLICY "sales_update_policy" ON sales FOR UPDATE USING (true);
CREATE POLICY "sales_delete_policy" ON sales FOR DELETE USING (true);

-- ==========================================
-- 10. SALE_ITEMS
-- ==========================================
DROP POLICY IF EXISTS "sale_items_select_policy" ON sale_items;
DROP POLICY IF EXISTS "sale_items_insert_policy" ON sale_items;
DROP POLICY IF EXISTS "sale_items_update_policy" ON sale_items;
DROP POLICY IF EXISTS "sale_items_delete_policy" ON sale_items;

CREATE POLICY "sale_items_select_policy" ON sale_items FOR SELECT USING (true);
CREATE POLICY "sale_items_insert_policy" ON sale_items FOR INSERT WITH CHECK (true);
CREATE POLICY "sale_items_update_policy" ON sale_items FOR UPDATE USING (true);
CREATE POLICY "sale_items_delete_policy" ON sale_items FOR DELETE USING (true);

-- ==========================================
-- 11. PURCHASES
-- ==========================================
DROP POLICY IF EXISTS "purchases_select_policy" ON purchases;
DROP POLICY IF EXISTS "purchases_insert_policy" ON purchases;
DROP POLICY IF EXISTS "purchases_update_policy" ON purchases;
DROP POLICY IF EXISTS "purchases_delete_policy" ON purchases;

CREATE POLICY "purchases_select_policy" ON purchases FOR SELECT USING (true);
CREATE POLICY "purchases_insert_policy" ON purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "purchases_update_policy" ON purchases FOR UPDATE USING (true);
CREATE POLICY "purchases_delete_policy" ON purchases FOR DELETE USING (true);

-- ==========================================
-- 12. PURCHASE_ITEMS
-- ==========================================
DROP POLICY IF EXISTS "purchase_items_select_policy" ON purchase_items;
DROP POLICY IF EXISTS "purchase_items_insert_policy" ON purchase_items;
DROP POLICY IF EXISTS "purchase_items_update_policy" ON purchase_items;
DROP POLICY IF EXISTS "purchase_items_delete_policy" ON purchase_items;

CREATE POLICY "purchase_items_select_policy" ON purchase_items FOR SELECT USING (true);
CREATE POLICY "purchase_items_insert_policy" ON purchase_items FOR INSERT WITH CHECK (true);
CREATE POLICY "purchase_items_update_policy" ON purchase_items FOR UPDATE USING (true);
CREATE POLICY "purchase_items_delete_policy" ON purchase_items FOR DELETE USING (true);

-- ==========================================
-- 13. SHIPMENTS
-- ==========================================
DROP POLICY IF EXISTS "shipments_select_policy" ON shipments;
DROP POLICY IF EXISTS "shipments_insert_policy" ON shipments;
DROP POLICY IF EXISTS "shipments_update_policy" ON shipments;
DROP POLICY IF EXISTS "shipments_delete_policy" ON shipments;

CREATE POLICY "shipments_select_policy" ON shipments FOR SELECT USING (true);
CREATE POLICY "shipments_insert_policy" ON shipments FOR INSERT WITH CHECK (true);
CREATE POLICY "shipments_update_policy" ON shipments FOR UPDATE USING (true);
CREATE POLICY "shipments_delete_policy" ON shipments FOR DELETE USING (true);

-- ==========================================
-- 14. EXPENSES
-- ==========================================
DROP POLICY IF EXISTS "expenses_select_policy" ON expenses;
DROP POLICY IF EXISTS "expenses_insert_policy" ON expenses;
DROP POLICY IF EXISTS "expenses_update_policy" ON expenses;
DROP POLICY IF EXISTS "expenses_delete_policy" ON expenses;

CREATE POLICY "expenses_select_policy" ON expenses FOR SELECT USING (true);
CREATE POLICY "expenses_insert_policy" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "expenses_update_policy" ON expenses FOR UPDATE USING (true);
CREATE POLICY "expenses_delete_policy" ON expenses FOR DELETE USING (true);

-- ==========================================
-- 15. EXPENSE_CATEGORIES
-- ==========================================
DROP POLICY IF EXISTS "expense_categories_select_policy" ON expense_categories;
DROP POLICY IF EXISTS "expense_categories_insert_policy" ON expense_categories;
DROP POLICY IF EXISTS "expense_categories_update_policy" ON expense_categories;
DROP POLICY IF EXISTS "expense_categories_delete_policy" ON expense_categories;

CREATE POLICY "expense_categories_select_policy" ON expense_categories FOR SELECT USING (true);
CREATE POLICY "expense_categories_insert_policy" ON expense_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "expense_categories_update_policy" ON expense_categories FOR UPDATE USING (true);
CREATE POLICY "expense_categories_delete_policy" ON expense_categories FOR DELETE USING (true);

-- ==========================================
-- 16. STOCK_OPNAMES
-- ==========================================
DROP POLICY IF EXISTS "stock_opnames_select_policy" ON stock_opnames;
DROP POLICY IF EXISTS "stock_opnames_insert_policy" ON stock_opnames;
DROP POLICY IF EXISTS "stock_opnames_update_policy" ON stock_opnames;
DROP POLICY IF EXISTS "stock_opnames_delete_policy" ON stock_opnames;

CREATE POLICY "stock_opnames_select_policy" ON stock_opnames FOR SELECT USING (true);
CREATE POLICY "stock_opnames_insert_policy" ON stock_opnames FOR INSERT WITH CHECK (true);
CREATE POLICY "stock_opnames_update_policy" ON stock_opnames FOR UPDATE USING (true);
CREATE POLICY "stock_opnames_delete_policy" ON stock_opnames FOR DELETE USING (true);

-- ==========================================
-- 17. STOCK_OPNAME_ITEMS
-- ==========================================
DROP POLICY IF EXISTS "stock_opname_items_select_policy" ON stock_opname_items;
DROP POLICY IF EXISTS "stock_opname_items_insert_policy" ON stock_opname_items;
DROP POLICY IF EXISTS "stock_opname_items_update_policy" ON stock_opname_items;
DROP POLICY IF EXISTS "stock_opname_items_delete_policy" ON stock_opname_items;

CREATE POLICY "stock_opname_items_select_policy" ON stock_opname_items FOR SELECT USING (true);
CREATE POLICY "stock_opname_items_insert_policy" ON stock_opname_items FOR INSERT WITH CHECK (true);
CREATE POLICY "stock_opname_items_update_policy" ON stock_opname_items FOR UPDATE USING (true);
CREATE POLICY "stock_opname_items_delete_policy" ON stock_opname_items FOR DELETE USING (true);

-- ==========================================
-- 18. ATTENDANCES
-- ==========================================
DROP POLICY IF EXISTS "attendances_select_policy" ON attendances;
DROP POLICY IF EXISTS "attendances_insert_policy" ON attendances;
DROP POLICY IF EXISTS "attendances_update_policy" ON attendances;
DROP POLICY IF EXISTS "attendances_delete_policy" ON attendances;

CREATE POLICY "attendances_select_policy" ON attendances FOR SELECT USING (true);
CREATE POLICY "attendances_insert_policy" ON attendances FOR INSERT WITH CHECK (true);
CREATE POLICY "attendances_update_policy" ON attendances FOR UPDATE USING (true);
CREATE POLICY "attendances_delete_policy" ON attendances FOR DELETE USING (true);

-- ==========================================
-- 19. PAYROLLS
-- ==========================================
DROP POLICY IF EXISTS "payrolls_select_policy" ON payrolls;
DROP POLICY IF EXISTS "payrolls_insert_policy" ON payrolls;
DROP POLICY IF EXISTS "payrolls_update_policy" ON payrolls;
DROP POLICY IF EXISTS "payrolls_delete_policy" ON payrolls;

CREATE POLICY "payrolls_select_policy" ON payrolls FOR SELECT USING (true);
CREATE POLICY "payrolls_insert_policy" ON payrolls FOR INSERT WITH CHECK (true);
CREATE POLICY "payrolls_update_policy" ON payrolls FOR UPDATE USING (true);
CREATE POLICY "payrolls_delete_policy" ON payrolls FOR DELETE USING (true);

-- ==========================================
-- 20. DEBT_PAYMENTS
-- ==========================================
DROP POLICY IF EXISTS "debt_payments_select_policy" ON debt_payments;
DROP POLICY IF EXISTS "debt_payments_insert_policy" ON debt_payments;
DROP POLICY IF EXISTS "debt_payments_update_policy" ON debt_payments;
DROP POLICY IF EXISTS "debt_payments_delete_policy" ON debt_payments;

CREATE POLICY "debt_payments_select_policy" ON debt_payments FOR SELECT USING (true);
CREATE POLICY "debt_payments_insert_policy" ON debt_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "debt_payments_update_policy" ON debt_payments FOR UPDATE USING (true);
CREATE POLICY "debt_payments_delete_policy" ON debt_payments FOR DELETE USING (true);

-- ==========================================
-- 21. SUPPLIER_PAYMENTS
-- ==========================================
DROP POLICY IF EXISTS "supplier_payments_select_policy" ON supplier_payments;
DROP POLICY IF EXISTS "supplier_payments_insert_policy" ON supplier_payments;
DROP POLICY IF EXISTS "supplier_payments_update_policy" ON supplier_payments;
DROP POLICY IF EXISTS "supplier_payments_delete_policy" ON supplier_payments;
DROP POLICY IF EXISTS "Users can view supplier payments for their store" ON supplier_payments;
DROP POLICY IF EXISTS "Users can insert supplier payments for their store" ON supplier_payments;
DROP POLICY IF EXISTS "Users can update supplier payments for their store" ON supplier_payments;
DROP POLICY IF EXISTS "Users can delete supplier payments for their store" ON supplier_payments;

CREATE POLICY "supplier_payments_select_policy" ON supplier_payments FOR SELECT USING (true);
CREATE POLICY "supplier_payments_insert_policy" ON supplier_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "supplier_payments_update_policy" ON supplier_payments FOR UPDATE USING (true);
CREATE POLICY "supplier_payments_delete_policy" ON supplier_payments FOR DELETE USING (true);

-- ==========================================
-- 22. USER_SESSIONS
-- ==========================================
DROP POLICY IF EXISTS "user_sessions_select_policy" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_insert_policy" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_update_policy" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_delete_policy" ON user_sessions;

CREATE POLICY "user_sessions_select_policy" ON user_sessions FOR SELECT USING (true);
CREATE POLICY "user_sessions_insert_policy" ON user_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "user_sessions_update_policy" ON user_sessions FOR UPDATE USING (true);
CREATE POLICY "user_sessions_delete_policy" ON user_sessions FOR DELETE USING (true);

-- ==========================================
-- VERIFICATION
-- ==========================================

SELECT '=== ALL RLS POLICIES UPDATED ===' as info;

SELECT 'Total policies updated:' as info, COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public';

SELECT '=== TABLES WITH RLS ENABLED ===' as info;

SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

SELECT '=== FIX COMPLETE ===' as info;
