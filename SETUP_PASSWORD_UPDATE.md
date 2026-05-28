# 🔧 Setup Update Password Feature

## Problem

Error saat update password karyawan:
```
AuthApiError: User not allowed
Error: Failed to update password
```

**Root Cause:**
- Frontend menggunakan **anon key** (public key)
- Update password memerlukan **service role key** (admin key)
- `supabase.auth.admin.updateUserById()` tidak bisa dipanggil dari frontend

---

## Solution: Supabase Edge Function

Kita perlu membuat **Supabase Edge Function** yang berjalan di server-side dengan service role key.

---

## Setup Steps

### 1. Install Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Or using Homebrew (macOS)
brew install supabase/tap/supabase

# Or using Scoop (Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link Project

```bash
# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Get project ref from Supabase Dashboard URL:
# https://supabase.com/dashboard/project/YOUR_PROJECT_REF
```

### 4. Deploy Edge Function

```bash
# Deploy the update-employee-password function
supabase functions deploy update-employee-password

# The function is already created at:
# supabase/functions/update-employee-password/index.ts
```

### 5. Set Environment Variables (Optional)

Edge Function automatically has access to:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

No additional setup needed!

### 6. Test the Function

```bash
# Test locally
supabase functions serve update-employee-password

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/update-employee-password' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"userId":"user-id-here","password":"newpassword123"}'
```

---

## How It Works

### Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Frontend      │ ──────> │  Edge Function   │ ──────> │  Supabase   │
│  (Anon Key)     │  HTTPS  │ (Service Role)   │   API   │    Auth     │
└─────────────────┘         └──────────────────┘         └─────────────┘
```

### Flow

1. **Frontend** calls Edge Function with `userId` and `password`
2. **Edge Function** validates input
3. **Edge Function** uses service role key to update password
4. **Supabase Auth** updates user password
5. **Edge Function** returns success/error to frontend

### Code Flow

**Frontend (employeesService.ts):**
```typescript
if (input.password) {
  const { error } = await supabase.functions.invoke('update-employee-password', {
    body: { userId: id, password: input.password }
  });
  
  if (error) {
    throw new Error('Gagal update password');
  }
}
```

**Edge Function (index.ts):**
```typescript
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY  // ← Admin key!
);

const { error } = await supabaseAdmin.auth.admin.updateUserById(
  userId,
  { password: password }
);
```

---

## Verification

### Test Update Password

1. Login sebagai Owner/Admin
2. Buka "Manajemen Karyawan"
3. Klik "Edit" pada karyawan
4. Isi password baru (minimal 6 karakter)
5. Klik "Simpan"
6. Seharusnya berhasil tanpa error

### Check Logs

```bash
# View Edge Function logs
supabase functions logs update-employee-password

# Or in Supabase Dashboard:
# Project > Edge Functions > update-employee-password > Logs
```

---

## Alternative Solutions

### Option 1: Edge Function (Recommended) ✅

**Pros:**
- ✅ Secure (service role key di server)
- ✅ Scalable
- ✅ Easy to maintain

**Cons:**
- ❌ Perlu deploy Edge Function
- ❌ Perlu Supabase CLI

### Option 2: Backend API

Create your own backend API (Node.js, Python, etc.) dengan service role key.

**Pros:**
- ✅ Full control
- ✅ Bisa tambah logic custom

**Cons:**
- ❌ Perlu maintain backend server
- ❌ Lebih kompleks

### Option 3: Password Reset Email

User reset password via email link.

**Pros:**
- ✅ Tidak perlu Edge Function
- ✅ Lebih secure (user verify email)

**Cons:**
- ❌ User harus akses email
- ❌ Tidak bisa set password langsung

### Option 4: Service Role Key di Frontend (NOT RECOMMENDED) ❌

**NEVER DO THIS!**
- ❌ Security risk
- ❌ Anyone can access admin API
- ❌ Database bisa dihapus

---

## Troubleshooting

### Error: "Function not found"

```bash
# Check deployed functions
supabase functions list

# Redeploy
supabase functions deploy update-employee-password
```

### Error: "Service role key not found"

Edge Functions automatically have access to service role key. No setup needed.

### Error: "CORS error"

Edge Function sudah include CORS headers. Pastikan:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

### Error: "Password too short"

Edge Function validates password minimal 6 karakter:
```typescript
if (password.length < 6) {
  return error('Password must be at least 6 characters')
}
```

---

## Security Considerations

### ✅ Secure

- Service role key hanya di server (Edge Function)
- Frontend hanya kirim userId dan password
- HTTPS encryption
- Input validation

### ✅ Best Practices

- Validate password length (min 6 chars)
- Validate userId exists
- Log errors for debugging
- Return generic error messages to frontend

### ❌ Don't

- Don't expose service role key di frontend
- Don't skip input validation
- Don't return detailed error messages (security risk)

---

## Cost

### Supabase Edge Functions Pricing

**Free Tier:**
- 500,000 invocations/month
- 2GB bandwidth/month

**Pro Tier ($25/month):**
- 2,000,000 invocations/month
- 10GB bandwidth/month

**Update password** = 1 invocation per update

For typical usage (update password beberapa kali per hari), **Free tier cukup**.

---

## Files Created

1. ✅ `supabase/functions/update-employee-password/index.ts`
   - Edge Function untuk update password
   - Menggunakan service role key
   - Validasi input
   - CORS support

2. ✅ `src/services/employeesService.ts` (updated)
   - Call Edge Function untuk update password
   - Error handling
   - User-friendly error messages

---

## Next Steps

1. ✅ Install Supabase CLI
2. ✅ Login to Supabase
3. ✅ Link project
4. ✅ Deploy Edge Function
5. ✅ Test update password
6. ✅ Verify logs

---

## Summary

**Problem:** Frontend tidak bisa update password (anon key limitation)

**Solution:** Supabase Edge Function dengan service role key

**Status:** Edge Function sudah dibuat, tinggal deploy

**Command:**
```bash
supabase functions deploy update-employee-password
```

**Result:** Update password karyawan akan berfungsi dengan baik! ✅
