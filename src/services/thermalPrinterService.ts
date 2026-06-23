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
   * Tulis teks dengan word-wrap otomatis
   * @param str teks panjang
   * @param maxLength maksimal karakter per baris (default 48 untuk 80mm)
   */
  textWrap(str: string, maxLength: number = 48) {
    const words = str.split(' ');
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + word).length > maxLength) {
        if (currentLine.length > 0) {
          this.text(currentLine.trimEnd());
          currentLine = '';
        }
        // Jika satu kata lebih panjang dari maxLength
        if (word.length > maxLength) {
          let w = word;
          while (w.length > maxLength) {
            this.text(w.substring(0, maxLength));
            w = w.substring(maxLength);
          }
          currentLine = w + ' ';
        } else {
          currentLine = word + ' ';
        }
      } else {
        currentLine += word + ' ';
      }
    }
    if (currentLine.trim().length > 0) {
      this.text(currentLine.trimEnd());
    }
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

  /**
   * Cetak QR Code (2D Barcode)
   * @param str data yang akan dicetak jadi QR Code
   */
  qrCode(str: string) {
    const enc = new TextEncoder().encode(str);
    const storeLen = enc.length + 3;
    const pL = storeLen & 0xFF;
    const pH = (storeLen >> 8) & 0xFF;

    // Set model 2
    this.bytes.push(GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    // Set size (1-16) - 6 is default good size
    this.bytes.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06);
    // Set error correction level (48=L, 49=M, 50=Q, 51=H)
    this.bytes.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30); // 48 -> L
    // Store data
    this.bytes.push(GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30);
    this.bytes.push(...enc);
    // Print QR
    this.bytes.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);
    
    this.text(' '); // Newline setelah qr code
    return this;
  }

  /**
   * Print dan feed kertas sebanyak n baris
   * Berguna untuk margin bawah sebelum di-cut.
   * Printer Iware terbukti mengabaikan ESC d, jadi kita harus menggunakan trik spasi.
   */
  feed(lines: number = 5) {
    for (let i = 0; i < lines; i++) {
      this.text(' '); // Paksa cetak spasi agar kertas menggulung
    }
    return this;
  }

  /** Konversi ke Uint8Array untuk dikirim ke printer */
  build(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

// ── Transport: Web Serial ────────────────────────────────────────────────────

export function isThermalPrinterSupported(): boolean {
  return 'serial' in navigator || 'usb' in navigator;
}

let activePort: SerialPort | null = null;
let activeUsbDevice: any = null; // using any since USBDevice might not be in standard TS DOM lib depending on config

export async function connectPrinterUSB(): Promise<boolean> {
  if (!('usb' in navigator)) {
    toast.error('WebUSB tidak didukung di browser ini.');
    return false;
  }
  try {
    const device = await (navigator as any).usb.requestDevice({ filters: [] });
    await device.open();
    if (device.configuration === null) await device.selectConfiguration(1);
    const intf = device.configuration.interfaces[0];
    await device.claimInterface(intf.interfaceNumber);
    activeUsbDevice = device;
    activePort = null; // matikan serial
    return true;
  } catch (err: any) {
    console.info('[ThermalPrinter] Batal pilih USB printer', err);
    return false;
  }
}

export async function connectPrinterSerial(): Promise<boolean> {

  if (!('serial' in navigator)) {
    console.warn('[ThermalPrinter] Web Serial API tidak didukung. Gunakan Chrome/Edge.');
    return false;
  }

  try {
    const port = await (navigator as any).serial.requestPort();
    activePort = port;
    activeUsbDevice = null; // matikan usb
    return true;
  } catch (err) {
    console.info('[ThermalPrinter] Batal pilih printer serial', err);
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
let isPrinting = false;

export async function printToThermal(data: Uint8Array): Promise<boolean> {
  if (!isThermalPrinterSupported()) {
    console.warn('[ThermalPrinter] Web Serial API tidak didukung. Gunakan Chrome/Edge.');
    return false;
  }

  if (isPrinting) {
    toast.error('Printer sedang sibuk memproses antrean...');
    return true; // Return true agar tidak memicu fallback browser pop-up
  }

  isPrinting = true;
  
  try {
    // ── Jalur 1: Menggunakan WebUSB ──
    if (activeUsbDevice) {
      if (!activeUsbDevice.opened) await activeUsbDevice.open();
      const intf = activeUsbDevice.configuration.interfaces[0];
      if (!intf.claimed) await activeUsbDevice.claimInterface(intf.interfaceNumber);
      
      const endpoint = intf.alternate.endpoints.find((e: any) => e.direction === 'out');
      if (!endpoint) throw new Error('Endpoint OUT tidak ditemukan pada perangkat USB');
      
      await activeUsbDevice.transferOut(endpoint.endpointNumber, data);
      console.log('[ThermalPrinter] ✅ Data terkirim ke USB printer');
      return true;
    }

    // ── Jalur 2: Menggunakan Web Serial ──
    if (!('serial' in navigator)) throw new Error('Web Serial tidak didukung');
    
    let port: SerialPort | undefined = activePort || undefined;
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
      return false; // Batal pilih, wajar kalau fallback ke browser popup
    } 
    
    // Jika port dikunci oleh OS atau sedang proses open()
    const errMsg = err.message || '';
    if (errMsg.includes('already in progress') || errMsg.includes('Failed to open serial port')) {
      toast.error(`Akses printer ditolak OS: ${errMsg}. Pastikan printer tidak sedang dipakai aplikasi lain.`);
    } else {
      console.warn('[ThermalPrinter] Gagal mengirim ke printer:', err);
      toast.error(`Gagal ngeprint via Web Serial: ${errMsg || 'Unknown error'}`);
    }
    
    // Karena ini error hardware/koneksi, kembalikan false agar fallback ke browser pop-up berjalan
    return false;
  } finally {
    isPrinting = false;
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
    .bold(true)
    .text('STRUK PEMBAYARAN')
    .bold(false)
    .text(' ') // Jarak antara struk pembayaran dan info toko
    .bold(true)
    .text(receipt.storeName.trim())
    .bold(false);

  if (receipt.storeAddress) {
    builder.textWrap(receipt.storeAddress);
  }

  builder
    .text(' ') // 1 baris kosong sebagai pemisah (jangan pakai feed() di tengah struk)
    .align('left')
    .text(`No. Invoice : ${receipt.transactionId}`)
    .text(`Tanggal     : ${dateStr}  ${timeStr}`)
    .text(`Kasir       : ${receipt.cashierName}`);

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
  builder.bold(true).text(`TOTAL   ${fmt(receipt.total)}`).bold(false);

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
    .text(' ') // Jarak tambahan
    .textWrap('Barang dapat di-refund/tukar')
    .textWrap('Syarat & Ketentuan Berlaku')
    .text(' ')
    .qrCode(receipt.transactionId)
    .text(receipt.transactionId) // Tulis HRI secara manual di bawah QR karena QR tidak punya HRI otomatis
    .feed(7) // Angka ideal: 5 terlalu pendek, 10 terlalu panjang. 7 adalah sweet spot.
    .cut()
    .kickDrawer(receipt.drawerPin ?? 'pin2'); // Buka cash drawer SETELAH cut
  return printToThermal(builder.build());
}
