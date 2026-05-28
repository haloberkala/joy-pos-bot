# 🔄 CUSTOMER MANAGEMENT - FLOW DIAGRAM

## 1. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                     SUPABASE DATABASE                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │  customers                                          │    │
│  │  - id (PK)                                          │    │
│  │  - store_id (FK → stores.id)                       │    │
│  │  - name (UNIQUE per store)                         │    │
│  │  - phone (UNIQUE per store)                        │    │
│  │  - address                                          │    │
│  │  - created_at, updated_at                          │    │
│  └────────────────────────────────────────────────────┘    │
│                           ↕                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │  sales                                              │    │
│  │  - id (PK)                                          │    │
│  │  - customer_id (FK → customers.id) [NULLABLE]      │    │
│  │  - invoice_number, grand_total, etc.               │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                   SERVICE LAYER                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  customersService.ts                                │    │
│  │  - getCustomersByStore(storeId)                    │    │
│  │  - createCustomer(input)                           │    │
│  │  - updateCustomer(id, input)                       │    │
│  │  - deleteCustomer(id)                              │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                   UI COMPONENTS                              │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Back Office     │  │  POS             │               │
│  │  - Customers.tsx │  │  - POS.tsx       │               │
│  │  - Dashboard.tsx │  │  - PaymentModal  │               │
│  │                  │  │  - DebtModal     │               │
│  │                  │  │  - CustomerSubform│              │
│  └──────────────────┘  └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. POS PAYMENT FLOW (WITH CUSTOMER)

```
┌─────────────────────────────────────────────────────────────┐
│  USER ACTION: Klik "TUNAI" / "TRANSFER" / "QRIS"            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  PaymentModal Opens                                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CustomerSubform Component                          │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  1. Load customers from DB                   │  │    │
│  │  │     getCustomersByStore(storeId)             │  │    │
│  │  │                                               │  │    │
│  │  │  2. Display customer list with search        │  │    │
│  │  │     - Search by name/phone                   │  │    │
│  │  │     - Show max 5 results                     │  │    │
│  │  │                                               │  │    │
│  │  │  3. User Options:                            │  │    │
│  │  │     ┌─────────────────────────────────────┐  │  │    │
│  │  │     │ A. Select Existing Customer         │  │  │    │
│  │  │     │    → Customer selected              │  │  │    │
│  │  │     │    → onCustomerChange(customer)     │  │  │    │
│  │  │     └─────────────────────────────────────┘  │  │    │
│  │  │     ┌─────────────────────────────────────┐  │  │    │
│  │  │     │ B. Add New Customer                 │  │  │    │
│  │  │     │    → Show inline form               │  │  │    │
│  │  │     │    → Fill name, phone, address      │  │  │    │
│  │  │     │    → createCustomer(input)          │  │  │    │
│  │  │     │    → Auto-select new customer       │  │  │    │
│  │  │     │    → Refresh customer list          │  │  │    │
│  │  │     └─────────────────────────────────────┘  │  │    │
│  │  │     ┌─────────────────────────────────────┐  │  │    │
│  │  │     │ C. Skip (if optional)               │  │  │    │
│  │  │     │    → Continue without customer      │  │  │    │
│  │  │     └─────────────────────────────────────┘  │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │                                                      │    │
│  │  4. Payment Details (amount, change, etc.)          │    │
│  │                                                      │    │
│  │  5. Confirm Button                                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  handleConfirmPayment(amountPaid)                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  1. Prepare sale data                               │    │
│  │     - items, serviceItems                           │    │
│  │     - customer_id (from selectedCustomer)           │    │
│  │     - payment_method, grand_total, etc.             │    │
│  │                                                      │    │
│  │  2. createSale(saleData)                            │    │
│  │     → Save to Supabase                              │    │
│  │     → Reduce product stock                          │    │
│  │     → Link customer_id                              │    │
│  │                                                      │    │
│  │  3. Show receipt                                    │    │
│  │     → Display customer name (if any)                │    │
│  │                                                      │    │
│  │  4. Clear cart & close bill                         │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. DEBT FLOW (CUSTOMER REQUIRED)

```
┌─────────────────────────────────────────────────────────────┐
│  USER ACTION: Centang "Utang" → Klik "SIMPAN UTANG"         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  DebtModal Opens                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CustomerSubform (required=true)                    │    │
│  │  → User MUST select/create customer                 │    │
│  │                                                      │    │
│  │  Due Date Input (required)                          │    │
│  │  → User MUST fill due date                          │    │
│  │                                                      │    │
│  │  Shipping Option (optional)                         │    │
│  │  → Checkbox "Kirim barang ini"                      │    │
│  │  → If checked: fill recipient details               │    │
│  │                                                      │    │
│  │  Confirm Button                                     │    │
│  │  → Disabled if no customer or no due date           │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  handleConfirmDebt({ dueDate, shipping? })                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  1. Validate customer & due date                    │    │
│  │     → Show error if missing                         │    │
│  │                                                      │    │
│  │  2. createSale(...)                                 │    │
│  │     - payment_status: 'debt'                        │    │
│  │     - customer_id: REQUIRED                         │    │
│  │     - due_date: from input                          │    │
│  │     - amount_received: 0                            │    │
│  │                                                      │    │
│  │  3. If shipping: createShipment(...)                │    │
│  │     - Link to sale_id                               │    │
│  │     - recipient details                             │    │
│  │                                                      │    │
│  │  4. Show receipt & clear cart                       │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. DASHBOARD CUSTOMER COUNT

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard Component Mount                                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  loadDashboardData()                                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Promise.all([                                      │    │
│  │    getSalesByStore(activeStoreId),                  │    │
│  │    getProductsByStore(activeStoreId),               │    │
│  │    getCustomersByStore(activeStoreId), ← NEW        │    │
│  │  ])                                                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Calculate Stats                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  totalCustomers = customersData.length              │    │
│  │  → Total customers in database                      │    │
│  │                                                      │    │
│  │  uniqueCustomersWithTransactions =                  │    │
│  │    new Set(sales.filter(s => s.customer_id)        │    │
│  │              .map(s => s.customer_id)).size         │    │
│  │  → Customers who made transactions                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Display StatCard                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Title: "Pelanggan"                                 │    │
│  │  Value: totalCustomers (e.g., "5")                  │    │
│  │  Change: "X dengan transaksi" (e.g., "3 dengan     │    │
│  │          transaksi")                                │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. BACK OFFICE CUSTOMER MANAGEMENT

```
┌─────────────────────────────────────────────────────────────┐
│  /backoffice/customers Page                                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Load Customers                                              │
│  getCustomersByStore(activeStoreId)                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Display Table with Actions                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Search Bar                                         │    │
│  │  → Filter by name/phone                             │    │
│  │                                                      │    │
│  │  Customer Table                                     │    │
│  │  ┌──────────┬──────────┬──────────┬──────────┐    │    │
│  │  │ Name     │ Phone    │ Address  │ Actions  │    │    │
│  │  ├──────────┼──────────┼──────────┼──────────┤    │    │
│  │  │ John Doe │ 08123... │ Jl. ...  │ Edit Del │    │    │
│  │  └──────────┴──────────┴──────────┴──────────┘    │    │
│  │                                                      │    │
│  │  Add Customer Button                                │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  User Actions                                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CREATE                                             │    │
│  │  → Open modal                                       │    │
│  │  → Fill form (name, phone, address)                │    │
│  │  → createCustomer(input)                           │    │
│  │  → Validate unique name/phone per store            │    │
│  │  → Refresh table                                    │    │
│  │                                                      │    │
│  │  UPDATE                                             │    │
│  │  → Open modal with existing data                   │    │
│  │  → Edit form                                        │    │
│  │  → updateCustomer(id, input)                       │    │
│  │  → Validate unique name/phone per store            │    │
│  │  → Refresh table                                    │    │
│  │                                                      │    │
│  │  DELETE                                             │    │
│  │  → Open custom confirmation modal                  │    │
│  │  → Confirm deletion                                 │    │
│  │  → deleteCustomer(id)                              │    │
│  │  → Refresh table                                    │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. ERROR HANDLING FLOW

```
┌─────────────────────────────────────────────────────────────┐
│  User tries to create/update customer                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Validation Checks                                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │  1. Client-side validation                          │    │
│  │     - Name & phone required                         │    │
│  │     - Show toast if missing                         │    │
│  │                                                      │    │
│  │  2. Send to Supabase                                │    │
│  │     createCustomer(input) or updateCustomer(...)    │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Database Constraint Check                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  UNIQUE(store_id, name)                             │    │
│  │  UNIQUE(store_id, phone)                            │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    ┌──────┴──────┐
                    │             │
                 SUCCESS        ERROR
                    │             │
                    ↓             ↓
    ┌───────────────────┐  ┌─────────────────────────┐
    │ Return customer   │  │ Catch error (23505)     │
    │ data              │  │ → Duplicate constraint  │
    └───────────────────┘  └─────────────────────────┘
                                      ↓
                    ┌─────────────────────────────────┐
                    │ Parse error message             │
                    │ ┌─────────────────────────────┐ │
                    │ │ customers_store_phone_unique│ │
                    │ │ → "Nomor telepon 'X' sudah  │ │
                    │ │    terdaftar di toko ini"   │ │
                    │ └─────────────────────────────┘ │
                    │ ┌─────────────────────────────┐ │
                    │ │ customers_store_name_unique │ │
                    │ │ → "Pelanggan dengan nama    │ │
                    │ │    'X' sudah ada di toko    │ │
                    │ │    ini"                     │ │
                    │ └─────────────────────────────┘ │
                    └─────────────────────────────────┘
                                      ↓
                    ┌─────────────────────────────────┐
                    │ Show toast.error(message)       │
                    │ User sees friendly error        │
                    └─────────────────────────────────┘
```

---

## 7. DATA FLOW SUMMARY

```
┌──────────────┐
│   USER       │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│  UI LAYER                                             │
│  - POS.tsx                                            │
│  - PaymentModal.tsx                                   │
│  - DebtModal.tsx                                      │
│  - CustomerSubform.tsx                                │
│  - Customers.tsx (Back Office)                        │
│  - Dashboard.tsx                                      │
└──────┬───────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│  SERVICE LAYER                                        │
│  - customersService.ts                                │
│    • getCustomersByStore()                            │
│    • createCustomer()                                 │
│    • updateCustomer()                                 │
│    • deleteCustomer()                                 │
│  - salesService.ts                                    │
│    • createSale() → saves customer_id                 │
└──────┬───────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│  SUPABASE CLIENT                                      │
│  - supabase.from('customers')                         │
│  - supabase.from('sales')                             │
└──────┬───────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│  SUPABASE DATABASE                                    │
│  - customers table                                    │
│    • Unique constraints per store                     │
│    • Foreign key to stores                            │
│  - sales table                                        │
│    • Foreign key to customers (nullable)              │
└───────────────────────────────────────────────────────┘
```

---

**Diagram dibuat**: 2026-05-23  
**Status**: ✅ Complete & Accurate
