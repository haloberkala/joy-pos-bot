/**
 * Barcode Utility
 * 
 * Handles barcode generation and validation across the system.
 * Ensures uniqueness and consistency for all product barcodes.
 */

import { supabaseAny as db } from '@/lib/supabase';

/**
 * Generate a random 16-digit barcode
 * Format: 16 digits, numeric only
 * Example: 1284729136482741
 */
export function generateRandomBarcode(): string {
  let barcode = '';
  for (let i = 0; i < 16; i++) {
    barcode += Math.floor(Math.random() * 10).toString();
  }
  return barcode;
}

/**
 * Check if a barcode already exists in the database
 * @param barcode - The barcode to check
 * @param storeId - The store ID to check within
 * @param excludeProductId - Optional product ID to exclude (for edit mode)
 * @returns true if barcode exists (duplicate), false if unique
 */
export async function isBarcodeExists(
  barcode: string, 
  storeId: number,
  excludeProductId?: number
): Promise<boolean> {
  try {
    let query = db
      .from('products')
      .select('id')
      .eq('store_id', storeId)
      .eq('code', barcode)
      .eq('is_active', true);
    
    // If editing, exclude current product from check
    if (excludeProductId) {
      query = query.neq('id', excludeProductId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking barcode existence:', error);
    throw error;
  }
}

/**
 * Generate a unique barcode that doesn't exist in the database
 * Retries up to maxAttempts times to avoid collision
 * 
 * @param storeId - The store ID to check uniqueness within
 * @param maxAttempts - Maximum number of generation attempts (default: 10)
 * @returns A unique barcode
 * @throws Error if unable to generate unique barcode after max attempts
 */
export async function generateUniqueBarcode(
  storeId: number,
  maxAttempts: number = 10
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const barcode = generateRandomBarcode();
    const exists = await isBarcodeExists(barcode, storeId);
    
    if (!exists) {
      return barcode;
    }
    
    // If collision detected, log and retry
    console.warn(`Barcode collision detected: ${barcode}, retrying... (attempt ${attempt + 1}/${maxAttempts})`);
  }
  
  throw new Error(`Gagal generate barcode unik setelah ${maxAttempts} percobaan. Silakan coba lagi.`);
}

/**
 * Check if a value is the placeholder "-" that should trigger auto-generation
 * @param value - The value to check
 * @returns true if value is the placeholder "-"
 */
export function isAutoGeneratePlaceholder(value: string | undefined | null): boolean {
  return value?.trim() === '-';
}

/**
 * Process barcode value:
 * - If "-", generate unique barcode
 * - If manual value, validate uniqueness
 * - Returns processed barcode or throws error
 * 
 * @param value - User input barcode value
 * @param storeId - Store ID for uniqueness check
 * @param excludeProductId - Optional product ID to exclude (for edit)
 * @returns Processed barcode (either generated or validated manual input)
 * @throws Error if manual barcode is duplicate
 */
export async function processBarcodeValue(
  value: string,
  storeId: number,
  excludeProductId?: number
): Promise<string> {
  const trimmedValue = value.trim();
  
  // If placeholder, generate unique barcode
  if (isAutoGeneratePlaceholder(trimmedValue)) {
    return await generateUniqueBarcode(storeId);
  }
  
  // If manual value, check for duplicates
  const exists = await isBarcodeExists(trimmedValue, storeId, excludeProductId);
  
  if (exists) {
    throw new Error(`Barcode "${trimmedValue}" sudah digunakan. Gunakan barcode lain atau isi "-" untuk generate otomatis.`);
  }
  
  return trimmedValue;
}

/**
 * Process nullable field placeholder
 * If value is "-", return null (not the string "-")
 * Otherwise return the value as-is
 * 
 * @param value - Field value
 * @returns null if "-", otherwise the original value
 */
export function processNullablePlaceholder(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === '-' || trimmed === '') return null;
  return trimmed;
}
