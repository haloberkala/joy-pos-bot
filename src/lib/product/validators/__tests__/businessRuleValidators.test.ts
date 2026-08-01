/**
 * Business Rule Validators Unit Tests
 * 
 * Tests for validatePriceHierarchy, validateQuantityThresholds
 */

import { describe, it, expect } from 'vitest';
import {
  validatePriceHierarchy,
  validateQuantityThresholds,
  validateAllBusinessRules,
} from '../businessRuleValidators';
import { ValidationErrorCode } from '../types';

describe('businessRuleValidators', () => {
  describe('validatePriceHierarchy', () => {
    it('should pass when price hierarchy is correct', () => {
      const prices = {
        cost_price: 10000,
        selling_price_retail: 15000,
        selling_price_wholesale: 14000,
        selling_price_special: 13000,
      };

      const result = validatePriceHierarchy(prices);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass when prices are equal (edge case)', () => {
      const prices = {
        cost_price: 10000,
        selling_price_retail: 10000, // Equal to cost
        selling_price_wholesale: 10000, // Equal to retail
        selling_price_special: 10000, // Equal to wholesale
      };

      const result = validatePriceHierarchy(prices);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when retail < cost (selling at loss)', () => {
      const prices = {
        cost_price: 15000,
        selling_price_retail: 10000, // LOWER than cost
        selling_price_wholesale: 9000,
        selling_price_special: 8000,
      };

      const result = validatePriceHierarchy(prices);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('selling_price_retail');
      expect(result.errors[0].code).toBe(ValidationErrorCode.PRICE_BELOW_COST);
    });

    it('should fail when wholesale > retail', () => {
      const prices = {
        cost_price: 10000,
        selling_price_retail: 15000,
        selling_price_wholesale: 16000, // HIGHER than retail
        selling_price_special: 13000,
      };

      const result = validatePriceHierarchy(prices);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('selling_price_wholesale');
      expect(result.errors[0].code).toBe(ValidationErrorCode.WHOLESALE_ABOVE_RETAIL);
    });

    it('should fail when special > wholesale', () => {
      const prices = {
        cost_price: 10000,
        selling_price_retail: 15000,
        selling_price_wholesale: 14000,
        selling_price_special: 15000, // HIGHER than wholesale
      };

      const result = validatePriceHierarchy(prices);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('selling_price_special');
      expect(result.errors[0].code).toBe(ValidationErrorCode.SPECIAL_ABOVE_WHOLESALE);
    });

    it('should fail with multiple price errors', () => {
      const prices = {
        cost_price: 20000,
        selling_price_retail: 15000, // Lower than cost
        selling_price_wholesale: 16000, // Higher than retail
        selling_price_special: 17000, // Higher than wholesale
      };

      const result = validatePriceHierarchy(prices);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1); // At least retail < cost
    });
  });

  describe('validateQuantityThresholds', () => {
    it('should pass when special >= wholesale', () => {
      const quantities = {
        wholesale_min_qty: 12,
        special_min_qty: 50,
      };

      const result = validateQuantityThresholds(quantities);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass when special == wholesale (edge case)', () => {
      const quantities = {
        wholesale_min_qty: 12,
        special_min_qty: 12, // Equal
      };

      const result = validateQuantityThresholds(quantities);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when special < wholesale', () => {
      const quantities = {
        wholesale_min_qty: 50,
        special_min_qty: 12, // LOWER than wholesale
      };

      const result = validateQuantityThresholds(quantities);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('special_min_qty');
      expect(result.errors[0].code).toBe(ValidationErrorCode.SPECIAL_QTY_BELOW_WHOLESALE);
    });
  });

  describe('validateAllBusinessRules', () => {
    it('should pass when all business rules are satisfied', () => {
      const prices = {
        cost_price: 10000,
        selling_price_retail: 15000,
        selling_price_wholesale: 14000,
        selling_price_special: 13000,
      };
      const quantities = {
        wholesale_min_qty: 12,
        special_min_qty: 50,
      };

      const result = validateAllBusinessRules(prices, quantities);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when both price and quantity rules are violated', () => {
      const prices = {
        cost_price: 15000,
        selling_price_retail: 10000, // Lower than cost
        selling_price_wholesale: 14000,
        selling_price_special: 13000,
      };
      const quantities = {
        wholesale_min_qty: 50,
        special_min_qty: 12, // Lower than wholesale
      };

      const result = validateAllBusinessRules(prices, quantities);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2); // At least 2 errors
    });
  });
});
