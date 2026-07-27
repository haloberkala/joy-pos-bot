/**
 * Thermal Receipt Builder - Rebuild Total
 * 
 * Implementasi baru yang fokus pada:
 * - Hasil cetak fisik yang identik dengan UI
 * - Struktur yang sederhana dan mudah di-debug
 * - Alignment yang konsisten
 * - State management yang jelas
 */

import { EscPosBuilder } from './escpos';
import { PrinterTransaction, PaperWidth, DrawerPin } from './types';
import { formatCurrency } from '@/lib/format';

/**
 * Lebar karakter untuk setiap ukuran kertas
 */
function getWidth(paper: PaperWidth): number {
  return paper === 80 ? 48 : 32;
}

/**
 * Format tanggal untuk receipt
 */
function fmtDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('id-ID', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
}

/**
 * Format waktu untuk receipt
 */
function fmtTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Build thermal receipt
 */
export function buildReceipt(
  tx: PrinterTransaction,
  paperWidth: PaperWidth = 80,
  drawerPin: DrawerPin = 'pin2',
): Uint8Array {
  const width = getWidth(paperWidth);
  const builder = new EscPosBuilder();

  // ═══════════════════════════════════════════════════════════════════════════
  // INIT - Reset printer ke state default
  // ═══════════════════════════════════════════════════════════════════════════
  builder
    .init()
    .newline(); // Feed kosong setelah reset untuk posisi print head yang aman

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  builder
    .align('center')
    .bold(true)
    .line('STRUK PEMBAYARAN')
    .bold(false)
    .newline();

  // ═══════════════════════════════════════════════════════════════════════════
  // STORE INFO
  // ═══════════════════════════════════════════════════════════════════════════
  builder
    .bold(true)
    .line(tx.storeName)
    .bold(false);

  if (tx.storeAddress) {
    builder.line(tx.storeAddress);
  }

  if (tx.storePhone) {
    builder.line(tx.storePhone);
  }

  builder
    .newline()
    .separator('-', width);

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSACTION INFO
  // ═══════════════════════════════════════════════════════════════════════════
  builder.align('left');

  const dateStr = fmtDate(tx.createdAt);
  const timeStr = fmtTime(tx.createdAt);

  builder
    .row('No Invoice', tx.invoiceNumber, width)
    .row('Tanggal', `${dateStr} ${timeStr}`, width)
    .row('Kasir', tx.cashierName, width);

  if (tx.customerName) {
    builder.row('Pelanggan', tx.customerName, width);
  }

  builder.separator('-', width);

  // ═══════════════════════════════════════════════════════════════════════════
  // ITEMS
  // ═══════════════════════════════════════════════════════════════════════════
  for (const item of tx.items) {
    // Baris 1: Nama produk
    builder.line(item.name);

    // Baris 2: Qty x Harga [spaces] Subtotal
    const qtyPrice = `${item.quantity} x ${formatCurrency(item.unitPrice)}`;
    const subtotal = formatCurrency(item.totalPrice);
    builder.row(qtyPrice, subtotal, width);
  }

  builder.separator('-', width);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  builder
    .bold(true)
    .row('TOTAL', formatCurrency(tx.grandTotal), width)
    .bold(false)
    .row('Bayar', formatCurrency(tx.amountReceived || tx.grandTotal), width)
    .row('Kembali', formatCurrency(tx.change || 0), width)
    .separator('-', width);

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  builder
    .align('center')
    .line('Terima kasih sudah berbelanja!')
    .newline()
    .line('Barang yang telah dibeli dapat dikembalikan')
    .line('Syarat & Ketentuan Berlaku')
    .newline();

  // ═══════════════════════════════════════════════════════════════════════════
  // QR CODE
  // ═══════════════════════════════════════════════════════════════════════════
  builder
    .qr(tx.invoiceNumber, 5)
    .line(tx.invoiceNumber)
    .newline()
    .newline();

  // ═══════════════════════════════════════════════════════════════════════════
  // END
  // ═══════════════════════════════════════════════════════════════════════════
  builder
    .feed(3)
    .cut()
    .drawer(drawerPin);

  return builder.build();
}

/**
 * Build kitchen ticket
 */
export function buildKitchenTicket(
  tx: PrinterTransaction,
  paperWidth: PaperWidth = 80,
): Uint8Array {
  const width = getWidth(paperWidth);
  const builder = new EscPosBuilder();

  builder
    .init()
    .align('center')
    .bold(true)
    .line('ORDER TICKET')
    .bold(false)
    .separator('=', width)
    .align('left');

  const dateStr = fmtDate(tx.createdAt);
  const timeStr = fmtTime(tx.createdAt);

  builder
    .row('No.', tx.invoiceNumber, width)
    .row('Waktu', `${dateStr} ${timeStr}`, width);

  if (tx.customerName) {
    builder.row('Pelanggan', tx.customerName, width);
  }

  builder.separator('-', width);

  for (const item of tx.items) {
    builder
      .bold(true)
      .line(`${item.quantity}x ${item.name}`)
      .bold(false);
  }

  builder
    .separator('=', width)
    .feed(3)
    .cut();

  return builder.build();
}
