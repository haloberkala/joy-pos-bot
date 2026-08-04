/**
 * ATTENDANCE CLASSIFIER — TRUTH TABLE TEST (BITMASK IMPLEMENTATION)
 * 
 * Test seluruh 16 kondisi truth table untuk memastikan
 * classification logic sesuai dengan business rule.
 * 
 * BITMASK:
 *   Bit 3 (8) = Clock In
 *   Bit 2 (4) = Break Out
 *   Bit 1 (2) = Break In
 *   Bit 0 (1) = Clock Out
 */

import { classifyAttendance, ClassificationInput, shouldCreateRecord } from '../AttendanceClassifier';

describe('AttendanceClassifier — Truth Table 16 Kondisi (Bitmask)', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // KONDISI 1 (Mask 0): Semua checkpoint NULL → Skip record
  // ─────────────────────────────────────────────────────────────────────────────
  
  test('Kondisi 1 (Mask 0000): Semua null → return null (skip)', () => {
    const input: ClassificationInput = {
      clockIn: null,
      breakOut: null,
      breakIn: null,
      clockOut: null,
      hasBreakConfig: true,
    };
    
    expect(classifyAttendance(input)).toBeNull();
    expect(shouldCreateRecord(input)).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // KONDISI 2-8 (Mask 1-7): Tidak ada Clock In → Incomplete
  // ─────────────────────────────────────────────────────────────────────────────

  test('Kondisi 2 (Mask 0001): Hanya Clock Out → Incomplete', () => {
    const input: ClassificationInput = {
      clockIn: null,
      breakOut: null,
      breakIn: null,
      clockOut: '17:00',
      hasBreakConfig: true,
    };
    
    expect(classifyAttendance(input)).toBe('incomplete');
    expect(shouldCreateRecord(input)).toBe(true);
  });

  test('Kondisi 3 (Mask 0010): Hanya Break In → Incomplete', () => {
    const input: ClassificationInput = {
      clockIn: null,
      breakOut: null,
      breakIn: '13:00',
      clockOut: null,
      hasBreakConfig: true,
    };
    
    expect(classifyAttendance(input)).toBe('incomplete');
    expect(shouldCreateRecord(input)).toBe(true);
  });

  test('Kondisi 4 (Mask 0011): Break In + Clock Out → Incomplete', () => {
    const input: ClassificationInput = {
      clockIn: null,
      breakOut: null,
      breakIn: '13:00',
      clockOut: '17:00',
      hasBreakConfig: true,
    };
    
    expect(classifyAttendance(input)).toBe('incomplete');
    expect(shouldCreateRecord(input)).toBe(true);
  });

  test('Kondisi 5 (Mask 0100): Hanya Break Out → Incomplete', () => {
    const input: ClassificationInput = {
      clockIn: null,
      breakOut: '12:00',
      breakIn: null,
      clockOut: null,
      hasBreakConfig: true,
    };
    
    expect(classifyAttendance(input)).toBe('incomplete');
    expect(shouldCreateRecord(input)).toBe(true);
  });

  test('Kondisi 6 (Mask 0101): Break Out + Clock Out → Incomplete', () => {
    const input: ClassificationInput = {
      clockIn: null,
      breakOut: '12:00',
      breakIn: null,
      clockOut: '17:00',
      hasBreakConfig: true,
    };
    
    expect(classifyAttendance(input)).toBe('incomplete');
    expect(shouldCreateRecord(input)).toBe(true);
  });

  test('Kondisi 7 (Mask 0110): Break Out + Break In → Incomplete', () => {
    const input: ClassificationInput = {
      clockIn: null,
      breakOut: '12:00',
      breakIn: '13:00',
      clockOut: null,
      hasBreakConfig: true,
    };
    
    expect(classifyAttendance(input)).toBe('incomplete');
    expect(shouldCreateRecord(input)).toBe(true);
  });

  test('Kondisi 8 (Mask 0111): Break Out + Break In + Clock Out → Incomplete', () => {
    const input: ClassificationInput = {
      clockIn: null,
      breakOut: '12:00',
      breakIn: '13:00',
      clockOut: '17:00',
      hasBreakConfig: true,
    };
    
    expect(classifyAttendance(input)).toBe('incomplete');
    expect(shouldCreateRecord(input)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // KONDISI 9-12 (Mask 8-11): Ada Clock In, tapi tidak lengkap → Incomplete
  // ─────────────────────────────────────────────────────────────────────────────

  test('Kondisi 9 (Mask 1000): Hanya Clock In → Incomplete', () => {
    const input: ClassificationInput = {
      clockIn: '08:00',
      breakOut: null,
      breakIn: null,
      clockOut: null,
      hasBreakConfig: true,
    };
    
    expect(classifyAttendance(input)).toBe('incomplete');
    expect(shouldCreateRecord(input)).toBe(true);
  });

  test('Kondisi 10 (Mask 1001): Clock In + Clock Out → Incomplete', () => {
    const input: ClassificationInput = {
      clockIn: '08:00',
      breakOut: null,
      breakIn: null,
      clockOut: '17:00',
      hasBreakConfig: true,
    };
    
    expect(classifyAttendance(input)).toBe('incomplete');
    expect(shouldCreateRecord(input)).toBe(true);
  });

  test('Kondisi 11 (Mask 1010): Clock In + Break In → Incomplete', () => {
    const input: ClassificationInput = {
      clockIn: '08:00',
      breakOut: null,
      breakIn: '13:00',
      clockOut: null,
      hasBreakConfig: true,
    };
    
    expect(classifyAttendance(input)).toBe('incomplete');
    expect(shouldCreateRecord(input)).toBe(true);
  });

  test('Kondisi 12 (Mask 1011): Clock In + Break In + Clock Out → Incomplete', () => {
    const input: ClassificationInput = {
      clockIn: '08:00',
      breakOut: null,
      breakIn: '13:00',
      clockOut: '17:00',
      hasBreakConfig: true,
    };
    
    expect(classifyAttendance(input)).toBe('incomplete');
    expect(shouldCreateRecord(input)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // KONDISI 13 (Mask 12): Clock In + Break Out, tidak ada Break In → PARTIAL
  // ─────────────────────────────────────────────────────────────────────────────

  test('Kondisi 13 (Mask 1100): Clock In + Break Out (stop di break) → Partial', () => {
    const input: ClassificationInput = {
      clockIn: '08:00',
      breakOut: '12:00',
      breakIn: null,
      clockOut: null,
      hasBreakConfig: true,
    };
    
    expect(classifyAttendance(input)).toBe('partial');
    expect(shouldCreateRecord(input)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // KONDISI 14-15 (Mask 13-14): Hampir lengkap → Incomplete
  // ─────────────────────────────────────────────────────────────────────────────

  test('Kondisi 14 (Mask 1101): Clock In + Break Out + Clock Out (tanpa Break In) → Incomplete', () => {
    const input: ClassificationInput = {
      clockIn: '08:00',
      breakOut: '12:00',
      breakIn: null,
      clockOut: '17:00',
      hasBreakConfig: true,
    };
    
    expect(classifyAttendance(input)).toBe('incomplete');
    expect(shouldCreateRecord(input)).toBe(true);
  });

  test('Kondisi 15 (Mask 1110): Clock In + Break Out + Break In (tanpa Clock Out) → Incomplete', () => {
    const input: ClassificationInput = {
      clockIn: '08:00',
      breakOut: '12:00',
      breakIn: '13:00',
      clockOut: null,
      hasBreakConfig: true,
    };
    
    expect(classifyAttendance(input)).toBe('incomplete');
    expect(shouldCreateRecord(input)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // KONDISI 16 (Mask 15): Semua checkpoint lengkap → COMPLETE
  // ─────────────────────────────────────────────────────────────────────────────

  test('Kondisi 16 (Mask 1111): Semua checkpoint lengkap → Complete', () => {
    const input: ClassificationInput = {
      clockIn: '08:00',
      breakOut: '12:00',
      breakIn: '13:00',
      clockOut: '17:00',
      hasBreakConfig: true,
    };
    
    expect(classifyAttendance(input)).toBe('complete');
    expect(shouldCreateRecord(input)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // EDGE CASES
  // ─────────────────────────────────────────────────────────────────────────────

  test('Edge: Tidak ada break config → hasBreakConfig tidak affect bitmask', () => {
    // Mask 1001: Clock In + Clock Out
    const input: ClassificationInput = {
      clockIn: '08:00',
      breakOut: null,
      breakIn: null,
      clockOut: '17:00',
      hasBreakConfig: false,
    };
    
    // Sesuai truth table, mask 1001 = incomplete
    expect(classifyAttendance(input)).toBe('incomplete');
    expect(shouldCreateRecord(input)).toBe(true);
  });

  test('Bitmask calculation test', () => {
    // Test internal: pastikan bitmask calculated correctly
    // Mask 15 (1111) = semua ada
    const allPresent: ClassificationInput = {
      clockIn: '08:00',
      breakOut: '12:00',
      breakIn: '13:00',
      clockOut: '17:00',
      hasBreakConfig: true,
    };
    
    // Expected mask: 8 + 4 + 2 + 1 = 15
    // Truth table[15] = 'complete'
    expect(classifyAttendance(allPresent)).toBe('complete');
    
    // Mask 0 (0000) = semua null
    const allNull: ClassificationInput = {
      clockIn: null,
      breakOut: null,
      breakIn: null,
      clockOut: null,
      hasBreakConfig: true,
    };
    
    // Expected mask: 0
    // Truth table[0] = null
    expect(classifyAttendance(allNull)).toBeNull();
  });
});
