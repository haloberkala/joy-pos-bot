/**
 * Field-level Validators
 * 
 * Pure functions for validating individual fields and field groups.
 * No database calls, no side effects.
 * 
 * Validation Categories:
 * 1. Required Fields - Must be present and non-empty
 * 2. Number Fields - Must be valid numbers with >= 0 constraint
 * 3. Master Data Fields - Must be valid IDs
 */

import {
  ProductInput,
  FieldValidationResult,
  ValidationError,
  ValidationErrorCode,
} from './types';

// ═══════════════════════════════════════════════════════════════════
// REQUIRED FIELD VALIDATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Validate all required fields are present and non-empty
 * 
 * Required Fields:
 * - category_id, main_product_id, unit_id (master data)
 * - code (barcode/SKU)
 * - quantity, min_stock_alert (inventory)
 * - cost_price, selling_price_retail, selling_price_wholesale, selling_price_special (prices)
 * - wholesale_min_qty, special_min_qty (quantity thresholds)
 */
export function validateRequiredFields(input: Partial<ProductInput>): FieldValidationResult {
  const errors: ValidationError[] = [];

  // Required master data fields
  if (!input.category_id) {
    errors.push({
      field: 'category_id',
      message: 'Kategori wajib dipilih',
      code: ValidationErrorCode.REQUIRED_FIELD,
    });
  }

  if (!input.main_product_id) {
    errors.push({
      field: 'main_product_id',
      message: 'Produk Utama wajib dipilih',
      code: ValidationErrorCode.REQUIRED_FIELD,
    });
  }

  if (!input.unit_id) {
    errors.push({
      field: 'unit_id',
      message: 'Satuan wajib dipilih',
      code: ValidationErrorCode.REQUIRED_FIELD,
    });
  }

  // Barcode/SKU validation
  if (!input.code || !input.code.trim()) {
    errors.push({
      field: 'code',
      message: 'Barcode/SKU wajib diisi',
      code: ValidationErrorCode.REQUIRED_FIELD,
    });
  }

  // Inventory fields validation
  if (input.quantity === undefined || input.quantity === null) {
    errors.push({
      field: 'quantity',
      message: 'Stok Awal wajib diisi',
      code: ValidationErrorCode.REQUIRED_FIELD,
    });
  }

  if (input.min_stock_alert === undefined || input.min_stock_alert === null) {
    errors.push({
      field: 'min_stock_alert',
      message: 'Stok Minimum wajib diisi',
      code: ValidationErrorCode.REQUIRED_FIELD,
    });
  }

  // Price fields validation
  if (input.cost_price === undefined || input.cost_price === null) {
    errors.push({
      field: 'cost_price',
      message: 'Harga Modal wajib diisi',
      code: ValidationErrorCode.REQUIRED_FIELD,
    });
  }

  if (input.selling_price_retail === undefined || input.selling_price_retail === null) {
    errors.push({
      field: 'selling_price_retail',
      message: 'Harga Jual Eceran wajib diisi',
      code: ValidationErrorCode.REQUIRED_FIELD,
    });
  }

  if (input.selling_price_wholesale === undefined || input.selling_price_wholesale === null) {
    errors.push({
      field: 'selling_price_wholesale',
      message: 'Harga Jual Grosir wajib diisi',
      code: ValidationErrorCode.REQUIRED_FIELD,
    });
  }

  if (input.selling_price_special === undefined || input.selling_price_special === null) {
    errors.push({
      field: 'selling_price_special',
      message: 'Harga Jual Spesial wajib diisi',
      code: ValidationErrorCode.REQUIRED_FIELD,
    });
  }

  // Quantity threshold fields validation
  if (input.wholesale_min_qty === undefined || input.wholesale_min_qty === null) {
    errors.push({
      field: 'wholesale_min_qty',
      message: 'Min. Qty Grosir wajib diisi',
      code: ValidationErrorCode.REQUIRED_FIELD,
    });
  }

  if (input.special_min_qty === undefined || input.special_min_qty === null) {
    errors.push({
      field: 'special_min_qty',
      message: 'Min. Qty Spesial wajib diisi',
      code: ValidationErrorCode.REQUIRED_FIELD,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════════
// NUMBER FIELD VALIDATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Validate numeric fields are valid numbers and meet constraints
 * 
 * Rules:
 * - quantity: Can be negative (overselling allowed)
 * - min_stock_alert: Must be >= 0
 * - All prices: Must be >= 0
 * - All min quantities: Must be >= 0
 */
export function validateNumberFields(input: Partial<ProductInput>): FieldValidationResult {
  const errors: ValidationError[] = [];

  // Quantity validation - can be negative (overselling)
  if (input.quantity !== undefined && input.quantity !== null) {
    if (isNaN(input.quantity)) {
      errors.push({
        field: 'quantity',
        message: 'Stok Awal harus berupa angka',
        code: ValidationErrorCode.INVALID_NUMBER,
      });
    }
  }

  // Min stock alert validation - must be >= 0
  if (input.min_stock_alert !== undefined && input.min_stock_alert !== null) {
    if (isNaN(input.min_stock_alert)) {
      errors.push({
        field: 'min_stock_alert',
        message: 'Stok Minimum harus berupa angka',
        code: ValidationErrorCode.INVALID_NUMBER,
      });
    } else if (input.min_stock_alert < 0) {
      errors.push({
        field: 'min_stock_alert',
        message: 'Stok Minimum tidak boleh negatif (minimal 0)',
        code: ValidationErrorCode.NEGATIVE_NUMBER,
      });
    }
  }

  // Price validations - all must be >= 0
  if (input.cost_price !== undefined && input.cost_price !== null) {
    if (isNaN(input.cost_price)) {
      errors.push({
        field: 'cost_price',
        message: 'Harga Modal harus berupa angka',
        code: ValidationErrorCode.INVALID_NUMBER,
      });
    } else if (input.cost_price < 0) {
      errors.push({
        field: 'cost_price',
        message: 'Harga Modal tidak boleh negatif',
        code: ValidationErrorCode.NEGATIVE_NUMBER,
      });
    }
  }

  if (input.selling_price_retail !== undefined && input.selling_price_retail !== null) {
    if (isNaN(input.selling_price_retail)) {
      errors.push({
        field: 'selling_price_retail',
        message: 'Harga Jual Eceran harus berupa angka',
        code: ValidationErrorCode.INVALID_NUMBER,
      });
    } else if (input.selling_price_retail < 0) {
      errors.push({
        field: 'selling_price_retail',
        message: 'Harga Jual Eceran tidak boleh negatif',
        code: ValidationErrorCode.NEGATIVE_NUMBER,
      });
    }
  }

  if (input.selling_price_wholesale !== undefined && input.selling_price_wholesale !== null) {
    if (isNaN(input.selling_price_wholesale)) {
      errors.push({
        field: 'selling_price_wholesale',
        message: 'Harga Jual Grosir harus berupa angka',
        code: ValidationErrorCode.INVALID_NUMBER,
      });
    } else if (input.selling_price_wholesale < 0) {
      errors.push({
        field: 'selling_price_wholesale',
        message: 'Harga Jual Grosir tidak boleh negatif',
        code: ValidationErrorCode.NEGATIVE_NUMBER,
      });
    }
  }

  if (input.selling_price_special !== undefined && input.selling_price_special !== null) {
    if (isNaN(input.selling_price_special)) {
      errors.push({
        field: 'selling_price_special',
        message: 'Harga Jual Spesial harus berupa angka',
        code: ValidationErrorCode.INVALID_NUMBER,
      });
    } else if (input.selling_price_special < 0) {
      errors.push({
        field: 'selling_price_special',
        message: 'Harga Jual Spesial tidak boleh negatif',
        code: ValidationErrorCode.NEGATIVE_NUMBER,
      });
    }
  }

  // Min quantity validations - all must be >= 0
  if (input.wholesale_min_qty !== undefined && input.wholesale_min_qty !== null) {
    if (isNaN(input.wholesale_min_qty)) {
      errors.push({
        field: 'wholesale_min_qty',
        message: 'Min. Qty Grosir harus berupa angka',
        code: ValidationErrorCode.INVALID_NUMBER,
      });
    } else if (input.wholesale_min_qty < 0) {
      errors.push({
        field: 'wholesale_min_qty',
        message: 'Min. Qty Grosir tidak boleh negatif (minimal 0)',
        code: ValidationErrorCode.NEGATIVE_NUMBER,
      });
    }
  }

  if (input.special_min_qty !== undefined && input.special_min_qty !== null) {
    if (isNaN(input.special_min_qty)) {
      errors.push({
        field: 'special_min_qty',
        message: 'Min. Qty Spesial harus berupa angka',
        code: ValidationErrorCode.INVALID_NUMBER,
      });
    } else if (input.special_min_qty < 0) {
      errors.push({
        field: 'special_min_qty',
        message: 'Min. Qty Spesial tidak boleh negatif (minimal 0)',
        code: ValidationErrorCode.NEGATIVE_NUMBER,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════════
// MASTER DATA VALIDATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Validate master data IDs are valid (non-zero positive integers)
 * 
 * Note: This only validates the ID format, not existence in database.
 * Database existence is validated by foreign key constraints.
 */
export function validateMasterDataIds(input: Partial<ProductInput>): FieldValidationResult {
  const errors: ValidationError[] = [];

  // Required master data IDs
  if (input.category_id !== undefined && input.category_id <= 0) {
    errors.push({
      field: 'category_id',
      message: 'ID Kategori tidak valid',
      code: ValidationErrorCode.INVALID_MASTER_DATA,
    });
  }

  if (input.main_product_id !== undefined && input.main_product_id <= 0) {
    errors.push({
      field: 'main_product_id',
      message: 'ID Produk Utama tidak valid',
      code: ValidationErrorCode.INVALID_MASTER_DATA,
    });
  }

  if (input.unit_id !== undefined && input.unit_id <= 0) {
    errors.push({
      field: 'unit_id',
      message: 'ID Satuan tidak valid',
      code: ValidationErrorCode.INVALID_MASTER_DATA,
    });
  }

  // Optional master data IDs (if provided, must be valid)
  if (input.brand_id !== undefined && input.brand_id !== null && input.brand_id <= 0) {
    errors.push({
      field: 'brand_id',
      message: 'ID Brand tidak valid',
      code: ValidationErrorCode.INVALID_MASTER_DATA,
    });
  }

  if (input.variant_id !== undefined && input.variant_id !== null && input.variant_id <= 0) {
    errors.push({
      field: 'variant_id',
      message: 'ID Varian tidak valid',
      code: ValidationErrorCode.INVALID_MASTER_DATA,
    });
  }

  if (input.specification_id !== undefined && input.specification_id !== null && input.specification_id <= 0) {
    errors.push({
      field: 'specification_id',
      message: 'ID Spesifikasi tidak valid',
      code: ValidationErrorCode.INVALID_MASTER_DATA,
    });
  }

  if (input.size_id !== undefined && input.size_id !== null && input.size_id <= 0) {
    errors.push({
      field: 'size_id',
      message: 'ID Ukuran/Isi tidak valid',
      code: ValidationErrorCode.INVALID_MASTER_DATA,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
