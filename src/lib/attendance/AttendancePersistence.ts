// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════════
//
// Tanggung jawab:
//   Menyimpan hasil akhir attendance ke database.
//   Menangani INSERT / UPDATE / SKIP logic.
//
// Input:  Final attendance data
// Output: Persistence result (inserted, updated, skipped)
//
// ═══════════════════════════════════════════════════════════════════════════════

import { supabaseAny } from '@/lib/supabase';
import { AttendanceStatus } from './AttendanceClassifier';

const BATCH_SIZE = 50;

export interface AttendanceRecord {
  employee_id: string;
  store_id: number;
  attendance_date: string;
  clock_in: string | null;
  break_out: string | null;
  break_in: string | null;
  clock_out: string | null;
  status: AttendanceStatus;
  note: string;
  is_manual_edit: boolean;
}

export interface ExistingRecord {
  id: number;
  employee_id: string;
  attendance_date: string;
  clock_in: string | null;
  clock_out: string | null;
  break_out: string | null;
  break_in: string | null;
  status: string;
  is_manual_edit: boolean;
}

export interface PersistenceResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  skippedReasons: string[];
}

export type PersistAction = 'insert' | 'update' | 'skip_identical' | 'skip_manual_edit';

// ── Comparison Logic ──────────────────────────────────────────────────────────

/**
 * Bandingkan existing record dengan new record.
 * Return action yang harus dilakukan.
 */
export function compareRecords(
  existing: ExistingRecord | undefined,
  newRecord: AttendanceRecord,
  fingerprintId: string,
  date: string
): { action: PersistAction; skipReason?: string } {
  // Jika tidak ada existing record → INSERT
  if (!existing) {
    return { action: 'insert' };
  }

  // Jika existing record adalah manual edit → SKIP
  if (existing.is_manual_edit) {
    return {
      action: 'skip_manual_edit',
      skipReason: `Fingerprint ID ${fingerprintId} / ${date}: Data manual edit, tidak ditimpa.`,
    };
  }

  // Bandingkan field-field penting
  const identical =
    existing.clock_in === newRecord.clock_in &&
    existing.break_out === newRecord.break_out &&
    existing.break_in === newRecord.break_in &&
    existing.clock_out === newRecord.clock_out &&
    existing.status === newRecord.status;

  // Jika identik → SKIP
  if (identical) {
    return { action: 'skip_identical' };
  }

  // Jika berbeda → UPDATE
  return { action: 'update' };
}

// ── Persistence Functions ─────────────────────────────────────────────────────

/**
 * Batch INSERT records.
 */
export async function batchInsert(
  records: AttendanceRecord[],
  result: PersistenceResult
): Promise<void> {
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const { error } = await supabaseAny
      .from('attendances')
      .upsert(batch, { onConflict: 'employee_id,attendance_date' });

    if (error) {
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      result.errors.push(`Batch insert ${batchNum}: ${error.message}`);
    } else {
      result.inserted += batch.length;
    }
  }
}

/**
 * Individual UPDATE records.
 */
export async function batchUpdate(
  updates: Array<{ id: number; record: AttendanceRecord }>,
  result: PersistenceResult
): Promise<void> {
  for (const { id, record } of updates) {
    const { error } = await supabaseAny
      .from('attendances')
      .update({
        clock_in: record.clock_in,
        break_out: record.break_out,
        break_in: record.break_in,
        clock_out: record.clock_out,
        status: record.status,
        note: record.note,
        is_manual_edit: false,
      })
      .eq('id', id);

    if (error) {
      result.errors.push(`Update ID ${id}: ${error.message}`);
    } else {
      result.updated++;
    }
  }
}

/**
 * Fetch existing records untuk comparison.
 */
export async function fetchExistingRecords(
  employeeIds: string[],
  dates: string[]
): Promise<Map<string, ExistingRecord> | { error: string }> {
  const { data, error } = await supabaseAny
    .from('attendances')
    .select('id, employee_id, attendance_date, clock_in, clock_out, break_out, break_in, status, is_manual_edit')
    .in('employee_id', employeeIds)
    .in('attendance_date', dates);

  if (error) {
    return { error: `Gagal fetch existing records: ${error.message}` };
  }

  const map = new Map<string, ExistingRecord>();
  (data ?? []).forEach((row: ExistingRecord) => {
    const key = `${row.employee_id}|${row.attendance_date}`;
    map.set(key, row);
  });

  return map;
}

/**
 * MAIN PERSISTENCE FUNCTION
 * 
 * Persist attendance records ke database.
 * Menangani batch insert, individual update, dan skip logic.
 */
export async function persistAttendance(
  records: AttendanceRecord[],
  existingMap: Map<string, ExistingRecord>,
  fingerprintMap: Map<string, string> // fingerprintId → employeeId
): Promise<PersistenceResult> {
  const result: PersistenceResult = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    skippedReasons: [],
  };

  const toInsert: AttendanceRecord[] = [];
  const toUpdate: Array<{ id: number; record: AttendanceRecord }> = [];

  // Proses setiap record
  for (const record of records) {
    const key = `${record.employee_id}|${record.attendance_date}`;
    const existing = existingMap.get(key);

    // Cari fingerprint_id untuk logging
    let fingerprintId = 'unknown';
    for (const [fpId, empId] of fingerprintMap) {
      if (empId === record.employee_id) {
        fingerprintId = fpId;
        break;
      }
    }

    const { action, skipReason } = compareRecords(
      existing,
      record,
      fingerprintId,
      record.attendance_date
    );

    switch (action) {
      case 'insert':
        toInsert.push(record);
        break;

      case 'update':
        toUpdate.push({ id: existing!.id, record });
        break;

      case 'skip_identical':
      case 'skip_manual_edit':
        result.skipped++;
        if (skipReason) result.skippedReasons.push(skipReason);
        break;
    }
  }

  // Execute batch insert
  if (toInsert.length > 0) {
    await batchInsert(toInsert, result);
  }

  // Execute individual update
  if (toUpdate.length > 0) {
    await batchUpdate(toUpdate, result);
  }

  return result;
}
