import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAttendancesByStore, updateAttendance, Attendance } from '@/services/attendanceService';
import { getEmployeesByStore } from '@/services/employeesService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';

type SimpleStatus = 'hadir' | 'tidak_hadir';

const STATUS_LABELS: Record<SimpleStatus, string> = {
  hadir: 'Hadir',
  tidak_hadir: 'Tidak Hadir',
};
const STATUS_COLORS: Record<SimpleStatus, string> = {
  hadir: 'bg-green-100 text-green-800',
  tidak_hadir: 'bg-red-100 text-red-800',
};

function toSimpleStatus(s: string): SimpleStatus {
  return s === 'hadir' ? 'hadir' : 'tidak_hadir';
}

export default function AttendancePage() {
  const { activeStoreId } = useAuth();
  const now = new Date();
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editRow, setEditRow] = useState<Attendance | null>(null);
  const [editStatus, setEditStatus] = useState<SimpleStatus>('hadir');
  const [editNote, setEditNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Data from Supabase
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Load data from Supabase
  useEffect(() => {
    loadData();
  }, [activeStoreId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [attendancesData, employeesData] = await Promise.all([
        getAttendancesByStore(activeStoreId),
        getEmployeesByStore(activeStoreId),
      ]);
      
      setAttendances(attendancesData);
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data absensi');
    } finally {
      setIsLoading(false);
    }
  };

  const storeEmployees = useMemo(() => employees.filter(e => e.store_id === activeStoreId), [employees, activeStoreId]);

  const filtered = useMemo(() => {
    return attendances.filter(a => {
      const emp = employees.find(e => e.id === a.employee_id);
      if (!emp || emp.store_id !== activeStoreId) return false;
      if (filterEmployee !== 'all' && String(a.employee_id) !== String(filterEmployee)) return false;
      if (filterMonth && !a.attendance_date.startsWith(filterMonth)) return false;
      if (filterStatus !== 'all') {
        const simple = toSimpleStatus(a.status);
        if (simple !== filterStatus) return false;
      }
      return true;
    }).sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));
  }, [attendances, employees, activeStoreId, filterEmployee, filterMonth, filterStatus]);

  // Monthly summary
  const summary = useMemo(() => {
    const map: Record<number, { hadir: number; tidak_hadir: number }> = {};
    for (const a of filtered) {
      if (!map[a.employee_id]) map[a.employee_id] = { hadir: 0, tidak_hadir: 0 };
      const simple = toSimpleStatus(a.status);
      map[a.employee_id][simple]++;
    }
    return map;
  }, [filtered]);

  const openEdit = (row: Attendance) => {
    setEditRow(row);
    setEditStatus(toSimpleStatus(row.status));
    setEditNote(row.note);
  };

  const saveEdit = async () => {
    if (!editRow) return;
    
    try {
      setIsSaving(true);
      
      // Map simple status back to the original type format
      const mappedStatus = editStatus === 'hadir' ? 'hadir' : 'alpha';
      
      await updateAttendance(editRow.id, { 
        status: mappedStatus as any, 
        note: editNote.trim(),
        is_manual_edit: true,
      });
      
      await loadData();
      toast.success('Absensi berhasil diperbarui');
      setEditRow(null);
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Gagal memperbarui absensi');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Rekap Absensi</h1>
        <p className="text-muted-foreground">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Rekap Absensi</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Semua Karyawan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Karyawan</SelectItem>
            {storeEmployees.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-44" />

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Semua Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="hadir">Hadir</SelectItem>
            <SelectItem value="tidak_hadir">Tidak Hadir</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Monthly Summary Cards */}
      {filterEmployee === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {storeEmployees.filter(e => e.is_active).map(emp => {
            const s = summary[emp.id] || { hadir: 0, tidak_hadir: 0 };
            return (
              <div key={emp.id} className="bg-card border border-border rounded-lg p-3">
                <p className="font-medium text-sm">{emp.name}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="bg-green-50 text-green-700">Hadir: {s.hadir}</Badge>
                  <Badge variant="outline" className="bg-red-50 text-red-700">Tidak Hadir: {s.tidak_hadir}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-card border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Jam Masuk</TableHead>
              <TableHead>Jam Keluar</TableHead>
              <TableHead>Durasi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Tidak ada data absensi</TableCell></TableRow>
            )}
            {filtered.slice(0, 100).map(row => {
              const emp = employees.find(e => e.id === row.employee_id);
              const durH = row.duration_minutes ? Math.floor(row.duration_minutes / 60) : null;
              const durM = row.duration_minutes ? row.duration_minutes % 60 : null;
              const simple = toSimpleStatus(row.status);
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{emp?.name}</TableCell>
                  <TableCell>{row.attendance_date}</TableCell>
                  <TableCell>{row.clock_in || '-'}</TableCell>
                  <TableCell>{row.clock_out || '-'}</TableCell>
                  <TableCell>{durH !== null ? `${durH}j ${durM}m` : '-'}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[simple]}>{STATUS_LABELS[simple]}</Badge>
                    {row.is_manual_edit && <span className="ml-1 text-xs text-muted-foreground">(edit)</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.note}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Pencil className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editRow} onOpenChange={() => setEditRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Absensi</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {employees.find(e => e.id === editRow?.employee_id)?.name} — {editRow?.attendance_date}
            </p>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={editStatus} onValueChange={v => setEditStatus(v as SimpleStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hadir">Hadir</SelectItem>
                  <SelectItem value="tidak_hadir">Tidak Hadir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Keterangan</label>
              <Input value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Isi keterangan..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>Batal</Button>
            <Button onClick={saveEdit} disabled={isSaving}>
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
