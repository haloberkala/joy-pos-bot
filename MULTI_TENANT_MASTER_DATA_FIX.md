# Multi-Tenant Master Data & Unit Standardization Fix

## Status: ✅ COMPLETE - READY TO DEPLOY

## Issues Fixed

### 1. Data Leakage - Categories & Brands
**Problem**: Categories and Brands from Toko A were showing in Toko B because:
- `categories` table didn't have `store_id` column
- `brands` table didn't have `store_id` column
- `getAllCategories()` and `getAllBrands()` didn't filter by store_id
- RLS policies allowed cross-store data access

**Solution**:
- ✅ Added `store_id` column to `categories` table with CASCADE delete
- ✅ Added `store_id` column to `brands` table with CASCADE delete
- ✅ Updated RLS policies to filter by `store_id` from JWT
- ✅ Updated `categoriesService.ts` to require and filter by `store_id`
- ✅ Updated `brandsService.ts` to require and filter by `store_id`
- ✅ Updated `AddProductModal.tsx` to pass `store_id` to all service calls

### 2. Unit Standardization
**Problem**: Unit input was free text causing inconsistency:
- Users could type "Pcs", "pcs", "PCS", "pieces" for the same unit
- "Singkatan Satuan" field was redundant and unused
- No master data management for units

**Solution**:
- ✅ Created new `units` table with `store_id` (multi-tenant)
- ✅ Added `unit_id` column to `products` table
- ✅ Created `unitsService.ts` with CRUD operations
- ✅ Converted Unit input to Dropdown with Quick Add (+) button
- ✅ Removed "Singkatan Satuan" field from form
- ✅ Auto-seeded default units for all existing stores
- ✅ Updated RLS policies for units table

## Files Changed

### Database Migration
- `supabase/migrations/014_fix_multi_tenant_master_data.sql` (NEW)
  - Adds `store_id` to categories and brands tables
  - Creates `units` table with store_id
  - Adds `unit_id` to products table
  - Updates all RLS policies to filter by store_id
  - Seeds default units for all stores
  - Creates helper functions for JWT access

### Services
- `src/services/categoriesService.ts` (UPDATED)
  - `getAllCategories(storeId)` - now requires storeId parameter
  - `getOrCreateCategory(name, storeId)` - now requires storeId
  - `createCategory(input)` - now requires store_id in input
  - Updated Category interface to include store_id

- `src/services/brandsService.ts` (UPDATED)
  - `getAllBrands(storeId)` - now requires storeId parameter
  - `getBrandsByCategory(categoryId, storeId)` - now requires storeId
  - `getOrCreateBrand(name, storeId, categoryId?)` - now requires storeId
  - `createBrand(input)` - now requires store_id in input
  - Updated Brand interface to include store_id

- `src/services/unitsService.ts` (NEW)
  - `getAllUnits(storeId)` - get all units for a store
  - `getUnitById(id)` - get single unit
  - `createUnit(input)` - create new unit
  - `getOrCreateUnit(name, storeId)` - get or create unit
  - `updateUnit(id, input)` - update unit
  - `deleteUnit(id)` - delete unit

- `src/services/productsService.ts` (UPDATED)
  - Added `unit_id` to Product interface
  - Added `unit_id` to CreateProductInput interface
  - Added `unit_id` to UpdateProductInput interface
  - Updated createProduct() to handle unit_id
  - Updated updateProduct() to handle unit_id

### Components
- `src/components/backoffice/AddProductModal.tsx` (UPDATED)
  - Added units state and loading
  - Added newUnitName and showNewUnit states
  - Replaced "Satuan" text input with Dropdown + Quick Add
  - Removed "Singkatan Satuan" field completely
  - Updated all service calls to pass storeId
  - Added handleAddUnit() function
  - Updated formData to use unit_id instead of unit/unit_abbr
  - Updated loadCategories() to pass storeId
  - Updated loadBrandsByCategory() to pass storeId
  - Added loadUnits() function

## Database Schema Changes

### categories table
```sql
ALTER TABLE categories ADD COLUMN store_id INTEGER;
ALTER TABLE categories ADD CONSTRAINT categories_store_id_fkey 
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
CREATE INDEX idx_categories_store_id ON categories(store_id);
```

### brands table
```sql
ALTER TABLE brands ADD COLUMN store_id INTEGER;
ALTER TABLE brands DROP CONSTRAINT brands_name_key; -- Remove global unique
ALTER TABLE brands ADD CONSTRAINT brands_name_store_id_unique 
  UNIQUE (name, store_id); -- Add composite unique
ALTER TABLE brands ADD CONSTRAINT brands_store_id_fkey 
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
CREATE INDEX idx_brands_store_id ON brands(store_id);
```

### units table (NEW)
```sql
CREATE TABLE units (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT units_name_store_id_unique UNIQUE (name, store_id)
);
CREATE INDEX idx_units_store_id ON units(store_id);
```

### products table
```sql
ALTER TABLE products ADD COLUMN unit_id INTEGER;
ALTER TABLE products ADD CONSTRAINT products_unit_id_fkey 
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL;
CREATE INDEX idx_products_unit_id ON products(unit_id);
```

## Default Units Seeded

For each store, the following units are auto-created:
- Pcs (Pieces / Satuan)
- Box (Box / Kotak)
- Kg (Kilogram)
- Gram (Gram)
- Liter (Liter)
- Ml (Mililiter)
- Pack (Pack / Bungkus)
- Lusin (Lusin - 12 pcs)
- Karton (Karton)
- Botol (Botol)
- Kaleng (Kaleng)
- Cup (Cup / Gelas)

## RLS Policies

All master data tables now have strict RLS policies:

### categories
- SELECT: Only categories from user's store
- INSERT: Owner/Admin can create for their store
- UPDATE: Owner/Admin can update their store's categories
- DELETE: Owner can delete their store's categories

### brands
- SELECT: Only brands from user's store
- INSERT: Owner/Admin can create for their store
- UPDATE: Owner/Admin can update their store's brands
- DELETE: Owner can delete their store's brands

### units
- SELECT: Only units from user's store
- INSERT: Owner/Admin can create for their store
- UPDATE: Owner/Admin can update their store's units
- DELETE: Owner can delete their store's units

## Helper Functions Created

```sql
-- Get user's store_id from JWT
get_user_store_id() RETURNS INTEGER

-- Check if user has specific role
user_has_role(required_role TEXT) RETURNS BOOLEAN

-- Check if user has any of the roles
user_has_any_role(required_roles TEXT[]) RETURNS BOOLEAN
```

## Deployment Steps

### 1. Run Database Migration
```bash
# Option A: Using Supabase CLI
supabase db push

# Option B: Using Supabase Dashboard
# 1. Go to SQL Editor
# 2. Copy content from supabase/migrations/014_fix_multi_tenant_master_data.sql
# 3. Run the migration
```

### 2. Verify Migration
Check the verification output at the end of migration:
- Categories table has store_id column
- Brands table has store_id column
- Units table exists with correct structure
- Products table has unit_id column
- Units are seeded for all stores

### 3. Test Multi-Tenant Isolation

**Test Categories:**
1. Login as Toko A admin
2. Create category "Makanan Ringan"
3. Logout and login as Toko B admin
4. Open form Tambah Produk
5. ✅ Should NOT see "Makanan Ringan" in category dropdown
6. Create category "Makanan Ringan" (same name, different store)
7. ✅ Should succeed (no conflict)

**Test Brands:**
1. Login as Toko A admin
2. Create brand "Brand A"
3. Logout and login as Toko B admin
4. Open form Tambah Produk
5. ✅ Should NOT see "Brand A" in brand dropdown
6. Create brand "Brand A" (same name, different store)
7. ✅ Should succeed (no conflict)

**Test Units:**
1. Login as Toko A admin
2. Open form Tambah Produk
3. ✅ Should see default units (Pcs, Box, Kg, etc.)
4. Click (+) next to Satuan dropdown
5. Add new unit "Karung"
6. ✅ Unit should be auto-selected
7. Logout and login as Toko B admin
8. Open form Tambah Produk
9. ✅ Should NOT see "Karung" in unit dropdown
10. ✅ Should see default units only

### 4. Test Unit Standardization

**Test Unit Dropdown:**
1. Open form Tambah Produk
2. ✅ "Satuan" field is now a dropdown (not text input)
3. ✅ "Singkatan Satuan" field is removed
4. ✅ Dropdown shows all units for current store
5. Select "Pcs" from dropdown
6. Save product
7. ✅ Product should have unit_id set

**Test Quick Add Unit:**
1. Open form Tambah Produk
2. Click (+) button next to Satuan dropdown
3. ✅ Form appears with input field
4. Type "Dus" and press Enter (or click Tambah)
5. ✅ Toast message: "Satuan 'Dus' berhasil ditambahkan dan dipilih"
6. ✅ "Dus" is auto-selected in dropdown
7. ✅ Form closes automatically
8. Save product
9. ✅ Product should have unit_id pointing to "Dus"

### 5. Test Backward Compatibility

**Existing Products:**
1. Check products created before migration
2. ✅ Products with unit text should still display correctly
3. ✅ Migration attempts to match existing unit text to unit_id
4. ✅ Products without unit_id can still be edited

## Breaking Changes

### API Changes
⚠️ **BREAKING**: Service functions now require `storeId` parameter:

**Before:**
```typescript
const categories = await getAllCategories();
const brands = await getAllBrands();
const brandsByCategory = await getBrandsByCategory(categoryId);
```

**After:**
```typescript
const categories = await getAllCategories(storeId);
const brands = await getAllBrands(storeId);
const brandsByCategory = await getBrandsByCategory(categoryId, storeId);
```

### Interface Changes
⚠️ **BREAKING**: Interfaces now include `store_id`:

```typescript
interface Category {
  id: number;
  store_id: number; // NEW
  name: string;
  // ...
}

interface Brand {
  id: number;
  store_id: number; // NEW
  name: string;
  // ...
}

interface CreateCategoryInput {
  store_id: number; // NEW - REQUIRED
  name: string;
  // ...
}
```

## Migration Safety

✅ **Safe to run multiple times**: Migration uses `IF NOT EXISTS` checks
✅ **No data loss**: All existing data is preserved
✅ **Backward compatible**: Old unit/unit_abbr fields retained for compatibility
✅ **Automatic seeding**: Default units created for all existing stores
✅ **Cascade delete**: When store deleted, all related master data deleted

## Rollback Plan

If issues occur, rollback by:

1. **Revert code changes** (git revert)
2. **Drop new constraints**:
```sql
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_store_id_fkey;
ALTER TABLE brands DROP CONSTRAINT IF EXISTS brands_store_id_fkey;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_unit_id_fkey;
DROP TABLE IF EXISTS units CASCADE;
```

3. **Remove columns**:
```sql
ALTER TABLE categories DROP COLUMN IF EXISTS store_id;
ALTER TABLE brands DROP COLUMN IF EXISTS store_id;
ALTER TABLE products DROP COLUMN IF EXISTS unit_id;
```

## Performance Impact

✅ **Minimal impact**: Indexes added for all foreign keys
✅ **Query optimization**: RLS policies use indexed columns
✅ **No N+1 queries**: All data fetched in single queries

## Security Impact

✅ **Improved security**: Strict RLS policies prevent data leakage
✅ **Multi-tenant isolation**: Complete data separation between stores
✅ **Role-based access**: Owner/Admin/Kasir permissions enforced

## Next Steps

After successful deployment:
1. ✅ Monitor error logs for any issues
2. ✅ Verify no cross-store data leakage
3. ✅ Test all CRUD operations for categories, brands, and units
4. ✅ Verify unit dropdown works in all forms
5. ✅ Check that Quick Add features work correctly
6. ✅ Ensure existing products still display correctly

## Support

If issues occur:
1. Check Supabase logs for RLS policy errors
2. Verify JWT contains correct store_id
3. Check that all service calls pass storeId parameter
4. Verify migration ran successfully (check verification output)

---

**Migration Created**: 2026-05-19
**Status**: Ready for Production
**Risk Level**: Low (backward compatible, safe rollback)
