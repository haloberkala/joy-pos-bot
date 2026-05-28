# 🎯 ACTION PLAN - Selesaikan Aplikasi POS

**Target**: 100% Complete  
**Current**: 95% Complete  
**Remaining**: 1 Task  
**Time Needed**: 30-45 menit

---

## 📋 TASK: Implementasi UI Utang Supplier

### Status
- ✅ Backend: 100% Complete
- 🔨 Frontend: 0% (Need to implement)

### Files Involved
- **Main File**: `src/pages/backoffice/Purchases.tsx`
- **Service**: `src/services/supplierPaymentsService.ts` (already created)
- **Migration**: `supabase/migrations/012_supplier_payments.sql` (already created)

---

## 🚀 STEP-BY-STEP IMPLEMENTATION

### STEP 1: Verify Migration (5 min)

**Action**: Check if migration sudah dijalankan di Supabase

**How**:
1. Buka Supabase Dashboard
2. Go to SQL Editor
3. Run query:
   ```sql
   SELECT * FROM supplier_payments LIMIT 1;
   ```

**Expected Result**:
- ✅ If success: Table exists, proceed to Step 2
- ❌ If error: Run migration first

**If Need to Run Migration**:
1. Open file: `supabase/migrations/012_supplier_payments.sql`
2. Copy all content
3. Paste in Supabase SQL Editor
4. Click "Run"
5. Verify: Run query again

---

### STEP 2: Open Implementation Guide (2 min)

**Action**: Read the implementation guide

**File**: `SUPPLIER_DEBT_IMPLEMENTATION_GUIDE.md`

**What to Look For**:
- Import statements
- State variables
- Handler functions
- UI components

---

### STEP 3: Implement Code Changes (25-35 min)

**File**: `src/pages/backoffice/Purchases.tsx`

#### 3.1 Import Service (1 min)

**Location**: Top of file, after existing imports

**Code**:
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

#### 3.2 Add State Variables (2 min)

**Location**: After existing state declarations

**Code**:
```typescript
// Supplier debt state
const [supplierDebts, setSupplierDebts] = useState<SupplierDebtSummary[]>([]);
const [selectedDebt, setSelectedDebt] = useState<SupplierDebtSummary | null>(null);
const [debtPayments, setDebtPayments] = useState<SupplierPayment[]>([]);
const [isPayDebtOpen, setIsPayDebtOpen] = useState(false);
const [paymentAmount, setPaymentAmount] = useState('');
const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'check' | 'other'>('cash');
const [paymentNote, setPaymentNote] = useState('');
const [formPaymentStatus, setFormPaymentStatus] = useState<'paid' | 'partial' | 'unpaid'>('paid');
```

#### 3.3 Update loadData() (3 min)

**Location**: Find existing `loadData` function

**Change**:
```typescript
const loadData = async () => {
  try {
    setIsLoading(true);
    const [suppliersData, purchasesData, productsData, debtsData] = await Promise.all([
      getSuppliersByStore(activeStoreId),
      getPurchasesByStore(activeStoreId),
      getProductsByStore(activeStoreId),
      getSupplierDebtSummary(activeStoreId), // ADD THIS LINE
    ]);
    
    setSuppliers(suppliersData);
    setProducts(productsData);
    setSupplierDebts(debtsData); // ADD THIS LINE
    
    // ... rest of the code
  } catch (error) {
    console.error('Error loading data:', error);
    toast.error('Gagal memuat data');
  } finally {
    setIsLoading(false);
  }
};
```

#### 3.4 Update handleAddPurchase() (3 min)

**Location**: Find existing `handleAddPurchase` function

**Change**: Add `payment_status` to createPurchase call:
```typescript
await createPurchase({
  store_id: activeStoreId,
  supplier_id: formSupplier ? Number(formSupplier) : null,
  reference_no: refNo,
  purchase_date: new Date(formDate),
  total_amount: formTotal,
  payment_status: formPaymentStatus, // ADD THIS LINE
  image_proof: formImageProof,
  note: formNote || null,
  items,
});
```

#### 3.5 Add Payment Status to Form (3 min)

**Location**: In "Catat Pembelian Baru" dialog, after date field

**Code**:
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

#### 3.6 Add Handler Functions (5 min)

**Location**: After existing handler functions

**Code**: Copy from `SUPPLIER_DEBT_IMPLEMENTATION_GUIDE.md` section "E. Tambah Handler untuk Debt Payment"

Functions to add:
- `handlePayDebt()`
- `openPayDebt()`

#### 3.7 Replace Tab "Utang Supplier" (8 min)

**Location**: Find `<TabsContent value="supplier-debt">`

**Action**: Replace entire content with code from guide section "G. Replace Tab 'Utang Supplier'"

**What it includes**:
- Summary cards (Total Utang, Sudah Dibayar, Total Pembelian)
- Debt table with columns
- Status badges
- "Bayar" button

#### 3.8 Add Dialog "Bayar Utang" (5 min)

**Location**: Before closing `</div>` of main component

**Code**: Copy from guide section "H. Tambah Dialog untuk Bayar Utang"

**What it includes**:
- Debt info display
- Payment history
- Payment form
- Validation

---

### STEP 4: Test Implementation (8 min)

#### Test 1: Create Purchase dengan Utang (2 min)
1. Go to Kulakan/Supply
2. Click "Catat Pembelian"
3. Fill form
4. Select payment status: "Belum Bayar (Utang)"
5. Save
6. ✅ Should save successfully

#### Test 2: View Utang (2 min)
1. Go to tab "Utang Supplier"
2. ✅ Should see summary cards with data
3. ✅ Should see debt table with purchase
4. ✅ Should see status badge "Belum Bayar"

#### Test 3: Bayar Cicilan (2 min)
1. Click "Bayar" button on debt row
2. Dialog should open
3. Enter payment amount
4. Select payment method
5. Click "Bayar"
6. ✅ Should save successfully
7. ✅ Status should update to "Sebagian"

#### Test 4: Auto-Update Status (2 min)
1. Bayar remaining amount
2. ✅ Status should update to "Lunas"
3. ✅ Debt should disappear from list

---

## ✅ COMPLETION CHECKLIST

### Pre-Implementation
- [ ] Migration 012 verified/run in Supabase
- [ ] Read implementation guide
- [ ] Backup Purchases.tsx (optional)

### Implementation
- [ ] Import supplierPaymentsService
- [ ] Add state variables
- [ ] Update loadData()
- [ ] Add formPaymentStatus state
- [ ] Update handleAddPurchase()
- [ ] Add payment status dropdown to form
- [ ] Add handlePayDebt() function
- [ ] Add openPayDebt() function
- [ ] Replace tab "Utang Supplier" content
- [ ] Add dialog "Bayar Utang"

### Testing
- [ ] Test create purchase dengan status "Utang"
- [ ] Test view utang di tab
- [ ] Test bayar cicilan
- [ ] Test auto-update payment status
- [ ] Test payment history
- [ ] Test validation (amount > remaining)

### Verification
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] UI looks correct
- [ ] All features working

---

## 🎯 SUCCESS CRITERIA

### When Complete, You Should Have:

1. **Create Purchase Form**
   - ✅ Dropdown "Status Pembayaran" visible
   - ✅ Options: Lunas, Sebagian, Belum Bayar (Utang)

2. **Tab Utang Supplier**
   - ✅ Summary cards showing totals
   - ✅ Table with debt list
   - ✅ Status badges
   - ✅ "Bayar" button on each row

3. **Dialog Bayar Utang**
   - ✅ Debt info displayed
   - ✅ Payment history shown
   - ✅ Payment form working
   - ✅ Validation working

4. **Auto-Update**
   - ✅ Payment status updates automatically
   - ✅ Debt disappears when fully paid

---

## 🚨 TROUBLESHOOTING

### Error: Table supplier_payments does not exist
**Solution**: Run migration 012 in Supabase

### Error: Cannot read property 'reduce' of undefined
**Solution**: Check if `supplierDebts` is initialized as empty array

### Error: Function getSupplierDebtSummary not found
**Solution**: Check import statement

### UI not updating after payment
**Solution**: Make sure `loadData()` is called after payment

---

## 📚 REFERENCE FILES

### Must Read
1. **`SUPPLIER_DEBT_IMPLEMENTATION_GUIDE.md`** - Complete guide with code
2. **`QUICK_STATUS.md`** - Quick overview

### Reference
3. `CURRENT_STATUS_SUMMARY.md` - Detailed status
4. `src/pages/backoffice/Transactions.tsx` - Similar implementation
5. `src/services/supplierPaymentsService.ts` - Service functions

---

## 🎉 AFTER COMPLETION

### You Will Have
- ✅ 100% complete POS application
- ✅ All 20 features working
- ✅ Customer & supplier debt management
- ✅ Production ready

### Next Steps
1. Deploy to production
2. Train users
3. Monitor for issues

---

## ⏱️ TIME ESTIMATE

| Step | Time | Cumulative |
|------|------|------------|
| Verify Migration | 5 min | 5 min |
| Read Guide | 2 min | 7 min |
| Import Service | 1 min | 8 min |
| Add State | 2 min | 10 min |
| Update loadData | 3 min | 13 min |
| Update handleAddPurchase | 3 min | 16 min |
| Add Payment Status Form | 3 min | 19 min |
| Add Handler Functions | 5 min | 24 min |
| Replace Tab Content | 8 min | 32 min |
| Add Dialog | 5 min | 37 min |
| Testing | 8 min | 45 min |

**Total**: 45 minutes (max)

---

## 🎯 LET'S DO THIS!

**Current Progress**: 95%  
**After This Task**: 100%  
**Time Needed**: 30-45 min  

**Main Guide**: `SUPPLIER_DEBT_IMPLEMENTATION_GUIDE.md`

**Ready? Let's finish this! 💪**

---

**Created**: Context Transfer Session  
**Status**: Ready to Execute  
**Priority**: High  
**Difficulty**: Medium  
**Impact**: Complete the application to 100%
