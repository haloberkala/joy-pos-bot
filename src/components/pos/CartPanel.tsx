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

export function CartPanel({ items, total, onUpdateQuantity, onRemoveItem, onCheckout, selectedCustomer }: CartPanelProps) {
  return (
    <div className="flex flex-col h-full bg-white border-l border-border">
      <div className="p-4 border-b border-border">
        <h2 className="text-[15px] font-medium text-foreground">Keranjang</h2>
        <p className="text-[12px] text-muted-foreground">{items.length} item</p>
      </div>

      {selectedCustomer && (
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2 bg-primary-light rounded-lg px-3 py-2">
            <User className="w-3.5 h-3.5 text-primary" />
            <span className="text-[12px] font-medium text-foreground">{selectedCustomer.name}</span>
            <span className="text-[11px] text-muted-foreground">• {selectedCustomer.phone}</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Wallet className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-[12px]">Keranjang kosong</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.product.id} className="bg-surface rounded-xl p-3">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-[13px] text-foreground truncate">{item.product.name}</h4>
                  <p className="text-[11px] text-muted-foreground">{formatCurrency(item.price_per_unit)} / item</p>
                </div>
                <button onClick={() => onRemoveItem(item.product.id)} className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-foreground hover:bg-accent transition-colors border border-border">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-7 text-center font-medium text-foreground text-[13px]">{item.quantity}</span>
                  <button onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-foreground hover:bg-accent transition-colors border border-border">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="font-medium text-primary text-[13px] tabular-nums">{formatCurrency(item.price_per_unit * item.quantity)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-border space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-[13px]">Total</span>
          <span className="text-[20px] font-medium text-foreground tabular-nums" style={{ letterSpacing: '-0.4px' }}>{formatCurrency(total)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => onCheckout('cash')} disabled={items.length === 0} className="flex flex-col items-center gap-1 h-auto py-2.5 rounded-lg">
            <Wallet className="w-4 h-4" /><span className="text-[11px]">Tunai</span>
          </Button>
          <Button onClick={() => onCheckout('transfer')} disabled={items.length === 0} className="flex flex-col items-center gap-1 h-auto py-2.5 rounded-lg">
            <CreditCard className="w-4 h-4" /><span className="text-[11px]">Transfer</span>
          </Button>
          <Button onClick={() => onCheckout('qris')} disabled={items.length === 0} className="flex flex-col items-center gap-1 h-auto py-2.5 rounded-lg">
            <QrCode className="w-4 h-4" /><span className="text-[11px]">QRIS</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
