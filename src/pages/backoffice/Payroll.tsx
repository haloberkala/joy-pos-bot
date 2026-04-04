import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { employees, payrolls, generatePayroll, markPayrollTransferred } from '@/data/sdmData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatRupiah } from '@/lib/format';
import { Calculator, CheckCircle, FileText } from 'lucide-react';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function Payroll() {
  const { activeStoreId } = useAuth();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [slipDetail, setSlipDetail] = useState<number | null>(null);
  const [, setTick] = useState(0);

  const storePayrolls = useMemo(() =>
    payrolls.filter(p => p.store_id === activeStoreId && p.month === selectedMonth && p.year === selectedYear),
    [activeStoreId, selectedMonth, selectedYear, slipDetail]
  );

  const handleGenerate = () => {
    const newP = generatePayroll(activeStoreId, selectedMonth, selectedYear);
    if (newP.length === 0) {
      toast.info('Penggajian sudah digenerate untuk periode ini');
    } else {
      toast.success(`${newP.length} slip gaji berhasil digenerate`);
    }
    setTick(t => t + 1);
  };

  const handleTransfer = (id: number) => {
    markPayrollTransferred(id);
    toast.success('Ditandai sudah transfer');
    setTick(t => t + 1);
  };

  const slipPayroll = slipDetail ? payrolls.find(p => p.id === slipDetail) : null;
  const slipEmployee = slipPayroll ? employees.find(e => e.id === slipPayroll.employee_id) : null;

  const totalGaji = storePayrolls.reduce((s, p) => s + p.total_salary, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Penggajian</h1>
        <Button onClick={handleGenerate}><Calculator className="w-4 h-4 mr-2" />Generate Gaji</Button>
      </div>

      {/* Period selector */}
      <div className="flex gap-3 items-center">
        <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y =>
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            )}
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm font-medium">Total: <span className="text-primary">{formatRupiah(totalGaji)}</span></div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Karyawan</TableHead>
              <TableHead>Jabatan</TableHead>
              <TableHead className="text-right">Gaji/Hari</TableHead>
              <TableHead className="text-right">Hari Hadir</TableHead>
              <TableHead className="text-right">Total Gaji</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {storePayrolls.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Belum ada data. Klik "Generate Gaji" untuk menghitung.</TableCell></TableRow>
            )}
            {storePayrolls.map(p => {
              const emp = employees.find(e => e.id === p.employee_id);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{emp?.name}</TableCell>
                  <TableCell>{emp?.position}</TableCell>
                  <TableCell className="text-right">{formatRupiah(p.daily_salary)}</TableCell>
                  <TableCell className="text-right">{p.days_present} hari</TableCell>
                  <TableCell className="text-right font-semibold">{formatRupiah(p.total_salary)}</TableCell>
                  <TableCell>
                    {p.status === 'transferred'
                      ? <Badge className="bg-green-100 text-green-800">Sudah Transfer</Badge>
                      : <Badge variant="outline" className="text-yellow-700 border-yellow-300">Pending</Badge>
                    }
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => setSlipDetail(p.id)}><FileText className="w-4 h-4" /></Button>
                    {p.status === 'pending' && (
                      <Button variant="outline" size="sm" onClick={() => handleTransfer(p.id)}>
                        <CheckCircle className="w-4 h-4 mr-1" />Transfer
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Slip Detail */}
      <Dialog open={!!slipDetail} onOpenChange={() => setSlipDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Slip Gaji</DialogTitle></DialogHeader>
          {slipPayroll && slipEmployee && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-muted-foreground">Nama</p><p className="font-medium">{slipEmployee.name}</p>
                <p className="text-muted-foreground">Jabatan</p><p>{slipEmployee.position}</p>
                <p className="text-muted-foreground">Periode</p><p>{MONTHS[slipPayroll.month - 1]} {slipPayroll.year}</p>
              </div>
              <div className="border-t border-border pt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span>Gaji Harian</span><span>{formatRupiah(slipPayroll.daily_salary)}</span></div>
                <div className="flex justify-between"><span>Hari Hadir</span><span>{slipPayroll.days_present} hari</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total Gaji</span><span className="text-primary">{formatRupiah(slipPayroll.total_salary)}</span></div>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Status: </span>
                {slipPayroll.status === 'transferred'
                  ? <Badge className="bg-green-100 text-green-800">Sudah Transfer</Badge>
                  : <Badge variant="outline" className="text-yellow-700">Pending</Badge>
                }
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
