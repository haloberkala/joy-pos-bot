import { Sale, SaleItem } from '@/services/salesService';
import { InvoiceData } from './types';

interface Store { name: string; address?: string | null; phone?: string | null; }

export function adaptSaleToInvoice(sale: Sale, items: SaleItem[], store: Store, customerName?: string): InvoiceData {
  return {
    invoice_number: sale.invoice_number,
    date: sale.sale_date || new Date().toISOString(),
    customer: customerName || 'Umum',
    cashier: sale.cashier_name || '-',
    payment_method: sale.payment_method || 'cash',
    payment_status: sale.payment_status || 'paid',
    store,
    items: items.map((item, index) => ({
      no: index + 1,
      name: item.product_name || '-',
      qty: item.quantity || 0,
      price: item.price_per_unit || 0,
      total: item.total_price || 0,
      type: item.price_mode === 'wholesale' ? 'GRS' : item.price_mode === 'special' ? 'SPL' : 'ECR',
    })),
    total: sale.grand_total || 0,
    paid: sale.amount_received || 0,
    change: sale.change_amount || 0,
    note: sale.note,
  };
}
