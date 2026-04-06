import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sale, SaleDetail, Product } from '@/types/pos';
import { formatCurrency, formatDate } from '@/lib/format';
import { Printer, X, AlertTriangle } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  saleDetails: (SaleDetail & { product?: Product })[];
  cashierName: string;
  customerName?: string;
}

export function ReceiptModal({ isOpen, onClose, sale, saleDetails, cashierName, customerName }: ReceiptModalProps) {
  if (!sale) return null;
  const paymentLabel = { cash: 'Tunai', transfer: 'Transfer', qris: 'QRIS' } as Record<string, string>;
  const isDebt = sale.payment_status === 'debt';

  const handlePrint = () => {
    const receiptContent = document.getElementById('receipt-print-area');
    if (!receiptContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk ${sale.invoice_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; width: 80mm; padding: 4mm; font-size: 12px; color: #000; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .border-dashed { border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px; }
          .flex-between { display: flex; justify-content: space-between; }
          .mb-1 { margin-bottom: 2px; }
          .mb-2 { margin-bottom: 6px; }
          .store-name { font-size: 16px; font-weight: bold; }
          .item-name { font-weight: bold; }
          .total-row { font-size: 14px; font-weight: bold; }
          .debt-box { border: 1px solid #000; padding: 4px; margin-top: 4px; text-align: center; font-weight: bold; }
          @media print {
            body { width: 80mm; }
            @page { size: 80mm auto; margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="text-center mb-2">
          <div class="store-name">TOKO BERKAH</div>
          <div>Banjarmasin</div>
        </div>
        <div class="border-dashed mb-2">
          <div class="flex-between mb-1"><span>No. Invoice</span><span>${sale.invoice_number}</span></div>
          <div class="flex-between mb-1"><span>Tanggal</span><span>${formatDate(sale.date)}</span></div>
          <div class="flex-between mb-1"><span>Kasir</span><span>${cashierName}</span></div>
          ${customerName ? `<div class="flex-between mb-1"><span>Pelanggan</span><span>${customerName}</span></div>` : ''}
        </div>
        <div class="border-dashed mb-2">
          ${saleDetails.map(item => `
            <div class="mb-1">
              <div class="item-name">${item.product?.name || 'Produk #' + item.product_id}</div>
              <div class="flex-between">
                <span>${item.quantity} x ${formatCurrency(item.price_at_sale)}${item.price_mode === 'wholesale' ? ' (Grosir)' : ''}</span>
                <span>${formatCurrency(item.total_price)}</span>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="border-dashed">
          <div class="flex-between total-row mb-1"><span>TOTAL</span><span>${formatCurrency(sale.grand_total)}</span></div>
          ${!isDebt ? `
            <div class="flex-between mb-1"><span>Bayar (${paymentLabel[sale.payment_method]})</span><span>${formatCurrency(sale.amount_received)}</span></div>
            ${sale.change_amount > 0 ? `<div class="flex-between mb-1"><span>Kembalian</span><span>${formatCurrency(sale.change_amount)}</span></div>` : ''}
          ` : `
            <div class="debt-box">STATUS: UTANG${sale.due_date ? '<br/>Jatuh tempo: ' + formatDate(sale.due_date) : ''}</div>
          `}
        </div>
        <div class="border-dashed text-center" style="margin-top:8px;padding-top:8px;">
          <div>Terima kasih atas kunjungan Anda!</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle className="text-center">Struk Pembayaran</DialogTitle></DialogHeader>
        <div id="receipt-print-area" className="space-y-4 font-mono text-[12px]">
          <div className="text-center border-b border-dashed border-border pb-3">
            <h3 className="font-medium text-[15px] text-foreground">TOKO BERKAH</h3>
            <p className="text-muted-foreground">Banjarmasin</p>
          </div>
          <div className="space-y-1 border-b border-dashed border-border pb-3">
            <div className="flex justify-between"><span className="text-muted-foreground">No. Invoice</span><span className="text-foreground">{sale.invoice_number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tanggal</span><span className="text-foreground">{formatDate(sale.date)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Kasir</span><span className="text-foreground">{cashierName}</span></div>
            {customerName && <div className="flex justify-between"><span className="text-muted-foreground">Pelanggan</span><span className="text-foreground">{customerName}</span></div>}
          </div>
          <div className="space-y-2 border-b border-dashed border-border pb-3">
            {saleDetails.map((item) => (
              <div key={item.id} className="space-y-0.5">
                <div className="font-medium text-foreground">{item.product?.name || `Produk #${item.product_id}`}</div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{item.quantity} x {formatCurrency(item.price_at_sale)}{item.price_mode === 'wholesale' && <span className="ml-1 text-primary">(Grosir)</span>}</span>
                  <span className="text-foreground">{formatCurrency(item.total_price)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between font-medium text-foreground"><span>TOTAL</span><span>{formatCurrency(sale.grand_total)}</span></div>
            {!isDebt && (
              <>
                <div className="flex justify-between text-muted-foreground"><span>Bayar ({paymentLabel[sale.payment_method]})</span><span>{formatCurrency(sale.amount_received)}</span></div>
                {sale.change_amount > 0 && <div className="flex justify-between text-muted-foreground"><span>Kembalian</span><span>{formatCurrency(sale.change_amount)}</span></div>}
              </>
            )}
            {isDebt && (
              <div className="mt-2 p-2 bg-[hsl(40,72%,42%)]/10 rounded-lg border border-[hsl(40,72%,42%)]/20">
                <div className="flex items-center gap-1 text-[hsl(40,72%,42%)] font-medium text-[11px]"><AlertTriangle className="w-3 h-3" /> STATUS: UTANG</div>
                {sale.due_date && <div className="text-[11px] text-[hsl(40,72%,42%)] mt-1">Jatuh tempo: {formatDate(sale.due_date)}</div>}
              </div>
            )}
          </div>
          <div className="text-center text-muted-foreground pt-3 border-t border-dashed border-border"><p>Terima kasih atas kunjungan Anda!</p></div>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} className="flex-1"><X className="w-4 h-4 mr-1" />Tutup</Button>
            <Button onClick={handlePrint} className="flex-1"><Printer className="w-4 h-4 mr-1" />Cetak</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
