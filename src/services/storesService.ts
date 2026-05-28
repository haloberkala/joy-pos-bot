import { supabase } from '@/lib/supabase';

export interface Store {
  id: number;
  name: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface StoreInput {
  name: string;
  address: string;
}

/**
 * Get all stores (owner only)
 */
export async function getAllStores(): Promise<Store[]> {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching stores:', error);
    throw error;
  }
}

/**
 * Get single store by ID
 */
export async function getStoreById(id: number): Promise<Store | null> {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching store:', error);
    throw error;
  }
}

/**
 * Create new store (owner only)
 */
export async function createStore(input: StoreInput): Promise<Store> {
  try {
    const { data, error } = await supabase
      .from('stores')
      .insert({
        name: input.name,
        address: input.address,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating store:', error);
    throw error;
  }
}

/**
 * Update store (owner only)
 */
export async function updateStore(id: number, input: Partial<StoreInput>): Promise<Store> {
  try {
    const { data, error } = await supabase
      .from('stores')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating store:', error);
    throw error;
  }
}

/**
 * Delete store (owner only)
 */
export async function deleteStore(id: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting store:', error);
    throw error;
  }
}

/**
 * Get stores count
 */
export async function getStoresCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('stores')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error counting stores:', error);
    return 0;
  }
}
