import { supabase } from '@/lib/supabase';

export interface Brand {
  id: number;
  store_id: number;
  name: string;
  short_name: string | null;
  description: string | null;
  created_at: string;
}

export interface CreateBrandInput {
  store_id: number;
  name: string;
  description?: string;
}

export interface UpdateBrandInput {
  name?: string;
  short_name?: string;
  description?: string;
}

/**
 * Get all brands for a specific store
 */
export async function getAllBrands(storeId: number): Promise<Brand[]> {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching brands:', error);
    throw error;
  }
}

/**
 * Get brand by ID
 */
export async function getBrandById(id: number): Promise<Brand | null> {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching brand:', error);
    return null;
  }
}

/**
 * Create brand
 */
export async function createBrand(input: CreateBrandInput): Promise<Brand> {
  try {
    const { data, error } = await supabase
      .from('brands')
      .insert({
        store_id: input.store_id,
        name: input.name,
        description: input.description || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating brand:', error);
    throw error;
  }
}

/**
 * Update brand
 */
export async function updateBrand(id: number, input: UpdateBrandInput): Promise<Brand> {
  try {
    const updateData: any = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.short_name !== undefined) updateData.short_name = input.short_name;
    if (input.description !== undefined) updateData.description = input.description;

    const { data, error } = await supabase
      .from('brands')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating brand:', error);
    throw error;
  }
}

/**
 * Delete brand
 */
export async function deleteBrand(id: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting brand:', error);
    throw error;
  }
}

/**
 * Get or create brand by name for a specific store
 */
export async function getOrCreateBrand(name: string, storeId: number): Promise<Brand> {
  try {
    // Try to find existing brand in this store
    const { data: existing, error: searchError } = await supabase
      .from('brands')
      .select('*')
      .eq('store_id', storeId)
      .ilike('name', name)
      .single();

    if (existing) return existing;

    // Create new brand if not found
    return await createBrand({ store_id: storeId, name });
  } catch (error) {
    console.error('Error getting or creating brand:', error);
    throw error;
  }
}
