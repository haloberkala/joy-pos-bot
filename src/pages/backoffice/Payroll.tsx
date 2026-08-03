import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getPayrollsByPeriod, 
  generatePayrollsForMonth, 
  markPayrollTransferred as markTransferred,
  deletePayrollsByMonth,
  Payroll 
} from '@/services/payrollService';
import { getEmployeesByStore } from '@/services/employeesService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { formatRupiah } from '@/lib/format';
import { Calculator, CheckCircle, FileText } from 'lucide-react';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function PayrollPage() {
  const { activeStoreId } = useAuth();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [slipDetail, setSlipDetail] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Data from Supabase
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Load data from Supabase
  useEffect(() => {
    loadData();
  }, [activeStoreId, selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [payrollsData, employeesData] = await Promise.all([
        getPayrollsByPeriod(activeStoreId, selectedYear, selectedMonth),
        getEmployeesByStore(activeStoreId),
      ]);
      
      setPayrolls(payrollsData);
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data penggajian');
    } finally {
      setIsLoading(false);
    }
  };

  const storePayrolls = useMemo(() => payrolls, [payrolls]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const newPayrolls = await generatePayrollsForMonth(activeStoreId, selectedYear, selectedMonth);
      
      if (newPayrolls.length === 0) {
        toast.info('Penggajian sudah digenerate untuk periode ini');
      } else {
        toast.success(`${newPayrolls.length} slip gaji berhasil digenerate`);
        await loadData();
      }
    } catch (error) {
      console.error('Error generating payroll:', error);
      toast.error('Gagal generate penggajian');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      await deletePayrollsByMonth(activeStoreId, selectedYear, selectedMonth);
      toast.success('Data gaji bulan ini berhasil di-reset');
      setIsResetDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error('Error resetting payroll:', error);
      toast.error('Gagal reset penggajian');
    } finally {
      setIsResetting(false);
    }
  };

  const handleTransfer = async (id: number) => {
    try {
      await markTransferred(id);
      await loadData();
      toast.success('Ditandai sudah transfer');
    } catch (error) {
      console.error('Error marking transferred:', error);
      toast.error('Gagal menandai transfer');
    }
  };

  const slipPayroll = slipDetail ? payrolls.find(p => p.id === slipDetail) : null;
  const slipEmployee = slipPayroll ? employees.find(e => e.id === slipPayroll.employee_id) : null;

  const totalGaji = storePayrolls.reduce((s, p) => s + p.total_salary, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Penggajian</h1>
        </div>
        <p className="text-muted-foreground">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Container */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold text-foreground">Penggajian</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Pastikan rekap absensi sudah benar sebelum generate gaji. Jika ada perubahan data absensi setelah generate, silakan gunakan tombol Reset dan lakukan Generate ulang.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => setIsResetDialogOpen(true)} disabled={isGenerating || isResetting}>
            Reset Gaji
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || isResetting}>
            <Calculator className="w-4 h-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Gaji'}
          </Button>
        </div>
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
                <div className="flex justify-between"><span>Hadir Penuh</span><span>{slipPayroll.complete_days} hari</span></div>
                <div className="flex justify-between"><span>Hadir Sebagian</span><span>{slipPayroll.partial_days} hari</span></div>
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

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Data Penggajian?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mereset/menghapus seluruh slip gaji untuk periode {MONTHS[selectedMonth - 1]} {selectedYear}? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isResetting}>
              {isResetting ? 'Mereset...' : 'Ya, Reset Gaji'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
