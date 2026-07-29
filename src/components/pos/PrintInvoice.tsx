import { Sale, SaleItem } from '@/services/salesService';
import { formatCurrency } from '@/lib/format';

interface Store {
  name: string;
  address?: string | null;
  phone?: string | null;
}

interface PrintInvoiceProps {
  sale: Sale;
  items: SaleItem[];
  store: Store;
  customerName?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const ITEMS_PER_HALF = 12; // Maximum items per half-page

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface HalfPageData {
  items: SaleItem[];
  startIndex: number; // Global item index (0-based)
}

interface SheetData {
  topHalf: HalfPageData;
  bottomHalf: HalfPageData | null;
}

interface InvoiceContext {
  sale: Sale;
  store: Store;
  customer: string;
  status: string;
  payMethod: string;
  subTotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  amountReceived: number;
  changeAmount: number;
  safeDate: (v: string | null | undefined) => string;
  safeDateShort: (v: string | null | undefined) => string;
  paymentLabel: Record<string, string>;
  statusLabel: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Print Invoice - Continuous Form 9.5 x 11 inch
 * REFACTORED FOR EPSON LX-310 DOT MATRIX
 * 
 * Each sheet contains TWO half-pages (5.5 inch each)
 * Each half-page is self-contained and can stand alone
 */
export function printInvoice({ sale, items, store, customerName }: PrintInvoiceProps) {
  // Build invoice context
  const context = buildInvoiceContext(sale, store, customerName);
  
  // Create pagination structure
  const sheets = buildPagination(items);
  
  // Generate HTML
  const html = generatePrintHTML(context, sheets);
  
  // Execute print
  executePrint(html);
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

function buildInvoiceContext(
  sale: Sale, 
  store: Store, 
  customerName?: string
): InvoiceContext {
  const safeDate = (v: string | null | undefined) => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
      }).format(new Date(v ?? Date.now()));
    } catch { return '-'; }
  };

  const safeDateShort = (v: string | null | undefined) => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      }).format(new Date(v ?? Date.now()));
    } catch { return '-'; }
  };

  const paymentLabel: Record<string, string> = {
    cash: 'Tunai', 
    transfer: 'Transfer', 
    qris: 'QRIS', 
    debt: 'Kredit',
  };

  const statusLabel: Record<string, string> = {
    paid: 'LUNAS', 
    debt: 'BELUM LUNAS', 
    partial: 'SEBAGIAN', 
    refunded: 'REFUND',
  };

  return {
    sale,
    store,
    customer: customerName || 'Umum',
    status: sale.payment_status ?? 'paid',
    payMethod: sale.payment_method ?? 'cash',
    subTotal: sale.sub_total ?? 0,
    discount: sale.discount ?? 0,
    tax: sale.tax ?? 0,
    grandTotal: sale.grand_total ?? 0,
    amountReceived: sale.amount_received ?? 0,
    changeAmount: sale.change_amount ?? 0,
    safeDate,
    safeDateShort,
    paymentLabel,
    statusLabel,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGINATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

function buildPagination(items: SaleItem[]): SheetData[] {
  const halfPages = splitItems(items);
  const sheets: SheetData[] = [];
  
  for (let i = 0; i < halfPages.length; i += 2) {
    const topHalf = halfPages[i];
    const bottomHalf = halfPages[i + 1] || null;
    
    sheets.push({
      topHalf,
      bottomHalf,
    });
  }
  
  return sheets;
}

function splitItems(items: SaleItem[]): HalfPageData[] {
  const halfPages: HalfPageData[] = [];
  
  if (items.length === 0) {
    halfPages.push({
      items: [],
      startIndex: 0,
    });
    return halfPages;
  }
  
  for (let i = 0; i < items.length; i += ITEMS_PER_HALF) {
    const chunk = items.slice(i, i + ITEMS_PER_HALF);
    halfPages.push({
      items: chunk,
      startIndex: i,
    });
  }
  
  return halfPages;
}

// ═══════════════════════════════════════════════════════════════════════════
// HTML GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

function generatePrintHTML(context: InvoiceContext, sheets: SheetData[]): string {
  const styles = generateStyles();
  const sheetsHTML = sheets.map(sheet => renderSheet(context, sheet)).join('');
  
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <title>Faktur ${context.sale.invoice_number}</title>
  ${styles}
</head>
<body>
  ${sheetsHTML}
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// CSS STYLES - REFACTORED FOR EPSON LX-310
// ═══════════════════════════════════════════════════════════════════════════

function generateStyles(): string {
  return `<style>
    /*
    ════════════════════════════════════════════════════════════════════════
    EPSON LX-310 DOT MATRIX PRINTER STYLESHEET
    TOTAL REFACTOR - Production Ready
    
    Target: Windows 10/11 + Chrome + Epson LX-310 ESC/P Driver
    Paper: Continuous Form 9.5 × 11 inch
    Layout: TWO half-pages per sheet (5.5 inch each)
    
    KEY PRINCIPLES:
    1. @page controls paper size, NOT html/body width
    2. Each half-page EXACTLY 50% of sheet height
    3. Larger fonts (10-12pt) for dot matrix readability
    4. Thicker borders (1.5pt+) for ribbon visibility
    5. Table-based layout (not flexbox) for stability
    6. Pure black (#000) text only
    7. No backgrounds (won't print anyway)
    8. Monospace fonts for dot matrix clarity
    9. Compact spacing (no wasted space)
    10. Matches Windows Test Page quality
    ════════════════════════════════════════════════════════════════════════
    */

    /* ═══ RESET ═══ */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    /* ═══ BASE - No fixed widths! ═══ */
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      line-height: 1.2;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ═══ SHEET STRUCTURE ═══ */
    .sheet {
      width: 100%;
      height: 100%;
      page-break-after: always;
      display: flex;
      flex-direction: column;
    }

    .sheet:last-child {
      page-break-after: auto;
    }

    /* ═══ HALF-PAGE - FIXED 50% HEIGHT ═══ */
    .half-page {
      width: 100%;
      height: 50%;
      padding: 0.15in 0.25in;
      display: flex;
      flex-direction: column;
      page-break-inside: avoid;
      position: relative;
    }

    /* Visual separator on screen only */
    .half-page:first-child {
      border-bottom: 1pt dashed #ccc;
    }

    /* ═══ HEADER ═══ */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6pt;
    }

    .header-table td {
      vertical-align: top;
      padding: 0;
    }

    .header-table td:first-child {
      width: 58%;
    }

    .header-table td:last-child {
      width: 42%;
      text-align: right;
    }

    .company-name {
      font-size: 13pt;
      font-weight: bold;
      color: #000;
      line-height: 1.1;
      margin-bottom: 2pt;
    }

    .company-detail {
      font-size: 9pt;
      line-height: 1.3;
      color: #000;
    }

    .faktur-title {
      font-size: 15pt;
      font-weight: bold;
      color: #000;
      letter-spacing: 1.5pt;
    }

    .inv-number {
      font-size: 9pt;
      font-weight: bold;
      color: #000;
      margin-top: 2pt;
    }

    .status-badge {
      display: inline-block;
      border: 2pt solid #000;
      padding: 1pt 6pt;
      font-size: 8pt;
      font-weight: bold;
      color: #000;
      margin-top: 3pt;
      letter-spacing: 0.8pt;
    }

    /* ═══ SEPARATOR ═══ */
    .separator {
      border: none;
      border-top: 1.5pt solid #000;
      margin: 5pt 0;
      height: 0;
    }

    /* ═══ INFO GRID ═══ */
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6pt;
    }

    .info-table td {
      vertical-align: top;
      padding: 0 4pt 0 0;
      width: 25%;
    }

    .info-table td:first-child {
      width: 28%;
    }

    .info-label {
      font-size: 7pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #000;
      display: block;
      margin-bottom: 1pt;
    }

    .info-value {
      font-size: 9pt;
      font-weight: bold;
      color: #000;
      line-height: 1.2;
    }

    .bill-to {
      border-left: 2.5pt solid #000;
      padding-left: 6pt;
    }

    /* ═══ ITEMS TABLE ═══ */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6pt;
      font-size: 9pt;
    }

    .items-table thead th {
      padding: 4pt 4pt;
      font-size: 8pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #000;
      border-top: 1.5pt solid #000;
      border-bottom: 1.5pt solid #000;
      text-align: left;
    }

    .items-table thead th:nth-child(1) { width: 5%; text-align: center; }
    .items-table thead th:nth-child(2) { width: 48%; }
    .items-table thead th:nth-child(3) { width: 7%; text-align: center; }
    .items-table thead th:nth-child(4) { width: 7%; text-align: center; }
    .items-table thead th:nth-child(5) { width: 16%; text-align: right; }
    .items-table thead th:nth-child(6) { width: 17%; text-align: right; }

    .items-table tbody td {
      padding: 3pt 4pt;
      vertical-align: top;
      color: #000;
      border-bottom: 0.75pt solid #000;
    }

    .item-name {
      font-weight: bold;
      font-size: 9pt;
      color: #000;
    }

    .item-code {
      font-size: 7pt;
      color: #000;
      margin-top: 1pt;
    }

    .price-badge {
      font-size: 6pt;
      border: 0.75pt solid #000;
      padding: 0 2pt;
      margin-left: 2pt;
      font-weight: bold;
    }

    /* ═══ BOTTOM SECTION ═══ */
    .bottom-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4pt;
    }

    .bottom-table td {
      vertical-align: top;
      padding: 0;
    }

    .bottom-table td:first-child {
      width: 54%;
      padding-right: 10pt;
    }

    .bottom-table td:last-child {
      width: 46%;
    }

    /* Notes */
    .note-label {
      font-size: 7pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #000;
      margin-bottom: 2pt;
    }

    .note-content {
      border: 1pt solid #000;
      padding: 4pt 6pt;
      min-height: 25pt;
      font-size: 8pt;
      color: #000;
    }

    /* Signature */
    .signature-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8pt;
    }

    .signature-table td {
      width: 50%;
      text-align: center;
      vertical-align: top;
    }

    .sig-label {
      font-size: 7pt;
      font-weight: bold;
      color: #000;
      margin-bottom: 20pt;
      display: block;
    }

    .sig-name {
      border-top: 1pt solid #000;
      padding-top: 2pt;
      font-size: 8pt;
      font-weight: bold;
      color: #000;
    }

    /* Summary */
    .summary-box {
      border: 2pt solid #000;
    }

    .summary-title {
      padding: 3pt 6pt;
      font-size: 7pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #000;
      border-bottom: 1pt solid #000;
    }

    .summary-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
    }

    .summary-table td {
      padding: 3pt 6pt;
      color: #000;
    }

    .summary-table td:last-child {
      text-align: right;
      font-weight: bold;
    }

    .summary-table tr.total td {
      padding: 5pt 6pt;
      font-size: 11pt;
      font-weight: bold;
      border-top: 2pt solid #000;
      border-bottom: 2pt solid #000;
    }

    .summary-table tr.debt td {
      font-weight: bold;
    }

    /* Footer */
    .footer-text {
      margin-top: 6pt;
      font-size: 7pt;
      color: #000;
      text-align: center;
      line-height: 1.3;
    }

    /* ═══════════════════════════════════════════════════════════════════════
       PRINT MEDIA QUERY
       
       CRITICAL: This is where Epson LX-310 gets configured
       @page tells Windows driver the paper size
       Everything else follows printable area
    ════════════════════════════════════════════════════════════════════════ */
    @media print {
      @page {
        size: 9.5in 11in;
        margin: 0.2in 0.25in;
      }

      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
      }

      body {
        font-size: 10pt;
      }

      .sheet {
        width: 100%;
        height: 100%;
        page-break-after: always;
        margin: 0;
        padding: 0;
      }

      .sheet:last-child {
        page-break-after: auto;
      }

      .half-page {
        height: 50%;
        padding: 0.1in 0.15in;
        page-break-inside: avoid;
      }

      /* Remove screen-only separator */
      .half-page:first-child {
        border-bottom: none !important;
      }

      /* Force pure black for all elements */
      * {
        color: #000 !important;
        background: transparent !important;
        opacity: 1 !important;
      }

      /* Ensure borders print clearly */
      .separator,
      .items-table thead th,
      .summary-table tr.total td {
        border-color: #000 !important;
      }

      /* Remove any CSS effects that cause blur */
      * {
        text-shadow: none !important;
        box-shadow: none !important;
        filter: none !important;
        transform: none !important;
      }

      /* Bold elements for ribbon impact */
      .company-name,
      .faktur-title,
      .inv-number,
      .info-value,
      .item-name,
      .sig-name,
      .summary-table tr.total td {
        font-weight: bold !important;
      }
    }

    /* ═══ SCREEN PREVIEW ONLY ═══ */
    @media screen {
      body {
        background: #eee;
        padding: 20px;
      }

      .sheet {
        max-width: 9.5in;
        height: 11in;
        margin: 0 auto 20px;
        background: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
    }
  </style>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDERERS
// ═══════════════════════════════════════════════════════════════════════════

function renderSheet(context: InvoiceContext, sheet: SheetData): string {
  const topHTML = renderHalfPage(context, sheet.topHalf);
  const bottomHTML = sheet.bottomHalf 
    ? renderHalfPage(context, sheet.bottomHalf)
    : '';
  
  return `<div class="sheet">${topHTML}${bottomHTML}</div>`;
}

function renderHalfPage(context: InvoiceContext, halfPage: HalfPageData): string {
  return `
    <div class="half-page">
      ${renderHeader(context)}
      <hr class="separator" />
      ${renderInfo(context)}
      ${renderItems(halfPage)}
      <hr class="separator" />
      ${renderBottom(context)}
    </div>
  `;
}

function renderHeader(context: InvoiceContext): string {
  const { store, sale, status, statusLabel } = context;
  
  return `
    <table class="header-table">
      <tr>
        <td>
          <div class="company-name">${store.name}</div>
          <div class="company-detail">
            ${store.address ? `<div>${store.address}</div>` : ''}
            ${store.phone ? `<div>Telp: ${store.phone}</div>` : ''}
          </div>
        </td>
        <td>
          <div class="faktur-title">FAKTUR</div>
          <div class="inv-number">${sale.invoice_number}</div>
          <span class="status-badge">${statusLabel[status] ?? status.toUpperCase()}</span>
        </td>
      </tr>
    </table>
  `;
}

function renderInfo(context: InvoiceContext): string {
  const { customer, sale, safeDate, safeDateShort, paymentLabel, payMethod, status } = context;
  
  return `
    <table class="info-table">
      <tr>
        <td>
          <div class="bill-to">
            <div class="info-label">Kepada</div>
            <div class="info-value">${customer}</div>
          </div>
        </td>
        <td>
          <div class="info-label">Tanggal</div>
          <div class="info-value">${safeDate(sale.sale_date)}</div>
        </td>
        <td>
          <div class="info-label">Pembayaran</div>
          <div class="info-value">${paymentLabel[payMethod] ?? payMethod}</div>
          ${status === 'debt' && sale.due_date ? `<div style="font-size:6pt;margin-top:1pt">JT: ${safeDateShort(sale.due_date)}</div>` : ''}
        </td>
        <td>
          <div class="info-label">Kasir</div>
          <div class="info-value">${sale.cashier_name ?? '-'}</div>
        </td>
      </tr>
    </table>
  `;
}

function renderItems(halfPage: HalfPageData): string {
  const { items, startIndex } = halfPage;
  
  if (!items || items.length === 0) {
    return `
      <table class="items-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Barang</th>
            <th>Qty</th>
            <th>Tipe</th>
            <th style="text-align:right">Harga</th>
            <th style="text-align:right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="6" style="text-align:center;padding:10pt">— Tidak ada item —</td>
          </tr>
        </tbody>
      </table>
    `;
  }
  
  const rows = items.map((item, idx) => {
    const itemNum = startIndex + idx + 1;
    const unitPrice = item.price_per_unit ?? 0;
    const qty = item.quantity ?? 0;
    const total = item.total_price ?? (unitPrice * qty);
    
    const badge = item.price_mode === 'wholesale' ? '<span class="price-badge">GRS</span>'
      : item.price_mode === 'special' ? '<span class="price-badge">SPL</span>'
      : '';
    
    const typeLabel = item.price_mode === 'wholesale' ? 'GRS'
      : item.price_mode === 'special' ? 'SPL'
      : 'ECR';
    
    return `
      <tr>
        <td style="text-align:center">${itemNum}</td>
        <td>
          <div class="item-name">${item.product_name ?? '-'}${badge}</div>
          ${item.product_code ? `<div class="item-code">${item.product_code}</div>` : ''}
        </td>
        <td style="text-align:center">${qty}</td>
        <td style="text-align:center;font-size:7pt">${typeLabel}</td>
        <td style="text-align:right">${formatCurrency(unitPrice)}</td>
        <td style="text-align:right;font-weight:bold">${formatCurrency(total)}</td>
      </tr>
    `;
  }).join('');
  
  return `
    <table class="items-table">
      <thead>
        <tr>
          <th>No</th>
          <th>Nama Barang</th>
          <th>Qty</th>
          <th>Tipe</th>
          <th style="text-align:right">Harga</th>
          <th style="text-align:right">Jumlah</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderBottom(context: InvoiceContext): string {
  return `
    <table class="bottom-table">
      <tr>
        <td>${renderNote(context)}${renderSignature()}</td>
        <td>${renderSummary(context)}${renderFooter(context)}</td>
      </tr>
    </table>
  `;
}

function renderNote(context: InvoiceContext): string {
  return `
    <div class="note-label">Catatan</div>
    <div class="note-content">${context.sale.note ?? ''}</div>
  `;
}

function renderSignature(): string {
  return `
    <table class="signature-table">
      <tr>
        <td>
          <span class="sig-label">Penerima,</span>
          <div class="sig-name">( __________ )</div>
        </td>
        <td>
          <span class="sig-label">Hormat Kami,</span>
          <div class="sig-name">( __________ )</div>
        </td>
      </tr>
    </table>
  `;
}

function renderSummary(context: InvoiceContext): string {
  const { subTotal, discount, tax, grandTotal, amountReceived, changeAmount, status, sale, safeDateShort } = context;
  
  return `
    <div class="summary-box">
      <div class="summary-title">Ringkasan</div>
      <table class="summary-table">
        <tbody>
          <tr>
            <td>Subtotal</td>
            <td>${formatCurrency(subTotal)}</td>
          </tr>
          ${discount > 0 ? `
          <tr>
            <td>Diskon</td>
            <td>− ${formatCurrency(discount)}</td>
          </tr>` : ''}
          ${tax > 0 ? `
          <tr>
            <td>Pajak</td>
            <td>${formatCurrency(tax)}</td>
          </tr>` : ''}
          <tr class="total">
            <td>TOTAL</td>
            <td>${formatCurrency(grandTotal)}</td>
          </tr>
          ${status !== 'debt' ? `
          <tr>
            <td>Dibayar</td>
            <td>${formatCurrency(amountReceived)}</td>
          </tr>
          ${changeAmount > 0 ? `
          <tr>
            <td>Kembalian</td>
            <td>${formatCurrency(changeAmount)}</td>
          </tr>` : ''}` : `
          <tr class="debt">
            <td>Sisa</td>
            <td>${formatCurrency(grandTotal - amountReceived)}</td>
          </tr>
          ${sale.due_date ? `
          <tr class="debt">
            <td>JT</td>
            <td style="font-size:7pt">${safeDateShort(sale.due_date)}</td>
          </tr>` : ''}`}
        </tbody>
      </table>
    </div>
  `;
}

function renderFooter(context: InvoiceContext): string {
  return `
    <div class="footer-text">
      Terima kasih atas kepercayaan Anda.<br/>
      <strong>${context.store.name}</strong>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRINT EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════

function executePrint(htmlContent: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    };
  }
}
