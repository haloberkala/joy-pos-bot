# 💬 Jawaban Pertanyaan Kamu

## Pertanyaan 1: "itu sklian create akun kan?"

### Jawaban: YA! ✅

Ketika kamu **Tambah Karyawan**, sistem otomatis:

1. **Buat akun Supabase Auth** (untuk login)
   - Email: `username@pos.internal`
   - Password: yang kamu input
   - Metadata: nama, role, store_id, status

2. **Buat record di database** (tabel employees)
   - ID: sama dengan auth user ID
   - Username, nama, telepon, role, status
   - Store ID

Jadi **1 kali tambah = 2 record dibuat** (auth + database)

### Alur Create Employee:

```
Owner klik "Tambah Karyawan"
    ↓
Isi form (username, password, nama, dll)
    ↓
Klik "Simpan"
    ↓
1. Buat akun di Supabase Auth ✅
2. Buat record di tabel employees ✅
    ↓
Karyawan bisa login! ✅
```

### Contoh:

**Input:**
- Username: `kasir1`
- Password: `kasir123`
- Nama: `Budi Kasir`
- Role: `Kasir`

**Yang Terjadi:**
1. Buat akun auth dengan email `kasir1@pos.internal`
2. Buat record di database dengan username `kasir1`
3. Kasir bisa login dengan username `kasir1` dan password `kasir123`

---

## Pertanyaan 2: "dan buat hanya owner yhng bisa crud akun"

### Jawaban: SUDAH DIPERBAIKI! ✅

Sekarang **HANYA OWNER** yang bisa CRUD karyawan.

### Perubahan yang Dilakukan:

**Sebelum:**
```typescript
const canManage = user?.role === 'owner' || user?.role === 'admin';
// ❌ Admin juga bisa CRUD
```

**Sesudah:**
```typescript
const canManage = user?.role === 'owner';
// ✅ Hanya Owner yang bisa CRUD
```

### Apa yang Terjadi untuk Setiap Role:

#### 1. Owner (Pemilik Toko)
- ✅ Bisa tambah karyawan
- ✅ Bisa edit karyawan
- ✅ Bisa hapus karyawan
- ✅ Bisa lihat semua karyawan
- ✅ Bisa nonaktifkan akun

#### 2. Admin
- ❌ Tidak bisa tambah karyawan
- ❌ Tidak bisa edit karyawan
- ❌ Tidak bisa hapus karyawan
- ✅ Bisa lihat data karyawan (read-only)
- ❌ Tidak bisa nonaktifkan akun

#### 3. Kasir
- ❌ Tidak bisa akses halaman Manajemen Karyawan
- ❌ Menu "SDM" tidak muncul di sidebar

### UI Changes:

**Login sebagai Owner:**
```
┌─────────────────────────────────────────┐
│ Manajemen Karyawan                      │
│                                         │
│ [+ Tambah Karyawan]  ← Tombol muncul   │
│                                         │
│ Tabel Karyawan:                         │
│ - Username | Nama | Role | [Edit] [X]  │
│   ↑ Tombol Edit & Hapus muncul          │
└─────────────────────────────────────────┘
```

**Login sebagai Admin:**
```
┌─────────────────────────────────────────┐
│ Manajemen Karyawan                      │
│                                         │
│ (Tidak ada tombol Tambah)               │
│                                         │
│ Tabel Karyawan:                         │
│ - Username | Nama | Role                │
│   ↑ Tidak ada tombol Edit & Hapus       │
└─────────────────────────────────────────┘
```

**Login sebagai Kasir:**
```
┌─────────────────────────────────────────┐
│ Sidebar:                                │
│ - Dashboard                             │
│ - POS                                   │
│ - Transaksi                             │
│                                         │
│ (Menu SDM tidak muncul)                 │
└─────────────────────────────────────────┘
```

---

## Summary

### ✅ Yang Sudah Beres:

1. **Create Employee = Create Account** ✅
   - 1 kali tambah = buat auth + database
   - Karyawan langsung bisa login

2. **Only Owner Can CRUD** ✅
   - Admin tidak bisa CRUD
   - Kasir tidak bisa akses menu

3. **Email Format Fixed** ✅
   - Dari `username@internal.pos` (error)
   - Ke `username@pos.internal` (valid)

### ⏳ Yang Masih Pending:

1. **Update Password** ⏳
   - Butuh deploy Edge Function
   - Jalankan: `./deploy-edge-function.sh`

---

## Test Sekarang!

### Test 1: Create Employee (Owner)

1. Login sebagai Owner
2. Buka "Manajemen Karyawan"
3. Klik "Tambah Karyawan"
4. Isi form:
   ```
   Username: kasir2
   Password: kasir123
   Nama: Kasir Dua
   Role: Kasir
   ```
5. Klik "Simpan"
6. ✅ Berhasil!

### Test 2: Login with New Account

1. Logout
2. Login:
   ```
   Username: kasir2
   Password: kasir123
   ```
3. ✅ Berhasil login!

### Test 3: Admin Cannot CRUD

1. Login sebagai Admin
2. Buka "Manajemen Karyawan"
3. ❌ Tidak ada tombol "Tambah Karyawan"
4. ❌ Tidak ada tombol "Edit" dan "Hapus"
5. ✅ Benar! Admin hanya bisa lihat

---

## Kesimpulan

**Pertanyaan 1:** Iya, create employee = create account sekaligus ✅

**Pertanyaan 2:** Sudah diperbaiki, hanya Owner yang bisa CRUD ✅

**Bonus:** Email format juga sudah diperbaiki ✅

**Next:** Deploy Edge Function untuk update password 🚀

---

**Mau test sekarang atau deploy Edge Function dulu?** 😊
