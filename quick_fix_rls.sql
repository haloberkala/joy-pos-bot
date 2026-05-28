-- ==========================================
-- QUICK FIX: DISABLE RLS ON CRITICAL TABLES
-- ==========================================

-- This is a quick fix to make data visible immediately
-- For production, you should implement proper RLS policies

-- Disable RLS on categories
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- Disable RLS on brands
ALTER TABLE brands DISABLE ROW LEVEL SECURITY;

-- Disable RLS on units
ALTER TABLE units DISABLE ROW LEVEL SECURITY;

-- Disable RLS on products
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Disable RLS on stores
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;

-- Disable RLS on employees
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;

-- Disable RLS on customers
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- Disable RLS on suppliers
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;

-- Disable RLS on sales
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;

-- Disable RLS on sale_items
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;

-- Disable RLS on purchases
ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;

-- Disable RLS on purchase_items
ALTER TABLE purchase_items DISABLE ROW LEVEL SECURITY;

-- Disable RLS on shipments
ALTER TABLE shipments DISABLE ROW LEVEL SECURITY;

-- Disable RLS on expenses
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

-- Disable RLS on expense_categories
ALTER TABLE expense_categories DISABLE ROW LEVEL SECURITY;

-- Disable RLS on stock_opnames
ALTER TABLE stock_opnames DISABLE ROW LEVEL SECURITY;

-- Disable RLS on stock_opname_items
ALTER TABLE stock_opname_items DISABLE ROW LEVEL SECURITY;

-- Disable RLS on attendances
ALTER TABLE attendances DISABLE ROW LEVEL SECURITY;

-- Disable RLS on payrolls
ALTER TABLE payrolls DISABLE ROW LEVEL SECURITY;

-- Disable RLS on debt_payments
ALTER TABLE debt_payments DISABLE ROW LEVEL SECURITY;

-- Disable RLS on supplier_payments
ALTER TABLE supplier_payments DISABLE ROW LEVEL SECURITY;

-- Disable RLS on user_sessions
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;

SELECT '=== RLS DISABLED ON ALL TABLES ===' as info;

-- Verify
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'categories', 'brands', 'units', 'products', 'stores', 'employees',
    'customers', 'suppliers', 'sales', 'sale_items', 'purchases', 'purchase_items',
    'shipments', 'expenses', 'expense_categories', 'stock_opnames', 'stock_opname_items',
    'attendances', 'payrolls', 'debt_payments', 'supplier_payments', 'user_sessions'
  )
ORDER BY tablename;

SELECT '=== QUICK FIX COMPLETE ===' as info;
