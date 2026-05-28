# 🚀 Deploy Edge Function - Step by Step

## Current Status

✅ Edge Function code created: `supabase/functions/update-employee-password/index.ts`
✅ Service updated: `src/services/employeesService.ts`
❌ Edge Function not deployed yet

## Quick Deploy (5 Minutes)

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

**Verify installation:**
```bash
supabase --version
```

### Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser for authentication.

### Step 3: Get Your Project Reference

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Open your project
3. Look at the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
4. Copy the `YOUR_PROJECT_REF` part

**Example:**
- URL: `https://supabase.com/dashboard/project/abcdefghijklmnop`
- Project Ref: `abcdefghijklmnop`

### Step 4: Link Your Project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Replace `YOUR_PROJECT_REF` with your actual project reference.

**Example:**
```bash
supabase link --project-ref abcdefghijklmnop
```

### Step 5: Deploy the Edge Function

```bash
supabase functions deploy update-employee-password
```

**Expected output:**
```
Deploying function update-employee-password...
Function deployed successfully!
Function URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-employee-password
```

### Step 6: Test the Feature

1. Open your application
2. Login as Owner or Admin
3. Go to "Manajemen Karyawan"
4. Click "Edit" on any employee
5. Enter a new password (minimum 6 characters)
6. Click "Simpan"
7. ✅ Should succeed without errors!

## Troubleshooting

### Error: "npm: command not found"

Install Node.js first:
```bash
# Download from: https://nodejs.org/
# Or use nvm (recommended):
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts
```

### Error: "supabase: command not found" (after npm install)

Try:
```bash
# Option 1: Use npx
npx supabase login

# Option 2: Add to PATH
export PATH="$PATH:$(npm config get prefix)/bin"

# Option 3: Restart terminal
```

### Error: "Project not found"

Make sure you're using the correct project reference:
```bash
# List your projects
supabase projects list

# Link with correct ref
supabase link --project-ref YOUR_CORRECT_REF
```

### Error: "Function deployment failed"

Check the function code:
```bash
# Test locally first
supabase functions serve update-employee-password

# Then deploy
supabase functions deploy update-employee-password
```

### Error: "CORS error" in browser

The Edge Function already includes CORS headers. If you still get CORS errors:
1. Check browser console for exact error
2. Verify the function is deployed: `supabase functions list`
3. Redeploy: `supabase functions deploy update-employee-password`

## Verify Deployment

### Check Deployed Functions

```bash
supabase functions list
```

**Expected output:**
```
┌──────────────────────────────┬─────────┬─────────────────────┐
│ NAME                         │ STATUS  │ UPDATED             │
├──────────────────────────────┼─────────┼─────────────────────┤
│ update-employee-password     │ ACTIVE  │ 2024-01-15 10:30:00 │
└──────────────────────────────┴─────────┴─────────────────────┘
```

### View Function Logs

```bash
supabase functions logs update-employee-password
```

Or in Supabase Dashboard:
1. Go to Edge Functions
2. Click "update-employee-password"
3. View Logs tab

## Alternative: Deploy via Supabase Dashboard

If CLI doesn't work, you can deploy via Dashboard:

1. Go to Supabase Dashboard
2. Click "Edge Functions" in sidebar
3. Click "Create Function"
4. Name: `update-employee-password`
5. Copy code from `supabase/functions/update-employee-password/index.ts`
6. Paste into editor
7. Click "Deploy"

## Cost

**Free Tier:**
- 500,000 invocations/month
- 2GB bandwidth/month

**Your usage:**
- Update password = 1 invocation
- Typical: 10-50 updates/month
- ✅ Free tier is more than enough!

## Security

✅ Service role key stays on server (Edge Function)
✅ Frontend only sends userId and password
✅ HTTPS encryption
✅ Input validation (min 6 chars)
✅ Error logging for debugging

## Next Steps After Deployment

1. ✅ Test update password feature
2. ✅ Test login with new password
3. ✅ Check Edge Function logs
4. ✅ Monitor for errors

## Summary

**What we're deploying:**
- Edge Function that updates employee passwords
- Uses service role key (admin access)
- Called from frontend via `supabase.functions.invoke()`

**Why we need this:**
- Frontend uses anon key (public)
- Password update requires service role key (admin)
- Edge Function bridges the gap securely

**Commands:**
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy update-employee-password
```

**Result:**
✅ Update password feature will work perfectly!

## Need Help?

- 📖 Supabase Docs: https://supabase.com/docs/guides/functions
- 💬 Discord: https://discord.supabase.com
- 📧 Support: support@supabase.com
