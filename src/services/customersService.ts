import { supabase } from '@/lib/supabase';

export interface Customer {
  id: number;
  store_id: number;
  name: string;
  phone: string;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerInput {
  store_id: number;
  name: string;
  phone: string;
  address?: string;
}

/**
 * Get customers by store ID
 */
export async function getCustomersByStore(storeId: number): Promise<Customer[]> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
}

/**
 * Create customer
 */
export async function createCustomer(input: CustomerInput): Promise<Customer> {
  try {
    console.log('=== CREATE CUSTOMER DEBUG ===');
    console.log('1. Input received:', input);
    
    const insertData = {
      store_id: input.store_id,
      name: input.name,
      phone: input.phone,
      address: input.address || null,
    };
    
    console.log('2. Data to insert:', insertData);
    
    const { data, error } = await supabase
      .from('customers')
      .insert(insertData)
      .select()
      .single();

    console.log('3. Supabase response:', { data, error });

    if (error) {
      console.error('4. Supabase error:', error);
      
      // Handle duplicate errors
      if (error.code === '23505') {
        if (error.message.includes('customers_store_phone_unique')) {
          throw new Error(`Nomor telepon "${input.phone}" sudah terdaftar di toko ini`);
        } else if (error.message.includes('customers_store_name_unique')) {
          throw new Error(`Pelanggan dengan nama "${input.name}" sudah ada di toko ini`);
        }
      }
      
      throw new Error(error.message || 'Gagal menambahkan pelanggan');
    }
    
    if (!data) {
      throw new Error('Tidak ada data yang dikembalikan dari database');
    }
    
    console.log('5. Customer created successfully:', data);
    return data;
  } catch (error: any) {
    console.error('6. Exception:', error);
    throw new Error(error.message || 'Gagal menambahkan pelanggan');
  }
}

/**
 * Update customer
 */
export async function updateCustomer(
  id: number,
  input: Partial<CustomerInput>
): Promise<Customer> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // Handle duplicate errors
      if (error.code === '23505') {
        if (error.message.includes('customers_store_phone_unique')) {
          throw new Error(`Nomor telepon "${input.phone}" sudah terdaftar di toko ini`);
        } else if (error.message.includes('customers_store_name_unique')) {
          throw new Error(`Pelanggan dengan nama "${input.name}" sudah ada di toko ini`);
        }
      }
      throw new Error(error.message || 'Gagal memperbarui pelanggan');
    }
    
    return data;
  } catch (error: any) {
    console.error('Error updating customer:', error);
    throw new Error(error.message || 'Gagal memperbarui pelanggan');
  }
}

/**
 * Delete customer
 */
export async function deleteCustomer(id: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
}
