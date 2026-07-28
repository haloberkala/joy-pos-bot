/**
 * lib/printer/types.ts — Semua type definitions untuk printer module.
 * Tidak ada import eksternal agar portable.
 */

export type PaperWidth = 58 | 80;
export type Alignment  = 'left' | 'center' | 'right';
export type DrawerPin  = 'pin2' | 'pin5';
export type PrinterTransport = 'webusb' | 'serial';

export type PrinterErrorCode =
  | 'UNSUPPORTED_BROWSER'
  | 'NO_PRINTER'
  | 'NO_PERMISSION'
  | 'PORT_BUSY'
  | 'PORT_DISCONNECTED'
  | 'PRINT_FAILED';

export type PrinterStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// ── Error ─────────────────────────────────────────────────────────────────────

export class PrinterError extends Error {
  constructor(
    public readonly code: PrinterErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'PrinterError';
  }
}

// ── Config ────────────────────────────────────────────────────────────────────

export interface PrinterConfig {
  paperWidth: PaperWidth;
  drawerPin: DrawerPin;
  baudRate: number;
}

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  paperWidth: 80,
  drawerPin: 'pin2',
  baudRate: 9600,
};

// ── Transaction domain (digunakan receipt.ts dan POS.tsx) ────────────────────

export interface PrinterTransactionItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PrinterTransaction {
  id: string;
  invoiceNumber: string;
  storeName: string;
  storeAddress?: string | null;
  storePhone?: string | null;
  cashierName: string;
  customerName?: string | null;
  paymentMethod: 'cash' | 'qris' | 'transfer';
  paymentStatus: 'paid' | 'debt';
  items: PrinterTransactionItem[];
  subtotal: number;
  discount?: number;
  grandTotal: number;
  amountReceived?: number;
  change?: number;
  note?: string | null;
  createdAt: Date | string;
}

// ── Printer info (untuk UI) ───────────────────────────────────────────────────

export interface PrinterInfo {
  status: PrinterStatus;
  portName: string | null;
  paperWidth: PaperWidth;
}
