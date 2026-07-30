import { supabase } from '@/lib/supabase';

export interface Category {
  id: number;
  store_id: number;
  name: string;
  short_name: string | null;
  description: string | null;
  created_at: string;
}

export interface CreateCategoryInput {
  store_id: number;
  name: string;
  description?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  short_name?: string;
  description?: string;
}

/**
 * Get all categories for a specific store
 */
export async function getAllCategories(storeId: number): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}

/**
 * Get category by ID
 */
export async function getCategoryById(id: number): Promise<Category | null> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching category:', error);
    return null;
  }
}

/**
 * Create category
 */
export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  try {
    const { data, error } = await supabase
      .from('categories')
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
    console.error('Error creating category:', error);
    throw error;
  }
}

/**
 * Get or create category by name for a specific store
 */
export async function getOrCreateCategory(name: string, storeId: number): Promise<Category> {
  try {
    // Try to find existing category in this store
    const { data: existing, error: searchError } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .ilike('name', name)
      .single();

    if (existing) return existing;

    // Create new category if not found
    return await createCategory({ store_id: storeId, name });
  } catch (error) {
    console.error('Error getting or creating category:', error);
    throw error;
  }
}

/**
 * Update category
 */
export async function updateCategory(id: number, input: UpdateCategoryInput): Promise<Category> {
  try {
    const updateData: any = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.short_name !== undefined) updateData.short_name = input.short_name;
    if (input.description !== undefined) updateData.description = input.description;

    const { data, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
}

/**
 * Delete category
 */
export async function deleteCategory(id: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}
