import { Store } from '@/types/pos';

import { Shipment } from '@/data/shippingStore';

interface PrintSuratJalanProps {
  shipment: Shipment;
  store: Store;
  items?: { name: string; qty: number; unit?: string }[];
}

export function printSuratJalan({ shipment, store, items }: PrintSuratJalanProps) {
  const suratJalanNo = `SJ-${shipment.invoice_number.replace('INV-', '').replace('SHP-', '')}`;
  const today = new Date();
  const dateStr = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(today);

  const itemRows = items && items.length > 0
    ? items.map((it, i) => `
        <tr>
          <td style="text-align:center">${i + 1}</td>
          <td>${it.name}</td>
          <td style="text-align:center">${it.qty}</td>
          <td style="text-align:center">${it.unit || 'pcs'}</td>
          <td></td>
        </tr>
      `).join('')
    : shipment.items_description
      ? `<tr><td style="text-align:center">1</td><td colspan="3">${shipment.items_description}</td><td></td></tr>`
      : `<tr><td colspan="5" style="text-align:center;color:#888;padding:20px">Tidak ada detail barang</td></tr>`;

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Surat Jalan ${suratJalanNo}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; font-size: 13px; }
        .header { text-align: center; border-bottom: 2px solid #2a9d8f; padding-bottom: 16px; margin-bottom: 24px; }
        .header h1 { font-size: 22px; color: #2a9d8f; margin-bottom: 4px; }
        .header p { font-size: 12px; color: #666; }
        .title { text-align: center; font-size: 18px; font-weight: 700; margin-bottom: 20px; text-decoration: underline; }
        .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .info-block { }
        .info-block h3 { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; margin-bottom: 8px; }
        .info-row { display: flex; gap: 8px; margin-bottom: 4px; font-size: 13px; }
        .info-row label { color: #666; min-width: 120px; }
        .info-row span { font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        thead th { background: #2a9d8f; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
        tbody td { padding: 10px 12px; border-bottom: 1px solid #ddd; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; }
        .sig-box { text-align: center; }
        .sig-box p { font-size: 12px; color: #666; margin-bottom: 60px; }
        .sig-box .line { border-top: 1px solid #333; padding-top: 4px; font-weight: 600; }
        .footer { text-align: center; margin-top: 40px; color: #888; font-size: 11px; border-top: 1px solid #eee; padding-top: 16px; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${store.name}</h1>
        <p>${store.address}</p>
        <p>Telp: ${store.phone}</p>
      </div>

      <div class="title">SURAT JALAN</div>

      <div class="info-section">
        <div class="info-block">
          <h3>Informasi Pengiriman</h3>
          <div class="info-row"><label>No. Surat Jalan</label><span>: ${suratJalanNo}</span></div>
          <div class="info-row"><label>Tanggal</label><span>: ${dateStr}</span></div>
          <div class="info-row"><label>No. Invoice</label><span>: ${shipment.invoice_number}</span></div>
        </div>
        <div class="info-block">
          <h3>Penerima</h3>
          <div class="info-row"><label>Nama</label><span>: ${shipment.recipient_name}</span></div>
          <div class="info-row"><label>Telepon</label><span>: ${shipment.recipient_phone}</span></div>
          <div class="info-row"><label>Alamat</label><span>: ${shipment.recipient_address}</span></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:40px;text-align:center">No</th>
            <th>Nama Barang</th>
            <th style="width:80px;text-align:center">Jumlah</th>
            <th style="width:80px;text-align:center">Satuan</th>
            <th style="width:120px">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      ${shipment.note ? `<p style="margin-bottom:20px;font-size:12px;color:#666"><strong>Catatan:</strong> ${shipment.note}</p>` : ''}

      <div class="signatures">
        <div class="sig-box">
          <p>Pengirim</p>
          <div class="line">( ________________________ )</div>
        </div>
        <div class="sig-box">
          <p>Penerima</p>
          <div class="line">( ________________________ )</div>
        </div>
      </div>

      <div class="footer">
        <p>${store.name} • ${store.phone}</p>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
