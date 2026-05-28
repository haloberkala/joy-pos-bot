import { supabase } from '@/lib/supabase';

export interface Employee {
  id: string;
  store_id: number;
  username: string;
  name: string;
  phone: string | null;
  role: 'admin' | 'cashier';
  position: string;
  daily_salary: number;
  fingerprint_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  store_name?: string;
}

export interface EmployeeInput {
  store_id: number;
  username: string;
  name: string;
  phone?: string;
  role: 'admin' | 'cashier';
  position?: string;
  daily_salary?: number;
  fingerprint_id?: string;
  is_active?: boolean;
  password?: string; // For create and update
}

/**
 * Get employees by store ID
 */
export async function getEmployeesByStore(storeId: number): Promise<Employee[]> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        stores:store_id (name)
      `)
      .eq('store_id', storeId)
      .order('role', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map((emp: any) => ({
      ...emp,
      store_name: emp.stores?.name || 'Unknown',
      stores: undefined,
    }));
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
}

/**
 * Get all employees (owner only)
 */
export async function getAllEmployees(): Promise<Employee[]> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        stores:store_id (name)
      `)
      .order('store_id', { ascending: true })
      .order('role', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map((emp: any) => ({
      ...emp,
      store_name: emp.stores?.name || 'Unknown',
      stores: undefined,
    }));
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
}

/**
 * Create employee (owner/admin only)
 * Uses custom auth system with username and password_hash
 */
export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  try {
    if (!input.password) {
      throw new Error('Password is required for new employee');
    }

    // Call the hash_password function to hash the password
    const { data: hashData, error: hashError } = await supabase
      .rpc('hash_password', { plain_password: input.password });

    if (hashError) throw hashError;

    // Create employee record with hashed password
    const { data, error } = await supabase
      .from('employees')
      .insert({
        store_id: input.store_id,
        username: input.username,
        name: input.name,
        phone: input.phone || null,
        role: input.role,
        position: input.position || 'Staff',
        daily_salary: input.daily_salary || 0,
        fingerprint_id: input.fingerprint_id || null,
        password_hash: hashData,
        is_active: true, // Always active on creation
      })
      .select(`
        *,
        stores:store_id (name)
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      store_name: data.stores?.name || 'Unknown',
      stores: undefined,
    };
  } catch (error) {
    console.error('Error creating employee:', error);
    throw error;
  }
}

/**
 * Update employee (owner/admin only)
 * Can update password using hash_password function
 */
export async function updateEmployee(
  id: string,
  input: Partial<EmployeeInput>
): Promise<Employee> {
  try {
    // 1. Prepare update data
    const updateData: any = {};
    if (input.store_id !== undefined) updateData.store_id = input.store_id;
    if (input.username !== undefined) updateData.username = input.username;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.phone !== undefined) updateData.phone = input.phone || null;
    if (input.role !== undefined) updateData.role = input.role;
    if (input.position !== undefined) updateData.position = input.position || 'Staff';
    if (input.daily_salary !== undefined) updateData.daily_salary = input.daily_salary || 0;
    if (input.fingerprint_id !== undefined) updateData.fingerprint_id = input.fingerprint_id || null;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    // 2. If password is provided, hash it
    if (input.password) {
      const { data: hashData, error: hashError } = await supabase
        .rpc('hash_password', { plain_password: input.password });

      if (hashError) throw hashError;
      updateData.password_hash = hashData;
    }

    // 3. Update employee record
    const { data, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        stores:store_id (name)
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      store_name: data.stores?.name || 'Unknown',
      stores: undefined,
    };
  } catch (error) {
    console.error('Error updating employee:', error);
    throw error;
  }
}

/**
 * Delete employee (owner/admin only)
 */
export async function deleteEmployee(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
}

/**
 * Toggle employee status
 */
export async function toggleEmployeeStatus(
  id: string,
  isActive: boolean
): Promise<Employee> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .update({ is_active: isActive })
      .eq('id', id)
      .select(`
        *,
        stores:store_id (name)
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      store_name: data.stores?.name || 'Unknown',
      stores: undefined,
    };
  } catch (error) {
    console.error('Error toggling status:', error);
    throw error;
  }
}
