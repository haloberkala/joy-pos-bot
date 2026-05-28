import { supabase } from '@/lib/supabase';

export interface Supplier {
  id: number;
  store_id: number;
  name: string;
  phone: string;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierInput {
  store_id: number;
  name: string;
  phone: string;
  address?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  phone?: string;
  address?: string;
}

/**
 * Get suppliers by store
 */
export async function getSuppliersByStore(storeId: number): Promise<Supplier[]> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    throw error;
  }
}

/**
 * Create supplier
 */
export async function createSupplier(input: CreateSupplierInput): Promise<Supplier> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        store_id: input.store_id,
        name: input.name,
        phone: input.phone,
        address: input.address || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating supplier:', error);
    throw error;
  }
}

/**
 * Update supplier
 */
export async function updateSupplier(
  id: number,
  input: UpdateSupplierInput
): Promise<Supplier> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating supplier:', error);
    throw error;
  }
}

/**
 * Delete supplier
 */
export async function deleteSupplier(id: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting supplier:', error);
    throw error;
  }
}
