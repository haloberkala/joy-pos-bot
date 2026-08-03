import { useMemo, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAttendancesByStore } from '@/services/attendanceService';
import { getEmployeesByStore } from '@/services/employeesService';
import { calculateAttendanceSummary } from '@/lib/payroll/calculations';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function Evaluation() {
  const { activeStoreId } = useAuth();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [isLoading, setIsLoading] = useState(true);

  // Data from Supabase
  const [attendances, setAttendances] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!activeStoreId) return;
    try {
      setIsLoading(true);
      const [attendancesData, employeesData] = await Promise.all([
        getAttendancesByStore(activeStoreId, { year: selectedYear, month: selectedMonth }),
        getEmployeesByStore(activeStoreId),
      ]);
      setAttendances(attendancesData);
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data evaluasi');
    } finally {
      setIsLoading(false);
    }
  }, [activeStoreId, selectedYear, selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Data sudah difilter server-side, cukup filter active employees saja
  const storeEmployees = useMemo(
    () => employees.filter(e => e.is_active),
    [employees]
  );

  // Group attendances by employee ID (O(n), single pass)
  const attendancesByEmployee = useMemo(() => {
    const grouped = new Map<string, typeof attendances>();
    for (const att of attendances) {
      const existing = grouped.get(att.employee_id);
      if (existing) {
        existing.push(att);
      } else {
        grouped.set(att.employee_id, [att]);
      }
    }
    return grouped;
  }, [attendances]);

  const evalData = useMemo(() => {
    return storeEmployees.map(emp => {
      // O(1) lookup instead of O(n) filter
      const empAtt = attendancesByEmployee.get(emp.id) || [];
      const total = empAtt.length;
      
      // Use shared calculation logic
      const summary = calculateAttendanceSummary(empAtt);
      const rate = total > 0 ? Math.round((summary.daysPresent / total) * 100) : 0;
      
      return { 
        emp, 
        total, 
        completeDays: summary.completeDays, 
        partialDays: summary.partialDays, 
        incompleteDays: summary.incompleteDays, 
        hadir: summary.daysPresent, 
        rate 
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [storeEmployees, attendancesByEmployee]);

  const getRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Evaluasi Karyawan</h1>
        <p className="text-muted-foreground">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">Evaluasi Karyawan</h1>
          <p className="text-sm text-muted-foreground">
            Rekap kehadiran {MONTHS[selectedMonth - 1]} {selectedYear}
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Jabatan</TableHead>
              <TableHead className="text-right">Total Hari</TableHead>
              <TableHead className="text-right">Hadir Penuh</TableHead>
              <TableHead className="text-right">Hadir Sebagian</TableHead>
              <TableHead className="text-right">Belum Lengkap</TableHead>
              <TableHead>Kehadiran (%)</TableHead>
              <TableHead>Penilaian</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evalData.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Tidak ada data evaluasi untuk periode ini
                </TableCell>
              </TableRow>
            )}
            {evalData.map(({ emp, total, completeDays, partialDays, incompleteDays, rate }) => (
              <TableRow key={emp.id}>
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell>{emp.position}</TableCell>
                <TableCell className="text-right">{total}</TableCell>
                <TableCell className="text-right">{completeDays}</TableCell>
                <TableCell className="text-right">{partialDays}</TableCell>
                <TableCell className="text-right">{incompleteDays}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={rate} className="w-20 h-2" />
                    <span className={`text-sm font-medium ${getRateColor(rate)}`}>{rate}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  {rate >= 90
                    ? <Badge className="bg-green-100 text-green-800">Sangat Baik</Badge>
                    : rate >= 70
                      ? <Badge className="bg-yellow-100 text-yellow-800">Baik</Badge>
                      : <Badge className="bg-red-100 text-red-800">Perlu Perhatian</Badge>
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
