/**
 * lib/printer/printer.ts — PrinterManager singleton.
 *
 * Satu-satunya file yang di-import oleh komponen React.
 * UI cukup memanggil:
 *   printer.connect()
 *   printer.printReceipt(tx)
 *   printer.openCashDrawer()
 *
 * Semua detail (ESC/POS, Web Serial, error codes) tersembunyi di sini.
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
  isWebSerialSupported,
  connectViaRequest,
  reconnectViaCache,
  disconnectPort,
  writeToPort,
  loadPortInfo,
  getCachedPort,
} from './webserial';

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

// ── Spin-lock mutex ───────────────────────────────────────────────────────────

let _isPrinting = false;

// ── PrinterManager ────────────────────────────────────────────────────────────

class PrinterManager {
  private _config: PrinterConfig = loadConfig();
  private _status: PrinterStatus = 'disconnected';
  private _listeners: Set<(info: PrinterInfo) => void> = new Set();

  // ── Status ──────────────────────────────────────────────────────────────────

  getInfo(): PrinterInfo {
    return {
      status: this._status,
      portName: loadPortInfo()?.label ?? null,
      paperWidth: this._config.paperWidth,
    };
  }

  isConnected(): boolean {
    return this._status === 'connected' && getCachedPort() !== null;
  }

  isSupported(): boolean {
    return isWebSerialSupported();
  }

  /** Subscribe ke perubahan status printer */
  onStatusChange(cb: (info: PrinterInfo) => void): () => void {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  private _notify(): void {
    const info = this.getInfo();
    this._listeners.forEach(cb => cb(info));
  }

  // ── Config ──────────────────────────────────────────────────────────────────

  getConfig(): PrinterConfig { return { ...this._config }; }

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
    this._config = { ...this._config, baudRate: rate };
    saveConfig(this._config);
  }

  getPaperWidth(): 58 | 80 { return this._config.paperWidth; }

  // ── Connection ──────────────────────────────────────────────────────────────

  /**
   * Hubungkan printer — muncul dialog pilih port.
   * Gunakan di Settings atau tombol connect di POS header.
   */
  async connect(): Promise<boolean> {
    if (!isWebSerialSupported()) {
      toast.error('Browser tidak mendukung Web Serial API. Gunakan Chrome atau Edge.');
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
      if (err instanceof PrinterError) {
        if (err.code !== 'NO_PERMISSION') {
          // NO_PERMISSION = user batal = tidak perlu toast
          console.error('[Printer] connect error:', err);
        }
      }
      return false;
    }
  }

  /**
   * Reconnect ke port tersimpan — TANPA dialog.
   * Panggil saat app startup atau setelah port terputus.
   */
  async reconnect(): Promise<boolean> {
    if (!isWebSerialSupported()) return false;

    this._status = 'connecting';
    this._notify();

    const port = await reconnectViaCache();
    if (port) {
      this._status = 'connected';
      this._notify();
      return true;
    }

    this._status = 'disconnected';
    this._notify();
    return false;
  }

  async disconnect(): Promise<void> {
    disconnectPort();
    this._status = 'disconnected';
    this._notify();
  }

  // ── Print Operations ─────────────────────────────────────────────────────────

  /**
   * Cetak struk transaksi.
   * Satu ESC/POS stream: Init → Header → Items → Total → Footer → Cut → Kick Drawer.
   * Melempar PrinterError dengan kode yang jelas jika gagal.
   */
  async printReceipt(tx: PrinterTransaction): Promise<void> {
    if (_isPrinting) {
      toast.warning('Printer sedang sibuk, harap tunggu...');
      return;
    }

    _isPrinting = true;
    try {
      const bytes = buildReceipt(tx, this._config.paperWidth, this._config.drawerPin);
      await writeToPort(bytes, this._config);
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
      await writeToPort(bytes, this._config);
    } finally {
      _isPrinting = false;
    }
  }

  /**
   * Buka cash drawer saja (tanpa cetak struk).
   * Mengirim ESC/POS kick command via printer yang terhubung.
   */
  async openCashDrawer(): Promise<void> {
    const bytes = EscPos.build(EscPos.kickDrawer(this._config.drawerPin));
    await writeToPort(bytes, this._config);
  }

  /**
   * Test print sederhana untuk verifikasi koneksi.
   */
  async testPrint(): Promise<void> {
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
      EscPos.twoCol('Waktu', now, col),
      EscPos.twoCol('Paper', `${this._config.paperWidth}mm`, col),
      EscPos.twoCol('Status', 'OK', col),
      EscPos.separator('=', col),
      EscPos.align('center'),
      EscPos.text('Printer berfungsi dengan baik!'),
      EscPos.feedFallback(5),
      EscPos.cut(),
    );
    await writeToPort(bytes, this._config);
  }

  /**
   * Kirim raw bytes langsung ke printer.
   * Untuk use-case khusus di luar ReceiptBuilder.
   */
  async printRaw(data: Uint8Array): Promise<void> {
    await writeToPort(data, this._config);
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const printer = new PrinterManager();

// ── Auto-reconnect saat modul pertama kali dimuat ─────────────────────────────
// (fire-and-forget, jangan block app startup)
printer.reconnect().catch(() => { /* silent */ });
