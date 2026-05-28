# 🚀 CUSTOMER MANAGEMENT - QUICK REFERENCE

## 📌 QUICK LINKS

| Feature | File | Status |
|---------|------|--------|
| **Back Office CRUD** | `src/pages/backoffice/Customers.tsx` | ✅ |
| **POS Customer Select** | `src/components/pos/CustomerSubform.tsx` | ✅ |
| **Payment Modal** | `src/components/pos/PaymentModal.tsx` | ✅ |
| **Debt Modal** | `src/components/pos/DebtModal.tsx` | ✅ |
| **Dashboard Count** | `src/pages/backoffice/Dashboard.tsx` | ✅ |
| **Service Layer** | `src/services/customersService.ts` | ✅ |

---

## 🔧 HOW TO USE

### 1. Get Customers by Store
```typescript
import { getCustomersByStore } from '@/services/customersService';

const customers = await getCustomersByStore(storeId);
// Returns: Customer[]
```

### 2. Create Customer
```typescript
import { createCustomer } from '@/services/customersService';

try {
  const newCustomer = await createCustomer({
    store_id: 12,
    name: 'John Doe',
    phone: '08123456789',
    address: 'Jl. Example No. 123', // optional
  });
  toast.success('Customer berhasil ditambahkan');
} catch (error) {
  // Error message already user-friendly
  toast.error(error.message);
}
```

### 3. Update Customer
```typescript
import { updateCustomer } from '@/services/customersService';

try {
  const updated = await updateCustomer(customerId, {
    name: 'John Doe Updated',
    phone: '08199999999',
  });
  toast.success('Customer berhasil diperbarui');
} catch (error) {
  toast.error(error.message);
}
```

### 4. Delete Customer
```typescript
import { deleteCustomer } from '@/services/customersService';

await deleteCustomer(customerId);
toast.success('Customer berhasil dihapus');
```

### 5. Use CustomerSubform in Modal
```typescript
import { CustomerSubform } from '@/components/pos/CustomerSubform';

function MyModal() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  return (
    <CustomerSubform
      storeId={activeStoreId}
      selectedCustomer={selectedCustomer}
      onCustomerChange={setSelectedCustomer}
      required={false} // or true for debt
    />
  );
}
```

### 6. Save Transaction with Customer
```typescript
import { createSale } from '@/services/salesService';

const sale = await createSale({
  store_id: activeStoreId,
  customer_id: selectedCustomer?.id || null, // nullable
  invoice_number: 'INV-001',
  // ... other fields
});
```

---

## 🎯 COMMON PATTERNS

### Pattern 1: Load & Display Customers
```typescript
const [customers, setCustomers] = useState<Customer[]>([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  loadCustomers();
}, [activeStoreId]);

const loadCustomers = async () => {
  try {
    setIsLoading(true);
    const data = await getCustomersByStore(activeStoreId);
    setCustomers(data);
  } catch (error) {
    toast.error('Gagal memuat data pelanggan');
  } finally {
    setIsLoading(false);
  }
};
```

### Pattern 2: Search Customers
```typescript
const [search, setSearch] = useState('');

const filtered = useMemo(() => {
  if (!search) return customers;
  const q = search.toLowerCase();
  return customers.filter(c => 
    c.phone.includes(search) || 
    c.name.toLowerCase().includes(q)
  );
}, [customers, search]);
```

### Pattern 3: Create with Auto-Refresh
```typescript
const handleCreate = async () => {
  try {
    const newCustomer = await createCustomer(input);
    setCustomers(prev => [...prev, newCustomer]); // auto-refresh
    setSelectedCustomer(newCustomer); // auto-select
    toast.success('Customer ditambahkan');
  } catch (error) {
    toast.error(error.message);
  }
};
```

### Pattern 4: Validate Before Submit
```typescript
const handleSubmit = () => {
  // Client-side validation
  if (!name.trim() || !phone.trim()) {
    toast.error('Nama dan telepon wajib diisi');
    return;
  }
  
  // Check duplicate (optional, DB will also check)
  if (customers.find(c => c.phone === phone.trim())) {
    toast.error('Nomor telepon sudah terdaftar');
    return;
  }
  
  // Proceed with create/update
  await createCustomer({ ... });
};
```

---

## 🚨 ERROR HANDLING

### Error Types
```typescript
// Duplicate phone
Error: "Nomor telepon '08123456789' sudah terdaftar di toko ini"

// Duplicate name
Error: "Pelanggan dengan nama 'John Doe' sudah ada di toko ini"

// Missing fields (client-side)
Error: "Nama dan telepon wajib diisi"

// Generic error
Error: "Gagal menambahkan pelanggan"
```

### Handling Errors
```typescript
try {
  await createCustomer(input);
} catch (error: any) {
  // Error message is already user-friendly in Bahasa Indonesia
  toast.error(error.message);
  
  // Optional: Log for debugging
  console.error('Customer error:', error);
}
```

---

## 📊 DATABASE SCHEMA

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraints per store
  CONSTRAINT customers_store_name_unique UNIQUE(store_id, name),
  CONSTRAINT customers_store_phone_unique UNIQUE(store_id, phone)
);

-- RLS is DISABLED (using custom auth)
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- Permissions for anon role
GRANT SELECT, INSERT, UPDATE, DELETE ON customers TO anon;
GRANT USAGE, SELECT ON SEQUENCE customers_id_seq TO anon;
```

---

## 🔍 DEBUGGING TIPS

### Check if customer exists
```sql
SELECT * FROM customers 
WHERE store_id = 12 
AND (name = 'John Doe' OR phone = '08123456789');
```

### Check transactions with customers
```sql
SELECT 
  s.invoice_number,
  s.grand_total,
  s.payment_status,
  c.name as customer_name,
  c.phone as customer_phone
FROM sales s
LEFT JOIN customers c ON s.customer_id = c.id
WHERE s.store_id = 12
ORDER BY s.created_at DESC
LIMIT 10;
```

### Count customers per store
```sql
SELECT 
  s.name as store_name,
  COUNT(c.id) as total_customers
FROM stores s
LEFT JOIN customers c ON c.store_id = s.id
GROUP BY s.id, s.name
ORDER BY total_customers DESC;
```

### Find duplicate phones (should be empty)
```sql
SELECT phone, COUNT(*) as count
FROM customers
WHERE store_id = 12
GROUP BY phone
HAVING COUNT(*) > 1;
```

---

## ⚡ PERFORMANCE TIPS

### 1. Use useMemo for filtering
```typescript
const filtered = useMemo(() => {
  // expensive filtering logic
}, [customers, search]);
```

### 2. Debounce search input
```typescript
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const [search, setSearch] = useState('');
const debouncedSearch = useDebouncedValue(search, 300);

const filtered = useMemo(() => {
  // use debouncedSearch instead of search
}, [customers, debouncedSearch]);
```

### 3. Limit displayed results
```typescript
const displayedCustomers = filtered.slice(0, 50); // show max 50
```

### 4. Load customers once per store
```typescript
useEffect(() => {
  loadCustomers();
}, [activeStoreId]); // only reload when store changes
```

---

## 🎨 UI COMPONENTS

### CustomerSubform Props
```typescript
interface Props {
  storeId: number;              // Required: current store ID
  selectedCustomer: Customer | null;  // Current selection
  onCustomerChange: (c: Customer | null) => void;  // Callback
  required?: boolean;           // Optional: default false
}
```

### Customer Type
```typescript
interface Customer {
  id: number;
  store_id: number;
  name: string;
  phone: string;
  address: string | null;
  created_at: string;
  updated_at: string;
}
```

### CustomerInput Type
```typescript
interface CustomerInput {
  store_id: number;
  name: string;
  phone: string;
  address?: string;  // optional
}
```

---

## 📝 CHECKLIST FOR NEW FEATURES

When adding customer-related features:

- [ ] Import `customersService` functions
- [ ] Load customers with `getCustomersByStore(storeId)`
- [ ] Handle loading state (`isLoading`)
- [ ] Handle errors with try-catch
- [ ] Show user-friendly error messages (toast)
- [ ] Validate input before submit
- [ ] Auto-refresh list after create/update
- [ ] Use `useMemo` for filtering/sorting
- [ ] Test with duplicate name/phone
- [ ] Test with missing required fields
- [ ] Verify data saved to database
- [ ] Check RLS is disabled
- [ ] Test across different stores

---

## 🔗 RELATED FILES

### Migrations
- `023_fix_customers_rls.sql` - Disable RLS
- `024_grant_customers_access.sql` - Grant permissions
- `025_remove_email_from_customers.sql` - Remove email field
- `026_unique_customer_per_store.sql` - Add unique constraints

### Services
- `customersService.ts` - Customer CRUD operations
- `salesService.ts` - Save transactions with customer_id

### Components
- `CustomerSubform.tsx` - Reusable customer picker
- `PaymentModal.tsx` - Uses CustomerSubform
- `DebtModal.tsx` - Uses CustomerSubform (required)

### Pages
- `Customers.tsx` - Back Office CRUD
- `Dashboard.tsx` - Display customer count
- `POS.tsx` - Main POS with payment flows

---

## 💡 TIPS & TRICKS

### Tip 1: Pre-fill customer data
```typescript
// When editing, pre-fill form with existing data
useEffect(() => {
  if (selectedCustomer) {
    setName(selectedCustomer.name);
    setPhone(selectedCustomer.phone);
    setAddress(selectedCustomer.address || '');
  }
}, [selectedCustomer]);
```

### Tip 2: Auto-select after create
```typescript
const newCustomer = await createCustomer(input);
onCustomerChange(newCustomer); // auto-select
setView('select'); // back to select view
```

### Tip 3: Search by phone number
```typescript
// If search is numeric, prioritize phone search
const filtered = customers.filter(c => {
  if (/^\d+$/.test(search)) {
    return c.phone.includes(search);
  }
  return c.name.toLowerCase().includes(search.toLowerCase());
});
```

### Tip 4: Show customer in receipt
```typescript
const customerName = sale.customer_id
  ? customers.find(c => c.id === sale.customer_id)?.name
  : undefined;

<ReceiptModal
  customerName={customerName}
  // ... other props
/>
```

---

**Quick Reference dibuat**: 2026-05-23  
**Status**: ✅ Complete  
**Last Updated**: 2026-05-23
