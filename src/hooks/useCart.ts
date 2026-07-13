import { useState, useCallback, useMemo } from 'react';
import { CartItem, Product, PriceMode } from '@/types/pos';

function getPriceForMode(product: Product, mode: PriceMode): number {
  if (mode === 'special') return product.selling_price_special;
  if (mode === 'wholesale') return product.selling_price_wholesale;
  return product.selling_price_retail;
}

function getAutoMode(product: Product, qty: number): PriceMode {
  if (product.special_min_qty > 0 && qty >= product.special_min_qty) return 'special';
  if (product.wholesale_min_qty > 0 && qty >= product.wholesale_min_qty) return 'wholesale';
  return 'retail';
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [globalPriceMode, setGlobalPriceMode] = useState<PriceMode>('retail');

  const addItem = useCallback((product: Product, priceMode?: PriceMode) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + 1;
        let mode = existing.price_mode;
        let is_manual = existing.is_manual_price_mode;

        if (priceMode) {
          mode = priceMode;
          is_manual = true;
        } else if (!is_manual) {
          mode = getAutoMode(product, newQty);
        }

        const price = getPriceForMode(product, mode);
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: newQty, price_mode: mode, price_per_unit: price, is_manual_price_mode: is_manual }
            : item
        );
      }

      let mode = priceMode || globalPriceMode;
      let is_manual = !!priceMode || globalPriceMode !== 'retail';

      if (!is_manual) {
        mode = getAutoMode(product, 1);
      }

      const price = getPriceForMode(product, mode);
      const cartItem: CartItem = {
        product,
        quantity: 1,
        price_per_unit: price,
        price_mode: mode,
        is_manual_price_mode: is_manual,
      };
      return [...prev, cartItem];
    });
  }, [globalPriceMode]);

  const removeItem = useCallback((productId: number) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.product.id !== productId));
    } else {
      setItems((prev) =>
        prev.map((item) => {
          if (item.product.id !== productId) return item;
          const mode = item.is_manual_price_mode ? item.price_mode : getAutoMode(item.product, quantity);
          const price = getPriceForMode(item.product, mode);
          return { ...item, quantity, price_mode: mode, price_per_unit: price };
        })
      );
    }
  }, []);

  const setPriceMode = useCallback((productId: number, mode: PriceMode) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        const price = getPriceForMode(item.product, mode);
        return { ...item, price_mode: mode, price_per_unit: price, is_manual_price_mode: true };
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price_per_unit * item.quantity, 0);
  }, [items]);

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    total,
    itemCount,
    globalPriceMode,
    setGlobalPriceMode,
    setPriceMode,
    setItems,
  };
}
