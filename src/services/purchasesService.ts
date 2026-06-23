import { supabase } from '@/lib/supabase';
import { updateProductQuantity } from './productsService';

export interface Purchase {
  id: number;
  store_id: number;
  supplier_id: number | null;
  reference_no: string;
  purchase_date: string;
  total_amount: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  image_proof: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: number;
  purchase_id: number;
  product_id: number | null;
  product_name: string;
  product_code: string | null;
  quantity: number;
  cost_price: number;
  sub_total: number;
  created_at: string;
}

export interface CreatePurchaseInput {
  store_id: number;
  supplier_id?: number | null;
  reference_no: string;
  purchase_date?: Date;
  total_amount: number;
  payment_status?: 'paid' | 'partial' | 'unpaid';
  image_proof?: string;
  note?: string;
  items: CreatePurchaseItemInput[];
}

export interface CreatePurchaseItemInput {
  product_id?: number | null;
  product_name: string;
  product_code?: string;
  quantity: number;
  cost_price: number;
  sub_total: number;
}

/**
 * Create purchase with items (transaction)
 */
export async function createPurchase(input: CreatePurchaseInput): Promise<Purchase> {
  try {
    // 1. Create purchase
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        store_id: input.store_id,
        supplier_id: input.supplier_id || null,
        reference_no: input.reference_no,
        purchase_date: input.purchase_date ? input.purchase_date.toISOString() : new Date().toISOString(),
        total_amount: input.total_amount,
        payment_status: input.payment_status || 'paid',
        image_proof: input.image_proof || null,
        note: input.note || null,
      })
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // 2. Create purchase items
    const purchaseItems = input.items.map(item => ({
      purchase_id: purchase.id,
      product_id: item.product_id || null,
      product_name: item.product_name,
      product_code: item.product_code || null,
      quantity: item.quantity,
      cost_price: item.cost_price,
      sub_total: item.sub_total,
    }));

    const { error: itemsError } = await supabase
      .from('purchase_items')
      .insert(purchaseItems);

    if (itemsError) throw itemsError;

    // 3. Update product quantities (add stock) and cost price
    for (const item of input.items) {
      if (item.product_id) {
        // Add to stock
        await updateProductQuantity(item.product_id, item.quantity);
        
        // Update cost price
        const { error: updateError } = await supabase
          .from('products')
          .update({ cost_price: item.cost_price })
          .eq('id', item.product_id);
        
        if (updateError) console.error('Error updating cost price:', updateError);
      }
    }

    return purchase;
  } catch (error) {
    console.error('Error creating purchase:', error);
    throw error;
  }
}

/**
 * Get purchases by store
 */
export async function getPurchasesByStore(
  storeId: number,
  limit?: number
): Promise<Purchase[]> {
  try {
    let query = supabase
      .from('purchases')
      .select('*')
      .eq('store_id', storeId)
      .order('purchase_date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching purchases:', error);
    throw error;
  }
}

/**
 * Get purchase with items
 */
export async function getPurchaseWithItems(purchaseId: number): Promise<{
  purchase: Purchase;
  items: PurchaseItem[];
}> {
  try {
    const [purchaseResult, itemsResult] = await Promise.all([
      supabase.from('purchases').select('*').eq('id', purchaseId).single(),
      supabase.from('purchase_items').select('*').eq('purchase_id', purchaseId),
    ]);

    if (purchaseResult.error) throw purchaseResult.error;
    if (itemsResult.error) throw itemsResult.error;

    return {
      purchase: purchaseResult.data,
      items: itemsResult.data || [],
    };
  } catch (error) {
    console.error('Error fetching purchase with items:', error);
    throw error;
  }
}

/**
 * Delete purchase (only for Owner role)
 * Note: purchase_items will be cascade deleted automatically
 */
export async function deletePurchase(purchaseId: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('purchases')
      .delete()
      .eq('id', purchaseId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting purchase:', error);
    throw error;
  }
}

/**
 * Update purchase note
 */
export async function updatePurchaseNote(purchaseId: number, note: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('purchases')
      .update({ note })
      .eq('id', purchaseId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating purchase note:', error);
    throw error;
  }
}
