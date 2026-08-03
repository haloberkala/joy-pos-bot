import { supabase } from '@/lib/supabase';
import { getEmployeesByStore } from './employeesService';
import { getAttendancesByStore } from './attendanceService';
import { 
  calculateAttendanceSummary, 
  calculatePayrollSalary,
  groupAttendancesByEmployee 
} from '@/lib/payroll/calculations';

export interface Payroll {
  id: number;
  employee_id: string; // UUID
  store_id: number;
  month: number;
  year: number;
  daily_salary: number;
  days_present: number;
  total_salary: number;
  status: 'pending' | 'transferred';
  transferred_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePayrollInput {
  employee_id: string; // UUID
  store_id: number;
  month: number;
  year: number;
  daily_salary: number;
  days_present: number;
  total_salary: number;
  status?: 'pending' | 'transferred';
  note?: string;
}

/**
 * Get payrolls by store
 */
export async function getPayrollsByStore(storeId: number): Promise<Payroll[]> {
  try {
    const { data, error } = await supabase
      .from('payrolls')
      .select('*')
      .eq('store_id', storeId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching payrolls:', error);
    throw error;
  }
}

/**
 * Get payrolls by period
 */
export async function getPayrollsByPeriod(
  storeId: number,
  year: number,
  month: number
): Promise<Payroll[]> {
  try {
    const { data, error } = await supabase
      .from('payrolls')
      .select('*')
      .eq('store_id', storeId)
      .eq('year', year)
      .eq('month', month);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching period payrolls:', error);
    throw error;
  }
}

/**
 * Create payroll
 */
export async function createPayroll(input: CreatePayrollInput): Promise<Payroll> {
  try {
    const { data, error } = await supabase
      .from('payrolls')
      .insert({
        employee_id: input.employee_id,
        store_id: input.store_id,
        month: input.month,
        year: input.year,
        daily_salary: input.daily_salary,
        days_present: input.days_present,
        total_salary: input.total_salary,
        status: input.status || 'pending',
        note: input.note || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating payroll:', error);
    throw error;
  }
}

/**
 * Update payroll status to transferred
 */
export async function markPayrollTransferred(id: number): Promise<Payroll> {
  try {
    const { data, error } = await supabase
      .from('payrolls')
      .update({
        status: 'transferred',
        transferred_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error marking payroll transferred:', error);
    throw error;
  }
}

/**
 * Delete payroll
 */
export async function deletePayroll(id: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('payrolls')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting payroll:', error);
    throw error;
  }
}

/**
 * Delete all payrolls for a given period
 */
export async function deletePayrollsByMonth(storeId: number, year: number, month: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('payrolls')
      .delete()
      .eq('store_id', storeId)
      .eq('year', year)
      .eq('month', month);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting payrolls by month:', error);
    throw error;
  }
}

/**
 * Generate payrolls for all active employees in a store for a given month
 * Optimized: Single query for employees and attendances, then process in memory
 */
export async function generatePayrollsForMonth(
  storeId: number,
  year: number,
  month: number
): Promise<Payroll[]> {
  try {
    // Check if payrolls already exist for this period
    const existing = await getPayrollsByPeriod(storeId, year, month);
    if (existing.length > 0) {
      return []; // Already generated
    }

    // Step 1: Load all data in parallel (2 queries only, no N+1)
    const [employees, attendances] = await Promise.all([
      getEmployeesByStore(storeId),
      getAttendancesByStore(storeId, { year, month }),
    ]);

    // Step 2: Filter active employees
    const activeEmployees = employees.filter(e => e.is_active);

    // Step 3: Group attendances by employee (O(n), single pass)
    const attendancesByEmployee = groupAttendancesByEmployee(attendances);

    // Step 4: Calculate payroll for each employee (O(n), no additional queries)
    const newPayrolls: Payroll[] = [];

    for (const employee of activeEmployees) {
      const employeeAttendances = attendancesByEmployee.get(employee.id) || [];
      const dailySalary = employee.daily_salary || 0;

      // Pure calculation, no side effects
      const summary = calculateAttendanceSummary(employeeAttendances);
      const calculation = calculatePayrollSalary(summary, dailySalary);

      // Create payroll record
      const payroll = await createPayroll({
        employee_id: employee.id,
        store_id: storeId,
        month,
        year,
        daily_salary: calculation.dailySalary,
        days_present: calculation.daysPresent,
        total_salary: calculation.totalSalary,
        status: 'pending',
      });

      newPayrolls.push(payroll);
    }

    return newPayrolls;
  } catch (error) {
    console.error('Error generating payrolls:', error);
    throw error;
  }
}
