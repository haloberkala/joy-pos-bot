# CASCADE DELETE IMPLEMENTATION

## Problem
When deleting a store, related data was not being deleted automatically. Instead, the `store_id` was being set to NULL, leaving orphaned data in the database.

## Solution
Implemented comprehensive CASCADE DELETE for all store-related tables. When a store is deleted, ALL related data will be automatically deleted.

## Tables Affected

### Direct store_id Tables (17 tables)
These tables have a direct `store_id` foreign key to `stores(id)`:

1. ✅ **employees** - CASCADE (nullable for owner role)
2. ✅ **products** - CASCADE
3. ✅ **categories** - CASCADE
4. ✅ **brands** - CASCADE
5. ✅ **units** - CASCADE
6. ✅ **customers** - CASCADE
7. ✅ **suppliers** - CASCADE
8. ✅ **sales** - CASCADE
9. ✅ **purchases** - CASCADE
10. ✅ **shipments** - CASCADE
11. ✅ **expenses** - CASCADE
12. ✅ **stock_opnames** - CASCADE
13. ✅ **attendances** - CASCADE
14. ✅ **payrolls** - CASCADE
15. ✅ **debt_payments** - CASCADE (also has sale_id)
16. ✅ **supplier_payments** - CASCADE (fixed type mismatch: bigint → integer)

### Child Tables (CASCADE via parent)
These tables don't have `store_id` but will be deleted via CASCADE from their parent:

1. ✅ **sale_items** → CASCADE from `sales`
2. ✅ **purchase_items** → CASCADE from `purchases`
3. ✅ **stock_opname_items** → CASCADE from `stock_opnames` (via `opname_id`)
4. ✅ **user_sessions** → CASCADE from `employees`

### Global Tables (No store_id)
- **expense_categories** - Shared across all stores, no CASCADE needed

## Special Fixes

### 1. Type Mismatch Fix
**Problem**: `supplier_payments.store_id` was `bigint` but `stores.id` is `integer`
**Solution**: Changed column type from `bigint` to `integer`

### 2. Orphaned Data Cleanup
Deleted all existing records with `store_id = NULL` from:
- categories
- brands
- units
- products
- customers
- suppliers

**Note**: `employees` with NULL `store_id` are allowed (for owner role)

## Implementation

The script `fix_cascade_delete.sql` includes:

1. **Safe execution**: Uses DO blocks with column existence checks
2. **Drop and recreate**: Drops existing constraints and recreates with CASCADE
3. **Type fixes**: Corrects data type mismatches
4. **Cleanup**: Removes orphaned data
5. **Verification**: Shows all CASCADE constraints at the end

## How to Run

```bash
# In Supabase SQL Editor, run:
fix_cascade_delete.sql
```

## Verification Query

After running the script, verify CASCADE constraints:

```sql
SELECT 
  tc.table_name, 
  tc.constraint_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name LIKE '%store_id%'
  AND rc.delete_rule = 'CASCADE'
ORDER BY tc.table_name;
```

## Testing

To test CASCADE delete:

```sql
-- 1. Create a test store
INSERT INTO stores (name, address) 
VALUES ('Test Store', 'Test Address') 
RETURNING id;

-- 2. Add some test data (products, sales, etc.)
-- ...

-- 3. Delete the store
DELETE FROM stores WHERE name = 'Test Store';

-- 4. Verify all related data is deleted
SELECT COUNT(*) FROM products WHERE store_id IS NULL;
SELECT COUNT(*) FROM sales WHERE store_id IS NULL;
-- Should return 0 for all
```

## Result

✅ When a store is deleted, ALL related data is automatically deleted
✅ No more orphaned data with NULL store_id
✅ Database stays clean and efficient
✅ Multi-tenant isolation maintained
