import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LAYOUT } from './layout';
import { InvoiceData } from './types';

const BLACK: [number, number, number] = [0, 0, 0];

/** Creates a 9.5 × 5.5 inch PDF page for each half of the continuous form. */
export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [LAYOUT.pageWidth, LAYOUT.pageHeight],
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
    head: [['NO', 'NAMA BARANG', 'QTY', 'TIPE', 'SATUAN', 'SUBTOTAL']],
    body,
    theme: 'plain',
    showHead: 'everyPage',
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    styles: {
      font: 'courier', fontStyle: 'bold', fontSize: 9.5, textColor: BLACK,
      lineWidth: 0, cellPadding: 0.5, minCellHeight: 5.5, valign: 'middle', overflow: 'linebreak',
    },
    headStyles: { font: 'courier', fontStyle: 'bold', fontSize: 9.5, textColor: BLACK, fillColor: [255, 255, 255], lineWidth: 0, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 8,    halign: 'center' },   // NO       →  8
      1: { cellWidth: 74,   halign: 'left'   },   // NAMA     → 74
      2: { cellWidth: 11,   halign: 'center' },   // QTY      → 11
      3: { cellWidth: 14,   halign: 'center' },   // TIPE     → 14
      4: { cellWidth: 37.5, halign: 'right'  },   // SATUAN   → 37.5
      5: { cellWidth: 37.5, halign: 'right'  },   // SUBTOTAL → 37.5
    },                                             // TOTAL    = 182 mm ✓

    willDrawPage: () => drawHeader(doc, data),
    didDrawPage: () => drawFooter(doc, data),
    didDrawCell: (hook) => {
      if (hook.column.index === 5 && (hook.section === 'head' || hook.section === 'body')) {
        drawDashedRule(doc, LAYOUT.left, hook.cell.y + hook.cell.height, LAYOUT.left + LAYOUT.contentWidth);
      }
    },
  });

  return doc;
}

function drawHeader(doc: jsPDF, data: InvoiceData): void {
  const left = LAYOUT.left;
  const right = left + LAYOUT.contentWidth;
  const infoColumn = left + LAYOUT.contentWidth / 2;
  write(doc, ellipsis(doc, data.store.name || '-', 108), left, 10, 12.5, 'bold');
  const addressLines = addressLinesFor(doc, data.store.address);
  addressLines.forEach((address, index) => write(doc, address, left, 15 + index * 4, 9.5, 'bold'));
  write(doc, `Telp ${ellipsis(doc, data.store.phone || '-', 72)}`, left, 23, 9.5, 'bold');
  write(doc, 'INVOICE', right, 10, 12, 'bold', 'right');
  write(doc, `No. Invoice: ${ellipsis(doc, data.invoice_number || '-', 54)}`, right, 15, 10, 'bold', 'right');
  const firstRowY  = 31;   // +4mm gap setelah blok identitas toko
  const secondRowY = 36;
  const thirdRowY  = 41;
  const leftColonX = left + 16;
  const leftValueX = left + 20;
  const rightColonX = infoColumn + 23;
  const rightValueX = infoColumn + 27;

  writeLabeledValue(doc, 'Customer', ellipsis(doc, customerIdentity(data), 70), left, leftColonX, leftValueX, firstRowY, 'bold');
  writeLabeledValue(doc, 'Petugas', ellipsis(doc, data.cashier || '-', 70), left, leftColonX, leftValueX, secondRowY, 'bold');
  writeLabeledValue(doc, 'Status', paymentStatus(data.payment_status), left, leftColonX, leftValueX, thirdRowY, 'bold');
  writeLabeledValue(doc, 'Tgl Rilis', formatDate(data.date), infoColumn, rightColonX, rightValueX, firstRowY, 'bold');
  writeLabeledValue(doc, 'Jatuh Tempo', formatDate(data.due_date), infoColumn, rightColonX, rightValueX, secondRowY, 'bold');
  drawDashedRule(doc, left, 45, right);
}

function drawFooter(doc: jsPDF, data: InvoiceData): void {
  const left = LAYOUT.left;
  const right = left + LAYOUT.contentWidth;
  const summaryLeft = right - 70;
  const footerY = LAYOUT.footerStartY;
  write(doc, 'Catatan: ', left, footerY + 2, 9.5, 'bold');
  write(doc, ellipsis(doc, data.note || '-', 110), left, footerY + 7, 9.5, 'bold');
  summary(doc, 'TOTAL', money(data.total), summaryLeft, right, footerY + 2, true);
  summary(doc, 'Dibayar', money(data.paid), summaryLeft, right, footerY + 8);
  const debt = data.payment_status.toLowerCase() === 'debt';
  summary(doc, debt ? 'Sisa Hutang' : 'Kembalian', money(debt ? Math.max(data.total - data.paid, 0) : data.change), summaryLeft, right, footerY + 14);
  summary(doc, 'Metode', paymentMethod(data.payment_method), summaryLeft, right, footerY + 20);
  const recipient = left + 35;
  const store = left + 95;
  write(doc, 'Penerima,', recipient, footerY + 15, 9.5, 'bold', 'center');
  write(doc, 'Hormat Kami,', store, footerY + 15, 9.5, 'bold', 'center');
  rule(doc, recipient - 20, footerY + 32, recipient + 20, footerY + 32, 0.2);
  rule(doc, store - 20, footerY + 32, store + 20, footerY + 32, 0.2);
  write(doc, `Terima kasih - ${ellipsis(doc, data.store.name || '-', 96)}`, left + LAYOUT.contentWidth / 2, footerY + 37, 9.5, 'bold', 'center');
}

function summary(doc: jsPDF, label: string, value: string, left: number, right: number, y: number, bold = false): void {
  const size = bold ? 10 : 9.5;
  write(doc, `${label}:`, left, y, size, 'bold');
  write(doc, value, right, y, size, 'bold', 'right');
}

function write(doc: jsPDF, value: string, x: number, y: number, size: number, style: 'normal' | 'bold', align: 'left' | 'center' | 'right' = 'left'): void {
  doc.setFont('courier', style);
  doc.setFontSize(size);
  doc.text(value, x, y, { align });
}
function writeLabeledValue(
  doc: jsPDF,
  label: string,
  value: string,
  labelX: number,
  colonX: number,
  valueX: number,
  y: number,
  style: 'normal' | 'bold' = 'normal',
): void {
  write(doc, label, labelX, y, 10, style);
  write(doc, ':', colonX, y, 10, style);
  write(doc, value, valueX, y, 10, style);
}
function rule(doc: jsPDF, x1: number, y1: number, x2: number, y2: number, width: number): void { doc.setLineWidth(width); doc.line(x1, y1, x2, y2); }
function drawDashedRule(doc: jsPDF, x1: number, y: number, x2: number): void {
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.line(x1, y, x2, y);
  doc.setLineDashPattern([], 0);
}
function addressLinesFor(doc: jsPDF, address: string | null | undefined): string[] {
  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  return doc.splitTextToSize(address || '-', 108).slice(0, 2);
}
function customerIdentity(data: InvoiceData): string {
  return data.customer_phone ? `${data.customer} (${data.customer_phone})` : data.customer;
}
function ellipsis(doc: jsPDF, value: string, maxWidth: number): string {
  const clean = value.replace(/[\r\n]+/g, ' ').trim() || '-';
  if (doc.getTextWidth(clean) <= maxWidth) return clean;
  let end = clean.length;
  while (end > 0 && doc.getTextWidth(`${clean.slice(0, end)}...`) > maxWidth) end -= 1;
  return `${clean.slice(0, end).trimEnd()}...`;
}
function money(value: number): string { return `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0)}`; }
function formatDate(value: string | null | undefined): string { const date = new Date(value || ''); return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(date); }
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
