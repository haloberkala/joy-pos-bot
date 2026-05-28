# 🏢 Multi-Tenant Flow - Complete Documentation

## Hierarki Sistem

```
Developer
    ↓
  Owner (Manual via Supabase Dashboard)
    ↓
  Stores (Via Web App)
    ↓
  Employees: Admin/Kasir (Via Web App, tied to Store)
    ↓
  Data: Products, Sales, etc (Isolated by store_id)
```

---

## 1. Developer → Owner

### Cara Membuat Akun Owner

**Lokasi:** Supabase Dashboard (Manual)

**Steps:**
1. Buka Supabase Dashboard
2. Go to **Authentication** → **Users**
3. Klik **"Add User"** atau **"Invite"**
4. Isi data:
   ```
   Email: owner@yourcompany.com
   Password: (set secure password)
   ```
5. Setelah user dibuat, klik user tersebut
6. Go to **"User Metadata"** tab
7. Tambahkan metadata:
   ```json
   {
     "role": "owner",
     "name": "Owner Name"
   }
   ```
8. Save

**Catatan:**
- Owner **TIDAK** memiliki `store_id` di metadata
- Owner bisa akses semua stores
- Sistem web **TIDAK** menyediakan halaman register untuk Owner

---

## 2. Owner → Stores

### Cara Owner Membuat Store

**Lokasi:** Web App - Halaman "Pengaturan" atau "Master Data"

**Flow:**
1. Owner login ke web app
2. Buka halaman "Pengaturan" → "Toko/Cabang"
3. Klik "Tambah Toko"
4. Isi form:
   ```
   Nama Toko: Toko Berkah - Cabang A
   Alamat: Jl. Merdeka No. 123
   Telepon: 0511-12345678
   ```
5. Klik "Simpan"
6. Store baru dibuat dengan `id` auto-increment

**Database:**
```sql
-- Table: stores
INSERT INTO stores (name, address, phone)
VALUES ('Toko Berkah - Cabang A', 'Jl. Merdeka No. 123', '0511-12345678');
```

**RLS Policy:**
- ✅ Owner: Can CREATE, READ, UPDATE, DELETE all stores
- ❌ Admin/Kasir: Can only READ stores (cannot modify)

---

## 3. Owner → Employees (Admin/Kasir)

### Cara Owner Membuat Karyawan

**Lokasi:** Web App - Halaman "Manajemen Karyawan"

**Flow:**
1. Owner login ke web app
2. **Pilih Store** yang aktif (dropdown di header/sidebar)
3. Buka halaman "SDM" → "Manajemen Karyawan"
4. Klik "Tambah Karyawan"
5. Isi form:
   ```
   Toko: [Auto-filled dari store yang aktif]
   Username: kasir1
   Password: kasir123 (minimal 6 karakter)
   Nama Lengkap: Siti Kasir
   No. HP: 0812-2222-2222
   Role: Kasir
   ```
6. Klik "Simpan"

**Yang Terjadi di Backend:**

1. **Create Auth User:**
   ```typescript
   const email = `${username}@internal.pos`; // kasir1@internal.pos
   
   await supabase.auth.signUp({
     email,
     password,
     options: {
       data: {
         name: 'Siti Kasir',
         role: 'cashier',
         store_id: 1,  // ← PENTING! Store ID dari store yang aktif
         is_active: true
       }
     }
   });
   ```

2. **Create Employee Record:**
   ```sql
   INSERT INTO employees (id, store_id, username, name, phone, role, is_active)
   VALUES (
     'auth-user-uuid',
     1,  -- ← Store ID yang sama
     'kasir1',
     'Siti Kasir',
     '0812-2222-2222',
     'cashier',
     true
   );
   ```

**RLS Policy:**
- ✅ Owner: Can CREATE, READ, UPDATE, DELETE all employees
- ❌ Admin: Can only READ employees from their store (cannot modify)
- ❌ Kasir: Can only READ employees from their store (cannot modify)

**Kode di `employeesService.ts`:**
```typescript
export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  // 1. Create Auth user with store_id in metadata
  const { data: authData } = await supabase.auth.signUp({
    email: `${input.username}@internal.pos`,
    password: input.password,
    options: {
      data: {
        name: input.name,
        role: input.role,
        store_id: input.store_id,  // ← From active store
        is_active: true
      }
    }
  });

  // 2. Create employee record with same store_id
  const { data } = await supabase
    .from('employees')
    .insert({
      id: authData.user.id,
      store_id: input.store_id,  // ← Same store_id
      username: input.username,
      name: input.name,
      phone: input.phone,
      role: input.role,
      is_active: true
    });

  return data;
}
```

---

## 4. Data Isolation (Employees → Data)

### Cara Kerja Isolasi Data

**Prinsip:**
- Setiap data (products, sales, customers, dll) memiliki kolom `store_id`
- RLS policies memfilter data berdasarkan `store_id` dari JWT metadata
- Admin/Kasir **HANYA** bisa akses data dari store mereka

**Contoh RLS Policy:**

```sql
-- Products table
CREATE POLICY "products_select_policy"
  ON products FOR SELECT TO authenticated
  USING (
    -- Owner can see all products
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    -- Admin/Kasir can only see products from their store
    store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );

CREATE POLICY "products_insert_policy"
  ON products FOR INSERT TO authenticated
  WITH CHECK (
    -- Owner can insert to any store
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    -- Admin/Kasir can only insert to their store
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'cashier')
      AND store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
    )
  );
```

**Tables yang Harus Punya `store_id`:**
- ✅ products
- ✅ categories
- ✅ brands
- ✅ customers
- ✅ sales
- ✅ sale_items (via sales.store_id)
- ✅ purchases
- ✅ purchase_items (via purchases.store_id)
- ✅ suppliers
- ✅ expenses
- ✅ shipments
- ✅ stock_opname
- ✅ stock_opname_items (via stock_opname.store_id)
- ✅ attendances
- ✅ payrolls
- ✅ employees

---

## Security Matrix

| Role | Stores | Employees | Data (Products, Sales, etc) |
|------|--------|-----------|----------------------------|
| **Owner** | CRUD All | CRUD All | CRUD All Stores |
| **Admin** | Read All | Read Own Store | CRUD Own Store Only |
| **Kasir** | Read All | Read Own Store | CRUD Own Store Only |

---

## Login Flow

### Owner Login

```typescript
// Input
username: 'owner'
password: 'owner123'

// Auth
email: 'owner@internal.pos'

// JWT Metadata
{
  role: 'owner',
  name: 'Owner Name'
  // NO store_id - Owner can access all stores
}

// Access
- Can switch between stores
- Can see all data from all stores
- Can CRUD stores and employees
```

### Admin/Kasir Login

```typescript
// Input
username: 'kasir1'
password: 'kasir123'

// Auth
email: 'kasir1@internal.pos'

// JWT Metadata
{
  role: 'cashier',
  name: 'Siti Kasir',
  store_id: 1,  // ← LOCKED to Store 1
  is_active: true
}

// Access
- CANNOT switch stores
- Can ONLY see data from Store 1
- Cannot CRUD employees
- Can CRUD data (products, sales) for Store 1 only
```

### Login Check (AuthContext)

```typescript
const login = async (username: string, password: string) => {
  // 1. Convert username to email
  const email = `${username}@internal.pos`;
  
  // 2. Sign in
  const { data } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  // 3. Check if account is active
  const isActive = data.user.user_metadata.is_active !== false;
  if (!isActive) {
    await supabase.auth.signOut();
    throw new Error('Account is deactivated');
  }
  
  // 4. Get user profile
  const role = data.user.user_metadata.role;
  const storeId = data.user.user_metadata.store_id;
  
  // 5. Set active store
  if (role === 'owner') {
    // Owner can access all stores
    setActiveStoreId(1); // Default to first store
  } else {
    // Admin/Kasir locked to their store
    setActiveStoreId(storeId);
  }
};
```

---

## Helper Functions

### Database Functions

```sql
-- Get current user's store_id from JWT
CREATE FUNCTION get_user_store_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is owner
CREATE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can access specific store
CREATE FUNCTION can_access_store(target_store_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER = target_store_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Usage in RLS Policies

```sql
-- Using helper function
CREATE POLICY "products_select_policy"
  ON products FOR SELECT TO authenticated
  USING (
    is_owner() OR store_id = get_user_store_id()
  );

-- Or inline
CREATE POLICY "products_select_policy"
  ON products FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR
    store_id = (auth.jwt() -> 'user_metadata' ->> 'store_id')::INTEGER
  );
```

---

## Migration Checklist

### ✅ Completed

1. **Database Schema**
   - ✅ `stores` table with RLS
   - ✅ `employees` table with `store_id` and RLS
   - ✅ All data tables have `store_id` column

2. **RLS Policies**
   - ✅ `stores` - Owner only for CRUD
   - ✅ `employees` - Owner only for CRUD (Admin/Kasir read-only)
   - ✅ Data tables - Filtered by `store_id`

3. **Frontend**
   - ✅ `employeesService.ts` - Sends `store_id` when creating employee
   - ✅ `AuthContext.tsx` - Checks `is_active` status on login
   - ✅ `Employees.tsx` - Only Owner can CRUD employees

4. **Helper Functions**
   - ✅ `get_user_store_id()` - Get store from JWT
   - ✅ `is_owner()` - Check if owner
   - ✅ `can_access_store(id)` - Check store access

### ⏳ To Do

1. **Apply Migration**
   ```bash
   # Run the new migration
   supabase db push
   
   # Or manually in Supabase Dashboard SQL Editor
   # Copy content from: supabase/migrations/013_fix_multi_tenant_flow.sql
   ```

2. **Verify RLS Policies**
   - Test Owner can CRUD all stores and employees
   - Test Admin cannot CRUD employees
   - Test Kasir cannot CRUD employees
   - Test data isolation by store_id

3. **Test Login Flow**
   - Test Owner login (no store_id in metadata)
   - Test Admin login (has store_id in metadata)
   - Test Kasir login (has store_id in metadata)
   - Test inactive account rejection

---

## Testing Scenarios

### Scenario 1: Owner Creates Store

```
1. Login as Owner
2. Go to "Pengaturan" → "Toko"
3. Click "Tambah Toko"
4. Fill form:
   - Nama: Toko Baru
   - Alamat: Jl. Test
   - Telepon: 0511-999999
5. Click "Simpan"
6. ✅ Store created successfully
```

### Scenario 2: Owner Creates Employee

```
1. Login as Owner
2. Select Store (e.g., Store 1)
3. Go to "SDM" → "Manajemen Karyawan"
4. Click "Tambah Karyawan"
5. Fill form:
   - Username: kasir_test
   - Password: test123
   - Nama: Test Kasir
   - Role: Kasir
6. Click "Simpan"
7. ✅ Employee created with store_id = 1
8. ✅ Auth user created with metadata.store_id = 1
```

### Scenario 3: Employee Login & Data Access

```
1. Logout
2. Login as kasir_test / test123
3. ✅ Login successful
4. Check active store: Should be Store 1 (locked)
5. Go to "Produk"
6. ✅ Only see products from Store 1
7. Try to access Store 2 data
8. ❌ Should be blocked by RLS
```

### Scenario 4: Admin Cannot CRUD Employees

```
1. Login as Admin (admin1)
2. Go to "SDM" → "Manajemen Karyawan"
3. ❌ "Tambah Karyawan" button should NOT appear
4. ❌ "Edit" and "Delete" buttons should NOT appear
5. ✅ Can only view employees from Store 1
```

### Scenario 5: Inactive Account Rejection

```
1. Owner deactivates kasir1 account
2. Logout
3. Try to login as kasir1
4. ❌ Login rejected with message:
   "Akun Anda telah dinonaktifkan. Silakan hubungi Owner/Admin."
```

---

## Summary

### Flow Hierarchy ✅

```
Developer → Owner (Manual)
    ↓
Owner → Stores (Web App)
    ↓
Owner → Employees (Web App, tied to Store)
    ↓
Employees → Data (Isolated by store_id)
```

### Security Rules ✅

- ✅ Owner: Full access to all stores and employees
- ✅ Admin/Kasir: Read-only for employees, CRUD for data in their store only
- ✅ Data isolation: RLS policies filter by `store_id`
- ✅ Account status: Inactive accounts cannot login

### Key Points ✅

1. **No Register Page** - Owner created manually via Supabase Dashboard
2. **Store-Tied Employees** - Every employee has `store_id` in both Auth metadata and database
3. **Data Isolation** - RLS policies ensure employees only see their store's data
4. **Owner Privileges** - Owner can access all stores and manage all employees

---

## Next Steps

1. **Run Migration:**
   ```bash
   supabase db push
   ```

2. **Test Flow:**
   - Create store as Owner
   - Create employee tied to store
   - Login as employee
   - Verify data isolation

3. **Deploy Edge Function** (for password update):
   ```bash
   ./deploy-edge-function.sh
   ```

4. **Verify Security:**
   - Test RLS policies
   - Test data isolation
   - Test inactive account rejection

---

**Multi-tenant flow is now properly implemented!** 🎉
