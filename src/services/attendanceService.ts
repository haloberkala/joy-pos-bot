import { supabase, supabaseAny } from '@/lib/supabase';

export interface Attendance {
  id: number;
  employee_id: string; // UUID
  store_id: number;
  attendance_date: string;
  clock_in: string | null;
  clock_out: string | null;
  duration_minutes: number | null;
  status: 'hadir' | 'alpha' | 'izin' | 'sakit' | 'cuti' | 'libur';
  note: string;
  is_manual_edit: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSetting {
  id: number;
  store_id: number;
  shift_start: string;
  shift_end: string;
  grace_period_minutes: number;
  break_start: string;
  break_end: string;
  /** Hari libur mingguan. 0=Minggu, 1=Senin, ..., 6=Sabtu (JS Date.getDay() convention). */
  weekly_off_days: number[];
}

export interface CreateAttendanceInput {
  employee_id: string; // UUID
  store_id: number;
  attendance_date: string;
  clock_in?: string;
  clock_out?: string;
  duration_minutes?: number;
  status: 'hadir' | 'alpha' | 'izin' | 'sakit' | 'cuti' | 'libur';
  note?: string;
}

export interface UpdateAttendanceInput {
  status?: 'hadir' | 'alpha' | 'izin' | 'sakit' | 'cuti' | 'libur';
  note?: string;
  clock_in?: string;
  clock_out?: string;
  duration_minutes?: number;
  is_manual_edit?: boolean;
}

/**
 * Get attendances by store
 */
export async function getAttendancesByStore(storeId: number): Promise<Attendance[]> {
  try {
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('store_id', storeId)
      .order('attendance_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching attendances:', error);
    throw error;
  }
}

/**
 * Get attendances by store filtered by month/year (server-side filtering)
 */
export async function getAttendancesByStoreAndMonth(
  storeId: number,
  year: number,
  month: number
): Promise<Attendance[]> {
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('store_id', storeId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching monthly attendances by store:', error);
    throw error;
  }
}

/**
 * Get attendances by employee
 */
export async function getAttendancesByEmployee(employeeId: string): Promise<Attendance[]> {
  try {
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('employee_id', employeeId)
      .order('attendance_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching employee attendances:', error);
    throw error;
  }
}

/**
 * Get attendances by month
 */
export async function getAttendancesByMonth(
  storeId: number,
  year: number,
  month: number
): Promise<Attendance[]> {
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('store_id', storeId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching monthly attendances:', error);
    throw error;
  }
}

/**
 * Create attendance
 */
export async function createAttendance(input: CreateAttendanceInput): Promise<Attendance> {
  try {
    const { data, error } = await supabase
      .from('attendances')
      .insert({
        employee_id: input.employee_id,
        store_id: input.store_id,
        attendance_date: input.attendance_date,
        clock_in: input.clock_in || null,
        clock_out: input.clock_out || null,
        duration_minutes: input.duration_minutes || null,
        status: input.status,
        note: input.note || '',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating attendance:', error);
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
    if (input.duration_minutes !== undefined) updateData.duration_minutes = input.duration_minutes;
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

/**
 * Get attendance summary for employee in a month
 */
export async function getAttendanceSummary(
  employeeId: string,
  year: number,
  month: number
): Promise<{ total: number; hadir: number; alpha: number; izin: number; sakit: number; cuti: number }> {
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('attendances')
      .select('status')
      .eq('employee_id', employeeId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate);

    if (error) throw error;

    const summary = {
      total: data?.length || 0,
      hadir: 0,
      alpha: 0,
      izin: 0,
      sakit: 0,
      cuti: 0,
    };

    data?.forEach((att: { status: string }) => {
      if (att.status === 'hadir') summary.hadir++;
      else if (att.status === 'alpha') summary.alpha++;
      else if (att.status === 'izin') summary.izin++;
      else if (att.status === 'sakit') summary.sakit++;
      else if (att.status === 'cuti') summary.cuti++;
    });

    return summary;
  } catch (error) {
    console.error('Error getting attendance summary:', error);
    return { total: 0, hadir: 0, alpha: 0, izin: 0, sakit: 0, cuti: 0 };
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

// ─────────────────────────────────────────────────────────────────────────────
// WORK CALENDAR — Hari Libur
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkHoliday {
  id:         number;
  store_id:   number | null; // null = libur nasional
  date:       string;        // 'YYYY-MM-DD'
  name:       string;
  type:       'national' | 'store';
  created_at: string;
}

export interface CreateWorkHolidayInput {
  store_id: number | null;
  date:     string;
  name:     string;
  type:     'national' | 'store';
}

/**
 * Ambil semua hari libur yang berlaku untuk toko ini
 * (libur toko + libur nasional) dalam satu tahun/bulan.
 */
export async function getWorkHolidays(
  storeId: number,
  year: number,
  month: number
): Promise<WorkHoliday[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay   = new Date(year, month, 0).getDate();
  const endDate   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabaseAny
    .from('work_holidays')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .or(`store_id.eq.${storeId},store_id.is.null`)
    .order('date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as WorkHoliday[];
}

/**
 * Ambil semua hari libur untuk satu tahun (untuk toko ini).
 */
export async function getWorkHolidaysByYear(
  storeId: number,
  year: number
): Promise<WorkHoliday[]> {
  const startDate = `${year}-01-01`;
  const endDate   = `${year}-12-31`;

  const { data, error } = await supabaseAny
    .from('work_holidays')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .or(`store_id.eq.${storeId},store_id.is.null`)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data ?? []) as WorkHoliday[];
}

/**
 * Tambah satu hari libur (nasional atau toko).
 */
export async function createWorkHoliday(
  input: CreateWorkHolidayInput
): Promise<WorkHoliday> {
  const { data, error } = await supabaseAny
    .from('work_holidays')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as WorkHoliday;
}

/**
 * Update hari libur.
 */
export async function updateWorkHoliday(
  id: number,
  input: Partial<CreateWorkHolidayInput>
): Promise<WorkHoliday> {
  const { data, error } = await supabaseAny
    .from('work_holidays')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as WorkHoliday;
}

/**
 * Hapus satu hari libur.
 */
export async function deleteWorkHoliday(id: number): Promise<void> {
  const { error } = await supabaseAny
    .from('work_holidays')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
//
// Pipeline:
//   Parse (attendanceImportService)
//     ↓ AttlogEntry[]
//   resolveEmployee()       — fingerprint_id → employee UUID
//     ↓
//   validateAttendanceSetting() — pastikan aturan sudah dikonfigurasi
//     ↓ AttendanceEngineSettings
//   fetchHolidayMap()       — batch fetch hari libur khusus (nasional + toko)
//     ↓ holidayMap + weeklyOffDays dari settings
//   isDayOff()              — helper: cek libur khusus ATAU libur mingguan
//     ↓ off: true → persist 'libur', skip pipeline
//   validateScanWindow()    — validasi: warning jika semua scan di luar window
//     ↓ scans (TIDAK difilter — source of truth tetap scans asli)
//   selectClockIn()         — pilih scan clock-in berdasarkan aturan shift
//     ↓ clockIn
//   selectClockOut()        — pilih scan clock-out berdasarkan aturan shift
//     ↓ clockOut
//   calculatePenalty()      — hitung keterlambatan vs grace period
//     ↓ penaltyMinutes
//   calculateDuration()     — hitung durasi efektif (potong OT & break)
//     ↓ durationMinutes
//   calculateStatus()       — tentukan status hadir / alpha
//     ↓ status
//   compareExistingAttendance() — INSERT / UPDATE / SKIP
//     ↓
//   persistAttendance()     — tulis ke database
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
  breakStart:   string;
  breakEnd:     string;
  // Derived (menit sejak 00:00) — dihitung sekali, dipakai di semua step.
  shiftStartMin: number;
  shiftEndMin:   number;
  breakStartMin: number;
  breakEndMin:   number;
  /** Hari libur mingguan. 0=Minggu … 6=Sabtu. */
  weeklyOffDays: number[];
}

type AttendanceStatus = 'hadir' | 'alpha' | 'izin' | 'sakit' | 'cuti' | 'libur';

/** Hasil kalkulasi satu hari kerja sebelum ditulis ke DB. */
interface DayResult {
  clockIn:         string | null;
  clockOut:        string | null;
  penaltyMinutes:  number;
  durationMinutes: number | null;
  status:          AttendanceStatus;
}

type PersistAction = 'insert' | 'update' | 'skip_identical' | 'skip_manual_edit';

interface ExistingRow {
  id:               number;
  employee_id:      string;
  attendance_date:  string;
  clock_in:         string | null;
  clock_out:        string | null;
  duration_minutes: number | null;
  penalty_minutes:  number;
  status:           string;
  is_manual_edit:   boolean;
}

// ── Konstanta ─────────────────────────────────────────────────────────────────

const IMPORT_BATCH_SIZE = 50;

/**
 * Berapa menit setelah shift_end scan masih dianggap clock-out yang valid.
 * Contoh: shift 17:00 + 180 menit = batas clock-out 20:00.
 */
const MAX_CLOCK_OUT_AFTER_SHIFT = 180;

// ── Helper Murni ──────────────────────────────────────────────────────────────

function _min(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function _fmt(totalMin: number): string {
  const h = Math.floor(Math.max(0, totalMin) / 60) % 24;
  const m = Math.max(0, totalMin) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function _normalizeId(raw: string): string {
  const s = raw.replace(/['"]/g, '').trim();
  const n = Number(s);
  return isNaN(n) ? s : String(n);
}

/** Nama hari (indeks 0=Minggu s/d 6=Sabtu), dipakai sebagai keterangan libur mingguan. */
const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;

/**
 * Apakah tanggal `date` adalah hari libur?
 * Mengecek dua sumber:
 *   1. holidayMap — hari libur khusus (nasional / toko)
 *   2. weeklyOffDays — hari libur mingguan dari attendance_settings
 *
 * Return: { off: true, name } jika libur, { off: false } jika hari kerja.
 */
function isDayOff(
  date: string,
  holidayMap: Map<string, string>,
  weeklyOffDays: number[]
): { off: true; name: string } | { off: false } {
  // Cek hari libur khusus (tanggal spesifik)
  const holidayName = holidayMap.get(date);
  if (holidayName !== undefined) return { off: true, name: holidayName };

  // Cek hari libur mingguan (day of week)
  // Tambahkan T00:00:00 untuk memastikan parsing konsisten tanpa timezone shift
  const dow = new Date(date + 'T00:00:00').getDay(); // 0=Minggu … 6=Sabtu
  if (weeklyOffDays.includes(dow)) return { off: true, name: DAY_NAMES[dow] };

  return { off: false };
}

/**
 * Apakah waktu `t` berada dalam window jam masuk?
 * Window: shift_start - 60 menit  s/d  shift_start + 120 menit
 */
function isInClockInWindow(t: string, s: AttendanceEngineSettings): boolean {
  const m = _min(t);
  return m >= s.shiftStartMin - 60 && m <= s.shiftStartMin + 120;
}

/**
 * Apakah waktu `t` berada dalam window jam pulang?
 * Window: shift_end - 120 menit  s/d  shift_end + MAX_CLOCK_OUT_AFTER_SHIFT
 */
function isInClockOutWindow(t: string, s: AttendanceEngineSettings): boolean {
  const m = _min(t);
  return m >= s.shiftEndMin - 120 && m <= s.shiftEndMin + MAX_CLOCK_OUT_AFTER_SHIFT;
}

// ── Step 1: validateAttendanceSetting ────────────────────────────────────────
//
// Ambil attendance_settings dari DB dan konversi ke AttendanceEngineSettings.
// Error hard-stop jika setting belum dikonfigurasi — import tidak boleh lanjut.

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
      error: error.code === 'PGRST116'
        ? 'Attendance setting belum dibuat. Harap konfigurasi aturan absensi terlebih dahulu.'
        : `Gagal mengambil aturan absensi: ${error.message}`,
    };
  }

  const shiftStart    = (data.shift_start  ?? '08:00') as string;
  const shiftEnd      = (data.shift_end    ?? '17:00') as string;
  const breakStart    = (data.break_start  ?? '12:00') as string;
  const breakEnd      = (data.break_end    ?? '13:00') as string;
  const gracePeriod   = (data.grace_period_minutes ?? 15) as number;
  const weeklyOffDays = Array.isArray(data.weekly_off_days) ? (data.weekly_off_days as number[]) : [];

  return {
    settings: {
      shiftStart, shiftEnd, gracePeriod, breakStart, breakEnd, weeklyOffDays,
      shiftStartMin: _min(shiftStart),
      shiftEndMin:   _min(shiftEnd),
      breakStartMin: _min(breakStart),
      breakEndMin:   _min(breakEnd),
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

// ── Step 3: fetchHolidayMap ───────────────────────────────────────────────────
//
// Fetch hari libur satu kali sebelum loop per-entry.
// Return: Map<'YYYY-MM-DD', namaLibur> — mencakup libur nasional (store_id IS NULL)
//         dan libur khusus toko (store_id = storeId).
// Jika tanggal ada di map → entry dipersist sebagai status 'libur',
// scan diabaikan (clock_in/out = null, penalty = 0).

async function fetchHolidayMap(
  storeId: number,
  dates: string[]
): Promise<Map<string, string>> {
  if (dates.length === 0) return new Map();

  const { data, error } = await supabaseAny
    .from('work_holidays')
    .select('date, name')
    .in('date', dates)
    .or(`store_id.eq.${storeId},store_id.is.null`);

  if (error) throw new Error(`Gagal fetch hari libur: ${error.message}`);

  const map = new Map<string, string>();
  (data ?? []).forEach((row: { date: string; name: string }) =>
    map.set(row.date, row.name)
  );
  return map;
}

// ── Step 4: validateScanWindow ────────────────────────────────────────────────
//
// HANYA memvalidasi — tidak memfilter array scan.
// scans asli tetap menjadi source of truth untuk selectClockIn/Out.
//
// Return: { pass: true } jika minimal satu scan berada dalam window clock-in
//         ATAU window clock-out.
//         { pass: false, reason } jika semua scan di luar kedua window (entry dilewati).

function validateScanWindow(
  scans: string[],
  s: AttendanceEngineSettings,
  fingerprintId: string,
  date: string
): { pass: true } | { pass: false; reason: string } {
  const hasValidScan = scans.some(
    (t) => isInClockInWindow(t, s) || isInClockOutWindow(t, s)
  );

  if (!hasValidScan) {
    return {
      pass: false,
      reason:
        `Fingerprint ID ${fingerprintId} / ${date}: ` +
        `Semua scan berada di luar aturan absensi ` +
        `(window masuk ${_fmt(s.shiftStartMin - 60)}–${_fmt(s.shiftStartMin + 120)}, ` +
        `window pulang ${_fmt(s.shiftEndMin - 120)}–${_fmt(s.shiftEndMin + MAX_CLOCK_OUT_AFTER_SHIFT)}). Dilewati.`,
    };
  }

  return { pass: true };
}

// ── Step 5: selectClockIn ─────────────────────────────────────────────────────
//
// Menerima scans asli. Mengembalikan scan pertama dalam window clock-in.
// Jika tidak ada scan dalam window → null (TIDAK fallback ke scans[0]).
//
// Window: shift_start - 60 menit  s/d  shift_start + 120 menit

function selectClockIn(
  scans: string[],
  s: AttendanceEngineSettings
): string | null {
  const inWindow = scans.filter((t) => isInClockInWindow(t, s));
  return inWindow.length > 0 ? inWindow[0] : null;
}

// ── Step 6: selectClockOut ────────────────────────────────────────────────────
//
// Menerima scans asli. Mengembalikan scan terakhir dalam window clock-out
// yang bukan clockIn itu sendiri.
// Scan di luar window clock-out (mis. 10:17 saat shift 08-17) diabaikan.
// Jika tidak ada kandidat valid → null.
//
// Window: shift_end - 120 menit  s/d  shift_end + MAX_CLOCK_OUT_AFTER_SHIFT

function selectClockOut(
  scans: string[],
  clockIn: string | null,
  s: AttendanceEngineSettings
): string | null {
  // Kandidat: scan dalam window clock-out, bukan clock-in
  const candidates = scans.filter(
    (t) => t !== clockIn && isInClockOutWindow(t, s)
  );

  if (candidates.length === 0) return null;

  // Deprioritisasi scan yang jatuh di window break
  const nonBreak = candidates.filter((t) => {
    const m = _min(t);
    return !(m >= s.breakStartMin && m <= s.breakEndMin);
  });

  const pool = nonBreak.length > 0 ? nonBreak : candidates;
  return pool[pool.length - 1];
}

// ── Step 7: calculatePenalty ──────────────────────────────────────────────────
//
// Keterlambatan = max(0, clock_in - shift_start)
// Penalty       = max(0, keterlambatan - grace_period)

function calculatePenalty(clockIn: string | null, s: AttendanceEngineSettings): number {
  if (!clockIn) return 0;
  const lateness = Math.max(0, _min(clockIn) - s.shiftStartMin);
  return Math.max(0, lateness - s.gracePeriod);
}

// ── Step 8: calculateDuration ─────────────────────────────────────────────────
//
// Durasi efektif = min(clock_out, shift_end) - max(clock_in, shift_start)
//                  dikurangi overlap dengan break.
// OT tidak dihitung — durasi dibatasi oleh shift_end.
// Dirancang untuk nanti mendukung: multiple break, OT threshold.

function calculateDuration(
  clockIn: string,
  clockOut: string | null,
  s: AttendanceEngineSettings
): number | null {
  if (!clockOut) return null;

  const ciMin = _min(clockIn);
  const coMin = _min(clockOut);

  // Effective window: dibatasi shift_start s/d shift_end
  const effStart = Math.max(ciMin, s.shiftStartMin);
  const effEnd   = Math.min(coMin, s.shiftEndMin);
  let dur = effEnd - effStart;

  // Kurangi overlap dengan break
  if (effStart < s.breakEndMin && effEnd > s.breakStartMin) {
    const bStart = Math.max(effStart, s.breakStartMin);
    const bEnd   = Math.min(effEnd,   s.breakEndMin);
    dur -= (bEnd - bStart);
  }

  return Math.max(0, dur);
}

// ── Step 9: calculateStatus ───────────────────────────────────────────────────
//
// clockIn valid → hadir.
// Kasus clockIn null sudah ditangani di pipeline sebelum fungsi ini dipanggil.

function calculateStatus(): AttendanceStatus {
  return 'hadir';
}

// ── Step 10: compareExistingAttendance ────────────────────────────────────────
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
    existing.clock_in         === day.clockIn          &&
    existing.clock_out        === day.clockOut         &&
    existing.duration_minutes === day.durationMinutes  &&
    existing.penalty_minutes  === day.penaltyMinutes   &&
    existing.status           === day.status;

  return { action: identical ? 'skip_identical' : 'update' };
}

// ── Step 11: persistAttendance ────────────────────────────────────────────────
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
      .upsert(batch, { onConflict: 'employee_id, attendance_date' });
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
// Orkestrasi seluruh step engine. Tidak mengandung business logic secara
// langsung — setiap keputusan didelegasikan ke fungsi step di atas.

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
    .select('id, employee_id, attendance_date, clock_in, clock_out, duration_minutes, penalty_minutes, status, is_manual_edit')
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

  // ── Fetch hari libur (satu kali, batch) ──────────────────────────────────
  let holidayMap = new Map<string, string>();
  try {
    holidayMap = await fetchHolidayMap(storeId, dates);
  } catch (e) {
    result.errors.push((e as Error).message);
    return result;
  }

  const toInsert: object[] = [];
  const toUpdate: { id: number; payload: object }[] = [];

  // ── Per-entry pipeline ────────────────────────────────────────────────────
  for (const { entry, employeeUuid } of validEntries) {
    const { fingerprintId, date, scans } = entry;

    // validateHoliday — lookup di Map yang sudah di-fetch
    // isDayOff — cek libur khusus (holidayMap) DAN libur mingguan (weeklyOffDays)
    const dayOff = isDayOff(date, holidayMap, settings.weeklyOffDays);
    if (dayOff.off) {
      // Persist sebagai 'libur' — scan diabaikan, penalty/duration = 0/null
      const holidayPayload = {
        employee_id:      employeeUuid,
        store_id:         Number(storeId),
        attendance_date:  date,
        clock_in:         null,
        clock_out:        null,
        duration_minutes: null,
        penalty_minutes:  0,
        status:           'libur' as AttendanceStatus,
        note:             dayOff.name,
        is_manual_edit:   false,
      };
      const existingRow = existingMap.get(`${employeeUuid}|${date}`);
      if (!existingRow) {
        toInsert.push(holidayPayload);
      } else if (!existingRow.is_manual_edit && existingRow.status !== 'libur') {
        toUpdate.push({ id: existingRow.id, payload: holidayPayload });
      }
      // jika sudah 'libur' atau manual edit, tidak ditimpa
      continue;
    }

    // validateScanWindow — validator saja, tidak memfilter scans
    const scanCheck = validateScanWindow(scans, settings, fingerprintId, date);
    if (!scanCheck.pass) {
      result.skipped++;
      result.skippedReasons.push(scanCheck.reason);
      continue;
    }

    // selectClockIn & selectClockOut menerima scans asli
    const clockIn  = selectClockIn(scans, settings);

    // Jika tidak ada scan dalam window clock-in → skip, jangan persist
    if (!clockIn) {
      result.skipped++;
      result.skippedReasons.push(
        `Fingerprint ID ${fingerprintId} / ${date}: Tidak ada scan dalam window jam masuk. Dilewati.`
      );
      continue;
    }

    const clockOut = selectClockOut(scans, clockIn, settings);

    // Sanity: clock_out tidak boleh lebih kecil dari clock_in
    if (clockOut && _min(clockOut) < _min(clockIn)) {
      result.skipped++;
      result.skippedReasons.push(
        `Fingerprint ID ${fingerprintId} / ${date}: ` +
        `Clock Out (${clockOut}) lebih kecil dari Clock In (${clockIn}). Dilewati.`
      );
      continue;
    }

    // calculatePenalty, calculateDuration, calculateStatus
    const day: DayResult = {
      clockIn,
      clockOut,
      penaltyMinutes:  calculatePenalty(clockIn, settings),
      durationMinutes: calculateDuration(clockIn, clockOut, settings),
      status:          calculateStatus(),
    };

    const payload = {
      employee_id:      employeeUuid,
      store_id:         Number(storeId),
      attendance_date:  date,
      clock_in:         day.clockIn,
      clock_out:        day.clockOut,
      duration_minutes: day.durationMinutes,
      penalty_minutes:  day.penaltyMinutes,
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