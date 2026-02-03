import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaymentMethod, CartItem } from '@/types/pos';
import { formatCurrency } from '@/lib/format';
import { Check, Wallet, CreditCard, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
  onConfirm: (amountPaid: number) => void;
}

const quickAmounts = [50000, 100000, 150000, 200000];

export function PaymentModal({
  isOpen,
  onClose,
  items,
  total,
  paymentMethod,
  onConfirm,
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
    cash: <Wallet className="w-6 h-6" />,
    card: <CreditCard className="w-6 h-6" />,
    qris: <QrCode className="w-6 h-6" />,
  };

  const paymentLabel = {
    cash: 'Tunai',
    card: 'Kartu',
    qris: 'QRIS',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[hsl(var(--pos-card))] border-[hsl(var(--pos-border))] text-[hsl(var(--pos-foreground))]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[hsl(var(--pos-foreground))]">
            {paymentIcon[paymentMethod]}
            Pembayaran {paymentLabel[paymentMethod]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <div className="bg-[hsl(var(--pos-muted))] rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto">
            {items.map((item) => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span className="text-[hsl(var(--pos-muted-foreground))]">
                  {item.product.name} x{item.quantity}
                </span>
                <span>{formatCurrency(item.product.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-between items-center py-2 border-t border-[hsl(var(--pos-border))]">
            <span className="font-semibold">Total</span>
            <span className="price-text text-xl text-[hsl(var(--pos-accent))]">
              {formatCurrency(total)}
            </span>
          </div>

          {/* Cash Payment Options */}
          {paymentMethod === 'cash' && (
            <>
              <div>
                <label className="text-sm text-[hsl(var(--pos-muted-foreground))] mb-2 block">
                  Jumlah Dibayar
                </label>
                <Input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="text-right text-lg font-bold bg-[hsl(var(--pos-muted))] border-[hsl(var(--pos-border))] text-[hsl(var(--pos-foreground))]"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => handleQuickAmount(amount)}
                    className={cn(
                      'text-xs border-[hsl(var(--pos-border))] hover:bg-[hsl(var(--pos-muted))]',
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
                className="w-full border-[hsl(var(--pos-border))] hover:bg-[hsl(var(--pos-muted))]"
              >
                Uang Pas
              </Button>

              {/* Change */}
              <div className="flex justify-between items-center py-3 bg-[hsl(var(--pos-success))]/10 rounded-lg px-3">
                <span className="font-semibold text-[hsl(var(--pos-success))]">Kembalian</span>
                <span className="price-text text-xl text-[hsl(var(--pos-success))]">
                  {formatCurrency(change)}
                </span>
              </div>
            </>
          )}

          {/* Non-Cash Payment */}
          {paymentMethod !== 'cash' && (
            <div className="text-center py-6 text-[hsl(var(--pos-muted-foreground))]">
              <p className="text-sm">
                {paymentMethod === 'qris' 
                  ? 'Scan QRIS atau proses pembayaran'
                  : 'Proses pembayaran kartu'
                }
              </p>
            </div>
          )}

          {/* Confirm Button */}
          <Button
            onClick={handleConfirm}
            disabled={paymentMethod === 'cash' && Number(amountPaid) < total}
            className="w-full h-12 success-gradient text-white font-semibold"
          >
            <Check className="w-5 h-5 mr-2" />
            Konfirmasi Pembayaran
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
