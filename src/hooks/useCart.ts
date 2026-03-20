import { useState, useCallback, useMemo } from 'react';
import { CartItem, Product, PriceMode } from '@/types/pos';

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [globalPriceMode, setGlobalPriceMode] = useState<PriceMode>('retail');

  const addItem = useCallback((product: Product, priceMode?: PriceMode) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + 1;
        const mode = priceMode || getAutoMode(product, newQty, existing.price_mode);
        const price = getPriceForMode(product, mode);
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: newQty, price_mode: mode, price_per_unit: price }
            : item
        );
      }
      const mode = priceMode || globalPriceMode;
      const price = getPriceForMode(product, mode);
      const cartItem: CartItem = {
        product,
        quantity: 1,
        price_per_unit: price,
        price_mode: mode,
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
          // Auto-switch pricing based on qty
          const mode = quantity >= item.product.wholesale_min_qty ? 'wholesale' : 'retail';
          const price = mode === 'wholesale' ? item.product.selling_price_wholesale : item.product.selling_price_retail;
          return { ...item, quantity, price_mode: mode, price_per_unit: price };
        })
      );
    }
  }, []);

  const setPriceMode = useCallback((productId: number, mode: PriceMode) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        const price = mode === 'wholesale' ? item.product.selling_price_wholesale : item.product.selling_price_retail;
        return { ...item, price_mode: mode, price_per_unit: price };
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
