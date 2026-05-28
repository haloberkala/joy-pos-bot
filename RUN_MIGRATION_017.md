# 🚀 INSTRUKSI: Jalankan Migration 017 - Cleanup Products Table

## ✅ PERSIAPAN SELESAI
Migration script sudah siap untuk membersihkan kolom-kolom deprecated dari tabel `products`.

---

## 📋 YANG AKAN DIHAPUS

Migration ini akan menghapus 4 kolom yang sudah tidak digunakan:

1. ❌ `unit` (text) - sudah diganti dengan `unit_id`
2. ❌ `unit_abbr` (text) - singkatan satuan tidak diperlukan
3. ❌ `category` (text) - sudah diganti dengan `category_id`
4. ❌ `expiry_date` (date) - fitur tidak diperlukan

**AMAN**: Semua kolom ini sudah tidak digunakan di aplikasi.

---

## 📋 LANGKAH-LANGKAH

### 1. Buka Supabase Dashboard
```
URL: https://paibfmeiendenxunystp.supabase.co
```

### 2. Masuk ke SQL Editor
1. Klik menu **SQL Editor** di sidebar kiri
2. Klik **New Query**

### 3. Copy-Paste Migration Script
Buka file: `supabase/migrations/017_cleanup_products_table.sql`

Copy semua isinya dan paste ke SQL Editor.

### 4. Jalankan Migration
1. Klik tombol **Run** (atau tekan Ctrl+Enter / Cmd+Enter)
2. Tunggu sampai selesai

### 5. Verify Output
Setelah berhasil, kamu akan melihat output seperti ini:

```
✅ ALTER TABLE (4 columns dropped)

📊 Products table structure (cleaned):
- id (integer)
- store_id (integer)
- code (text)
- name (text)
- category_id (integer) ✅ FK
- brand_id (integer) ✅ FK
- unit_id (integer) ✅ FK
- quantity (integer)
- min_stock_alert (integer)
- cost_price (numeric)
- selling_price_retail (numeric)
- selling_price_wholesale (numeric)
- selling_price_special (numeric)
- wholesale_min_qty (integer)
- special_min_qty (integer)
- is_active (boolean)
- created_at (timestamp)
- updated_at (timestamp)

=== MIGRATION 017 COMPLETE ===
Removed deprecated columns: unit, unit_abbr, category, expiry_date
Products table now uses only: unit_id, category_id, brand_id (FK relationships)
```

---

## 🧪 TESTING SETELAH MIGRATION

### Test 1: Lihat Daftar Produk
1. Refresh aplikasi (F5)
2. Login sebagai owner/admin
3. Buka menu **Produk**
4. ✅ Semua produk tampil dengan benar
5. ✅ Kategori, Brand, Satuan tampil dari relasi FK

### Test 2: Tambah Produk Baru
1. Klik **Tambah Produk**
2. Isi semua field:
   - Nama Produk
   - Barcode/SKU
   - Kategori (dropdown)
   - Brand (dropdown)
   - Satuan (dropdown)
   - Harga Modal
   - Stok Awal
   - Harga Jual Spesial + Min Qty
   - Harga Jual Grosir + Min Qty
   - Harga Jual Eceran
   - Stok Minimum Alert
3. Klik **Simpan Produk**
4. ✅ Produk berhasil tersimpan

### Test 3: Edit Produk Existing
1. Pilih produk yang sudah ada
2. Klik **Edit**
3. Ubah beberapa field
4. Klik **Perbarui Produk**
5. ✅ Produk berhasil diupdate

---

## ❌ JIKA ADA ERROR

### Error: "column does not exist"
**Penyebab**: Kolom sudah dihapus sebelumnya atau tidak pernah ada

**Solusi**: Ini normal, migration menggunakan `DROP COLUMN IF EXISTS` jadi aman

### Error: "cannot drop column because other objects depend on it"
**Penyebab**: Ada view, index, atau constraint yang masih depend ke kolom ini

**Solusi**:
```sql
-- Check dependencies
SELECT * FROM information_schema.view_column_usage 
WHERE table_name = 'products' 
AND column_name IN ('unit', 'unit_abbr', 'category', 'expiry_date');

-- Drop dependencies first, then run migration again
```

---

## ✅ CHECKLIST COMPLETION

Setelah migration berhasil, centang ini:

- [ ] Migration 017 berhasil dijalankan di Supabase
- [ ] Tabel products tidak ada kolom: unit, unit_abbr, category, expiry_date
- [ ] Tabel products masih punya: unit_id, category_id, brand_id
- [ ] Daftar produk tampil dengan benar
- [ ] Form Tambah Produk berfungsi normal
- [ ] Form Edit Produk berfungsi normal
- [ ] Kategori, Brand, Satuan tampil dari relasi FK

---

## 🎉 SELESAI!

Setelah semua checklist di atas ✅, maka:

**Tabel Products sudah bersih dan optimal!**

Struktur database sekarang lebih:
- ✅ Normal (menggunakan FK relationships)
- ✅ Efisien (tidak ada kolom redundant)
- ✅ Mudah di-maintain

---

## 📞 NEED HELP?

Jika ada masalah atau pertanyaan, screenshot error message dan tanyakan ke Claude.
