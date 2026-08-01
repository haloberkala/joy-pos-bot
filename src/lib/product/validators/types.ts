/**
 * Product Validation Types
 * 
 * Central type definitions for product validation layer.
 * Used by all validators and UI components.
 */

// ═══════════════════════════════════════════════════════════════════
// INPUT TYPES
// ═══════════════════════════════════════════════════════════════════

/**
 * Product input data for validation
 * Represents the product data that needs to be validated before create/update
 */
export interface ProductInput {
  // Required master data
  category_id: number;
  main_product_id: number;
  unit_id: number;
  
  // Optional master data
  brand_id?: number;
  variant_id?: number;
  specification_id?: number;
  size_id?: number;
  
  // Barcode/SKU
  code: string;
  
  // Inventory fields
  quantity: number;
  min_stock_alert: number;
  
  // Price fields
  cost_price: number;
  selling_price_retail: number;
  selling_price_wholesale: number;
  selling_price_special: number;
  
  // Quantity threshold fields
  wholesale_min_qty: number;
  special_min_qty: number;
}

/**
 * Master data combination for duplicate detection
 * Represents the unique combination that identifies a product
 */
export interface MasterDataCombination {
  brand_id?: number;
  main_product_id: number;
  variant_id?: number;
  specification_id?: number;
  size_id?: number;
}

/**
 * Price input for business rule validation
 */
export interface PriceInput {
  cost_price: number;
  selling_price_retail: number;
  selling_price_wholesale: number;
  selling_price_special: number;
}

/**
 * Quantity threshold input for business rule validation
 */
export interface QuantityThresholdInput {
  wholesale_min_qty: number;
  special_min_qty: number;
}

// ═══════════════════════════════════════════════════════════════════
// RESULT TYPES
// ═══════════════════════════════════════════════════════════════════

/**
 * Validation error codes
 * Used to identify the type of validation error for programmatic handling
 */
export enum ValidationErrorCode {
  // Required field errors
  REQUIRED_FIELD = 'REQUIRED_FIELD',
  
  // Number validation errors
  INVALID_NUMBER = 'INVALID_NUMBER',
  NEGATIVE_NUMBER = 'NEGATIVE_NUMBER',
  
  // Business rule errors
  PRICE_BELOW_COST = 'PRICE_BELOW_COST',
  WHOLESALE_ABOVE_RETAIL = 'WHOLESALE_ABOVE_RETAIL',
  SPECIAL_ABOVE_WHOLESALE = 'SPECIAL_ABOVE_WHOLESALE',
  SPECIAL_QTY_BELOW_WHOLESALE = 'SPECIAL_QTY_BELOW_WHOLESALE',
  
  // Duplicate errors
  DUPLICATE_BARCODE = 'DUPLICATE_BARCODE',
  DUPLICATE_PRODUCT = 'DUPLICATE_PRODUCT',
  
  // Master data errors
  INVALID_MASTER_DATA = 'INVALID_MASTER_DATA',
}

/**
 * Single validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: ValidationErrorCode;
}

/**
 * Complete validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Existing product information (for duplicate detection)
 */
export interface ExistingProduct {
  id: number;
  name: string;
  code: string;
  quantity: number;
  selling_price_retail: number;
}

/**
 * Duplicate product check result
 */
export interface DuplicateProductResult {
  isDuplicate: boolean;
  existingProduct?: ExistingProduct;
}

/**
 * Duplicate barcode check result
 */
export interface DuplicateBarcodeResult {
  isDuplicate: boolean;
  barcode: string;
}

// ═══════════════════════════════════════════════════════════════════
// HELPER TYPES
// ═══════════════════════════════════════════════════════════════════

/**
 * Field validation result (for internal use)
 * Used by individual field validators before combining into ValidationResult
 */
export interface FieldValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Business rule validation result (for internal use)
 */
export interface BusinessRuleResult {
  isValid: boolean;
  errors: ValidationError[];
}
