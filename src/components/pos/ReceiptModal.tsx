import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/types/pos';
import { formatCurrency, formatDate } from '@/lib/format';
import { Printer, X } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export function ReceiptModal({ isOpen, onClose, transaction }: ReceiptModalProps) {
  if (!transaction) return null;

  const paymentLabel = {
    cash: 'Tunai',
    card: 'Kartu',
    qris: 'QRIS',
    transfer: 'Transfer',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-center">Struk Pembayaran</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 font-mono text-sm">
          {/* Store Info */}
          <div className="text-center border-b border-dashed pb-3">
            <h3 className="font-bold text-lg">MINIMARKET BERKAH</h3>
            <p className="text-xs text-gray-600">Jl. Merdeka No. 123</p>
            <p className="text-xs text-gray-600">Telp: 021-12345678</p>
          </div>

          {/* Transaction Info */}
          <div className="text-xs space-y-1 border-b border-dashed pb-3">
            <div className="flex justify-between">
              <span>No. Transaksi</span>
              <span>{transaction.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Tanggal</span>
              <span>{formatDate(transaction.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Kasir</span>
              <span>{transaction.cashierName}</span>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2 border-b border-dashed pb-3">
            {transaction.items.map((item) => (
              <div key={item.product.id} className="space-y-0.5">
                <div className="font-medium">{item.product.name}</div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>
                    {item.quantity} x {formatCurrency(item.pricePerUnit)}
                  </span>
                  <span>{formatCurrency(item.pricePerUnit * item.quantity)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1">
            {transaction.discount > 0 && (
              <>
                <div className="flex justify-between text-xs">
                  <span>Subtotal</span>
                  <span>{formatCurrency(transaction.subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-green-600">
                  <span>Diskon</span>
                  <span>-{formatCurrency(transaction.discount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-bold">
              <span>TOTAL</span>
              <span>{formatCurrency(transaction.total)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Bayar ({paymentLabel[transaction.paymentMethod]})</span>
              <span>{formatCurrency(transaction.amountPaid)}</span>
            </div>
            {transaction.change > 0 && (
              <div className="flex justify-between text-xs">
                <span>Kembalian</span>
                <span>{formatCurrency(transaction.change)}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-600 pt-3 border-t border-dashed">
            <p>Terima kasih atas kunjungan Anda!</p>
            <p>Barang yang sudah dibeli tidak dapat dikembalikan</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              <X className="w-4 h-4 mr-1" />
              Tutup
            </Button>
            <Button onClick={() => window.print()} className="flex-1">
              <Printer className="w-4 h-4 mr-1" />
              Cetak
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
