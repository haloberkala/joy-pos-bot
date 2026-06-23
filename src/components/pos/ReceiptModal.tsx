import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sale, SaleDetail, Product } from '@/types/pos';
import { formatCurrency, formatDate } from '@/lib/format';
import { Printer, X, AlertTriangle, FileText } from 'lucide-react';
import { printInvoice } from '@/components/pos/PrintInvoice';
import { SaleItem } from '@/services/salesService';
import { printReceiptAndOpenDrawer, isThermalPrinterSupported } from '@/services/thermalPrinterService';
import { QRCodeSVG } from 'qrcode.react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  saleDetails: (SaleDetail & { product?: Product })[];
  cashierName: string;
  customerName?: string;
  /** Data toko untuk faktur A4 */
  store?: { name: string; address?: string | null; phone?: string | null } | null;
}

export function ReceiptModal({
  isOpen,
  onClose,
  sale,
  saleDetails,
  cashierName,
  customerName,
  store,
}: ReceiptModalProps) {
  if (!sale) return null;

  const paymentLabel = { cash: 'Tunai', transfer: 'Transfer', qris: 'QRIS' } as Record<string, string>;
  const isDebt = sale.payment_status === 'debt';

  // ─── Handler: Cetak Struk Thermal 80mm ───────────────────────────────────
  const handlePrintStruk = async () => {
    // 1. Coba cetak langsung via Web Serial API tanpa pop-up
    if (isThermalPrinterSupported()) {
      try {
        const receiptData = {
          storeName: store?.name || 'Toko',
          storeAddress: store?.address || undefined,
          items: saleDetails.map(item => ({
            name: item.product?.name || 'Produk #' + item.product_id,
            qty: item.quantity,
            price: item.price_at_sale,
          })),
          total: sale.grand_total,
          amountReceived: sale.amount_received,
          change: sale.change_amount,
          paymentMethod: paymentLabel[sale.payment_method] || sale.payment_method,
          cashierName: cashierName,
          transactionId: sale.invoice_number,
          customerName: customerName,
        };
        
        const success = await printReceiptAndOpenDrawer(receiptData);
        if (success) {
          return; // Berhasil cetak langsung ke thermal, batalkan proses browser popup
        }
      } catch (err) {
        console.warn('Gagal cetak via Web Serial:', err);
      }
    }

    // 2. Fallback: Cetak via browser pop-up
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


  // ─── Handler: Cetak Struk + Faktur (berurutan) ────────────────────────────
  const handlePrintBoth = () => {
    // ⚠️ Pre-open jendela faktur SEKARANG (sinkron, saat masih dalam user gesture)
    // agar browser tidak memblokir popup saat dipanggil dari dalam setTimeout.
    const preopenedFakturWin = store ? window.open('', '_blank') : null;

    // Cetak struk thermal terlebih dahulu
    handlePrintStruk();

    // Tulis konten faktur ke jendela yang sudah dibuka, setelah delay
    setTimeout(() => {
      if (!store || !preopenedFakturWin) return;

      const items: SaleItem[] = saleDetails.map(d => ({
        id: d.id,
        sale_id: sale.id,
        product_id: d.product_id,
        product_name: d.product?.name ?? `Produk #${d.product_id}`,
        product_code: null,
        quantity: d.quantity,
        price_per_unit: d.price_at_sale,
        cost_per_unit: 0,
        total_price: d.total_price,
        price_mode: (d.price_mode ?? 'retail') as 'retail' | 'wholesale' | 'special',
        is_service: false,
        created_at: '',
      }));

      const saleForInvoice = {
        id: sale.id,
        invoice_number: sale.invoice_number,
        sale_date: sale.date,
        grand_total: sale.grand_total,
        sub_total: sale.grand_total,
        discount: 0,
        tax: 0,
        amount_received: sale.amount_received,
        change_amount: sale.change_amount,
        payment_method: sale.payment_method,
        payment_status: sale.payment_status ?? 'paid',
        cashier_name: cashierName,
        note: null,
        due_date: sale.due_date ?? null,
      };

      printInvoice({
        sale: saleForInvoice as any,
        items,
        store,
        customerName,
        targetWindow: preopenedFakturWin, // gunakan window yang sudah dibuka
      });
    }, 800);
  };

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Abaikan jika user sedang mengetik di input/textarea
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handlePrintBoth();
      } else if (e.key === 'Enter' && !e.ctrlKey) {
        e.preventDefault();
        handlePrintStruk();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, sale]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Hanya izinkan tutup via tombol/keyboard shortcut yang kita kelola sendiri
    }}>
      <DialogContent
        className="sm:max-w-sm"
        hideCloseButton
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader><DialogTitle className="text-center">Struk Pembayaran</DialogTitle></DialogHeader>

        {/* ── Area Struk (hanya untuk referensi visual) ── */}
        <div id="receipt-print-area" className="space-y-4 font-mono text-[12px] pt-4 pb-4">
          <div className="text-center border-b border-dashed border-border pb-3">
            <p className="font-bold text-[14px] uppercase tracking-wide text-foreground mb-4">Struk Pembayaran</p>
            <h3 className="font-bold text-[15px] text-foreground">{store?.name || 'Toko'}</h3>
            {store?.address && <p className="text-muted-foreground whitespace-pre-wrap mt-1">{store.address}</p>}
          </div>
          <div className="space-y-1 border-b border-dashed border-border pb-3 pt-1">
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
          <div className="text-center text-muted-foreground pt-3 border-t border-dashed border-border flex flex-col items-center">
            <p>Terima kasih sudah berbelanja!</p>
            <p className="mt-3 px-4 text-[11px]">Barang dapat di-refund/tukar</p>
            <p className="px-4 text-[11px]">Syarat & Ketentuan Berlaku</p>
            <div className="mt-4 mb-2">
              <QRCodeSVG 
                value={sale.invoice_number} 
                size={80}
                bgColor={"#ffffff"}
                fgColor={"#000000"}
                level={"L"}
                includeMargin={false}
              />
            </div>
            <p className="mt-1">{sale.invoice_number}</p>
          </div>
        </div>

        {/* ── Keyboard hints ── */}
        <div className="flex items-center justify-center gap-3 pt-1 text-[10px] text-muted-foreground">
          <span><kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono text-[9px]">Esc</kbd> Tutup</span>
          <span><kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono text-[9px]">Enter</kbd> Cetak Struk</span>
          <span><kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono text-[9px]">Ctrl Enter</kbd> +Faktur</span>
        </div>

        {/* ── Footer: Tiga Tombol ── */}
        <div className="flex items-center gap-2 pt-1">
          {/* Tombol 1: Tutup (secondary/outline) */}
          <Button
            variant="outline"
            className="flex-none px-3 h-9 border-slate-300 text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4 mr-1.5" />
            Tutup
          </Button>

          {/* Tombol 2: Cetak Struk (primary solid ungu) */}
          <Button
            className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
            onClick={handlePrintStruk}
            title="Cetak Struk Thermal (Enter)"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Cetak Struk
          </Button>

          {/* Tombol 3: Cetak Struk + Faktur (emerald) */}
          <Button
            className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
            onClick={handlePrintBoth}
            title="Cetak Struk + Faktur A4 (Shift+Enter)"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            +Faktur
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
