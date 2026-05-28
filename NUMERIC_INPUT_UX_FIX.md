# NUMERIC INPUT UX IMPROVEMENT

## Problem
Input angka (Harga, Stok, Qty) di form "Tambah Produk" dan "Edit Produk" memiliki default value `0` yang mengganggu UX:
- User harus menghapus angka 0 secara manual sebelum mengetik
- Jika tidak dihapus, ketikan menjadi aneh (contoh: `05000`)
- Mengurangi kecepatan input data

## Solution Implemented

### 1. ✅ Initial State Changed
**Before:**
```typescript
const [formData, setFormData] = useState({
  cost_price: 0,
  selling_price_retail: 0,
  quantity: 0,
  // ... etc
});
```

**After:**
```typescript
const [formData, setFormData] = useState({
  cost_price: undefined,
  selling_price_retail: undefined,
  quantity: undefined,
  // ... etc
});
```

### 2. ✅ Input Value Display
**Before:**
```tsx
<Input
  type="number"
  value={formData.cost_price || 0}
  // ...
/>
```

**After:**
```tsx
<Input
  type="number"
  value={formData.cost_price !== undefined ? formData.cost_price : ""}
  placeholder="0"
  // ...
/>
```

### 3. ✅ Input onChange Handler
**Before:**
```tsx
onChange={(e) =>
  setFormData((p) => ({
    ...p,
    cost_price: parseFloat(e.target.value) || 0,
  }))
}
```

**After:**
```tsx
onChange={(e) =>
  setFormData((p) => ({
    ...p,
    cost_price: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0,
  }))
}
```

### 4. ✅ Submit Payload Handling
**Before:**
```typescript
await createProduct({
  cost_price: formData.cost_price,
  quantity: formData.quantity,
  // ... etc
});
```

**After:**
```typescript
const payload = {
  cost_price: formData.cost_price || 0,
  selling_price_retail: formData.selling_price_retail || 0,
  selling_price_wholesale: formData.selling_price_wholesale || 0,
  selling_price_special: formData.selling_price_special || 0,
  wholesale_min_qty: formData.wholesale_min_qty || 10,
  special_min_qty: formData.special_min_qty || 20,
  min_stock_alert: formData.min_stock_alert || 10,
  quantity: formData.quantity || 0,
};

await createProduct({
  store_id: storeId,
  code: formData.code!,
  ...payload,
});
```

## Fields Updated

All numeric input fields in AddProductModal:

1. ✅ **Stok Awal** (`quantity`) - Default: 0
2. ✅ **Harga Modal** (`cost_price`) - Default: 0
3. ✅ **Harga Jual Eceran** (`selling_price_retail`) - Default: 0
4. ✅ **Harga Jual Grosir** (`selling_price_wholesale`) - Default: 0
5. ✅ **Min Qty Grosir** (`wholesale_min_qty`) - Default: 10
6. ✅ **Harga Jual Spesial** (`selling_price_special`) - Default: 0
7. ✅ **Min Qty Spesial** (`special_min_qty`) - Default: 20
8. ✅ **Stok Minimum Alert** (`min_stock_alert`) - Default: 10

## User Experience Improvements

### Before:
1. User clicks input field
2. Sees `0` in the field
3. Must manually delete `0` or select all
4. Then types the actual value
5. Risk of typing `05000` if forgot to delete

### After:
1. User clicks input field
2. Sees empty field with placeholder `0` (gray text)
3. Directly types the value
4. Placeholder automatically disappears
5. Much faster and cleaner input experience

## Technical Benefits

✅ **Type Safety**: Properly handles `undefined` vs `0` distinction
✅ **Database Safety**: Converts empty values to proper defaults before submit
✅ **No Breaking Changes**: Existing data and validation logic unchanged
✅ **Better UX**: Significantly faster data entry for kasir
✅ **Consistent Behavior**: All numeric inputs behave the same way

## Testing Checklist

- [ ] Open "Tambah Produk" modal
- [ ] Verify all numeric fields show empty with placeholder "0"
- [ ] Type numbers directly without deleting anything
- [ ] Submit form and verify data saved correctly
- [ ] Open "Edit Produk" modal with existing product
- [ ] Verify existing values display correctly
- [ ] Modify values and verify update works
- [ ] Leave some fields empty and verify defaults applied

## Files Modified

- `src/components/backoffice/AddProductModal.tsx`

## Related Issues

This fix addresses the UX complaint about numeric input fields requiring manual deletion of default `0` value before typing.
