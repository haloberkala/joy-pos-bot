import { supabase } from './supabase';
import { UserRole } from '@/types/pos';

/**
 * Get all stores accessible by the current user
 */
export async function getAccessibleStores(userId: string) {
  try {
    // Get user profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role, store_id')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    if (user.role === 'owner') {
      // Owner can access all stores
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('*')
        .order('id');

      if (storesError) throw storesError;
      return stores || [];
    } else {
      // Admin/Cashier can only access their store
      if (!user.store_id) return [];

      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', user.store_id)
        .single();

      if (storeError) throw storeError;
      return store ? [store] : [];
    }
  } catch (error) {
    console.error('Error getting accessible stores:', error);
    return [];
  }
}

/**
 * Check if user can access a specific store
 */
export async function canAccessStore(userId: string, storeId: number): Promise<boolean> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('role, store_id')
      .eq('id', userId)
      .single();

    if (error) throw error;

    if (user.role === 'owner') {
      return true;
    }

    return user.store_id === storeId;
  } catch (error) {
    console.error('Error checking store access:', error);
    return false;
  }
}

/**
 * Get user profile with store information
 */
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        store:stores(*)
      `)
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}

/**
 * Create a new user (admin only)
 */
export async function createUser(params: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  storeId?: number;
}) {
  try {
    const metadata: Record<string, any> = {
      name: params.name,
      role: params.role,
    };

    if (params.storeId) {
      metadata.store_id = params.storeId.toString();
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, updates: {
  name?: string;
  role?: UserRole;
  store_id?: number | null;
  is_active?: boolean;
}) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

/**
 * Get all users (owner/admin only)
 */
export async function getAllUsers(storeId?: number) {
  try {
    let query = supabase
      .from('users')
      .select(`
        *,
        store:stores(*)
      `)
      .order('created_at', { ascending: false });

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
}

/**
 * Sign up a new user (public registration)
 */
export async function signUp(params: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  storeId?: number;
}) {
  try {
    const metadata: Record<string, any> = {
      name: params.name,
      role: params.role,
    };

    if (params.storeId) {
      metadata.store_id = params.storeId.toString();
    }

    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: metadata,
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
}

/**
 * Reset password
 */
export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
}
