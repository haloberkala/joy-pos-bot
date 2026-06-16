/**
 * Thermal Printer Service — ESC/POS via Web Serial API
 *
 * Melengkapi cashDrawerService.ts dengan kemampuan cetak struk langsung
 * dari browser ke printer thermal 80mm (BARCODIA Iware XS-80BT).
 *
 * Alur:
 * 1. Build perintah ESC/POS dengan EscPosBuilder
 * 2. Kirim ke printer via Web Serial API
 * 3. Printer cetak struk lalu kick cash drawer (via kabel RJ-11)
 *
 * Syarat:
 * - Browser: Chrome / Edge (Web Serial API)
 * - Printer terhubung via USB Serial
 */
import { toast } from 'sonner';

const ESC = 0x1b;
const GS  = 0x1d;

// ── ESC/POS Command Builder ─────────────────────────────────────────────────

/**
 * Builder sederhana untuk menyusun byte-stream ESC/POS.
 * Panggil metode secara berantai (fluent), akhiri dengan .build().
 *
 * @example
 * const data = new EscPosBuilder()
 *   .init()
 *   .align('center').bold(true).text('Toko Maju').bold(false)
 *   .separator()
 *   .text('Item A   Rp10.000')
 *   .cut()
 *   .kickDrawer()
 *   .build();
 */
export class EscPosBuilder {
  private bytes: number[] = [];

  /** Reset printer ke kondisi awal */
  init() {
    this.bytes.push(ESC, 0x40);
    return this;
  }

  /** Full cut kertas */
  cut() {
    this.bytes.push(GS, 0x56, 0x41, 0x00);
    return this;
  }

  /**
   * Kirim sinyal kick ke cash drawer via kabel RJ-11
   * @param pin 'pin2' (default) atau 'pin5' — tergantung wiring cash drawer
   */
  kickDrawer(pin: 'pin2' | 'pin5' = 'pin2') {
    this.bytes.push(ESC, 0x70, pin === 'pin2' ? 0x00 : 0x01, 0x19, 0x96);
    return this;
  }

  /** Aktifkan/nonaktifkan bold */
  bold(on: boolean) {
    this.bytes.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  /**
   * Set alignment teks
   * @param pos 'left' | 'center' | 'right'
   */
  align(pos: 'left' | 'center' | 'right') {
    const map: Record<string, number> = { left: 0, center: 1, right: 2 };
    this.bytes.push(ESC, 0x61, map[pos]);
    return this;
  }

  /** Tulis teks + newline */
  text(str: string) {
    this.bytes.push(...new TextEncoder().encode(str + '\n'));
    return this;
  }

  /**
   * Garis pemisah horizontal
   * @param char karakter pengisi (default '-')
   * @param width lebar dalam karakter (default 32 untuk 80mm)
   */
  separator(char = '-', width = 32) {
    return this.text(char.repeat(width));
  }

  /** Konversi ke Uint8Array untuk dikirim ke printer */
  build(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

// ── Transport: Web Serial ────────────────────────────────────────────────────

export function isThermalPrinterSupported(): boolean {
  return 'serial' in navigator;
}

let activePort: SerialPort | null = null;

export async function connectPrinter(): Promise<boolean> {

  if (!isThermalPrinterSupported()) {
    console.warn('[ThermalPrinter] Web Serial API tidak didukung. Gunakan Chrome/Edge.');
    return false;
  }

  try {
    const port = await (navigator as any).serial.requestPort();
    activePort = port;
    return true;
  } catch (err) {
    console.info('[ThermalPrinter] Batal pilih printer', err);
    return false;
  }
}

/**
 * Kirim raw bytes ke printer thermal via Web Serial API.
 * Chrome akan menampilkan dialog pemilihan port pada pemanggilan pertama,
 * lalu mengingat pilihan tersebut untuk sesi berikutnya.
 *
 * @returns true jika berhasil, false jika gagal atau user membatalkan
 */
export async function printToThermal(data: Uint8Array): Promise<boolean> {
  if (!isThermalPrinterSupported()) {
    console.warn('[ThermalPrinter] Web Serial API tidak didukung. Gunakan Chrome/Edge.');
    return false;
  }

  let port: SerialPort | undefined = activePort || undefined;
  try {
    if (!port) {
      const ports = await (navigator as any).serial.getPorts();
      if (ports && ports.length > 0) {
        port = ports[0];
        activePort = port; // Simpan port yang terpilih
      } else {
        port = await (navigator as any).serial.requestPort();
        activePort = port;
      }
    }
    
    // Periksa apakah port sudah terbuka
    if (!port!.readable && !port!.writable) {
      await port!.open({ baudRate: 9600 });
    }

    const writer = port!.writable?.getWriter();
    if (!writer) throw new Error('Port writable tidak tersedia');

    await writer.write(data);
    writer.releaseLock();

    console.log('[ThermalPrinter] ✅ Data terkirim ke printer');
    return true;
  } catch (err: any) {
    if (err?.name === 'NotFoundError') {
      console.info('[ThermalPrinter] Pemilihan port dibatalkan.');
    } else {
      console.warn('[ThermalPrinter] Gagal mengirim ke printer:', err);
      toast.error(`Gagal ngeprint via Web Serial: ${err.message || 'Unknown error'}`);
    }
    return false;
  }
}

// ── High-level helpers ───────────────────────────────────────────────────────

export interface ReceiptData {
  storeName: string;
  storeAddress?: string;
  items: {
    name: string;
    qty: number;
    price: number;
  }[];
  serviceItems?: {
    description: string;
    price: number;
  }[];
  total: number;
  amountReceived?: number;
  change?: number;
  paymentMethod?: string;
  cashierName: string;
  transactionId: string;
  customerName?: string;
  note?: string;
  drawerPin?: 'pin2' | 'pin5';
}

/**
 * Cetak struk POS 80mm dan buka cash drawer setelahnya.
 * Urutan ESC/POS: Init → Header → Items → Total → Footer → Cut → KickDrawer
 */
export async function printReceiptAndOpenDrawer(receipt: ReceiptData): Promise<boolean> {
  const fmt = (n: number) => `Rp${n.toLocaleString('id-ID')}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit',
  });

  const builder = new EscPosBuilder()
    .init()
    .align('center')
    .bold(true).text(receipt.storeName).bold(false);

  if (receipt.storeAddress) {
    builder.text(receipt.storeAddress);
  }

  builder
    .separator('=')
    .align('left')
    .text(`No  : ${receipt.transactionId}`)
    .text(`Tgl : ${dateStr}  ${timeStr}`)
    .text(`Kasir: ${receipt.cashierName}`);

  if (receipt.customerName) {
    builder.text(`Pel : ${receipt.customerName}`);
  }

  builder.separator();

  receipt.items.forEach(item => {
    const subtotal = item.qty * item.price;
    builder.text(item.name.substring(0, 28)); // truncate panjang nama
    builder.text(`  ${item.qty}x ${fmt(item.price).padStart(12)}  ${fmt(subtotal).padStart(12)}`);
  });

  receipt.serviceItems?.forEach(svc => {
    builder.text(`🔧 ${svc.description.substring(0, 24)}`);
    builder.text(`  1x ${fmt(svc.price).padStart(12)}  ${fmt(svc.price).padStart(12)}`);
  });

  builder.separator();
  builder.bold(true).align('right').text(`TOTAL   ${fmt(receipt.total)}`).bold(false).align('left');

  if (receipt.amountReceived !== undefined && receipt.amountReceived > 0) {
    builder.text(`Bayar   ${fmt(receipt.amountReceived)}`);
    builder.text(`Kembal  ${fmt(receipt.change ?? 0)}`);
  }

  if (receipt.paymentMethod) {
    builder.text(`Metode  ${receipt.paymentMethod.toUpperCase()}`);
  }

  if (receipt.note) {
    builder.separator().text(receipt.note);
  }

  builder
    .separator('=')
    .align('center')
    .text('Terima kasih sudah berbelanja!')
    .text('') // baris kosong sebelum cut
    .cut()
    .kickDrawer(receipt.drawerPin ?? 'pin2'); // Buka cash drawer SETELAH cut

  return printToThermal(builder.build());
}
