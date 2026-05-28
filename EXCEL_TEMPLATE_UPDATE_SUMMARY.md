# Excel Template Update Summary

## 📋 Overview

Updated the Excel import template for products on the backoffice page to match the new simplified structure with proper field mapping to Supabase.

## 🔄 Changes Made

### 1. Template Column Structure

**Old Columns (15):**

- Nama Produk\*
- Kode/Barcode\*
- Kategori
- Brand
- Satuan
- Singkatan Satuan
- Harga Modal\*
- Harga Jual Eceran\*
- Harga Jual Grosir
- Min Qty Grosir
- Harga Jual Spesial
- Min Qty Spesial
- Stok Awal
- Min Stok Alert
- Tanggal Kadaluarsa

**New Columns (11):**

1. Kategori
2. Brand
3. Nama Produk \*
4. Barcode/SKU \*
5. Satuan
6. Stok Awal
7. Stok Minimum
8. Harga Modal \*
9. Harga Jual Spesial
10. Harga Jual Grosir
11. Harga Jual Eceran \*

### 2. Key Updates

#### Template Data Structure

- ✅ Reordered columns for better UX (Category → Brand → Product)
- ✅ Simplified field names (e.g., "Min Stok Alert" → "Stok Minimum")
- ✅ Removed unnecessary fields:
  - Singkatan Satuan (Unit abbreviation)
  - Min Qty Grosir (Fixed to default 10)
  - Min Qty Spesial (Fixed to default 20)
  - Tanggal Kadaluarsa (Expiry date - not used)

#### Import Logic Updates

File: `/home/adibnajwan/Projects/joy-pos-bot/src/pages/backoffice/Products.tsx`

**Changes:**

1. Updated field references in Excel parsing:
   - "Nama Produk*" → "Nama Produk *"
   - "Kode/Barcode*" → "Barcode/SKU *"
   - "Harga Modal*" → "Harga Modal *"
   - "Harga Jual Eceran*" → "Harga Jual Eceran *"
   - "Min Stok Alert" → "Stok Minimum"

2. Added unit handling via `getOrCreateUnit()`:

   ```typescript
   let unitId: number | undefined;
   const unitName = row["Satuan"]?.toString().trim();
   if (unitName) {
     const unit = await getOrCreateUnit(unitName, activeStoreId);
     unitId = unit.id;
   }
   ```

3. Simplified product creation to match `CreateProductInput` interface:
   - Uses `unit_id` instead of separate unit/unit_abbr fields
   - Fixed wholesale/special min quantities to constants (10, 20)
   - Removed expiry_date field

#### Column Widths

Updated Excel column widths for optimal display:

```typescript
ws["!cols"] = [
  { wch: 15 }, // Kategori
  { wch: 15 }, // Brand
  { wch: 25 }, // Nama Produk *
  { wch: 15 }, // Barcode/SKU *
  { wch: 12 }, // Satuan
  { wch: 12 }, // Stok Awal
  { wch: 12 }, // Stok Minimum
  { wch: 15 }, // Harga Modal *
  { wch: 18 }, // Harga Jual Spesial
  { wch: 18 }, // Harga Jual Grosir
  { wch: 18 }, // Harga Jual Eceran *
];
```

### 3. Data Mapping to Supabase

Field mapping from Excel to `products` table:

| Excel Field          | Supabase Field          | Type           | Notes                      |
| -------------------- | ----------------------- | -------------- | -------------------------- |
| Kategori             | category_id             | number \| null | Auto-created if not exists |
| Brand                | brand_id                | number \| null | Auto-created if not exists |
| Nama Produk \*       | name                    | string         | Required                   |
| Barcode/SKU \*       | code                    | string         | Required, unique per store |
| Satuan               | unit_id                 | number \| null | Auto-created if not exists |
| Stok Awal            | quantity                | number         | Defaults to 0              |
| Stok Minimum         | min_stock_alert         | number         | Defaults to 5              |
| Harga Modal \*       | cost_price              | number         | Required                   |
| Harga Jual Spesial   | selling_price_special   | number         | Defaults to retail price   |
| Harga Jual Grosir    | selling_price_wholesale | number         | Defaults to retail price   |
| Harga Jual Eceran \* | selling_price_retail    | number         | Required                   |

### 4. Example Template Entry

```
Kategori | Brand | Nama Produk * | Barcode/SKU * | Satuan | Stok Awal | Stok Minimum | Harga Modal * | Harga Jual Spesial | Harga Jual Grosir | Harga Jual Eceran *
Makanan | Indofood | Mie Instan Merah | MIE001 | Pcs | 50 | 10 | 2500 | 3000 | 3200 | 3500
```

## ✅ Verification

### Code Changes

- ✅ No TypeScript errors
- ✅ Build passes successfully
- ✅ All imports correctly added
- ✅ Field names properly updated

### Supabase Compatibility

- ✅ Uses correct field names from `CreateProductInput` interface
- ✅ Auto-creates related entities (Category, Brand, Unit)
- ✅ Properly maps all required fields
- ✅ Handles optional fields with sensible defaults

### Tested Features

- ✅ Template download functionality
- ✅ File upload and parsing
- ✅ Row validation
- ✅ Bulk insert to Supabase

## 📝 Usage Instructions

### For Users:

1. Go to **Backoffice → Produk & Stok**
2. Click **"Import Excel"** button
3. Click **"Download Template Excel"** to get the template
4. Fill in product data following the template structure
5. Upload the file to import all products at once

### Required Fields (marked with \*):

- Nama Produk \* - Product name
- Barcode/SKU \* - Unique product code
- Harga Modal \* - Cost price
- Harga Jual Eceran \* - Retail selling price

### Optional Fields:

- Kategori - Will be auto-created if not exists
- Brand - Will be auto-created if not exists
- Satuan - Unit of measurement, auto-created if needed
- Stok Awal - Initial stock (defaults to 0)
- Stok Minimum - Minimum stock alert level (defaults to 5)
- Harga Jual Spesial - Special selling price (defaults to retail price)
- Harga Jual Grosir - Wholesale price (defaults to retail price)

## 🔗 Related Files

- `/home/adibnajwan/Projects/joy-pos-bot/src/pages/backoffice/Products.tsx` - Main import logic
- `/home/adibnajwan/Projects/joy-pos-bot/src/services/productsService.ts` - Product creation
- `/home/adibnajwan/Projects/joy-pos-bot/src/services/categoriesService.ts` - Category management
- `/home/adibnajwan/Projects/joy-pos-bot/src/services/brandsService.ts` - Brand management
- `/home/adibnajwan/Projects/joy-pos-bot/src/services/unitsService.ts` - Unit management

## 🎯 Status

✅ **COMPLETED** - Excel template successfully updated and integrated with Supabase
