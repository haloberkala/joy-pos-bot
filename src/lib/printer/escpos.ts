/**
 * ESC/POS Command Generator - Rebuild Total
 * 
 * Implementasi baru yang fokus pada:
 * - Encoding yang benar untuk thermal printer
 * - State management yang jelas
 * - Alignment yang konsisten
 * - Debugging yang mudah
 */

import { DrawerPin } from './types';

// ESC/POS Control Codes
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/**
 * Normalisasi string untuk printer thermal
 * - U+00A0 (NBSP) -> ASCII Space (0x20)
 * - Whitespace Unicode lain -> ASCII Space
 * - Karakter di luar ASCII printable -> '?'
 */
function normalizePrinterText(str: string): string {
  return str
    // Replace NBSP (U+00A0) dengan space biasa
    .replace(/\u00A0/g, ' ')
    // Replace semua whitespace Unicode dengan space ASCII
    .replace(/[\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
    // Normalize whitespace
    .trim();
}

/**
 * Konversi string ke bytes menggunakan Latin-1 (ISO-8859-1)
 * Thermal printer ESC/POS umumnya menggunakan code page ini
 */
function toBytes(str: string): number[] {
  // Normalisasi dulu
  const normalized = normalizePrinterText(str);
  const result: number[] = [];
  
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    // Latin-1 hanya support 0-255
    result.push(code > 255 ? 0x3f : code); // 0x3f = '?'
  }
  return result;
}

/**
 * ESC/POS Builder
 * Setiap fungsi return Uint8Array yang siap dikirim ke printer
 */
export class EscPosBuilder {
  private buffer: number[] = [];

  /**
   * Reset printer ke state default
   */
  init(): this {
    this.buffer.push(ESC, 0x40); // ESC @
    return this;
  }

  /**
   * Tulis teks dengan newline
   */
  line(text: string): this {
    this.buffer.push(...toBytes(text), LF);
    return this;
  }

  /**
   * Tulis teks tanpa newline
   */
  write(text: string): this {
    this.buffer.push(...toBytes(text));
    return this;
  }

  /**
   * Newline saja
   */
  newline(): this {
    this.buffer.push(LF);
    return this;
  }

  /**
   * Set bold
   */
  bold(enabled: boolean): this {
    this.buffer.push(ESC, 0x45, enabled ? 1 : 0);
    return this;
  }

  /**
   * Set alignment
   * 0 = left, 1 = center, 2 = right
   */
  align(mode: 'left' | 'center' | 'right'): this {
    const value = mode === 'left' ? 0 : mode === 'center' ? 1 : 2;
    this.buffer.push(ESC, 0x61, value);
    return this;
  }

  /**
   * Baris separator
   */
  separator(char: string, width: number): this {
    const line = char.repeat(width);
    this.buffer.push(...toBytes(line), LF);
    return this;
  }

  /**
   * Dua kolom dengan alignment yang benar
   * Left: rata kiri, Right: rata kanan
   */
  row(left: string, right: string, width: number): this {
    // Hitung berapa byte sebenarnya (bukan string.length karena multi-byte)
    const leftBytes = toBytes(left).length;
    const rightBytes = toBytes(right).length;
    const totalUsed = leftBytes + rightBytes;

    if (totalUsed >= width) {
      // Overflow: cetak 2 baris
      this.buffer.push(...toBytes(left), LF);
      // Reset alignment, set right, print, reset left
      this.buffer.push(ESC, 0x61, 2); // align right
      this.buffer.push(...toBytes(right), LF);
      this.buffer.push(ESC, 0x61, 0); // align left
    } else {
      // Normal: left + spaces + right
      const spaces = width - totalUsed;
      this.buffer.push(
        ...toBytes(left),
        ...Array(spaces).fill(0x20), // space = 0x20
        ...toBytes(right),
        LF
      );
    }
    return this;
  }

  /**
   * Feed lines
   */
  feed(lines: number): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(LF);
    }
    return this;
  }

  /**
   * QR Code
   */
  qr(content: string, size: number = 5): this {
    const data = toBytes(content);
    const storeLen = data.length + 3;
    const pL = storeLen & 0xff;
    const pH = (storeLen >> 8) & 0xff;
    
    // Model 2
    this.buffer.push(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    // Module size
    this.buffer.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, Math.max(1, Math.min(size, 8)));
    // Error correction L
    this.buffer.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30);
    // Store data
    this.buffer.push(GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...data);
    // Print
    this.buffer.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
    
    return this;
  }

  /**
   * Cut paper
   */
  cut(): this {
    this.buffer.push(GS, 0x56, 0x42, 0x00); // Partial cut
    return this;
  }

  /**
   * Open cash drawer
   */
  drawer(pin: DrawerPin): this {
    const pinValue = pin === 'pin2' ? 0x00 : 0x01;
    this.buffer.push(ESC, 0x70, pinValue, 0x19, 0x96);
    return this;
  }

  /**
   * Build final Uint8Array
   */
  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Legacy compatibility - untuk kode yang masih menggunakan EscPos.build()
 */
export const EscPos = {
  build(...parts: number[][]): Uint8Array {
    const total = parts.reduce((a, p) => a + p.length, 0);
    const buf = new Uint8Array(total);
    let offset = 0;
    for (const p of parts) {
      buf.set(p, offset);
      offset += p.length;
    }
    return buf;
  },
  
  kickDrawer(pin: DrawerPin): number[] {
    const pinValue = pin === 'pin2' ? 0x00 : 0x01;
    return [ESC, 0x70, pinValue, 0x19, 0x96];
  }
};
