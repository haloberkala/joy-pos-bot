# Database Invoice Generator - Implementation Guide

## 📋 Overview

Sistem generate invoice number yang production-ready menggunakan PostgreSQL SEQUENCE untuk menghindari race condition.

## 🚀 Installation

### 1. Jalankan Migration di Supabase SQL Editor

```sql
-- Copy paste seluruh isi file: create_invoice_generator.sql
-- Ke Supabase SQL Editor dan jalankan
```

### 2. Verifikasi Installation

```sql
-- Test generate invoice
SELECT generate_invoice_number(1);
-- Expected: INV-20260730-000001

SELECT generate_invoice_number(1);
-- Expected: INV-20260730-000002

SELECT generate_invoice_number(2);
-- Expected: INV-20260730-000003
```

## 🔧 How It Works

### Architecture

```
Frontend (React)
  ↓
  createSale({ store_id, items, ... })  // NO invoice_number
  ↓
Supabase RPC: create_sale_transaction()
  ↓
  v_invoice := generate_invoice_number(store_id)
  ↓
PostgreSQL SEQUENCE: nextval('invoice_number_seq')
  ↓
  Format: INV-YYYYMMDD-000001
  ↓
  INSERT INTO sales (invoice_number = v_invoice, ...)
  ↓
  RETURN sale record with invoice_number
```

### Key Features

1. **Thread-Safe**: Uses PostgreSQL SEQUENCE (atomic operation)
2. **No Race Conditions**: `nextval()` is guaranteed unique even with concurrent transactions
3. **Sequential**: Invoices increment: 000001, 000002, 000003...
4. **Date-Based Format**: INV-YYYYMMDD-XXXXXX
5. **Never NULL**: Always returns valid invoice number
6. **Rollback-Safe**: If transaction fails, sequence continues (small gaps acceptable)

## 📊 Format

```
INV-20260730-000001
 │    │       │
 │    │       └─ 6-digit sequence (padded with zeros)
 │    └───────── YYYYMMDD format
 └────────────── Prefix
```

## ✅ Production Considerations

### Sequence Never Resets
- Sequence continues indefinitely (no daily reset)
- This prevents duplicate invoices
- Example: Day 1: 000001-000050, Day 2: 000051-000100

### Gap Tolerance
- If transaction rolls back, sequence number is lost
- This is acceptable - gaps don't affect invoice validity
- Example: 000001, 000002, 000005 (000003-000004 rolled back)

### Concurrent Transactions
```sql
-- Kasir A (store 1)
BEGIN;
  SELECT generate_invoice_number(1);  -- Gets 000001
  ...
COMMIT;

-- Kasir B (store 1) - SIMULTANEOUS
BEGIN;
  SELECT generate_invoice_number(1);  -- Gets 000002 (not 000001)
  ...
COMMIT;
```

## 🧪 Testing

### Test 1: Basic Generation
```sql
SELECT generate_invoice_number(1);
-- Expected: INV-YYYYMMDD-000001
```

### Test 2: Concurrent Simulation
```sql
-- Open 2 SQL Editor tabs and run simultaneously
-- Tab 1:
SELECT generate_invoice_number(1);

-- Tab 2:
SELECT generate_invoice_number(1);

-- Both should return DIFFERENT numbers
```

### Test 3: Full Transaction
```sql
SELECT create_sale_transaction(
  '{"store_id": 1, "sub_total": 100000, "grand_total": 100000, "payment_method": "cash", "payment_status": "paid", "amount_received": 100000, "change_amount": 0}'::jsonb,
  '[{"product_id": 1, "product_name": "Test Product", "quantity": 1, "price_per_unit": 100000, "cost_per_unit": 50000, "total_price": 100000, "is_service": false}]'::jsonb
);

-- Check result has invoice_number field
```

### Test 4: Check Sequence
```sql
-- Current sequence value
SELECT currval('invoice_number_seq');

-- Next value (doesn't consume)
SELECT last_value FROM invoice_number_seq;
```

## 🔄 Maintenance

### Reset Sequence (CAUTION - Development Only)
```sql
-- Reset to 1
SELECT setval('invoice_number_seq', 1, false);

-- Reset to specific number
SELECT setval('invoice_number_seq', 1000, false);
```

### Check Last Invoice
```sql
SELECT invoice_number, created_at
FROM sales
ORDER BY created_at DESC
LIMIT 10;
```

### Monitor Sequence Growth
```sql
-- Current value
SELECT last_value FROM invoice_number_seq;

-- Total sales
SELECT COUNT(*) FROM sales;

-- Gap analysis (acceptable if some gaps exist)
```

## 🐛 Troubleshooting

### Issue: "relation invoice_number_seq does not exist"
**Solution:** Run the migration SQL again

### Issue: "permission denied for sequence"
**Solution:** Run the GRANT statement:
```sql
GRANT USAGE, SELECT ON SEQUENCE invoice_number_seq TO authenticated;
```

### Issue: Duplicate invoice numbers
**Solution:** This should NEVER happen with SEQUENCE. If it does:
1. Check if migration was run completely
2. Verify no custom INSERT bypasses the function
3. Check for manual invoice_number in INSERT statements

### Issue: Invoice format wrong
**Solution:** Check `generate_invoice_number()` function exists and format is correct

## 📈 Performance

- **SEQUENCE operations**: ~1ms (extremely fast)
- **No table locks**: Each nextval() is independent
- **No SELECT MAX()**: Avoids expensive table scans
- **Scalable**: Handles thousands of concurrent transactions

## 🔐 Security

- Function uses `SECURITY DEFINER` implicitly (PostgreSQL default)
- Only `authenticated` role can execute
- No SQL injection risk (uses proper type casting)
- Atomic - either all succeed or all rollback

## ✅ Migration Checklist

- [ ] Run SQL in Supabase SQL Editor
- [ ] Test `generate_invoice_number(1)` returns correct format
- [ ] Test `create_sale_transaction()` works without invoice_number
- [ ] Verify frontend no longer sends invoice_number
- [ ] Test concurrent checkouts (2+ kasir simultaneously)
- [ ] Check invoice sequence increments correctly
- [ ] Verify invoices appear in receipts
- [ ] Production smoke test (1 real transaction)

## 📝 Notes

- Migration is **idempotent** (safe to run multiple times)
- Uses `CREATE OR REPLACE` - can be updated without dropping
- No data loss - only adds new capability
- Backward compatible - old invoices remain unchanged
- Can coexist with existing sales data

## 🎯 Result

**Before:**
```typescript
// Frontend
const invoice = `INV-${date}-${timestamp}`;
await createSale({ invoice_number: invoice, ... });
```

**After:**
```typescript
// Frontend
await createSale({ ... });  // No invoice_number
// Database generates it automatically
```

**Database generates:** `INV-20260730-000001` ✅
