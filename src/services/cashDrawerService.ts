/**
 * Cash Drawer Service — ESC/POS Kick Command via Web Serial API
 *
 * Cara kerja:
 * 1. Browser mengirim perintah ESC/POS langsung ke printer via Web Serial API
 * 2. Printer meneruskan sinyal listrik ke laci kasir via kabel RJ-11
 * 3. Laci terbuka otomatis ("klek!")
 *
 * Syarat:
 * - Browser: Chrome / Edge (Web Serial API tidak didukung Firefox/Safari)
 * - Printer: thermal/dot matrix dengan port cash drawer (RJ-11)
 * - OS: Windows / Linux / macOS
 * - Koneksi printer: USB Serial (bukan Bluetooth)
 *
 * ESC/POS Kick Command: 1B 70 00 19 96
 *   1B = ESC
 *   70 = 'p' (kick drawer)
 *   00 = pin 2 (sebagian printer pakai 01 untuk pin 5)
 *   19 = pulse on time  (25 × 2ms = 50ms)
 *   96 = pulse off time (150 × 2ms = 300ms)
 */

// ESC/POS command bytes
const ESC_POS_KICK_PIN2 = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0x96]);
const ESC_POS_KICK_PIN5 = new Uint8Array([0x1b, 0x70, 0x01, 0x19, 0x96]);

export type CashDrawerPin = 'pin2' | 'pin5';

export interface CashDrawerConfig {
  enabled: boolean;
  pin: CashDrawerPin;
  baudRate: number;
}

const DEFAULT_CONFIG: CashDrawerConfig = {
  enabled: false,
  pin: 'pin2',
  baudRate: 9600,
};

const CONFIG_KEY = 'nadi_cash_drawer_config';

// ── Config persistence ──────────────────────────────────────────────────────

export function getCashDrawerConfig(): CashDrawerConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_CONFIG };
}

export function saveCashDrawerConfig(config: CashDrawerConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// ── Capability check ────────────────────────────────────────────────────────

export function isWebSerialSupported(): boolean {
  return 'serial' in navigator;
}

// ── Core kick function ──────────────────────────────────────────────────────

/**
 * Kirim ESC/POS kick command ke printer via Web Serial API.
 * Returns true jika berhasil, false + console.warn jika gagal.
 */
export async function triggerCashDrawer(pin: CashDrawerPin = 'pin2', baudRate = 9600): Promise<boolean> {
  if (!isWebSerialSupported()) {
    console.warn('[CashDrawer] Web Serial API tidak didukung. Gunakan Chrome/Edge.');
    return false;
  }

  let port: SerialPort | undefined;

  try {
    // Minta izin akses port dari pengguna (hanya sekali, browser mengingat)
    port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate });

    const writer = port.writable?.getWriter();
    if (!writer) throw new Error('Port writable tidak tersedia');

    const command = pin === 'pin5' ? ESC_POS_KICK_PIN5 : ESC_POS_KICK_PIN2;
    await writer.write(command);
    writer.releaseLock();

    console.log('[CashDrawer] ✅ Kick command terkirim');
    return true;
  } catch (err: any) {
    if (err?.name === 'NotFoundError') {
      // User cancelled port selection dialog — bukan error kritis
      console.info('[CashDrawer] Pemilihan port dibatalkan oleh user.');
    } else {
      console.warn('[CashDrawer] Gagal mengirim kick command:', err);
    }
    return false;
  } finally {
    try {
      if (port?.readable || port?.writable) await port?.close();
    } catch { /* ignore */ }
  }
}

// ── High-level helper (pakai config tersimpan) ──────────────────────────────

/**
 * Panggil ini setelah transaksi tunai selesai.
 * Jika cash drawer dinonaktifkan di settings, fungsi ini tidak melakukan apa-apa.
 */
export async function openCashDrawerIfEnabled(): Promise<void> {
  const config = getCashDrawerConfig();
  if (!config.enabled) return;

  await triggerCashDrawer(config.pin, config.baudRate);
}
