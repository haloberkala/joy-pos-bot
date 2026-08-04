// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE CLASSIFIER — TRUTH TABLE 16 KONDISI (BITMASK IMPLEMENTATION)
// ═══════════════════════════════════════════════════════════════════════════════
//
// SINGLE SOURCE OF TRUTH: Lookup table berdasarkan bitmask.
// Tidak ada nested if — semua 16 kombinasi eksplisit.
//
// TRUTH TABLE:
// ┌────┬──────────┬───────────┬──────────┬───────────┬────────────┐
// │ No │ Clock In │ Break Out │ Break In │ Clock Out │ Status     │
// ├────┼──────────┼───────────┼──────────┼───────────┼────────────┤
// │  1 │    -     │     -     │    -     │     -     │ [skip]     │
// │  2 │    -     │     -     │    -     │     ✓     │ Incomplete │
// │  3 │    -     │     -     │    ✓     │     -     │ Incomplete │
// │  4 │    -     │     -     │    ✓     │     ✓     │ Incomplete │
// │  5 │    -     │     ✓     │    -     │     -     │ Incomplete │
// │  6 │    -     │     ✓     │    -     │     ✓     │ Incomplete │
// │  7 │    -     │     ✓     │    ✓     │     -     │ Incomplete │
// │  8 │    -     │     ✓     │    ✓     │     ✓     │ Incomplete │
// │  9 │    ✓     │     -     │    -     │     -     │ Incomplete │
// │ 10 │    ✓     │     -     │    -     │     ✓     │ Incomplete │
// │ 11 │    ✓     │     -     │    ✓     │     -     │ Incomplete │
// │ 12 │    ✓     │     -     │    ✓     │     ✓     │ Incomplete │
// │ 13 │    ✓     │     ✓     │    -     │     -     │ Partial    │
// │ 14 │    ✓     │     ✓     │    -     │     ✓     │ Incomplete │
// │ 15 │    ✓     │     ✓     │    ✓     │     -     │ Incomplete │
// │ 16 │    ✓     │     ✓     │    ✓     │     ✓     │ Complete   │
// └────┴──────────┴───────────┴──────────┴───────────┴────────────┘
//
// BITMASK:
//   Bit 3 (8) = Clock In
//   Bit 2 (4) = Break Out
//   Bit 1 (2) = Break In
//   Bit 0 (1) = Clock Out
//
// ═══════════════════════════════════════════════════════════════════════════════

export type AttendanceStatus = 'complete' | 'partial' | 'incomplete';

export interface ClassificationInput {
  clockIn: string | null;
  breakOut: string | null;
  breakIn: string | null;
  clockOut: string | null;
  hasBreakConfig: boolean;
}

// ── TRUTH TABLE LOOKUP ────────────────────────────────────────────────────────

/**
 * Lookup table untuk 16 kombinasi checkpoint.
 * Index = bitmask (0-15)
 * Value = status atau null (skip)
 */
const TRUTH_TABLE: Array<AttendanceStatus | null> = [
  null,          // 0  (0000): - - - - → Skip
  'incomplete',  // 1  (0001): - - - ✓ → Incomplete
  'incomplete',  // 2  (0010): - - ✓ - → Incomplete
  'incomplete',  // 3  (0011): - - ✓ ✓ → Incomplete
  'incomplete',  // 4  (0100): - ✓ - - → Incomplete
  'incomplete',  // 5  (0101): - ✓ - ✓ → Incomplete
  'incomplete',  // 6  (0110): - ✓ ✓ - → Incomplete
  'incomplete',  // 7  (0111): - ✓ ✓ ✓ → Incomplete
  'incomplete',  // 8  (1000): ✓ - - - → Incomplete
  'incomplete',  // 9  (1001): ✓ - - ✓ → Incomplete
  'incomplete',  // 10 (1010): ✓ - ✓ - → Incomplete
  'incomplete',  // 11 (1011): ✓ - ✓ ✓ → Incomplete
  'partial',     // 12 (1100): ✓ ✓ - - → Partial
  'incomplete',  // 13 (1101): ✓ ✓ - ✓ → Incomplete
  'incomplete',  // 14 (1110): ✓ ✓ ✓ - → Incomplete
  'complete',    // 15 (1111): ✓ ✓ ✓ ✓ → Complete
];

// ── CLASSIFIER ────────────────────────────────────────────────────────────────

/**
 * ATTENDANCE CLASSIFIER — BITMASK IMPLEMENTATION
 * 
 * Menggunakan lookup table untuk menghilangkan ambiguitas.
 * Semua 16 kombinasi eksplisit.
 * 
 * IMPORTANT:
 * - Tidak ada nested if
 * - Tidak ada business rule tersembunyi
 * - Truth table adalah single source of truth
 */
export function classifyAttendance(input: ClassificationInput): AttendanceStatus | null {
  const { clockIn, breakOut, breakIn, clockOut } = input;

  // Build bitmask
  const mask =
    (clockIn ? 8 : 0) |
    (breakOut ? 4 : 0) |
    (breakIn ? 2 : 0) |
    (clockOut ? 1 : 0);

  // Lookup dari truth table
  return TRUTH_TABLE[mask];
}

/**
 * Helper: Menentukan apakah harus membuat record attendance.
 * Return false jika semua checkpoint null (mask = 0).
 */
export function shouldCreateRecord(input: ClassificationInput): boolean {
  const { clockIn, breakOut, breakIn, clockOut } = input;
  
  // Jika semua null → mask = 0 → skip
  return clockIn !== null || breakOut !== null || breakIn !== null || clockOut !== null;
}
