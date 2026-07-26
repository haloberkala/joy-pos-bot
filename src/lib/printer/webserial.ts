/**
 * lib/printer/webserial.ts — Seluruh logika Web Serial API.
 *
 * Flow:
 * - connect()  → requestPort() → simpan di localStorage
 * - reconnect() → getPorts() → tidak ada popup jika permission masih ada
 * - write()    → open() → getWriter() → write() → releaseLock() → close()
 *
 * Port dibuka dan ditutup per-job untuk menghindari kondisi "port already open"
 * ketika tab di-refresh atau koneksi terputus.
 */

import { PrinterError, PrinterConfig } from './types';

const STORAGE_KEY = 'nadi_printer_port_info';

// ── Port info persistence ─────────────────────────────────────────────────────

export function savePortInfo(info: { label: string }): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
}

export function loadPortInfo(): { label: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearPortInfo(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Capability check ──────────────────────────────────────────────────────────

export function isWebSerialSupported(): boolean {
  return 'serial' in navigator;
}

// ── Cached port (in-memory untuk satu sesi browser) ──────────────────────────

let _cachedPort: SerialPort | null = null;

export function getCachedPort(): SerialPort | null { return _cachedPort; }
export function setCachedPort(port: SerialPort | null): void { _cachedPort = port; }

// ── Connect (requestPort — muncul dialog) ─────────────────────────────────────

/**
 * Minta user memilih port dari dialog browser.
 * Simpan port ke in-memory cache dan localStorage.
 * Melempar PrinterError jika dibatalkan atau tidak didukung.
 */
export async function connectViaRequest(): Promise<SerialPort> {
  if (!isWebSerialSupported()) {
    throw new PrinterError(
      'UNSUPPORTED_BROWSER',
      'Browser tidak mendukung Web Serial API. Gunakan Chrome atau Edge.',
    );
  }

  let port: SerialPort;
  try {
    port = await (navigator as any).serial.requestPort();
  } catch (err: any) {
    if (err?.name === 'NotFoundError') {
      throw new PrinterError('NO_PERMISSION', 'Pemilihan printer dibatalkan.', err);
    }
    throw new PrinterError('NO_PRINTER', `Gagal memilih port: ${err?.message}`, err);
  }

  _cachedPort = port;
  // Simpan label untuk ditampilkan di UI (port tidak punya nama, kita pakai "Terpilih")
  savePortInfo({ label: 'Printer Terpilih' });
  return port;
}

// ── Reconnect (getPorts — tanpa dialog jika permission masih ada) ─────────────

/**
 * Coba sambungkan ulang ke port yang sudah pernah diberi permission.
 * Returns port jika berhasil, null jika tidak ada port tersimpan.
 */
export async function reconnectViaCache(): Promise<SerialPort | null> {
  if (!isWebSerialSupported()) return null;

  try {
    const ports: SerialPort[] = await (navigator as any).serial.getPorts();
    if (ports.length === 0) return null;
    _cachedPort = ports[0];
    savePortInfo({ label: 'Printer Terpilih' });
    return _cachedPort;
  } catch {
    return null;
  }
}

// ── Disconnect ────────────────────────────────────────────────────────────────

export function disconnectPort(): void {
  _cachedPort = null;
  clearPortInfo();
}

// ── Write (buka → tulis → tutup) ─────────────────────────────────────────────

/**
 * Kirim raw ESC/POS bytes ke printer.
 * Port dibuka per-job (open/close) untuk mencegah "port already open" error.
 */
export async function writeToPort(data: Uint8Array, config: PrinterConfig): Promise<void> {
  if (!isWebSerialSupported()) {
    throw new PrinterError(
      'UNSUPPORTED_BROWSER',
      'Browser tidak mendukung Web Serial API. Gunakan Chrome atau Edge.',
    );
  }

  // Ambil port dari cache, atau coba getPorts() tanpa dialog
  let port = _cachedPort;
  if (!port) {
    const ports: SerialPort[] = await (navigator as any).serial.getPorts();
    if (ports.length > 0) {
      port = ports[0];
      _cachedPort = port;
    }
  }

  if (!port) {
    throw new PrinterError(
      'NO_PRINTER',
      'Printer belum dipilih. Kunjungi Pengaturan → Printer untuk menghubungkan printer.',
    );
  }

  let opened = false;
  try {
    // Cek apakah port sudah terbuka (readable/writable tersedia)
    const isOpen = port.readable !== null || port.writable !== null;
    if (!isOpen) {
      await port.open({ baudRate: config.baudRate });
      opened = true;
    } else {
      opened = false; // sudah terbuka sebelumnya, jangan tutup di finally
    }

    if (!port.writable) {
      throw new PrinterError('PORT_BUSY', 'Port tidak bisa ditulis. Printer mungkin sedang sibuk.');
    }

    const writer = port.writable.getWriter();
    try {
      await writer.write(data);
    } finally {
      writer.releaseLock();
    }

  } catch (err) {
    if (err instanceof PrinterError) throw err;

    const msg = (err as any)?.message ?? '';
    if (msg.includes('already in progress') || msg.includes('Failed to open serial port')) {
      throw new PrinterError('PORT_BUSY', `Akses printer ditolak: ${msg}`, err);
    }
    if ((err as any)?.name === 'NetworkError') {
      _cachedPort = null; // Port tidak lagi valid
      throw new PrinterError('PORT_DISCONNECTED', 'Printer terputus. Silakan hubungkan kembali.', err);
    }
    throw new PrinterError('PRINT_FAILED', `Gagal mengirim data ke printer: ${msg}`, err);
  } finally {
    // Tutup port hanya jika kita yang membukanya
    if (opened && port) {
      try { await port.close(); } catch { /* ignore */ }
    }
  }
}
