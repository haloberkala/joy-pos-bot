// ==========================================
// 1. MANAJEMEN USER & OTORISASI
// ==========================================

export type UserRole = 'owner' | 'admin' | 'cashier';

export interface Store {
  id: number;
  name: string;
  address: string;
  phone: string;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: number;
  store_id: number | null;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  avatar?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ==========================================
// 2. MASTER DATA (TERISOLASI PER TOKO)
// ==========================================

export interface Category {
  id: number;
  store_id: number;
  name: string;
  slug: string;
  icon?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Brand {
  id: number;
  store_id: number;
  name: string;
  slug: string;
  created_at: Date;
  updated_at: Date;
}

export interface Unit {
  id: number;
  store_id: number;
  name: string;
  short_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: number;
  store_id: number;
  category_id: number | null;
  brand_id: number | null;
  unit_id: number | null;
  name: string;
  code: string;
  expiry_date?: string | null;
  image?: string;
  quantity: number;
  min_stock_alert: number;
  cost_price: number;
  selling_price: number; // backward compat alias for retail
  selling_price_retail: number;
  selling_price_wholesale: number;
  selling_price_special: number;
  wholesale_min_qty: number; // qty threshold for wholesale price
  special_min_qty: number; // qty threshold for special price
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: number | null;
  updated_by: number | null;
}

// ==========================================
// 3. MODUL PEMBELIAN (RESTOCK / KULAKAN)
// ==========================================

export interface Supplier {
  id: number;
  store_id: number;
  name: string;
  phone: string;
  address?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Purchase {
  id: number;
  store_id: number;
  user_id: number;
  supplier_id: number | null;
  date: Date;
  reference_no: string;
  image_proof?: string;
  total_amount: number;
  note?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseDetail {
  id: number;
  purchase_id: number;
  product_id: number;
  quantity: number;
  cost_price: number;
  sub_total: number;
  created_at: Date;
  updated_at: Date;
}

// ==========================================
// 4. MODUL PENJUALAN (KASIR/POS)
// ==========================================

export interface Customer {
  id: number;
  store_id: number;
  name: string;
  phone: string;
  address?: string;
  created_at: Date;
  updated_at: Date;
}

export type PaymentMethod = 'cash' | 'qris' | 'transfer';
export type PaymentStatus = 'paid' | 'debt' | 'refunded';

export interface Refund {
  id: number;
  sale_id: number;
  store_id: number;
  reason: string;
  refund_amount: number;
  date: Date;
  processed_by: string;
  created_at: Date;
}
export type PriceMode = 'retail' | 'wholesale' | 'special';
export type SaleType = 'sale' | 'owner_withdrawal';

// Service item (mechanic fee, etc.) — UI-only, not a product
export interface ServiceItem {
  id: number;
  description: string;
  price: number;
}

export interface Sale {
  id: number;
  store_id: number;
  user_id: number;
  customer_id: number | null;
  invoice_number: string;
  date: Date;
  sub_total: number;
  discount: number;
  tax: number;
  grand_total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  amount_received: number;
  change_amount: number;
  due_date?: Date | null;
  note?: string;
  refund_reason?: string;
  paid_at?: Date;
  paid_by_name?: string;
  paid_by_role?: string;
  created_at: Date;
  updated_at: Date;
}

export interface SaleDetail {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  price_at_sale: number;
  cost_at_sale: number;
  total_price: number;
  price_mode: PriceMode;
  created_at: Date;
  updated_at: Date;
}

// ==========================================
// 5. PENGELUARAN (BIAYA OPERASIONAL)
// ==========================================

export interface ExpenseCategory {
  id: number;
  store_id: number;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Expense {
  id: number;
  store_id: number;
  user_id: number;
  category_id: number;
  title: string;
  amount: number;
  date: Date;
  note?: string;
  created_at: Date;
  updated_at: Date;
}

// ==========================================
// 6. RIWAYAT STOK
// ==========================================

export type StockLogType = 'purchase' | 'sale' | 'adjustment' | 'opname' | 'damage';

export interface StockLog {
  id: number;
  store_id: number;
  product_id: number;
  previous_qty: number;
  qty_change: number;
  current_qty: number;
  type: StockLogType;
  reference_id: number | null;
  note?: string;
  created_at: Date;
}

// ==========================================
// 7. STOCK OPNAME (CEK FISIK)
// ==========================================

export interface StockOpname {
  id: number;
  store_id: number;
  user_id: number;
  opname_number: string;
  date: Date;
  note?: string;
  created_at: Date;
  updated_at: Date;
}

export interface StockOpnameDetail {
  id: number;
  stock_opname_id: number;
  product_id: number;
  system_qty: number;
  physical_qty: number;
  difference: number;
  note?: string;
  created_at: Date;
  updated_at: Date;
}

// ==========================================
// 8. PEMBAYARAN UTANG
// ==========================================

export interface DebtPayment {
  id: number;
  sale_id: number;
  amount: number;
  date: Date;
  note?: string;
  created_at: Date;
}

// ==========================================
// CART (UI-only, not in DB)
// ==========================================

export interface CartItem {
  product: Product;
  quantity: number;
  price_per_unit: number;
  price_mode: PriceMode;
  discount?: number;
}

// ==========================================
// 9. UTANG SUPPLIER (STORE -> SUPPLIER)
// ==========================================

export type SupplierDebtStatus = 'unpaid' | 'partial' | 'paid';

export interface SupplierDebt {
  id: number;
  store_id: number;
  purchase_id: number;
  supplier_id: number;
  total_amount: number;
  paid_amount: number;
  status: SupplierDebtStatus;
  due_date?: Date | null;
  note?: string;
  created_at: Date;
  updated_at: Date;
}

export interface SupplierDebtPayment {
  id: number;
  supplier_debt_id: number;
  amount: number;
  date: Date;
  note?: string;
  created_at: Date;
}

// ==========================================
// 10. SDM (HUMAN RESOURCES)
// ==========================================

export type EmployeeRole = 'owner' | 'admin' | 'cashier' | 'employee';
export type EmployeeStatus = 'active' | 'inactive';
export type AttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'cuti' | 'alpha';
export type PayrollStatus = 'pending' | 'transferred';

export interface Employee {
  id: number;
  store_id: number;
  name: string;
  position: string;
  phone: string;
  daily_salary: number;
  role: EmployeeRole;
  start_date: Date;
  status: EmployeeStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Attendance {
  id: number;
  store_id: number;
  employee_id: number;
  date: string; // YYYY-MM-DD
  clock_in: string | null; // HH:mm
  clock_out: string | null; // HH:mm
  duration_minutes: number | null;
  status: AttendanceStatus;
  note: string;
  is_manual_edit: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Payroll {
  id: number;
  store_id: number;
  employee_id: number;
  month: number; // 1-12
  year: number;
  days_present: number;
  daily_salary: number;
  total_salary: number;
  status: PayrollStatus;
  transferred_at: Date | null;
  note: string;
  created_at: Date;
  updated_at: Date;
}
