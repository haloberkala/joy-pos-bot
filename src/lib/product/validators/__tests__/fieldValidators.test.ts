/**
 * Field Validators Unit Tests
 * 
 * Tests for validateRequiredFields, validateNumberFields, validateMasterDataIds
 */

import { describe, it, expect } from 'vitest';
import {
  validateRequiredFields,
  validateNumberFields,
  validateMasterDataIds,
} from '../fieldValidators';
import { ValidationErrorCode } from '../types';

describe('fieldValidators', () => {
  describe('validateRequiredFields', () => {
    it('should pass when all required fields are present', () => {
      const input = {
        category_id: 1,
        main_product_id: 2,
        unit_id: 3,
        code: 'ABC123',
        quantity: 10,
        min_stock_alert: 5,
        cost_price: 10000,
        selling_price_retail: 15000,
        selling_price_wholesale: 14000,
        selling_price_special: 13000,
        wholesale_min_qty: 12,
        special_min_qty: 50,
      };

      const result = validateRequiredFields(input);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when category_id is missing', () => {
      const input = {
        main_product_id: 2,
        unit_id: 3,
        code: 'ABC123',
        quantity: 10,
        min_stock_alert: 5,
        cost_price: 10000,
        selling_price_retail: 15000,
        selling_price_wholesale: 14000,
        selling_price_special: 13000,
        wholesale_min_qty: 12,
        special_min_qty: 50,
      };

      const result = validateRequiredFields(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('category_id');
      expect(result.errors[0].code).toBe(ValidationErrorCode.REQUIRED_FIELD);
    });

    it('should fail when code is empty string', () => {
      const input = {
        category_id: 1,
        main_product_id: 2,
        unit_id: 3,
        code: '   ', // Whitespace only
        quantity: 10,
        min_stock_alert: 5,
        cost_price: 10000,
        selling_price_retail: 15000,
        selling_price_wholesale: 14000,
        selling_price_special: 13000,
        wholesale_min_qty: 12,
        special_min_qty: 50,
      };

      const result = validateRequiredFields(input);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'code')).toBe(true);
    });

    it('should fail when multiple required fields are missing', () => {
      const input = {
        code: 'ABC123',
        quantity: 10,
      };

      const result = validateRequiredFields(input);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(5); // Many fields missing
    });
  });

  describe('validateNumberFields', () => {
    it('should pass when all number fields are valid', () => {
      const input = {
        quantity: 10,
        min_stock_alert: 5,
        cost_price: 10000,
        selling_price_retail: 15000,
        selling_price_wholesale: 14000,
        selling_price_special: 13000,
        wholesale_min_qty: 12,
        special_min_qty: 50,
      };

      const result = validateNumberFields(input);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass when quantity is negative (overselling allowed)', () => {
      const input = {
        quantity: -5,
        min_stock_alert: 5,
        cost_price: 10000,
        selling_price_retail: 15000,
        selling_price_wholesale: 14000,
        selling_price_special: 13000,
        wholesale_min_qty: 12,
        special_min_qty: 50,
      };

      const result = validateNumberFields(input);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when min_stock_alert is negative', () => {
      const input = {
        quantity: 10,
        min_stock_alert: -5,
        cost_price: 10000,
        selling_price_retail: 15000,
        selling_price_wholesale: 14000,
        selling_price_special: 13000,
        wholesale_min_qty: 12,
        special_min_qty: 50,
      };

      const result = validateNumberFields(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('min_stock_alert');
      expect(result.errors[0].code).toBe(ValidationErrorCode.NEGATIVE_NUMBER);
    });

    it('should fail when prices are negative', () => {
      const input = {
        quantity: 10,
        min_stock_alert: 5,
        cost_price: -10000,
        selling_price_retail: -15000,
        selling_price_wholesale: 14000,
        selling_price_special: 13000,
        wholesale_min_qty: 12,
        special_min_qty: 50,
      };

      const result = validateNumberFields(input);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(2); // cost_price and retail
      expect(result.errors.every(e => e.code === ValidationErrorCode.NEGATIVE_NUMBER)).toBe(true);
    });
  });

  describe('validateMasterDataIds', () => {
    it('should pass when all master data IDs are valid', () => {
      const input = {
        category_id: 1,
        main_product_id: 2,
        unit_id: 3,
        brand_id: 4,
        variant_id: 5,
        specification_id: 6,
        size_id: 7,
      };

      const result = validateMasterDataIds(input);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass when optional master data IDs are null', () => {
      const input = {
        category_id: 1,
        main_product_id: 2,
        unit_id: 3,
        brand_id: null,
        variant_id: null,
        specification_id: null,
        size_id: null,
      };

      const result = validateMasterDataIds(input);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when required master data ID is zero', () => {
      const input = {
        category_id: 0,
        main_product_id: 2,
        unit_id: 3,
      };

      const result = validateMasterDataIds(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('category_id');
      expect(result.errors[0].code).toBe(ValidationErrorCode.INVALID_MASTER_DATA);
    });

    it('should fail when required master data ID is negative', () => {
      const input = {
        category_id: 1,
        main_product_id: -1,
        unit_id: 3,
      };

      const result = validateMasterDataIds(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('main_product_id');
    });
  });
});
