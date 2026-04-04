import { Employee, Attendance, Payroll } from '@/types/pos';

// ================ EMPLOYEES ================
export let employees: Employee[] = [
  { id: 1, store_id: 1, name: 'Budi Admin', position: 'Kepala Toko', phone: '08123456001', daily_salary: 150000, role: 'admin', start_date: new Date('2023-01-15'), status: 'active', created_at: new Date(), updated_at: new Date() },
  { id: 2, store_id: 1, name: 'Citra Kasir', position: 'Kasir', phone: '08123456002', daily_salary: 100000, role: 'cashier', start_date: new Date('2023-03-01'), status: 'active', created_at: new Date(), updated_at: new Date() },
  { id: 3, store_id: 1, name: 'Doni Mekanik', position: 'Mekanik', phone: '08123456003', daily_salary: 120000, role: 'employee', start_date: new Date('2023-06-01'), status: 'active', created_at: new Date(), updated_at: new Date() },
  { id: 4, store_id: 1, name: 'Eka Helper', position: 'Helper', phone: '08123456004', daily_salary: 80000, role: 'employee', start_date: new Date('2024-01-10'), status: 'active', created_at: new Date(), updated_at: new Date() },
  { id: 5, store_id: 2, name: 'Dewi Admin', position: 'Kepala Toko', phone: '08123456005', daily_salary: 150000, role: 'admin', start_date: new Date('2023-06-15'), status: 'active', created_at: new Date(), updated_at: new Date() },
  { id: 6, store_id: 2, name: 'Eko Kasir', position: 'Kasir', phone: '08123456006', daily_salary: 100000, role: 'cashier', start_date: new Date('2023-08-01'), status: 'active', created_at: new Date(), updated_at: new Date() },
  { id: 7, store_id: 1, name: 'Fajar Guard', position: 'Satpam', phone: '08123456007', daily_salary: 90000, role: 'employee', start_date: new Date('2023-02-01'), status: 'inactive', created_at: new Date(), updated_at: new Date() },
];

// Generate attendance for current month
function generateAttendance(): Attendance[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const records: Attendance[] = [];
  let id = 1;
  const activeEmps = employees.filter(e => e.status === 'active');

  for (const emp of activeEmps) {
    for (let day = 1; day <= Math.min(now.getDate(), 28); day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 0) continue; // skip Sunday
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const rand = Math.random();
      let status: Attendance['status'] = 'hadir';
      let note = '';
      let clockIn: string | null = `0${7 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
      let clockOut: string | null = `${16 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;

      if (rand > 0.92) { status = 'sakit'; note = 'Sakit demam'; clockIn = null; clockOut = null; }
      else if (rand > 0.88) { status = 'izin'; note = 'Urusan keluarga'; clockIn = null; clockOut = null; }
      else if (rand > 0.85) { status = 'alpha'; clockIn = null; clockOut = null; }

      const dur = (clockIn && clockOut) ? Math.floor((parseInt(clockOut) - parseInt(clockIn)) * 60 + (parseInt(clockOut.split(':')[1]) - parseInt(clockIn.split(':')[1]))) : null;

      records.push({
        id: id++, store_id: emp.store_id, employee_id: emp.id, date: dateStr,
        clock_in: clockIn, clock_out: clockOut, duration_minutes: dur, status, note,
        is_manual_edit: false, created_at: new Date(), updated_at: new Date(),
      });
    }
  }
  return records;
}

export let attendances: Attendance[] = generateAttendance();

// ================ PAYROLL ================
export let payrolls: Payroll[] = [
  // Previous month sample
  ...employees.filter(e => e.status === 'active').map((emp, i) => {
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const daysPresent = 22 + Math.floor(Math.random() * 4);
    return {
      id: i + 1, store_id: emp.store_id, employee_id: emp.id,
      month: prevMonth, year: prevYear,
      days_present: daysPresent, daily_salary: emp.daily_salary,
      total_salary: daysPresent * emp.daily_salary,
      status: 'transferred' as const,
      transferred_at: new Date(prevYear, prevMonth - 1, 28),
      note: '', created_at: new Date(), updated_at: new Date(),
    };
  }),
];

// Helper functions
export function addEmployee(emp: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Employee {
  const newEmp: Employee = { ...emp, id: Date.now(), created_at: new Date(), updated_at: new Date() };
  employees = [...employees, newEmp];
  return newEmp;
}

export function updateEmployee(id: number, data: Partial<Employee>): void {
  employees = employees.map(e => e.id === id ? { ...e, ...data, updated_at: new Date() } : e);
}

export function updateAttendance(id: number, data: Partial<Attendance>): void {
  attendances = attendances.map(a => a.id === id ? { ...a, ...data, is_manual_edit: true, updated_at: new Date() } : a);
}

export function markPayrollTransferred(id: number): void {
  payrolls = payrolls.map(p => p.id === id ? { ...p, status: 'transferred' as const, transferred_at: new Date(), updated_at: new Date() } : p);
}

export function generatePayroll(storeId: number, month: number, year: number): Payroll[] {
  const storeEmps = employees.filter(e => e.store_id === storeId && e.status === 'active');
  const newPayrolls: Payroll[] = [];

  for (const emp of storeEmps) {
    const existing = payrolls.find(p => p.employee_id === emp.id && p.month === month && p.year === year);
    if (existing) continue;

    const monthStr = String(month).padStart(2, '0');
    const empAttendances = attendances.filter(a =>
      a.employee_id === emp.id && a.date.startsWith(`${year}-${monthStr}`) && a.status === 'hadir'
    );
    const daysPresent = empAttendances.length;
    const payroll: Payroll = {
      id: Date.now() + emp.id, store_id: storeId, employee_id: emp.id,
      month, year, days_present: daysPresent, daily_salary: emp.daily_salary,
      total_salary: daysPresent * emp.daily_salary,
      status: 'pending', transferred_at: null, note: '',
      created_at: new Date(), updated_at: new Date(),
    };
    newPayrolls.push(payroll);
  }

  payrolls = [...payrolls, ...newPayrolls];
  return newPayrolls;
}
