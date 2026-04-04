import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { attendances, employees, updateAttendance } from '@/data/sdmData';
import { Attendance as AttendanceType, AttendanceStatus } from '@/types/pos';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  hadir: 'Hadir', sakit: 'Sakit', izin: 'Izin', cuti: 'Cuti', alpha: 'Alpha',
};
const STATUS_COLORS: Record<AttendanceStatus, string> = {
  hadir: 'bg-green-100 text-green-800', sakit: 'bg-yellow-100 text-yellow-800',
  izin: 'bg-blue-100 text-blue-800', cuti: 'bg-purple-100 text-purple-800',
  alpha: 'bg-red-100 text-red-800',
};

export default function Attendance() {
  const { activeStoreId } = useAuth();
  const now = new Date();
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editRow, setEditRow] = useState<AttendanceType | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('hadir');
  const [editNote, setEditNote] = useState('');
  const [, setTick] = useState(0);

  const storeEmployees = useMemo(() => employees.filter(e => e.store_id === activeStoreId), [activeStoreId]);

  const filtered = useMemo(() => {
    return attendances.filter(a => {
      const emp = employees.find(e => e.id === a.employee_id);
      if (!emp || emp.store_id !== activeStoreId) return false;
      if (filterEmployee !== 'all' && a.employee_id !== Number(filterEmployee)) return false;
      if (filterMonth && !a.date.startsWith(filterMonth)) return false;
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [activeStoreId, filterEmployee, filterMonth, filterStatus, editRow]);

  // Monthly summary
  const summary = useMemo(() => {
    const map: Record<number, Record<AttendanceStatus, number>> = {};
    for (const a of filtered) {
      if (!map[a.employee_id]) map[a.employee_id] = { hadir: 0, sakit: 0, izin: 0, cuti: 0, alpha: 0 };
      map[a.employee_id][a.status]++;
    }
    return map;
  }, [filtered]);

  const openEdit = (row: AttendanceType) => {
    setEditRow(row);
    setEditStatus(row.status);
    setEditNote(row.note);
  };

  const saveEdit = () => {
    if (!editRow) return;
    if (['sakit', 'izin', 'cuti'].includes(editStatus) && !editNote.trim()) {
      toast.error('Keterangan wajib diisi untuk status Sakit/Izin/Cuti');
      return;
    }
    updateAttendance(editRow.id, { status: editStatus, note: editNote.trim() });
    toast.success('Absensi berhasil diperbarui');
    setEditRow(null);
    setTick(t => t + 1);
  };

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
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Monthly Summary Cards */}
      {filterEmployee === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {storeEmployees.filter(e => e.status === 'active').map(emp => {
            const s = summary[emp.id] || { hadir: 0, sakit: 0, izin: 0, cuti: 0, alpha: 0 };
            return (
              <div key={emp.id} className="bg-card border border-border rounded-lg p-3">
                <p className="font-medium text-sm">{emp.name}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="bg-green-50 text-green-700">H:{s.hadir}</Badge>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">S:{s.sakit}</Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">I:{s.izin}</Badge>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700">C:{s.cuti}</Badge>
                  <Badge variant="outline" className="bg-red-50 text-red-700">A:{s.alpha}</Badge>
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
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{emp?.name}</TableCell>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.clock_in || '-'}</TableCell>
                  <TableCell>{row.clock_out || '-'}</TableCell>
                  <TableCell>{durH !== null ? `${durH}j ${durM}m` : '-'}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[row.status]}>{STATUS_LABELS[row.status]}</Badge>
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
              {employees.find(e => e.id === editRow?.employee_id)?.name} — {editRow?.date}
            </p>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={editStatus} onValueChange={v => setEditStatus(v as AttendanceStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">
                Keterangan {['sakit', 'izin', 'cuti'].includes(editStatus) && <span className="text-destructive">*</span>}
              </label>
              <Input value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Isi keterangan..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>Batal</Button>
            <Button onClick={saveEdit}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
