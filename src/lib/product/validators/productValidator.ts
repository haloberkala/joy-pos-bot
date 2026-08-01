/**
 * Product Validator (Main Orchestrator)
 * 
 * Central entry point for all product validation.
 * Coordinates field validators, business rule validators, and duplicate validators.
 * 
 * Public API:
 * - validateProductForCreate() - Validate before creating a new product
 * - validateProductForUpdate() - Validate before updating an existing product
 * - checkDuplicateProduct() - Realtime duplicate check for UX warnings
 * 
 * Usage:
 * ```typescript
 * // In AddProductModal.tsx
 * const result = await validateProductForCreate(payload, storeId);
 * if (!result.isValid) {
 *   // Show errors
 *   result.errors.forEach(err => toast.error(err.message));
 *   return;
 * }
 * // Proceed with save
 * ```
 */

import {
  validateRequiredFields,
  validateNumberFields,
  validateMasterDataIds,
} from './fieldValidators';
import {
  validateAllBusinessRules,
} from './businessRuleValidators';
import {
  checkDuplicateBarcode,
  checkDuplicateProductByMasterData,
  checkAllDuplicates,
} from './duplicateValidators';
import {
  ProductInput,
  MasterDataCombination,
  ValidationResult,
  ValidationError,
  ValidationErrorCode,
  DuplicateProductResult,
} from './types';

// ═══════════════════════════════════════════════════════════════════
// CREATE VALIDATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Validate product data before creating a new product
 * 
 * Validation Pipeline:
 * 1. Required field validation
 * 2. Number field validation
 * 3. Master data ID validation
 * 4. Business rule validation (price hierarchy, quantity thresholds)
 * 5. Duplicate barcode check
 * 6. Duplicate product check (master data combination)
 * 
 * @param input - Product input data to validate
 * @param storeId - Store ID for duplicate checks
 * @returns Promise<ValidationResult>
 * 
 * Note: This is comprehensive validation - all rules are checked.
 * If any validation fails, the entire operation should be rejected.
 */
export async function validateProductForCreate(
  input: ProductInput,
  storeId: number
): Promise<ValidationResult> {
  const allErrors: ValidationError[] = [];

  // ─── Step 1: Field Validation ───────────────────────────────────
  // Check required fields, number formats, master data IDs
  // These are synchronous and fast
  
  const requiredResult = validateRequiredFields(input);
  allErrors.push(...requiredResult.errors);

  const numberResult = validateNumberFields(input);
  allErrors.push(...numberResult.errors);

  const masterDataResult = validateMasterDataIds(input);
  allErrors.push(...masterDataResult.errors);

  // Early exit if field validation fails
  // No point checking business rules or duplicates if basic fields are invalid
  if (allErrors.length > 0) {
    return {
      isValid: false,
      errors: allErrors,
    };
  }

  // ─── Step 2: Business Rule Validation ───────────────────────────
  // Check price hierarchy and quantity thresholds
  
  const businessRuleResult = validateAllBusinessRules(
    {
      cost_price: input.cost_price,
      selling_price_retail: input.selling_price_retail,
      selling_price_wholesale: input.selling_price_wholesale,
      selling_price_special: input.selling_price_special,
    },
    {
      wholesale_min_qty: input.wholesale_min_qty,
      special_min_qty: input.special_min_qty,
    }
  );
  allErrors.push(...businessRuleResult.errors);

  // ─── Step 3: Duplicate Validation ───────────────────────────────
  // Check for duplicate barcode and duplicate product (master data combination)
  // These require database queries, so they're async
  
  const masterDataCombination: MasterDataCombination = {
    brand_id: input.brand_id,
    main_product_id: input.main_product_id,
    variant_id: input.variant_id,
    specification_id: input.specification_id,
    size_id: input.size_id,
  };

  try {
    const duplicateChecks = await checkAllDuplicates(
      input.code,
      masterDataCombination,
      storeId
    );

    // Duplicate barcode error
    if (duplicateChecks.barcode.isDuplicate) {
      allErrors.push({
        field: 'code',
        message: `Barcode "${input.code}" sudah digunakan. Gunakan barcode lain atau isi "-" untuk generate otomatis.`,
        code: ValidationErrorCode.DUPLICATE_BARCODE,
      });
    }

    // Duplicate product error
    if (duplicateChecks.product.isDuplicate && duplicateChecks.product.existingProduct) {
      const existing = duplicateChecks.product.existingProduct;
      allErrors.push({
        field: 'master_data',
        message: `Produk dengan kombinasi master data yang sama sudah ada:\n` +
          `Nama: ${existing.name}\n` +
          `Barcode: ${existing.code}\n` +
          `Stok: ${existing.quantity}\n` +
          `Harga: Rp ${existing.selling_price_retail.toLocaleString()}\n\n` +
          `Silakan ubah Brand, Varian, Spesifikasi, atau Ukuran untuk membuat produk baru.`,
        code: ValidationErrorCode.DUPLICATE_PRODUCT,
      });
    }
  } catch (error) {
    console.error('Error during duplicate validation:', error);
    // If duplicate check fails, we should fail the validation
    // Better to be conservative and prevent potentially duplicate products
    allErrors.push({
      field: 'system',
      message: 'Gagal memeriksa duplikasi produk. Silakan coba lagi.',
      code: ValidationErrorCode.DUPLICATE_PRODUCT,
    });
  }

  // ─── Final Result ────────────────────────────────────────────────
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}

// ═══════════════════════════════════════════════════════════════════
// UPDATE VALIDATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Validate product data before updating an existing product
 * 
 * Similar to create validation, but:
 * - Excludes current product ID from duplicate checks
 * - Quantity validation is optional (stock managed separately in edit mode)
 * 
 * @param productId - ID of product being updated (for duplicate exclusion)
 * @param input - Product input data to validate
 * @param storeId - Store ID for duplicate checks
 * @returns Promise<ValidationResult>
 */
export async function validateProductForUpdate(
  productId: number,
  input: Partial<ProductInput>,
  storeId: number
): Promise<ValidationResult> {
  const allErrors: ValidationError[] = [];

  // ─── Step 1: Field Validation ───────────────────────────────────
  // For updates, only validate fields that are provided
  
  if (Object.keys(input).length > 0) {
    const requiredResult = validateRequiredFields(input);
    allErrors.push(...requiredResult.errors);

    const numberResult = validateNumberFields(input);
    allErrors.push(...numberResult.errors);

    const masterDataResult = validateMasterDataIds(input);
    allErrors.push(...masterDataResult.errors);
  }

  // Early exit if field validation fails
  if (allErrors.length > 0) {
    return {
      isValid: false,
      errors: allErrors,
    };
  }

  // ─── Step 2: Business Rule Validation ───────────────────────────
  // Only validate if all price/quantity fields are present
  
  const hasPriceFields = 
    input.cost_price !== undefined &&
    input.selling_price_retail !== undefined &&
    input.selling_price_wholesale !== undefined &&
    input.selling_price_special !== undefined;

  const hasQuantityFields =
    input.wholesale_min_qty !== undefined &&
    input.special_min_qty !== undefined;

  if (hasPriceFields && hasQuantityFields) {
    const businessRuleResult = validateAllBusinessRules(
      {
        cost_price: input.cost_price!,
        selling_price_retail: input.selling_price_retail!,
        selling_price_wholesale: input.selling_price_wholesale!,
        selling_price_special: input.selling_price_special!,
      },
      {
        wholesale_min_qty: input.wholesale_min_qty!,
        special_min_qty: input.special_min_qty!,
      }
    );
    allErrors.push(...businessRuleResult.errors);
  }

  // ─── Step 3: Duplicate Validation ───────────────────────────────
  // Only check duplicates if relevant fields are being updated
  
  try {
    // Check barcode duplicate if code is being updated
    if (input.code) {
      const barcodeCheck = await checkDuplicateBarcode(
        input.code,
        storeId,
        productId // Exclude current product
      );

      if (barcodeCheck.isDuplicate) {
        allErrors.push({
          field: 'code',
          message: `Barcode "${input.code}" sudah digunakan oleh produk lain.`,
          code: ValidationErrorCode.DUPLICATE_BARCODE,
        });
      }
    }

    // Check product duplicate if master data is being updated
    const hasMasterData = 
      input.main_product_id !== undefined ||
      input.brand_id !== undefined ||
      input.variant_id !== undefined ||
      input.specification_id !== undefined ||
      input.size_id !== undefined;

    if (hasMasterData && input.main_product_id) {
      const masterDataCombination: MasterDataCombination = {
        brand_id: input.brand_id,
        main_product_id: input.main_product_id,
        variant_id: input.variant_id,
        specification_id: input.specification_id,
        size_id: input.size_id,
      };

      const productCheck = await checkDuplicateProductByMasterData(
        masterDataCombination,
        storeId,
        productId // Exclude current product
      );

      if (productCheck.isDuplicate && productCheck.existingProduct) {
        const existing = productCheck.existingProduct;
        allErrors.push({
          field: 'master_data',
          message: `Produk dengan kombinasi master data yang sama sudah ada:\n` +
            `Nama: ${existing.name}\n` +
            `Barcode: ${existing.code}\n\n` +
            `Silakan gunakan kombinasi master data yang berbeda.`,
          code: ValidationErrorCode.DUPLICATE_PRODUCT,
        });
      }
    }
  } catch (error) {
    console.error('Error during duplicate validation:', error);
    allErrors.push({
      field: 'system',
      message: 'Gagal memeriksa duplikasi produk. Silakan coba lagi.',
      code: ValidationErrorCode.DUPLICATE_PRODUCT,
    });
  }

  // ─── Final Result ────────────────────────────────────────────────
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}

// ═══════════════════════════════════════════════════════════════════
// REALTIME DUPLICATE CHECK (FOR UX WARNINGS)
// ═══════════════════════════════════════════════════════════════════

/**
 * Check for duplicate product by master data combination (realtime)
 * 
 * Use this for showing warnings in the UI as the user selects master data.
 * This is non-blocking - user can still save if they want.
 * 
 * @param masterData - Master data combination to check
 * @param storeId - Store ID
 * @param excludeProductId - Optional product ID to exclude (for edit)
 * @returns Promise<DuplicateProductResult>
 * 
 * Usage:
 * ```typescript
 * // In AddProductModal.tsx, inside useMemo or useEffect
 * const duplicateCheck = await checkDuplicateProduct(
 *   { brand_id, main_product_id, variant_id, specification_id, size_id },
 *   storeId
 * );
 * 
 * if (duplicateCheck.isDuplicate) {
 *   // Show warning banner
 * }
 * ```
 */
export async function checkDuplicateProduct(
  masterData: MasterDataCombination,
  storeId: number,
  excludeProductId?: number
): Promise<DuplicateProductResult> {
  return await checkDuplicateProductByMasterData(masterData, storeId, excludeProductId);
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

// Re-export types for convenience
export type {
  ProductInput,
  MasterDataCombination,
  ValidationResult,
  ValidationError,
  DuplicateProductResult,
} from './types';

export { ValidationErrorCode } from './types';
