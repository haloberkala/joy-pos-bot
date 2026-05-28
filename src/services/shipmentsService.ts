import { supabase } from '@/lib/supabase';

export interface Shipment {
  id: number;
  store_id: number;
  sale_id: number | null;
  invoice_number: string | null;
  customer_id: number | null;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  items_description: string | null;
  shipping_cost: number;
  created_at: string;
  updated_at: string;
}

export interface CreateShipmentInput {
  store_id: number;
  sale_id?: number | null;
  invoice_number?: string;
  customer_id?: number | null;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  items_description?: string;
  shipping_cost: number;
}

/**
 * Create shipment
 */
export async function createShipment(input: CreateShipmentInput): Promise<Shipment> {
  try {
    const { data, error } = await supabase
      .from('shipments')
      .insert({
        store_id: input.store_id,
        sale_id: input.sale_id || null,
        invoice_number: input.invoice_number || null,
        customer_id: input.customer_id || null,
        recipient_name: input.recipient_name,
        recipient_phone: input.recipient_phone,
        recipient_address: input.recipient_address,
        items_description: input.items_description || null,
        shipping_cost: input.shipping_cost,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating shipment:', error);
    throw error;
  }
}

/**
 * Get shipments by store
 */
export async function getShipmentsByStore(storeId: number): Promise<Shipment[]> {
  try {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching shipments:', error);
    throw error;
  }
}
