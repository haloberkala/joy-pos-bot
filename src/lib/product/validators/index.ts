/**
 * Product Validators - Public API
 * 
 * Central export point for all product validation functionality.
 * Import from here in UI components.
 * 
 * Example Usage:
 * ```typescript
 * import { validateProductForCreate, ValidationErrorCode } from '@/lib/product/validators';
 * 
 * const result = await validateProductForCreate(productData, storeId);
 * if (!result.isValid) {
 *   result.errors.forEach(error => {
 *     if (error.code === ValidationErrorCode.DUPLICATE_PRODUCT) {
 *       // Handle duplicate product error
 *     }
 *   });
 * }
 * ```
 */

// Main validation functions (most commonly used)
export {
  validateProductForCreate,
  validateProductForUpdate,
  checkDuplicateProduct,
} from './productValidator';

// Types
export type {
  ProductInput,
  MasterDataCombination,
  ValidationResult,
  ValidationError,
  DuplicateProductResult,
  DuplicateBarcodeResult,
  ExistingProduct,
  PriceInput,
  QuantityThresholdInput,
} from './types';

export { ValidationErrorCode } from './types';

// Individual validators (for advanced use cases)
export {
  validateRequiredFields,
  validateNumberFields,
  validateMasterDataIds,
} from './fieldValidators';

export {
  validatePriceHierarchy,
  validateQuantityThresholds,
  validateAllBusinessRules,
} from './businessRuleValidators';

export {
  checkDuplicateBarcode,
  checkDuplicateProductByMasterData,
  checkAllDuplicates,
} from './duplicateValidators';
