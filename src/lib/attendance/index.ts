/**
 * ATTENDANCE ENGINE — PUBLIC API
 * 
 * Ekspor semua komponen attendance engine untuk digunakan di aplikasi.
 * 
 * @example
 * ```typescript
 * import { importFromAttlog, AttendanceStatus } from '@/lib/attendance';
 * 
 * const result = await importFromAttlog(entries, storeId);
 * console.log(`Inserted: ${result.inserted}`);
 * ```
 */

// ── Main Engine ───────────────────────────────────────────────────────────────

export { importFromAttlog } from './AttendanceEngine';

// ── Components ────────────────────────────────────────────────────────────────

export {
  detectAttendance,
  selectClockIn,
  selectBreakOut,
  selectBreakIn,
  selectClockOut,
} from './AttendanceDetector';

export {
  classifyAttendance,
  shouldCreateRecord,
} from './AttendanceClassifier';

export {
  recoverAttendance,
  hasRecoveredData,
  getRecoveredCheckpoints,
} from './AttendanceRecovery';

export {
  persistAttendance,
  fetchExistingRecords,
  compareRecords,
  batchInsert,
  batchUpdate,
} from './AttendancePersistence';

// ── Types ─────────────────────────────────────────────────────────────────────

export type {
  AttendanceEngineSettings,
  DetectionResult,
} from './AttendanceDetector';

export type {
  AttendanceStatus,
  ClassificationInput,
} from './AttendanceClassifier';

export type {
  RecoveryInput,
  RecoveryResult,
} from './AttendanceRecovery';

export type {
  AttendanceRecord,
  ExistingRecord,
  PersistenceResult,
  PersistAction,
} from './AttendancePersistence';

export type {
  AttlogEntry,
  ImportResult,
} from './AttendanceEngine';
