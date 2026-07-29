import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LAYOUT } from './layout';
import { InvoiceData } from './types';

const BLACK: [number, number, number] = [0, 0, 0];

/** Creates a 9.5 × 5.5 inch PDF page for each half of the continuous form. */
export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF({
    // jsPDF swaps custom dimensions in portrait mode when width > height.
    // Keep the physical PDF page at 241.3 × 139.7 mm for the half-form.
    orientation: 'landscape',
    unit: 'mm',
    format: [241.3, 139.7],
    putOnlyUsedFonts: true,
    compress: false,
  });
  doc.setTextColor(...BLACK);
  doc.setDrawColor(...BLACK);

  const body = data.items.length
    ? data.items.map((item) => [String(item.no), item.name || '-', String(item.qty), item.type || 'ECR', money(item.price), money(item.total)])
    : [['', '', '', '', '', '']];

  autoTable(doc, {
    startY: LAYOUT.tableStartY,
    margin: { left: LAYOUT.left, right: LAYOUT.right, top: LAYOUT.tableStartY, bottom: LAYOUT.tableBottomMargin },
    head: [['NO', 'NAMA BARANG', 'QTY', 'TIPE', 'HARGA', 'JUMLAH']],
    body,
    theme: 'plain',
    showHead: 'everyPage',
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    styles: {
      font: 'courier', fontStyle: 'normal', fontSize: 8.5, textColor: BLACK,
      lineColor: BLACK, lineWidth: 0.2, cellPadding: { top: 1.2, right: 1, bottom: 1.2, left: 1 },
      minCellHeight: 7, valign: 'middle', overflow: 'ellipsize',
    },
    headStyles: { font: 'courier', fontStyle: 'bold', fontSize: 8, textColor: BLACK, fillColor: [255, 255, 255], lineColor: BLACK, lineWidth: 0.3, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 82, halign: 'left' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 37, halign: 'right' },
      5: { cellWidth: 38.3, halign: 'right' },
    },
    willDrawPage: () => drawHeader(doc, data),
    didDrawPage: () => drawFooter(doc, data),
  });

  return doc;
}

function drawHeader(doc: jsPDF, data: InvoiceData): void {
  const left = LAYOUT.left;
  const right = left + LAYOUT.contentWidth;
  write(doc, ellipsis(doc, data.store.name || '-', 110), left, 9, 11, 'bold');
  const address = [data.store.address, data.store.phone ? `Telp ${data.store.phone}` : ''].filter(Boolean).join(' | ');
  write(doc, ellipsis(doc, address || '-', 130), left, 14, 7, 'normal');
  write(doc, 'FAKTUR', right, 9, 10, 'bold', 'right');
  write(doc, ellipsis(doc, data.invoice_number || '-', 60), right, 14, 8.5, 'bold', 'right');
  rule(doc, left, 17, right, 17, 0.35);
  write(doc, 'Customer', left, 22, 7, 'bold');
  write(doc, 'Tanggal', left + 103, 22, 7, 'bold');
  write(doc, ellipsis(doc, data.customer || '-', 95), left, 27, 8, 'normal');
  write(doc, formatDate(data.date), left + 103, 27, 8, 'normal');
  write(doc, `Kasir: ${ellipsis(doc, data.cashier || '-', 62)}`, left, 32, 7.5, 'normal');
  write(doc, `${paymentStatus(data.payment_status)}`, left + 103, 32, 7.5, 'bold');
}

function drawFooter(doc: jsPDF, data: InvoiceData): void {
  const left = LAYOUT.left;
  const right = left + LAYOUT.contentWidth;
  const summaryLeft = right - 70;
  write(doc, 'Catatan', left, 108, 7, 'bold');
  write(doc, ellipsis(doc, data.note || '-', 108), left, 113, 7, 'normal');
  summary(doc, 'TOTAL', money(data.total), summaryLeft, right, 108, true);
  summary(doc, 'Dibayar', money(data.paid), summaryLeft, right, 114);
  const debt = data.payment_status.toLowerCase() === 'debt';
  summary(doc, debt ? 'Sisa Hutang' : 'Kembalian', money(debt ? Math.max(data.total - data.paid, 0) : data.change), summaryLeft, right, 120);
  const recipient = left + 42;
  const store = left + 105;
  write(doc, 'Penerima,', recipient, 120, 7.5, 'normal', 'center');
  write(doc, 'Hormat Kami,', store, 120, 7.5, 'normal', 'center');
  rule(doc, recipient - 20, 132, recipient + 20, 132, 0.2);
  rule(doc, store - 20, 132, store + 20, 132, 0.2);
  write(doc, `Terima kasih - ${ellipsis(doc, data.store.name || '-', 95)}`, left + LAYOUT.contentWidth / 2, 137, 7, 'normal', 'center');
}

function summary(doc: jsPDF, label: string, value: string, left: number, right: number, y: number, bold = false): void {
  write(doc, label, left, y, bold ? 10 : 8, bold ? 'bold' : 'normal');
  write(doc, value, right, y, bold ? 10 : 8, bold ? 'bold' : 'normal', 'right');
}

function write(doc: jsPDF, value: string, x: number, y: number, size: number, style: 'normal' | 'bold', align: 'left' | 'center' | 'right' = 'left'): void {
  doc.setFont('courier', style);
  doc.setFontSize(size);
  doc.text(value, x, y, { align });
}
function rule(doc: jsPDF, x1: number, y1: number, x2: number, y2: number, width: number): void { doc.setLineWidth(width); doc.line(x1, y1, x2, y2); }
function ellipsis(doc: jsPDF, value: string, maxWidth: number): string {
  const clean = value.replace(/[\r\n]+/g, ' ').trim() || '-';
  if (doc.getTextWidth(clean) <= maxWidth) return clean;
  let end = clean.length;
  while (end > 0 && doc.getTextWidth(`${clean.slice(0, end)}...`) > maxWidth) end -= 1;
  return `${clean.slice(0, end).trimEnd()}...`;
}
function money(value: number): string { return `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0)}`; }
function formatDate(value: string): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(date); }
function paymentMethod(value: string): string { return ({ cash: 'Tunai', transfer: 'Transfer', qris: 'QRIS', debt: 'Kredit' } as Record<string, string>)[value.toLowerCase()] || value; }
function paymentStatus(value: string): string { return ({ paid: 'LUNAS', debt: 'BELUM LUNAS', partial: 'SEBAGIAN', refunded: 'REFUND' } as Record<string, string>)[value.toLowerCase()] || value.toUpperCase(); }

/** Opens only the generated PDF; no HTML/iframe print renderer is involved. */
export function printPDF(doc: jsPDF): void { previewPDF(doc); }
export function downloadPDF(doc: jsPDF, filename: string): void { doc.save(filename); }
export function previewPDF(doc: jsPDF): void {
  const url = URL.createObjectURL(doc.output('blob'));
  window.open(url, '_blank');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
