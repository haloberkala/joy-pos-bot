# Setup Database

## 1. Run Migration

Buka **Supabase Dashboard** → **SQL Editor** → Paste & Run:

```sql
-- File: supabase/migrations/001_init_database.sql
```

Ini akan create:
- Tabel `stores` (3 demo stores)
- Tabel `employees` (6 demo employees)
- RLS policies

## 2. Create Auth Users

**Authentication** → **Users** → **Add User** (satu per satu):

| Email | Password | Auto Confirm |
|-------|----------|--------------|
| owner@internal.pos | owner123 | ✅ |
| admin1@internal.pos | admin123 | ✅ |
| kasir1@internal.pos | kasir123 | ✅ |
| admin2@internal.pos | admin123 | ✅ |
| kasir2@internal.pos | kasir123 | ✅ |
| admin3@internal.pos | admin123 | ✅ |
| kasir3@internal.pos | kasir123 | ✅ |

**PENTING**: Centang **"Auto Confirm User"**!

## 3. Update Metadata

**SQL Editor** → Paste & Run:

```sql
UPDATE auth.users SET raw_user_meta_data = jsonb_build_object('name', 'Owner', 'role', 'owner'), email_confirmed_at = NOW() WHERE email = 'owner@internal.pos';
UPDATE auth.users SET raw_user_meta_data = jsonb_build_object('name', 'Budi Admin', 'role', 'admin', 'store_id', '1'), email_confirmed_at = NOW() WHERE email = 'admin1@internal.pos';
UPDATE auth.users SET raw_user_meta_data = jsonb_build_object('name', 'Siti Kasir', 'role', 'cashier', 'store_id', '1'), email_confirmed_at = NOW() WHERE email = 'kasir1@internal.pos';
UPDATE auth.users SET raw_user_meta_data = jsonb_build_object('name', 'Andi Admin', 'role', 'admin', 'store_id', '2'), email_confirmed_at = NOW() WHERE email = 'admin2@internal.pos';
UPDATE auth.users SET raw_user_meta_data = jsonb_build_object('name', 'Dewi Kasir', 'role', 'cashier', 'store_id', '2'), email_confirmed_at = NOW() WHERE email = 'kasir2@internal.pos';
UPDATE auth.users SET raw_user_meta_data = jsonb_build_object('name', 'Rudi Admin', 'role', 'admin', 'store_id', '3'), email_confirmed_at = NOW() WHERE email = 'admin3@internal.pos';
UPDATE auth.users SET raw_user_meta_data = jsonb_build_object('name', 'Maya Kasir', 'role', 'cashier', 'store_id', '3'), email_confirmed_at = NOW() WHERE email = 'kasir3@internal.pos';
```

## 4. Test Login

| Username | Password | Role |
|----------|----------|------|
| owner | owner123 | Owner |
| admin1 | admin123 | Admin Toko 1 |
| kasir1 | kasir123 | Kasir Toko 1 |

---

## Tambah Karyawan Baru

### Via UI:
1. Login sebagai owner/admin
2. Back Office → Karyawan → Tambah Karyawan
3. Isi username, nama, role
4. Klik "Tambah"

### Create Auth User:
1. Dashboard → Authentication → Add User
2. Email: `{username}@internal.pos`
3. Password: (set password)
4. ✅ Auto Confirm
5. Update metadata:
```sql
UPDATE auth.users 
SET raw_user_meta_data = jsonb_build_object('name', 'Nama', 'role', 'cashier', 'store_id', '1'),
    email_confirmed_at = NOW()
WHERE email = '{username}@internal.pos';
```

---

**Setup Time**: 10 menit
