# ✅ MANUAL PRICE TIER SYSTEM - COMPLETE

## 📋 OVERVIEW
Form Produk telah dibersihkan dan disusun ulang untuk mendukung sistem **"Manual Select Price Tier"** di mana kasir memilih sendiri tier harga (Eceran/Grosir/Spesial) saat transaksi, BUKAN berdasarkan kuantitas pembelian.

---

## 🗑️ YANG DIHAPUS

### 1. **Field Min Qty** - DIHAPUS TOTAL
- ❌ `wholesale_min_qty` - Min Qty Grosir
- ❌ `special_min_qty` - Min Qty Spesial

**Alasan**: Sistem ini menggunakan **Manual Price Tier Selection**, bukan automatic based on quantity.

### 2. **Dari Form UI**:
- ❌ Input "Min Qty Grosir"
- ❌ Input "Min Qty Spesial"
- ❌ State management untuk min qty
- ❌ Validation untuk min qty

### 3. **Dari Service Layer**:
- ❌ `wholesale_min_qty` dari `Product` interface
- ❌ `special_min_qty` from `Product` interface
- ❌ `wholesale_min_qty` dari `CreateProductInput`
- ❌ `special_min_qty` dari `CreateProductInput`
- ❌ `wholesale_min_qty` dari `UpdateProductInput`
- ❌ `special_min_qty` dari `UpdateProductInput`
- ❌ Min qty fields dari `createProduct()` function
- ❌ Min qty fields dari `updateProduct()` function

### 4. **Dari Database** (Migration 018):
- ❌ `wholesale_min_qty` column
- ❌ `special_min_qty` column

---

## ✅ LAYOUT BARU - URUTAN LOGIS

### **Baris 1: Klasifikasi** (Independent Master)
- Kategori | Brand

### **Baris 2: Identitas**
- Nama Produk | Barcode/SKU

### **Baris 3: Fisik** (Full Width)
- Satuan (membentang 2 kolom)

### **Baris 4: Stok & Kontrol**
- Stok Awal | Stok Minimum Alert

### **Baris 5: Harga Dasar & Diskon**
- Harga Modal | Harga Jual Spesial

### **Baris 6: Harga Tingkat**
- Harga Jual Grosir | Harga Jual Eceran

---

## 🎯 KONSEP: MANUAL PRICE TIER SELECTION

### Cara Kerja:
1. **Produk** hanya menyimpan 3 tier harga:
   - Harga Jual Spesial (terendah)
   - Harga Jual Grosir (menengah)
   - Harga Jual Eceran (tertinggi)

2. **Kasir** memilih tier harga secara manual saat transaksi di POS:
   - Pelanggan A → Kasir pilih "Eceran"
   - Pelanggan B → Kasir pilih "Grosir"
   - Pelanggan C → Kasir pilih "Spesial"

3. **TIDAK ADA** automatic price selection based on quantity:
   - ❌ Beli 10 pcs → otomatis harga grosir
   - ❌ Beli 20 pcs → otomatis harga spesial
   - ✅ Kasir yang menentukan tier harga untuk setiap pelanggan

---

## 📊 STRUKTUR DATA BERSIH

### Product Interface (Final):
```typescript
{
  id: number;
  store_id: number;
  code: string;
  name: string;
  category_id: number | null;
  brand_id: number | null;
  unit_id: number | null;
  quantity: number;
  min_stock_alert: number;
  cost_price: number;
  selling_price_retail: number;      // Tier 3 (Tertinggi)
  selling_price_wholesale: number;   // Tier 2 (Menengah)
  selling_price_special: number;     // Tier 1 (Terendah)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### Form State (Final):
```typescript
{
  name: string;
  code: string;
  category_id?: number;
  brand_id?: number;
  unit_id?: number;
  quantity?: number;
  min_stock_alert?: number;
  cost_price?: number;
  selling_price_retail?: number;
  selling_price_wholesale?: number;
  selling_price_special?: number;
}
```

**NO MORE**: `wholesale_min_qty`, `special_min_qty`

---

## 🔧 PERUBAHAN YANG DILAKUKAN

### 1. **AddProductModal.tsx**
- ✅ Removed `wholesale_min_qty` and `special_min_qty` from state
- ✅ Removed Min Qty input fields from UI
- ✅ Reorganized layout: Kategori & Brand di atas (Baris 1)
- ✅ Satuan full-width (Baris 3)
- ✅ Stok Awal & Stok Min Alert berpasangan (Baris 4)
- ✅ Harga Modal & Harga Spesial berpasangan (Baris 5)
- ✅ Harga Grosir & Harga Eceran berpasangan (Baris 6)
- ✅ Cleaned payload submit (no min qty fields)

### 2. **productsService.ts**
- ✅ Removed `wholesale_min_qty` and `special_min_qty` from `Product` interface
- ✅ Removed from `CreateProductInput` interface
- ✅ Removed from `UpdateProductInput` interface
- ✅ Removed from `createProduct()` function
- ✅ Removed from `updateProduct()` function

### 3. **Database Migration 018**
- ✅ Created migration to drop `wholesale_min_qty` column
- ✅ Created migration to drop `special_min_qty` column

---

## 🚀 DEPLOYMENT STEPS

### 1. Run Migration 017 (Cleanup deprecated fields)
```sql
-- File: supabase/migrations/017_cleanup_products_table.sql
-- Removes: unit, unit_abbr, category, expiry_date
```

### 2. Run Migration 018 (Remove min qty columns)
```sql
-- File: supabase/migrations/018_remove_min_qty_columns.sql
-- Removes: wholesale_min_qty, special_min_qty
```

### 3. Verify in Supabase SQL Editor
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products'
ORDER BY ordinal_position;
```

**Expected columns**:
- ✅ id, store_id, code, name
- ✅ category_id, brand_id, unit_id
- ✅ quantity, min_stock_alert
- ✅ cost_price
- ✅ selling_price_retail, selling_price_wholesale, selling_price_special
- ✅ is_active, created_at, updated_at
- ❌ NO wholesale_min_qty
- ❌ NO special_min_qty

---

## 🧪 TESTING CHECKLIST

### Test 1: Form Tambah Produk
1. Buka menu **Produk**
2. Klik **Tambah Produk**
3. **Check Layout**:
   - ✅ Baris 1: Kategori | Brand
   - ✅ Baris 2: Nama Produk | Barcode/SKU
   - ✅ Baris 3: Satuan (full width)
   - ✅ Baris 4: Stok Awal | Stok Min Alert
   - ✅ Baris 5: Harga Modal | Harga Spesial
   - ✅ Baris 6: Harga Grosir | Harga Eceran
   - ❌ TIDAK ADA: Min Qty Grosir
   - ❌ TIDAK ADA: Min Qty Spesial
4. Isi semua field
5. Klik **Simpan Produk**
6. ✅ Produk berhasil tersimpan

### Test 2: Form Edit Produk
1. Pilih produk existing
2. Klik **Edit**
3. ✅ Semua field terisi dengan benar
4. ✅ Tidak ada field Min Qty
5. Ubah beberapa field
6. Klik **Perbarui Produk**
7. ✅ Produk berhasil diupdate

### Test 3: Data Integrity
1. Check produk di database
2. ✅ Tidak ada kolom `wholesale_min_qty`
3. ✅ Tidak ada kolom `special_min_qty`
4. ✅ Semua harga tersimpan dengan benar

---

## 📁 FILES MODIFIED

### Migrations
- ✅ `supabase/migrations/017_cleanup_products_table.sql` (NEW)
- ✅ `supabase/migrations/018_remove_min_qty_columns.sql` (NEW)

### Services
- ✅ `src/services/productsService.ts` (UPDATED)
  - Removed min qty from all interfaces
  - Removed min qty from create/update functions

### Components
- ✅ `src/components/backoffice/AddProductModal.tsx` (UPDATED)
  - Removed min qty fields from state
  - Removed min qty inputs from UI
  - Reorganized layout (Kategori & Brand first)
  - Cleaned payload submit

### Documentation
- ✅ `MANUAL_PRICE_TIER_COMPLETE.md` (NEW - this file)

---

## 🎉 RESULT

Form Produk sekarang:
- ✅ **Super clean** - hanya fokus pada tier harga
- ✅ **Layout logis** - Klasifikasi → Identitas → Fisik → Stok → Harga
- ✅ **Manual Price Tier** - kasir yang menentukan tier harga
- ✅ **No automatic logic** - tidak ada perhitungan otomatis based on qty
- ✅ **Independent Master** - Kategori & Brand tidak saling depend

**Next Step**: Jalankan migration 017 dan 018 di Supabase SQL Editor.
