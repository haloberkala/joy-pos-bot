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
  DebtPayment,
} from '@/types/pos';

// ================ STORES ================
export const stores: Store[] = [
  {
    id: 1,
    name: 'Toko Berkah - Bangunan',
    address: 'Jl. Merdeka No. 123, Banjarmasin',
    phone: '0511-12345678',
    created_at: new Date('2023-01-01'),
    updated_at: new Date('2023-01-01'),
  },
  {
    id: 2,
    name: 'Toko Berkah - Makanan',
    address: 'Jl. Sudirman No. 456, Banjarmasin',
    phone: '0511-87654321',
    created_at: new Date('2023-06-01'),
    updated_at: new Date('2023-06-01'),
  },
  {
    id: 3,
    name: 'Toko Berkah - Elektronik',
    address: 'Jl. Gatot Subroto No. 789, Banjarmasin',
    phone: '0511-11223344',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
];

// Helper to create product with triple pricing
function mkProduct(p: Omit<Product, 'selling_price_retail' | 'selling_price_wholesale' | 'selling_price_special' | 'wholesale_min_qty' | 'special_min_qty' | 'selling_price'> & {
  selling_price_retail: number;
  selling_price_wholesale: number;
  selling_price_special?: number;
  wholesale_min_qty: number;
  special_min_qty?: number;
}): Product {
  return {
    ...p,
    selling_price: p.selling_price_retail, // backward compat
    selling_price_special: p.selling_price_special ?? Math.round(p.selling_price_wholesale * 0.9),
    special_min_qty: p.special_min_qty ?? Math.round(p.wholesale_min_qty * 2),
  };
}

// ================ UNITS ================
export let units: Unit[] = [
  { id: 1, store_id: 1, name: 'Pieces', short_name: 'pcs', created_at: new Date(), updated_at: new Date() },
  { id: 2, store_id: 1, name: 'Sak', short_name: 'sak', created_at: new Date(), updated_at: new Date() },
  { id: 3, store_id: 1, name: 'Batang', short_name: 'btg', created_at: new Date(), updated_at: new Date() },
  { id: 4, store_id: 1, name: 'Kilogram', short_name: 'kg', created_at: new Date(), updated_at: new Date() },
  { id: 5, store_id: 2, name: 'Pieces', short_name: 'pcs', created_at: new Date(), updated_at: new Date() },
  { id: 6, store_id: 2, name: 'Box', short_name: 'box', created_at: new Date(), updated_at: new Date() },
  { id: 7, store_id: 2, name: 'Karton', short_name: 'krt', created_at: new Date(), updated_at: new Date() },
  { id: 8, store_id: 2, name: 'Liter', short_name: 'ltr', created_at: new Date(), updated_at: new Date() },
  { id: 9, store_id: 3, name: 'Pieces', short_name: 'pcs', created_at: new Date(), updated_at: new Date() },
  { id: 10, store_id: 3, name: 'Unit', short_name: 'unit', created_at: new Date(), updated_at: new Date() },
];

// ================ BRANDS ================
export let brands: Brand[] = [
  { id: 1, store_id: 1, name: 'Tiga Roda', slug: 'tiga-roda', created_at: new Date(), updated_at: new Date() },
  { id: 2, store_id: 1, name: 'Holcim', slug: 'holcim', created_at: new Date(), updated_at: new Date() },
  { id: 3, store_id: 1, name: 'Dulux', slug: 'dulux', created_at: new Date(), updated_at: new Date() },
  { id: 4, store_id: 1, name: 'Avian', slug: 'avian', created_at: new Date(), updated_at: new Date() },
  { id: 5, store_id: 2, name: 'Indomie', slug: 'indomie', created_at: new Date(), updated_at: new Date() },
  { id: 6, store_id: 2, name: 'Aqua', slug: 'aqua', created_at: new Date(), updated_at: new Date() },
  { id: 7, store_id: 2, name: 'Kapal Api', slug: 'kapal-api', created_at: new Date(), updated_at: new Date() },
  { id: 8, store_id: 2, name: 'Indofood', slug: 'indofood', created_at: new Date(), updated_at: new Date() },
  { id: 9, store_id: 3, name: 'Samsung', slug: 'samsung', created_at: new Date(), updated_at: new Date() },
  { id: 10, store_id: 3, name: 'Polytron', slug: 'polytron', created_at: new Date(), updated_at: new Date() },
  { id: 11, store_id: 3, name: 'Panasonic', slug: 'panasonic', created_at: new Date(), updated_at: new Date() },
  { id: 12, store_id: 3, name: 'Miyako', slug: 'miyako', created_at: new Date(), updated_at: new Date() },
];

// ================ CATEGORIES ================
export let categories: Category[] = [
  { id: 1, store_id: 1, name: 'Semen & Beton', slug: 'semen', icon: '🧱', created_at: new Date(), updated_at: new Date() },
  { id: 2, store_id: 1, name: 'Cat & Pelapis', slug: 'cat', icon: '🎨', created_at: new Date(), updated_at: new Date() },
  { id: 3, store_id: 1, name: 'Besi & Baja', slug: 'besi', icon: '⚙️', created_at: new Date(), updated_at: new Date() },
  { id: 4, store_id: 1, name: 'Pipa & Sanitasi', slug: 'pipa', icon: '🔧', created_at: new Date(), updated_at: new Date() },
  { id: 5, store_id: 1, name: 'Listrik', slug: 'listrik', icon: '💡', created_at: new Date(), updated_at: new Date() },
  { id: 6, store_id: 2, name: 'Makanan', slug: 'food', icon: '🍔', created_at: new Date(), updated_at: new Date() },
  { id: 7, store_id: 2, name: 'Minuman', slug: 'drink', icon: '🥤', created_at: new Date(), updated_at: new Date() },
  { id: 8, store_id: 2, name: 'Snack', slug: 'snack', icon: '🍿', created_at: new Date(), updated_at: new Date() },
  { id: 9, store_id: 2, name: 'Makanan Instan', slug: 'instant', icon: '🍜', created_at: new Date(), updated_at: new Date() },
  { id: 10, store_id: 2, name: 'Susu & Olahan', slug: 'dairy', icon: '🥛', created_at: new Date(), updated_at: new Date() },
  { id: 11, store_id: 3, name: 'TV & Audio', slug: 'tv-audio', icon: '📺', created_at: new Date(), updated_at: new Date() },
  { id: 12, store_id: 3, name: 'Kulkas & AC', slug: 'kulkas-ac', icon: '❄️', created_at: new Date(), updated_at: new Date() },
  { id: 13, store_id: 3, name: 'Mesin Cuci', slug: 'mesin-cuci', icon: '🫧', created_at: new Date(), updated_at: new Date() },
  { id: 14, store_id: 3, name: 'Dapur', slug: 'dapur', icon: '🍳', created_at: new Date(), updated_at: new Date() },
  { id: 15, store_id: 3, name: 'Kipas & Pemanas', slug: 'kipas', icon: '🌀', created_at: new Date(), updated_at: new Date() },
];

// ================ SUPPLIERS ================
export const suppliers: Supplier[] = [
  { id: 1, store_id: 1, name: 'PT. Semen Indonesia', phone: '0511-5551234', address: 'Jl. Industri No. 1, Banjarmasin', created_at: new Date(), updated_at: new Date() },
  { id: 2, store_id: 1, name: 'CV. Baja Utama', phone: '0511-5555678', address: 'Jl. Raya Bogor No. 45', created_at: new Date(), updated_at: new Date() },
  { id: 3, store_id: 1, name: 'UD. Cat Jaya', phone: '0511-5559999', address: 'Jl. Kramat Jaya No. 10', created_at: new Date(), updated_at: new Date() },
  { id: 4, store_id: 2, name: 'PT. Indofood Sukses Makmur', phone: '0511-6661234', address: 'Jl. Sudirman, Banjarmasin', created_at: new Date(), updated_at: new Date() },
  { id: 5, store_id: 2, name: 'CV. Mitra Sejahtera', phone: '0511-6665678', address: 'Jl. Raya Bogor No. 45', created_at: new Date(), updated_at: new Date() },
  { id: 6, store_id: 3, name: 'PT. Samsung Electronics', phone: '0511-7771234', address: 'Jl. Gatot Subroto, Banjarmasin', created_at: new Date(), updated_at: new Date() },
  { id: 7, store_id: 3, name: 'CV. Elektronik Jaya', phone: '0511-7775678', address: 'Jl. Ahmad Yani No. 88', created_at: new Date(), updated_at: new Date() },
];

// ================ PRODUCTS ================
export let products: Product[] = [
  // Store 1 - Bangunan (8 produk + 4 tambahan)
  mkProduct({ id: 1, store_id: 1, category_id: 1, brand_id: 1, unit_id: 2, name: 'Semen Tiga Roda 50kg', code: '8880001001', quantity: 200, min_stock_alert: 50, cost_price: 55000, selling_price_retail: 72000, selling_price_wholesale: 68000, wholesale_min_qty: 10, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 2, store_id: 1, category_id: 1, brand_id: 2, unit_id: 2, name: 'Semen Holcim 40kg', code: '8880001002', quantity: 150, min_stock_alert: 40, cost_price: 48000, selling_price_retail: 65000, selling_price_wholesale: 60000, wholesale_min_qty: 10, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 3, store_id: 1, category_id: 2, brand_id: 3, unit_id: 1, name: 'Cat Dulux Weathershield 5L', code: '8880001003', quantity: 30, min_stock_alert: 10, cost_price: 280000, selling_price_retail: 350000, selling_price_wholesale: 320000, wholesale_min_qty: 5, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 4, store_id: 1, category_id: 2, brand_id: 4, unit_id: 1, name: 'Cat Avian Interior 2.5L', code: '8880001004', quantity: 45, min_stock_alert: 15, cost_price: 95000, selling_price_retail: 130000, selling_price_wholesale: 118000, wholesale_min_qty: 5, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 5, store_id: 1, category_id: 3, brand_id: null, unit_id: 3, name: 'Besi Beton 10mm', code: '8880001005', quantity: 100, min_stock_alert: 30, cost_price: 75000, selling_price_retail: 95000, selling_price_wholesale: 88000, wholesale_min_qty: 20, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 6, store_id: 1, category_id: 4, brand_id: null, unit_id: 3, name: 'Pipa PVC 3/4 inch 4m', code: '8880001006', quantity: 80, min_stock_alert: 20, cost_price: 28000, selling_price_retail: 38000, selling_price_wholesale: 34000, wholesale_min_qty: 20, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 7, store_id: 1, category_id: 5, brand_id: null, unit_id: 1, name: 'Kabel NYM 2x1.5mm 50m', code: '8880001007', quantity: 25, min_stock_alert: 10, cost_price: 450000, selling_price_retail: 580000, selling_price_wholesale: 540000, wholesale_min_qty: 3, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 8, store_id: 1, category_id: 5, brand_id: null, unit_id: 1, name: 'Saklar Broco', code: '8880001008', quantity: 60, min_stock_alert: 20, cost_price: 15000, selling_price_retail: 25000, selling_price_wholesale: 21000, wholesale_min_qty: 12, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 17, store_id: 1, category_id: 4, brand_id: null, unit_id: 1, name: 'Kran Air Wasser', code: '8880001009', quantity: 40, min_stock_alert: 10, cost_price: 35000, selling_price_retail: 55000, selling_price_wholesale: 48000, wholesale_min_qty: 10, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 18, store_id: 1, category_id: 3, brand_id: null, unit_id: 4, name: 'Paku 5cm 1kg', code: '8880001010', quantity: 50, min_stock_alert: 15, cost_price: 18000, selling_price_retail: 28000, selling_price_wholesale: 24000, wholesale_min_qty: 10, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 19, store_id: 1, category_id: 1, brand_id: null, unit_id: 2, name: 'Pasir Cor 1 Sak', code: '8880001011', quantity: 300, min_stock_alert: 100, cost_price: 45000, selling_price_retail: 60000, selling_price_wholesale: 55000, wholesale_min_qty: 20, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 20, store_id: 1, category_id: 5, brand_id: null, unit_id: 1, name: 'Stop Kontak 3 Lubang', code: '8880001012', quantity: 35, min_stock_alert: 10, cost_price: 22000, selling_price_retail: 35000, selling_price_wholesale: 30000, wholesale_min_qty: 12, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),

  // Store 2 - Makanan (8 produk + 4 tambahan)
  mkProduct({ id: 9, store_id: 2, category_id: 9, brand_id: 5, unit_id: 5, name: 'Indomie Goreng Original', code: '8991234567890', quantity: 120, min_stock_alert: 50, cost_price: 2500, selling_price_retail: 3500, selling_price_wholesale: 3000, wholesale_min_qty: 40, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 10, store_id: 2, category_id: 7, brand_id: 6, unit_id: 5, name: 'Aqua Botol 600ml', code: '8991234567891', quantity: 200, min_stock_alert: 100, cost_price: 2000, selling_price_retail: 3000, selling_price_wholesale: 2500, wholesale_min_qty: 24, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 11, store_id: 2, category_id: 7, brand_id: 7, unit_id: 5, name: 'Kopi Kapal Api Special', code: '8991234567892', quantity: 150, min_stock_alert: 100, cost_price: 1500, selling_price_retail: 2500, selling_price_wholesale: 2000, wholesale_min_qty: 50, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 12, store_id: 2, category_id: 8, brand_id: 8, unit_id: 5, name: 'Chitato Sapi Panggang', code: '8991234567893', quantity: 45, min_stock_alert: 30, cost_price: 8000, selling_price_retail: 12000, selling_price_wholesale: 10000, wholesale_min_qty: 12, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 13, store_id: 2, category_id: 9, brand_id: 5, unit_id: 5, name: 'Indomie Kuah Ayam Bawang', code: '8991234567900', quantity: 100, min_stock_alert: 50, cost_price: 2500, selling_price_retail: 3500, selling_price_wholesale: 3000, wholesale_min_qty: 40, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 14, store_id: 2, category_id: 10, brand_id: 8, unit_id: 5, name: 'Susu Ultra Full Cream 1L', code: '8991234567898', quantity: 40, min_stock_alert: 30, cost_price: 16000, selling_price_retail: 22000, selling_price_wholesale: 19000, wholesale_min_qty: 6, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 15, store_id: 2, category_id: 6, brand_id: null, unit_id: 5, name: 'ABC Kecap Manis 600ml', code: '8991234567896', quantity: 18, min_stock_alert: 15, cost_price: 18000, selling_price_retail: 25000, selling_price_wholesale: 22000, wholesale_min_qty: 6, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 16, store_id: 2, category_id: 8, brand_id: null, unit_id: 5, name: 'Roma Kelapa 300g', code: '8991234567897', quantity: 35, min_stock_alert: 25, cost_price: 8000, selling_price_retail: 12000, selling_price_wholesale: 10000, wholesale_min_qty: 12, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 21, store_id: 2, category_id: 7, brand_id: null, unit_id: 5, name: 'Teh Botol Sosro 450ml', code: '8991234567901', quantity: 180, min_stock_alert: 60, cost_price: 2500, selling_price_retail: 4000, selling_price_wholesale: 3500, wholesale_min_qty: 24, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 22, store_id: 2, category_id: 6, brand_id: 8, unit_id: 5, name: 'Bimoli Minyak Goreng 2L', code: '8991234567902', quantity: 55, min_stock_alert: 20, cost_price: 28000, selling_price_retail: 38000, selling_price_wholesale: 34000, wholesale_min_qty: 6, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 23, store_id: 2, category_id: 6, brand_id: null, unit_id: 5, name: 'Gula Pasir 1kg', code: '8991234567903', quantity: 90, min_stock_alert: 30, cost_price: 14000, selling_price_retail: 18000, selling_price_wholesale: 16000, wholesale_min_qty: 10, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 24, store_id: 2, category_id: 9, brand_id: 5, unit_id: 7, name: 'Indomie Goreng 1 Karton (40pcs)', code: '8991234567904', quantity: 25, min_stock_alert: 10, cost_price: 95000, selling_price_retail: 130000, selling_price_wholesale: 115000, wholesale_min_qty: 3, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),

  // Store 3 - Elektronik (10 produk)
  mkProduct({ id: 25, store_id: 3, category_id: 11, brand_id: 9, unit_id: 10, name: 'Samsung LED TV 32 inch', code: '8993001001', quantity: 8, min_stock_alert: 3, cost_price: 2200000, selling_price_retail: 2800000, selling_price_wholesale: 2600000, wholesale_min_qty: 3, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 26, store_id: 3, category_id: 11, brand_id: 10, unit_id: 10, name: 'Polytron LED TV 24 inch', code: '8993001002', quantity: 12, min_stock_alert: 5, cost_price: 1400000, selling_price_retail: 1850000, selling_price_wholesale: 1700000, wholesale_min_qty: 3, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 27, store_id: 3, category_id: 12, brand_id: 9, unit_id: 10, name: 'Samsung Kulkas 2 Pintu 250L', code: '8993001003', quantity: 5, min_stock_alert: 2, cost_price: 3500000, selling_price_retail: 4500000, selling_price_wholesale: 4200000, wholesale_min_qty: 2, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 28, store_id: 3, category_id: 12, brand_id: 11, unit_id: 10, name: 'Panasonic AC 1 PK', code: '8993001004', quantity: 10, min_stock_alert: 3, cost_price: 3800000, selling_price_retail: 4800000, selling_price_wholesale: 4500000, wholesale_min_qty: 2, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 29, store_id: 3, category_id: 13, brand_id: 9, unit_id: 10, name: 'Samsung Mesin Cuci 8kg', code: '8993001005', quantity: 6, min_stock_alert: 2, cost_price: 2800000, selling_price_retail: 3600000, selling_price_wholesale: 3300000, wholesale_min_qty: 2, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 30, store_id: 3, category_id: 14, brand_id: 12, unit_id: 10, name: 'Miyako Rice Cooker 1.8L', code: '8993001006', quantity: 20, min_stock_alert: 5, cost_price: 250000, selling_price_retail: 350000, selling_price_wholesale: 310000, wholesale_min_qty: 5, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 31, store_id: 3, category_id: 14, brand_id: 12, unit_id: 10, name: 'Miyako Blender 1.5L', code: '8993001007', quantity: 15, min_stock_alert: 5, cost_price: 180000, selling_price_retail: 280000, selling_price_wholesale: 250000, wholesale_min_qty: 5, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 32, store_id: 3, category_id: 15, brand_id: 11, unit_id: 10, name: 'Panasonic Kipas Angin Berdiri', code: '8993001008', quantity: 18, min_stock_alert: 5, cost_price: 320000, selling_price_retail: 450000, selling_price_wholesale: 400000, wholesale_min_qty: 3, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 33, store_id: 3, category_id: 14, brand_id: 11, unit_id: 10, name: 'Panasonic Setrika Listrik', code: '8993001009', quantity: 22, min_stock_alert: 8, cost_price: 180000, selling_price_retail: 265000, selling_price_wholesale: 235000, wholesale_min_qty: 5, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
  mkProduct({ id: 34, store_id: 3, category_id: 11, brand_id: 10, unit_id: 10, name: 'Polytron Speaker Aktif', code: '8993001010', quantity: 14, min_stock_alert: 4, cost_price: 450000, selling_price_retail: 650000, selling_price_wholesale: 580000, wholesale_min_qty: 3, is_active: true, created_at: new Date('2023-01-01'), updated_at: new Date('2024-01-01'), created_by: 1, updated_by: 1 }),
];

// ================ CUSTOMERS ================
export let customers: Customer[] = [
  { id: 1, store_id: 1, name: 'Pak Joko Kontraktor', phone: '08123456789', address: 'Jl. Mangga No. 10, Banjarmasin', created_at: new Date('2023-06-01'), updated_at: new Date('2023-06-01') },
  { id: 2, store_id: 1, name: 'Ibu Rina Renovasi', phone: '08198765432', address: 'Jl. Durian No. 5, Banjarbaru', created_at: new Date('2023-08-15'), updated_at: new Date('2023-08-15') },
  { id: 3, store_id: 2, name: 'Budi Santoso', phone: '08111222333', created_at: new Date('2023-03-20'), updated_at: new Date('2023-03-20') },
  { id: 4, store_id: 2, name: 'Siti Nurhaliza', phone: '08155666777', address: 'Jl. Anggrek No. 8, Banjarmasin', created_at: new Date('2023-05-10'), updated_at: new Date('2023-05-10') },
  { id: 5, store_id: 3, name: 'Haji Rahman', phone: '08177888999', address: 'Jl. Pahlawan No. 15, Banjarmasin', created_at: new Date('2023-09-01'), updated_at: new Date('2023-09-01') },
  { id: 6, store_id: 3, name: 'Ibu Fatimah', phone: '08199000111', address: 'Jl. Cempaka No. 22, Banjarbaru', created_at: new Date('2023-10-10'), updated_at: new Date('2023-10-10') },
];

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
  { id: 1, store_id: 1, user_id: 2, supplier_id: 1, date: new Date('2024-01-10'), reference_no: 'PO-20240110-001', total_amount: 5500000, note: 'Pembelian semen rutin bulanan', created_at: new Date('2024-01-10'), updated_at: new Date('2024-01-10') },
  { id: 2, store_id: 1, user_id: 2, supplier_id: 3, date: new Date('2024-01-12'), reference_no: 'PO-20240112-001', total_amount: 2800000, note: 'Restok cat interior & exterior', created_at: new Date('2024-01-12'), updated_at: new Date('2024-01-12') },
  { id: 3, store_id: 2, user_id: 2, supplier_id: 4, date: new Date('2024-01-14'), reference_no: 'PO-20240114-001', total_amount: 750000, note: 'Restok mie instan dari retailer', created_at: new Date('2024-01-14'), updated_at: new Date('2024-01-14') },
];

export let samplePurchaseDetails: PurchaseDetail[] = [
  { id: 1, purchase_id: 1, product_id: 1, quantity: 100, cost_price: 55000, sub_total: 5500000, created_at: new Date(), updated_at: new Date() },
  { id: 2, purchase_id: 2, product_id: 3, quantity: 10, cost_price: 280000, sub_total: 2800000, created_at: new Date(), updated_at: new Date() },
  { id: 3, purchase_id: 3, product_id: 9, quantity: 200, cost_price: 2500, sub_total: 500000, created_at: new Date(), updated_at: new Date() },
  { id: 4, purchase_id: 3, product_id: 13, quantity: 100, cost_price: 2500, sub_total: 250000, created_at: new Date(), updated_at: new Date() },
];

// ================ SAMPLE SALES ================
export let sampleSales: Sale[] = [
  {
    id: 1, store_id: 1, user_id: 3, customer_id: 1, invoice_number: 'INV-20240115-001',
    date: new Date('2024-01-15T10:30:00'), sub_total: 216000, discount: 0, tax: 0, grand_total: 216000,
    payment_method: 'cash', payment_status: 'paid', amount_received: 250000, change_amount: 34000,
    created_at: new Date('2024-01-15T10:30:00'), updated_at: new Date('2024-01-15T10:30:00'),
  },
  {
    id: 2, store_id: 1, user_id: 3, customer_id: null, invoice_number: 'INV-20240115-002',
    date: new Date('2024-01-15T11:45:00'), sub_total: 350000, discount: 0, tax: 0, grand_total: 350000,
    payment_method: 'qris', payment_status: 'paid', amount_received: 350000, change_amount: 0,
    created_at: new Date('2024-01-15T11:45:00'), updated_at: new Date('2024-01-15T11:45:00'),
  },
  {
    id: 3, store_id: 2, user_id: 3, customer_id: 3, invoice_number: 'INV-20240115-003',
    date: new Date('2024-01-15T14:20:00'), sub_total: 26500, discount: 0, tax: 0, grand_total: 26500,
    payment_method: 'debit', payment_status: 'paid', amount_received: 26500, change_amount: 0,
    created_at: new Date('2024-01-15T14:20:00'), updated_at: new Date('2024-01-15T14:20:00'),
  },
  {
    id: 4, store_id: 1, user_id: 3, customer_id: 1, invoice_number: 'INV-20240116-001',
    date: new Date('2024-01-16T09:15:00'), sub_total: 680000, discount: 0, tax: 0, grand_total: 680000,
    payment_method: 'cash', payment_status: 'debt', amount_received: 0, change_amount: 0,
    due_date: new Date('2024-02-16'),
    created_at: new Date('2024-01-16T09:15:00'), updated_at: new Date('2024-01-16T09:15:00'),
  },
];

// ================ SALE DETAILS ================
export const sampleSaleDetails: SaleDetail[] = [
  { id: 1, sale_id: 1, product_id: 1, quantity: 3, price_at_sale: 72000, cost_at_sale: 55000, total_price: 216000, price_mode: 'retail', created_at: new Date(), updated_at: new Date() },
  { id: 2, sale_id: 2, product_id: 3, quantity: 1, price_at_sale: 350000, cost_at_sale: 280000, total_price: 350000, price_mode: 'retail', created_at: new Date(), updated_at: new Date() },
  { id: 3, sale_id: 3, product_id: 9, quantity: 5, price_at_sale: 3500, cost_at_sale: 2500, total_price: 17500, price_mode: 'retail', created_at: new Date(), updated_at: new Date() },
  { id: 4, sale_id: 3, product_id: 10, quantity: 3, price_at_sale: 3000, cost_at_sale: 2000, total_price: 9000, price_mode: 'retail', created_at: new Date(), updated_at: new Date() },
  { id: 5, sale_id: 4, product_id: 1, quantity: 10, price_at_sale: 68000, cost_at_sale: 55000, total_price: 680000, price_mode: 'wholesale', created_at: new Date(), updated_at: new Date() },
];

// ================ DEBT PAYMENTS ================
export let debtPayments: DebtPayment[] = [
  { id: 1, sale_id: 4, amount: 200000, date: new Date('2024-01-20'), note: 'Cicilan pertama', created_at: new Date('2024-01-20') },
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
    .map(d => ({ ...d, product: getProduct(d.product_id) }));
}

export function getStoreName(storeId: number): string {
  const store = stores.find(s => s.id === storeId);
  return store?.name.split(' - ')[1] || store?.name || String(storeId);
}

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

export function getUnitsForStore(storeId: number): Unit[] {
  return units.filter(u => u.store_id === storeId);
}

// Debt helpers
export function getDebtSales(storeId: number): Sale[] {
  return sampleSales.filter(s => s.store_id === storeId && s.payment_status === 'debt');
}

export function getDebtPaymentsForSale(saleId: number): DebtPayment[] {
  return debtPayments.filter(dp => dp.sale_id === saleId);
}

export function getTotalPaidForSale(saleId: number): number {
  return debtPayments.filter(dp => dp.sale_id === saleId).reduce((sum, dp) => sum + dp.amount, 0);
}

export function getRemainingDebt(sale: Sale): number {
  const paid = getTotalPaidForSale(sale.id);
  return sale.grand_total - paid;
}

export function addDebtPayment(payment: DebtPayment) {
  debtPayments = [...debtPayments, payment];
  // Check if fully paid
  const sale = sampleSales.find(s => s.id === payment.sale_id);
  if (sale && getRemainingDebt(sale) <= 0) {
    sampleSales = sampleSales.map(s =>
      s.id === payment.sale_id ? { ...s, payment_status: 'paid' as const, updated_at: new Date() } : s
    );
  }
}

// Product import helpers
export function addProduct(product: Product) {
  products = [...products, product];
}

export function getOrCreateCategory(name: string, storeId: number): number {
  const existing = categories.find(c => c.name.toLowerCase() === name.toLowerCase() && c.store_id === storeId);
  if (existing) return existing.id;
  const newId = Math.max(0, ...categories.map(c => c.id)) + 1;
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const newCat: Category = { id: newId, store_id: storeId, name, slug, created_at: new Date(), updated_at: new Date() };
  categories = [...categories, newCat];
  return newId;
}

export function getOrCreateBrand(name: string, storeId: number): number {
  const existing = brands.find(b => b.name.toLowerCase() === name.toLowerCase() && b.store_id === storeId);
  if (existing) return existing.id;
  const newId = Math.max(0, ...brands.map(b => b.id)) + 1;
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const newBrand: Brand = { id: newId, store_id: storeId, name, slug, created_at: new Date(), updated_at: new Date() };
  brands = [...brands, newBrand];
  return newId;
}

export function getOrCreateUnit(name: string, shortName: string, storeId: number): number {
  const existing = units.find(u => u.name.toLowerCase() === name.toLowerCase() && u.store_id === storeId);
  if (existing) return existing.id;
  const newId = Math.max(0, ...units.map(u => u.id)) + 1;
  const newUnit: Unit = { id: newId, store_id: storeId, name, short_name: shortName, created_at: new Date(), updated_at: new Date() };
  units = [...units, newUnit];
  return newId;
}
