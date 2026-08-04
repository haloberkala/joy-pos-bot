// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE DETECTOR
// ═══════════════════════════════════════════════════════════════════════════════
//
// Tanggung jawab:
//   Mendeteksi checkpoint attendance berdasarkan window resmi.
//   HANYA mengambil scan yang memenuhi window absensi.
//   Jika scan tidak masuk window → checkpoint = null
//
// Input:  Raw scans (string[])
// Output: Checkpoint times (clockIn, breakOut, breakIn, clockOut) atau null
//
// ═══════════════════════════════════════════════════════════════════════════════

export interface AttendanceEngineSettings {
  shiftStart: string; // "HH:mm"
  shiftEnd: string;
  gracePeriod: number; // menit
  shiftStartMin: number; // menit sejak 00:00
  shiftEndMin: number;
  clockOutTolerance: number; // menit
  break: {
    startMin: number; // Break Out Window start
    endMin: number; // Break Out Window end
    returnToleranceMin: number; // Break In Window tolerance
  } | null;
}

export interface DetectionResult {
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

/**
 * Apakah waktu `t` berada dalam Clock In Window?
 * Window: [shift_start, shift_start + grace_period]
 */
function isInClockInWindow(t: string, s: AttendanceEngineSettings): boolean {
  const m = timeToMinutes(t);
  return m >= s.shiftStartMin && m <= s.shiftStartMin + s.gracePeriod;
}

/**
 * Apakah waktu `t` berada dalam Clock Out Window?
 * Window: [shift_end, shift_end + clockOutTolerance]
 */
function isInClockOutWindow(t: string, s: AttendanceEngineSettings): boolean {
  const m = timeToMinutes(t);
  return m >= s.shiftEndMin && m <= s.shiftEndMin + s.clockOutTolerance;
}

// ── Detection Functions ───────────────────────────────────────────────────────

/**
 * CLOCK IN DETECTION
 * Rule: Scan PERTAMA dalam Clock In Window
 * Window: [shift_start, shift_start + grace_period]
 */
export function selectClockIn(
  scans: string[],
  settings: AttendanceEngineSettings
): string | null {
  const inWindow = scans.filter((t) => isInClockInWindow(t, settings));
  return inWindow.length > 0 ? inWindow[0] : null;
}

/**
 * BREAK OUT DETECTION
 * Rule: Scan PERTAMA dalam Break Out Window
 * Window: [break.startMin, break.endMin]
 * 
 * PENTING: Tidak bergantung pada clockIn!
 */
export function selectBreakOut(
  scans: string[],
  settings: AttendanceEngineSettings
): string | null {
  if (!settings.break) return null;

  const inWindow = scans.filter((t) => {
    const m = timeToMinutes(t);
    return m >= settings.break!.startMin && m <= settings.break!.endMin;
  });

  return inWindow.length > 0 ? inWindow[0] : null;
}

/**
 * BREAK IN DETECTION
 * Rule: Scan PERTAMA dalam Break In Window
 * Window: [break.endMin, break.endMin + returnToleranceMin]
 * 
 * PENTING: Tidak bergantung pada breakOut!
 */
export function selectBreakIn(
  scans: string[],
  settings: AttendanceEngineSettings
): string | null {
  if (!settings.break) return null;

  const breakInWindowEnd = settings.break.endMin + settings.break.returnToleranceMin;

  const inWindow = scans.filter((t) => {
    const m = timeToMinutes(t);
    return m >= settings.break!.endMin && m <= breakInWindowEnd;
  });

  return inWindow.length > 0 ? inWindow[0] : null;
}

/**
 * CLOCK OUT DETECTION
 * Rule: Scan TERAKHIR dalam Clock Out Window
 * Window: [shift_end, shift_end + clockOutTolerance]
 * 
 * PENTING: Tidak bergantung pada clockIn!
 */
export function selectClockOut(
  scans: string[],
  settings: AttendanceEngineSettings
): string | null {
  // Kandidat: scan dalam window clock-out
  const candidates = scans.filter((t) => isInClockOutWindow(t, settings));

  if (candidates.length === 0) return null;

  // Ambil scan terakhir
  return candidates[candidates.length - 1];
}

// ── Main Detector ─────────────────────────────────────────────────────────────

/**
 * ATTENDANCE DETECTOR
 * 
 * Deteksi seluruh checkpoint berdasarkan window resmi.
 * Jika scan tidak masuk window → checkpoint = null
 * 
 * PENTING: Semua checkpoint independen — tidak bergantung satu sama lain!
 */
export function detectAttendance(
  scans: string[],
  settings: AttendanceEngineSettings
): DetectionResult {
  // Semua detection independen
  const clockIn = selectClockIn(scans, settings);
  const breakOut = selectBreakOut(scans, settings);
  const breakIn = selectBreakIn(scans, settings);
  const clockOut = selectClockOut(scans, settings);

  return {
    clockIn,
    breakOut,
    breakIn,
    clockOut,
  };
}
