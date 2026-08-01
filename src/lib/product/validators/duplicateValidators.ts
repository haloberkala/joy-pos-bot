/**
 * Duplicate Validators
 * 
 * Validates uniqueness of products and barcodes.
 * Contains database query logic.
 * 
 * Duplicate Detection:
 * 1. Barcode Duplicate - Same barcode in same store
 * 2. Product Duplicate - Same master data combination (Brand+MainProduct+Variant+Spec+Size)
 */

import { supabaseAny as db } from '@/lib/supabase';
import { isBarcodeExists } from '@/lib/barcodeUtils';
import {
  MasterDataCombination,
  DuplicateProductResult,
  DuplicateBarcodeResult,
  ExistingProduct,
} from './types';

// ═══════════════════════════════════════════════════════════════════
// BARCODE DUPLICATE VALIDATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if a barcode already exists in the database
 * 
 * @param barcode - The barcode to check
 * @param storeId - The store ID to check within
 * @param excludeProductId - Optional product ID to exclude (for edit mode)
 * @returns Promise<DuplicateBarcodeResult>
 * 
 * Note: This wraps the existing barcodeUtils.isBarcodeExists() function
 */
export async function checkDuplicateBarcode(
  barcode: string,
  storeId: number,
  excludeProductId?: number
): Promise<DuplicateBarcodeResult> {
  try {
    const exists = await isBarcodeExists(barcode, storeId, excludeProductId);
    
    return {
      isDuplicate: exists,
      barcode,
    };
  } catch (error) {
    console.error('Error checking duplicate barcode:', error);
    throw new Error('Gagal memeriksa duplikasi barcode');
  }
}

// ═══════════════════════════════════════════════════════════════════
// PRODUCT DUPLICATE VALIDATION (MASTER DATA COMBINATION)
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if a product with the same master data combination already exists
 * 
 * Duplicate Detection Logic:
 * A product is considered duplicate if ALL of the following match:
 * - brand_id (or both NULL)
 * - main_product_id (required, must match)
 * - variant_id (or both NULL)
 * - specification_id (or both NULL)
 * - size_id (or both NULL)
 * 
 * @param masterData - Master data combination to check
 * @param storeId - Store ID to check within
 * @param excludeProductId - Optional product ID to exclude (for edit mode)
 * @returns Promise<DuplicateProductResult>
 * 
 * Database Query:
 * Uses "IS NOT DISTINCT FROM" for NULL-safe comparison
 * This ensures that:
 * - NULL = NULL (true)
 * - NULL != 1 (true)
 * - 1 = 1 (true)
 * - 1 != 2 (true)
 */
export async function checkDuplicateProductByMasterData(
  masterData: MasterDataCombination,
  storeId: number,
  excludeProductId?: number
): Promise<DuplicateProductResult> {
  try {
    // Build query with NULL-safe comparison
    let query = db
      .from('products')
      .select('id, name, code, quantity, selling_price_retail')
      .eq('store_id', storeId)
      .eq('main_product_id', masterData.main_product_id)
      .eq('is_active', true);

    // Use IS NOT DISTINCT FROM for nullable fields
    // Supabase doesn't have direct "IS NOT DISTINCT FROM" filter
    // We need to handle NULL comparison manually

    // Brand ID comparison
    if (masterData.brand_id === undefined || masterData.brand_id === null) {
      query = query.is('brand_id', null);
    } else {
      query = query.eq('brand_id', masterData.brand_id);
    }

    // Variant ID comparison
    if (masterData.variant_id === undefined || masterData.variant_id === null) {
      query = query.is('variant_id', null);
    } else {
      query = query.eq('variant_id', masterData.variant_id);
    }

    // Specification ID comparison
    if (masterData.specification_id === undefined || masterData.specification_id === null) {
      query = query.is('specification_id', null);
    } else {
      query = query.eq('specification_id', masterData.specification_id);
    }

    // Size ID comparison
    if (masterData.size_id === undefined || masterData.size_id === null) {
      query = query.is('size_id', null);
    } else {
      query = query.eq('size_id', masterData.size_id);
    }

    // Exclude current product if editing
    if (excludeProductId) {
      query = query.neq('id', excludeProductId);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
      console.error('Error checking duplicate product:', error);
      throw error;
    }

    if (!data) {
      return {
        isDuplicate: false,
      };
    }

    // Product exists - return duplicate info
    const existingProduct: ExistingProduct = {
      id: data.id,
      name: data.name,
      code: data.code,
      quantity: data.quantity,
      selling_price_retail: data.selling_price_retail,
    };

    return {
      isDuplicate: true,
      existingProduct,
    };
  } catch (error) {
    console.error('Error checking duplicate product by master data:', error);
    throw new Error('Gagal memeriksa duplikasi produk');
  }
}

// ═══════════════════════════════════════════════════════════════════
// COMBINED DUPLICATE VALIDATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Check both barcode and product duplicates in one call
 * 
 * @param barcode - Barcode to check
 * @param masterData - Master data combination to check
 * @param storeId - Store ID
 * @param excludeProductId - Optional product ID to exclude (for edit)
 * @returns Promise<{ barcode: DuplicateBarcodeResult, product: DuplicateProductResult }>
 */
export async function checkAllDuplicates(
  barcode: string,
  masterData: MasterDataCombination,
  storeId: number,
  excludeProductId?: number
): Promise<{
  barcode: DuplicateBarcodeResult;
  product: DuplicateProductResult;
}> {
  // Run both checks in parallel for performance
  const [barcodeResult, productResult] = await Promise.all([
    checkDuplicateBarcode(barcode, storeId, excludeProductId),
    checkDuplicateProductByMasterData(masterData, storeId, excludeProductId),
  ]);

  return {
    barcode: barcodeResult,
    product: productResult,
  };
}

// ═══════════════════════════════════════════════════════════════════
// BATCH DUPLICATE VALIDATION (FOR BULK IMPORTS)
// ═══════════════════════════════════════════════════════════════════

/**
 * Fetch all existing barcodes for a store
 * Used for bulk validation to avoid N queries
 * 
 * @param storeId - Store ID
 * @returns Promise<Set<string>> - Set of existing barcodes (lowercased for case-insensitive comparison)
 */
export async function fetchExistingBarcodes(storeId: number): Promise<Set<string>> {
  try {
    const { data, error } = await db
      .from('products')
      .select('code')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching existing barcodes:', error);
      throw error;
    }

    // Return lowercase set for case-insensitive comparison
    return new Set((data || []).map(p => p.code.toLowerCase()));
  } catch (error) {
    console.error('Error fetching existing barcodes:', error);
    throw new Error('Gagal mengambil data barcode existing');
  }
}

/**
 * Fetch all existing product combinations for a store
 * Used for bulk validation to avoid N queries
 * 
 * @param storeId - Store ID
 * @returns Promise<Map<string, ExistingProduct>> - Map of combination key to product info
 */
export async function fetchExistingProductCombinations(
  storeId: number
): Promise<Map<string, ExistingProduct>> {
  try {
    const { data, error } = await db
      .from('products')
      .select('id, name, code, quantity, selling_price_retail, brand_id, main_product_id, variant_id, specification_id, size_id')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching existing product combinations:', error);
      throw error;
    }

    // Build map: combination key -> product info
    const combinationMap = new Map<string, ExistingProduct>();
    
    (data || []).forEach(product => {
      const key = createCombinationKey({
        brand_id: product.brand_id,
        main_product_id: product.main_product_id,
        variant_id: product.variant_id,
        specification_id: product.specification_id,
        size_id: product.size_id,
      });
      
      combinationMap.set(key, {
        id: product.id,
        name: product.name,
        code: product.code,
        quantity: product.quantity,
        selling_price_retail: product.selling_price_retail,
      });
    });

    return combinationMap;
  } catch (error) {
    console.error('Error fetching existing product combinations:', error);
    throw new Error('Gagal mengambil data kombinasi produk existing');
  }
}

/**
 * Create a unique key from master data combination
 * Used for in-memory duplicate detection
 * 
 * Format: "brand_id|main_product_id|variant_id|spec_id|size_id"
 * NULL values are represented as "null" string
 * 
 * @param masterData - Master data combination
 * @returns string - Unique combination key
 */
export function createCombinationKey(masterData: MasterDataCombination): string {
  return [
    masterData.brand_id ?? 'null',
    masterData.main_product_id,
    masterData.variant_id ?? 'null',
    masterData.specification_id ?? 'null',
    masterData.size_id ?? 'null',
  ].join('|');
}

/**
 * Check if barcode exists in cached set
 * Used for bulk validation - checks in-memory instead of database
 * 
 * @param barcode - Barcode to check
 * @param existingBarcodes - Set of existing barcodes (from fetchExistingBarcodes)
 * @param excludeBarcode - Optional barcode to exclude (for in-file duplicate tracking)
 * @returns boolean - True if duplicate found
 */
export function checkDuplicateBarcodeInMemory(
  barcode: string,
  existingBarcodes: Set<string>,
  excludeBarcode?: string
): boolean {
  const lowerBarcode = barcode.toLowerCase();
  if (excludeBarcode && lowerBarcode === excludeBarcode.toLowerCase()) {
    return false;
  }
  return existingBarcodes.has(lowerBarcode);
}

/**
 * Check if product combination exists in cached map
 * Used for bulk validation - checks in-memory instead of database
 * 
 * @param masterData - Master data combination to check
 * @param existingCombinations - Map of existing combinations (from fetchExistingProductCombinations)
 * @returns ExistingProduct | null - Existing product if duplicate found, null otherwise
 */
export function checkDuplicateProductInMemory(
  masterData: MasterDataCombination,
  existingCombinations: Map<string, ExistingProduct>
): ExistingProduct | null {
  const key = createCombinationKey(masterData);
  return existingCombinations.get(key) || null;
}
