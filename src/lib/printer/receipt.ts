/**
 * lib/printer/receipt.ts — ReceiptBuilder & KitchenTicketBuilder.
 * Mengambil PrinterTransaction, menghasilkan Uint8Array ESC/POS.
 * Tidak tahu cara mengirim ke printer (tugas webserial.ts).
 */

import { EscPos } from './escpos';
import { PrinterTransaction, PaperWidth, DrawerPin } from './types';

const FMT = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

function columns(w: PaperWidth): number { return w === 80 ? 48 : 32; }

function formatDate(d: Date | string): { date: string; time: string } {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return {
    date: dt.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer',
};

// ── ReceiptBuilder ────────────────────────────────────────────────────────────

export function buildReceipt(
  tx: PrinterTransaction,
  paperWidth: PaperWidth = 80,
  drawerPin: DrawerPin = 'pin2',
): Uint8Array {
  const col = columns(paperWidth);
  const { date, time } = formatDate(tx.createdAt);

  const parts: number[][] = [
    // ── Init ──────────────────────────────────────────────────────────────────
    EscPos.init(),

    // ── Header Toko ───────────────────────────────────────────────────────────
    EscPos.align('center'),
    EscPos.bold(true),
    EscPos.text(tx.storeName.toUpperCase()),
    EscPos.bold(false),
  ];

  if (tx.storeAddress) {
    parts.push(EscPos.wrap(tx.storeAddress, col));
  }

  parts.push(
    EscPos.separator('=', col),

    // ── Info Transaksi ─────────────────────────────────────────────────────────
    EscPos.align('left'),
    EscPos.twoCol('No.', tx.invoiceNumber, col),
    EscPos.twoCol('Tanggal', date, col),
    EscPos.twoCol('Waktu', time, col),
    EscPos.twoCol('Kasir', tx.cashierName, col),
  );

  if (tx.customerName) {
    parts.push(EscPos.twoCol('Pelanggan', tx.customerName, col));
  }

  parts.push(
    EscPos.separator('-', col),

    // ── Item ──────────────────────────────────────────────────────────────────
    EscPos.align('left'),
  );

  for (const item of tx.items) {
    // Nama produk (potong jika terlalu panjang)
    parts.push(EscPos.text(item.name.substring(0, col)));
    // Qty × harga = subtotal
    const qtyPrice = `  ${item.quantity}x ${FMT(item.unitPrice)}`;
    parts.push(EscPos.twoCol(qtyPrice, FMT(item.totalPrice), col));
  }

  parts.push(EscPos.separator('-', col));

  // ── Summary ───────────────────────────────────────────────────────────────
  if (tx.discount && tx.discount > 0) {
    parts.push(
      EscPos.twoCol('Subtotal', FMT(tx.subtotal), col),
      EscPos.twoCol('Diskon', `-${FMT(tx.discount)}`, col),
    );
  }

  parts.push(
    EscPos.bold(true),
    EscPos.twoCol('TOTAL', FMT(tx.grandTotal), col),
    EscPos.bold(false),
    EscPos.twoCol('Metode', PAYMENT_LABEL[tx.paymentMethod] ?? tx.paymentMethod.toUpperCase(), col),
  );

  if (tx.paymentMethod === 'cash' && tx.amountReceived && tx.amountReceived > 0) {
    parts.push(
      EscPos.twoCol('Bayar', FMT(tx.amountReceived), col),
      EscPos.twoCol('Kembali', FMT(tx.change ?? 0), col),
    );
  }

  if (tx.paymentStatus === 'debt') {
    parts.push(
      EscPos.separator('-', col),
      EscPos.align('center'),
      EscPos.bold(true),
      EscPos.text('*** BELUM LUNAS ***'),
      EscPos.bold(false),
    );
  }

  if (tx.note) {
    parts.push(
      EscPos.separator('-', col),
      EscPos.align('left'),
      EscPos.wrap(`Catatan: ${tx.note}`, col),
    );
  }

  parts.push(
    EscPos.separator('=', col),

    // ── Footer ────────────────────────────────────────────────────────────────
    EscPos.align('center'),
    EscPos.text('Terima kasih sudah berbelanja!'),
    EscPos.text('Barang yang dibeli tidak dapat'),
    EscPos.text('dikembalikan tanpa nota.'),
    EscPos.text(''),

    // QR Code invoice number
    EscPos.qr(tx.invoiceNumber, 5),
    EscPos.text(tx.invoiceNumber),

    // ── Feed → Cut → Kick Drawer (satu stream, tidak ada race condition) ───────
    EscPos.feedFallback(5),
    EscPos.cut(),
    EscPos.kickDrawer(drawerPin),
  );

  return EscPos.build(...parts);
}

// ── KitchenTicketBuilder ──────────────────────────────────────────────────────

export function buildKitchenTicket(
  tx: PrinterTransaction,
  paperWidth: PaperWidth = 80,
): Uint8Array {
  const col = columns(paperWidth);
  const { date, time } = formatDate(tx.createdAt);

  const parts: number[][] = [
    EscPos.init(),
    EscPos.align('center'),
    EscPos.bold(true),
    EscPos.text('ORDER TICKET'),
    EscPos.bold(false),
    EscPos.separator('=', col),
    EscPos.align('left'),
    EscPos.twoCol('No.', tx.invoiceNumber, col),
    EscPos.twoCol('Waktu', `${date} ${time}`, col),
  ];

  if (tx.customerName) {
    parts.push(EscPos.twoCol('Pelanggan', tx.customerName, col));
  }

  parts.push(EscPos.separator('-', col));

  for (const item of tx.items) {
    parts.push(
      EscPos.bold(true),
      EscPos.text(`${item.quantity}x ${item.name}`),
      EscPos.bold(false),
    );
  }

  parts.push(
    EscPos.separator('=', col),
    EscPos.feedFallback(4),
    EscPos.cut(),
  );

  return EscPos.build(...parts);
}
