import { supabase } from '@/lib/supabase';

export interface Product {
  id: number;
  store_id: number;
  code: string;
  name: string;
  category_id: number | null;
  brand_id: number | null;
  unit_id: number | null;
  quantity: number;
  min_stock_alert: number;
  cost_price: number;
  selling_price_retail: number;
  selling_price_wholesale: number;
  selling_price_special: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  store_id: number;
  code: string;
  name: string;
  category_id?: number;
  brand_id?: number;
  unit_id?: number;
  quantity?: number;
  min_stock_alert?: number;
  cost_price: number;
  selling_price_retail: number;
  selling_price_wholesale?: number;
  selling_price_special?: number;
}

export interface UpdateProductInput {
  name?: string;
  code?: string;
  category_id?: number;
  brand_id?: number;
  unit_id?: number;
  quantity?: number;
  min_stock_alert?: number;
  cost_price?: number;
  selling_price_retail?: number;
  selling_price_wholesale?: number;
  selling_price_special?: number;
}

/**
 * Get products by store ID
 */
export async function getProductsByStore(storeId: number): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

/**
 * Get product by code
 */
export async function getProductByCode(storeId: number, code: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error fetching product by code:', error);
    throw error;
  }
}

/**
 * Update product quantity (for sales)
 */
export async function updateProductQuantity(
  productId: number,
  quantityChange: number
): Promise<void> {
  try {
    // Get current quantity
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('quantity')
      .eq('id', productId)
      .single();

    if (fetchError) throw fetchError;

    // Update quantity
    const newQuantity = product.quantity + quantityChange;
    
    const { error: updateError } = await supabase
      .from('products')
      .update({ quantity: newQuantity })
      .eq('id', productId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error updating product quantity:', error);
    throw error;
  }
}

/**
 * Delete product (soft delete by setting is_active to false)
 */
export async function deleteProduct(productId: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', productId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

/**
 * Create product
 */
export async function createProduct(input: CreateProductInput): Promise<Product> {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert({
        store_id: input.store_id,
        code: input.code,
        name: input.name,
        category_id: input.category_id || null,
        brand_id: input.brand_id || null,
        unit_id: input.unit_id || null,
        quantity: input.quantity || 0,
        min_stock_alert: input.min_stock_alert || 5,
        cost_price: input.cost_price,
        selling_price_retail: input.selling_price_retail,
        selling_price_wholesale: input.selling_price_wholesale || input.selling_price_retail,
        selling_price_special: input.selling_price_special || input.selling_price_retail,
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate barcode/SKU error
      if (error.code === '23505') {
        if (error.message.includes('products_store_id_code_key')) {
          throw new Error(`Barcode/SKU "${input.code}" sudah digunakan di toko ini. Gunakan kode yang berbeda.`);
        } else if (error.message.includes('products_code_unique')) {
          throw new Error(`Barcode/SKU "${input.code}" sudah digunakan. Setiap produk harus memiliki barcode yang unik.`);
        }
      }
      throw error;
    }
    return data;
  } catch (error: any) {
    console.error('Error creating product:', error);
    // Re-throw with user-friendly message if available
    if (error.message && !error.message.includes('duplicate key')) {
      throw error;
    }
    throw new Error(error.message || 'Gagal menambahkan produk');
  }
}

/**
 * Update product
 */
export async function updateProduct(productId: number, input: UpdateProductInput): Promise<Product> {
  try {
    const updateData: any = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.code !== undefined) updateData.code = input.code;
    if (input.category_id !== undefined) updateData.category_id = input.category_id;
    if (input.brand_id !== undefined) updateData.brand_id = input.brand_id;
    if (input.unit_id !== undefined) updateData.unit_id = input.unit_id;
    if (input.quantity !== undefined) updateData.quantity = input.quantity;
    if (input.min_stock_alert !== undefined) updateData.min_stock_alert = input.min_stock_alert;
    if (input.cost_price !== undefined) updateData.cost_price = input.cost_price;
    if (input.selling_price_retail !== undefined) updateData.selling_price_retail = input.selling_price_retail;
    if (input.selling_price_wholesale !== undefined) updateData.selling_price_wholesale = input.selling_price_wholesale;
    if (input.selling_price_special !== undefined) updateData.selling_price_special = input.selling_price_special;

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/**
 * Bulk create products (for Excel import)
 */
export async function bulkCreateProducts(products: CreateProductInput[]): Promise<{
  success: number;
  errors: string[];
}> {
  let successCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < products.length; i++) {
    try {
      await createProduct(products[i]);
      successCount++;
    } catch (error: any) {
      const rowNum = i + 2; // +2 because Excel starts at 1 and has header row
      const productCode = products[i].code;
      const productName = products[i].name;
      
      // Extract user-friendly error message
      let errorMsg = error.message || 'Gagal menambahkan produk';
      
      // Format error message with product details
      errors.push(`Baris ${rowNum} (${productCode} - ${productName}): ${errorMsg}`);
    }
  }

  return { success: successCount, errors };
}
