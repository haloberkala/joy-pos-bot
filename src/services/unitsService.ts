import { supabase } from '@/lib/supabase';

export interface Unit {
  id: number;
  store_id: number;
  name: string;
  short_name: string | null;
  description: string | null;
  created_at: string;
}

export interface CreateUnitInput {
  store_id: number;
  name: string;
  description?: string;
}

export interface UpdateUnitInput {
  name?: string;
  short_name?: string;
  description?: string;
}

/**
 * Get all units for a specific store
 */
export async function getAllUnits(storeId: number): Promise<Unit[]> {
  try {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching units:', error);
    throw error;
  }
}

/**
 * Get unit by ID
 */
export async function getUnitById(id: number): Promise<Unit | null> {
  try {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching unit:', error);
    return null;
  }
}

/**
 * Create unit
 */
export async function createUnit(input: CreateUnitInput): Promise<Unit> {
  try {
    const { data, error } = await supabase
      .from('units')
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
    console.error('Error creating unit:', error);
    throw error;
  }
}

/**
 * Get or create unit by name for a specific store
 */
export async function getOrCreateUnit(name: string, storeId: number): Promise<Unit> {
  try {
    // Try to find existing unit in this store
    const { data: existing, error: searchError } = await supabase
      .from('units')
      .select('*')
      .eq('store_id', storeId)
      .ilike('name', name)
      .single();

    if (existing) return existing;

    // Create new unit if not found
    return await createUnit({ store_id: storeId, name });
  } catch (error) {
    console.error('Error getting or creating unit:', error);
    throw error;
  }
}

/**
 * Update unit
 */
export async function updateUnit(id: number, input: UpdateUnitInput): Promise<Unit> {
  try {
    const updateData: any = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.short_name !== undefined) updateData.short_name = input.short_name;
    if (input.description !== undefined) updateData.description = input.description;

    const { data, error } = await supabase
      .from('units')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating unit:', error);
    throw error;
  }
}

/**
 * Delete unit
 */
export async function deleteUnit(id: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('units')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting unit:', error);
    throw error;
  }
}
