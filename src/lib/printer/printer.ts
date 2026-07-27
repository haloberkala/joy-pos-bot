/**
 * lib/printer/printer.ts — PrinterManager singleton.
 *
 * Entry point tunggal untuk seluruh UI.
 * Transport: WebUSB (via webusb.ts).
 *
 * Usage:
 *   printer.connect()
 *   printer.printReceipt(tx)
 *   printer.openCashDrawer()
 */

import { toast } from 'sonner';
import {
  PrinterConfig, PrinterInfo, PrinterStatus,
  PrinterTransaction, PrinterError,
  DEFAULT_PRINTER_CONFIG,
} from './types';
import { EscPos } from './escpos';
import { buildReceipt, buildKitchenTicket } from './receipt';
import {
  isWebUSBSupported,
  connectViaRequest,
  reconnectViaCache,
  disconnectDevice,
  writeToDevice,
  loadDeviceInfo,
  getDeviceLabel,
  getCachedDevice,
} from './webusb';

// ── Config persistence ────────────────────────────────────────────────────────

const CONFIG_KEY = 'nadi_printer_config';

function loadConfig(): PrinterConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...DEFAULT_PRINTER_CONFIG, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_PRINTER_CONFIG };
}

function saveConfig(cfg: PrinterConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

// ── Mutex ─────────────────────────────────────────────────────────────────────

let _isPrinting = false;

// ── PrinterManager ────────────────────────────────────────────────────────────

class PrinterManager {
  private _config: PrinterConfig = loadConfig();
  private _status: PrinterStatus = 'disconnected';
  private _listeners = new Set<(info: PrinterInfo) => void>();

  // ── Info & Status ────────────────────────────────────────────────────────────

  getInfo(): PrinterInfo {
    return {
      status: this._status,
      portName: getDeviceLabel() ?? loadDeviceInfo()?.label ?? null,
      paperWidth: this._config.paperWidth,
    };
  }

  isConnected(): boolean {
    return this._status === 'connected' && getCachedDevice() !== null;
  }

  isSupported(): boolean {
    return isWebUSBSupported();
  }

  onStatusChange(cb: (info: PrinterInfo) => void): () => void {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  private _notify(): void {
    const info = this.getInfo();
    this._listeners.forEach(cb => cb(info));
  }

  // ── Config ───────────────────────────────────────────────────────────────────

  getConfig(): PrinterConfig { return { ...this._config }; }

  getPaperWidth(): 58 | 80 { return this._config.paperWidth; }

  setPaperWidth(w: 58 | 80): void {
    this._config = { ...this._config, paperWidth: w };
    saveConfig(this._config);
    this._notify();
  }

  setDrawerPin(pin: 'pin2' | 'pin5'): void {
    this._config = { ...this._config, drawerPin: pin };
    saveConfig(this._config);
  }

  setBaudRate(rate: number): void {
    // Dipertahankan untuk API compatibility — WebUSB tidak menggunakan baud rate
    this._config = { ...this._config, baudRate: rate };
    saveConfig(this._config);
  }

  // ── Connection ────────────────────────────────────────────────────────────────

  /** Hubungkan printer — muncul dialog WebUSB requestDevice. */
  async connect(): Promise<boolean> {
    if (!isWebUSBSupported()) {
      toast.error('Browser tidak mendukung WebUSB. Gunakan Chrome atau Edge.');
      return false;
    }

    this._status = 'connecting';
    this._notify();

    try {
      await connectViaRequest();
      this._status = 'connected';
      this._notify();
      return true;
    } catch (err) {
      this._status = 'disconnected';
      this._notify();
      if (err instanceof PrinterError && err.code !== 'NO_PERMISSION') {
        // NO_PERMISSION = user cancel, tidak perlu log
        console.error('[Printer] connect:', err.code, err.message);
      }
      return false;
    }
  }

  /**
   * Reconnect ke device tersimpan tanpa dialog.
   * Dipanggil otomatis saat app dibuka.
   */
  async reconnect(): Promise<boolean> {
    if (!isWebUSBSupported()) return false;

    this._status = 'connecting';
    this._notify();

    const device = await reconnectViaCache();
    if (device) {
      this._status = 'connected';
      this._notify();
      return true;
    }

    this._status = 'disconnected';
    this._notify();
    return false;
  }

  async disconnect(): Promise<void> {
    await disconnectDevice();
    this._status = 'disconnected';
    this._notify();
  }

  // ── Print ─────────────────────────────────────────────────────────────────────

  /**
   * Cetak struk + kick cash drawer dalam satu ESC/POS stream.
   * Init → Header → Items → Summary → Footer → Feed → Cut → KickDrawer
   */
  async printReceipt(tx: PrinterTransaction): Promise<void> {
    if (_isPrinting) {
      toast.warning('Printer sedang sibuk, harap tunggu...');
      return;
    }
    _isPrinting = true;
    try {
      const bytes = buildReceipt(tx, this._config.paperWidth, this._config.drawerPin);
      await writeToDevice(bytes, this._config);
    } finally {
      _isPrinting = false;
    }
  }

  async printKitchenTicket(tx: PrinterTransaction): Promise<void> {
    if (_isPrinting) {
      toast.warning('Printer sedang sibuk, harap tunggu...');
      return;
    }
    _isPrinting = true;
    try {
      const bytes = buildKitchenTicket(tx, this._config.paperWidth);
      await writeToDevice(bytes, this._config);
    } finally {
      _isPrinting = false;
    }
  }

  /** Buka cash drawer saja — tanpa mencetak struk. */
  async openCashDrawer(): Promise<void> {
    if (_isPrinting) {
      toast.warning('Printer sedang sibuk, harap tunggu...');
      return;
    }
    _isPrinting = true;
    try {
      const bytes = EscPos.build(EscPos.kickDrawer(this._config.drawerPin));
      await writeToDevice(bytes, this._config);
    } finally {
      _isPrinting = false;
    }
  }

  /** Test print sederhana untuk verifikasi koneksi dan konfigurasi. */
  async testPrint(): Promise<void> {
    if (_isPrinting) {
      toast.warning('Printer sedang sibuk, harap tunggu...');
      return;
    }
    _isPrinting = true;
    try {
      const now = new Date().toLocaleString('id-ID');
      const col = this._config.paperWidth === 80 ? 48 : 32;
      const bytes = EscPos.build(
        EscPos.init(),
        EscPos.align('center'),
        EscPos.bold(true),
        EscPos.text('=== TEST PRINT ==='),
        EscPos.bold(false),
        EscPos.text(''),
        EscPos.align('left'),
        EscPos.twoCol('Transport', 'WebUSB', col),
        EscPos.twoCol('Waktu', now, col),
        EscPos.twoCol('Paper', `${this._config.paperWidth}mm`, col),
        EscPos.twoCol('Drawer Pin', this._config.drawerPin, col),
        EscPos.separator('=', col),
        EscPos.align('center'),
        EscPos.text('Printer berfungsi dengan baik!'),
        EscPos.feedFallback(5),
        EscPos.cut(),
      );
      await writeToDevice(bytes, this._config);
    } finally {
      _isPrinting = false;
    }
  }

  /** Kirim raw bytes langsung. Untuk keperluan khusus. */
  async printRaw(data: Uint8Array): Promise<void> {
    if (_isPrinting) {
      toast.warning('Printer sedang sibuk, harap tunggu...');
      return;
    }
    _isPrinting = true;
    try {
      await writeToDevice(data, this._config);
    } finally {
      _isPrinting = false;
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const printer = new PrinterManager();

// Auto-reconnect saat modul dimuat (fire-and-forget)
printer.reconnect().catch(() => { /* silent */ });
