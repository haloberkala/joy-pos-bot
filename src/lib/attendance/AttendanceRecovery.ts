// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE RECOVERY
// ═══════════════════════════════════════════════════════════════════════════════
//
// Tanggung jawab:
//   Recovery data attendance yang missing (display only).
//   TIDAK mengubah status — hanya melengkapi field waktu.
//
// Input:  Detection result + raw scans
// Output: Recovery result (field waktu yang terisi)
//
// RECOVERY RULE:
//   - Untuk setiap checkpoint yang NULL, cari scan dalam rentang ±1 jam
//   - Ambil scan terdekat dengan waktu ideal checkpoint
//   - Satu scan hanya boleh dipakai oleh satu checkpoint
//   - Recovery TIDAK mengubah status attendance
//
// ═══════════════════════════════════════════════════════════════════════════════

import { AttendanceEngineSettings } from './AttendanceDetector';

export interface RecoveryInput {
  clockIn: string | null;
  breakOut: string | null;
  breakIn: string | null;
  clockOut: string | null;
}

export interface RecoveryResult {
  clockIn: string | null;
  breakOut: string | null;
  breakIn: string | null;
  clockOut: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60) % 24; // Handle overflow
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Mencari scan terdekat dengan target time dalam rentang ±1 jam.
 * Mengecualikan scan yang sudah digunakan.
 */
function findNearestScan(
  targetMin: number,
  scans: string[],
  usedScans: Set<string>
): string | null {
  const RECOVERY_WINDOW = 60; // ±1 jam
  const candidates: Array<{ scan: string; distance: number }> = [];

  for (const scan of scans) {
    if (usedScans.has(scan)) continue; // Skip scan yang sudah dipakai

    const scanMin = timeToMinutes(scan);
    const distance = Math.abs(scanMin - targetMin);

    if (distance <= RECOVERY_WINDOW) {
      candidates.push({ scan, distance });
    }
  }

  if (candidates.length === 0) return null;

  // Sort by distance, ambil yang terdekat
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0].scan;
}

// ── Recovery Functions ────────────────────────────────────────────────────────

/**
 * ATTENDANCE RECOVERY
 * 
 * Recovery missing checkpoint dalam rentang ±1 jam.
 * Hanya mengisi field waktu — TIDAK mengubah status.
 * 
 * RULES:
 * 1. Hanya recovery checkpoint yang NULL
 * 2. Cari scan terdekat dengan waktu ideal checkpoint (±1 jam)
 * 3. Satu scan hanya boleh dipakai oleh satu checkpoint
 * 4. Prioritas: Clock In → Break Out → Break In → Clock Out
 * 5. Status attendance TIDAK berubah
 * 6. Semua checkpoint recovery INDEPENDEN (tidak bergantung satu sama lain)
 */
export function recoverAttendance(
  input: RecoveryInput,
  scans: string[],
  settings: AttendanceEngineSettings
): RecoveryResult {
  const result: RecoveryResult = {
    clockIn: input.clockIn,
    breakOut: input.breakOut,
    breakIn: input.breakIn,
    clockOut: input.clockOut,
  };

  // Track scan yang sudah digunakan
  const usedScans = new Set<string>();

  // Tandai scan yang sudah digunakan dari detection result
  if (input.clockIn) usedScans.add(input.clockIn);
  if (input.breakOut) usedScans.add(input.breakOut);
  if (input.breakIn) usedScans.add(input.breakIn);
  if (input.clockOut) usedScans.add(input.clockOut);

  // ── Recovery Clock In ─────────────────────────────────────────────────────────
  if (!result.clockIn) {
    // Target: shift_start + (grace_period / 2)
    const targetMin = settings.shiftStartMin + Math.floor(settings.gracePeriod / 2);
    const recovered = findNearestScan(targetMin, scans, usedScans);
    if (recovered) {
      result.clockIn = recovered;
      usedScans.add(recovered);
    }
  }

  // ── Recovery Break Out ────────────────────────────────────────────────────────
  // PENTING: Tidak bergantung pada clockIn atau checkpoint lain!
  if (!result.breakOut && settings.break) {
    // Target: (break.startMin + break.endMin) / 2
    const targetMin = Math.floor((settings.break.startMin + settings.break.endMin) / 2);
    const recovered = findNearestScan(targetMin, scans, usedScans);
    if (recovered) {
      result.breakOut = recovered;
      usedScans.add(recovered);
    }
  }

  // ── Recovery Break In ─────────────────────────────────────────────────────────
  // PENTING: Tidak bergantung pada breakOut atau checkpoint lain!
  if (!result.breakIn && settings.break) {
    // Target: break.endMin + (returnToleranceMin / 2)
    const targetMin = settings.break.endMin + Math.floor(settings.break.returnToleranceMin / 2);
    const recovered = findNearestScan(targetMin, scans, usedScans);
    if (recovered) {
      result.breakIn = recovered;
      usedScans.add(recovered);
    }
  }

  // ── Recovery Clock Out ────────────────────────────────────────────────────────
  // PENTING: Tidak bergantung pada clockIn atau checkpoint lain!
  if (!result.clockOut) {
    // Target: shift_end + (clockOutTolerance / 2)
    const targetMin = settings.shiftEndMin + Math.floor(settings.clockOutTolerance / 2);
    const recovered = findNearestScan(targetMin, scans, usedScans);
    if (recovered) {
      result.clockOut = recovered;
      usedScans.add(recovered);
    }
  }

  return result;
}

/**
 * Helper: Apakah recovery mengubah data?
 * Berguna untuk logging/debugging.
 */
export function hasRecoveredData(
  original: RecoveryInput,
  recovered: RecoveryResult
): boolean {
  return (
    (!original.clockIn && !!recovered.clockIn) ||
    (!original.breakOut && !!recovered.breakOut) ||
    (!original.breakIn && !!recovered.breakIn) ||
    (!original.clockOut && !!recovered.clockOut)
  );
}

/**
 * Helper: Daftar checkpoint yang berhasil di-recover.
 * Berguna untuk logging.
 */
export function getRecoveredCheckpoints(
  original: RecoveryInput,
  recovered: RecoveryResult
): string[] {
  const checkpoints: string[] = [];

  if (!original.clockIn && recovered.clockIn) checkpoints.push('clockIn');
  if (!original.breakOut && recovered.breakOut) checkpoints.push('breakOut');
  if (!original.breakIn && recovered.breakIn) checkpoints.push('breakIn');
  if (!original.clockOut && recovered.clockOut) checkpoints.push('clockOut');

  return checkpoints;
}
