import { importFromAttlog } from './attendanceService';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Satu kelompok scan mentah dari attlog untuk satu orang di satu hari.
 * Parser tidak menentukan clock_in / clock_out — itu tugas attendanceService.
 */
export interface AttlogEntry {
  fingerprintId: string;
  date: string;
  /** Daftar waktu scan, sudah diurutkan ascending dan deduplikasi. Format: "HH:mm" */
  scans: string[];
}

export interface ParseError {
  row: number;
  reason: string;
}

export interface ParseResult {
  entries: AttlogEntry[];
  parseErrors: ParseError[];
}

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  /** Kondisi yang benar-benar gagal (DB error, setting tidak ada, dsb). */
  errors: string[];
  /** Alasan data dilewati — bukan error, hanya informasi (manual edit, identik, dsb). */
  skippedReasons: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Selisih scan (menit) yang masih dianggap duplikat. */
const DEDUP_WINDOW_MINUTES = 2;

// ── Helpers (parsing only) ────────────────────────────────────────────────────

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function normalizeId(raw: string): string {
  const s = raw.replace(/['"]/g, '').trim();
  const n = Number(s);
  return isNaN(n) ? s : String(n);
}

/** Normalisasi "HH:mm:ss" atau "HH:mm" → "HH:mm". */
function normalizeTime(raw: string): string | null {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

/** Buang scan yang selisihnya ≤ DEDUP_WINDOW_MINUTES dari scan sebelumnya. Input harus sudah sorted. */
function deduplicate(sortedTimes: string[]): string[] {
  if (sortedTimes.length === 0) return [];
  const result = [sortedTimes[0]];
  for (let i = 1; i < sortedTimes.length; i++) {
    const prev = timeToMinutes(result[result.length - 1]);
    const curr = timeToMinutes(sortedTimes[i]);
    if (curr - prev > DEDUP_WINDOW_MINUTES) result.push(sortedTimes[i]);
  }
  return result;
}

// ── Parser Murni ──────────────────────────────────────────────────────────────

/**
 * Membaca file attlog.dat dan menghasilkan raw scan groups.
 *
 * Tanggung jawab HANYA:
 *   1. Baca teks plain
 *   2. Validasi format (fingerprint_id, date, time)
 *   3. Group by (fingerprint_id, date)
 *   4. Sort ascending
 *   5. Deduplicate (window 2 menit)
 *
 * Tidak menentukan clock_in, clock_out, status, penalty, atau durasi.
 */
export function parseAttlog(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    if (file.size === 0) {
      return reject(new Error('File kosong. Tidak ada data yang dapat diproses.'));
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target!.result as string;
        const lines = text.split(/\r?\n/);

        // Map: "fingerprintId|date" → string[] (raw scan times)
        const scanMap = new Map<string, string[]>();
        const parseErrors: ParseError[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const parts = line.split(/\s+/);
          if (parts.length < 3) {
            parseErrors.push({ row: i + 1, reason: `Baris ${i + 1}: kurang dari 3 kolom.` });
            continue;
          }

          const [rawId, rawDate, rawTime] = parts;

          if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
            parseErrors.push({ row: i + 1, reason: `Baris ${i + 1}: format tanggal tidak valid ("${rawDate}").` });
            continue;
          }

          const timeStr = normalizeTime(rawTime);
          if (!timeStr) {
            parseErrors.push({ row: i + 1, reason: `Baris ${i + 1}: format waktu tidak valid ("${rawTime}").` });
            continue;
          }

          const fingerprintId = normalizeId(rawId);
          const key = `${fingerprintId}|${rawDate}`;
          if (!scanMap.has(key)) scanMap.set(key, []);
          scanMap.get(key)!.push(timeStr);
        }

        const entries: AttlogEntry[] = [];
        for (const [key, times] of scanMap) {
          const [fingerprintId, date] = key.split('|');
          times.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
          entries.push({ fingerprintId, date, scans: deduplicate(times) });
        }

        resolve({ entries, parseErrors });
      } catch (err) {
        reject(new Error(`Gagal membaca file attlog: ${String(err)}`));
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file dari disk.'));
    reader.readAsText(file, 'utf-8');
  });
}

// ── Thin Orchestrator ─────────────────────────────────────────────────────────

/**
 * Orkestrasi: parse attlog → serahkan ke attendanceService untuk business rules.
 * File ini tidak mengandung business logic apapun.
 */
export async function importZKTecoFile(
  file: File,
  storeId: number
): Promise<{ parseResult: ParseResult; importResult: ImportResult }> {
  const parseResult = await parseAttlog(file);

  if (parseResult.entries.length === 0) {
    return {
      parseResult,
      importResult: { inserted: 0, updated: 0, skipped: 0, errors: ['Tidak ada data absensi valid yang ditemukan di file ini.'], skippedReasons: [] },
    };
  }

  const importResult = await importFromAttlog(parseResult.entries, storeId);
  return { parseResult, importResult };
}