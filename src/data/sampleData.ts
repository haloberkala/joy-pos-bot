import {
  Product,
  Category,
  Sale,
  SaleDetail,
  Store,
  Unit,
  Brand,
  Supplier,
  StockOpname,
  Customer,
  Expense,
  ExpenseCategory,
  Purchase,
  PurchaseDetail,
  StockLog,
  StockOpnameDetail,
} from '@/types/pos';

// ================ STORES ================
export const stores: Store[] = [
  {
    id: 1,
    name: 'Toko Berkah - Bangunan',
    address: 'Jl. Merdeka No. 123, Jakarta Pusat',
    phone: '021-12345678',
    created_at: new Date('2023-01-01'),
    updated_at: new Date('2023-01-01'),
  },
  {
    id: 2,
    name: 'Toko Berkah - Makanan',
    address: 'Jl. Sudirman No. 456, Jakarta Selatan',
    phone: '021-87654321',
    created_at: new Date('2023-06-01'),
    updated_at: new Date('2023-06-01'),
  },
  {
    id: 3,
    name: 'Toko Berkah - Elektronik',
    address: 'Jl. Gatot Subroto No. 789, Jakarta Timur',
    phone: '021-11223344',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
];

// ================ UNITS ================
export const units: Unit[] = [
  // Store 1 - Bangunan
  { id: 1, store_id: 1, name: 'Pieces', short_name: 'pcs', created_at: new Date(), updated_at: new Date() },
  { id: 2, store_id: 1, name: 'Sak', short_name: 'sak', created_at: new Date(), updated_at: new Date() },
  { id: 3, store_id: 1, name: 'Batang', short_name: 'btg', created_at: new Date(), updated_at: new Date() },
  { id: 4, store_id: 1, name: 'Kilogram', short_name: 'kg', created_at: new Date(), updated_at: new Date() },
  // Store 2 - Makanan
  { id: 5, store_id: 2, name: 'Pieces', short_name: 'pcs', created_at: new Date(), updated_at: new Date() },
  { id: 6, store_id: 2, name: 'Box', short_name: 'box', created_at: new Date(), updated_at: new Date() },
  { id: 7, store_id: 2, name: 'Karton', short_name: 'krt', created_at: new Date(), updated_at: new Date() },
  { id: 8, store_id: 2, name: 'Liter', short_name: 'ltr', created_at: new Date(), updated_at: new Date() },
];

// ================ BRANDS ================
export const brands: Brand[] = [
  // Store 1 - Bangunan
  { id: 1, store_id: 1, name: 'Tiga Roda', slug: 'tiga-roda', created_at: new Date(), updated_at: new Date() },
  { id: 2, store_id: 1, name: 'Holcim', slug: 'holcim', created_at: new Date(), updated_at: new Date() },
  { id: 3, store_id: 1, name: 'Dulux', slug: 'dulux', created_at: new Date(), updated_at: new Date() },
  { id: 4, store_id: 1, name: 'Avian', slug: 'avian', created_at: new Date(), updated_at: new Date() },
  // Store 2 - Makanan
  { id: 5, store_id: 2, name: 'Indomie', slug: 'indomie', created_at: new Date(), updated_at: new Date() },
  { id: 6, store_id: 2, name: 'Aqua', slug: 'aqua', created_at: new Date(), updated_at: new Date() },
  { id: 7, store_id: 2, name: 'Kapal Api', slug: 'kapal-api', created_at: new Date(), updated_at: new Date() },
  { id: 8, store_id: 2, name: 'Indofood', slug: 'indofood', created_at: new Date(), updated_at: new Date() },
];

// ================ CATEGORIES ================
export const categories: Category[] = [
  // Store 1 - Bangunan
  { id: 1, store_id: 1, name: 'Semen & Beton', slug: 'semen', icon: '🧱', created_at: new Date(), updated_at: new Date() },
  { id: 2, store_id: 1, name: 'Cat & Pelapis', slug: 'cat', icon: '🎨', created_at: new Date(), updated_at: new Date() },
  { id: 3, store_id: 1, name: 'Besi & Baja', slug: 'besi', icon: '⚙️', created_at: new Date(), updated_at: new Date() },
  { id: 4, store_id: 1, name: 'Pipa & Sanitasi', slug: 'pipa', icon: '🔧', created_at: new Date(), updated_at: new Date() },
  { id: 5, store_id: 1, name: 'Listrik', slug: 'listrik', icon: '💡', created_at: new Date(), updated_at: new Date() },
  // Store 2 - Makanan
  { id: 6, store_id: 2, name: 'Makanan', slug: 'food', icon: '🍔', created_at: new Date(), updated_at: new Date() },
  { id: 7, store_id: 2, name: 'Minuman', slug: 'drink', icon: '🥤', created_at: new Date(), updated_at: new Date() },
  { id: 8, store_id: 2, name: 'Snack', slug: 'snack', icon: '🍿', created_at: new Date(), updated_at: new Date() },
  { id: 9, store_id: 2, name: 'Makanan Instan', slug: 'instant', icon: '🍜', created_at: new Date(), updated_at: new Date() },
  { id: 10, store_id: 2, name: 'Susu & Olahan', slug: 'dairy', icon: '🥛', created_at: new Date(), updated_at: new Date() },
];

// ================ SUPPLIERS ================
export const suppliers: Supplier[] = [
  // Store 1 - Bangunan
  { id: 1, store_id: 1, name: 'PT. Semen Indonesia', phone: '021-5551234', address: 'Jl. Industri No. 1, Jakarta', created_at: new Date(), updated_at: new Date() },
  { id: 2, store_id: 1, name: 'CV. Baja Utama', phone: '021-5555678', address: 'Jl. Raya Bogor No. 45, Depok', created_at: new Date(), updated_at: new Date() },
  { id: 3, store_id: 1, name: 'UD. Cat Jaya', phone: '021-5559999', address: 'Jl. Kramat Jaya No. 10, Jakarta Timur', created_at: new Date(), updated_at: new Date() },
  // Store 2 - Makanan
  { id: 4, store_id: 2, name: 'PT. Indofood Sukses Makmur', phone: '021-6661234', address: 'Jl. Sudirman, Jakarta', created_at: new Date(), updated_at: new Date() },
  { id: 5, store_id: 2, name: 'CV. Mitra Sejahtera', phone: '021-6665678', address: 'Jl. Raya Bogor No. 45, Depok', created_at: new Date(), updated_at: new Date() },
];

// ================ PRODUCTS ================
export const products: Product[] = [
  // Store 1 - Bangunan
  { id: 1, store_id: 1, category_id: 1, brand_id: 1, unit_id: 2, name: 'Semen Tiga Roda 50kg', code: '8880001001', quantity: 200, min_stock_alert: 50, cost_price: 55000, selling_price: 72000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 2, store_id: 1, category_id: 1, brand_id: 2, unit_id: 2, name: 'Semen Holcim 40kg', code: '8880001002', quantity: 150, min_stock_alert: 40, cost_price: 48000, selling_price: 65000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 3, store_id: 1, category_id: 2, brand_id: 3, unit_id: 1, name: 'Cat Dulux Weathershield 5L', code: '8880001003', quantity: 30, min_stock_alert: 10, cost_price: 280000, selling_price: 350000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 4, store_id: 1, category_id: 2, brand_id: 4, unit_id: 1, name: 'Cat Avian Interior 2.5L', code: '8880001004', quantity: 45, min_stock_alert: 15, cost_price: 95000, selling_price: 130000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 5, store_id: 1, category_id: 3, brand_id: null, unit_id: 3, name: 'Besi Beton 10mm', code: '8880001005', quantity: 100, min_stock_alert: 30, cost_price: 75000, selling_price: 95000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 6, store_id: 1, category_id: 4, brand_id: null, unit_id: 3, name: 'Pipa PVC 3/4 inch 4m', code: '8880001006', quantity: 80, min_stock_alert: 20, cost_price: 28000, selling_price: 38000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 7, store_id: 1, category_id: 5, brand_id: null, unit_id: 1, name: 'Kabel NYM 2x1.5mm 50m', code: '8880001007', quantity: 25, min_stock_alert: 10, cost_price: 450000, selling_price: 580000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 8, store_id: 1, category_id: 5, brand_id: null, unit_id: 1, name: 'Saklar Broco', code: '8880001008', quantity: 60, min_stock_alert: 20, cost_price: 15000, selling_price: 25000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },

  // Store 2 - Makanan
  { id: 9, store_id: 2, category_id: 9, brand_id: 5, unit_id: 5, name: 'Indomie Goreng Original', code: '8991234567890', quantity: 120, min_stock_alert: 50, cost_price: 2500, selling_price: 3500, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 10, store_id: 2, category_id: 7, brand_id: 6, unit_id: 5, name: 'Aqua Botol 600ml', code: '8991234567891', quantity: 200, min_stock_alert: 100, cost_price: 2000, selling_price: 3000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 11, store_id: 2, category_id: 7, brand_id: 7, unit_id: 5, name: 'Kopi Kapal Api Special', code: '8991234567892', quantity: 150, min_stock_alert: 100, cost_price: 1500, selling_price: 2500, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 12, store_id: 2, category_id: 8, brand_id: 8, unit_id: 5, name: 'Chitato Sapi Panggang', code: '8991234567893', quantity: 45, min_stock_alert: 30, cost_price: 8000, selling_price: 12000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 13, store_id: 2, category_id: 9, brand_id: 5, unit_id: 5, name: 'Indomie Kuah Ayam Bawang', code: '8991234567900', quantity: 100, min_stock_alert: 50, cost_price: 2500, selling_price: 3500, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 14, store_id: 2, category_id: 10, brand_id: 8, unit_id: 5, name: 'Susu Ultra Full Cream 1L', code: '8991234567898', quantity: 40, min_stock_alert: 30, cost_price: 16000, selling_price: 22000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 15, store_id: 2, category_id: 6, brand_id: null, unit_id: 5, name: 'ABC Kecap Manis 600ml', code: '8991234567896', quantity: 18, min_stock_alert: 15, cost_price: 18000, selling_price: 25000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 16, store_id: 2, category_id: 8, brand_id: null, unit_id: 5, name: 'Roma Kelapa 300g', code: '8991234567897', quantity: 35, min_stock_alert: 25, cost_price: 8000, selling_price: 12000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
];

// ================ CUSTOMERS ================
export let customers: Customer[] = [
  { id: 1, store_id: 1, name: 'Pak Joko Kontraktor', phone: '08123456789', address: 'Jl. Mangga No. 10, Jakarta', created_at: new Date('2023-06-01'), updated_at: new Date('2023-06-01') },
  { id: 2, store_id: 1, name: 'Ibu Rina Renovasi', phone: '08198765432', address: 'Jl. Durian No. 5, Depok', created_at: new Date('2023-08-15'), updated_at: new Date('2023-08-15') },
  { id: 3, store_id: 2, name: 'Budi Santoso', phone: '08111222333', created_at: new Date('2023-03-20'), updated_at: new Date('2023-03-20') },
  { id: 4, store_id: 2, name: 'Siti Nurhaliza', phone: '08155666777', address: 'Jl. Anggrek No. 8, Jakarta Selatan', created_at: new Date('2023-05-10'), updated_at: new Date('2023-05-10') },
];

// Mutable customer operations
export function addCustomer(customer: Customer) {
  customers = [...customers, customer];
}

export function updateCustomer(id: number, updates: Partial<Customer>) {
  customers = customers.map(c => c.id === id ? { ...c, ...updates, updated_at: new Date() } : c);
}

export function findCustomerByPhone(phone: string, storeId: number): Customer | undefined {
  return customers.find(c => c.phone === phone && c.store_id === storeId);
}

export function getCustomersForStore(storeId: number): Customer[] {
  return customers.filter(c => c.store_id === storeId);
}

// ================ EXPENSE CATEGORIES ================
export const expenseCategories: ExpenseCategory[] = [
  { id: 1, store_id: 1, name: 'Listrik', created_at: new Date(), updated_at: new Date() },
  { id: 2, store_id: 1, name: 'Gaji Karyawan', created_at: new Date(), updated_at: new Date() },
  { id: 3, store_id: 1, name: 'Sewa Tempat', created_at: new Date(), updated_at: new Date() },
  { id: 4, store_id: 1, name: 'Transportasi', created_at: new Date(), updated_at: new Date() },
  { id: 5, store_id: 1, name: 'Kebersihan', created_at: new Date(), updated_at: new Date() },
  { id: 6, store_id: 1, name: 'Internet & Telepon', created_at: new Date(), updated_at: new Date() },
  { id: 7, store_id: 1, name: 'Peralatan', created_at: new Date(), updated_at: new Date() },
  { id: 8, store_id: 1, name: 'Lain-lain', created_at: new Date(), updated_at: new Date() },
];

// ================ SAMPLE EXPENSES ================
export const sampleExpenses: Expense[] = [
  { id: 1, store_id: 1, user_id: 2, category_id: 1, title: 'Tagihan listrik bulan Januari', amount: 2500000, date: new Date('2024-01-05'), created_at: new Date('2024-01-05'), updated_at: new Date('2024-01-05') },
  { id: 2, store_id: 1, user_id: 1, category_id: 2, title: 'Gaji karyawan bulan Januari (2 orang)', amount: 8000000, date: new Date('2024-01-01'), created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') },
  { id: 3, store_id: 1, user_id: 1, category_id: 3, title: 'Sewa tempat bulan Januari', amount: 5000000, date: new Date('2024-01-01'), created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') },
  { id: 4, store_id: 2, user_id: 2, category_id: 1, title: 'Tagihan listrik toko makanan', amount: 1800000, date: new Date('2024-01-05'), created_at: new Date('2024-01-05'), updated_at: new Date('2024-01-05') },
  { id: 5, store_id: 2, user_id: 1, category_id: 2, title: 'Gaji karyawan toko makanan', amount: 6000000, date: new Date('2024-01-01'), created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') },
];

// ================ SAMPLE PURCHASES ================
export let samplePurchases: Purchase[] = [
  {
    id: 1, store_id: 1, user_id: 2, supplier_id: 1, date: new Date('2024-01-10'),
    reference_no: 'PO-20240110-001', total_amount: 5500000,
    note: 'Pembelian semen rutin bulanan',
    created_at: new Date('2024-01-10'), updated_at: new Date('2024-01-10'),
  },
  {
    id: 2, store_id: 1, user_id: 2, supplier_id: 3, date: new Date('2024-01-12'),
    reference_no: 'PO-20240112-001', total_amount: 2800000,
    note: 'Restok cat interior & exterior',
    created_at: new Date('2024-01-12'), updated_at: new Date('2024-01-12'),
  },
  {
    id: 3, store_id: 2, user_id: 2, supplier_id: 4, date: new Date('2024-01-14'),
    reference_no: 'PO-20240114-001', total_amount: 750000,
    note: 'Restok mie instan dari retailer',
    created_at: new Date('2024-01-14'), updated_at: new Date('2024-01-14'),
  },
];

export let samplePurchaseDetails: PurchaseDetail[] = [
  { id: 1, purchase_id: 1, product_id: 1, quantity: 100, cost_price: 55000, sub_total: 5500000, created_at: new Date(), updated_at: new Date() },
  { id: 2, purchase_id: 2, product_id: 3, quantity: 10, cost_price: 280000, sub_total: 2800000, created_at: new Date(), updated_at: new Date() },
  { id: 3, purchase_id: 3, product_id: 9, quantity: 200, cost_price: 2500, sub_total: 500000, created_at: new Date(), updated_at: new Date() },
  { id: 4, purchase_id: 3, product_id: 13, quantity: 100, cost_price: 2500, sub_total: 250000, created_at: new Date(), updated_at: new Date() },
];

// ================ SAMPLE SALES ================
export const sampleSales: Sale[] = [
  {
    id: 1, store_id: 1, user_id: 3, customer_id: 1, invoice_number: 'INV-20240115-001',
    date: new Date('2024-01-15T10:30:00'), sub_total: 216000, discount: 0, tax: 0, grand_total: 216000,
    payment_method: 'cash', amount_received: 250000, change_amount: 34000,
    created_at: new Date('2024-01-15T10:30:00'), updated_at: new Date('2024-01-15T10:30:00'),
  },
  {
    id: 2, store_id: 1, user_id: 3, customer_id: null, invoice_number: 'INV-20240115-002',
    date: new Date('2024-01-15T11:45:00'), sub_total: 350000, discount: 0, tax: 0, grand_total: 350000,
    payment_method: 'qris', amount_received: 350000, change_amount: 0,
    created_at: new Date('2024-01-15T11:45:00'), updated_at: new Date('2024-01-15T11:45:00'),
  },
  {
    id: 3, store_id: 2, user_id: 3, customer_id: 3, invoice_number: 'INV-20240115-003',
    date: new Date('2024-01-15T14:20:00'), sub_total: 26500, discount: 0, tax: 0, grand_total: 26500,
    payment_method: 'debit', amount_received: 26500, change_amount: 0,
    created_at: new Date('2024-01-15T14:20:00'), updated_at: new Date('2024-01-15T14:20:00'),
  },
  {
    id: 4, store_id: 2, user_id: 3, customer_id: null, invoice_number: 'INV-20240116-001',
    date: new Date('2024-01-16T09:15:00'), sub_total: 46000, discount: 0, tax: 0, grand_total: 46000,
    payment_method: 'cash', amount_received: 50000, change_amount: 4000,
    created_at: new Date('2024-01-16T09:15:00'), updated_at: new Date('2024-01-16T09:15:00'),
  },
];

// ================ SALE DETAILS ================
export const sampleSaleDetails: SaleDetail[] = [
  // Sale 1 (Store 1 - Bangunan)
  { id: 1, sale_id: 1, product_id: 1, quantity: 3, price_at_sale: 72000, cost_at_sale: 55000, total_price: 216000, created_at: new Date(), updated_at: new Date() },
  // Sale 2 (Store 1 - Bangunan)
  { id: 2, sale_id: 2, product_id: 3, quantity: 1, price_at_sale: 350000, cost_at_sale: 280000, total_price: 350000, created_at: new Date(), updated_at: new Date() },
  // Sale 3 (Store 2 - Makanan)
  { id: 3, sale_id: 3, product_id: 9, quantity: 5, price_at_sale: 3500, cost_at_sale: 2500, total_price: 17500, created_at: new Date(), updated_at: new Date() },
  { id: 4, sale_id: 3, product_id: 10, quantity: 3, price_at_sale: 3000, cost_at_sale: 2000, total_price: 9000, created_at: new Date(), updated_at: new Date() },
  // Sale 4 (Store 2 - Makanan)
  { id: 5, sale_id: 4, product_id: 12, quantity: 2, price_at_sale: 12000, cost_at_sale: 8000, total_price: 24000, created_at: new Date(), updated_at: new Date() },
  { id: 6, sale_id: 4, product_id: 14, quantity: 1, price_at_sale: 22000, cost_at_sale: 16000, total_price: 22000, created_at: new Date(), updated_at: new Date() },
];

// ================ SAMPLE STOCK OPNAME ================
export const sampleStockOpnames: StockOpname[] = [
  { id: 1, store_id: 1, user_id: 1, opname_number: 'SO-20240110-001', date: new Date('2024-01-10'), note: 'Stock opname rutin bangunan', created_at: new Date('2024-01-10'), updated_at: new Date('2024-01-10') },
  { id: 2, store_id: 2, user_id: 2, opname_number: 'SO-20240115-001', date: new Date('2024-01-15'), note: 'Stock opname toko makanan', created_at: new Date('2024-01-15'), updated_at: new Date('2024-01-15') },
];

// ================ HELPERS ================

export function getProduct(productId: number): Product | undefined {
  return products.find(p => p.id === productId);
}

export function getCategoryForProduct(product: Product): Category | undefined {
  return categories.find(c => c.id === product.category_id);
}

export function getBrandForProduct(product: Product): Brand | undefined {
  return brands.find(b => b.id === product.brand_id);
}

export function getSaleDetailsWithProducts(saleId: number) {
  return sampleSaleDetails
    .filter(d => d.sale_id === saleId)
    .map(d => ({
      ...d,
      product: getProduct(d.product_id),
    }));
}

export function getStoreName(storeId: number): string {
  const store = stores.find(s => s.id === storeId);
  return store?.name.split(' - ')[1] || store?.name || String(storeId);
}

// Store-filtered helpers
export function getProductsForStore(storeId: number): Product[] {
  return products.filter(p => p.store_id === storeId && p.is_active);
}

export function getCategoriesForStore(storeId: number): Category[] {
  return categories.filter(c => c.store_id === storeId);
}

export function getBrandsForStore(storeId: number): Brand[] {
  return brands.filter(b => b.store_id === storeId);
}

export function getSuppliersForStore(storeId: number): Supplier[] {
  return suppliers.filter(s => s.store_id === storeId);
}

export function getPurchasesForStore(storeId: number): Purchase[] {
  return samplePurchases.filter(p => p.store_id === storeId);
}
