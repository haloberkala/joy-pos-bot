# ✅ Perbaikan UI Fitur "Simpan Utang" - COMPLETE

## Status: DONE ✓

Fitur "Simpan Utang" telah diperbaiki dengan memindahkan input tanggal jatuh tempo ke dalam modal dan menjadikannya wajib diisi.

---

## Perubahan yang Dilakukan

### 1. ✅ Hapus Input Tanggal di Luar Modal (POS)

**Sebelum:**
- Input tanggal (kalender mm/dd/yyyy) berada di luar modal
- Letaknya di sebelah checkbox "Utang" di bagian bawah layar POS
- Muncul hanya ketika checkbox "Utang" dicentang

**Sesudah:**
- Input tanggal dihapus dari bagian bawah layar POS
- Hanya checkbox "Utang" yang tersisa
- UI lebih bersih dan tidak membingungkan

**File Modified:** `src/pages/POS.tsx`
- Dihapus state `dueDate` dari komponen POS
- Dihapus conditional rendering input date di footer
- Dihapus reset `dueDate` dari fungsi cleanup

---

### 2. ✅ Input Tanggal Jatuh Tempo di Dalam Modal (Wajib Diisi)

**Implementasi:**
- Input tanggal dipindahkan ke dalam Modal "Simpan Utang"
- Label jelas: **"Tanggal Jatuh Tempo (Maksimal Lunas) *"**
- Input type="date" dengan styling konsisten
- Helper text: "Batas waktu pelunasan utang"
- **Required field** - wajib diisi sebelum bisa konfirmasi

**Validasi:**
- Tombol "Konfirmasi Simpan Utang" akan **disabled** jika:
  - Pelanggan belum dipilih, ATAU
  - Tanggal jatuh tempo belum diisi
- Toast error muncul jika kasir mencoba submit tanpa tanggal

**File Modified:** `src/components/pos/DebtModal.tsx`
- Ditambahkan state `dueDate` di dalam DebtModal
- Ditambahkan input date dengan label dan helper text
- Updated `handleSubmit()` untuk validasi tanggal
- Updated interface `DebtModalProps` untuk menerima `dueDate` di `onConfirm`
- Tombol konfirmasi disabled jika `!selectedCustomer || !dueDate`

---

### 3. ✅ Sinkronisasi dengan Backend dan Backoffice

**Backend (Supabase):**
- Tanggal jatuh tempo dari modal disimpan ke field `due_date` di tabel `sales`
- Data dikirim melalui `createSale()` service
- Format: `new Date(opts.dueDate)` untuk konversi ke timestamp

**Backoffice - Daftar Utang:**
- Tanggal jatuh tempo sudah ditampilkan di tabel "Daftar Utang"
- Lokasi: Di bawah nama pelanggan dengan label "JT:"
- Format: `JT: DD/MM/YYYY`
- **Indikator visual:**
  - Jika belum jatuh tempo: Text abu-abu (muted-foreground)
  - Jika sudah jatuh tempo: Text merah tebal + emoji ⚠️
  - Row dengan utang jatuh tempo: Background merah muda (bg-red-50/50)

**File Terkait:**
- `src/pages/POS.tsx` - Updated `handleConfirmDebt()` untuk menerima `dueDate`
- `src/components/pos/DebtModal.tsx` - Input dan validasi tanggal
- `src/pages/backoffice/Transactions.tsx` - Sudah menampilkan due_date dengan benar

---

## Alur Kerja Baru

### Di POS (Kasir):

1. Kasir menambahkan produk ke keranjang
2. Kasir mencentang checkbox **"Utang"**
3. Kasir klik tombol **"SIMPAN UTANG"**
4. Modal "Simpan Utang" terbuka dengan:
   - Total Utang (display)
   - **Pilih Pelanggan** (required) ✓
   - **Tanggal Jatuh Tempo** (required) ✓ **← BARU**
   - Opsi Pengiriman (optional)
5. Kasir **WAJIB** memilih pelanggan dan tanggal jatuh tempo
6. Tombol "Konfirmasi Simpan Utang" hanya aktif jika kedua field terisi
7. Setelah konfirmasi, transaksi tersimpan dengan tanggal jatuh tempo

### Di Backoffice (Admin/Owner):

1. Buka halaman **"Transaksi & Utang"**
2. Klik tab **"Daftar Utang"**
3. Lihat tabel utang dengan kolom:
   - **Pelanggan** (dengan tanggal JT di bawahnya) ✓
   - Invoice
   - Total
   - Sisa
   - Status
   - Aksi
4. Tanggal jatuh tempo ditampilkan sebagai:
   - `JT: 15/05/2026` (normal - abu-abu)
   - `JT: 10/05/2026 ⚠️` (jatuh tempo - merah tebal)

---

## Validasi dan Error Handling

### Validasi di Modal:
```typescript
// Pelanggan wajib dipilih
if (!selectedCustomer) {
  toast.error('Pelanggan wajib dipilih untuk transaksi utang');
  return;
}

// Tanggal jatuh tempo wajib diisi
if (!dueDate) {
  toast.error('Tanggal jatuh tempo wajib diisi');
  return;
}
```

### Tombol Disabled:
```typescript
disabled={!selectedCustomer || !dueDate}
```

---

## UI/UX Improvements

### Sebelum:
- ❌ Input tanggal tersebar (di luar modal)
- ❌ Tidak jelas apakah wajib diisi
- ❌ Bisa submit tanpa tanggal
- ❌ UI kurang rapi

### Sesudah:
- ✅ Semua input terpusat di dalam modal
- ✅ Label jelas dengan tanda asterisk (*)
- ✅ Validasi ketat - tidak bisa submit tanpa tanggal
- ✅ UI lebih bersih dan terorganisir
- ✅ Helper text menjelaskan fungsi field
- ✅ Tombol disabled memberikan feedback visual

---

## Technical Details

### State Management:
```typescript
// POS.tsx - State dueDate DIHAPUS
// DebtModal.tsx - State dueDate DITAMBAHKAN
const [dueDate, setDueDate] = useState('');
```

### Interface Update:
```typescript
interface DebtModalProps {
  // ... other props
  onConfirm: (opts: { 
    dueDate: string;           // ← REQUIRED
    shipping?: DebtConfirmShipping 
  }) => void;
}
```

### Backend Integration:
```typescript
const sale = await createSale({
  // ... other fields
  due_date: new Date(opts.dueDate),  // ← From modal input
  payment_status: 'debt',
});
```

---

## Verification Checklist

✅ **POS Page:**
- [x] Input tanggal dihapus dari footer
- [x] Checkbox "Utang" masih berfungsi
- [x] Modal terbuka saat klik "SIMPAN UTANG"

✅ **Debt Modal:**
- [x] Input tanggal jatuh tempo ditampilkan
- [x] Label jelas dengan asterisk
- [x] Helper text informatif
- [x] Validasi tanggal berfungsi
- [x] Tombol disabled jika tanggal kosong
- [x] Toast error muncul jika submit tanpa tanggal

✅ **Backend:**
- [x] Tanggal tersimpan ke database
- [x] Format tanggal benar (Date object)
- [x] Field `due_date` terisi di tabel `sales`

✅ **Backoffice:**
- [x] Tanggal jatuh tempo ditampilkan di tabel
- [x] Format "JT: DD/MM/YYYY" benar
- [x] Indikator jatuh tempo (merah + ⚠️) berfungsi
- [x] Row highlight untuk utang jatuh tempo

✅ **TypeScript:**
- [x] No compilation errors
- [x] Type definitions updated
- [x] All interfaces correct

---

## Files Modified

1. **`src/pages/POS.tsx`**
   - Removed `dueDate` state
   - Removed date input from footer
   - Updated `handleConfirmDebt()` signature
   - Removed `dueDate` cleanup

2. **`src/components/pos/DebtModal.tsx`**
   - Added `dueDate` state
   - Added date input with label and validation
   - Updated `handleSubmit()` validation
   - Updated interface `DebtModalProps`
   - Updated button disabled condition

3. **`src/pages/backoffice/Transactions.tsx`**
   - Already displaying `due_date` correctly (no changes needed)

---

## Result

Fitur "Simpan Utang" sekarang memiliki:
- ✅ UI yang lebih bersih dan terorganisir
- ✅ Validasi yang ketat untuk tanggal jatuh tempo
- ✅ Alur yang jelas dan mudah dipahami kasir
- ✅ Sinkronisasi sempurna antara POS dan Backoffice
- ✅ Indikator visual yang jelas untuk utang jatuh tempo

**Status: PRODUCTION READY** ✓
