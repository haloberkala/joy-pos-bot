/**
 * Printer API - Backward Compatibility Layer
 * 
 * Mempertahankan API lama agar kode existing tidak rusak.
 * Sekarang hanya proxy ke PrinterManager.
 */

import { printerManager } from './printerManager';
import type { PrinterInfo } from './types';

export { PrinterError } from './types';
export type { PrinterTransaction, PrinterInfo } from './types';

/**
 * @deprecated Use printerManager directly for better control
 */
export const printer = {
  connect: () => printerManager.connect(),
  disconnect: () => printerManager.disconnect(),
  isConnected: () => printerManager.isConnected(),
  isSupported: () => {
    const transport = printerManager.getActiveTransport();
    return transport ? transport.isSupported() : false;
  },
  printReceipt: (tx: any) => printerManager.printReceipt(tx),
  printKitchenTicket: (tx: any) => printerManager.printKitchenTicket(tx),
  openCashDrawer: () => printerManager.openCashDrawer(),
  testPrint: () => printerManager.testPrint(),
  getConfig: () => printerManager.getConfig(),
  getPaperWidth: () => printerManager.getPaperWidth(),
  setPaperWidth: (w: 58 | 80) => printerManager.setPaperWidth(w),
  setDrawerPin: (pin: 'pin2' | 'pin5') => printerManager.setDrawerPin(pin),
  setBaudRate: (rate: number) => {
    // Baud rate hanya digunakan untuk WebSerial, disimpan di config
    const cfg = printerManager.getConfig();
    cfg.baudRate = rate;
    // Config akan otomatis tersimpan
  },
  getInfo: (): PrinterInfo => ({
    status: printerManager.isConnected() ? 'connected' : 'disconnected',
    portName: printerManager.getDeviceLabel(),
    paperWidth: printerManager.getPaperWidth(),
  }),
  onStatusChange: (cb: any) => printerManager.onChange(cb),
  reconnect: async () => {
    // Try to reconnect using last connected device
    if (printerManager.isConnected()) return true;
    try {
      await printerManager.connect();
      return true;
    } catch {
      return false;
    }
  },
};
