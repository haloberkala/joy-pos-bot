# 📘 Panduan Implementasi Fitur Utang Supplier

## Status: SIAP DIIMPLEMENTASIKAN

Semua file yang diperlukan sudah dibuat. Ikuti langkah-langkah berikut untuk mengaktifkan fitur utang supplier.

---

## 📁 File yang Sudah Dibuat

### 1. Migration File ✅
**File**: `supabase/migrations/012_supplier_payments.sql`

**Isi**:
- Menambah kolom `payment_status` ke tabel `purchases`
- Membuat tabel `supplier_payments` untuk tracking pembayaran
- Membuat function `get_total_paid_for_purchase()`
- Membuat function `update_purchase_payment_status()` (auto-update status)
- Membuat trigger untuk auto-update payment status
- Membuat view `supplier_debt_summary` untuk summary utang
- RLS policies lengkap

### 2. Service File ✅
**File**: `src/services/supplierPaymentsService.ts`

**Functions**:
- `getSupplierPaymentsByStore()` - Get all payments
- `getSupplierPaymentsByPurchase()` - Get payments for specific purchase
- `getTotalPaidForPurchase()` - Get total paid amount
- `createSupplierPayment()` - Create new payment
- `updateSupplierPayment()` - Update payment
- `deleteSupplierPayment()` - Delete payment
- `getSupplierDebtSummary()` - Get debt summary
- `getTotalSupplierDebt()` - Get total debt amount
- `getDebtBySupplier()` - Get debt grouped by supplier

### 3. Updated Service File ✅
**File**: `src/services/purchasesService.ts`

**Changes**:
- Added `payment_status` field to `Purchase` interface
- Added `payment_status` parameter to `CreatePurchaseInput`
- Updated `createPurchase()` to include payment_status

---

## 🚀 Langkah Implementasi

### STEP 1: Jalankan Migration di Supabase

1. Buka Supabase Dashboard
2. Go to SQL Editor
3. Copy isi file `supabase/migrations/012_supplier_payments.sql`
4. Paste dan Run
5. Verify: Check tabel `supplier_payments` sudah ada

### STEP 2: Update Purchases Page

File yang perlu diupdate: `src/pages/backoffice/Purchases.tsx`

#### A. Import Service Baru

Tambahkan di bagian atas file:

```typescript
import {
  getSupplierDebtSummary,
  getSupplierPaymentsByPurchase,
  getTotalPaidForPurchase,
  createSupplierPayment,
  deleteSupplierPayment,
  SupplierDebtSummary,
  SupplierPayment,
} from '@/services/supplierPaymentsService';
```

#### B. Tambah State untuk Debt Management

Tambahkan setelah state yang sudah ada:

```typescript
// Supplier debt state
const [supplierDebts, setSupplierDebts] = useState<SupplierDebtSummary[]>([]);
const [selectedDebt, setSelectedDebt] = useState<SupplierDebtSummary | null>(null);
const [debtPayments, setDebtPayments] = useState<SupplierPayment[]>([]);
const [isPayDebtOpen, setIsPayDebtOpen] = useState(false);
const [paymentAmount, setPaymentAmount] = useState('');
const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'check' | 'other'>('cash');
const [paymentNote, setPaymentNote] = useState('');
```

#### C. Update loadData Function

Tambahkan loading debt summary:

```typescript
const loadData = async () => {
  try {
    setIsLoading(true);
    const [suppliersData, purchasesData, productsData, debtsData] = await Promise.all([
      getSuppliersByStore(activeStoreId),
      getPurchasesByStore(activeStoreId),
      getProductsByStore(activeStoreId),
      getSupplierDebtSummary(activeStoreId), // NEW
    ]);
    
    setSuppliers(suppliersData);
    setProducts(productsData);
    setSupplierDebts(debtsData); // NEW
    
    // ... rest of the code
  } catch (error) {
    console.error('Error loading data:', error);
    toast.error('Gagal memuat data');
  } finally {
    setIsLoading(false);
  }
};
```

#### D. Tambah Function untuk Payment Status

```typescript
// Add payment status field to form
const [formPaymentStatus, setFormPaymentStatus] = useState<'paid' | 'partial' | 'unpaid'>('paid');

// Update handleAddPurchase to include payment_status
await createPurchase({
  store_id: activeStoreId,
  supplier_id: formSupplier ? Number(formSupplier) : null,
  reference_no: refNo,
  purchase_date: new Date(formDate),
  total_amount: formTotal,
  payment_status: formPaymentStatus, // NEW
  image_proof: formImageProof,
  note: formNote || null,
  items,
});
```

#### E. Tambah Handler untuk Debt Payment

```typescript
const handlePayDebt = async () => {
  if (!selectedDebt || !paymentAmount) {
    toast.error('Isi jumlah pembayaran');
    return;
  }

  const amount = parseFloat(paymentAmount);
  if (amount <= 0 || amount > selectedDebt.remaining_amount) {
    toast.error('Jumlah pembayaran tidak valid');
    return;
  }

  try {
    await createSupplierPayment({
      store_id: activeStoreId,
      purchase_id: selectedDebt.purchase_id,
      supplier_id: selectedDebt.supplier_id,
      amount,
      payment_method: paymentMethod,
      note: paymentNote || undefined,
    });

    toast.success('Pembayaran berhasil dicatat');
    setIsPayDebtOpen(false);
    setPaymentAmount('');
    setPaymentNote('');
    setSelectedDebt(null);
    loadData(); // Reload data
  } catch (error) {
    console.error('Error creating payment:', error);
    toast.error('Gagal mencatat pembayaran');
  }
};

const openPayDebt = async (debt: SupplierDebtSummary) => {
  setSelectedDebt(debt);
  setIsPayDebtOpen(true);
  
  // Load payment history
  try {
    const payments = await getSupplierPaymentsByPurchase(debt.purchase_id);
    setDebtPayments(payments);
  } catch (error) {
    console.error('Error loading payments:', error);
  }
};
```

#### F. Update Form Pembelian - Tambah Payment Status

Dalam Dialog "Catat Pembelian Baru", tambahkan setelah field Tanggal:

```typescript
<div className="space-y-2">
  <Label>Status Pembayaran</Label>
  <Select value={formPaymentStatus} onValueChange={(v: any) => setFormPaymentStatus(v)}>
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value="paid">Lunas</SelectItem>
      <SelectItem value="partial">Sebagian</SelectItem>
      <SelectItem value="unpaid">Belum Bayar (Utang)</SelectItem>
    </SelectContent>
  </Select>
</div>
```

#### G. Replace Tab "Utang Supplier"

Ganti isi `<TabsContent value="supplier-debt">` dengan:

```typescript
<TabsContent value="supplier-debt" className="space-y-4">
  {/* Summary Cards */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Total Utang</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {formatCurrency(supplierDebts.reduce((sum, d) => sum + d.remaining_amount, 0))}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{supplierDebts.length} pembelian</p>
        </div>
        <div className="p-3 rounded-lg bg-red-100 text-red-600">
          <Wallet className="w-5 h-5" />
        </div>
      </div>
    </div>
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Sudah Dibayar</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {formatCurrency(supplierDebts.reduce((sum, d) => sum + d.total_paid, 0))}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-green-100 text-green-600">
          <Check className="w-5 h-5" />
        </div>
      </div>
    </div>
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Total Pembelian</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {formatCurrency(supplierDebts.reduce((sum, d) => sum + d.total_amount, 0))}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
          <DollarSign className="w-5 h-5" />
        </div>
      </div>
    </div>
  </div>

  {/* Debt Table */}
  <div className="bg-card rounded-xl border border-border overflow-hidden">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Referensi</TableHead>
          <TableHead>Supplier</TableHead>
          <TableHead>Tanggal</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Terbayar</TableHead>
          <TableHead className="text-right">Sisa</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {supplierDebts.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <Check className="w-10 h-10 text-green-500" />
                <p className="font-semibold">Tidak ada utang supplier</p>
                <p className="text-sm">Semua pembelian sudah lunas</p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          supplierDebts.map((debt) => (
            <TableRow key={debt.purchase_id}>
              <TableCell className="font-mono font-medium">{debt.reference_no}</TableCell>
              <TableCell>{debt.supplier_name || 'Tanpa Supplier'}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(new Date(debt.purchase_date))}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(debt.total_amount)}</TableCell>
              <TableCell className="text-right text-green-600">{formatCurrency(debt.total_paid)}</TableCell>
              <TableCell className="text-right font-bold text-red-600">{formatCurrency(debt.remaining_amount)}</TableCell>
              <TableCell>
                <Badge variant={debt.payment_status === 'partial' ? 'secondary' : 'destructive'}>
                  {debt.payment_status === 'partial' ? 'Sebagian' : 'Belum Bayar'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1"
                  onClick={() => openPayDebt(debt)}
                >
                  <DollarSign className="w-3 h-3" /> Bayar
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>
</TabsContent>
```

#### H. Tambah Dialog untuk Bayar Utang

Tambahkan sebelum closing `</div>` terakhir:

```typescript
{/* Pay Debt Dialog */}
<Dialog open={isPayDebtOpen} onOpenChange={setIsPayDebtOpen}>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle>Bayar Utang Supplier</DialogTitle>
    </DialogHeader>
    {selectedDebt && (
      <div className="space-y-4 py-4">
        {/* Debt Info */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Referensi:</span>
            <span className="font-medium">{selectedDebt.reference_no}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Supplier:</span>
            <span className="font-medium">{selectedDebt.supplier_name || 'Tanpa Supplier'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Pembelian:</span>
            <span className="font-semibold">{formatCurrency(selectedDebt.total_amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sudah Dibayar:</span>
            <span className="text-green-600">{formatCurrency(selectedDebt.total_paid)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-semibold">Sisa Utang:</span>
            <span className="font-bold text-red-600 text-lg">{formatCurrency(selectedDebt.remaining_amount)}</span>
          </div>
        </div>

        {/* Payment History */}
        {debtPayments.length > 0 && (
          <div className="space-y-2">
            <Label>Riwayat Pembayaran</Label>
            <div className="bg-muted/30 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
              {debtPayments.map((payment) => (
                <div key={payment.id} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{formatDate(new Date(payment.payment_date))}</span>
                  <span className="font-medium">{formatCurrency(payment.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Form */}
        <div className="space-y-2">
          <Label>Jumlah Pembayaran *</Label>
          <Input 
            type="number" 
            placeholder="0" 
            value={paymentAmount} 
            onChange={(e) => setPaymentAmount(e.target.value)}
            max={selectedDebt.remaining_amount}
          />
          <p className="text-xs text-muted-foreground">
            Maksimal: {formatCurrency(selectedDebt.remaining_amount)}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Metode Pembayaran</Label>
          <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Tunai</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
              <SelectItem value="check">Cek</SelectItem>
              <SelectItem value="other">Lainnya</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Catatan (opsional)</Label>
          <Textarea 
            placeholder="Catatan pembayaran..." 
            value={paymentNote} 
            onChange={(e) => setPaymentNote(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setIsPayDebtOpen(false)}>Batal</Button>
          <Button onClick={handlePayDebt}>Bayar</Button>
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>
```

---

## ✅ Checklist Implementasi

### Database
- [ ] Run migration `012_supplier_payments.sql` di Supabase
- [ ] Verify tabel `supplier_payments` ada
- [ ] Verify view `supplier_debt_summary` ada
- [ ] Verify function `get_total_paid_for_purchase` ada

### Code
- [ ] Import `supplierPaymentsService` di Purchases.tsx
- [ ] Tambah state untuk debt management
- [ ] Update `loadData()` function
- [ ] Tambah `formPaymentStatus` state
- [ ] Update `handleAddPurchase()` dengan payment_status
- [ ] Tambah `handlePayDebt()` function
- [ ] Tambah `openPayDebt()` function
- [ ] Update form pembelian dengan payment status dropdown
- [ ] Replace tab "Utang Supplier" dengan UI baru
- [ ] Tambah dialog "Bayar Utang"

### Testing
- [ ] Test create purchase dengan status "Utang"
- [ ] Test view utang supplier di tab
- [ ] Test bayar cicilan utang
- [ ] Test auto-update payment status
- [ ] Test payment history
- [ ] Test validation (amount tidak boleh > remaining)

---

## 🎯 Hasil Akhir

Setelah implementasi selesai, fitur yang akan tersedia:

1. **Create Purchase dengan Payment Status**
   - Pilih: Lunas, Sebagian, Belum Bayar (Utang)

2. **Tab Utang Supplier**
   - Summary cards: Total Utang, Sudah Dibayar, Total Pembelian
   - Tabel utang dengan detail per purchase
   - Status badge (Sebagian/Belum Bayar)

3. **Bayar Cicilan Utang**
   - Dialog untuk input pembayaran
   - Riwayat pembayaran
   - Auto-update payment status
   - Validation amount

4. **Auto-Update Status**
   - Saat bayar cicilan, status otomatis update:
     - Total paid >= Total amount → Status: Paid
     - Total paid > 0 → Status: Partial
     - Total paid = 0 → Status: Unpaid

---

## 📞 Support

Jika ada error saat implementasi:
1. Check console browser untuk error message
2. Check Supabase logs
3. Verify RLS policies aktif
4. Verify migration sudah dijalankan

---

**Status**: READY TO IMPLEMENT  
**Estimated Time**: 30-45 menit  
**Difficulty**: Medium  

🚀 **Selamat mengimplementasikan!**
