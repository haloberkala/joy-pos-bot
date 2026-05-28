# Setup Supabase - Simple Guide

## Yang Perlu Dilakukan:

### 1. Install package
```bash
npm install
```

### 2. Buat project Supabase
- Buka https://supabase.com
- Klik "New Project"
- Tunggu 2 menit sampai selesai

### 3. Jalankan Migration & Seeder
Di **SQL Editor** Supabase, jalankan file-file ini **berurutan**:

#### a. Migration (buat tabel)
- Copy semua isi `supabase/migrations/001_create_tables.sql`
- Paste di SQL Editor
- Klik **Run**

#### b. Seeder (insert demo users)
- Copy semua isi `supabase/migrations/002_seed_users.sql`
- Paste di SQL Editor
- Klik **Run**

### 4. Isi file .env
- Buka **Settings** → **API** di Supabase
- Copy **Project URL** dan **anon public key** (yang panjang, dimulai `eyJ...`)
- Paste ke file `.env`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Jalankan
```bash
npm run dev
```

### 6. Login dengan demo users

**Owner** (akses semua toko):
- Email: `owner@demo.com`
- Password: `owner123`

**Admin Toko 1** (Bangunan):
- Email: `admin1@demo.com`
- Password: `admin123`

**Admin Toko 2** (Makanan):
- Email: `admin2@demo.com`
- Password: `admin123`

**Kasir Toko 1** (Bangunan):
- Email: `kasir1@demo.com`
- Password: `kasir123`

**Kasir Toko 2** (Makanan):
- Email: `kasir2@demo.com`
- Password: `kasir123`

---

## Troubleshooting

**Error: "Missing Supabase environment variables"**
→ Restart dev server setelah edit `.env`

**Error: "Invalid login credentials"**
→ Pastikan seeder sudah dijalankan

**Error: "User profile not found"**
→ Jalankan ulang seeder (002_seed_users.sql)

---

## Database Structure

### Tables
- **stores**: 3 toko demo (Bangunan, Makanan, Elektronik)
- **users**: User profiles dengan role dan store access

### Roles
- **owner**: Akses semua toko
- **admin**: Akses 1 toko tertentu
- **cashier**: Akses 1 toko tertentu

### Security
- Row Level Security (RLS) aktif
- Owner bisa akses semua data
- Admin/Cashier hanya bisa akses data toko mereka
