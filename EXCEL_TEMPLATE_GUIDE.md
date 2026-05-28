# Excel Template Visual Guide

## Template Structure

The Excel import template has the following structure:

### Sheet 1: Template

Empty template with only headers for users to fill in

### Sheet 2: Contoh (Example)

Example data showing how to fill in the template

## Column Details

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ EXCEL IMPORT TEMPLATE - PRODUK                                              │
├────┬──────────┬───────┬──────────────────┬──────────────┬──────────────────┤
│ No │ Kategori │ Brand │ Nama Produk *    │ Barcode/SKU* │ Satuan           │
├────┼──────────┼───────┼──────────────────┼──────────────┼──────────────────┤
│ 1  │ Makanan  │ Indo  │ Mie Instan Merah │ MIE001       │ Pcs              │
│ 2  │ Minuman  │ Coca  │ Coca Cola 500ml  │ CCL500       │ Botol            │
│ 3  │ Snack    │ Lay   │ Lay Potato Chips │ LAY100       │ Bungkus          │
└────┴──────────┴───────┴──────────────────┴──────────────┴──────────────────┘

┌────────────────┬──────────────────┬────────────────┬──────────────┬────────┐
│ Stok Awal      │ Stok Minimum     │ Harga Modal *  │ Harga Jual   │ Harga  │
│                │                  │                │ Spesial      │ Jual   │
├────────────────┼──────────────────┼────────────────┼──────────────┼────────┤
│ 50             │ 10               │ 2500           │ 3000         │ 3200   │
│ 30             │ 5                │ 8000           │ 7500         │ 8500   │
│ 25             │ 3                │ 5000           │ 4500         │ 4800   │
└────────────────┴──────────────────┴────────────────┴──────────────┴────────┘

┌────────────────────────┐
│ Harga Jual Eceran *    │
├────────────────────────┤
│ 3500                   │
│ 9000                   │
│ 5500                   │
└────────────────────────┘
```

## Complete Example Row

| Kategori | Brand    | Nama Produk \*   | Barcode/SKU \* | Satuan | Stok Awal | Stok Minimum | Harga Modal \* | Harga Jual Spesial | Harga Jual Grosir | Harga Jual Eceran \* |
| -------- | -------- | ---------------- | -------------- | ------ | --------- | ------------ | -------------- | ------------------ | ----------------- | -------------------- |
| Makanan  | Indofood | Mie Instan Merah | MIE001         | Pcs    | 50        | 10           | 2500           | 3000               | 3200              | 3500                 |

## Field Types

| Field                | Type   | Min Length | Max Length | Format                | Example                 |
| -------------------- | ------ | ---------- | ---------- | --------------------- | ----------------------- |
| Kategori             | Text   | 1          | 50         | Alphanumeric          | Makanan, Minuman, Snack |
| Brand                | Text   | 1          | 50         | Alphanumeric          | Indofood, Coca, Lay     |
| Nama Produk \*       | Text   | 1          | 100        | Alphanumeric + spaces | Mie Instan Merah        |
| Barcode/SKU \*       | Text   | 1          | 50         | Alphanumeric          | MIE001, CCL500          |
| Satuan               | Text   | 1          | 20         | Alphanumeric          | Pcs, Botol, Bungkus     |
| Stok Awal            | Number | 0          | 999999     | Integer               | 50, 100, 1000           |
| Stok Minimum         | Number | 1          | 99999      | Integer               | 5, 10, 20               |
| Harga Modal \*       | Number | 0.01       | 999999.99  | Decimal               | 2500, 8000.50           |
| Harga Jual Spesial   | Number | 0.01       | 999999.99  | Decimal               | 3000, 7500.50           |
| Harga Jual Grosir    | Number | 0.01       | 999999.99  | Decimal               | 3200, 8500.50           |
| Harga Jual Eceran \* | Number | 0.01       | 999999.99  | Decimal               | 3500, 9000.50           |

## Validation Rules

1. **Required Fields** (marked with \*):
   - Must not be empty
   - Nama Produk _, Barcode/SKU _ - cannot be duplicates within store
   - Price fields - must be valid numbers

2. **Optional Fields**:
   - Kategori, Brand - will be auto-created if not exists
   - Satuan - will be auto-created if not exists
   - Stock fields - will default to 0 or 5 if empty
   - Price fields (Special, Grosir) - will default to Eceran price

3. **Special Rules**:
   - Harga Jual Grosir can be less than or equal to Harga Jual Eceran
   - Harga Jual Spesial can be less than or equal to Harga Jual Eceran
   - Stok Minimum should be reasonable (typically 1-50)
   - All prices should be greater than 0

## Common Mistakes to Avoid

❌ **DON'T:**

- Leave required fields (\*) empty
- Use special characters in Barcode/SKU (e.g., #, $, @)
- Mix number formats (e.g., 2,500 instead of 2500)
- Add extra spaces at the beginning/end of fields
- Use decimal points in stock fields

✅ **DO:**

- Fill all required fields (marked with \*)
- Use consistent number format
- Provide category and brand names when possible
- Keep product names clear and descriptive
- Use appropriate units (Pcs, Botol, Bungkus, etc.)

## Import Process Flow

```
1. Download Template Excel
   ↓
2. Edit Template in Spreadsheet
   ├─ Fill in required fields (*)
   ├─ Add categories & brands
   └─ Set pricing & stock
   ↓
3. Save File
   ↓
4. Go to Backoffice → Products
   ↓
5. Click "Import Excel" Button
   ↓
6. Upload File
   ↓
7. System Processing
   ├─ Validates all rows
   ├─ Creates categories/brands/units if needed
   ├─ Creates products in Supabase
   └─ Shows success/error report
   ↓
8. Review Results
   └─ Check import success count
   └─ Review any errors
```

## Tips for Best Results

1. **Batch Import**: Import 50-100 products at once for best performance
2. **Test First**: Try with 5-10 products first to ensure data format is correct
3. **Consistency**: Use consistent naming for categories and brands
4. **Backups**: Keep a copy of your Excel file for reference
5. **Review**: Always verify imported data in the product list
