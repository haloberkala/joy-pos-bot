import { supabase, supabaseAny } from '@/lib/supabase';

export interface Attendance {
  id: number;
  employee_id: string; // UUID
  store_id: number;
  attendance_date: string;
  clock_in: string | null;
  clock_out: string | null;
  break_out: string | null;
  break_in: string | null;
  // Internal fields for database compatibility (not exposed in new UI)
  duration_minutes: number | null;
  penalty_minutes?: number;
  // Status: Only new statuses
  status: 'complete' | 'partial' | 'incomplete';
  note: string;
  is_manual_edit: boolean;
  created_at: string;
  updated_at: string;
}

// Attendance status type
export type AttendanceStatus = 'complete' | 'partial' | 'incomplete';

export interface AttendanceSetting {
  id?: number;
  store_id?: number;
  shift_start: string;
  shift_end: string;
  grace_period_minutes: number;
  break_start: string;
  break_end: string;
  break_return_tolerance_minutes: number;
  clock_out_tolerance_minutes?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAttendanceInput {
  employee_id: string; // UUID
  store_id: number;
  attendance_date: string;
  clock_in?: string;
  clock_out?: string;
  break_out?: string;
  break_in?: string;
  status: AttendanceStatus;
  note?: string;
}

export interface UpdateAttendanceInput {
  status?: AttendanceStatus;
  note?: string;
  clock_in?: string;
  clock_out?: string;
  break_out?: string;
  break_in?: string;
  is_manual_edit?: boolean;
}

/**
 * Get attendances by store with optional filtering
 */
export async function getAttendancesByStore(
  storeId: number,
  options?: {
    month?: number;
    year?: number;
    employeeId?: string;
  }
): Promise<Attendance[]> {
  try {
    let query = supabase
      .from('attendances')
      .select('*')
      .eq('store_id', storeId);

    // Filter by month/year if provided
    if (options?.month && options?.year) {
      const startDate = `${options.year}-${String(options.month).padStart(2, '0')}-01`;
      const lastDay = new Date(options.year, options.month, 0).getDate();
      const endDate = `${options.year}-${String(options.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      query = query.gte('attendance_date', startDate).lte('attendance_date', endDate);
    }

    // Filter by employee if provided
    if (options?.employeeId) {
      query = query.eq('employee_id', options.employeeId);
    }

    query = query.order('attendance_date', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching attendances:', error);
    throw error;
  }
}

/**
 * Update attendance
 */
export async function updateAttendance(
  id: number,
  input: UpdateAttendanceInput
): Promise<Attendance> {
  try {
    const updateData: Partial<UpdateAttendanceInput> = {};

    if (input.status !== undefined) updateData.status = input.status;
    if (input.note !== undefined) updateData.note = input.note;
    if (input.clock_in !== undefined) updateData.clock_in = input.clock_in;
    if (input.clock_out !== undefined) updateData.clock_out = input.clock_out;
    if (input.break_out !== undefined) updateData.break_out = input.break_out;
    if (input.break_in !== undefined) updateData.break_in = input.break_in;
    if (input.is_manual_edit !== undefined) updateData.is_manual_edit = input.is_manual_edit;

    const { data, error } = await supabase
      .from('attendances')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating attendance:', error);
    throw error;
  }
}

/**
 * Delete attendance
 */
export async function deleteAttendance(id: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('attendances')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting attendance:', error);
    throw error;
  }
}

export async function getAttendanceSetting(storeId: number) {
  const { data, error } = await supabaseAny
    .from('attendance_settings')
    .select('*')
    .eq('store_id', storeId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  return data;
}

export async function upsertAttendanceSetting(storeId: number, setting: AttendanceSetting) {
  // Bersihkan payload (jangan kirim id, dll agar aman)
  const { id, created_at, updated_at, store_id, ...cleanSetting } = setting;

  // Cek apakah data sudah ada
  const { data: existing } = await supabaseAny
    .from('attendance_settings')
    .select('id')
    .eq('store_id', storeId)
    .single();

  if (existing) {
    // Manual Update
    const { data, error } = await supabaseAny
      .from('attendance_settings')
      .update(cleanSetting)
      .eq('store_id', storeId)
      .select();

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } else {
    // Manual Insert
    const { data, error } = await supabaseAny
      .from('attendance_settings')
      .insert({ ...cleanSetting, store_id: storeId })
      .select();

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE ENGINE — Revision 2026-08-04 (Final Simplification)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Filosofi Baru:
//   - Attendance Engine hanya menghasilkan status: COMPLETE, PARTIAL, INCOMPLETE
//   - Tidak ada status "libur" — hari libur adalah domain Payroll
//   - Tidak ada holiday engine (work_holidays, weekly_off_days diabaikan)
//   - Break sebagai KONFIGURASI (bukan entity), langsung di attendance_settings
//   - Break berfungsi sebagai checkpoint kehadiran (break_out, break_in)
//   - Durasi dan keterlambatan TIDAK dihitung — domain Payroll
//
// Pipeline:
//   Parse (attendanceImportService)
//     ↓ AttlogEntry[]
//   resolveEmployee()             — fingerprint_id → employee UUID
//     ↓
//   validateAttendanceSetting()   — pastikan aturan sudah dikonfigurasi
//     ↓ AttendanceEngineSettings (break config langsung dari settings)
//   selectClockIn()               — scan pertama dalam Clock In Window
//     ↓ clockIn (null jika tidak ada scan dalam window)
//   selectBreakOut()              — scan pertama dalam Break Out Window
//     ↓ breakOut (null jika tidak ada break atau tidak ada scan)
//   selectBreakIn()               — scan pertama dalam Break In Window
//     ↓ breakIn (null jika tidak ada breakOut atau tidak ada scan)
//   selectClockOut()              — scan terakhir dalam Clock Out Window
//     ↓ clockOut (null jika tidak ada scan dalam window)
//   classifyAttendance()          — tentukan COMPLETE / PARTIAL / INCOMPLETE
//     ↓ status
//   compareExistingAttendance()   — INSERT / UPDATE / SKIP
//     ↓
//   persistAttendance()           — tulis ke database
// ═══════════════════════════════════════════════════════════════════════════════

// ── Tipe Lokal ────────────────────────────────────────────────────────────────

/** Tipe lokal agar tidak terjadi circular import dengan attendanceImportService. */
interface AttlogEntry {
  fingerprintId: string;
  date: string;
  scans: string[]; // sudah sorted & deduplicated ascending, format "HH:mm"
}

interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  /** Kondisi yang benar-benar gagal (DB error, setting tidak ada, dsb). */
  errors: string[];
  /** Alasan data dilewati — bukan error, hanya informasi (manual edit, identik, dsb). */
  skippedReasons: string[];
}

/** Snapshot aturan absensi yang sudah di-parse dari attendance_settings. */
interface AttendanceEngineSettings {
  shiftStart:   string; // "HH:mm"
  shiftEnd:     string;
  gracePeriod:  number; // menit
  // Derived (menit sejak 00:00) — dihitung sekali, dipakai di semua step.
  shiftStartMin: number;
  shiftEndMin:   number;
  clockOutTolerance: number; // menit - toleransi setelah shift_end
  /** 
   * Break configuration (bukan entity terpisah).
   * Dibaca langsung dari attendance_settings.
   * Jika null, berarti toko tidak dikonfigurasi break.
   */
  break: {
    startMin: number;       // Break Out Window start
    endMin: number;         // Break Out Window end
    returnToleranceMin: number; // Break In Window tolerance setelah endMin
  } | null;
}

/** Hasil kalkulasi satu hari kerja sebelum ditulis ke DB. */
interface DayResult {
  clockIn:         string | null;
  breakOut:        string | null;
  breakIn:         string | null;
  clockOut:        string | null;
  status:          AttendanceStatus;
}

type PersistAction = 'insert' | 'update' | 'skip_identical' | 'skip_manual_edit';

interface ExistingRow {
  id:               number;
  employee_id:      string;
  attendance_date:  string;
  clock_in:         string | null;
  clock_out:        string | null;
  break_out:        string | null;
  break_in:         string | null;
  duration_minutes: number | null;
  penalty_minutes:  number;
  status:           string;
  is_manual_edit:   boolean;
}

// ── Konstanta ─────────────────────────────────────────────────────────────────

const IMPORT_BATCH_SIZE = 50;

// ── Helper Murni ──────────────────────────────────────────────────────────────

function _min(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function _normalizeId(raw: string): string {
  const s = raw.replace(/['"]/g, '').trim();
  const n = Number(s);
  return isNaN(n) ? s : String(n);
}

/**
 * Apakah waktu `t` berada dalam Clock In Window?
 * Window: [shift_start, shift_start + grace_period]
 * HANYA SETELAH jam masuk (tidak ada toleransi sebelum)
 */
function isInClockInWindow(t: string, s: AttendanceEngineSettings): boolean {
  const m = _min(t);
  // Window: dari shift_start sampai shift_start + grace_period
  return m >= s.shiftStartMin && m <= s.shiftStartMin + s.gracePeriod;
}

/**
 * Apakah waktu `t` berada dalam Clock Out Window?
 * Window: [shift_end, shift_end + clockOutTolerance]
 * HANYA SETELAH jam pulang (tidak ada toleransi sebelum)
 */
function isInClockOutWindow(t: string, s: AttendanceEngineSettings): boolean {
  const m = _min(t);
  // Window: dari shift_end sampai shift_end + clockOutTolerance
  return m >= s.shiftEndMin && m <= s.shiftEndMin + s.clockOutTolerance;
}

// ── Step 1: validateAttendanceSetting ────────────────────────────────────────
//
// Ambil attendance_settings dari DB dan konversi ke AttendanceEngineSettings.
// Break configuration dibaca langsung dari attendance_settings (bukan tabel terpisah).
// Error hard-stop jika setting belum dikonfigurasi — import tidak boleh lanjut.

async function validateAttendanceSetting(
  storeId: number
): Promise<{ settings: AttendanceEngineSettings } | { error: string }> {
  // Fetch attendance_settings
  const { data, error } = await supabaseAny
    .from('attendance_settings')
    .select('*')
    .eq('store_id', Number(storeId))
    .single();

  if (error) {
    return {
      error: error.code === 'PGRST116'
        ? 'Attendance setting belum dibuat. Harap konfigurasi aturan absensi terlebih dahulu.'
        : `Gagal mengambil aturan absensi: ${error.message}`,
    };
  }

  const shiftStart  = (data.shift_start  ?? '08:00') as string;
  const shiftEnd    = (data.shift_end    ?? '17:00') as string;
  const gracePeriod = (data.grace_period_minutes ?? 15) as number;
  const clockOutTolerance = (data.clock_out_tolerance_minutes ?? 30) as number;
  const breakReturnTolerance = (data.break_return_tolerance_minutes ?? 15) as number;

  // Break configuration langsung dari attendance_settings
  const breakStart = (data.break_start ?? null) as string | null;
  const breakEnd   = (data.break_end   ?? null) as string | null;
  
  let parsedBreak: {
    startMin: number;
    endMin: number;
    returnToleranceMin: number;
  } | null = null;

  // Jika break dikonfigurasi (break_start dan break_end ada)
  if (breakStart && breakEnd) {
    parsedBreak = {
      startMin: _min(breakStart),
      endMin: _min(breakEnd),
      returnToleranceMin: breakReturnTolerance,
    };
  }

  return {
    settings: {
      shiftStart,
      shiftEnd,
      gracePeriod,
      shiftStartMin: _min(shiftStart),
      shiftEndMin:   _min(shiftEnd),
      clockOutTolerance,
      break: parsedBreak,
    },
  };
}

// ── Step 2: resolveEmployee ───────────────────────────────────────────────────
//
// Fetch semua karyawan store ini (batch), bangun Map fingerprintId → UUID.
// Lookup per-entry dilakukan di pipeline utama.

async function resolveEmployee(
  storeId: number
): Promise<{ map: Map<string, string> } | { error: string }> {
  const { data, error } = await supabaseAny
    .from('employees')
    .select('id, fingerprint_id')
    .eq('store_id', Number(storeId))
    .not('fingerprint_id', 'is', null);

  if (error) return { error: `Gagal mengambil data karyawan: ${error.message}` };

  const map = new Map<string, string>();
  (data ?? []).forEach((emp: { id: string; fingerprint_id: string }) =>
    map.set(_normalizeId(emp.fingerprint_id), emp.id)
  );
  return { map };
}

// ── Step 3: selectClockIn ─────────────────────────────────────────────────────
//
// Menerima scans asli. Mengembalikan scan pertama dalam window clock-in.
// Jika tidak ada scan dalam window → null.
//
// Window: [shift_start, shift_start + grace_period]
// HANYA SETELAH jam masuk (tidak ada toleransi sebelum)

function selectClockIn(
  scans: string[],
  s: AttendanceEngineSettings
): string | null {
  const inWindow = scans.filter((t) => isInClockInWindow(t, s));
  return inWindow.length > 0 ? inWindow[0] : null;
}

// ── Step 4: selectBreakOut ────────────────────────────────────────────────────
//
// Mengembalikan scan pertama dalam Break Out Window (setelah clockIn).
// Window: [break.startMin, break.endMin]
// Jika tidak ada scan dalam window → null.

function selectBreakOut(
  scans: string[],
  clockIn: string,
  s: AttendanceEngineSettings
): string | null {
  if (!s.break) return null;
  
  const clockInMin = _min(clockIn);
  const inWindow = scans.filter((t) => {
    const m = _min(t);
    // Scan harus setelah clockIn dan dalam break window
    return m > clockInMin && m >= s.break!.startMin && m <= s.break!.endMin;
  });
  
  return inWindow.length > 0 ? inWindow[0] : null;
}

// ── Step 5: selectBreakIn ─────────────────────────────────────────────────────
//
// Mengembalikan scan pertama dalam Break In Window (setelah break end).
// Window: [break.endMin, break.endMin + returnToleranceMin]
// Jika tidak ada scan dalam window → null.

function selectBreakIn(
  scans: string[],
  breakOut: string | null,
  s: AttendanceEngineSettings
): string | null {
  if (!s.break || !breakOut) return null;
  
  const breakOutMin = _min(breakOut);
  const breakInWindowEnd = s.break.endMin + s.break.returnToleranceMin;
  
  const inWindow = scans.filter((t) => {
    const m = _min(t);
    // Scan harus setelah breakOut dan dalam break-in window
    return m > breakOutMin && m >= s.break!.endMin && m <= breakInWindowEnd;
  });
  
  return inWindow.length > 0 ? inWindow[0] : null;
}

// ── Step 6: selectClockOut ────────────────────────────────────────────────────
//
// Mengembalikan scan terakhir dalam Clock Out Window.
// Window: [shift_end, shift_end + clockOutTolerance]
// HANYA SETELAH jam pulang (tidak ada toleransi sebelum)
// Jika tidak ada kandidat valid → null.

function selectClockOut(
  scans: string[],
  clockIn: string | null,
  s: AttendanceEngineSettings,
  debug: boolean = false
): string | null {
  if (debug) {
    console.log('🔍 Clock Out Selection');
    console.log(`  Shift End        : ${s.shiftEnd}`);
    console.log(`  Tolerance        : ${s.clockOutTolerance} menit`);
    console.log(`  Window           :`);
    console.log(`    ${s.shiftEnd}`);
    console.log(`    ↓`);
    const endMin = s.shiftEndMin + s.clockOutTolerance;
    const endHour = Math.floor(endMin / 60);
    const endMinute = endMin % 60;
    console.log(`    ${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`);
    console.log(`  Scans            :`);
    scans.forEach((t) => {
      const inWindow = t !== clockIn && isInClockOutWindow(t, s);
      console.log(`    ${t} -> ${inWindow ? 'true' : 'false'}`);
    });
  }

  // Kandidat: scan dalam window clock-out, bukan clock-in
  const candidates = scans.filter(
    (t) => t !== clockIn && isInClockOutWindow(t, s)
  );

  if (candidates.length === 0) {
    if (debug) console.log(`  Result           : null`);
    return null;
  }
  
  // Ambil scan terakhir
  const result = candidates[candidates.length - 1];
  if (debug) console.log(`  Result           : ${result}`);
  return result;
}

// ── Step 7: classifyAttendance ────────────────────────────────────────────────
//
// Tentukan status: COMPLETE, PARTIAL, atau INCOMPLETE berdasarkan checkpoint.
//
// Decision tree (Revisi 2026-08-04):
//   clockIn tidak ada        → INCOMPLETE (ada log fingerprint tapi tidak ada clock-in valid)
//   
//   breakConfig tidak ada    → clockOut ada? COMPLETE : INCOMPLETE
//   
//   breakOut tidak ada       → INCOMPLETE (belum mencapai break window)
//   
//   breakIn tidak ada        → PARTIAL (berhenti di break window)
//   
//   clockOut tidak ada       → INCOMPLETE (sudah break-in tapi tidak clock-out)
//   
//   Semua checkpoint ada     → COMPLETE
//
// CATATAN: Fungsi ini sekarang bisa menerima clockIn = null. 
// Record tetap akan dibuat dengan status INCOMPLETE.

function classifyAttendance(
  clockIn: string | null,
  breakOut: string | null,
  breakIn: string | null,
  clockOut: string | null,
  s: AttendanceEngineSettings
): AttendanceStatus {
  // Tidak ada clock-in = ada log fingerprint tapi tidak ada clock-in valid
  if (!clockIn) return 'incomplete';
  
  // Jika tidak ada konfigurasi break
  if (!s.break) {
    return clockOut ? 'complete' : 'incomplete';
  }
  
  // Break dikonfigurasi — pipeline lengkap: clockIn → breakOut → breakIn → clockOut
  
  // Tidak ada breakOut = belum mencapai break window
  if (!breakOut) return 'incomplete';
  
  // Tidak ada breakIn = PARTIAL (berhenti di break window)
  if (!breakIn) return 'partial';
  
  // Sudah break-in tapi tidak clock-out = INCOMPLETE
  if (!clockOut) return 'incomplete';
  
  // Semua checkpoint lengkap
  return 'complete';
}

// ── Step 8: compareExistingAttendance ─────────────────────────────────────────
//
// Bandingkan hasil kalkulasi dengan data yang sudah ada di DB.
// Return action yang harus dilakukan: insert / update / skip.

function compareExistingAttendance(
  existing: ExistingRow | undefined,
  day: DayResult,
  fingerprintId: string,
  date: string
): { action: PersistAction; skipReason?: string } {
  if (!existing) return { action: 'insert' };

  if (existing.is_manual_edit) {
    return {
      action: 'skip_manual_edit',
      skipReason: `Fingerprint ID ${fingerprintId} / ${date}: Data manual edit, tidak ditimpa.`,
    };
  }

  const identical =
    existing.clock_in  === day.clockIn  &&
    existing.break_out === day.breakOut &&
    existing.break_in  === day.breakIn  &&
    existing.clock_out === day.clockOut &&
    existing.status    === day.status;

  return { action: identical ? 'skip_identical' : 'update' };
}

// ── Step 9: persistAttendance ─────────────────────────────────────────────────
//
// Tulis ke DB: batch INSERT atau per-record UPDATE.
// Dipisah agar mudah diganti dengan transaction atau RPC di masa depan.

async function persistAttendance(
  toInsert: object[],
  toUpdate: { id: number; payload: object }[],
  result: ImportResult
): Promise<void> {
  for (let i = 0; i < toInsert.length; i += IMPORT_BATCH_SIZE) {
    const batch = toInsert.slice(i, i + IMPORT_BATCH_SIZE);
    const { error } = await supabaseAny
      .from('attendances')
      .upsert(batch, { onConflict: 'employee_id,attendance_date' });
    if (error) result.errors.push(`Upsert batch ${Math.floor(i / IMPORT_BATCH_SIZE) + 1}: ${error.message}`);
    else result.inserted += batch.length;
  }

  for (const { id, payload } of toUpdate) {
    const { error } = await supabaseAny.from('attendances').update(payload).eq('id', id);
    if (error) result.errors.push(`Update ID ${id}: ${error.message}`);
    else result.updated++;
  }
}

// ── Pipeline Utama: importFromAttlog ──────────────────────────────────────────
//
// Orkestrasi seluruh step engine berdasarkan filosofi baru:
//   - Attendance hanya COMPLETE, PARTIAL, INCOMPLETE
//   - Tidak ada holiday engine (work_holidays dan weekly_off_days diabaikan)
//   - Break sebagai checkpoint (breakOut dan breakIn)

export async function importFromAttlog(
  entries: AttlogEntry[],
  storeId: number
): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, updated: 0, skipped: 0, errors: [], skippedReasons: [] };

  // ── validateAttendanceSetting ─────────────────────────────────────────────
  const settingResult = await validateAttendanceSetting(storeId);
  if ('error' in settingResult) {
    result.errors.push(settingResult.error);
    return result;
  }
  const { settings } = settingResult;

  // ── resolveEmployee ───────────────────────────────────────────────────────
  const empResult = await resolveEmployee(storeId);
  if ('error' in empResult) {
    result.errors.push(empResult.error);
    return result;
  }
  const { map: fingerprintMap } = empResult;

  // Pisahkan entry yang punya mapping UUID
  const validEntries: { entry: AttlogEntry; employeeUuid: string }[] = [];
  for (const entry of entries) {
    const uuid = fingerprintMap.get(entry.fingerprintId);
    if (!uuid) {
      result.skipped++;
      result.skippedReasons.push(`Fingerprint ID ${entry.fingerprintId} tidak ditemukan.`);
    } else {
      validEntries.push({ entry, employeeUuid: uuid });
    }
  }
  if (validEntries.length === 0) return result;

  // ── Fetch existing records untuk compareExistingAttendance ────────────────
  const employeeUuids = [...new Set(validEntries.map((r) => r.employeeUuid))];
  const dates         = [...new Set(validEntries.map((r) => r.entry.date))];

  const { data: existing, error: fetchError } = await supabaseAny
    .from('attendances')
    .select('id, employee_id, attendance_date, clock_in, clock_out, break_out, break_in, duration_minutes, penalty_minutes, status, is_manual_edit')
    .in('employee_id', employeeUuids)
    .in('attendance_date', dates);

  if (fetchError) {
    result.errors.push(`Gagal fetch data existing: ${fetchError.message}`);
    return result;
  }

  const existingMap = new Map<string, ExistingRow>();
  (existing ?? []).forEach((row: ExistingRow) =>
    existingMap.set(`${row.employee_id}|${row.attendance_date}`, row)
  );

  const toInsert: object[] = [];
  const toUpdate: { id: number; payload: object }[] = [];

  // ── Per-entry pipeline ────────────────────────────────────────────────────
  for (const { entry, employeeUuid } of validEntries) {
    const { fingerprintId, date, scans } = entry;

    // selectClockIn — scan pertama dalam Clock In Window
    const clockIn = selectClockIn(scans, settings);

    // FILOSOFI BARU (2026-08-04):
    // Jika tidak ada clockIn yang valid, TETAP buat record dengan status incomplete.
    // JANGAN lagi skip — setiap hari dengan log fingerprint harus memiliki record attendance.

    // selectBreakOut — scan pertama dalam Break Out Window (setelah clockIn)
    // Jika clockIn tidak ada, breakOut pasti tidak bisa terdeteksi
    const breakOut = clockIn ? selectBreakOut(scans, clockIn, settings) : null;

    // selectBreakIn — scan pertama dalam Break In Window (setelah breakOut)
    const breakIn = selectBreakIn(scans, breakOut, settings);

    // selectClockOut — scan terakhir dalam Clock Out Window
    const clockOut = clockIn ? selectClockOut(scans, clockIn, settings) : null;

    // Sanity: clock_out tidak boleh lebih kecil dari clock_in (hanya jika keduanya ada)
    if (clockIn && clockOut && _min(clockOut) < _min(clockIn)) {
      result.skipped++;
      result.skippedReasons.push(
        `Fingerprint ID ${fingerprintId} / ${date}: ` +
        `Clock Out (${clockOut}) lebih kecil dari Clock In (${clockIn}). Dilewati.`
      );
      continue;
    }

    // classifyAttendance — COMPLETE, PARTIAL, atau INCOMPLETE
    // Bisa menerima clockIn = null (akan menghasilkan status incomplete)
    const status = classifyAttendance(clockIn, breakOut, breakIn, clockOut, settings);

    const day: DayResult = {
      clockIn,
      breakOut,
      breakIn,
      clockOut,
      status,
    };

    const payload = {
      employee_id:      employeeUuid,
      store_id:         Number(storeId),
      attendance_date:  date,
      clock_in:         day.clockIn,
      break_out:        day.breakOut,
      break_in:         day.breakIn,
      clock_out:        day.clockOut,
      // duration_minutes dan penalty_minutes TIDAK diisi (domain Payroll)
      status:           day.status,
      note:             '',
      is_manual_edit:   false,
    };

    // compareExistingAttendance
    const existingRow = existingMap.get(`${employeeUuid}|${date}`);
    const { action, skipReason } = compareExistingAttendance(existingRow, day, fingerprintId, date);

    if (action === 'insert') {
      toInsert.push(payload);
    } else if (action === 'update') {
      toUpdate.push({ id: existingRow!.id, payload });
    } else {
      result.skipped++;
      if (skipReason) result.skippedReasons.push(skipReason);
    }
  }

  // persistAttendance
  await persistAttendance(toInsert, toUpdate, result);

  return result;
}