import { supabase } from '@/lib/supabase';

export interface StockOpname {
  id: number;
  store_id: number;
  opname_number: string;
  opname_date: string;
  note: string | null;
  status: 'draft' | 'completed';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockOpnameItem {
  id: number;
  opname_id: number;
  product_id: number;
  system_stock: number;
  physical_stock: number;
  difference: number;
  note: string | null;
  created_at: string;
}

export interface CreateStockOpnameInput {
  store_id: number;
  opname_number: string;
  opname_date?: Date;
  note?: string;
  created_by?: string;
  items: CreateStockOpnameItemInput[];
}

export interface CreateStockOpnameItemInput {
  product_id: number;
  system_stock: number;
  physical_stock: number;
  difference: number;
  note?: string;
}

/**
 * Create stock opname with items
 */
export async function createStockOpname(input: CreateStockOpnameInput): Promise<StockOpname> {
  try {
    // 1. Create stock opname
    const { data: opname, error: opnameError } = await supabase
      .from('stock_opnames')
      .insert({
        store_id: input.store_id,
        opname_number: input.opname_number,
        opname_date: input.opname_date ? input.opname_date.toISOString() : new Date().toISOString(),
        note: input.note || null,
        status: 'completed',
        created_by: input.created_by || null,
      })
      .select()
      .single();

    if (opnameError) throw opnameError;

    // 2. Create stock opname items
    const opnameItems = input.items.map(item => ({
      opname_id: opname.id,
      product_id: item.product_id,
      system_stock: item.system_stock,
      physical_stock: item.physical_stock,
      difference: item.difference,
      note: item.note || null,
    }));

    const { error: itemsError } = await supabase
      .from('stock_opname_items')
      .insert(opnameItems);

    if (itemsError) throw itemsError;

    // 3. Update product quantities based on differences
    for (const item of input.items) {
      if (item.difference !== 0) {
        // Get current quantity
        const { data: product, error: fetchError } = await supabase
          .from('products')
          .select('quantity')
          .eq('id', item.product_id)
          .single();

        if (fetchError) throw fetchError;

        // Update to physical stock
        const { error: updateError } = await supabase
          .from('products')
          .update({ quantity: item.physical_stock })
          .eq('id', item.product_id);

        if (updateError) throw updateError;
      }
    }

    return opname;
  } catch (error) {
    console.error('Error creating stock opname:', error);
    throw error;
  }
}

/**
 * Get stock opnames by store
 */
export async function getStockOpnamesByStore(
  storeId: number,
  limit?: number
): Promise<StockOpname[]> {
  try {
    let query = supabase
      .from('stock_opnames')
      .select('*')
      .eq('store_id', storeId)
      .order('opname_date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching stock opnames:', error);
    throw error;
  }
}

/**
 * Get stock opname with items
 */
export async function getStockOpnameWithItems(opnameId: number): Promise<{
  opname: StockOpname;
  items: StockOpnameItem[];
}> {
  try {
    const [opnameResult, itemsResult] = await Promise.all([
      supabase.from('stock_opnames').select('*').eq('id', opnameId).single(),
      supabase.from('stock_opname_items').select('*').eq('opname_id', opnameId),
    ]);

    if (opnameResult.error) throw opnameResult.error;
    if (itemsResult.error) throw itemsResult.error;

    return {
      opname: opnameResult.data,
      items: itemsResult.data || [],
    };
  } catch (error) {
    console.error('Error fetching stock opname with items:', error);
    throw error;
  }
}
