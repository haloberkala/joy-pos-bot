import type { Attendance } from '@/services/attendanceService';

export interface AttendanceSummary {
  completeDays: number;
  partialDays: number;
  incompleteDays: number;
  daysPresent: number;
}

export interface PayrollCalculation extends AttendanceSummary {
  dailySalary: number;
  totalSalary: number;
}

/**
 * Pure function: Calculate attendance summary from attendance records
 * No side effects, no database access
 */
export function calculateAttendanceSummary(attendances: Attendance[]): AttendanceSummary {
  let completeDays = 0;
  let partialDays = 0;
  let incompleteDays = 0;

  for (const att of attendances) {
    if (att.status === 'complete') {
      completeDays++;
    } else if (att.status === 'partial') {
      partialDays++;
    } else if (att.status === 'incomplete') {
      incompleteDays++;
    }
  }

  const daysPresent = completeDays + partialDays;

  return {
    completeDays,
    partialDays,
    incompleteDays,
    daysPresent,
  };
}

/**
 * Pure function: Calculate payroll salary
 * Business rules:
 * - complete = 100% daily salary
 * - partial = 50% daily salary
 * - incomplete = 0%
 */
export function calculatePayrollSalary(
  summary: AttendanceSummary,
  dailySalary: number
): PayrollCalculation {
  const totalSalary = 
    (summary.completeDays * dailySalary) + 
    (summary.partialDays * (dailySalary / 2));

  return {
    ...summary,
    dailySalary,
    totalSalary,
  };
}

/**
 * Pure function: Group attendances by employee ID
 * O(n) complexity
 */
export function groupAttendancesByEmployee(
  attendances: Attendance[]
): Map<string, Attendance[]> {
  const grouped = new Map<string, Attendance[]>();

  for (const att of attendances) {
    const existing = grouped.get(att.employee_id);
    if (existing) {
      existing.push(att);
    } else {
      grouped.set(att.employee_id, [att]);
    }
  }

  return grouped;
}
