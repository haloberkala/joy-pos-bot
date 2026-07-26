/**
 * lib/printer/escpos.ts — Pure ESC/POS byte generator.
 * Tidak ada browser API, tidak ada side effects.
 * Semua method mengembalikan number[] untuk di-concat via EscPos.build().
 */

import { Alignment, DrawerPin } from './types';

const ESC = 0x1b;
const GS  = 0x1d;
const LF  = 0x0a;

const enc = new TextEncoder();

function bytes(str: string): number[] {
  return Array.from(enc.encode(str));
}

export const EscPos = {

  // ── Printer Init ────────────────────────────────────────────────────────────

  /** ESC @ — Reset printer ke default */
  init(): number[] {
    return [ESC, 0x40];
  },

  // ── Text ────────────────────────────────────────────────────────────────────

  /** Teks + newline */
  text(str: string): number[] {
    return [...bytes(str), LF];
  },

  /** ESC E — Bold on/off */
  bold(on: boolean): number[] {
    return [ESC, 0x45, on ? 1 : 0];
  },

  /** ESC a — Alignment: 0=left 1=center 2=right */
  align(pos: Alignment): number[] {
    return [ESC, 0x61, { left: 0, center: 1, right: 2 }[pos]];
  },

  // ── Layout ──────────────────────────────────────────────────────────────────

  /**
   * Baris pemisah — diulang sesuai lebar kolom.
   * 80mm ≈ 48 chars, 58mm ≈ 32 chars.
   */
  separator(char = '-', columns = 48): number[] {
    return EscPos.text(char.repeat(columns));
  },

  /**
   * Dua kolom kiri-kanan dengan padding spasi.
   * Jika total overflow, nilai kanan dicetak di baris baru rata kanan.
   */
  twoCol(left: string, right: string, columns = 48): number[] {
    const spaces = columns - left.length - right.length;
    if (spaces > 0) {
      return EscPos.text(left + ' '.repeat(spaces) + right);
    }
    // overflow: 2 baris
    return [
      ...EscPos.text(left),
      ...EscPos.align('right'),
      ...EscPos.text(right),
      ...EscPos.align('left'),
    ];
  },

  /**
   * Word-wrap teks panjang ke lebar kolom.
   * Setiap baris diakhiri newline.
   */
  wrap(str: string, columns = 48): number[] {
    if (str.length <= columns) return EscPos.text(str);
    const result: number[] = [];
    for (let i = 0; i < str.length; i += columns) {
      result.push(...EscPos.text(str.slice(i, i + columns)));
    }
    return result;
  },

  // ── Feed & Cut ───────────────────────────────────────────────────────────────

  /** ESC d n — Feed n blank lines */
  feed(n = 3): number[] {
    return [ESC, 0x64, Math.min(n, 255)];
  },

  /** Spasi palsu untuk feed pada printer yang mengabaikan ESC d */
  feedFallback(lines = 3): number[] {
    const out: number[] = [];
    for (let i = 0; i < lines; i++) out.push(...bytes(' '), LF);
    return out;
  },

  /** GS V 42 — Partial cut (paling kompatibel) */
  cut(): number[] {
    return [GS, 0x56, 0x42, 0x00];
  },

  // ── Cash Drawer ───────────────────────────────────────────────────────────────

  /** ESC p — Kick cash drawer */
  kickDrawer(pin: DrawerPin = 'pin2'): number[] {
    return [ESC, 0x70, pin === 'pin2' ? 0x00 : 0x01, 0x19, 0x96];
  },

  // ── QR Code ──────────────────────────────────────────────────────────────────

  /**
   * GS ( k — QR Code ESC/POS sequence.
   * size 1–8 (default 5).
   */
  qr(content: string, size = 5): number[] {
    const data = Array.from(enc.encode(content));
    const storeLen = data.length + 3;
    const pL = storeLen & 0xff;
    const pH = (storeLen >> 8) & 0xff;
    return [
      // Model 2
      GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00,
      // Module size
      GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, Math.max(1, Math.min(size, 8)),
      // Error correction L
      GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30,
      // Store data
      GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30,
      ...data,
      // Print
      GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30,
    ];
  },

  // ── Build ─────────────────────────────────────────────────────────────────────

  /**
   * Gabungkan semua chunks menjadi satu Uint8Array.
   * @example
   *   EscPos.build(
   *     EscPos.init(),
   *     EscPos.align('center'),
   *     EscPos.text('Hello'),
   *     EscPos.cut(),
   *   )
   */
  build(...parts: number[][]): Uint8Array {
    const total = parts.reduce((a, p) => a + p.length, 0);
    const buf = new Uint8Array(total);
    let offset = 0;
    for (const p of parts) { buf.set(p, offset); offset += p.length; }
    return buf;
  },
};
