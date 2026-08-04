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
// ATTENDANCE ENGINE — NEW ARCHITECTURE (2026-08-04)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Engine baru dipindahkan ke /lib/attendance/*
// File ini hanya sebagai wrapper untuk backward compatibility.
//
// Pipeline Baru:
//   AttendanceDetector → AttendanceClassifier → AttendanceRecovery → AttendancePersistence
//
// Lihat dokumentasi lengkap di:
//   - src/lib/attendance/AttendanceDetector.ts
//   - src/lib/attendance/AttendanceClassifier.ts
//   - src/lib/attendance/AttendanceRecovery.ts
//   - src/lib/attendance/AttendancePersistence.ts
//   - src/lib/attendance/AttendanceEngine.ts
//
// ═══════════════════════════════════════════════════════════════════════════════

import { importFromAttlog as engineImportFromAttlog } from '@/lib/attendance/AttendanceEngine';

// Re-export untuk backward compatibility
export async function importFromAttlog(
  entries: Array<{
    fingerprintId: string;
    date: string;
    scans: string[];
  }>,
  storeId: number
): Promise<{
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  skippedReasons: string[];
}> {
  return engineImportFromAttlog(entries, storeId);
}