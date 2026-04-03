import { Sale, SaleDetail, Product, Store } from '@/types/pos';
import { formatCurrency, formatDate } from '@/lib/format';
import { customers } from '@/data/sampleData';

interface PrintInvoiceProps {
  sale: Sale;
  saleDetails: (SaleDetail & { product?: Product })[];
  store: Store;
}

export function printInvoice({ sale, saleDetails, store }: PrintInvoiceProps) {
  const customerName = sale.customer_id
    ? customers.find(c => c.id === sale.customer_id)?.name || '-'
    : 'Umum';

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Faktur ${sale.invoice_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; font-size: 13px; }
        .header { text-align: center; border-bottom: 2px solid #2a9d8f; padding-bottom: 16px; margin-bottom: 20px; }
        .header h1 { font-size: 22px; color: #2a9d8f; margin-bottom: 4px; }
        .header p { font-size: 12px; color: #666; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .info-box { background: #f8f9fa; border-radius: 8px; padding: 12px; }
        .info-box label { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
        .info-box p { font-weight: 600; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        thead th { background: #2a9d8f; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
        thead th:last-child, thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
        tbody td { padding: 8px 12px; border-bottom: 1px solid #eee; }
        tbody td:last-child, tbody td:nth-child(3), tbody td:nth-child(4) { text-align: right; }
        .summary { margin-left: auto; width: 280px; }
        .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
        .summary-row.total { border-top: 2px solid #2a9d8f; padding-top: 8px; margin-top: 4px; font-weight: 700; font-size: 16px; }
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

      <div style="text-align:center;margin-bottom:16px;font-size:16px;font-weight:700;">FAKTUR / INVOICE</div>

      <div class="info-grid">
        <div class="info-box">
          <label>No. Faktur</label>
          <p>${sale.invoice_number}</p>
        </div>
        <div class="info-box">
          <label>Tanggal</label>
          <p>${formatDate(sale.date)}</p>
        </div>
        <div class="info-box">
          <label>Pelanggan</label>
          <p>${customerName}</p>
        </div>
        <div class="info-box">
          <label>Metode Pembayaran</label>
          <p>${sale.payment_method === 'cash' ? 'Tunai' : sale.payment_method === 'transfer' ? 'Transfer' : 'QRIS'}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Barang</th>
            <th>Harga</th>
            <th>Qty</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${saleDetails.map((item, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${item.product?.name || 'Produk #' + item.product_id}</td>
              <td>${formatCurrency(item.price_at_sale)}</td>
              <td style="text-align:center">${item.quantity}</td>
              <td>${formatCurrency(item.total_price)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="summary">
        <div class="summary-row"><span>Subtotal</span><span>${formatCurrency(sale.sub_total)}</span></div>
        ${sale.discount > 0 ? `<div class="summary-row"><span>Diskon</span><span>-${formatCurrency(sale.discount)}</span></div>` : ''}
        <div class="summary-row total"><span>Total</span><span>${formatCurrency(sale.grand_total)}</span></div>
        <div class="summary-row"><span>Dibayar</span><span>${formatCurrency(sale.amount_received)}</span></div>
        ${sale.change_amount > 0 ? `<div class="summary-row"><span>Kembalian</span><span>${formatCurrency(sale.change_amount)}</span></div>` : ''}
        <div class="summary-row"><span>Status</span><span>${sale.payment_status === 'paid' ? '✅ Lunas' : '⏳ Utang'}</span></div>
      </div>

      <div class="footer">
        <p>Terima kasih atas kepercayaan Anda</p>
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
