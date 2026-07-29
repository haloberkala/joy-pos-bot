export interface InvoiceData {
  invoice_number: string;
  date: string;
  customer: string;
  cashier: string;
  payment_status: string;
  store: { name: string; address?: string | null; phone?: string | null };
  items: InvoiceItem[];
  total: number;
  paid: number;
  change: number;
  note?: string | null;
}

export interface InvoiceItem {
  no: number;
  name: string;
  qty: number;
  price: number;
  total: number;
  type?: string;
}
