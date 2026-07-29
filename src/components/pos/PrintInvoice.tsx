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
// PHYSICAL LAYOUT CONSTANTS (in inches)
// ═══════════════════════════════════════════════════════════════════════════

const PAPER_WIDTH = 9.5;
const PAPER_HEIGHT = 11;
const HALF_HEIGHT = 5.5; // Exact half

// Margins
const MARGIN_TOP = 0.2;
const MARGIN_BOTTOM = 0.2;
const MARGIN_LEFT = 0.25;
const MARGIN_RIGHT = 0.25;

// Content area
const CONTENT_WIDTH = PAPER_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const CONTENT_HEIGHT = HALF_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

// Fixed section heights (approximate, will be measured)
const HEADER_HEIGHT = 0.6; // Company + Invoice title
const SEPARATOR_HEIGHT = 0.08;
const INFO_HEIGHT = 0.45; // Transaction info grid
const BOTTOM_HEIGHT = 1.4; // Summary + Signature + Footer

// Available height for items table
const ITEMS_AREA_HEIGHT = CONTENT_HEIGHT - HEADER_HEIGHT - SEPARATOR_HEIGHT - INFO_HEIGHT - SEPARATOR_HEIGHT - BOTTOM_HEIGHT;

// Average row height (will be refined based on content)
const ESTIMATED_ROW_HEIGHT = 0.22; // inches per row (with product name + code)

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface HalfPageData {
  items: SaleItem[];
  startIndex: number;
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

export function printInvoice({ sale, items, store, customerName }: PrintInvoiceProps) {
  const context = buildInvoiceContext(sale, store, customerName);
  const halfPages = paginateByHeight(items);
  const html = generatePrintHTML(context, halfPages);
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
// PAGINATION ENGINE - HEIGHT-BASED
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Paginate items based on available vertical space
 * This is more accurate than fixed item count
 */
function paginateByHeight(items: SaleItem[]): HalfPageData[] {
  const halfPages: HalfPageData[] = [];
  
  if (items.length === 0) {
    halfPages.push({ items: [], startIndex: 0 });
    return halfPages;
  }

  // Calculate max rows that can fit in items area
  const maxRows = Math.floor(ITEMS_AREA_HEIGHT / ESTIMATED_ROW_HEIGHT);
  
  let currentIndex = 0;
  
  while (currentIndex < items.length) {
    // Take items that fit in this half-page
    const chunk = items.slice(currentIndex, currentIndex + maxRows);
    
    halfPages.push({
      items: chunk,
      startIndex: currentIndex,
    });
    
    currentIndex += maxRows;
  }
  
  return halfPages;
}

// ═══════════════════════════════════════════════════════════════════════════
// HTML GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

function generatePrintHTML(context: InvoiceContext, halfPages: HalfPageData[]): string {
  const styles = generateStyles();
  
  // Group half-pages into sheets (2 per sheet)
  const sheets: string[] = [];
  
  for (let i = 0; i < halfPages.length; i += 2) {
    const topHalf = halfPages[i];
    const bottomHalf = halfPages[i + 1] || null;
    
    const topHTML = renderHalfPage(context, topHalf, 'top');
    const bottomHTML = bottomHalf ? renderHalfPage(context, bottomHalf, 'bottom') : '';
    
    sheets.push(`<div class="sheet">${topHTML}${bottomHTML}</div>`);
  }
  
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <title>Faktur ${context.sale.invoice_number}</title>
  ${styles}
</head>
<body>
  ${sheets.join('')}
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// CSS STYLES - DETERMINISTIC LAYOUT
// ═══════════════════════════════════════════════════════════════════════════

function generateStyles(): string {
  return `<style>
    /*
    ════════════════════════════════════════════════════════════════════════
    EPSON LX-310 PRINT STYLESHEET
    DETERMINISTIC LAYOUT - NO FLEXBOX, NO PERCENTAGES
    
    Strategy:
    - Use absolute positioning for half-pages
    - Fixed heights in inches for all sections
    - Only items table is dynamic
    - No browser layout ambiguity
    ════════════════════════════════════════════════════════════════════════
    */

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

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
    }

    /* ═══ SHEET - One physical paper ═══ */
    .sheet {
      width: ${PAPER_WIDTH}in;
      height: ${PAPER_HEIGHT}in;
      position: relative;
      page-break-after: always;
      background: white;
    }

    .sheet:last-child {
      page-break-after: auto;
    }

    /* ═══ HALF PAGE - Absolute positioning ═══ */
    .half-page {
      position: absolute;
      left: ${MARGIN_LEFT}in;
      width: ${CONTENT_WIDTH}in;
      height: ${CONTENT_HEIGHT}in;
    }

    .half-page.top {
      top: ${MARGIN_TOP}in;
    }

    .half-page.bottom {
      top: ${HALF_HEIGHT + MARGIN_TOP}in;
    }

    /* Visual separator on screen only */
    .half-page.top::after {
      content: '';
      position: absolute;
      bottom: -${MARGIN_BOTTOM}in;
      left: 0;
      right: 0;
      border-bottom: 1pt dashed #ccc;
    }

    /* ═══ FIXED SECTIONS ═══ */
    .section-header {
      height: ${HEADER_HEIGHT}in;
      margin-bottom: 0.05in;
    }

    .section-separator {
      height: ${SEPARATOR_HEIGHT}in;
      border-top: 1.5pt solid #000;
      margin: 0.03in 0;
    }

    .section-info {
      height: ${INFO_HEIGHT}in;
      margin-bottom: 0.05in;
    }

    .section-items {
      height: ${ITEMS_AREA_HEIGHT}in;
      margin-bottom: 0.05in;
      overflow: hidden;
    }

    .section-bottom {
      height: ${BOTTOM_HEIGHT}in;
    }

    /* ═══ HEADER ═══ */
    .header-table {
      width: 100%;
      border-collapse: collapse;
    }

    .header-table td {
      vertical-align: top;
      padding: 0;
    }

    .header-table td:first-child { width: 58%; }
    .header-table td:last-child { width: 42%; text-align: right; }

    .company-name {
      font-size: 13pt;
      font-weight: bold;
      line-height: 1.1;
      margin-bottom: 0.02in;
    }

    .company-detail {
      font-size: 9pt;
      line-height: 1.3;
    }

    .faktur-title {
      font-size: 15pt;
      font-weight: bold;
      letter-spacing: 1.5pt;
    }

    .inv-number {
      font-size: 9pt;
      font-weight: bold;
      margin-top: 0.02in;
    }

    .status-badge {
      display: inline-block;
      border: 2pt solid #000;
      padding: 0.01in 0.06in;
      font-size: 8pt;
      font-weight: bold;
      margin-top: 0.03in;
      letter-spacing: 0.8pt;
    }

    /* ═══ INFO GRID ═══ */
    .info-table {
      width: 100%;
      border-collapse: collapse;
    }

    .info-table td {
      vertical-align: top;
      padding: 0 0.04in 0 0;
      width: 25%;
    }

    .info-table td:first-child { width: 28%; }

    .info-label {
      font-size: 7pt;
      font-weight: bold;
      text-transform: uppercase;
      display: block;
      margin-bottom: 0.01in;
    }

    .info-value {
      font-size: 9pt;
      font-weight: bold;
      line-height: 1.2;
    }

    .bill-to {
      border-left: 2.5pt solid #000;
      padding-left: 0.06in;
    }

    /* ═══ ITEMS TABLE ═══ */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
    }

    .items-table thead th {
      padding: 0.04in;
      font-size: 8pt;
      font-weight: bold;
      text-transform: uppercase;
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
      padding: 0.03in 0.04in;
      vertical-align: top;
      border-bottom: 0.75pt solid #000;
    }

    .item-name {
      font-weight: bold;
      font-size: 9pt;
    }

    .item-code {
      font-size: 7pt;
      margin-top: 0.01in;
    }

    .price-badge {
      font-size: 6pt;
      border: 0.75pt solid #000;
      padding: 0 0.02in;
      margin-left: 0.02in;
      font-weight: bold;
    }

    /* ═══ BOTTOM SECTION ═══ */
    .bottom-table {
      width: 100%;
      border-collapse: collapse;
    }

    .bottom-table td {
      vertical-align: top;
      padding: 0;
    }

    .bottom-table td:first-child {
      width: 54%;
      padding-right: 0.1in;
    }

    .bottom-table td:last-child {
      width: 46%;
    }

    .note-label {
      font-size: 7pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 0.02in;
    }

    .note-content {
      border: 1pt solid #000;
      padding: 0.04in 0.06in;
      min-height: 0.25in;
      font-size: 8pt;
    }

    .signature-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0.08in;
    }

    .signature-table td {
      width: 50%;
      text-align: center;
      vertical-align: top;
    }

    .sig-label {
      font-size: 7pt;
      font-weight: bold;
      margin-bottom: 0.2in;
      display: block;
    }

    .sig-name {
      border-top: 1pt solid #000;
      padding-top: 0.02in;
      font-size: 8pt;
      font-weight: bold;
    }

    .summary-box {
      border: 2pt solid #000;
    }

    .summary-title {
      padding: 0.03in 0.06in;
      font-size: 7pt;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 1pt solid #000;
    }

    .summary-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
    }

    .summary-table td {
      padding: 0.03in 0.06in;
    }

    .summary-table td:last-child {
      text-align: right;
      font-weight: bold;
    }

    .summary-table tr.total td {
      padding: 0.05in 0.06in;
      font-size: 11pt;
      font-weight: bold;
      border-top: 2pt solid #000;
      border-bottom: 2pt solid #000;
    }

    .summary-table tr.debt td {
      font-weight: bold;
    }

    .footer-text {
      margin-top: 0.06in;
      font-size: 7pt;
      text-align: center;
      line-height: 1.3;
    }

    /* ═══════════════════════════════════════════════════════════════════════
       PRINT MEDIA QUERY
    ════════════════════════════════════════════════════════════════════════ */
    @media print {
      @page {
        size: ${PAPER_WIDTH}in ${PAPER_HEIGHT}in;
        margin: 0;
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
        width: ${PAPER_WIDTH}in;
        height: ${PAPER_HEIGHT}in;
        page-break-after: always;
        margin: 0;
        padding: 0;
      }

      .sheet:last-child {
        page-break-after: auto;
      }

      /* Hide visual separator */
      .half-page.top::after {
        display: none !important;
      }

      /* Force pure black */
      * {
        color: #000 !important;
        background: transparent !important;
        opacity: 1 !important;
      }

      /* Remove effects */
      * {
        text-shadow: none !important;
        box-shadow: none !important;
        filter: none !important;
        transform: none !important;
      }

      /* Ensure borders print */
      .section-separator,
      .items-table thead th,
      .summary-table tr.total td {
        border-color: #000 !important;
      }

      /* Bold elements */
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

    /* ═══ SCREEN PREVIEW ═══ */
    @media screen {
      body {
        background: #eee;
        padding: 20px;
      }

      .sheet {
        margin: 0 auto 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
    }
  </style>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDERERS
// ═══════════════════════════════════════════════════════════════════════════

function renderHalfPage(context: InvoiceContext, halfPage: HalfPageData, position: 'top' | 'bottom'): string {
  return `
    <div class="half-page ${position}">
      <div class="section-header">${renderHeader(context)}</div>
      <div class="section-separator"></div>
      <div class="section-info">${renderInfo(context)}</div>
      <div class="section-items">${renderItems(halfPage)}</div>
      <div class="section-separator"></div>
      <div class="section-bottom">${renderBottom(context)}</div>
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
          ${status === 'debt' && sale.due_date ? `<div style="font-size:6pt;margin-top:0.01in">JT: ${safeDateShort(sale.due_date)}</div>` : ''}
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
            <td colspan="6" style="text-align:center;padding:0.1in">— Tidak ada item —</td>
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
