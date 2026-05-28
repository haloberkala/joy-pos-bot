# Perbaikan Tab Daftar Utang - SELESAI ✅

## Tanggal: 25 Mei 2026

## TASK 9: Transactions Page - Debt Tab Improvements

### Status: ✅ SELESAI

---

## Perubahan yang Dilakukan

### 1. ✅ Hapus Filter Tab (Belum, Lunas, Semua)
**File**: `src/pages/backoffice/Transactions.tsx`

**Perubahan**:
- Menghapus state `debtFilter` yang tidak diperlukan
- Menghapus UI filter tabs (Belum, Lunas, Semua) dari tab "Daftar Utang"
- Menghapus logic filtering berdasarkan status pembayaran
- Sekarang tab "Daftar Utang" langsung menampilkan SEMUA utang (baik yang belum lunas maupun yang sudah lunas)
- Menghapus import icon yang tidak digunakan (`Check`, `Clock`)

**Logic Baru**:
```typescript
const debtSales = useMemo(() => {
  // ONLY show sales that have debt payment history
  let filtered = sales.filter(s => {
    const debtInfo = debtTotals.get(s.id);
    const hasDebtHistory = debtInfo && debtInfo.paid > 0;
    
    // Include if:
    // 1. Currently debt (payment_status = 'debt'), OR
    // 2. Was debt and now paid (payment_status = 'paid' AND has debt payment history)
    return s.payment_status === 'debt' || (s.payment_status === 'paid' && hasDebtHistory);
  });
  
  // Only search filter applied
  if (debtSearch) {
    const q = debtSearch.toLowerCase();
    filtered = filtered.filter(s => {
      const customer = customers.find(c => c.id === s.customer_id);
      return s.invoice_number.toLowerCase().includes(q) || 
             customer?.name.toLowerCase().includes(q);
    });
  }
  
  return filtered.sort((a, b) => 
    new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
  );
}, [sales, debtTotals, debtSearch, customers]);
```

**Hasil**:
- UI lebih bersih dan sederhana
- Hanya ada search bar untuk mencari pelanggan/invoice
- Semua utang (lunas dan belum lunas) ditampilkan langsung
- Tidak ada lagi kebingungan dengan filter tab

---

### 2. ✅ Perbaikan Date Picker (Custom Range)
**File**: `src/components/backoffice/DateFilter.tsx`

**Masalah Sebelumnya**:
- Date picker otomatis tertutup (auto-close) sesaat setelah user memilih tanggal pertama
- User tidak bisa memilih rentang tanggal dengan nyaman

**Solusi**:
- Menambahkan `modal={true}` pada Popover untuk mencegah auto-close
- Menambahkan `onInteractOutside` handler yang mencegah penutupan saat klik di dalam calendar
- Popover hanya bisa ditutup dengan:
  1. Klik tombol "Batal"
  2. Klik tombol "Terapkan"
  3. Klik di luar area popover (backdrop)

**Kode**:
```typescript
<Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen} modal={true}>
  <PopoverContent 
    className="w-auto p-0" 
    align="end"
    onInteractOutside={(e) => {
      // Only prevent closing if clicking inside the calendar/buttons
      const target = e.target as HTMLElement;
      if (target.closest('[role="dialog"]') || target.closest('button')) {
        e.preventDefault();
      }
    }}
  >
    {/* Calendar content */}
  </PopoverContent>
</Popover>
```

**Hasil**:
- User bisa memilih tanggal awal dan tanggal akhir dengan nyaman
- Calendar tidak auto-close saat memilih tanggal
- User harus klik "Terapkan" untuk menerapkan filter atau "Batal" untuk membatalkan

---

### 3. ✅ Auto-Update Payment Status (Sudah Selesai Sebelumnya)
**File**: `src/services/debtPaymentsService.ts`

**Fitur**:
- Ketika utang dibayar lunas (sisa = 0), `payment_status` otomatis berubah menjadi `'paid'`
- Transaksi yang sudah lunas tetap muncul di tab "Daftar Utang" karena memiliki riwayat pembayaran utang

---

## Testing Checklist

### Tab Daftar Utang
- [x] Filter tab (Belum, Lunas, Semua) sudah dihapus
- [x] Hanya ada search bar untuk mencari pelanggan/invoice
- [x] Menampilkan semua utang (lunas dan belum lunas)
- [x] Transaksi tunai/transfer/QRIS biasa TIDAK muncul di tab ini
- [x] Hanya transaksi dengan riwayat utang yang muncul

### Date Picker
- [x] Klik "Pilih Tanggal" membuka calendar
- [x] Bisa memilih tanggal awal tanpa calendar auto-close
- [x] Bisa memilih tanggal akhir tanpa calendar auto-close
- [x] Tombol "Terapkan" menerapkan filter dan menutup calendar
- [x] Tombol "Batal" menutup calendar tanpa menerapkan filter

### Auto-Update Status
- [x] Ketika utang dibayar lunas, status berubah menjadi "Lunas"
- [x] Transaksi yang sudah lunas tetap muncul di tab "Daftar Utang"
- [x] Badge status menampilkan "Lunas" (hijau) atau "Belum" (orange)

---

## Files Modified

1. `src/pages/backoffice/Transactions.tsx`
   - Hapus state `debtFilter`
   - Hapus UI filter tabs
   - Simplify `debtSales` useMemo logic
   - Hapus unused imports

2. `src/components/backoffice/DateFilter.tsx`
   - Tambah `modal={true}` pada Popover
   - Tambah `onInteractOutside` handler
   - Prevent auto-close saat memilih tanggal

3. `src/services/debtPaymentsService.ts`
   - Auto-update `payment_status` ke `'paid'` saat lunas (sudah selesai sebelumnya)

---

## Kesimpulan

✅ **TASK 9 SELESAI**

Semua perbaikan pada halaman "Transaksi & Utang" telah selesai:
1. ✅ Filter tab utang (Belum, Lunas, Semua) sudah dihapus
2. ✅ Date picker tidak auto-close lagi
3. ✅ Tab "Daftar Utang" hanya menampilkan transaksi dengan riwayat utang
4. ✅ Auto-update payment_status saat utang lunas

UI sekarang lebih bersih, sederhana, dan user-friendly!
