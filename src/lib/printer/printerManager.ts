/**
 * Printer Manager
 * 
 * Layer koordinasi untuk semua transport printer.
 * UI hanya berbicara dengan PrinterManager, tidak langsung ke transport.
 */

import { toast } from 'sonner';
import { PrinterTransport } from './transport';
import { PrinterConfig, PrinterTransaction, DrawerPin, DEFAULT_PRINTER_CONFIG } from './types';
import { buildReceipt, buildKitchenTicket } from './receipt';
import { EscPos } from './escpos';
import { WebUSBTransport } from './transports/webusb';
import { WebSerialTransport } from './transports/webserial';

const CONFIG_KEY = 'nadi_printer_config';
const TRANSPORT_KEY = 'nadi_printer_transport';

function loadConfig(): PrinterConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // Always enforce default drawer pin and baud rate
      return {
        ...DEFAULT_PRINTER_CONFIG,
        ...saved,
        drawerPin: 'pin2',  // Always use Pin 2
        baudRate: 9600,     // Always use 9600 bps
      };
    }
  } catch {
    // Ignore
  }
  return { ...DEFAULT_PRINTER_CONFIG };
}

function saveConfig(cfg: PrinterConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

let _isPrinting = false;

export class PrinterManager {
  private config: PrinterConfig = loadConfig();
  private transports: Map<string, PrinterTransport> = new Map();
  private activeTransportId: string | null = null;
  private listeners = new Set<() => void>();

  constructor() {
    // Register available transports
    this.registerTransport(new WebUSBTransport());
    this.registerTransport(new WebSerialTransport());

    // Load last used transport
    const saved = localStorage.getItem(TRANSPORT_KEY);
    this.activeTransportId = saved || 'webusb';
  }

  // ── Transport Management ──────────────────────────────────────────────────

  registerTransport(transport: PrinterTransport): void {
    this.transports.set(transport.id, transport);
  }

  getAvailableTransports(): PrinterTransport[] {
    return Array.from(this.transports.values()).filter(t => t.isSupported());
  }

  getActiveTransport(): PrinterTransport | null {
    if (!this.activeTransportId) return null;
    return this.transports.get(this.activeTransportId) || null;
  }

  setActiveTransport(transportId: string): void {
    const transport = this.transports.get(transportId);
    if (!transport) {
      throw new Error(`Transport ${transportId} tidak tersedia`);
    }
    
    this.activeTransportId = transportId;
    localStorage.setItem(TRANSPORT_KEY, transportId);
    this.notify();
  }

  getActiveTransportId(): string | null {
    return this.activeTransportId;
  }

  // ── Connection ────────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    const transport = this.getActiveTransport();
    if (!transport) {
      toast.error('Tidak ada transport yang dipilih');
      return;
    }

    if (!transport.isSupported()) {
      toast.error(`Transport ${transport.name} tidak didukung browser ini`);
      return;
    }

    try {
      await transport.connect();
      toast.success(`Terhubung ke printer via ${transport.name}`);
      this.notify();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghubungkan printer');
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    const transport = this.getActiveTransport();
    if (!transport) return;

    try {
      await transport.disconnect();
      this.notify();
    } catch (err: any) {
      console.error('Failed to disconnect:', err);
    }
  }

  isConnected(): boolean {
    const transport = this.getActiveTransport();
    return transport ? transport.isConnected() : false;
  }

  getDeviceLabel(): string | null {
    const transport = this.getActiveTransport();
    return transport ? transport.getDeviceLabel() : null;
  }

  // ── Printing ──────────────────────────────────────────────────────────────

  async printReceipt(tx: PrinterTransaction): Promise<void> {
    if (_isPrinting) {
      toast.warning('Printer sedang sibuk, harap tunggu...');
      return;
    }

    const transport = this.getActiveTransport();
    if (!transport) {
      toast.error('Pilih transport printer terlebih dahulu');
      throw new Error('No active transport');
    }

    _isPrinting = true;
    try {
      const bytes = buildReceipt(tx, this.config.paperWidth, this.config.drawerPin);
      await transport.write(bytes);
    } finally {
      _isPrinting = false;
    }
  }

  async printKitchenTicket(tx: PrinterTransaction): Promise<void> {
    if (_isPrinting) {
      toast.warning('Printer sedang sibuk, harap tunggu...');
      return;
    }

    const transport = this.getActiveTransport();
    if (!transport) {
      toast.error('Pilih transport printer terlebih dahulu');
      throw new Error('No active transport');
    }

    _isPrinting = true;
    try {
      const bytes = buildKitchenTicket(tx, this.config.paperWidth);
      await transport.write(bytes);
    } finally {
      _isPrinting = false;
    }
  }

  async openCashDrawer(): Promise<void> {
    if (_isPrinting) {
      toast.warning('Printer sedang sibuk, harap tunggu...');
      return;
    }

    const transport = this.getActiveTransport();
    if (!transport) {
      toast.error('Pilih transport printer terlebih dahulu');
      throw new Error('No active transport');
    }

    _isPrinting = true;
    try {
      const bytes = EscPos.build(EscPos.kickDrawer(this.config.drawerPin));
      await transport.write(bytes);
    } finally {
      _isPrinting = false;
    }
  }

  async testPrint(): Promise<void> {
    if (_isPrinting) {
      toast.warning('Printer sedang sibuk, harap tunggu...');
      return;
    }

    const transport = this.getActiveTransport();
    if (!transport) {
      toast.error('Pilih transport printer terlebih dahulu');
      throw new Error('No active transport');
    }

    _isPrinting = true;
    try {
      const now = new Date().toLocaleString('id-ID');
      const col = this.config.paperWidth === 80 ? 48 : 32;
      
      // Build test receipt using EscPosBuilder
      const { EscPosBuilder } = await import('./escpos');
      const builder = new EscPosBuilder();
      
      builder
        .init()
        .newline()
        .align('center')
        .bold(true)
        .line('=== TEST PRINT ===')
        .bold(false)
        .newline()
        .align('left')
        .row('Transport', transport.name, col)
        .row('Waktu', now, col)
        .row('Paper', `${this.config.paperWidth}mm`, col)
        .row('Drawer Pin', this.config.drawerPin, col)
        .separator('=', col)
        .align('center')
        .line('Printer berfungsi dengan baik!')
        .feed(4)
        .cut();

      await transport.write(builder.build());
    } finally {
      _isPrinting = false;
    }
  }

  // ── Configuration ─────────────────────────────────────────────────────────

  getConfig(): PrinterConfig {
    return { ...this.config };
  }

  getPaperWidth(): 58 | 80 {
    return this.config.paperWidth;
  }

  setPaperWidth(w: 58 | 80): void {
    this.config = { ...this.config, paperWidth: w };
    saveConfig(this.config);
    this.notify();
  }

  // ── Listeners ─────────────────────────────────────────────────────────────

  onChange(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach(cb => cb());
  }
}

// Singleton
export const printerManager = new PrinterManager();
