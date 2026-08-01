/**
 * Business Rule Validators
 * 
 * Validates business logic and domain rules for product pricing and quantities.
 * Pure functions, no database calls, no side effects.
 * 
 * Business Rules:
 * 1. Price Hierarchy: Retail >= Modal, Wholesale <= Retail, Special <= Wholesale
 * 2. Quantity Thresholds: Special Min Qty >= Wholesale Min Qty
 */

import {
  PriceInput,
  QuantityThresholdInput,
  BusinessRuleResult,
  ValidationError,
  ValidationErrorCode,
} from './types';

// ═══════════════════════════════════════════════════════════════════
// PRICE HIERARCHY VALIDATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Validate price hierarchy business rules
 * 
 * Business Rules:
 * 1. Retail price must be >= Cost price (prevent selling at loss)
 * 2. Wholesale price must be <= Retail price (wholesale is discount from retail)
 * 3. Special price must be <= Wholesale price (special is deeper discount)
 * 
 * Note: We allow equal prices (e.g., retail == wholesale) for flexibility
 */
export function validatePriceHierarchy(prices: PriceInput): BusinessRuleResult {
  const errors: ValidationError[] = [];

  const { cost_price, selling_price_retail, selling_price_wholesale, selling_price_special } = prices;

  // Rule 1: Retail >= Cost (prevent selling at loss)
  if (selling_price_retail < cost_price) {
    errors.push({
      field: 'selling_price_retail',
      message: `Harga Jual Eceran (Rp ${selling_price_retail.toLocaleString()}) tidak boleh lebih rendah dari Harga Modal (Rp ${cost_price.toLocaleString()}). Anda akan mengalami kerugian.`,
      code: ValidationErrorCode.PRICE_BELOW_COST,
    });
  }

  // Rule 2: Wholesale <= Retail (wholesale is discount from retail)
  if (selling_price_wholesale > selling_price_retail) {
    errors.push({
      field: 'selling_price_wholesale',
      message: `Harga Jual Grosir (Rp ${selling_price_wholesale.toLocaleString()}) tidak boleh lebih tinggi dari Harga Jual Eceran (Rp ${selling_price_retail.toLocaleString()}). Grosir harus lebih murah atau sama dengan eceran.`,
      code: ValidationErrorCode.WHOLESALE_ABOVE_RETAIL,
    });
  }

  // Rule 3: Special <= Wholesale (special is deeper discount)
  if (selling_price_special > selling_price_wholesale) {
    errors.push({
      field: 'selling_price_special',
      message: `Harga Jual Spesial (Rp ${selling_price_special.toLocaleString()}) tidak boleh lebih tinggi dari Harga Jual Grosir (Rp ${selling_price_wholesale.toLocaleString()}). Harga spesial harus lebih murah atau sama dengan grosir.`,
      code: ValidationErrorCode.SPECIAL_ABOVE_WHOLESALE,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════════
// QUANTITY THRESHOLD VALIDATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Validate quantity threshold business rules
 * 
 * Business Rule:
 * Special Min Qty must be >= Wholesale Min Qty
 * 
 * Rationale:
 * - Wholesale price applies at lower quantities (e.g., 12 units)
 * - Special price applies at higher quantities (e.g., 50 units)
 * - Special price is deeper discount, requires more commitment
 */
export function validateQuantityThresholds(quantities: QuantityThresholdInput): BusinessRuleResult {
  const errors: ValidationError[] = [];

  const { wholesale_min_qty, special_min_qty } = quantities;

  // Rule: Special Min Qty >= Wholesale Min Qty
  if (special_min_qty < wholesale_min_qty) {
    errors.push({
      field: 'special_min_qty',
      message: `Min. Qty Spesial (${special_min_qty}) harus lebih besar atau sama dengan Min. Qty Grosir (${wholesale_min_qty}). Harga spesial untuk pembelian dalam jumlah lebih banyak.`,
      code: ValidationErrorCode.SPECIAL_QTY_BELOW_WHOLESALE,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════════
// COMBINED BUSINESS RULE VALIDATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Validate all business rules in one call
 * Convenience function that combines price and quantity validations
 */
export function validateAllBusinessRules(
  prices: PriceInput,
  quantities: QuantityThresholdInput
): BusinessRuleResult {
  const priceResult = validatePriceHierarchy(prices);
  const quantityResult = validateQuantityThresholds(quantities);

  return {
    isValid: priceResult.isValid && quantityResult.isValid,
    errors: [...priceResult.errors, ...quantityResult.errors],
  };
}
