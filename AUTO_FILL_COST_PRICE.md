# Auto-Fill Harga Modal - Fitur Catat Pembelian

## Ringkasan
Implementasi fitur auto-fill harga modal pada form "Catat Pembelian Baru" untuk meningkatkan efisiensi input data kulakan.

## Fitur yang Diimplementasikan

### 1. Auto-Fill Saat Memilih Produk
**Behavior:**
- Ketika user memilih produk dari dropdown, sistem otomatis mengisi field "Harga Modal" dengan nilai `cost_price` dari database
- Auto-fill hanya terjadi jika produk memiliki `cost_price > 0`
- Field tetap **editable** setelah auto-fill untuk fleksibilitas perubahan harga

**Kode:**
```typescript
// Auto-fill cost_price from product data
const selectedProduct = products.find((p) => p.id === Number(value));
if (selectedProduct && selectedProduct.cost_price > 0) {
  setFormItems((prev) =>
    prev.map((item, i) => 
      i === index 
        ? { 
            ...item, 
            product_id: value, 
            cost_price: String(selectedProduct.cost_price) 
          } 
        : item
    ),
  );
  return;
}
```

### 2. Auto-Fill Saat Tambah Produk Baru (Quick Add)
**Behavior:**
- Setelah user menambahkan produk baru via tombol "+" di form pembelian
- Sistem otomatis:
  1. Memilih produk yang baru ditambahkan
  2. Mengisi harga modal sesuai yang diinput saat membuat produk
- User tidak perlu input ulang harga modal

**Kode:**
```typescript
setFormItems((prev) =>
  prev.map((item, i) =>
    i === quickAddItemIndex
      ? {
          ...item,
          product_id: String(latestProduct.id),
          cost_price: String(latestProduct.cost_price),
        }
      : item
  )
);
```

### 3. Fleksibilitas Edit Manual
**Behavior:**
- Field "Harga Modal" tetap dapat diedit secara manual
- Berguna untuk kasus:
  - Harga supplier naik mendadak
  - Promo/diskon dari supplier
  - Harga berbeda untuk pembelian dalam jumlah besar
  - Belum sempat update harga di master produk

## User Experience Flow

### Skenario 1: Produk Existing
```
1. User klik "Catat Pembelian Baru"
2. User pilih supplier
3. User pilih produk dari dropdown
   → Harga Modal otomatis terisi (misal: Rp 50.000)
4. User input quantity (misal: 10)
   → Subtotal otomatis terhitung: Rp 500.000
5. User bisa edit harga modal jika berbeda (misal: Rp 48.000)
   → Subtotal update: Rp 480.000
```

### Skenario 2: Produk Baru (Quick Add)
```
1. User klik "Catat Pembelian Baru"
2. User klik tombol "+" di samping dropdown produk
3. User isi form produk baru:
   - Nama: "Semen Gresik 50kg"
   - Barcode: "SMN001"
   - Harga Modal: Rp 55.000
   - dll.
4. User klik "Simpan Produk"
   → Produk otomatis terpilih di form pembelian
   → Harga Modal otomatis terisi: Rp 55.000
5. User tinggal input quantity
```

## Keuntungan Fitur

### ✅ Efisiensi Input
- Mengurangi waktu input data kulakan
- Menghindari kesalahan ketik harga
- Konsistensi harga dengan master data

### ✅ Fleksibilitas
- Tetap bisa edit manual jika harga berubah
- Tidak memaksa user menggunakan harga dari database
- Cocok untuk berbagai kondisi bisnis

### ✅ User-Friendly
- Auto-fill terjadi secara instant (tidak ada delay)
- Tidak ada konfirmasi tambahan yang mengganggu
- Flow natural dan intuitif

## Technical Details

### File yang Dimodifikasi
- `src/pages/backoffice/Purchases.tsx`

### Fungsi yang Diubah
1. **`updateFormItem()`**
   - Menambahkan logic auto-fill saat `field === "product_id"`
   - Mencari produk dari state `products`
   - Set `cost_price` bersamaan dengan `product_id`

2. **`handleProductAdded()`**
   - Menggunakan `setFormItems` langsung (bukan `updateFormItem`)
   - Set `product_id` dan `cost_price` sekaligus
   - Memastikan produk terbaru dari database

### State Management
- Menggunakan existing state `formItems`
- Tidak menambah state baru
- Tetap maintain immutability dengan spread operator

## Testing Checklist

- [x] Auto-fill harga saat pilih produk existing
- [x] Field harga tetap editable setelah auto-fill
- [x] Auto-fill harga saat tambah produk baru via quick add
- [x] Tidak auto-fill jika `cost_price === 0`
- [x] Subtotal terhitung otomatis setelah auto-fill
- [x] Anti-duplikasi produk tetap berfungsi
- [x] Merge quantity tetap berfungsi

## Edge Cases Handled

### 1. Produk dengan Harga Modal 0
```typescript
if (selectedProduct && selectedProduct.cost_price > 0) {
  // Only auto-fill if cost_price > 0
}
```

### 2. Produk Duplikat
- Auto-fill tidak mengganggu logic merge quantity
- Harga modal dari produk existing tetap dipertahankan

### 3. Edit Manual Setelah Auto-Fill
- User bebas mengubah nilai yang sudah di-auto-fill
- Tidak ada validasi yang memaksa menggunakan harga dari database

## Future Enhancements (Optional)

1. **Visual Indicator**
   - Tambahkan ikon atau badge "Auto" saat harga di-auto-fill
   - Hilang saat user edit manual

2. **History Harga**
   - Tampilkan riwayat harga pembelian terakhir
   - Bantu user membandingkan harga

3. **Warning Harga Berbeda**
   - Alert jika harga manual berbeda signifikan dari database
   - Konfirmasi untuk update master harga

---
**Tanggal**: 2026-05-23  
**Status**: ✅ Completed  
**Impact**: High - Meningkatkan efisiensi input data kulakan
