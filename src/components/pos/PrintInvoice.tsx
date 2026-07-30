import { Sale, SaleItem } from '@/services/salesService';
import { adaptSaleToInvoice, downloadPDF, generateInvoicePDF, previewPDF, printPDF } from '@/lib/invoice';

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
  customerPhone?: string;
}

export async function printInvoice(props: PrintInvoiceProps): Promise<void> {
  printPDF(generateInvoicePDF(adaptSaleToInvoice(props.sale, props.items, props.store, props.customerName, props.customerPhone)));
}

export async function downloadInvoice(props: PrintInvoiceProps): Promise<void> {
  const document = generateInvoicePDF(adaptSaleToInvoice(props.sale, props.items, props.store, props.customerName, props.customerPhone));
  downloadPDF(document, `Faktur-${props.sale.invoice_number}.pdf`);
}

export async function previewInvoice(props: PrintInvoiceProps): Promise<void> {
  previewPDF(generateInvoicePDF(adaptSaleToInvoice(props.sale, props.items, props.store, props.customerName, props.customerPhone)));
}

export default printInvoice;
