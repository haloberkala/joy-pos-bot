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
  customerName?: string;
}

/**
 * Faktur Industri — Landscape A4, dua kolom header, tabel profesional,
 * blok tanda tangan, kompatibel dengan printer laser/inkjet toko.
 */
export function printInvoice({ sale, items, store, customerName }: PrintInvoiceProps) {
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
    cash: 'Tunai', transfer: 'Transfer Bank', qris: 'QRIS', debt: 'Kredit / Cicilan',
  };

  const statusLabel: Record<string, string> = {
    paid: 'LUNAS', debt: 'BELUM LUNAS', partial: 'SEBAGIAN LUNAS', refunded: 'REFUND',
  };

  const customer = customerName || 'Umum';
  const status = sale.payment_status ?? 'paid';
  const payMethod = sale.payment_method ?? 'cash';

  const subTotal   = sale.sub_total    ?? 0;
  const discount   = sale.discount     ?? 0;
  const tax        = sale.tax          ?? 0;
  const grandTotal = sale.grand_total  ?? 0;
  const amountReceived = sale.amount_received ?? 0;
  const changeAmount   = sale.change_amount   ?? 0;

  const rowsHtml = items.map((item, i) => {
    const unitPrice = item.price_per_unit ?? 0;
    const qty       = item.quantity       ?? 0;
    const total     = item.total_price    ?? (unitPrice * qty);
    const modeTag   = item.price_mode === 'wholesale'
      ? '<span style="font-size:8px;border:1px solid #374151;color:#374151;border-radius:2px;padding:0 3px;margin-left:3px">GROSIR</span>'
      : item.price_mode === 'special'
        ? '<span style="font-size:8px;border:1px solid #374151;color:#374151;border-radius:2px;padding:0 3px;margin-left:3px">SPESIAL</span>'
        : '';
    const isEven = i % 2 === 1;
    return `
      <tr style="${isEven ? 'background:#f8f9fc;' : ''}">
        <td style="text-align:center;color:#6b7280;font-size:10px">${i + 1}</td>
        <td>
          <div style="font-weight:500">${item.product_name ?? '-'}${modeTag}</div>
          ${item.product_code ? `<div style="font-size:9px;color:#9ca3af;margin-top:1px">${item.product_code}</div>` : ''}
        </td>
        <td style="text-align:center">${qty}</td>
        <td style="text-align:center;color:#6b7280;font-size:10px">${item.price_mode === 'wholesale' ? 'GRS' : item.price_mode === 'special' ? 'SPL' : 'ECR'}</td>
        <td style="text-align:right">${formatCurrency(unitPrice)}</td>
        <td style="text-align:right;font-weight:600">${formatCurrency(total)}</td>
      </tr>`;
  }).join('');

  // Blank padding rows so table has at least 8 rows
  const MIN_ROWS = 8;
  const blankRows = Math.max(0, MIN_ROWS - items.length);
  const blankHtml = Array.from({ length: blankRows }).map((_, i) => {
    const isEven = (items.length + i) % 2 === 1;
    return `<tr style="height:26px;${isEven ? 'background:#f8f9fc;' : ''}">
      <td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>`;
  }).join('');

  const printContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <title>Faktur ${sale.invoice_number}</title>
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

    html, body {
      width: 297mm;
      font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #111827;
      background: #fff;
    }

    body { padding: 10mm 12mm 10mm 12mm; }

    /* ── TOP HEADER ── */
    .top-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
      gap: 20px;
    }

    .company-block { flex: 1; }
    .company-name {
      font-size: 20px;
      font-weight: 800;
      color: #000;
      letter-spacing: -0.3px;
      margin-bottom: 3px;
    }
    .company-detail {
      font-size: 10px;
      color: #6b7280;
      line-height: 1.6;
    }
    .company-detail strong { color: #374151; }

    /* ── FAKTUR TITLE BLOCK (kanan atas) ── */
    .title-block {
      text-align: right;
      min-width: 210px;
    }
    .faktur-label {
      font-size: 26px;
      font-weight: 900;
      color: #000;
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    .inv-no {
      font-size: 12px;
      font-weight: 700;
      color: #374151;
      margin-top: 4px;
      letter-spacing: 0.3px;
    }
    .status-stamp {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 14px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }

    /* ── SEPARATOR ── */
    .separator {
      border: none;
      border-top: 2.5px solid #000;
      margin: 10px 0 12px 0;
    }
    .separator-thin {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 8px 0;
    }

    /* ── INFO ROW (tanggal, pembeli, kasir, dll) ── */
    .info-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 8px;
      margin-bottom: 14px;
    }
    .info-cell {}
    .info-cell .info-label {
      font-size: 8.5px;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: #9ca3af;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .info-cell .info-value {
      font-size: 11.5px;
      font-weight: 600;
      color: #111827;
    }
    .info-cell .info-value.big {
      font-size: 13px;
    }
    .info-cell .info-sub {
      font-size: 9.5px;
      color: #6b7280;
      margin-top: 1px;
    }

    /* ── BILL TO BOX ── */
    .bill-to-box {
      background: #f3f4f6;
      border-left: 3px solid #000;
      border-radius: 0 6px 6px 0;
      padding: 7px 12px;
    }
    .bill-to-label {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 3px;
    }
    .bill-to-name {
      font-size: 13px;
      font-weight: 700;
      color: #000;
    }

    /* ── ITEMS TABLE ── */
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-bottom: 0;
    }
    table.items-table thead tr {
      background: #111827;
      color: #fff;
    }
    table.items-table thead th {
      padding: 7px 10px;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table.items-table thead th:first-child { width: 30px; text-align: center; }
    table.items-table thead th:nth-child(3) { width: 46px; text-align: center; }
    table.items-table thead th:nth-child(4) { width: 44px; text-align: center; }
    table.items-table thead th:nth-child(5) { width: 110px; text-align: right; }
    table.items-table thead th:nth-child(6) { width: 110px; text-align: right; }

    table.items-table tbody td {
      padding: 6px 10px;
      vertical-align: middle;
      border-bottom: 1px solid #e5e7eb;
    }

    /* ── BOTTOM SECTION ── */
    .bottom-section {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-top: 14px;
    }

    /* Catatan & TTD kiri */
    .left-bottom { flex: 1; }
    .note-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #9ca3af;
      margin-bottom: 4px;
    }
    .note-box {
      border: 1px dashed #d1d5db;
      border-radius: 4px;
      padding: 6px 10px;
      min-height: 44px;
      font-size: 10.5px;
      color: #374151;
    }

    /* Signature section */
    .sig-row {
      display: flex;
      gap: 20px;
      margin-top: 12px;
    }
    .sig-block {
      flex: 1;
      text-align: center;
    }
    .sig-title {
      font-size: 9.5px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 44px;
    }
    .sig-line {
      border-top: 1px solid #374151;
      padding-top: 4px;
      font-size: 10px;
      font-weight: 600;
      color: #111827;
    }

    /* Totals kanan */
    .totals-block {
      min-width: 240px;
    }
    .totals-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .totals-table td {
      padding: 4px 10px;
    }
    .totals-table td:last-child { text-align: right; font-weight: 500; }
    .totals-table .label-col { color: #6b7280; }

    .totals-table tr.grand-total {
      background: #111827;
      color: #fff;
      font-size: 13px;
      font-weight: 800;
    }
    .totals-table tr.grand-total td {
      padding: 8px 10px;
      border-radius: 0;
    }
    .totals-table tr.paid-row td:last-child { color: #000; font-weight: 700; }
    .totals-table tr.change-row td:last-child { color: #374151; font-weight: 700; }
    .totals-table tr.debt-row { background:#f3f4f6; }
    .totals-table tr.debt-row td { color: #000; font-weight: 700; }

    .totals-wrapper {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
    }
    .totals-header {
      background: #f8fafc;
      padding: 5px 10px;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748b;
      border-bottom: 1px solid #e5e7eb;
    }

    /* ── PRINT ── */
    @media print {
      html, body { width: 297mm; }
      body { padding: 8mm 10mm 8mm 10mm; }
      @page {
        size: A4 landscape;
        margin: 0;
      }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <!-- ══ TOP HEADER ══ -->
  <div class="top-header">
    <!-- Kiri: Info Perusahaan -->
    <div class="company-block">
      <div class="company-name">${store.name}</div>
      <div class="company-detail">
        ${store.address ? `<div><strong>Alamat:</strong> ${store.address}</div>` : ''}
        ${store.phone   ? `<div><strong>Telp:</strong> ${store.phone}</div>` : ''}
      </div>
    </div>

    <!-- Kanan: Label Faktur -->
    <div class="title-block">
      <div class="faktur-label">Faktur</div>
      <div class="inv-no">No. ${sale.invoice_number}</div>
      <div>
        <span class="status-stamp" style="border:2px solid #000;color:#000;background:#f3f4f6"
        >${statusLabel[status] ?? status.toUpperCase()}</span>
      </div>
    </div>
  </div>

  <hr class="separator" />

  <!-- ══ INFO ROW ══ -->
  <div class="info-row">
    <!-- Bill To -->
    <div class="info-cell">
      <div class="bill-to-box">
        <div class="bill-to-label">Kepada / Bill To</div>
        <div class="bill-to-name">${customer}</div>
      </div>
    </div>

    <!-- Tanggal -->
    <div class="info-cell">
      <div class="info-label">Tanggal Faktur</div>
      <div class="info-value big">${safeDate(sale.sale_date)}</div>
    </div>

    <!-- Pembayaran -->
    <div class="info-cell">
      <div class="info-label">Metode Pembayaran</div>
      <div class="info-value">${paymentLabel[payMethod] ?? payMethod}</div>
      ${status === 'debt' && sale.due_date ? `<div class="info-sub">Jatuh Tempo: <strong>${safeDateShort(sale.due_date)}</strong></div>` : ''}
    </div>

    <!-- Kasir -->
    <div class="info-cell">
      <div class="info-label">Kasir / Dibuat Oleh</div>
      <div class="info-value">${sale.cashier_name ?? '-'}</div>
    </div>
  </div>

  <!-- ══ ITEMS TABLE ══ -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="text-align:center">No</th>
        <th style="text-align:left">Nama Barang / Deskripsi</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:center">Tipe</th>
        <th style="text-align:right">Harga Satuan</th>
        <th style="text-align:right">Jumlah</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af">— Tidak ada item —</td></tr>`}
      ${blankHtml}
    </tbody>
  </table>

  <hr class="separator" style="margin-top:0;margin-bottom:14px"/>

  <!-- ══ BOTTOM SECTION ══ -->
  <div class="bottom-section">

    <!-- Kiri: Catatan + TTD -->
    <div class="left-bottom">
      <div class="note-label">Catatan / Keterangan</div>
      <div class="note-box">${sale.note ?? ''}</div>

      <div class="sig-row" style="margin-top:16px">
        <div class="sig-block">
          <div class="sig-title">Penerima,</div>
          <div class="sig-line">( _____________________ )</div>
        </div>
        <div class="sig-block">
          <div class="sig-title">Hormat Kami,</div>
          <div class="sig-line">( _____________________ )</div>
        </div>
      </div>
    </div>

    <!-- Kanan: Ringkasan Total -->
    <div class="totals-block">
      <div class="totals-wrapper">
        <div class="totals-header">Ringkasan Pembayaran</div>
        <table class="totals-table">
          <tbody>
            <tr>
              <td class="label-col">Subtotal</td>
              <td>${formatCurrency(subTotal)}</td>
            </tr>
            ${discount > 0 ? `
            <tr>
              <td class="label-col">Diskon</td>
              <td style="font-weight:600">− ${formatCurrency(discount)}</td>
            </tr>` : ''}
            ${tax > 0 ? `
            <tr>
              <td class="label-col">Pajak / Tax</td>
              <td>${formatCurrency(tax)}</td>
            </tr>` : ''}
            <tr class="grand-total">
              <td>TOTAL</td>
              <td>${formatCurrency(grandTotal)}</td>
            </tr>
            ${status !== 'debt' ? `
            <tr class="paid-row">
              <td class="label-col">Dibayar</td>
              <td>${formatCurrency(amountReceived)}</td>
            </tr>
            ${changeAmount > 0 ? `
            <tr class="change-row">
              <td class="label-col">Kembalian</td>
              <td>${formatCurrency(changeAmount)}</td>
            </tr>` : ''}
            ` : `
            <tr class="debt-row">
              <td>Sisa Piutang</td>
              <td>${formatCurrency(grandTotal - amountReceived)}</td>
            </tr>
            ${sale.due_date ? `
            <tr class="debt-row">
              <td>Jatuh Tempo</td>
              <td style="font-size:10px">${safeDateShort(sale.due_date)}</td>
            </tr>` : ''}
            `}
          </tbody>
        </table>
      </div>

      <!-- Footer note -->
      <div style="margin-top:10px;font-size:9.5px;color:#9ca3af;text-align:center;line-height:1.6">
        Terima kasih atas kepercayaan Anda.<br/>
        Dokumen ini adalah faktur resmi dari <strong>${store.name}</strong>.
      </div>
    </div>

  </div>

</body>
</html>`;

  // Membuat hidden iframe untuk mencetak tanpa membuka tab baru
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(printContent);
    iframeDoc.close();

    // Tunggu iframe selesai memuat resource sebelum memanggil print
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      
      // Hapus iframe dari DOM setelah proses selesai
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    };
  }
}
