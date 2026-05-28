import { supabase } from '@/lib/supabase';

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: 'owner' | 'admin' | 'cashier';
  store_id: number | null;
  is_active: boolean;
}

export interface LoginResponse {
  success: boolean;
  user?: AuthUser;
  session_token?: string;
  expires_at?: string;
  message?: string;
}

/**
 * Login with username and password
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  try {
    // 1. Find employee by username
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('username', username)
      .single();

    if (employeeError || !employee) {
      return {
        success: false,
        message: 'Username atau password salah',
      };
    }

    // 2. Check if account is active
    if (!employee.is_active) {
      return {
        success: false,
        message: 'Akun Anda telah dinonaktifkan. Silakan hubungi Owner/Admin.',
      };
    }

    // 3. Verify password using database function
    const { data: passwordValid, error: verifyError } = await supabase
      .rpc('verify_password', {
        plain_password: password,
        hashed_password: employee.password_hash,
      });

    console.log('Password verification:', { passwordValid, verifyError });

    // Check if password is valid (handle both boolean and object response)
    const isPasswordValid = passwordValid === true || passwordValid === 't' || passwordValid === 1;
    
    if (verifyError || !isPasswordValid) {
      console.log('Password verification failed', { passwordValid, isPasswordValid });
      return {
        success: false,
        message: 'Username atau password salah',
      };
    }

    // 4. Create session
    const { data: sessionData, error: sessionError } = await supabase
      .rpc('create_session', {
        p_employee_id: employee.id,
        p_ip_address: null,
        p_user_agent: navigator.userAgent,
      })
      .single();

    if (sessionError || !sessionData) {
      console.error('Session creation error:', sessionError);
      return {
        success: false,
        message: 'Gagal membuat session',
      };
    }

    // 5. Return user data and session
    const user: AuthUser = {
      id: employee.id,
      username: employee.username,
      name: employee.name,
      role: employee.role,
      store_id: employee.store_id,
      is_active: employee.is_active,
    };

    return {
      success: true,
      user,
      session_token: sessionData.session_token,
      expires_at: sessionData.expires_at,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'Terjadi kesalahan saat login',
    };
  }
}

/**
 * Validate session and get user data
 */
export async function validateSession(sessionToken: string): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase
      .rpc('validate_session', {
        p_session_token: sessionToken,
      })
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.employee_id,
      username: data.username,
      name: data.name,
      role: data.role,
      store_id: data.store_id,
      is_active: data.is_active,
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

/**
 * Logout (delete session)
 */
export async function logout(sessionToken: string): Promise<void> {
  try {
    await supabase.rpc('delete_session', {
      p_session_token: sessionToken,
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
}

/**
 * Get current session token from localStorage
 */
export function getSessionToken(): string | null {
  return localStorage.getItem('session_token');
}

/**
 * Save session token to localStorage
 */
export function saveSessionToken(token: string, expiresAt: string): void {
  localStorage.setItem('session_token', token);
  localStorage.setItem('session_expires_at', expiresAt);
}

/**
 * Clear session token from localStorage
 */
export function clearSessionToken(): void {
  localStorage.removeItem('session_token');
  localStorage.removeItem('session_expires_at');
  localStorage.removeItem('active_store_id');
}

/**
 * Check if session is expired
 */
export function isSessionExpired(): boolean {
  const expiresAt = localStorage.getItem('session_expires_at');
  if (!expiresAt) return true;
  
  return new Date(expiresAt) < new Date();
}
