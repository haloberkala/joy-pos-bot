import { supabase } from '@/lib/supabase';
import { updateProductQuantity } from './productsService';

export interface Sale {
  id: number;
  store_id: number;
  customer_id: number | null;
  invoice_number: string;
  sale_date: string;
  sub_total: number;
  discount: number;
  tax: number;
  grand_total: number;
  payment_method: 'cash' | 'transfer' | 'qris' | 'debt' | null;
  payment_status: 'paid' | 'debt' | 'partial' | 'refunded' | null;
  amount_received: number;
  change_amount: number;
  due_date: string | null;
  note: string | null;
  cashier_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number | null;
  product_name: string;
  product_code: string | null;
  quantity: number;
  price_per_unit: number;
  cost_per_unit: number;
  total_price: number;
  price_mode: 'retail' | 'wholesale' | 'special' | null;
  is_service: boolean;
  created_at: string;
  product?: { name: string } | null;
}

export interface CreateSaleInput {
  store_id: number;
  customer_id?: number | null;
  invoice_number: string;
  sale_date?: Date;
  sub_total: number;
  discount?: number;
  tax?: number;
  grand_total: number;
  payment_method: 'cash' | 'transfer' | 'qris' | 'debt';
  payment_status: 'paid' | 'debt' | 'partial';
  amount_received: number;
  change_amount: number;
  due_date?: Date | null;
  note?: string;
  cashier_name?: string;
  items: CreateSaleItemInput[];
}

export interface CreateSaleItemInput {
  product_id?: number | null;
  product_name: string;
  product_code?: string;
  quantity: number;
  price_per_unit: number;
  cost_per_unit: number;
  total_price: number;
  price_mode?: 'retail' | 'wholesale' | 'special';
  is_service?: boolean;
}

/**
 * Create sale with items (transaction)
 */
export async function createSale(input: CreateSaleInput): Promise<Sale> {
  try {
    // 1. Create sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        store_id: input.store_id,
        customer_id: input.customer_id || null,
        invoice_number: input.invoice_number,
        sale_date: input.sale_date ? input.sale_date.toISOString() : new Date().toISOString(),
        sub_total: input.sub_total,
        discount: input.discount || 0,
        tax: input.tax || 0,
        grand_total: input.grand_total,
        payment_method: input.payment_method,
        payment_status: input.payment_status,
        amount_received: input.amount_received,
        change_amount: input.change_amount,
        due_date: input.due_date ? input.due_date.toISOString() : null,
        note: input.note || null,
        cashier_name: input.cashier_name || null,
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // 2. Create sale items
    const saleItems = input.items.map(item => ({
      sale_id: sale.id,
      product_id: item.product_id || null,
      product_name: item.product_name,
      product_code: item.product_code || null,
      quantity: item.quantity,
      price_per_unit: item.price_per_unit,
      cost_per_unit: item.cost_per_unit,
      total_price: item.total_price,
      price_mode: item.price_mode || null,
      is_service: item.is_service || false,
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) throw itemsError;

    // 3. Update product quantities (reduce stock)
    for (const item of input.items) {
      if (item.product_id && !item.is_service) {
        await updateProductQuantity(item.product_id, -item.quantity);
      }
    }

    return sale;
  } catch (error) {
    console.error('Error creating sale:', error);
    throw error;
  }
}

/**
 * Get sales by store
 */
export async function getSalesByStore(
  storeId: number,
  limit?: number
): Promise<Sale[]> {
  try {
    let query = supabase
      .from('sales')
      .select('*')
      .eq('store_id', storeId)
      .order('sale_date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching sales:', error);
    throw error;
  }
}

/**
 * Get sale with items
 */
export async function getSaleWithItems(saleId: number): Promise<{
  sale: Sale;
  items: SaleItem[];
}> {
  try {
    const [saleResult, itemsResult] = await Promise.all([
      supabase.from('sales').select('*').eq('id', saleId).single(),
      supabase.from('sale_items').select('*, product:products(name)').eq('sale_id', saleId),
    ]);

    if (saleResult.error) throw saleResult.error;
    if (itemsResult.error) throw itemsResult.error;

    return {
      sale: saleResult.data,
      items: itemsResult.data || [],
    };
  } catch (error) {
    console.error('Error fetching sale with items:', error);
    throw error;
  }
}

/**
 * Process refund
 */
export async function processRefund(
  saleId: number,
  reason: string
): Promise<void> {
  try {
    // 1. Get sale with items
    const { sale, items } = await getSaleWithItems(saleId);

    // 2. Update sale status to refunded
    const { error: updateError } = await supabase
      .from('sales')
      .update({
        payment_status: 'refunded',
        note: `REFUND: ${reason}. ${sale.note || ''}`,
      })
      .eq('id', saleId);

    if (updateError) throw updateError;

    // 3. Return stock
    for (const item of items) {
      if (item.product_id && !item.is_service) {
        await updateProductQuantity(item.product_id, item.quantity);
      }
    }
  } catch (error) {
    console.error('Error processing refund:', error);
    throw error;
  }
}

/**
 * Get sale items by sale ID (single sale)
 */
export async function getSaleItemsBySale(saleId: number): Promise<SaleItem[]> {
  try {
    const { data, error } = await supabase
      .from('sale_items')
      .select('*, product:products(name)')
      .eq('sale_id', saleId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching sale items:', error);
    throw error;
  }
}

/**
 * Get sale items by sale IDs (multiple sales)
 */
export async function getSaleItemsBySaleIds(saleIds: number[]): Promise<SaleItem[]> {
  if (saleIds.length === 0) return [];
  
  try {
    const { data, error } = await supabase
      .from('sale_items')
      .select('*, product:products(name)')
      .in('sale_id', saleIds);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching sale items:', error);
    throw error;
  }
}
