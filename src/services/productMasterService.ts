import { supabase } from "@/lib/supabase";

export interface ProductMaster {
  id: number;
  store_id: number;
  name: string;
}

export async function getMasterData(table: string, storeId: number): Promise<ProductMaster[]> {
  const { data, error } = await (supabase as any)
    .from(table)
    .select("*")
    .eq("store_id", storeId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getOrCreateMasterData(table: string, name: string, storeId: number): Promise<ProductMaster> {
  const cleanName = name.trim();
  
  // Try to find existing
  const { data: existing, error: searchError } = await (supabase as any)
    .from(table)
    .select("*")
    .eq("store_id", storeId)
    .ilike("name", cleanName)
    .maybeSingle();

  if (searchError) throw searchError;
  if (existing) return existing;

  // Create new if not exists
  const { data: created, error: createError } = await (supabase as any)
    .from(table)
    .insert([{ name: cleanName, store_id: storeId }])
    .select()
    .single();

  if (createError) throw createError;
  return created;
}

export async function updateMasterData(table: string, id: number, name: string): Promise<ProductMaster> {
  const cleanName = name.trim();
  const { data, error } = await (supabase as any)
    .from(table)
    .update({ name: cleanName })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMasterData(table: string, id: number): Promise<void> {
  const { error } = await (supabase as any)
    .from(table)
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// Helpers
export const getMainProducts = (storeId: number) => getMasterData("main_products", storeId);
export const getOrCreateMainProduct = (name: string, storeId: number) => getOrCreateMasterData("main_products", name, storeId);

export const getVariants = (storeId: number) => getMasterData("variants", storeId);
export const getOrCreateVariant = (name: string, storeId: number) => getOrCreateMasterData("variants", name, storeId);

export const getSpecifications = (storeId: number) => getMasterData("specifications", storeId);
export const getOrCreateSpecification = (name: string, storeId: number) => getOrCreateMasterData("specifications", name, storeId);

export const getSizes = (storeId: number) => getMasterData("sizes", storeId);
export const getOrCreateSize = (name: string, storeId: number) => getOrCreateMasterData("sizes", name, storeId);
