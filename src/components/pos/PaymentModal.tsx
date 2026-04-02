import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaymentMethod, CartItem, Customer } from '@/types/pos';
import { formatCurrency } from '@/lib/format';
import { Check, Wallet, CreditCard, QrCode, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
  onConfirm: (amountPaid: number) => void;
  customer?: Customer | null;
}

const quickAmounts = [50000, 100000, 150000, 200000];

export function PaymentModal({
  isOpen,
  onClose,
  items,
  total,
  paymentMethod,
  onConfirm,
  customer,
}: PaymentModalProps) {
  const [amountPaid, setAmountPaid] = useState<string>(total.toString());
  const change = Math.max(0, Number(amountPaid) - total);

  const handleQuickAmount = (amount: number) => {
    setAmountPaid(amount.toString());
  };

  const handleConfirm = () => {
    onConfirm(Number(amountPaid));
  };

  const paymentIcon = {
    cash: <Wallet className="w-5 h-5" />,
    transfer: <CreditCard className="w-5 h-5" />,
    qris: <QrCode className="w-5 h-5" />,
  };

  const paymentLabel = {
    cash: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {paymentIcon[paymentMethod]}
            Pembayaran {paymentLabel[paymentMethod]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer info */}
          {customer && (
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{customer.name}</span>
              <span className="text-xs text-muted-foreground">• {customer.phone}</span>
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-muted/50 rounded-xl p-3 space-y-2 max-h-32 overflow-y-auto">
            {items.map((item) => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.product.name} x{item.quantity}
                </span>
                <span className="font-medium">{formatCurrency(item.price_per_unit * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-between items-center py-2 border-t">
            <span className="font-semibold">Total</span>
            <span className="price-text text-xl text-[hsl(var(--pos-accent))]">
              {formatCurrency(total)}
            </span>
          </div>

          {/* Cash Payment Options */}
          {paymentMethod === 'cash' && (
            <>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Jumlah Dibayar
                </label>
                <Input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="text-right text-lg font-bold rounded-xl"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => handleQuickAmount(amount)}
                    className={cn(
                      'text-xs rounded-xl',
                      Number(amountPaid) === amount && 'bg-[hsl(var(--pos-accent))] text-white border-[hsl(var(--pos-accent))]'
                    )}
                  >
                    {formatCurrency(amount)}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={() => handleQuickAmount(total)}
                className="w-full rounded-xl"
              >
                Uang Pas
              </Button>

              {/* Change */}
              <div className="flex justify-between items-center py-3 bg-emerald-50 rounded-xl px-4">
                <span className="font-semibold text-emerald-700">Kembalian</span>
                <span className="price-text text-xl text-emerald-700">
                  {formatCurrency(change)}
                </span>
              </div>
            </>
          )}

          {/* Non-Cash Payment */}
          {paymentMethod !== 'cash' && (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">
                {paymentMethod === 'qris'
                  ? 'Scan QRIS atau proses pembayaran'
                  : 'Proses pembayaran debit'
                }
              </p>
            </div>
          )}

          {/* Confirm Button */}
          <Button
            onClick={handleConfirm}
            disabled={paymentMethod === 'cash' && Number(amountPaid) < total}
            className="w-full h-12 rounded-xl bg-[hsl(var(--pos-accent))] hover:bg-[hsl(var(--pos-accent-hover))] text-white font-semibold"
          >
            <Check className="w-5 h-5 mr-2" />
            Konfirmasi Pembayaran
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
