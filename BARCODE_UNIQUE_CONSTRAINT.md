# Barcode/SKU Unique Constraint Implementation

## Ringkasan
Implementasi constraint UNIQUE pada kolom barcode/SKU produk agar setiap produk memiliki kode yang unik secara global (di semua toko).

## Perubahan Database

### Migration: `022_unique_barcode_global.sql`
- **Menghapus constraint lama**: `products_store_id_code_key` (unique per toko)
- **Menambahkan constraint baru**: `products_code_unique` (unique global)
- **Dampak**: Barcode/SKU sekarang harus unik di seluruh sistem, tidak hanya per toko

## Perubahan Backend

### File: `src/services/productsService.ts`

#### 1. Error Handling pada `createProduct()`
```typescript
// Menangkap error duplicate key (PostgreSQL error code 23505)
if (error.code === '23505') {
  if (error.message.includes('products_store_id_code_key')) {
    throw new Error(`Barcode/SKU "${input.code}" sudah digunakan di toko ini.`);
  } else if (error.message.includes('products_code_unique')) {
    throw new Error(`Barcode/SKU "${input.code}" sudah digunakan. Setiap produk harus memiliki barcode yang unik.`);
  }
}
```

#### 2. Improved Error Messages pada `bulkCreateProducts()`
- Menampilkan nomor baris, kode produk, dan nama produk saat terjadi error
- Format: `Baris X (KODE - NAMA): Pesan error yang jelas`

## Pesan Error User-Friendly

### Sebelum:
```
Error: duplicate key value violates unique constraint "products_store_id_code_key"
```

### Sesudah:
```
Barcode/SKU "PS-28240519-287" sudah digunakan. Setiap produk harus memiliki barcode yang unik.
```

## Testing

### Skenario 1: Tambah produk dengan barcode duplikat
1. Buka halaman "Produk & Stok"
2. Klik "Tambah Produk"
3. Masukkan barcode yang sudah ada
4. Klik "Simpan"
5. **Expected**: Toast error dengan pesan jelas tentang barcode duplikat

### Skenario 2: Import Excel dengan barcode duplikat
1. Buka halaman "Produk & Stok"
2. Import file Excel dengan barcode yang sudah ada
3. **Expected**: Error list menampilkan baris mana yang gagal dengan pesan jelas

## Deployment

1. **Deploy migration**:
   ```bash
   supabase db push
   ```

2. **Verify constraint**:
   ```sql
   SELECT conname, pg_get_constraintdef(oid) 
   FROM pg_constraint 
   WHERE conrelid = 'products'::regclass 
   AND conname LIKE '%code%';
   ```

## Catatan Penting

- ⚠️ **Breaking Change**: Jika ada data existing dengan barcode duplikat, migration akan gagal
- 🔧 **Solusi**: Bersihkan data duplikat sebelum menjalankan migration
- 📝 **Best Practice**: Gunakan barcode scanner atau generator untuk memastikan uniqueness

## Rollback Plan

Jika perlu rollback ke constraint lama (unique per toko):

```sql
-- Drop global unique constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_code_unique;

-- Re-add per-store unique constraint
ALTER TABLE products ADD CONSTRAINT products_store_id_code_key UNIQUE (store_id, code);
```

---
**Tanggal**: 2026-05-23  
**Status**: ✅ Completed
