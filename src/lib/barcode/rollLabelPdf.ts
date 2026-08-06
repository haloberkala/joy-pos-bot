/**
 * rollLabelPdf.ts
 *
 * TSC TE300 – Dual-Column Roll Label PDF Generator
 *
 * Page  : 110 × 30 mm  (full roll width × label height)
 * Labels: two 50 × 30 mm columns per page
 * Layout: | 3mm | [Left 50mm] | 4mm | [Right 50mm] | 3mm |
 *
 * renderLabelContent() draws ONE label at a given originX.
 * It never references page width – only LABEL_W (50 mm).
 */

import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import { formatCurrency } from '@/lib/format';
import { Product } from '@/services/productsService';

// ── Backward-compat type (BarcodeDownloadDialog still imports this) ───────────
export type LabelSize = 'tsc-te300';

// ── TSC TE300 – physical constants (mm) ──────────────────────────────────────

const PAGE_W  = 110;
const PAGE_H  = 30;
const LABEL_W = 50;    // individual label width – NOT the page width

const LEFT_X  = 3;    // left  label: absolute origin X on page
const RIGHT_X = 57;   // right label: 3 + 50 + 4 = 57

// Barcode bounding box (relative to label originX)
const BC_X = 2.5;
const BC_Y = 2;    // mm from label top
const BC_W = 45;   // mm – max barcode width
const BC_H = 8;    // mm – barcode height

// Name box  (immediately below barcode; bc bottom = 2+8 = 10mm, name top = 11mm)
const NAME_Y     = 11;   // top of name box (mm)
const NAME_H     = 6;    // height of name box (mm)
const NAME_MAX_W = 46;   // max text width (mm)

// Divider
const DIV_X = 2;
const DIV_Y = 20;  // below name box (11+6=17mm), above code (24mm)
const DIV_W = 46;

// Code (no SKU prefix)  ─  shared baseline with price
const CODE_X  = 2;
const CODE_Y  = 24;  // mm – text baseline

// Price (right-aligned)  ─  shared baseline with code
const PRICE_RIGHT_X = 48;  // right edge relative to label origin
const PRICE_Y       = 24;  // mm – text baseline
const PRICE_BOX_W   = 24;  // price text must fit within 24 mm

// Typography
const PT_TO_MM = 0.3528;
const LEADING  = 1.2;

// ── Barcode: vector via SVG → PDF rects ──────────────────────────────────────

function drawBarcode(
  doc:  jsPDF,
  code: string,
  absX: number, absY: number,
  boxW: number, boxH: number,
): void {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
  try {
    JsBarcode(svg, code, {
      format: 'CODE128', displayValue: false,
      margin: 0, background: '#ffffff', lineColor: '#000000',
      width: 2, height: 100,
    });
  } catch { return; }

  let svgW = parseFloat(svg.getAttribute('width')  ?? '0');
  let svgH = parseFloat(svg.getAttribute('height') ?? '0');

  // Fallback: read dimensions from viewBox if width/height attrs are missing
  if (svgW <= 0 || svgH <= 0) {
    const vb = svg.getAttribute('viewBox');
    if (vb) {
      const parts = vb.trim().split(/[\s,]+/);
      svgW = parseFloat(parts[2] ?? '0');
      svgH = parseFloat(parts[3] ?? '0');
    }
  }
  if (svgW <= 0 || svgH <= 0) return;

  const sx = boxW / svgW;
  const sy = boxH / svgH;

  doc.setFillColor(0, 0, 0);
  svg.querySelectorAll('rect').forEach((r) => {
    // JsBarcode puts fill="#000000" on the parent <g>, not on each <rect>.
    // We must walk up the DOM to find the effective fill.
    let effectiveFill = '';
    let el: Element | null = r;
    while (el && el !== svg) {
      const f = el.getAttribute('fill');
      if (f !== null) { effectiveFill = f.toLowerCase().trim(); break; }
      el = el.parentElement;
    }
    // Skip white / transparent backgrounds
    if (!effectiveFill || effectiveFill === '#ffffff' || effectiveFill === 'white'
        || effectiveFill === 'none' || effectiveFill === 'transparent') return;

    const rw = parseFloat(r.getAttribute('width')  ?? '0') * sx;
    const rh = parseFloat(r.getAttribute('height') ?? '0') * sy;
    if (rw > 0.001 && rh > 0.001) {
      doc.rect(
        absX + parseFloat(r.getAttribute('x') ?? '0') * sx,
        absY + parseFloat(r.getAttribute('y') ?? '0') * sy,
        rw, rh, 'F',
      );
    }
  });
}

// ── Price font auto-fit ───────────────────────────────────────────────────────

function fitPriceFs(doc: jsPDF, text: string): number {
  doc.setFont('helvetica', 'bold');
  // Steps: 13 → 12 → 11 → 10 → 9 pt
  for (let fs = 13; fs >= 9; fs = Math.round((fs - 1) * 10) / 10) {
    doc.setFontSize(fs);
    if (doc.getTextWidth(text) <= PRICE_BOX_W) return fs;
  }
  return 9;
}

// ── Single label renderer ─────────────────────────────────────────────────────

/**
 * Draws ONE 50×30mm label onto the current jsPDF page.
 *
 * All X coordinates = originX + localX.
 * Y coordinates are absolute (label always starts at y=0).
 *
 * @param originX  Pass LEFT_X (3) for left column, RIGHT_X (57) for right.
 */
function renderLabelContent(doc: jsPDF, product: Product, originX: number): void {

  // 1. Barcode – vector CODE128
  drawBarcode(doc, product.code, originX + BC_X, BC_Y, BC_W, BC_H);

  // 2. Name – bold, centred, max 2 lines, shrink 9→7pt
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const nameCentX = originX + LABEL_W / 2; // = originX + 25

  let placed = false;
  for (let fs = 9; fs >= 7; fs = Math.round((fs - 0.5) * 10) / 10) {
    doc.setFontSize(fs);
    const lines: string[] = doc.splitTextToSize(product.name, NAME_MAX_W);
    if (lines.length <= 2) {
      const lh    = fs * PT_TO_MM * LEADING;
      const baseY = NAME_Y + (NAME_H - lines.length * lh) / 2 + lh * 0.75;
      lines.forEach((l, i) =>
        doc.text(l, nameCentX, baseY + i * lh, { align: 'center', maxWidth: NAME_MAX_W })
      );
      placed = true;
      break;
    }
  }
  if (!placed) {
    doc.setFontSize(7);
    const lines = (doc.splitTextToSize(product.name, NAME_MAX_W) as string[]).slice(0, 2);
    const lh    = 7 * PT_TO_MM * LEADING;
    const baseY = NAME_Y + (NAME_H - lines.length * lh) / 2 + lh * 0.75;
    lines.forEach((l, i) =>
      doc.text(l, nameCentX, baseY + i * lh, { align: 'center', maxWidth: NAME_MAX_W })
    );
  }

  // 3. Divider
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.15);
  doc.line(originX + DIV_X, DIV_Y, originX + DIV_X + DIV_W, DIV_Y);

  // 4. Product code – no "SKU" prefix, left-aligned
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(6);
  doc.text(product.code, originX + CODE_X, CODE_Y, { align: 'left' });

  // 5. Price – bold, right-aligned, auto-fit 13→9pt
  const priceText = formatCurrency(product.selling_price_retail);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(fitPriceFs(doc, priceText));
  doc.text(priceText, originX + PRICE_RIGHT_X, PRICE_Y, { align: 'right' });
}

// ── PDF assembler ─────────────────────────────────────────────────────────────

/**
 * Generates the TSC TE300 dual-column PDF and triggers browser download.
 *
 * @param products  Products to print (paired left→right per page)
 * @param _size     Ignored – always uses TE300 layout (kept for API compat)
 * @param filename  Download filename
 */
export function generateRollLabelPDF(
  products: Product[],
  _size:    LabelSize = 'tsc-te300',
  filename  = 'barcode-te300.pdf',
): void {
  if (products.length === 0) return;

  // orientation:'landscape' is required so jsPDF does NOT swap width↔height.
  // Without it, default portrait mode sees 110>30 and inverts the page
  // to 30×110mm (1.18×4.33 inch) – the exact bug that was reported.
  const doc = new jsPDF({ unit: 'mm', format: [PAGE_W, PAGE_H], orientation: 'landscape' });

  for (let i = 0; i < products.length; i += 2) {
    if (i > 0) doc.addPage([PAGE_W, PAGE_H], 'landscape');

    renderLabelContent(doc, products[i], LEFT_X);           // left  x = 3
    if (products[i + 1]) {
      renderLabelContent(doc, products[i + 1], RIGHT_X);   // right x = 57
    }
    // odd count → right column intentionally blank (no duplicate)
  }

  doc.save(filename);
}
