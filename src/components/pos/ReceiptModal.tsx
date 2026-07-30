import { useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sale, SaleDetail, Product } from '@/types/pos';
import { formatCurrency } from '@/lib/format';
import { Printer, X, FileText } from 'lucide-react';
import { printInvoice } from '@/components/pos/PrintInvoice';
import { SaleItem } from '@/services/salesService';
import { printerManager, PrinterError } from '@/lib/printer';
import type { PrinterTransaction } from '@/lib/printer';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import {
  formatReceiptDate,
  formatReceiptTime,
} from '@/lib/printer/receiptTemplate';
import { getProductReceiptName } from '@/lib/productUtils';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  saleDetails: (SaleDetail & { product?: Product })[];
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
  store?: { name: string; address?: string | null; phone?: string | null } | null;
}

export function ReceiptModal({
  isOpen,
  onClose,
  sale,
  saleDetails,
  cashierName,
  customerName,
  customerPhone,
  store,
}: ReceiptModalProps) {
  // ─── Handler: Cetak Struk Thermal ─────────────────────────────────────────
  const handlePrintStruk = async () => {
    if (!sale) return;

    const transport = printerManager.getActiveTransport();
    if (transport && transport.isSupported()) {
      try {
        const tx: PrinterTransaction = {
          id: String(sale.id),
          invoiceNumber: sale.invoice_number,
          storeName: store?.name || 'Toko',
          storeAddress: store?.address,
          storePhone: store?.phone,
          cashierName,
          customerName,
          paymentMethod: sale.payment_method as PrinterTransaction['paymentMethod'],
          paymentStatus: sale.payment_status as PrinterTransaction['paymentStatus'],
          items: saleDetails.map(item => ({
            name: item.product ? getProductReceiptName(item.product) : `Produk #${item.product_id}`,
            quantity: item.quantity,
            unitPrice: item.price_at_sale,
            totalPrice: item.total_price,
          })),
          subtotal: sale.grand_total,
          grandTotal: sale.grand_total,
          amountReceived: sale.amount_received || undefined,
          change: sale.change_amount || undefined,
          createdAt: sale.date,
        };

        await printerManager.printReceipt(tx);
        return;
      } catch (err) {
        if (err instanceof PrinterError) {
          // Fallback browser print hanya untuk NO_PRINTER
          if (err.code === 'NO_PRINTER') {
            // Lanjut ke browser print
          } else {
            // Error lain: tampilkan toast dan hentikan
            toast.error(err.message);
            return;
          }
        } else {
          // Unknown error
          toast.error('Gagal mencetak struk. Silakan coba lagi.');
          return;
        }
      }
    }

    // Fallback: open print preview in new window
    const printWindow = window.open('', '_blank');
    if (!printWindow || !sale) return;

    const dateObj = typeof sale.date === 'string' ? new Date(sale.date) : sale.date;
    const dateStr = formatReceiptDate(dateObj);
    const timeStr = formatReceiptTime(dateObj);

    const itemsHtml = saleDetails.map(item => {
      const displayName = item.product ? getProductReceiptName(item.product) : `Produk #${item.product_id}`;
      return `
        <div class="item-name">${displayName}</div>
        <div class="item-row">
          <span>${item.quantity}x ${formatCurrency(item.price_at_sale)}</span>
          <span>${formatCurrency(item.total_price)}</span>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk ${sale.invoice_number}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace; 
            width: 80mm; 
            padding: 4mm; 
            font-size: 12px; 
            line-height: 1.4;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .separator { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .item-name { font-weight: bold; margin-top: 4px; }
          .item-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          @media print {
            @page { size: 80mm auto; margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="center bold">STRUK PEMBAYARAN</div>
        <div class="center" style="margin-top:8px">
          <div class="bold" style="font-size:14px">${store?.name || 'Toko'}</div>
          ${store?.address ? `<div style="margin-top:2px">${store.address}</div>` : ''}
          ${store?.phone ? `<div style="margin-top:2px">${store.phone}</div>` : ''}
        </div>
        <div class="separator"></div>
        <div class="row"><span>No Invoice</span><span>${sale.invoice_number}</span></div>
        <div class="row"><span>Tanggal</span><span>${dateStr} ${timeStr}</span></div>
        <div class="row"><span>Kasir</span><span>${cashierName}</span></div>
        ${customerName ? `<div class="row"><span>Pelanggan</span><span>${customerName}</span></div>` : ''}
        <div class="separator"></div>
        ${itemsHtml}
        <div class="separator"></div>
        <div class="row bold"><span>TOTAL</span><span>${formatCurrency(sale.grand_total)}</span></div>
        <div class="row"><span>Bayar</span><span>${formatCurrency(sale.amount_received || sale.grand_total)}</span></div>
        <div class="row"><span>Kembali</span><span>${formatCurrency(sale.change_amount || 0)}</span></div>
        <div class="separator"></div>
        <div class="center" style="margin-top:8px">
          <div>Terima kasih sudah berbelanja!</div>
          <div style="margin-top:4px;font-size:10px">Barang yang telah dibeli dapat dikembalikan</div>
          <div style="font-size:10px">Syarat & Ketentuan Berlaku</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  // ─── Handler: Print Faktur A4 ─────────────────────────────────────────────
  const handlePrintInvoice = () => {
    if (!sale || !store) return;

    const items: SaleItem[] = saleDetails.map(d => ({
      id: d.id,
      sale_id: sale.id,
      product_id: d.product_id,
      product_name: d.product?.name || `Produk #${d.product_id}`,
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
      customerPhone,
    });
  };

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !sale) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handlePrintInvoice();
      } else if (e.key === 'Enter' && !e.ctrlKey) {
        e.preventDefault();
        handlePrintStruk();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, sale]);

  if (!sale) return null;

  const dateObj = typeof sale.date === 'string' ? new Date(sale.date) : sale.date;
  const dateStr = formatReceiptDate(dateObj);
  const timeStr = formatReceiptTime(dateObj);

  return (
    <Dialog open={isOpen} onOpenChange={(_open) => {}}>
      <DialogContent
        className="sm:max-w-md max-h-[85vh] overflow-hidden gap-0 p-4 flex flex-col"
        hideCloseButton
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >

        <DialogHeader>
          <DialogTitle className="text-center">Struk Pembayaran</DialogTitle>
          <DialogDescription className="sr-only">
            Modal struk pembayaran dengan tombol cetak thermal dan faktur A4
          </DialogDescription>
        </DialogHeader>

        {/* ── Receipt Preview Viewport ── */}
        {/*
          Konsep: PDF Viewer / Print Preview
          - Viewport: tinggi tetap, overflow-y-auto (hanya area ini yang scroll)
          - Receipt: dirender di dalam viewport, di-scale dengan CSS zoom ~0.68
          - zoom (bukan transform:scale) dipilih karena mempengaruhi layout flow
            sehingga tinggi yang ditempuh di DOM juga ikut dikecilkan.
          - Modal tidak pernah berubah tinggi. Tombol selalu terlihat.
        */}
        <div
          className="my-2 rounded-lg border bg-slate-100 dark:bg-slate-800 overflow-y-auto overflow-x-hidden py-4 flex-shrink-0"
          style={{ height: '420px' }}
        >
          {/* Receipt paper — scaled 68% untuk preview */}
          <div
            className="bg-white text-black shadow-md rounded-sm border border-slate-200 mx-auto w-[240px] h-fit flex-shrink-0 space-y-4 font-mono text-[11px] leading-relaxed p-4"
          >

              {/* Header toko */}
              <div className="text-center border-b border-dashed pb-3">
                <p className="font-bold text-sm uppercase mb-3">STRUK PEMBAYARAN</p>
                <h3 className="font-bold text-base">{store?.name || 'Toko'}</h3>
                {store?.address && <p className="text-muted-foreground mt-1">{store.address}</p>}
                {store?.phone && <p className="text-muted-foreground mt-0.5">{store.phone}</p>}
              </div>

              {/* Info transaksi */}
              <div className="space-y-1 border-b border-dashed pb-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">No Invoice</span>
                  <span className="font-medium">{sale.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tanggal</span>
                  <span className="font-medium">{dateStr} {timeStr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kasir</span>
                  <span className="font-medium">{cashierName}</span>
                </div>
                {customerName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pelanggan</span>
                    <span className="font-medium">{customerName}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="space-y-2.5 border-b border-dashed pb-3">
                {saleDetails.map((item, idx) => {
                  const displayName = item.product ? getProductReceiptName(item.product) : `Produk #${item.product_id}`;
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="font-medium">{displayName}</div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>{item.quantity}x {formatCurrency(item.price_at_sale)}</span>
                        <span className="font-medium">{formatCurrency(item.total_price)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Payment summary */}
              <div className="space-y-1 border-b border-dashed pb-3">
                <div className="flex justify-between font-bold text-sm">
                  <span>TOTAL</span>
                  <span>{formatCurrency(sale.grand_total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bayar</span>
                  <span className="font-medium">{formatCurrency(sale.amount_received || sale.grand_total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kembali</span>
                  <span className="font-medium">{formatCurrency(sale.change_amount || 0)}</span>
                </div>
              </div>

              {/* Footer + QR */}
              <div className="text-center text-muted-foreground text-[11px] space-y-1">
                <p className="font-medium">Terima kasih sudah berbelanja!</p>
                <div className="h-1" />
                <p>Barang yang telah dibeli dapat dikembalikan</p>
                <p>Syarat &amp; Ketentuan Berlaku</p>
                <div className="pt-3 pb-2 flex justify-center">
                  <QRCodeSVG
                    value={sale.invoice_number}
                    size={80}
                    bgColor={"#ffffff"}
                    fgColor={"#000000"}
                    level={"L"}
                  />
                </div>
                <p className="text-xs font-medium text-foreground">{sale.invoice_number}</p>
              </div>

            </div>
        </div>

        {/* ── Keyboard Hints ── */}
        <div className="flex-shrink-0 flex items-center justify-center gap-3 pt-2 pb-1 text-[10px] text-muted-foreground">
          <span><kbd className="px-1 py-0.5 rounded border bg-muted font-mono text-[9px]">Esc</kbd> Tutup</span>
          <span><kbd className="px-1 py-0.5 rounded border bg-muted font-mono text-[9px]">Enter</kbd> Cetak Struk</span>
          <span><kbd className="px-1 py-0.5 rounded border bg-muted font-mono text-[9px]">Ctrl+Enter</kbd> Print Faktur</span>
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex-shrink-0 flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            className="flex-none px-3"
            onClick={onClose}
          >
            <X className="w-4 h-4 mr-1.5" />
            Tutup
          </Button>

          <Button
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            onClick={handlePrintStruk}
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Cetak Struk
          </Button>

          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            onClick={handlePrintInvoice}
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Print Faktur
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
