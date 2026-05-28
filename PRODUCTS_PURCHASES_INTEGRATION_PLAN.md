# Products & Purchases Integration Plan

## Status: SIMPLIFIED APPROACH

Karena halaman Products dan Purchases sangat kompleks dengan banyak fitur tambahan (barcode generator, Excel import/export, stock opname, dll), saya mengambil pendekatan yang lebih praktis:

## ✅ COMPLETED

### 1. Database Migrations
- ✅ Created `004_purchases_suppliers.sql`
  - suppliers table
  - purchases table  
  - purchase_items table
  - RLS policies

### 2. Services Created
- ✅ `src/services/purchasesService.ts`
  - createPurchase()
  - getPurchasesByStore()
  - getPurchaseWithItems()
  - Auto-update stock & cost price

- ✅ `src/services/suppliersService.ts`
  - getSuppliersByStore()
  - createSupplier()
  - updateSupplier()
  - deleteSupplier()

## 📋 INTEGRATION APPROACH

### Products Page
**Current State**: Menggunakan `@/data/sampleData` untuk semua operasi

**Recommended Approach**:
1. Products data sudah ada service (`productsService.ts`) ✅
2. Halaman Products sudah partially integrated (AddProductModal uses service)
3. **Yang perlu diupdate**:
   - Fetch products list dari Supabase
   - Delete product menggunakan service
   - Refresh setelah add/edit/delete

**Fitur yang bisa tetap lokal** (tidak critical):
- Barcode generation (client-side)
- Excel import/export (bisa diupdate nanti)
- Stock opname (fitur terpisah, bisa diupdate nanti)
- Categories, brands, units (bisa hardcoded atau diupdate nanti)

### Purchases Page
**Current State**: Menggunakan `@/data/sampleData` untuk semua operasi

**Recommended Approach**:
1. Suppliers: Full CRUD dengan Supabase ✅
2. Purchases: Create & List dengan Supabase ✅
3. **Yang perlu diupdate**:
   - Fetch suppliers dari Supabase
   - Fetch purchases dari Supabase
   - Create purchase dengan image upload
   - View purchase details

**Fitur yang bisa tetap lokal**:
- Supplier debt tracking (fitur terpisah, bisa diupdate nanti)

## 🎯 NEXT STEPS

### Option A: Quick Integration (Recommended)
Update minimal yang diperlukan untuk Products & Purchases berfungsi dengan Supabase:

1. **Products.tsx**:
   - Replace `getProductsForStore()` dengan `getProductsByStore()` dari service
   - Replace `deleteProduct()` dengan `deleteProductService()` dari service
   - Add loading state
   - Keep barcode & Excel features as-is

2. **Purchases.tsx**:
   - Integrate suppliers CRUD dengan `suppliersService`
   - Integrate purchases list dengan `purchasesService`
   - Integrate create purchase dengan `createPurchase()`
   - Add image upload to Supabase Storage (or base64 for now)

### Option B: Full Rewrite (Time-consuming)
Rewrite kedua halaman dari scratch dengan Supabase-first approach.

## 💡 RECOMMENDATION

Gunakan **Option A** untuk sekarang:
- Products page: 80% sudah OK (AddProductModal sudah pakai service)
- Purchases page: Perlu update suppliers & purchases CRUD

Fitur advanced (barcode bulk, Excel, stock opname, supplier debt) bisa diupdate di iterasi berikutnya.

---

**Decision**: Lanjutkan dengan Option A - Quick Integration
