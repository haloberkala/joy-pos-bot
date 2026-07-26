/**
 * lib/printer/index.ts — Public API.
 * Komponen React hanya import dari '@/lib/printer'.
 */

export { printer }          from './printer';
export { PrinterError }     from './types';
export { isWebSerialSupported } from './webserial';
export { EscPos }           from './escpos';
export { buildReceipt, buildKitchenTicket } from './receipt';

export type {
  PrinterTransaction,
  PrinterTransactionItem,
  PrinterConfig,
  PrinterInfo,
  PrinterStatus,
  PrinterErrorCode,
  PaperWidth,
  DrawerPin,
} from './types';
