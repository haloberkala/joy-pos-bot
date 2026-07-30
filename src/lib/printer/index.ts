/**
 * lib/printer/index.ts — Public API barrel.
 * Semua UI hanya import dari '@/lib/printer'.
 */

// ── Primary API ───────────────────────────────────────────────────────────────
export { printerManager }            from './printerManager';
export { printer, PrinterError }     from './printer';

// ── Types ─────────────────────────────────────────────────────────────────────
export type { PrinterTransaction, PrinterConfig, PrinterInfo, PrinterStatus, PrinterErrorCode, PaperWidth, DrawerPin } from './types';
export type { PrinterTransport }     from './transport';

// ── Transports ────────────────────────────────────────────────────────────────
export { WebUSBTransport }           from './transports/webusb';
export { WebSerialTransport }        from './transports/webserial';

// ── Browser support helpers ───────────────────────────────────────────────────
export function isWebUSBSupported():    boolean { return typeof navigator !== 'undefined' && 'usb'    in navigator; }
export function isWebSerialSupported(): boolean { return typeof navigator !== 'undefined' && 'serial' in navigator; }
