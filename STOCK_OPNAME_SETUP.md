# Stock Opname Feature - Setup Guide

## ✅ COMPLETED

### 1. Database Migration
**File**: `supabase/migrations/005_stock_opname.sql`

**Tables Created**:
- `stock_opnames` - Main stock opname records
- `stock_opname_items` - Line items (system vs physical stock)

**Features**:
- RLS policies for Owner/Admin access
- Cascade delete when store is deleted
- Auto-update timestamps

### 2. Service Layer
**File**: `src/services/stockOpnameService.ts`

**Functions**:
- `createStockOpname()` - Create opname with items, auto-update product quantities
- `getStockOpnamesByStore()` - List opnames by store
- `getStockOpnameWithItems()` - Get opname details with items

### 3. UI Components
**Files**:
- `src/pages/backoffice/Products.tsx` - Stock Opname tab with list
- `src/components/backoffice/StockOpnameDetail.tsx` - Create/complete opname

**Features**:
- Load all products from store
- Enter physical stock counts
- Barcode scanner support
- Calculate differences (system vs physical)
- Add notes per product
- Progress tracking
- Auto-generate opname number: `SO-YYYYMMDD-XXX`
- Save to Supabase
- Auto-update product quantities

---

## 🚀 HOW TO USE

### Step 1: Run Migration (If Not Done Yet)

Go to your Supabase Dashboard:
1. Open SQL Editor
2. Copy content from `supabase/migrations/005_stock_opname.sql`
3. Run the SQL
4. Verify tables created: `stock_opnames`, `stock_opname_items`

### Step 2: Access Stock Opname

1. Login to backoffice
2. Go to **Products & Stok** page
3. Click **Stock Opname** tab
4. Click **Mulai Stock Opname** button

### Step 3: Perform Stock Opname

1. **View Products**: All products from your store are loaded
2. **Enter Physical Stock**: 
   - Type actual stock count in "Stok Aktual" column
   - Or use barcode scanner to find products quickly
3. **Add Notes**: Optional notes for each product
4. **Track Progress**: Progress bar shows completion percentage
5. **Review Differences**: Products with differences are highlighted
6. **Complete**: Click "Selesaikan Opname" when done

### Step 4: What Happens After Completion

1. ✅ Stock opname record saved to database
2. ✅ All items with differences saved
3. ✅ Product quantities automatically updated to physical stock
4. ✅ Opname number generated: `SO-20260511-123`
5. ✅ Creator recorded (your username)
6. ✅ Timestamp saved

---

## 📊 STOCK OPNAME WORKFLOW

```
┌─────────────────────────────────────────────────────────────┐
│ 1. START STOCK OPNAME                                       │
│    - Load all products from store                           │
│    - Show system stock for each product                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. COUNT PHYSICAL STOCK                                     │
│    - Enter actual stock count                               │
│    - Use barcode scanner for quick lookup                   │
│    - Add notes if needed                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. REVIEW DIFFERENCES                                       │
│    - System shows: Physical - System = Difference           │
│    - Positive difference = Stock surplus                    │
│    - Negative difference = Stock shortage                   │
│    - Zero difference = Stock matches                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. COMPLETE OPNAME                                          │
│    - Generate opname number: SO-YYYYMMDD-XXX               │
│    - Save to stock_opnames table                            │
│    - Save items to stock_opname_items table                 │
│    - Update product quantities to physical stock            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 EXAMPLE

**Before Stock Opname**:
- Product: Mie Instan
- System Stock: 50 pcs
- Physical Stock: (not counted yet)

**During Stock Opname**:
- Count physical stock: 48 pcs
- Difference: 48 - 50 = -2 (shortage)
- Note: "2 pcs rusak/expired"

**After Stock Opname**:
- Product quantity updated: 50 → 48 pcs
- Stock opname record saved
- Difference recorded: -2 pcs

---

## 📋 DATABASE SCHEMA

### stock_opnames
```sql
id              BIGSERIAL PRIMARY KEY
store_id        INTEGER (FK to stores)
opname_number   TEXT UNIQUE (e.g., "SO-20260511-001")
opname_date     TIMESTAMPTZ
note            TEXT
status          TEXT ('draft' or 'completed')
created_by      TEXT (username)
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### stock_opname_items
```sql
id              BIGSERIAL PRIMARY KEY
opname_id       BIGINT (FK to stock_opnames)
product_id      INTEGER (FK to products)
system_stock    INTEGER (stock before opname)
physical_stock  INTEGER (actual counted stock)
difference      INTEGER (physical - system)
note            TEXT
created_at      TIMESTAMPTZ
```

---

## 🎯 FEATURES

✅ Load all products from store
✅ Barcode scanner support
✅ Real-time difference calculation
✅ Progress tracking
✅ Add notes per product
✅ Auto-generate opname number
✅ Save to Supabase
✅ Auto-update product quantities
✅ View opname history
✅ Filter by store (RLS)
✅ Owner sees all stores
✅ Admin/Cashier see their store only

---

## 🔐 PERMISSIONS

- **Owner**: Can create and view all stock opnames
- **Admin**: Can create and view stock opnames for their store
- **Cashier**: Can view stock opnames (read-only)

---

## 📝 NOTES

- Stock opname is **irreversible** - once completed, product quantities are updated
- All products must have physical stock entered before completion
- Differences are automatically calculated
- Stock opname history is preserved for audit purposes
- Use notes to explain significant differences

---

## 🐛 TROUBLESHOOTING

**Problem**: "Gagal memuat produk"
- **Solution**: Check if products exist in the store, verify Supabase connection

**Problem**: "Gagal menyelesaikan stock opname"
- **Solution**: Check if migration 005 is run, verify RLS policies

**Problem**: Products not loading
- **Solution**: Verify `activeStoreId` is set, check browser console for errors

---

**Status**: ✅ Fully Integrated and Ready to Use
**Last Updated**: May 11, 2026
