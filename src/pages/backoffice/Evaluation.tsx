import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { employees, attendances } from '@/data/sdmData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function Evaluation() {
  const { activeStoreId } = useAuth();
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const storeEmployees = useMemo(() => employees.filter(e => e.store_id === activeStoreId && e.status === 'active'), [activeStoreId]);

  const evalData = useMemo(() => {
    return storeEmployees.map(emp => {
      const empAtt = attendances.filter(a => a.employee_id === emp.id && a.date.startsWith(monthStr));
      const total = empAtt.length;
      const hadir = empAtt.filter(a => a.status === 'hadir').length;
      const alpha = empAtt.filter(a => a.status === 'alpha').length;
      const rate = total > 0 ? Math.round((hadir / total) * 100) : 0;
      return { emp, total, hadir, alpha, rate };
    }).sort((a, b) => b.rate - a.rate);
  }, [storeEmployees, monthStr]);

  const getRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Evaluasi Karyawan</h1>
      <p className="text-sm text-muted-foreground">Evaluasi kehadiran bulan {now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>

      <div className="bg-card border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Jabatan</TableHead>
              <TableHead className="text-right">Total Hari</TableHead>
              <TableHead className="text-right">Hadir</TableHead>
              <TableHead className="text-right">Alpha</TableHead>
              <TableHead>Tingkat Kehadiran</TableHead>
              <TableHead>Penilaian</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evalData.map(({ emp, total, hadir, alpha, rate }) => (
              <TableRow key={emp.id}>
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell>{emp.position}</TableCell>
                <TableCell className="text-right">{total}</TableCell>
                <TableCell className="text-right">{hadir}</TableCell>
                <TableCell className="text-right">{alpha}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={rate} className="w-20 h-2" />
                    <span className={`text-sm font-medium ${getRateColor(rate)}`}>{rate}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  {rate >= 90 ? <Badge className="bg-green-100 text-green-800">Sangat Baik</Badge>
                    : rate >= 70 ? <Badge className="bg-yellow-100 text-yellow-800">Baik</Badge>
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
