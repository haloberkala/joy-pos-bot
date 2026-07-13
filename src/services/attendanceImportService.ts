import * as XLSX from 'xlsx';
import { supabaseAny } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ZKTecoRow {
  machineId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  penaltyMinutes: number;
  status: 'hadir' | 'alpha';
}

export interface ParseError {
  row: number;
  reason: string;
}

export interface ParseResult {
  rows: ZKTecoRow[];
  parseErrors: ParseError[];
}

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateString(raw: unknown): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

function toTimeString(raw: unknown): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const match = s.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function normalizeId(raw: unknown): string {
  const s = String(raw).replace(/['"]/g, '').trim();
  const n = Number(s);
  return isNaN(n) ? s : String(n);
}

// ── Parser ────────────────────────────────────────────────────────────────────

export function parseExceptionStatSheet(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName =
          workbook.SheetNames.find(
            (name) =>
              name.toLowerCase().includes('exception') ||
              name.toLowerCase().includes('statistik')
          ) ||
          workbook.SheetNames[3] ||
          workbook.SheetNames[0];

        if (!sheetName || !workbook.Sheets[sheetName]) {
          return reject(new Error(`Sheet tidak ditemukan. Sheet tersedia: ${workbook.SheetNames.join(', ')}`));
        }

        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });

        const result: ZKTecoRow[] = [];
        const parseErrors: ParseError[] = [];

        for (let i = 4; i < rows.length; i++) {
          const row = rows[i] as any[];
          if (!row || row[0] === null || row[0] === undefined) continue;

          const rawIdStr = String(row[0]).replace(/['"]/g, '').trim();
          if (rawIdStr.toLowerCase() === 'id' || rawIdStr === '') continue;
          const machineId = normalizeId(row[0]);

          const dateStr = toDateString(row[3]);
          if (!dateStr) continue;

          const clockIn = toTimeString(row[4]);
          const clockOut = toTimeString(row[5]);
          const penaltyMinutes = parseInt(row[11]) || 0;

          let status: 'hadir' | 'alpha';
          if (clockIn) {
            status = 'hadir';
          } else if (penaltyMinutes >= 540) {
            status = 'alpha';
          } else {
            continue;
          }

          result.push({ machineId, date: dateStr, clockIn, clockOut, penaltyMinutes, status });
        }

        resolve({ rows: result, parseErrors });
      } catch (err) {
        reject(new Error(`Gagal membaca file Excel: ${String(err)}`));
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file dari disk.'));
    reader.readAsArrayBuffer(file);
  });
}

// ── Employee Map Builder ──────────────────────────────────────────────────────

export async function buildEmployeeMap(storeId: number): Promise<Record<string, string>> {
  const { data, error } = await supabaseAny
    .from('employees')
    .select('id, fingerprint_id')
    .eq('store_id', Number(storeId))
    .not('fingerprint_id', 'is', null);

  if (error) throw new Error(`Gagal mengambil data karyawan: ${error.message}`);

  const map: Record<string, string> = {};
  (data ?? []).forEach((emp: { id: string; fingerprint_id: string | null }) => {
    if (emp.fingerprint_id) {
      map[normalizeId(emp.fingerprint_id)] = emp.id;
    }
  });
  return map;
}

// ── Smart Importer ────────────────────────────────────────────────────────────

const BATCH_SIZE = 50;

// Helper to convert "HH:mm" to minutes since 00:00
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export async function importAttendances(
  rows: ZKTecoRow[],
  storeId: number,
  employeeMap: Record<string, string>
): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };
  const skippedIds = new Set<string>();

  // Ambil data setting absensi
  const { data: settingData, error: settingError } = await supabaseAny
    .from('attendance_settings')
    .select('*')
    .eq('store_id', Number(storeId))
    .single();

  if (settingError && settingError.code !== 'PGRST116') {
    result.errors.push(`Gagal mengambil aturan absensi: ${settingError.message}`);
    return result;
  }

  // Gunakan default fallback jika setting tidak ditemukan di DB
  const shiftStartStr = settingData?.shift_start || '08:00';
  const shiftEndStr = settingData?.shift_end || '17:00';
  const gracePeriod = settingData?.grace_period_minutes ?? 15;
  const breakStartStr = settingData?.break_start || '12:00';
  const breakEndStr = settingData?.break_end || '13:00';

  const shiftStartMin = timeToMinutes(shiftStartStr);
  const shiftEndMin = timeToMinutes(shiftEndStr);
  const breakStartMin = timeToMinutes(breakStartStr);
  const breakEndMin = timeToMinutes(breakEndStr);
  const breakDurationMin = breakEndMin - breakStartMin;

  // Pisahkan baris yang punya mapping UUID
  const mappedRows: { row: ZKTecoRow; employeeUuid: string }[] = [];
  for (const row of rows) {
    const employeeUuid = employeeMap[row.machineId];
    if (!employeeUuid) {
      result.skipped++;
      skippedIds.add(row.machineId);
    } else {
      mappedRows.push({ row, employeeUuid });
    }
  }

  if (skippedIds.size > 0) {
    result.errors.push(
      `ID mesin tidak ada di database (${result.skipped} data dilewati): [ID ${Array.from(skippedIds).join(', ID ')}]`
    );
  }

  if (mappedRows.length === 0) return result;

  // Fetch data yang sudah ada di DB untuk komparasi (smart upsert)
  const employeeUuids = [...new Set(mappedRows.map((r) => r.employeeUuid))];
  const dates = [...new Set(mappedRows.map((r) => r.row.date))];

  const { data: existing, error: fetchError } = await supabaseAny
    .from('attendances')
    .select('id, employee_id, attendance_date, clock_in, clock_out, penalty_minutes, status, is_manual_edit')
    .in('employee_id', employeeUuids)
    .in('attendance_date', dates);

  if (fetchError) {
    result.errors.push(`Gagal fetch data existing: ${fetchError.message}`);
    return result;
  }

  // Buat lookup map: "employeeId|date" → existing row
  type ExistingRow = {
    id: number;
    employee_id: string;
    attendance_date: string;
    clock_in: string | null;
    clock_out: string | null;
    penalty_minutes: number;
    status: string;
    is_manual_edit: boolean;
  };
  const existingMap = new Map<string, ExistingRow>();
  (existing ?? []).forEach((row: ExistingRow) => {
    existingMap.set(`${row.employee_id}|${row.attendance_date}`, row);
  });

  // Klasifikasi: INSERT vs UPDATE vs SKIP
  const toInsert: object[] = [];
  const toUpdate: { id: number; payload: object }[] = [];

  for (const { row, employeeUuid } of mappedRows) {
    const key = `${employeeUuid}|${row.date}`;
    const existing = existingMap.get(key);

    let duration_minutes: number | null = null;
    let penaltyMinutes = row.penaltyMinutes;
    let calculatedStatus: 'hadir' | 'alpha' = 'alpha';

    if (row.clockIn) {
      calculatedStatus = 'hadir';
      
      const clockInMin = timeToMinutes(row.clockIn);
      const penalty = Math.max(0, (clockInMin - shiftStartMin) - gracePeriod);
      penaltyMinutes = penalty; // Override ZKTeco penalty calculation

      if (row.clockOut) {
        const clockOutMin = timeToMinutes(row.clockOut);
        
        // Kalkulasi Effective Time (Virtual) untuk menghindari lembur
        const effectiveStartMin = Math.max(clockInMin, shiftStartMin);
        const effectiveEndMin = Math.min(clockOutMin, shiftEndMin);
        
        let totalDur = effectiveEndMin - effectiveStartMin;

        // Kurangi durasi istirahat jika jam kerja efektif memotong waktu istirahat
        if (effectiveStartMin <= breakStartMin && effectiveEndMin >= breakEndMin) {
          totalDur -= breakDurationMin;
        } else if (effectiveStartMin > breakStartMin && effectiveStartMin < breakEndMin && effectiveEndMin >= breakEndMin) {
          totalDur -= (breakEndMin - effectiveStartMin);
        } else if (effectiveStartMin <= breakStartMin && effectiveEndMin > breakStartMin && effectiveEndMin < breakEndMin) {
          totalDur -= (effectiveEndMin - breakStartMin);
        }

        if (totalDur > 0) {
          duration_minutes = totalDur;
        } else {
          duration_minutes = 0;
        }
      }
    } else {
      calculatedStatus = 'alpha';
    }

    const payload = {
      employee_id: employeeUuid,
      store_id: Number(storeId),
      attendance_date: row.date,
      clock_in: row.clockIn,
      clock_out: row.clockOut,
      duration_minutes,
      penalty_minutes: penaltyMinutes,
      status: calculatedStatus,
      note: '',
      is_manual_edit: false,
    };

    if (!existing) {
      // (d) Belum ada di DB → INSERT
      toInsert.push(payload);
    } else if (existing.is_manual_edit) {
      // (a) Sudah diedit manual → SKIP
      result.skipped++;
    } else if (
      existing.clock_in === row.clockIn &&
      existing.clock_out === row.clockOut &&
      existing.penalty_minutes === penaltyMinutes &&
      existing.status === calculatedStatus
    ) {
      // (b) Data identik → SKIP
      result.skipped++;
    } else {
      // (c) Ada perbedaan → UPDATE
      toUpdate.push({ id: existing.id, payload });
    }
  }

  // Batch UPSERT (onConflict sebagai jaring pengaman duplikat)
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAny
      .from('attendances')
      .upsert(batch, { onConflict: 'employee_id, attendance_date' });
    if (error) {
      result.errors.push(`Upsert batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
    } else {
      result.inserted += batch.length;
    }
  }

  // Batch UPDATE (satu per satu karena update by id)
  for (const { id, payload } of toUpdate) {
    const { error } = await supabaseAny.from('attendances').update(payload).eq('id', id);
    if (error) {
      result.errors.push(`Update ID ${id}: ${error.message}`);
    } else {
      result.updated++;
    }
  }

  return result;
}

// ── One-shot helper ───────────────────────────────────────────────────────────

export async function importZKTecoFile(
  file: File,
  storeId: number
): Promise<{ parseResult: ParseResult; importResult: ImportResult }> {
  const parseResult = await parseExceptionStatSheet(file);

  if (parseResult.rows.length === 0) {
    return {
      parseResult,
      importResult: {
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: ['Tidak ada data absensi valid yang ditemukan di file ini.'],
      },
    };
  }

  const employeeMap = await buildEmployeeMap(storeId);
  const importResult = await importAttendances(parseResult.rows, storeId, employeeMap);

  return { parseResult, importResult };
}