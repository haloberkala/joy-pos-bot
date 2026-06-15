/**
 * Attendance Import Service — ZKTeco LX50 SSR Report
 *
 * Alur kerja:
 * 1. Owner export SSR Report dari mesin ZKTeco LX50 ke USB flashdisk
 * 2. Upload file (.xls/.xlsx/.csv) di halaman Karyawan / Absensi Nadi
 * 3. parseZKTecoFile() → parsing baris data dari spreadsheet
 * 4. importZKTecoAttendances() → upsert ke tabel `attendances` Supabase
 *
 * Format SSR Report ZKTeco (standar):
 * Baris 0-2: header/info mesin (dilewati)
 * Baris 3+:  [Dept, ID, Nama, Tanggal, Masuk, Keluar, ...]
 *
 * Dependency: npm install xlsx
 */

import * as XLSX from 'xlsx';
import { supabaseAny } from '@/lib/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

/** Satu baris absensi yang sudah diparsing dari file ZKTeco */
export interface ZKTecoRow {
  /** ID karyawan di mesin absensi (bukan UUID Supabase) */
  employeeId: string;
  name: string;
  /** Format YYYY-MM-DD */
  date: string;
  /** Format HH:MM atau null jika tidak ada */
  clockIn: string | null;
  /** Format HH:MM atau null jika tidak ada */
  clockOut: string | null;
}

export interface ImportResult {
  /** Jumlah baris berhasil diupsert */
  inserted: number;
  /** Jumlah baris dilewati karena ID tidak ditemukan di sistem */
  skipped: number;
  /** Pesan error per baris (maks 20 ditampilkan) */
  errors: string[];
}

// ── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse file SSR Report ZKTeco (.xls/.xlsx/.csv) menjadi array ZKTecoRow.
 * Mendukung file dengan/tanpa header di baris awal.
 */
export function parseZKTecoFile(file: File): Promise<ZKTecoRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

        const result: ZKTecoRow[] = [];

        // ZKTeco SSR: baris 0-2 biasanya header/info, data mulai baris ke-3
        // Cari baris pertama yang kolomnya terlihat seperti data absensi
        let startRow = 3;
        for (let i = 0; i < Math.min(6, rows.length); i++) {
          const r = rows[i];
          // Jika kolom ke-1 berisi angka (ID karyawan) → ini baris data
          if (r[1] && /^\d+$/.test(String(r[1]).trim())) {
            startRow = i;
            break;
          }
        }

        for (let i = startRow; i < rows.length; i++) {
          const r = rows[i];
          if (!r[1] || !r[3]) continue; // skip baris kosong

          const dateRaw = r[3];
          let dateStr: string;

          if (dateRaw instanceof Date) {
            dateStr = dateRaw.toISOString().split('T')[0];
          } else {
            // Format tanggal bisa bervariasi: DD/MM/YYYY, YYYY-MM-DD, dll.
            const s = String(dateRaw).trim();
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
              dateStr = s.substring(0, 10);
            } else if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
              const [d, m, y] = s.split('/');
              dateStr = `${y}-${m}-${d}`;
            } else {
              dateStr = s;
            }
          }

          const cleanTime = (val: any): string | null => {
            if (!val) return null;
            const s = String(val).trim();
            // Ambil hanya HH:MM
            const match = s.match(/(\d{1,2}):(\d{2})/);
            if (!match) return null;
            return `${match[1].padStart(2, '0')}:${match[2]}`;
          };

          result.push({
            employeeId: String(r[1]).trim(),
            name: String(r[2] ?? '').trim(),
            date: dateStr,
            clockIn: cleanTime(r[4]),
            clockOut: cleanTime(r[5]),
          });
        }

        resolve(result);
      } catch (err) {
        reject(new Error(`Gagal membaca file: ${String(err)}`));
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file dari disk.'));
    reader.readAsArrayBuffer(file);
  });
}

// ── Importer ─────────────────────────────────────────────────────────────────

/**
 * Upsert baris absensi ZKTeco ke tabel `attendances` di Supabase.
 *
 * Menggunakan upsert dengan onConflict: 'employee_id,attendance_date'
 * → aman dijalankan berulang (idempoten), tidak membuat duplikat.
 *
 * @param rows       Hasil parseZKTecoFile()
 * @param storeId    ID toko aktif
 * @param employeeMap  Mapping { zktecoId: employeeUUID } — build dari tabel employees
 */
export async function importZKTecoAttendances(
  rows: ZKTecoRow[],
  storeId: number,
  employeeMap: Record<string, string>
): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    const employeeUuid = employeeMap[row.employeeId];

    if (!employeeUuid) {
      result.skipped++;
      if (result.errors.length < 20) {
        result.errors.push(`ID mesin "${row.employeeId}" (${row.name}) tidak ditemukan di sistem`);
      }
      continue;
    }

    // Hitung durasi kerja
    let duration_minutes: number | null = null;
    if (row.clockIn && row.clockOut) {
      try {
        const [inH, inM] = row.clockIn.split(':').map(Number);
        const [outH, outM] = row.clockOut.split(':').map(Number);
        const diff = (outH * 60 + outM) - (inH * 60 + inM);
        if (diff > 0) duration_minutes = diff;
      } catch { /* ignore invalid time */ }
    }

    const record = {
      employee_id: employeeUuid,
      store_id: storeId,
      attendance_date: row.date,
      clock_in: row.clockIn,
      clock_out: row.clockOut,
      duration_minutes,
      status: (row.clockIn ? 'hadir' : 'alpha') as 'hadir' | 'alpha',
      note: 'Import ZKTeco LX50',
      is_manual_edit: false,
    };

    const { error } = await supabaseAny
      .from('attendances')
      .upsert(record, { onConflict: 'employee_id,attendance_date' });

    if (error) {
      if (result.errors.length < 20) {
        result.errors.push(`${row.date} – ${row.name}: ${error.message}`);
      }
    } else {
      result.inserted++;
    }
  }

  return result;
}

export async function buildEmployeeMap(storeId: number): Promise<Record<string, string>> {
  const { data, error } = await supabaseAny
    .from('employees')
    .select('id, attendance_machine_id')
    .eq('store_id', storeId)
    .not('attendance_machine_id', 'is', null);

  if (error) {
    console.warn('[AttendanceImport] Gagal load employees:', error.message);
    return {};
  }

  const map: Record<string, string> = {};
  (data ?? []).forEach((emp: { id: string; attendance_machine_id: string | null }) => {
    if (emp.attendance_machine_id) map[emp.attendance_machine_id.trim()] = emp.id;
  });
  return map;
}
