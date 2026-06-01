import { Sale, SaleItem } from '@/services/salesService';
import { Shipment } from '@/services/shipmentsService';

interface Store {
  name: string;
  address?: string | null;
  phone?: string | null;
}

interface SuratJalanItem {
  name: string;
  qty: number;
  unit?: string;
  note?: string;
}

interface PrintSuratJalanProps {
  /** Sale dari Supabase (lebih lengkap, dari halaman Transaksi) */
  sale?: Sale;
  /** Shipment dari tabel pengiriman (dari halaman Pengiriman) */
  shipment?: Shipment;
  /** Items bisa dari SaleItem[] Supabase atau manual array */
  saleItems?: SaleItem[];
  /** Override items manual jika tidak dari DB */
  items?: SuratJalanItem[];
  store: Store;
  customerName?: string;
  recipientAddress?: string;
  recipientPhone?: string;
}

/**
 * Cetak Surat Jalan A4 — tanpa harga, berisi Nama Barang & Qty.
 * Terdapat kolom tanda tangan Pengirim & Penerima di bagian bawah.
 */
export function printSuratJalan({
  sale,
  shipment,
  saleItems,
  items,
  store,
  customerName,
  recipientAddress,
  recipientPhone,
}: PrintSuratJalanProps) {
  const safeDate = (v?: string | Date | null) => {
    try { return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(v as string ?? Date.now())); }
    catch { return '-'; }
  };

  // Resolve data from sale or shipment
  const invoiceNumber = sale?.invoice_number ?? shipment?.invoice_number ?? 'UNKNOWN';
  const dateSource = sale?.sale_date ?? shipment?.created_at;
  const saleNote = sale?.note ?? null;
  const recipientName = customerName ?? shipment?.recipient_name ?? '-';
  const recipientAddr = recipientAddress ?? shipment?.recipient_address;
  const recipientTel = recipientPhone ?? shipment?.recipient_phone;

  const sjNumber = `SJ-${invoiceNumber.replace(/^(INV|SHP|TRX)-?/i, '')}`;
  // Resolve item rows — prioritaskan items prop, lalu saleItems dari DB, lalu items_description dari shipment
  const resolvedItems: SuratJalanItem[] = items && items.length > 0
    ? items
    : saleItems && saleItems.length > 0
      ? saleItems.map(si => ({ name: si.product_name, qty: si.quantity }))
      : shipment?.items_description
        ? [{ name: shipment.items_description, qty: 1 }]
        : [];

  const rowsHtml = resolvedItems.length > 0
    ? resolvedItems.map((it, i) => `
      <tr>
        <td style="text-align:center;color:#6b7280">${i + 1}</td>
        <td>${it.name}</td>
        <td style="text-align:center;font-weight:600">${it.qty}</td>
        <td style="text-align:center">${it.unit ?? 'pcs'}</td>
        <td style="color:#9ca3af;font-size:11px">${it.note ?? ''}</td>
      </tr>`).join('')
    : `<tr><td colspan="5" style="text-align:center;padding:24px;color:#9ca3af">Tidak ada detail barang</td></tr>`;

  const printContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Surat Jalan ${sjNumber}</title>
  <style>
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
      padding-bottom: 12px;
      margin-bottom: 14px;
      border-bottom: 3px solid #0d9488;
    }
    .store-info h1 {
      font-size: 22px;
      font-weight: 800;
      color: #0d9488;
      letter-spacing: -0.5px;
      margin-bottom: 3px;
    }
    .store-info p { font-size: 11px; color: #6b7280; }
    .doc-title-block { text-align: right; }
    .doc-label {
      font-size: 20px;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .sj-number {
      font-size: 13px;
      font-weight: 600;
      color: #0d9488;
      margin-top: 4px;
    }

    /* ===== DIVIDER ===== */
    .section-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
      color: #9ca3af;
      margin-bottom: 8px;
      margin-top: 14px;
    }

    /* ===== INFO GRID ===== */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 18px;
    }
    .info-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px 14px;
      background: #f9fafb;
    }
    .info-card .card-title {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #9ca3af;
      font-weight: 600;
      margin-bottom: 8px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row {
      display: flex;
      gap: 4px;
      margin-bottom: 4px;
      font-size: 12px;
    }
    .info-row .lbl { color: #6b7280; min-width: 90px; }
    .info-row .val { font-weight: 600; }

    /* ===== TABLE ===== */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 12px;
    }
    thead tr { background: #0d9488; color: #fff; }
    thead th {
      padding: 9px 12px;
      font-size: 11px;
      font-weight: 600;
      text-align: left;
      letter-spacing: 0.3px;
    }
    thead th:first-child { text-align: center; width: 32px; border-radius: 6px 0 0 0; }
    thead th:nth-child(3), thead th:nth-child(4) { text-align: center; }
    thead th:last-child { border-radius: 0 6px 0 0; }

    tbody tr { border-bottom: 1px solid #f3f4f6; }
    tbody tr:nth-child(even) { background: #fafafa; }
    tbody tr:last-child { border-bottom: 2px solid #d1fae5; }
    tbody td { padding: 10px 12px; vertical-align: top; }
    tbody td:first-child { text-align: center; color: #9ca3af; font-size: 11px; }
    tbody td:nth-child(3), tbody td:nth-child(4) { text-align: center; }

    /* Baris kosong untuk catatan penerima */
    .extra-rows tr td { height: 36px; border-bottom: 1px solid #f3f4f6; }

    /* ===== SIGNATURES ===== */
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 48px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
    }
    .sig-box { text-align: center; }
    .sig-box .sig-title {
      font-size: 11px;
      color: #374151;
      font-weight: 600;
      margin-bottom: 3px;
    }
    .sig-box .sig-sub {
      font-size: 10px;
      color: #9ca3af;
      margin-bottom: 52px;
    }
    .sig-box .sig-line {
      border-top: 1px solid #374151;
      padding-top: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #374151;
    }

    /* ===== FOOTER ===== */
    .doc-footer {
      margin-top: 14px;
      text-align: center;
      font-size: 10px;
      color: #9ca3af;
      border-top: 1px dashed #e5e7eb;
      padding-top: 10px;
    }

    /* ===== PRINT ===== */
    @media print {
      html, body { width: 210mm; }
      body { padding: 10mm 14mm 10mm 14mm; }
      @page { size: A4 portrait; margin: 0; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; }
      .signatures { page-break-inside: avoid; }
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
      <div class="doc-label">Surat Jalan</div>
      <div class="sj-number">${sjNumber}</div>
    </div>
  </div>

  <!-- INFO GRID -->
  <div class="info-grid">
    <div class="info-card">
      <div class="card-title">Informasi Pengiriman</div>
      <div class="info-row"><span class="lbl">No. Surat Jalan</span><span class="val">${sjNumber}</span></div>
      <div class="info-row"><span class="lbl">Tanggal</span><span class="val">${safeDate(dateSource)}</span></div>
      <div class="info-row"><span class="lbl">No. Invoice</span><span class="val">${invoiceNumber}</span></div>
      ${saleNote ? `<div class="info-row"><span class="lbl">Catatan</span><span class="val">${saleNote}</span></div>` : ''}
    </div>
    <div class="info-card">
      <div class="card-title">Penerima</div>
      <div class="info-row"><span class="lbl">Nama</span><span class="val">${recipientName}</span></div>
      ${recipientTel ? `<div class="info-row"><span class="lbl">Telepon</span><span class="val">${recipientTel}</span></div>` : ''}
      ${recipientAddr ? `<div class="info-row"><span class="lbl">Alamat</span><span class="val">${recipientAddr}</span></div>` : ''}
    </div>
  </div>

  <!-- ITEM TABLE -->
  <div class="section-title">Daftar Barang</div>
  <table>
    <thead>
      <tr>
        <th>No</th>
        <th>Nama Barang</th>
        <th style="width:80px">Jumlah</th>
        <th style="width:70px">Satuan</th>
        <th style="width:140px">Keterangan</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <!-- Baris kosong tambahan jika barang sedikit -->
      ${resolvedItems.length < 8 ? Array.from({ length: Math.max(0, 6 - resolvedItems.length) }, () =>
        `<tr><td></td><td></td><td></td><td></td><td></td></tr>`
      ).join('') : ''}
    </tbody>
  </table>

  <!-- TANDA TANGAN -->
  <div class="signatures">
    <div class="sig-box">
      <div class="sig-title">Pengirim</div>
      <div class="sig-sub">${store.name}</div>
      <div class="sig-line">( ______________________ )</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Penerima</div>
      <div class="sig-sub">${recipientName}</div>
      <div class="sig-line">( ______________________ )</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="doc-footer">
    Dokumen ini merupakan bukti pengiriman barang yang sah dari ${store.name}
  </div>

</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(printContent);
    w.document.close();
    w.onload = () => {
      setTimeout(() => { w.print(); }, 200);
    };
  }
}
