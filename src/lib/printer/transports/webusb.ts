/**
 * WebUSB Transport
 * 
 * Implementasi transport menggunakan WebUSB API.
 * Cocok untuk Linux, tapi akan gagal di Windows karena driver usbprint.sys.
 */

import { PrinterTransport } from '../transport';
import { PrinterError } from '../types';

const STORAGE_KEY = 'nadi_printer_webusb_device';
const PRINTER_FILTERS: USBDeviceFilter[] = [
  { vendorId: 0x0418, productId: 0x5011 }, // Iware XS-80BT
];

interface DeviceInfo {
  vendorId: number;
  productId: number;
  label: string;
}

export class WebUSBTransport implements PrinterTransport {
  readonly id = 'webusb';
  readonly name = 'USB';
  
  private device: USBDevice | null = null;

  isSupported(): boolean {
    return 'usb' in navigator;
  }

  isConnected(): boolean {
    return this.device !== null;
  }

  async connect(): Promise<void> {
    if (!this.isSupported()) {
      throw new PrinterError(
        'UNSUPPORTED_BROWSER',
        'Browser tidak mendukung WebUSB. Gunakan Chrome atau Edge.'
      );
    }

    try {
      this.device = await navigator.usb.requestDevice({ filters: PRINTER_FILTERS });
      this.saveDeviceInfo();
    } catch (err: any) {
      if (err?.name === 'NotFoundError') {
        throw new PrinterError('NO_PERMISSION', 'Pemilihan printer dibatalkan.');
      }
      throw new PrinterError('NO_PRINTER', `Gagal memilih printer: ${err?.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.device?.opened) {
      try {
        await this.device.close();
      } catch {
        // Ignore
      }
    }
    this.device = null;
    this.clearDeviceInfo();
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.device) {
      // Try to reconnect from cached devices
      await this.reconnect();
    }

    if (!this.device) {
      throw new PrinterError('NO_PRINTER', 'Printer belum terhubung.');
    }

    let shouldClose = false;
    let interfaceNumber: number | null = null;
    let interfaceClaimed = false;

    try {
      if (!this.device.opened) {
        await this.device.open();
        shouldClose = true;

        if (this.device.configuration === null) {
          await this.device.selectConfiguration(1);
        }
      }

      interfaceNumber = this.findInterface(this.device);
      if (interfaceNumber === null) {
        throw new PrinterError('NO_PRINTER', 'Interface printer tidak ditemukan.');
      }

      await this.device.claimInterface(interfaceNumber);
      interfaceClaimed = true;

      const endpoint = this.findEndpoint(this.device);
      if (endpoint === null) {
        throw new PrinterError('NO_PRINTER', 'Endpoint OUT tidak ditemukan.');
      }

      const CHUNK_SIZE = 64 * 1024;
      for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
        const chunk = data.slice(offset, Math.min(offset + CHUNK_SIZE, data.length));
        await this.device.transferOut(endpoint, chunk);
      }

    } catch (err) {
      if (err instanceof PrinterError) throw err;

      const msg = (err as any)?.message ?? '';

      if (msg.includes('disconnected')) {
        this.device = null;
        throw new PrinterError('PORT_DISCONNECTED', 'Printer terputus.');
      }

      if (msg.includes('Access denied') || msg.includes('access denied')) {
        throw new PrinterError('NO_PERMISSION', 'Akses ditolak. Gunakan mode Serial/Bluetooth di Windows.');
      }

      if (msg.includes('busy') || msg.includes('in use')) {
        throw new PrinterError('PORT_BUSY', 'Printer sedang sibuk.');
      }

      throw new PrinterError('PRINT_FAILED', `Gagal cetak: ${msg}`);

    } finally {
      if (interfaceClaimed && this.device && interfaceNumber !== null) {
        try {
          await this.device.releaseInterface(interfaceNumber);
        } catch {
          // Ignore
        }
      }
      
      if (shouldClose && this.device) {
        try {
          await this.device.close();
        } catch {
          // Ignore
        }
      }
    }
  }

  getDeviceLabel(): string | null {
    return this.device?.productName || this.loadDeviceInfo()?.label || null;
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async reconnect(): Promise<void> {
    if (!this.isSupported()) return;

    try {
      const devices = await navigator.usb.getDevices();
      this.device = devices.find(d =>
        PRINTER_FILTERS.some(f => f.vendorId === d.vendorId && f.productId === d.productId)
      ) || null;
      
      if (this.device) {
        this.saveDeviceInfo();
      }
    } catch {
      // Ignore
    }
  }

  private findInterface(device: USBDevice): number | null {
    if (!device.configuration) return null;

    for (const iface of device.configuration.interfaces) {
      for (const alt of iface.alternates) {
        if (alt.interfaceClass === 7 && alt.interfaceSubclass === 1) {
          return iface.interfaceNumber;
        }
      }
    }

    return device.configuration.interfaces[0]?.interfaceNumber ?? null;
  }

  private findEndpoint(device: USBDevice): number | null {
    if (!device.configuration) return null;

    for (const iface of device.configuration.interfaces) {
      for (const alt of iface.alternates) {
        if (alt.interfaceClass === 7 && alt.interfaceSubclass === 1) {
          const endpoint = alt.endpoints.find(ep => ep.direction === 'out');
          if (endpoint) return endpoint.endpointNumber;
        }
      }
    }

    for (const iface of device.configuration.interfaces) {
      for (const alt of iface.alternates) {
        const endpoint = alt.endpoints.find(ep => ep.direction === 'out');
        if (endpoint) return endpoint.endpointNumber;
      }
    }

    return null;
  }

  private saveDeviceInfo(): void {
    if (!this.device) return;
    const info: DeviceInfo = {
      vendorId: this.device.vendorId,
      productId: this.device.productId,
      label: this.device.productName || 'USB Printer',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  }

  private loadDeviceInfo(): DeviceInfo | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private clearDeviceInfo(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
