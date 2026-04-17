

## Plan — Hide Admin menus, POS debt flow refactor, Refund status & note

### 1. Sidebar — Hide Laporan & Pengeluaran for Admin
File: `src/contexts/AuthContext.tsx`
- Update `MENU_ACCESS` config:
  - `'expenses': ['owner']` (was `['owner','admin']`)
  - `'reports': ['owner']` (was `['owner','admin']`)
- Sidebar already filters via `canAccessMenu`, so menu auto-hidden. Owner unchanged.
- Routes in `App.tsx`: wrap `/backoffice/expenses` and `/backoffice/reports` with `ProtectedRoute allowedRoles={['owner']}` for safety.

### 2. POS — Remove "Kirim", refactor Debt flow
File: `src/pages/POS.tsx`

**a. Remove KIRIM button** from footer (lines 470–474). The standalone shipping button is gone; shipping now only accessible via debt flow.

**b. Conditional footer buttons when `isDebt === true`:**
- Hide: AMBIL (OWNER), TUNAI, TRANSFER, QRIS
- Show only: **JASA** + **SIMPAN UTANG**
- When `isDebt === false`: keep existing TUNAI/TRANSFER/QRIS/AMBIL/JASA layout (no KIRIM)

**c. New "Simpan Utang" modal flow:**
- Create new component `src/components/pos/DebtModal.tsx` with two stacked sections:
  1. **Pilih Pelanggan (wajib)** — reuse customer search/add UI pattern from `PaymentModal`. Confirm button disabled until customer selected.
  2. **Opsi Kirim Barang (opsional)** — checkbox "Kirim barang ini". When checked, expand inline shipping form (recipient name prefilled from customer, address, phone, courier note). Reuse fields from existing `ShippingModal`.
  3. **Konfirmasi Simpan Utang** button at bottom — saves debt sale + (if shipping checked) creates shipment record via `addShipment` from `shippingStore`.
- On click "SIMPAN UTANG" footer button → open `DebtModal` instead of current auto-confirm path.
- Remove the `useEffect` auto-trigger on debt (line 119: `if (paymentMethod && isDebt) handleConfirmPayment(0)`). Replace with explicit modal flow.
- After confirm: call existing `handleConfirmPayment(0)` logic with `paymentMethod='cash'` set internally + optional shipment creation.

### 3. Refund — Status badge & note display

**a. Types** (`src/types/pos.ts`)
- Add optional field to `Sale` interface: `refund_reason?: string` (or store on Sale itself for easy lookup).

**b. Data layer** (`src/data/sampleData.ts`)
- In `processRefund`, also write `refund_reason: reason` onto the updated sale record (in addition to existing `Refund` table entry).

**c. Transactions list** (`src/pages/backoffice/Transactions.tsx`)
- In Status column (line 197–201), add third branch:
  - `payment_status === 'refunded'` → render red destructive badge: **"Refund"** (`bg-red-100 text-red-700`)

**d. Transaction Detail Dialog** (same file, lines 295–341)
- When `selectedSale.payment_status === 'refunded'`, render a prominent note card above item list:
  - Red-tinted box (`bg-red-50 border-red-200 rounded-lg p-3`)
  - Icon `RotateCcw` + label **"Alasan Refund"**
  - Body: `selectedSale.refund_reason` (fallback: lookup via `refunds.find(r => r.sale_id === selectedSale.id)?.reason`)

### Files touched
- `src/contexts/AuthContext.tsx` — restrict menu access
- `src/App.tsx` — tighten route guards
- `src/pages/POS.tsx` — remove KIRIM, conditional buttons, wire DebtModal
- `src/components/pos/DebtModal.tsx` *(new)* — combined customer + optional shipping
- `src/types/pos.ts` — add `refund_reason` to Sale
- `src/data/sampleData.ts` — persist reason on sale
- `src/pages/backoffice/Transactions.tsx` — Refund badge + reason note in detail

### Out of scope (unchanged)
Owner Portal, SDM, Pengiriman page, all other backoffice pages, design tokens, existing customer/payment/receipt modals.

