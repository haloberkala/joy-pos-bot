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
  wholesale_min_qty: number; // qty threshold for wholesale price
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

export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'debit';
export type PaymentStatus = 'paid' | 'debt';
export type PriceMode = 'retail' | 'wholesale';

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
