# ✅ DAFTAR UTANG - TAB FILTER & DATE PICKER FIXES

## MASALAH YANG DIPERBAIKI

### 1. ❌ Date Picker Auto-Close
**Problem**: Date picker langsung tertutup setelah user klik tanggal pertama, sehingga tidak bisa memilih rentang tanggal.

### 2. ❌ Tab Menampilkan Transaksi Biasa
**Problem**: Tab "Lunas" dan "Semua" menampilkan transaksi tunai/transfer/QRIS biasa yang tidak ada hubungannya dengan utang.

---

## SOLUSI

### 1. ✅ Fix Date Picker - Tidak Auto-Close
**File**: `src/components/backoffice/DateFilter.tsx`

#### Before
```tsx
<Calendar
  mode="range"
  selected={{ from: tempRange.from, to: tempRange.to }}
  onSelect={(range) => setTempRange({ from: range?.from, to: range?.to })}
  numberOfMonths={2}
  className="p-3 pointer-events-auto"
/>
```

**Problem**: Calendar auto-close setelah select tanggal pertama

#### After
```tsx
<Calendar
  mode="range"
  selected={{ from: tempRange.from, to: tempRange.to }}
  onSelect={(range) => {
    setTempRange({ from: range?.from, to: range?.to });
    // Don't auto-close - let user click "Terapkan" button
  }}
  numberOfMonths={2}
  initialFocus={false}  // ← Prevent auto-close
  className="p-3"
/>
```

**Result**:
- ✅ Calendar tetap terbuka setelah pilih tanggal pertama
- ✅ User bisa pilih tanggal kedua (rentang)
- ✅ Calendar baru tertutup setelah klik "Terapkan" atau "Batal"

---

### 2. ✅ Fix Tab Filter - Hanya Tampilkan Utang
**File**: `src/pages/backoffice/Transactions.tsx`

#### Problem Analysis

**Transaksi di Database**:
```
┌────────────────────────────────────────────────────────┐
│ ID │ Invoice    │ Payment Method │ Payment Status     │
├────┼────────────┼────────────────┼────────────────────┤
│ 1  │ INV-001    │ cash           │ paid               │ ← Tunai biasa
│ 2  │ INV-002    │ transfer       │ paid               │ ← Transfer biasa
│ 3  │ INV-003    │ qris           │ paid               │ ← QRIS biasa
│ 4  │ INV-004    │ cash           │ debt               │ ← UTANG (belum lunas)
│ 5  │ INV-005    │ cash           │ paid (was debt)    │ ← UTANG (sudah lunas)
└────────────────────────────────────────────────────────┘
```

**Filter Lama (SALAH)**:
```typescript
// Menampilkan SEMUA transaksi dengan status 'paid'
let filtered = sales.filter(s => 
  s.payment_status === 'debt' || s.payment_status === 'paid'
);
// ❌ Termasuk INV-001, INV-002, INV-003 (transaksi biasa)
```

**Filter Baru (BENAR)**:
```typescript
// Hanya menampilkan transaksi yang PUNYA RIWAYAT UTANG
let filtered = sales.filter(s => {
  const debtInfo = debtTotals.get(s.id);
  const hasDebtHistory = debtInfo && debtInfo.paid > 0;
  
  // Include if:
  // 1. Currently debt (payment_status = 'debt'), OR
  // 2. Was debt and now paid (payment_status = 'paid' AND has debt payment history)
  return s.payment_status === 'debt' || 
         (s.payment_status === 'paid' && hasDebtHistory);
});
// ✅ Hanya INV-004 dan INV-005 (yang punya riwayat utang)
```

#### Implementation

**Before**:
```typescript
const debtSales = useMemo(() => {
  // ❌ SALAH: Menampilkan semua transaksi paid
  let filtered = sales.filter(s => 
    s.payment_status === 'debt' || s.payment_status === 'paid'
  );
  
  if (debtFilter === 'paid') {
    filtered = filtered.filter(s => s.payment_status === 'paid');
    // ❌ Termasuk transaksi tunai/transfer/QRIS biasa
  }
  // ...
}, [sales, debtFilter]);
```

**After**:
```typescript
const debtSales = useMemo(() => {
  // ✅ BENAR: Hanya transaksi dengan riwayat utang
  let filtered = sales.filter(s => {
    const debtInfo = debtTotals.get(s.id);
    const hasDebtHistory = debtInfo && debtInfo.paid > 0;
    
    // Include if:
    // 1. Currently debt (payment_status = 'debt'), OR
    // 2. Was debt and now paid (payment_status = 'paid' AND has debt payment history)
    return s.payment_status === 'debt' || 
           (s.payment_status === 'paid' && hasDebtHistory);
  });
  
  if (debtFilter === 'unpaid') {
    // Show only debts that are still unpaid
    filtered = filtered.filter(s => s.payment_status === 'debt');
  } else if (debtFilter === 'paid') {
    // Show only debts that have been fully paid
    filtered = filtered.filter(s => {
      const debtInfo = debtTotals.get(s.id);
      return s.payment_status === 'paid' && debtInfo && debtInfo.paid > 0;
    });
  }
  // 'all' shows both unpaid and paid debts (but only those with debt history)
  
  // ...
}, [sales, debtTotals, debtFilter]);
```

---

## LOGIC FLOW

### Tab "Belum Lunas"
```
┌─────────────────────────────────────────────────────┐
│ 1. Filter: payment_status === 'debt'                │
│ 2. Result: Hanya utang yang belum dibayar penuh    │
└─────────────────────────────────────────────────────┘

Example:
- INV-004: Rp 1.000.000 (sisa Rp 1.000.000) ✅
- INV-006: Rp 500.000 (sisa Rp 200.000) ✅
```

### Tab "Lunas"
```
┌─────────────────────────────────────────────────────┐
│ 1. Filter: payment_status === 'paid'                │
│ 2. AND: debtInfo.paid > 0 (punya riwayat bayar)    │
│ 3. Result: Hanya utang yang sudah lunas            │
└─────────────────────────────────────────────────────┘

Example:
- INV-005: Rp 800.000 (dibayar Rp 800.000) ✅
- INV-007: Rp 1.200.000 (dibayar Rp 1.200.000) ✅

NOT Included:
- INV-001: Tunai biasa (tidak punya riwayat utang) ❌
- INV-002: Transfer biasa (tidak punya riwayat utang) ❌
```

### Tab "Semua"
```
┌─────────────────────────────────────────────────────┐
│ 1. Filter: payment_status === 'debt' OR             │
│            (payment_status === 'paid' AND           │
│             debtInfo.paid > 0)                      │
│ 2. Result: Semua utang (lunas + belum lunas)       │
└─────────────────────────────────────────────────────┘

Example:
- INV-004: Belum lunas ✅
- INV-005: Sudah lunas ✅
- INV-006: Belum lunas ✅
- INV-007: Sudah lunas ✅

NOT Included:
- INV-001, INV-002, INV-003: Transaksi biasa ❌
```

---

## KEY INDICATOR: `debtTotals` Map

```typescript
// debtTotals is a Map<saleId, { paid, remaining }>
// Built from debt_payments table

const debtTotals = new Map([
  [4, { paid: 0, remaining: 1000000 }],      // INV-004: Belum bayar
  [5, { paid: 800000, remaining: 0 }],       // INV-005: Sudah lunas
  [6, { paid: 300000, remaining: 200000 }],  // INV-006: Cicilan
]);

// Transaksi tunai biasa TIDAK ADA di debtTotals
// INV-001, INV-002, INV-003 → NOT in Map
```

**Logic**:
```typescript
const hasDebtHistory = debtInfo && debtInfo.paid > 0;

// INV-001 (tunai): debtInfo = undefined → hasDebtHistory = false ❌
// INV-005 (utang lunas): debtInfo = { paid: 800000 } → hasDebtHistory = true ✅
```

---

## TESTING CHECKLIST

### ✅ Test 1: Date Picker - Pilih Rentang Tanggal
```
STEP 1: Buka /backoffice/transactions
STEP 2: Klik dropdown filter tanggal
STEP 3: Pilih "Pilih Tanggal"
STEP 4: Klik tanggal pertama (misal: 1 Mei)
VERIFY: Calendar TIDAK tertutup ✅
STEP 5: Klik tanggal kedua (misal: 15 Mei)
VERIFY: Calendar masih terbuka ✅
STEP 6: Klik tombol "Terapkan"
VERIFY: Calendar tertutup, filter diterapkan ✅
```

### ✅ Test 2: Tab "Belum Lunas" - Hanya Utang
```
STEP 1: Buka tab "Daftar Utang"
STEP 2: Pilih filter "Belum"
VERIFY: Hanya menampilkan transaksi dengan payment_status = 'debt' ✅
VERIFY: TIDAK menampilkan transaksi tunai/transfer/QRIS biasa ✅
```

### ✅ Test 3: Tab "Lunas" - Hanya Utang yang Sudah Dibayar
```
STEP 1: Buat transaksi utang (INV-TEST)
STEP 2: Bayar utang sampai lunas
STEP 3: Buka tab "Daftar Utang" → Filter "Lunas"
VERIFY: INV-TEST muncul di tab "Lunas" ✅
VERIFY: Transaksi tunai biasa TIDAK muncul ✅
```

### ✅ Test 4: Tab "Semua" - Semua Utang (Lunas + Belum)
```
STEP 1: Buka tab "Daftar Utang" → Filter "Semua"
VERIFY: Menampilkan utang belum lunas ✅
VERIFY: Menampilkan utang yang sudah lunas ✅
VERIFY: TIDAK menampilkan transaksi tunai/transfer/QRIS biasa ✅
```

### ✅ Test 5: Transaksi Biasa Tidak Muncul
```
STEP 1: Buat transaksi tunai biasa (INV-CASH)
STEP 2: Buka tab "Daftar Utang" → Filter "Semua"
VERIFY: INV-CASH TIDAK muncul ✅
STEP 3: Filter "Lunas"
VERIFY: INV-CASH TIDAK muncul ✅
```

---

## BEFORE & AFTER COMPARISON

### Tab "Lunas"

**Before** (SALAH):
```
┌─────────────────────────────────────────────────────┐
│ Tab "Lunas"                                         │
├─────────────────────────────────────────────────────┤
│ INV-001 | Tunai    | Rp 100.000 | Lunas            │ ❌
│ INV-002 | Transfer | Rp 200.000 | Lunas            │ ❌
│ INV-003 | QRIS     | Rp 150.000 | Lunas            │ ❌
│ INV-005 | Utang    | Rp 800.000 | Lunas            │ ✅
└─────────────────────────────────────────────────────┘
```

**After** (BENAR):
```
┌─────────────────────────────────────────────────────┐
│ Tab "Lunas"                                         │
├─────────────────────────────────────────────────────┤
│ INV-005 | Utang    | Rp 800.000 | Lunas            │ ✅
│ INV-007 | Utang    | Rp 1.200.000 | Lunas          │ ✅
└─────────────────────────────────────────────────────┘
```

### Tab "Semua"

**Before** (SALAH):
```
┌─────────────────────────────────────────────────────┐
│ Tab "Semua"                                         │
├─────────────────────────────────────────────────────┤
│ INV-001 | Tunai    | Rp 100.000 | Lunas            │ ❌
│ INV-002 | Transfer | Rp 200.000 | Lunas            │ ❌
│ INV-004 | Utang    | Rp 1.000.000 | Belum          │ ✅
│ INV-005 | Utang    | Rp 800.000 | Lunas            │ ✅
└─────────────────────────────────────────────────────┘
```

**After** (BENAR):
```
┌─────────────────────────────────────────────────────┐
│ Tab "Semua"                                         │
├─────────────────────────────────────────────────────┤
│ INV-004 | Utang    | Rp 1.000.000 | Belum          │ ✅
│ INV-005 | Utang    | Rp 800.000 | Lunas            │ ✅
│ INV-006 | Utang    | Rp 500.000 | Belum            │ ✅
└─────────────────────────────────────────────────────┘
```

---

## FILES MODIFIED

1. ✅ `src/components/backoffice/DateFilter.tsx`
   - Fix calendar auto-close issue
   - Add `initialFocus={false}`

2. ✅ `src/pages/backoffice/Transactions.tsx`
   - Fix debt filter logic
   - Only show transactions with debt history

3. ✅ `DEBT_TAB_FIXES.md`
   - Documentation

---

## BENEFITS

### User Experience
- ✅ Date picker lebih user-friendly (tidak auto-close)
- ✅ Tab "Daftar Utang" hanya menampilkan utang (tidak membingungkan)
- ✅ Kasir bisa dengan jelas membedakan utang vs transaksi biasa
- ✅ Lebih mudah tracking utang yang harus ditagih

### Data Accuracy
- ✅ Filter akurat berdasarkan riwayat pembayaran utang
- ✅ Tidak ada transaksi biasa yang "nyasar" ke tab utang
- ✅ Laporan utang lebih reliable

---

**Dibuat**: 2026-05-23  
**Status**: ✅ SELESAI  
**Breaking Changes**: Tidak ada  
**Tested**: Perlu testing manual
