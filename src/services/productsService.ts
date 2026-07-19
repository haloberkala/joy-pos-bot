import { supabaseAny as db } from '@/lib/supabase';
import type { Product } from '@/types/pos';

export type { Product };

// ── DB Row type (raw Supabase response) ──────────────────────────────────────
type ProductRow = {
  id: number;
  store_id: number;
  code: string;
  name: string;
  category_id: number | null;
  brand_id: number | null;
  unit_id: number | null;
  main_product_id: number | null;
  variant_id: number | null;
  specification_id: number | null;
  size_id: number | null;
  short_name: string | null;
  quantity: number;
  min_stock_alert: number;
  cost_price: number;
  selling_price_retail: number;
  selling_price_wholesale: number;
  selling_price_special: number;
  wholesale_min_qty: number;
  special_min_qty: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories?: { name: string } | null;
  brands?: { name: string } | null;
  units?: { name: string } | null;
  main_products?: { name: string } | null;
  variants?: { name: string } | null;
  specifications?: { name: string } | null;
  sizes?: { name: string } | null;
};

/** Bridge raw DB row → types/pos.ts Product */
function mapProduct(row: ProductRow): Product {
  return {
    ...row,
    // Fields in types/pos.ts not present in DB — provide sensible defaults
    selling_price: row.selling_price_retail,
    created_by: null,
    updated_by: null,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
    category_name: row.categories?.name,
    brand_name: row.brands?.name,
    unit_name: row.units?.name,
    main_product_name: row.main_products?.name,
    variant_name: row.variants?.name,
    specification_name: row.specifications?.name,
    size_name: row.sizes?.name,
  };
}

export interface CreateProductInput {
  store_id: number;
  code: string;
  name: string;
  category_id?: number;
  brand_id?: number;
  unit_id?: number;
  main_product_id?: number;
  variant_id?: number;
  specification_id?: number;
  size_id?: number;
  short_name?: string;
  quantity?: number;
  min_stock_alert?: number;
  cost_price: number;
  selling_price_retail: number;
  selling_price_wholesale?: number;
  selling_price_special?: number;
  wholesale_min_qty?: number;
  special_min_qty?: number;
}

export interface UpdateProductInput {
  name?: string;
  code?: string;
  category_id?: number;
  brand_id?: number;
  unit_id?: number;
  main_product_id?: number;
  variant_id?: number;
  specification_id?: number;
  size_id?: number;
  short_name?: string;
  quantity?: number;
  min_stock_alert?: number;
  cost_price?: number;
  selling_price_retail?: number;
  selling_price_wholesale?: number;
  selling_price_special?: number;
  wholesale_min_qty?: number;
  special_min_qty?: number;
}

/**
 * Get products by store ID
 */
export async function getProductsByStore(storeId: number): Promise<Product[]> {
  try {
    const { data, error } = await db
      .from('products')
      .select('*, categories(name), brands(name), main_products(name), variants(name), specifications(name), sizes(name), units(name)')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapProduct);
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
    const { data, error } = await db
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
    return mapProduct(data);
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
    const { data: product, error: fetchError } = await db
      .from('products')
      .select('quantity')
      .eq('id', productId)
      .single();

    if (fetchError) throw fetchError;

    const newQuantity = product.quantity + quantityChange;

    const { error: updateError } = await db
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
    const { error } = await db
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
    const { data, error } = await db
      .from('products')
      .insert({
        store_id: input.store_id,
        code: input.code,
        name: input.name,
        category_id: input.category_id || null,
        brand_id: input.brand_id || null,
        unit_id: input.unit_id || null,
        main_product_id: input.main_product_id || null,
        variant_id: input.variant_id || null,
        specification_id: input.specification_id || null,
        size_id: input.size_id || null,
        short_name: input.short_name || null,
        quantity: input.quantity || 0,
        min_stock_alert: input.min_stock_alert || 5,
        cost_price: input.cost_price,
        selling_price_retail: input.selling_price_retail,
        selling_price_wholesale: input.selling_price_wholesale || input.selling_price_retail,
        selling_price_special: input.selling_price_special || input.selling_price_retail,
        wholesale_min_qty: input.wholesale_min_qty || 0,
        special_min_qty: input.special_min_qty || 0,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        if (error.message.includes('products_store_id_code_key')) {
          throw new Error(`Barcode/SKU "${input.code}" sudah digunakan di toko ini. Gunakan kode yang berbeda.`);
        } else if (error.message.includes('products_code_unique')) {
          throw new Error(`Barcode/SKU "${input.code}" sudah digunakan. Setiap produk harus memiliki barcode yang unik.`);
        }
      }
      throw error;
    }
    return mapProduct(data);
  } catch (error: any) {
    console.error('Error creating product:', error);
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
    const updateData: Record<string, any> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.code !== undefined) updateData.code = input.code;
    if (input.category_id !== undefined) updateData.category_id = input.category_id;
    if (input.brand_id !== undefined) updateData.brand_id = input.brand_id;
    if (input.unit_id !== undefined) updateData.unit_id = input.unit_id;
    if (input.main_product_id !== undefined) updateData.main_product_id = input.main_product_id;
    if (input.variant_id !== undefined) updateData.variant_id = input.variant_id;
    if (input.specification_id !== undefined) updateData.specification_id = input.specification_id;
    if (input.size_id !== undefined) updateData.size_id = input.size_id;
    if (input.short_name !== undefined) updateData.short_name = input.short_name;
    if (input.quantity !== undefined) updateData.quantity = input.quantity;
    if (input.min_stock_alert !== undefined) updateData.min_stock_alert = input.min_stock_alert;
    if (input.cost_price !== undefined) updateData.cost_price = input.cost_price;
    if (input.selling_price_retail !== undefined) updateData.selling_price_retail = input.selling_price_retail;
    if (input.selling_price_wholesale !== undefined) updateData.selling_price_wholesale = input.selling_price_wholesale;
    if (input.selling_price_special !== undefined) updateData.selling_price_special = input.selling_price_special;
    if (input.wholesale_min_qty !== undefined) updateData.wholesale_min_qty = input.wholesale_min_qty;
    if (input.special_min_qty !== undefined) updateData.special_min_qty = input.special_min_qty;

    const { data, error } = await db
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;
    return mapProduct(data);
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/**
 * Bulk create/upsert products (for Excel import & Bulk Add)
 */
export async function bulkCreateProducts(products: CreateProductInput[]): Promise<{
  success: number;
  errors: string[];
}> {
  try {
    if (products.length === 0) return { success: 0, errors: [] };

    const payload = products.map((input) => ({
      store_id: input.store_id,
      code: input.code,
      name: input.name,
      category_id: input.category_id || null,
      brand_id: input.brand_id || null,
      unit_id: input.unit_id || null,
      main_product_id: input.main_product_id || null,
      variant_id: input.variant_id || null,
      specification_id: input.specification_id || null,
      size_id: input.size_id || null,
      short_name: input.short_name || null,
      quantity: input.quantity || 0,
      min_stock_alert: input.min_stock_alert || 5,
      cost_price: input.cost_price,
      selling_price_retail: input.selling_price_retail,
      selling_price_wholesale: input.selling_price_wholesale || input.selling_price_retail,
      selling_price_special: input.selling_price_special || input.selling_price_retail,
      wholesale_min_qty: input.wholesale_min_qty || 0,
      special_min_qty: input.special_min_qty || 0,
    }));

    // Use bulk upsert. Must specify onConflict constraint name if there is one,
    // or columns. Our migration set a unique constraint on (store_id, code).
    const { data, error } = await db
      .from('products')
      .upsert(payload, { onConflict: 'store_id,code' })
      .select();

    if (error) throw error;

    return {
      success: data ? data.length : payload.length,
      errors: []
    };
  } catch (error: any) {
    console.error('Error in bulk upsert:', error);
    return {
      success: 0,
      errors: [error.message || 'Gagal menyimpan data massal']
    };
  }
}
