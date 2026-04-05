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

export function PaymentModal({ isOpen, onClose, items, total, paymentMethod, onConfirm, customer }: PaymentModalProps) {
  const [amountPaid, setAmountPaid] = useState<string>(total.toString());
  const change = Math.max(0, Number(amountPaid) - total);

  const paymentIcon = { cash: <Wallet className="w-4 h-4" />, transfer: <CreditCard className="w-4 h-4" />, qris: <QrCode className="w-4 h-4" /> };
  const paymentLabel = { cash: 'Tunai', transfer: 'Transfer', qris: 'QRIS' };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {paymentIcon[paymentMethod]} Pembayaran {paymentLabel[paymentMethod]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {customer && (
            <div className="flex items-center gap-2 bg-surface rounded-lg px-3 py-2">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[13px] font-medium">{customer.name}</span>
              <span className="text-[11px] text-muted-foreground">• {customer.phone}</span>
            </div>
          )}

          <div className="bg-surface rounded-xl p-3 space-y-2 max-h-32 overflow-y-auto">
            {items.map((item) => (
              <div key={item.product.id} className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">{item.product.name} x{item.quantity}</span>
                <span className="font-medium text-foreground">{formatCurrency(item.price_per_unit * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center py-2 border-t border-border">
            <span className="text-[13px] font-medium text-foreground">Total</span>
            <span className="text-[18px] font-medium text-primary tabular-nums" style={{ letterSpacing: '-0.3px' }}>{formatCurrency(total)}</span>
          </div>

          {paymentMethod === 'cash' && (
            <>
              <div>
                <label className="text-caption mb-2 block">Jumlah Dibayar</label>
                <Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)}
                  className="text-right text-[15px] font-medium rounded-lg" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((amount) => (
                  <Button key={amount} variant="outline" onClick={() => setAmountPaid(amount.toString())}
                    className={cn('text-[11px] rounded-lg', Number(amountPaid) === amount && 'bg-primary text-primary-foreground border-primary')}>
                    {formatCurrency(amount)}
                  </Button>
                ))}
              </div>
              <Button variant="outline" onClick={() => setAmountPaid(total.toString())} className="w-full rounded-lg text-[13px]">Uang Pas</Button>
              <div className="flex justify-between items-center py-3 bg-[hsl(160,72%,27%)]/10 rounded-xl px-4">
                <span className="font-medium text-[hsl(160,72%,27%)] text-[13px]">Kembalian</span>
                <span className="text-[18px] font-medium text-[hsl(160,72%,27%)] tabular-nums">{formatCurrency(change)}</span>
              </div>
            </>
          )}

          {paymentMethod !== 'cash' && (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-[13px]">{paymentMethod === 'qris' ? 'Scan QRIS atau proses pembayaran' : 'Proses pembayaran transfer'}</p>
            </div>
          )}

          <Button onClick={() => onConfirm(Number(amountPaid))}
            disabled={paymentMethod === 'cash' && Number(amountPaid) < total}
            className="w-full h-10 rounded-lg font-medium">
            <Check className="w-4 h-4 mr-2" /> Konfirmasi Pembayaran
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
