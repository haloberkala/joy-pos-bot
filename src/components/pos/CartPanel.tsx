import { CartItem, PaymentMethod, Customer } from '@/types/pos';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2, CreditCard, Wallet, QrCode, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CartPanelProps {
  items: CartItem[];
  total: number;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onCheckout: (paymentMethod: PaymentMethod) => void;
  selectedCustomer?: Customer | null;
}

export function CartPanel({
  items,
  total,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  selectedCustomer,
}: CartPanelProps) {
  return (
    <div className="flex flex-col h-full bg-[hsl(var(--pos-card))] border-l border-[hsl(var(--pos-border))] shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-[hsl(var(--pos-border))]">
        <h2 className="text-lg font-bold text-[hsl(var(--pos-foreground))]">
          Keranjang
        </h2>
        <p className="text-sm text-[hsl(var(--pos-muted-foreground))]">
          {items.length} item
        </p>
      </div>

      {/* Selected Customer Badge */}
      {selectedCustomer && (
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2 bg-[hsl(var(--pos-accent))]/10 rounded-lg px-3 py-2">
            <User className="w-3.5 h-3.5 text-[hsl(var(--pos-accent))]" />
            <span className="text-xs font-medium text-[hsl(var(--pos-foreground))]">{selectedCustomer.name}</span>
            <span className="text-xs text-[hsl(var(--pos-muted-foreground))]">• {selectedCustomer.phone}</span>
          </div>
        </div>
      )}

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[hsl(var(--pos-muted-foreground))]">
            <Wallet className="w-12 h-12 mb-2 opacity-30" />
            <p className="text-sm">Keranjang kosong</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.product.id}
              className="bg-[hsl(var(--pos-muted))] rounded-xl p-3"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-[hsl(var(--pos-foreground))] truncate">
                    {item.product.name}
                  </h4>
                  <p className="text-xs text-[hsl(var(--pos-muted-foreground))]">
                    {formatCurrency(item.price_per_unit)} / item
                  </p>
                </div>
                <button
                  onClick={() => onRemoveItem(item.product.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      onUpdateQuantity(item.product.id, item.quantity - 1)
                    }
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[hsl(var(--pos-card))] text-[hsl(var(--pos-foreground))] hover:bg-[hsl(var(--pos-border))] transition-colors border border-[hsl(var(--pos-border))]"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-semibold text-[hsl(var(--pos-foreground))] text-sm">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      onUpdateQuantity(item.product.id, item.quantity + 1)
                    }
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[hsl(var(--pos-card))] text-[hsl(var(--pos-foreground))] hover:bg-[hsl(var(--pos-border))] transition-colors border border-[hsl(var(--pos-border))]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="price-text text-[hsl(var(--pos-accent))]">
                  {formatCurrency(item.price_per_unit * item.quantity)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[hsl(var(--pos-border))] space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[hsl(var(--pos-muted-foreground))] font-medium">Total</span>
          <span className="price-text text-2xl text-[hsl(var(--pos-foreground))]">
            {formatCurrency(total)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={() => onCheckout('cash')}
            disabled={items.length === 0}
            className={cn(
              'flex flex-col items-center gap-1 h-auto py-3 rounded-xl',
              'bg-[hsl(var(--pos-accent))] hover:bg-[hsl(var(--pos-accent-hover))]',
              'text-[hsl(var(--pos-accent-foreground))]'
            )}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-xs">Tunai</span>
          </Button>
          <Button
            onClick={() => onCheckout('debit')}
            disabled={items.length === 0}
            className={cn(
              'flex flex-col items-center gap-1 h-auto py-3 rounded-xl',
              'bg-blue-500 hover:bg-blue-600',
              'text-white'
            )}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-xs">Debit</span>
          </Button>
          <Button
            onClick={() => onCheckout('qris')}
            disabled={items.length === 0}
            className={cn(
              'flex flex-col items-center gap-1 h-auto py-3 rounded-xl',
              'bg-violet-500 hover:bg-violet-600',
              'text-white'
            )}
          >
            <QrCode className="w-5 h-5" />
            <span className="text-xs">QRIS</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
