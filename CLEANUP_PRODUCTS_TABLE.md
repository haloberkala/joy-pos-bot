# ✅ CLEANUP PRODUCTS TABLE - Migration 017

## 📋 OVERVIEW
Menghapus kolom-kolom yang sudah tidak diperlukan (deprecated) dari tabel `products` untuk membersihkan struktur database.

---

## 🗑️ KOLOM YANG DIHAPUS

### 1. **`unit`** (text) - DEPRECATED
- **Alasan**: Sudah diganti dengan `unit_id` (Foreign Key ke tabel `units`)
- **Status**: Tidak digunakan lagi sejak migration 014

### 2. **`unit_abbr`** (text) - DEPRECATED
- **Alasan**: Singkatan satuan sudah tidak diperlukan, cukup nama satuan saja
- **Status**: Fitur dihapus dari form

### 3. **`category`** (text) - DEPRECATED
- **Alasan**: Sudah diganti dengan `category_id` (Foreign Key ke tabel `categories`)
- **Status**: Tidak digunakan lagi sejak migration 014

### 4. **`expiry_date`** (date) - TIDAK DIPERLUKAN
- **Alasan**: Fitur tanggal kadaluarsa tidak diperlukan untuk POS ini
- **Status**: Tidak pernah diimplementasikan di form

---

## ✅ STRUKTUR TABEL PRODUCTS SETELAH CLEANUP

### Kolom yang Dipertahankan:

**Identitas & Relasi**:
- `id` (int4, PK)
- `store_id` (int4, FK → stores)
- `code` (text) - Barcode/SKU
- `name` (text) - Nama Produk
- `category_id` (int4, FK → categories)
- `brand_id` (int4, FK → brands)
- `unit_id` (int4, FK → units)

**Stok & Harga**:
- `quantity` (int4) - Stok
- `min_stock_alert` (int4) - Alert stok minimum
- `cost_price` (numeric) - Harga Modal
- `selling_price_retail` (numeric) - Harga Jual Eceran
- `selling_price_wholesale` (numeric) - Harga Jual Grosir
- `selling_price_special` (numeric) - Harga Jual Spesial
- `wholesale_min_qty` (int4) - Min Qty Grosir
- `special_min_qty` (int4) - Min Qty Spesial

**Status & Timestamp**:
- `is_active` (bool) - Status Aktif/Nonaktif
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

---

## 🚀 CARA MENJALANKAN MIGRATION

### 1. Buka Supabase SQL Editor
```
URL: https://paibfmeiendenxunystp.supabase.co
```

### 2. Copy-Paste Migration Script
Buka file: `supabase/migrations/017_cleanup_products_table.sql`

Copy semua isinya dan paste ke SQL Editor.

### 3. Jalankan Migration
Klik tombol **Run** (atau Ctrl+Enter / Cmd+Enter)

### 4. Verify Output
Setelah berhasil, kamu akan melihat:

```
✅ ALTER TABLE (unit column dropped)
✅ ALTER TABLE (unit_abbr column dropped)
✅ ALTER TABLE (category column dropped)
✅ ALTER TABLE (expiry_date column dropped)

📊 Products table structure:
- id, store_id, code, name
- category_id, brand_id, unit_id (FK relationships)
- quantity, min_stock_alert
- cost_price, selling_price_retail, selling_price_wholesale, selling_price_special
- wholesale_min_qty, special_min_qty
- is_active, created_at, updated_at

=== MIGRATION 017 COMPLETE ===
Removed deprecated columns: unit, unit_abbr, category, expiry_date
Products table now uses only: unit_id, category_id, brand_id (FK relationships)
```

---

## ⚠️ DAMPAK PERUBAHAN

### ✅ Aman - Tidak Ada Breaking Changes
- Semua kolom yang dihapus sudah **tidak digunakan** di aplikasi
- Form produk sudah menggunakan `unit_id`, `category_id`, `brand_id`
- Tidak ada kode yang masih reference ke kolom lama

### 📊 Data Integrity
- Data produk existing **TIDAK TERPENGARUH**
- Hanya struktur tabel yang dibersihkan
- Semua relasi FK tetap utuh

---

## 🧪 TESTING SETELAH MIGRATION

### Test 1: Tambah Produk Baru
1. Buka menu **Produk**
2. Klik **Tambah Produk**
3. Isi semua field
4. Klik **Simpan Produk**
5. ✅ Produk berhasil tersimpan

### Test 2: Edit Produk Existing
1. Pilih produk yang sudah ada
2. Klik **Edit**
3. Ubah beberapa field
4. Klik **Perbarui Produk**
5. ✅ Produk berhasil diupdate

### Test 3: Lihat Daftar Produk
1. Buka menu **Produk**
2. ✅ Semua produk tampil dengan benar
3. ✅ Kategori, Brand, Satuan tampil dengan benar (dari relasi FK)

---

## 📁 FILES

### Migration
- ✅ `supabase/migrations/017_cleanup_products_table.sql` (NEW)

### Documentation
- ✅ `CLEANUP_PRODUCTS_TABLE.md` (NEW - this file)

---

## ✅ CHECKLIST

Setelah migration berhasil:

- [ ] Migration 017 berhasil dijalankan di Supabase
- [ ] Tabel products tidak ada kolom: unit, unit_abbr, category, expiry_date
- [ ] Tabel products masih punya: unit_id, category_id, brand_id
- [ ] Form Tambah Produk berfungsi normal
- [ ] Form Edit Produk berfungsi normal
- [ ] Daftar produk tampil dengan benar

---

## 🎉 RESULT

Tabel `products` sekarang lebih **bersih dan efisien**:
- ✅ Tidak ada kolom deprecated
- ✅ Hanya menggunakan Foreign Key relationships
- ✅ Struktur database lebih normal
- ✅ Lebih mudah di-maintain

**Next Step**: Jalankan migration 017 di Supabase SQL Editor.
