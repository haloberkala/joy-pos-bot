/**
 * Printer Module Exports
 */

// Main API
export { printerManager } from './printerManager';
export { printer, PrinterError } from './printer';

// Types
export type { PrinterTransaction, PrinterConfig, PrinterTransport as PrinterTransportType, PrinterInfo } from './types';
export type { PrinterTransport } from './transport';

// Transports (for advanced usage)
export { WebUSBTransport } from './transports/webusb';
export { WebSerialTransport } from './transports/webserial';

// Helper function for backward compatibility
export function isWebUSBSupported(): boolean {
  return 'usb' in navigator;
}

