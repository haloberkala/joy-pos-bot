/**
 * Web Serial Transport
 * 
 * Implementasi transport menggunakan Web Serial API.
 * Untuk Windows: koneksi ke virtual COM port dari printer Bluetooth atau USB Serial.
 * Untuk Bluetooth printer: pair dulu di Windows Settings, lalu akan muncul sebagai COM port.
 */

import { PrinterTransport } from '../transport';
import { PrinterError } from '../types';

const STORAGE_KEY = 'nadi_printer_serial_port';

interface PortInfo {
  label: string;
}

export class WebSerialTransport implements PrinterTransport {
  readonly id = 'serial';
  readonly name = 'Serial/Bluetooth';
  
  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter | null = null;

  isSupported(): boolean {
    return 'serial' in navigator;
  }

  isConnected(): boolean {
    return this.port !== null;
  }

  async connect(): Promise<void> {
    if (!this.isSupported()) {
      throw new PrinterError(
        'UNSUPPORTED_BROWSER',
        'Browser tidak mendukung Web Serial. Gunakan Chrome atau Edge.'
      );
    }

    try {
      // Request port dengan filter optional (baud rate tidak relevan untuk virtual port)
      this.port = await (navigator as any).serial.requestPort();
      
      // Open dengan config standar
      await this.port.open({ 
        baudRate: 9600, // Tidak relevan untuk virtual COM port tapi wajib diisi
      });

      this.savePortInfo();

    } catch (err: any) {
      if (err?.name === 'NotFoundError') {
        throw new PrinterError('NO_PERMISSION', 'Pemilihan port dibatalkan.');
      }
      throw new PrinterError('NO_PRINTER', `Gagal membuka port: ${err?.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.writer) {
      try {
        await this.writer.close();
      } catch {
        // Ignore
      }
      this.writer = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch {
        // Ignore
      }
      this.port = null;
    }

    this.clearPortInfo();
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.port) {
      // Try to reconnect from cached ports
      await this.reconnect();
    }

    if (!this.port) {
      throw new PrinterError('NO_PRINTER', 'Port serial belum terhubung.');
    }

    try {
      if (!this.writer) {
        this.writer = this.port.writable?.getWriter() || null;
      }

      if (!this.writer) {
        throw new PrinterError('PRINT_FAILED', 'Tidak bisa menulis ke port.');
      }

      await this.writer.write(data);

    } catch (err) {
      if (err instanceof PrinterError) throw err;

      const msg = (err as any)?.message ?? '';

      if (msg.includes('disconnected') || msg.includes('lost')) {
        this.port = null;
        this.writer = null;
        throw new PrinterError('PORT_DISCONNECTED', 'Port terputus.');
      }

      throw new PrinterError('PRINT_FAILED', `Gagal cetak: ${msg}`);
    }
  }

  getDeviceLabel(): string | null {
    // Web Serial tidak menyediakan nama device yang bagus
    // Kita gunakan info dari localStorage atau fallback
    const info = this.loadPortInfo();
    return info?.label || (this.port ? 'Serial Port' : null);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async reconnect(): Promise<void> {
    if (!this.isSupported()) return;

    try {
      const ports = await (navigator as any).serial.getPorts();
      if (ports.length > 0) {
        this.port = ports[0]; // Ambil port pertama yang sudah pernah diberi akses
        await this.port.open({ baudRate: 9600 });
      }
    } catch {
      // Ignore
    }
  }

  private savePortInfo(): void {
    const info: PortInfo = {
      label: 'Serial Port', // Web Serial tidak expose nama device
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  }

  private loadPortInfo(): PortInfo | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private clearPortInfo(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
