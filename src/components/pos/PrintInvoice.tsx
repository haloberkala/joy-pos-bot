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

/**
 * Cetak Faktur A4 — kompatibel dengan SaleItem dari Supabase.
 * Field yang digunakan: price_per_unit, total_price, product_name, quantity
 */
export function printInvoice({ sale, items, store, customerName }: PrintInvoiceProps) {
  const safeDate = (v: string | null | undefined) => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(new Date(v ?? Date.now()));
    } catch {
      return '-';
    }
  };

  const paymentLabel: Record<string, string> = {
    cash: 'Tunai', transfer: 'Transfer Bank', qris: 'QRIS', debt: 'Kredit/Hutang',
  };

  const statusLabel: Record<string, string> = {
    paid: 'LUNAS', debt: 'KREDIT', partial: 'SEBAGIAN', refunded: 'REFUND',
  };

  const statusColor: Record<string, string> = {
    paid: '#15803d', debt: '#b91c1c', partial: '#b45309', refunded: '#6b7280',
  };

  const customer = customerName || 'Umum';
  const status = sale.payment_status ?? 'paid';
  const payMethod = sale.payment_method ?? 'cash';

  const rowsHtml = items.map((item, i) => {
    const unitPrice = item.price_per_unit ?? 0;
    const qty = item.quantity ?? 0;
    const total = item.total_price ?? (unitPrice * qty);
    const modeTag = item.price_mode === 'wholesale'
      ? `<span style="font-size:9px;background:#dbeafe;color:#1d4ed8;border-radius:3px;padding:1px 4px;margin-left:4px">Grosir</span>`
      : item.price_mode === 'special'
        ? `<span style="font-size:9px;background:#f3e8ff;color:#7e22ce;border-radius:3px;padding:1px 4px;margin-left:4px">Spesial</span>`
        : '';
    return `
      <tr>
        <td style="text-align:center;color:#6b7280">${i + 1}</td>
        <td>${item.product_name}${modeTag}${item.product_code ? `<div style="font-size:10px;color:#9ca3af;margin-top:2px">${item.product_code}</div>` : ''}</td>
        <td style="text-align:right">${formatCurrency(unitPrice)}</td>
        <td style="text-align:center">${qty}</td>
        <td style="text-align:right;font-weight:600">${formatCurrency(total)}</td>
      </tr>`;
  }).join('');

  const subTotal = sale.sub_total ?? 0;
  const discount = sale.discount ?? 0;
  const tax = sale.tax ?? 0;
  const grandTotal = sale.grand_total ?? 0;
  const amountReceived = sale.amount_received ?? 0;
  const changeAmount = sale.change_amount ?? 0;

  const printContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Faktur ${sale.invoice_number}</title>
  <style>
    /* ===== RESET & BASE ===== */
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 210mm; }
    body {
      font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #111827;
      background: #fff;
      padding: 14mm 16mm 12mm 16mm;
      line-height: 1.5;
    }

    /* ===== HEADER ===== */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #4f46e5;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .store-info h1 {
      font-size: 22px;
      font-weight: 800;
      color: #4f46e5;
      letter-spacing: -0.5px;
      margin-bottom: 3px;
    }
    .store-info p { font-size: 11px; color: #6b7280; }
    .doc-title-block { text-align: right; }
    .doc-title-block .doc-label {
      font-size: 20px;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .doc-title-block .inv-number {
      font-size: 13px;
      font-weight: 600;
      color: #4f46e5;
      margin-top: 4px;
    }
    .doc-title-block .status-badge {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 10px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    /* ===== INFO GRID ===== */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }
    .info-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px 14px;
    }
    .info-box .label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #9ca3af;
      font-weight: 600;
      margin-bottom: 3px;
    }
    .info-box .value {
      font-size: 13px;
      font-weight: 600;
      color: #111827;
    }

    /* ===== TABLE ===== */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }
    thead tr {
      background: #4f46e5;
      color: #fff;
    }
    thead th {
      padding: 9px 12px;
      font-size: 11px;
      font-weight: 600;
      text-align: left;
      letter-spacing: 0.3px;
    }
    thead th:nth-child(3),
    thead th:nth-child(4),
    thead th:nth-child(5) { text-align: right; }
    thead th:nth-child(4) { text-align: center; }
    thead th:first-child { text-align: center; width: 32px; border-radius: 6px 0 0 0; }
    thead th:last-child { border-radius: 0 6px 0 0; }

    tbody tr { border-bottom: 1px solid #f3f4f6; }
    tbody tr:nth-child(even) { background: #fafafa; }
    tbody tr:last-child { border-bottom: 2px solid #e5e7eb; }
    tbody td { padding: 9px 12px; vertical-align: top; }
    tbody td:nth-child(3),
    tbody td:nth-child(4),
    tbody td:nth-child(5) { text-align: right; }
    tbody td:nth-child(4) { text-align: center; }
    tbody td:first-child { text-align: center; color: #9ca3af; font-size: 11px; }

    /* ===== SUMMARY ===== */
    .summary-wrap {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }
    .summary {
      width: 280px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      font-size: 12px;
      border-bottom: 1px solid #f3f4f6;
    }
    .summary-row:last-child { border-bottom: none; }
    .summary-row.discount span:last-child { color: #dc2626; font-weight: 600; }
    .summary-row.tax span:last-child { color: #d97706; }
    .summary-row.total {
      background: #4f46e5;
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      padding: 11px 16px;
    }
    .summary-row.paid span:last-child { font-weight: 600; color: #15803d; }
    .summary-row.change span:last-child { font-weight: 600; color: #1d4ed8; }
    .summary-label { color: #6b7280; }

    /* ===== NOTE BOX ===== */
    .note-box {
      border: 1px dashed #d1d5db;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 20px;
      background: #fefce8;
      font-size: 11px;
      color: #78350f;
    }
    .note-box strong { color: #92400e; }

    /* ===== FOOTER ===== */
    .doc-footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 8px;
    }
    .doc-footer .thanks {
      font-size: 12px;
      color: #6b7280;
    }
    .doc-footer .thanks strong { color: #4f46e5; font-size: 13px; }
    .signature-block { text-align: center; min-width: 140px; }
    .signature-block .sig-label {
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 46px;
    }
    .signature-block .sig-line {
      border-top: 1px solid #374151;
      padding-top: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    /* ===== PRINT MEDIA ===== */
    @media print {
      html, body { width: 210mm; }
      body { padding: 10mm 14mm 10mm 14mm; }
      @page {
        size: A4 portrait;
        margin: 0;
      }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="doc-header">
    <div class="store-info">
      <h1>${store.name}</h1>
      ${store.address ? `<p>${store.address}</p>` : ''}
      ${store.phone ? `<p>Telp: ${store.phone}</p>` : ''}
    </div>
    <div class="doc-title-block">
      <div class="doc-label">Faktur / Invoice</div>
      <div class="inv-number">${sale.invoice_number}</div>
      <div>
        <span class="status-badge" style="background:${statusColor[status]}20;color:${statusColor[status]};border:1px solid ${statusColor[status]}40">
          ${statusLabel[status] ?? status.toUpperCase()}
        </span>
      </div>
    </div>
  </div>

  <!-- INFO GRID -->
  <div class="info-grid">
    <div class="info-box">
      <div class="label">Tanggal</div>
      <div class="value">${safeDate(sale.sale_date)}</div>
    </div>
    <div class="info-box">
      <div class="label">Pelanggan</div>
      <div class="value">${customer}</div>
    </div>
    <div class="info-box">
      <div class="label">Metode Pembayaran</div>
      <div class="value">${paymentLabel[payMethod] ?? payMethod}</div>
    </div>
    <div class="info-box">
      <div class="label">Kasir</div>
      <div class="value">${sale.cashier_name ?? '-'}</div>
    </div>
  </div>

  <!-- ITEM TABLE -->
  <table>
    <thead>
      <tr>
        <th>No</th>
        <th>Nama Barang</th>
        <th>Harga Satuan</th>
        <th>Qty</th>
        <th>Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="5" style="text-align:center;padding:20px;color:#9ca3af">Tidak ada item</td></tr>`}
    </tbody>
  </table>

  <!-- SUMMARY -->
  <div class="summary-wrap">
    <div class="summary">
      <div class="summary-row">
        <span class="summary-label">Subtotal</span>
        <span>${formatCurrency(subTotal)}</span>
      </div>
      ${discount > 0 ? `<div class="summary-row discount"><span class="summary-label">Diskon</span><span>- ${formatCurrency(discount)}</span></div>` : ''}
      ${tax > 0 ? `<div class="summary-row tax"><span class="summary-label">Pajak</span><span>${formatCurrency(tax)}</span></div>` : ''}
      <div class="summary-row total">
        <span>TOTAL</span>
        <span>${formatCurrency(grandTotal)}</span>
      </div>
      ${status !== 'debt' ? `
      <div class="summary-row paid">
        <span class="summary-label">Dibayar</span>
        <span>${formatCurrency(amountReceived)}</span>
      </div>
      ${changeAmount > 0 ? `<div class="summary-row change"><span class="summary-label">Kembalian</span><span>${formatCurrency(changeAmount)}</span></div>` : ''}
      ` : `
      <div class="summary-row" style="background:#fef2f2">
        <span class="summary-label" style="color:#dc2626;font-weight:600">⚠ Status Kredit</span>
        <span style="color:#dc2626;font-weight:700">Belum Lunas</span>
      </div>
      ${sale.due_date ? `<div class="summary-row"><span class="summary-label">Jatuh Tempo</span><span style="font-weight:600;color:#dc2626">${safeDate(sale.due_date)}</span></div>` : ''}
      `}
    </div>
  </div>

  <!-- NOTE -->
  ${sale.note ? `<div class="note-box"><strong>Catatan:</strong> ${sale.note}</div>` : ''}

  <!-- FOOTER -->
  <div class="doc-footer">
    <div class="thanks">
      <div>Terima kasih atas kepercayaan Anda.</div>
      <strong>${store.name}</strong>
    </div>
    <div class="signature-block">
      <div class="sig-label">Hormat Kami,</div>
      <div class="sig-line">( _____________________ )</div>
    </div>
  </div>

</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(printContent);
    w.document.close();
    w.onload = () => { w.print(); };
  }
}
