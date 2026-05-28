# Custom Authentication Migration Plan

## Status: 🚧 IN PROGRESS

## Overview

Rombak sistem autentikasi dari **Supabase Auth** menjadi **Custom Database Authentication** untuk menghindari kompleksitas dan masalah dengan Supabase Auth (email format, auth state loops, dll).

## Why Custom Auth?

### Problems with Supabase Auth:
1. ❌ Email format validation issues (`@internal.pos` vs `@pos.app`)
2. ❌ Auth state change infinite loops
3. ❌ Complex password update (requires Edge Function or service role)
4. ❌ Mismatch between Auth users and database employees
5. ❌ 400 errors on login shortcuts
6. ❌ Difficult to debug and maintain

### Benefits of Custom Auth:
1. ✅ Simple username/password login
2. ✅ Direct database queries (no auth state changes)
3. ✅ Easy password management (hash in database)
4. ✅ Full control over session management
5. ✅ No email format issues
6. ✅ Easier to debug and maintain
7. ✅ Better performance (fewer API calls)

## Architecture

### Old (Supabase Auth):
```
Login → Supabase Auth API → Auth State Change → User Metadata → Database Query
```

### New (Custom Auth):
```
Login → Database Query → Password Verify → Create Session → Return User
```

## Database Schema

### 1. employees Table (Enhanced)
```sql
ALTER TABLE employees ADD COLUMN password_hash TEXT;
```

Stores hashed passwords using SHA-256.

### 2. user_sessions Table (New)
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  session_token TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT
);
```

Manages user sessions with expiration.

### 3. Database Functions

**hash_password(plain_password TEXT)**
- Hashes password using SHA-256
- Returns hex-encoded hash

**verify_password(plain_password TEXT, hashed_password TEXT)**
- Verifies password against hash
- Returns boolean

**generate_session_token()**
- Generates random 32-byte token
- Returns hex-encoded token

**create_session(employee_id, ip_address, user_agent)**
- Creates new session
- Returns session_token and expires_at
- Expiration: 7 days

**validate_session(session_token)**
- Validates session token
- Updates last_activity
- Returns employee data if valid

**delete_session(session_token)**
- Deletes session (logout)

**clean_expired_sessions()**
- Cleans up expired sessions
- Returns count of deleted sessions

## Implementation Steps

### ✅ Step 1: Database Migration (DONE)
- [x] Create migration file: `015_custom_auth_system.sql`
- [x] Add `password_hash` column to employees
- [x] Create `user_sessions` table
- [x] Create authentication functions
- [x] Migrate existing passwords to hashed format
- [x] Create default users (owner, admin1, kasir1)
- [x] Set up RLS policies

### ✅ Step 2: Auth Service (DONE)
- [x] Create `src/services/authService.ts`
- [x] Implement `login(username, password)`
- [x] Implement `validateSession(sessionToken)`
- [x] Implement `logout(sessionToken)`
- [x] Implement localStorage helpers

### ✅ Step 3: Auth Context (DONE)
- [x] Rewrite `src/contexts/AuthContext.tsx`
- [x] Remove Supabase Auth dependencies
- [x] Use custom authService
- [x] Implement session validation on mount
- [x] Implement store persistence

### 🚧 Step 4: Update Services (IN PROGRESS)
- [ ] Update `employeesService.ts`
  - [ ] Remove Supabase Auth signUp
  - [ ] Use `hash_password` function
  - [ ] Update createEmployee
  - [ ] Update updateEmployee (password)
  - [ ] Remove Edge Function dependency
- [ ] Update other services if needed

### 🚧 Step 5: Update Components (TODO)
- [ ] Update `Login.tsx` (should work as-is)
- [ ] Update `Employees.tsx` (remove auth-related code)
- [ ] Test all login flows
- [ ] Test all CRUD operations

### 🚧 Step 6: Testing (TODO)
- [ ] Test login with username/password
- [ ] Test shortcut login
- [ ] Test session persistence
- [ ] Test logout
- [ ] Test expired session handling
- [ ] Test employee CRUD
- [ ] Test password update
- [ ] Test multi-store access

### 🚧 Step 7: Cleanup (TODO)
- [ ] Remove Supabase Auth users (optional)
- [ ] Remove Edge Function (optional)
- [ ] Update documentation
- [ ] Remove unused code

## Migration Commands

### Run Migration
```bash
# Using Supabase CLI
supabase db push

# OR using Supabase Dashboard
# 1. Go to SQL Editor
# 2. Copy content from supabase/migrations/015_custom_auth_system.sql
# 3. Run the migration
```

### Verify Migration
```sql
-- Check employees have password_hash
SELECT username, name, role, 
       CASE WHEN password_hash IS NOT NULL THEN '✓' ELSE '✗' END as hashed
FROM employees;

-- Check sessions table
SELECT * FROM user_sessions;

-- Test password hashing
SELECT hash_password('owner123');
SELECT verify_password('owner123', hash_password('owner123'));
```

## Default Users

After migration, these users will be available:

| Username | Password | Role | Store | Status |
|----------|----------|------|-------|--------|
| owner | owner123 | owner | NULL (all) | Active |
| admin1 | admin123 | admin | 1 | Active |
| kasir1 | kasir123 | cashier | 1 | Active |

## API Changes

### Old (Supabase Auth):
```typescript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: `${username}@internal.pos`,
  password,
});

// Get session
const { data: { session } } = await supabase.auth.getSession();

// Logout
await supabase.auth.signOut();
```

### New (Custom Auth):
```typescript
// Login
const result = await authService.login(username, password);
// Returns: { success, user, session_token, expires_at }

// Validate session
const user = await authService.validateSession(sessionToken);

// Logout
await authService.logout(sessionToken);
```

## Session Management

### Storage
- **Key**: `session_token`
- **Value**: Random 64-character hex string
- **Expiration**: 7 days
- **Location**: localStorage

### Validation
- On app mount: validate session
- On API calls: include session token (future)
- On expiration: auto-logout

### Security
- Session tokens are random and unpredictable
- Passwords are hashed with SHA-256
- Sessions expire after 7 days
- Inactive sessions can be cleaned up

## Performance

### Before (Supabase Auth):
- Login: 3-5 API calls
- Session check: 2-3 API calls
- Auth state changes: Multiple triggers
- Total: ~10 API calls per login

### After (Custom Auth):
- Login: 2 API calls (verify + create session)
- Session check: 1 API call (validate)
- No auth state changes
- Total: ~3 API calls per login

**Improvement**: ~70% reduction in API calls

## Security Considerations

### Password Hashing
- Algorithm: SHA-256 (can upgrade to bcrypt)
- Salt: Not implemented yet (can add later)
- Storage: `password_hash` column

### Session Security
- Random tokens (32 bytes)
- Expiration (7 days)
- IP address tracking (optional)
- User agent tracking (optional)

### Future Improvements
- [ ] Add bcrypt for password hashing
- [ ] Add salt to passwords
- [ ] Implement refresh tokens
- [ ] Add rate limiting
- [ ] Add IP-based restrictions
- [ ] Add 2FA support

## Rollback Plan

If issues occur:

1. **Keep Supabase Auth users** (don't delete yet)
2. **Revert code changes** (git revert)
3. **Drop new tables**:
```sql
DROP TABLE IF EXISTS user_sessions CASCADE;
ALTER TABLE employees DROP COLUMN IF EXISTS password_hash;
```

4. **Restore old AuthContext.tsx**

## Testing Checklist

### Login Flow
- [ ] Login with correct credentials
- [ ] Login with wrong password
- [ ] Login with non-existent user
- [ ] Login with inactive account
- [ ] Shortcut login (Owner)
- [ ] Shortcut login (Admin)
- [ ] Shortcut login (Kasir)

### Session Management
- [ ] Session persists after page reload
- [ ] Session persists across tabs
- [ ] Session expires after 7 days
- [ ] Logout clears session
- [ ] Invalid session redirects to login

### Store Switching
- [ ] Owner can switch stores
- [ ] Admin/Kasir cannot switch stores
- [ ] Active store persists after reload
- [ ] Active store persists after logout/login

### Employee Management
- [ ] Create employee with password
- [ ] Update employee password
- [ ] Update employee without password
- [ ] Delete employee
- [ ] Toggle employee status

## Timeline

- **Migration**: 15 minutes
- **Testing**: 30 minutes
- **Deployment**: 5 minutes
- **Total**: ~1 hour

## Next Steps

1. ✅ Review migration file
2. 🚧 Run migration in development
3. 🚧 Test login flows
4. 🚧 Update employeesService
5. 🚧 Test employee CRUD
6. 🚧 Deploy to production

---

**Created**: 2026-05-19
**Status**: Ready for Migration
**Risk Level**: Medium (major auth change, but reversible)
