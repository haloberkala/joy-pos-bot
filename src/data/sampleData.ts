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
    name: 'Minimarket Berkah - Pusat',
    address: 'Jl. Merdeka No. 123, Jakarta Pusat',
    phone: '021-12345678',
    created_at: new Date('2023-01-01'),
    updated_at: new Date('2023-01-01'),
  },
  {
    id: 2,
    name: 'Minimarket Berkah - Cabang Selatan',
    address: 'Jl. Sudirman No. 456, Jakarta Selatan',
    phone: '021-87654321',
    created_at: new Date('2023-06-01'),
    updated_at: new Date('2023-06-01'),
  },
  {
    id: 3,
    name: 'Minimarket Berkah - Cabang Timur',
    address: 'Jl. Gatot Subroto No. 789, Jakarta Timur',
    phone: '021-11223344',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
];

// ================ UNITS ================
export const units: Unit[] = [
  { id: 1, store_id: 1, name: 'Pieces', short_name: 'pcs', created_at: new Date(), updated_at: new Date() },
  { id: 2, store_id: 1, name: 'Box', short_name: 'box', created_at: new Date(), updated_at: new Date() },
  { id: 3, store_id: 1, name: 'Karton', short_name: 'krt', created_at: new Date(), updated_at: new Date() },
  { id: 4, store_id: 1, name: 'Kilogram', short_name: 'kg', created_at: new Date(), updated_at: new Date() },
  { id: 5, store_id: 1, name: 'Liter', short_name: 'ltr', created_at: new Date(), updated_at: new Date() },
  { id: 6, store_id: 1, name: 'Pack', short_name: 'pack', created_at: new Date(), updated_at: new Date() },
  { id: 7, store_id: 1, name: 'Lusin', short_name: 'lsn', created_at: new Date(), updated_at: new Date() },
];

// ================ BRANDS ================
export const brands: Brand[] = [
  { id: 1, store_id: 1, name: 'Indomie', slug: 'indomie', created_at: new Date(), updated_at: new Date() },
  { id: 2, store_id: 1, name: 'Aqua', slug: 'aqua', created_at: new Date(), updated_at: new Date() },
  { id: 3, store_id: 1, name: 'Kapal Api', slug: 'kapal-api', created_at: new Date(), updated_at: new Date() },
  { id: 4, store_id: 1, name: 'Indofood', slug: 'indofood', created_at: new Date(), updated_at: new Date() },
  { id: 5, store_id: 1, name: 'Unilever', slug: 'unilever', created_at: new Date(), updated_at: new Date() },
  { id: 6, store_id: 1, name: 'Wings', slug: 'wings', created_at: new Date(), updated_at: new Date() },
  { id: 7, store_id: 1, name: 'ABC', slug: 'abc', created_at: new Date(), updated_at: new Date() },
  { id: 8, store_id: 1, name: 'Mayora', slug: 'mayora', created_at: new Date(), updated_at: new Date() },
];

// ================ CATEGORIES ================
export const categories: Category[] = [
  { id: 0, store_id: 1, name: 'Semua', slug: 'all', icon: '🏷️', created_at: new Date(), updated_at: new Date() },
  { id: 1, store_id: 1, name: 'Makanan', slug: 'food', icon: '🍔', created_at: new Date(), updated_at: new Date() },
  { id: 2, store_id: 1, name: 'Minuman', slug: 'drink', icon: '🥤', created_at: new Date(), updated_at: new Date() },
  { id: 3, store_id: 1, name: 'Snack', slug: 'snack', icon: '🍿', created_at: new Date(), updated_at: new Date() },
  { id: 4, store_id: 1, name: 'Susu & Olahan', slug: 'dairy', icon: '🥛', created_at: new Date(), updated_at: new Date() },
  { id: 5, store_id: 1, name: 'Makanan Instan', slug: 'instant', icon: '🍜', created_at: new Date(), updated_at: new Date() },
  { id: 6, store_id: 1, name: 'Perawatan Diri', slug: 'personal', icon: '🧴', created_at: new Date(), updated_at: new Date() },
  { id: 7, store_id: 1, name: 'Rumah Tangga', slug: 'household', icon: '🧹', created_at: new Date(), updated_at: new Date() },
];

// ================ SUPPLIERS ================
export const suppliers: Supplier[] = [
  { id: 1, store_id: 1, name: 'PT. Indofood Sukses Makmur', phone: '021-5551234', address: 'Jl. Industri No. 1, Jakarta', created_at: new Date(), updated_at: new Date() },
  { id: 2, store_id: 1, name: 'CV. Mitra Sejahtera', phone: '021-5555678', address: 'Jl. Raya Bogor No. 45, Depok', created_at: new Date(), updated_at: new Date() },
  { id: 3, store_id: 1, name: 'PT. Unilever Indonesia', phone: '021-5559999', address: 'Jl. Jenderal Sudirman, Jakarta', created_at: new Date(), updated_at: new Date() },
];

// ================ PRODUCTS ================
export const products: Product[] = [
  { id: 1, store_id: 1, category_id: 5, brand_id: 1, unit_id: 1, name: 'Indomie Goreng Original', code: '8991234567890', quantity: 120, min_stock_alert: 50, cost_price: 2500, selling_price: 3500, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 2, store_id: 1, category_id: 2, brand_id: 2, unit_id: 1, name: 'Aqua Botol 600ml', code: '8991234567891', quantity: 200, min_stock_alert: 100, cost_price: 2000, selling_price: 3000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 3, store_id: 1, category_id: 2, brand_id: 3, unit_id: 1, name: 'Kopi Kapal Api Special', code: '8991234567892', quantity: 150, min_stock_alert: 100, cost_price: 1500, selling_price: 2500, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 4, store_id: 1, category_id: 3, brand_id: 4, unit_id: 1, name: 'Chitato Rasa Sapi Panggang', code: '8991234567893', quantity: 45, min_stock_alert: 30, cost_price: 8000, selling_price: 12000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 5, store_id: 1, category_id: 7, brand_id: 5, unit_id: 1, name: 'Sunlight Sabun Cuci Piring 800ml', code: '8991234567894', quantity: 30, min_stock_alert: 20, cost_price: 12000, selling_price: 16000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 6, store_id: 1, category_id: 7, brand_id: 6, unit_id: 1, name: 'So Klin Pewangi 900ml', code: '8991234567895', quantity: 25, min_stock_alert: 20, cost_price: 15000, selling_price: 22000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 7, store_id: 1, category_id: 1, brand_id: 7, unit_id: 1, name: 'ABC Kecap Manis 600ml', code: '8991234567896', quantity: 18, min_stock_alert: 15, cost_price: 18000, selling_price: 25000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 8, store_id: 1, category_id: 3, brand_id: 8, unit_id: 1, name: 'Roma Kelapa 300g', code: '8991234567897', quantity: 35, min_stock_alert: 25, cost_price: 8000, selling_price: 12000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 9, store_id: 1, category_id: 4, brand_id: 4, unit_id: 1, name: 'Susu Ultra Full Cream 1L', code: '8991234567898', quantity: 40, min_stock_alert: 30, cost_price: 16000, selling_price: 22000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 10, store_id: 1, category_id: 6, brand_id: 5, unit_id: 1, name: 'Lifebuoy Sabun Mandi 100g', code: '8991234567899', quantity: 60, min_stock_alert: 40, cost_price: 4000, selling_price: 6000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 11, store_id: 1, category_id: 5, brand_id: 1, unit_id: 1, name: 'Indomie Kuah Ayam Bawang', code: '8991234567900', quantity: 100, min_stock_alert: 50, cost_price: 2500, selling_price: 3500, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
  { id: 12, store_id: 1, category_id: 2, brand_id: 7, unit_id: 1, name: 'Teh Botol Sosro 450ml', code: '8991234567901', quantity: 80, min_stock_alert: 50, cost_price: 4000, selling_price: 6000, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 },
];

// ================ CUSTOMERS ================
export const customers: Customer[] = [
  { id: 1, store_id: 1, name: 'Andi Wijaya', phone: '08123456789', address: 'Jl. Mangga No. 10, Jakarta', created_at: new Date('2023-06-01'), updated_at: new Date('2023-06-01') },
  { id: 2, store_id: 1, name: 'Siti Nurhaliza', phone: '08198765432', created_at: new Date('2023-08-15'), updated_at: new Date('2023-08-15') },
  { id: 3, store_id: 1, name: 'Budi Santoso', phone: '08111222333', created_at: new Date('2023-03-20'), updated_at: new Date('2023-03-20') },
];

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
  { id: 4, store_id: 2, user_id: 2, category_id: 1, title: 'Tagihan listrik cabang selatan', amount: 1800000, date: new Date('2024-01-05'), created_at: new Date('2024-01-05'), updated_at: new Date('2024-01-05') },
  { id: 5, store_id: 2, user_id: 1, category_id: 2, title: 'Gaji karyawan cabang selatan', amount: 6000000, date: new Date('2024-01-01'), created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') },
  { id: 6, store_id: 1, user_id: 2, category_id: 6, title: 'Tagihan internet dan telepon', amount: 500000, date: new Date('2024-01-15'), created_at: new Date('2024-01-15'), updated_at: new Date('2024-01-15') },
  { id: 7, store_id: 1, user_id: 2, category_id: 5, title: 'Perlengkapan kebersihan toko', amount: 350000, date: new Date('2024-01-15'), created_at: new Date('2024-01-15'), updated_at: new Date('2024-01-15') },
  { id: 8, store_id: 3, user_id: 1, category_id: 3, title: 'Sewa tempat cabang timur', amount: 4000000, date: new Date('2024-01-16'), created_at: new Date('2024-01-16'), updated_at: new Date('2024-01-16') },
  { id: 9, store_id: 3, user_id: 2, category_id: 7, title: 'Pembelian rak display baru', amount: 1200000, date: new Date('2024-01-16'), created_at: new Date('2024-01-16'), updated_at: new Date('2024-01-16') },
];

// ================ SAMPLE SALES (replaces Transaction) ================
export const sampleSales: Sale[] = [
  {
    id: 1, store_id: 1, user_id: 3, customer_id: null, invoice_number: 'INV-20240115-001',
    date: new Date('2024-01-15T10:30:00'), sub_total: 26500, discount: 0, tax: 0, grand_total: 26500,
    payment_method: 'cash', amount_received: 50000, change_amount: 23500,
    created_at: new Date('2024-01-15T10:30:00'), updated_at: new Date('2024-01-15T10:30:00'),
  },
  {
    id: 2, store_id: 1, user_id: 3, customer_id: null, invoice_number: 'INV-20240115-002',
    date: new Date('2024-01-15T11:45:00'), sub_total: 46000, discount: 0, tax: 0, grand_total: 46000,
    payment_method: 'qris', amount_received: 46000, change_amount: 0,
    created_at: new Date('2024-01-15T11:45:00'), updated_at: new Date('2024-01-15T11:45:00'),
  },
  {
    id: 3, store_id: 2, user_id: 3, customer_id: null, invoice_number: 'INV-20240115-003',
    date: new Date('2024-01-15T14:20:00'), sub_total: 57000, discount: 0, tax: 0, grand_total: 57000,
    payment_method: 'debit', amount_received: 57000, change_amount: 0,
    created_at: new Date('2024-01-15T14:20:00'), updated_at: new Date('2024-01-15T14:20:00'),
  },
  {
    id: 4, store_id: 1, user_id: 3, customer_id: 3, invoice_number: 'INV-20240116-001',
    date: new Date('2024-01-16T09:15:00'), sub_total: 82500, discount: 2500, tax: 0, grand_total: 80000,
    payment_method: 'cash', amount_received: 100000, change_amount: 20000,
    created_at: new Date('2024-01-16T09:15:00'), updated_at: new Date('2024-01-16T09:15:00'),
  },
];

// ================ SALE DETAILS ================
export const sampleSaleDetails: SaleDetail[] = [
  // Sale 1
  { id: 1, sale_id: 1, product_id: 1, quantity: 5, price_at_sale: 3500, cost_at_sale: 2500, total_price: 17500, created_at: new Date(), updated_at: new Date() },
  { id: 2, sale_id: 1, product_id: 2, quantity: 3, price_at_sale: 3000, cost_at_sale: 2000, total_price: 9000, created_at: new Date(), updated_at: new Date() },
  // Sale 2
  { id: 3, sale_id: 2, product_id: 4, quantity: 2, price_at_sale: 12000, cost_at_sale: 8000, total_price: 24000, created_at: new Date(), updated_at: new Date() },
  { id: 4, sale_id: 2, product_id: 9, quantity: 1, price_at_sale: 22000, cost_at_sale: 16000, total_price: 22000, created_at: new Date(), updated_at: new Date() },
  // Sale 3
  { id: 5, sale_id: 3, product_id: 7, quantity: 1, price_at_sale: 25000, cost_at_sale: 18000, total_price: 25000, created_at: new Date(), updated_at: new Date() },
  { id: 6, sale_id: 3, product_id: 5, quantity: 2, price_at_sale: 16000, cost_at_sale: 12000, total_price: 32000, created_at: new Date(), updated_at: new Date() },
  // Sale 4
  { id: 7, sale_id: 4, product_id: 1, quantity: 10, price_at_sale: 3500, cost_at_sale: 2500, total_price: 35000, created_at: new Date(), updated_at: new Date() },
  { id: 8, sale_id: 4, product_id: 11, quantity: 10, price_at_sale: 3500, cost_at_sale: 2500, total_price: 35000, created_at: new Date(), updated_at: new Date() },
  { id: 9, sale_id: 4, product_id: 3, quantity: 5, price_at_sale: 2500, cost_at_sale: 1500, total_price: 12500, created_at: new Date(), updated_at: new Date() },
];

// ================ SAMPLE STOCK OPNAME ================
export const sampleStockOpnames: StockOpname[] = [
  { id: 1, store_id: 1, user_id: 1, opname_number: 'SO-20240110-001', date: new Date('2024-01-10'), note: 'Stock opname rutin bulanan', created_at: new Date('2024-01-10'), updated_at: new Date('2024-01-10') },
  { id: 2, store_id: 2, user_id: 2, opname_number: 'SO-20240115-001', date: new Date('2024-01-15'), note: 'Stock opname mingguan', created_at: new Date('2024-01-15'), updated_at: new Date('2024-01-15') },
];

// ================ HELPERS ================

// Get product by id
export function getProduct(productId: number): Product | undefined {
  return products.find(p => p.id === productId);
}

// Get category for product
export function getCategoryForProduct(product: Product): Category | undefined {
  return categories.find(c => c.id === product.category_id);
}

// Get brand for product
export function getBrandForProduct(product: Product): Brand | undefined {
  return brands.find(b => b.id === product.brand_id);
}

// Get sale details with product info
export function getSaleDetailsWithProducts(saleId: number) {
  return sampleSaleDetails
    .filter(d => d.sale_id === saleId)
    .map(d => ({
      ...d,
      product: getProduct(d.product_id),
    }));
}

// Get store name short
export function getStoreName(storeId: number): string {
  const store = stores.find(s => s.id === storeId);
  return store?.name.split(' - ')[1] || store?.name || String(storeId);
}
