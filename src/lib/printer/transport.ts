/**
 * Transport Interface
 * 
 * Abstraksi untuk berbagai cara komunikasi dengan printer thermal.
 * Setiap transport (WebUSB, Web Serial, Bluetooth, LAN, dll) harus
 * mengimplementasikan interface ini.
 */

import { DrawerPin } from './types';

export interface PrinterTransport {
  /** Unique identifier untuk transport ini */
  readonly id: string;
  
  /** Display name untuk UI */
  readonly name: string;
  
  /** Apakah browser support transport ini */
  isSupported(): boolean;
  
  /** Apakah printer sudah terhubung */
  isConnected(): boolean;
  
  /** Connect ke printer (bisa memunculkan dialog pemilihan device) */
  connect(): Promise<void>;
  
  /** Disconnect dari printer */
  disconnect(): Promise<void>;
  
  /** Kirim data ESC/POS ke printer */
  write(data: Uint8Array): Promise<void>;
  
  /** Get label printer yang terhubung (untuk display) */
  getDeviceLabel(): string | null;
}
