import { supabase } from '@/lib/supabase';

export interface Attendance {
  id: number;
  employee_id: string; // UUID
  store_id: number;
  attendance_date: string;
  clock_in: string | null;
  clock_out: string | null;
  duration_minutes: number | null;
  status: 'hadir' | 'alpha' | 'izin' | 'sakit' | 'cuti';
  note: string;
  is_manual_edit: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAttendanceInput {
  employee_id: string; // UUID
  store_id: number;
  attendance_date: string;
  clock_in?: string;
  clock_out?: string;
  duration_minutes?: number;
  status: 'hadir' | 'alpha' | 'izin' | 'sakit' | 'cuti';
  note?: string;
}

export interface UpdateAttendanceInput {
  status?: 'hadir' | 'alpha' | 'izin' | 'sakit' | 'cuti';
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
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

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
    const updateData: any = {};
    
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
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

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

    data?.forEach((att: any) => {
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
