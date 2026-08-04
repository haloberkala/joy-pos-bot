// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE ENGINE — NEW ARCHITECTURE
// ═══════════════════════════════════════════════════════════════════════════════
//
// Revision: 2026-08-04 (Complete Rebuild)
//
// FILOSOFI BARU:
//   1. Attendance Detection (Mandatory)
//      → Hanya scan yang masuk window resmi yang diambil
//      → Jika tidak masuk window → checkpoint = null
//
//   2. Attendance Classification (Truth Table 16 Kondisi)
//      → Status ditentukan SEBELUM recovery
//      → Status: complete | partial | incomplete
//
//   3. Attendance Recovery (Display Only, ±1 jam)
//      → Hanya melengkapi field waktu yang kosong
//      → TIDAK mengubah status
//
//   4. Attendance Persistence
//      → INSERT / UPDATE / SKIP ke database
//
// ARSITEKTUR:
//   AttendanceDetector → AttendanceClassifier → AttendanceRecovery → AttendancePersistence
//
// ═══════════════════════════════════════════════════════════════════════════════

import { supabaseAny } from '@/lib/supabase';
import {
  AttendanceEngineSettings,
  DetectionResult,
  detectAttendance,
} from './AttendanceDetector';
import {
  AttendanceStatus,
  ClassificationInput,
  classifyAttendance,
  shouldCreateRecord,
} from './AttendanceClassifier';
import {
  RecoveryInput,
  RecoveryResult,
  recoverAttendance,
  getRecoveredCheckpoints,
} from './AttendanceRecovery';
import {
  AttendanceRecord,
  PersistenceResult,
  fetchExistingRecords,
  persistAttendance,
} from './AttendancePersistence';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AttlogEntry {
  fingerprintId: string;
  date: string;
  scans: string[]; // sorted ascending, format "HH:mm"
}

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  skippedReasons: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeId(raw: string): string {
  const s = raw.replace(/['"]/g, '').trim();
  const n = Number(s);
  return isNaN(n) ? s : String(n);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// ── Step 1: Validate Attendance Setting ───────────────────────────────────────

/**
 * Ambil dan parse attendance_settings dari database.
 * Break configuration dibaca langsung dari attendance_settings.
 */
async function validateAttendanceSetting(
  storeId: number
): Promise<{ settings: AttendanceEngineSettings } | { error: string }> {
  const { data, error } = await supabaseAny
    .from('attendance_settings')
    .select('*')
    .eq('store_id', Number(storeId))
    .single();

  if (error) {
    return {
      error:
        error.code === 'PGRST116'
          ? 'Attendance setting belum dibuat. Harap konfigurasi aturan absensi terlebih dahulu.'
          : `Gagal mengambil aturan absensi: ${error.message}`,
    };
  }

  const shiftStart = (data.shift_start ?? '08:00') as string;
  const shiftEnd = (data.shift_end ?? '17:00') as string;
  const gracePeriod = (data.grace_period_minutes ?? 15) as number;
  const clockOutTolerance = (data.clock_out_tolerance_minutes ?? 30) as number;
  const breakReturnTolerance = (data.break_return_tolerance_minutes ?? 15) as number;

  const breakStart = (data.break_start ?? null) as string | null;
  const breakEnd = (data.break_end ?? null) as string | null;

  let parsedBreak: {
    startMin: number;
    endMin: number;
    returnToleranceMin: number;
  } | null = null;

  if (breakStart && breakEnd) {
    parsedBreak = {
      startMin: timeToMinutes(breakStart),
      endMin: timeToMinutes(breakEnd),
      returnToleranceMin: breakReturnTolerance,
    };
  }

  return {
    settings: {
      shiftStart,
      shiftEnd,
      gracePeriod,
      shiftStartMin: timeToMinutes(shiftStart),
      shiftEndMin: timeToMinutes(shiftEnd),
      clockOutTolerance,
      break: parsedBreak,
    },
  };
}

// ── Step 2: Resolve Employee ──────────────────────────────────────────────────

/**
 * Fetch karyawan dan bangun Map fingerprintId → UUID.
 */
async function resolveEmployee(
  storeId: number
): Promise<{ map: Map<string, string> } | { error: string }> {
  const { data, error } = await supabaseAny
    .from('employees')
    .select('id, fingerprint_id')
    .eq('store_id', Number(storeId))
    .not('fingerprint_id', 'is', null);

  if (error) {
    return { error: `Gagal mengambil data karyawan: ${error.message}` };
  }

  const map = new Map<string, string>();
  (data ?? []).forEach((emp: { id: string; fingerprint_id: string }) =>
    map.set(normalizeId(emp.fingerprint_id), emp.id)
  );

  return { map };
}

// ── Main Import Function ──────────────────────────────────────────────────────

/**
 * ATTENDANCE ENGINE - MAIN ORCHESTRATOR
 * 
 * Pipeline:
 *   1. Validate Settings
 *   2. Resolve Employees
 *   3. For each entry:
 *      a. Attendance Detection (mandatory checkpoint)
 *      b. Attendance Classification (truth table 16 kondisi)
 *      c. Attendance Recovery (±1 jam, display only)
 *   4. Persistence (batch insert/update)
 * 
 * IMPORTANT:
 *   - Status ditentukan SEBELUM recovery
 *   - Recovery TIDAK mengubah status
 *   - Jika semua checkpoint null → skip record
 */
export async function importFromAttlog(
  entries: AttlogEntry[],
  storeId: number
): Promise<ImportResult> {
  const result: ImportResult = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    skippedReasons: [],
  };

  // ── Step 1: Validate Attendance Setting ───────────────────────────────────────
  const settingResult = await validateAttendanceSetting(storeId);
  if ('error' in settingResult) {
    result.errors.push(settingResult.error);
    return result;
  }
  const { settings } = settingResult;

  // ── Step 2: Resolve Employee ──────────────────────────────────────────────────
  const empResult = await resolveEmployee(storeId);
  if ('error' in empResult) {
    result.errors.push(empResult.error);
    return result;
  }
  const { map: fingerprintMap } = empResult;

  // ── Filter valid entries ──────────────────────────────────────────────────────
  const validEntries: { entry: AttlogEntry; employeeUuid: string }[] = [];
  for (const entry of entries) {
    const uuid = fingerprintMap.get(entry.fingerprintId);
    if (!uuid) {
      result.skipped++;
      result.skippedReasons.push(
        `Fingerprint ID ${entry.fingerprintId} tidak ditemukan.`
      );
    } else {
      validEntries.push({ entry, employeeUuid: uuid });
    }
  }

  if (validEntries.length === 0) return result;

  // ── Fetch existing records ────────────────────────────────────────────────────
  const employeeUuids = [...new Set(validEntries.map((r) => r.employeeUuid))];
  const dates = [...new Set(validEntries.map((r) => r.entry.date))];

  const existingResult = await fetchExistingRecords(employeeUuids, dates);
  if ('error' in existingResult) {
    result.errors.push(existingResult.error);
    return result;
  }
  const existingMap = existingResult;

  // ── Process each entry ─────────────────────────────────────────────────────────
  const recordsToSave: AttendanceRecord[] = [];

  for (const { entry, employeeUuid } of validEntries) {
    const { fingerprintId, date, scans } = entry;

    // ═══════════════════════════════════════════════════════════════════════════
    // TAHAP 1: ATTENDANCE DETECTION (Mandatory)
    // ═══════════════════════════════════════════════════════════════════════════
    const detection: DetectionResult = detectAttendance(scans, settings);

    // ═══════════════════════════════════════════════════════════════════════════
    // TAHAP 2: ATTENDANCE CLASSIFICATION (Truth Table 16 Kondisi)
    // ═══════════════════════════════════════════════════════════════════════════
    const classificationInput: ClassificationInput = {
      clockIn: detection.clockIn,
      breakOut: detection.breakOut,
      breakIn: detection.breakIn,
      clockOut: detection.clockOut,
      hasBreakConfig: !!settings.break,
    };

    // Cek apakah harus membuat record
    if (!shouldCreateRecord(classificationInput)) {
      // Semua checkpoint null → skip
      result.skipped++;
      result.skippedReasons.push(
        `Fingerprint ID ${fingerprintId} / ${date}: Tidak ada aktivitas (semua checkpoint null).`
      );
      continue;
    }

    const status = classifyAttendance(classificationInput);
    if (!status) {
      // Should not happen karena sudah di-check oleh shouldCreateRecord
      result.skipped++;
      result.skippedReasons.push(
        `Fingerprint ID ${fingerprintId} / ${date}: Classification error.`
      );
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TAHAP 3: ATTENDANCE RECOVERY (Display Only, ±1 jam)
    // ═══════════════════════════════════════════════════════════════════════════
    const recoveryInput: RecoveryInput = {
      clockIn: detection.clockIn,
      breakOut: detection.breakOut,
      breakIn: detection.breakIn,
      clockOut: detection.clockOut,
    };

    const recovery: RecoveryResult = recoverAttendance(
      recoveryInput,
      scans,
      settings
    );

    // Log recovered checkpoints (optional, for debugging)
    const recoveredCheckpoints = getRecoveredCheckpoints(recoveryInput, recovery);
    if (recoveredCheckpoints.length > 0) {
      console.log(
        `[Recovery] ${fingerprintId} / ${date}: Recovered ${recoveredCheckpoints.join(', ')}`
      );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SANITY CHECK (Independen — tidak assume clockIn ada)
    // ═══════════════════════════════════════════════════════════════════════════
    // Clock Out tidak boleh lebih kecil dari Clock In (hanya jika keduanya ada)
    if (
      recovery.clockIn &&
      recovery.clockOut &&
      timeToMinutes(recovery.clockOut) < timeToMinutes(recovery.clockIn)
    ) {
      result.skipped++;
      result.skippedReasons.push(
        `Fingerprint ID ${fingerprintId} / ${date}: Clock Out (${recovery.clockOut}) lebih kecil dari Clock In (${recovery.clockIn}).`
      );
      continue;
    }

    // Break In tidak boleh lebih kecil dari Break Out (hanya jika keduanya ada)
    if (
      recovery.breakOut &&
      recovery.breakIn &&
      timeToMinutes(recovery.breakIn) < timeToMinutes(recovery.breakOut)
    ) {
      result.skipped++;
      result.skippedReasons.push(
        `Fingerprint ID ${fingerprintId} / ${date}: Break In (${recovery.breakIn}) lebih kecil dari Break Out (${recovery.breakOut}).`
      );
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BUILD RECORD
    // ═══════════════════════════════════════════════════════════════════════════
    const record: AttendanceRecord = {
      employee_id: employeeUuid,
      store_id: Number(storeId),
      attendance_date: date,
      clock_in: recovery.clockIn,
      break_out: recovery.breakOut,
      break_in: recovery.breakIn,
      clock_out: recovery.clockOut,
      status: status, // Status dari classification (SEBELUM recovery)
      note: '',
      is_manual_edit: false,
    };

    recordsToSave.push(record);
  }

  // ── Step 4: Persistence ────────────────────────────────────────────────────────
  if (recordsToSave.length > 0) {
    const persistResult = await persistAttendance(
      recordsToSave,
      existingMap,
      fingerprintMap
    );

    result.inserted += persistResult.inserted;
    result.updated += persistResult.updated;
    result.skipped += persistResult.skipped;
    result.errors.push(...persistResult.errors);
    result.skippedReasons.push(...persistResult.skippedReasons);
  }

  return result;
}

// ── Export Types ──────────────────────────────────────────────────────────────

export type { AttendanceEngineSettings, AttendanceStatus, AttlogEntry };
