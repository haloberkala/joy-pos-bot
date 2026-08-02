import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { CalendarIcon, CalendarPlus, Pencil, Trash2, Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { getAttendancesByStore, updateAttendance, deleteAttendance, getAttendanceSetting, upsertAttendanceSetting, Attendance, AttendanceSetting } from '@/services/attendanceService';
import { getEmployeesByStore } from '@/services/employeesService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ZKTecoImportButton } from '@/components/backoffice/ZKTecoImportButton';
import { WorkHolidayDialog } from '@/components/backoffice/WorkHolidayDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type SimpleStatus = 'hadir' | 'tidak_hadir' | 'libur';

const STATUS_LABELS: Record<SimpleStatus, string> = {
  hadir:       'Hadir',
  tidak_hadir: 'Tidak Hadir',
  libur:       'Libur',
};
const STATUS_COLORS: Record<SimpleStatus, string> = {
  hadir:       'bg-green-100 text-green-800',
  tidak_hadir: 'bg-red-100 text-red-800',
  libur:       'bg-blue-100 text-blue-800',
};

function toSimpleStatus(s: string): SimpleStatus {
  if (s === 'hadir') return 'hadir';
  if (s === 'libur') return 'libur';
  return 'tidak_hadir';
}

export default function AttendancePage() {
  const { activeStoreId, user } = useAuth();
  const isOwner = user?.role === 'owner';

  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<Date | undefined>(new Date());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [editRow, setEditRow] = useState<Attendance | null>(null);
  const [editStatus, setEditStatus] = useState<SimpleStatus>('hadir');
  const [editNote, setEditNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Hari Libur
  const [holidaysOpen, setHolidaysOpen] = useState(false);

  const {
    register: registerSettings,
    handleSubmit: handleSaveSettings,
    reset: resetSettings,
  } = useForm<AttendanceSetting>();

  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

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

  const storeEmployees = useMemo(
    () => employees.filter((e) => e.store_id === activeStoreId),
    [employees, activeStoreId]
  );

  const filtered = useMemo(() => {
    const dateStr = filterDate ? format(filterDate, 'yyyy-MM-dd') : null;
    return attendances
      .filter((a) => {
        const emp = employees.find((e) => e.id === a.employee_id);
        if (!emp || emp.store_id !== activeStoreId) return false;
        if (filterEmployee !== 'all' && String(a.employee_id) !== String(filterEmployee)) return false;
        if (dateStr && a.attendance_date !== dateStr) return false;
        if (filterStatus !== 'all' && toSimpleStatus(a.status) !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));
  }, [attendances, employees, activeStoreId, filterEmployee, filterDate, filterStatus]);

  // Summary per karyawan (berdasarkan data yang sudah difilter)
  const summary = useMemo(() => {
    const map: Record<string, { hadir: number; tidak_hadir: number; libur: number }> = {};
    for (const a of filtered) {
      if (!map[a.employee_id]) map[a.employee_id] = { hadir: 0, tidak_hadir: 0, libur: 0 };
      map[a.employee_id][toSimpleStatus(a.status)]++;
    }
    return map;
  }, [filtered]);

  const openEdit = (row: Attendance) => {
    setEditRow(row);
    setEditStatus(toSimpleStatus(row.status));
    setEditNote(row.note ?? '');
  };

  const saveEdit = async () => {
    if (!editRow) return;
    try {
      setIsSaving(true);
      await updateAttendance(editRow.id, {
        status: (editStatus === 'hadir' ? 'hadir' : 'alpha') as any,
        note: editNote.trim(),
        is_manual_edit: true,
      });
      await loadData();
      toast.success('Absensi berhasil diperbarui');
      setEditRow(null);
    } catch {
      toast.error('Gagal memperbarui absensi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editRow) return;
    try {
      setIsDeleting(true);
      await deleteAttendance(editRow.id);
      await loadData();
      toast.success('Data absensi berhasil dihapus');
      setIsDeleteDialogOpen(false);
      setEditRow(null);
    } catch {
      toast.error('Gagal menghapus data absensi');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTime24h = (timeStr: string) => {
    if (!timeStr) return '';
    const parts = timeStr.match(/(\d+):(\d+)/);
    if (parts) return `${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
    return timeStr;
  };

  const openSettings = async () => {
    setSettingsOpen(true);
    if (!activeStoreId) return;
    try {
      const setting = await getAttendanceSetting(activeStoreId);
      if (setting) {
        resetSettings({
          ...setting,
          shift_start: formatTime24h(setting.shift_start),
          shift_end: formatTime24h(setting.shift_end),
          break_start: formatTime24h(setting.break_start),
          break_end: formatTime24h(setting.break_end),
        });
      } else {
        resetSettings({
          shift_start: '08:00',
          shift_end: '17:00',
          grace_period_minutes: 15,
          break_start: '12:00',
          break_end: '13:00',
        });
      }
    } catch {
      toast.error('Gagal memuat aturan absensi');
    }
  };

  const onSubmitSettings = async (data: AttendanceSetting) => {
    if (!activeStoreId) return;
    try {
      setIsSavingSettings(true);
      
      const payload = {
        ...data,
        shift_start: formatTime24h(data.shift_start),
        shift_end: formatTime24h(data.shift_end),
        break_start: formatTime24h(data.break_start),
        break_end: formatTime24h(data.break_end),
      };

      await upsertAttendanceSetting(activeStoreId, payload);
      toast.success('Aturan absensi berhasil disimpan');
      setSettingsOpen(false);
      await loadData();
    } catch {
      toast.error('Gagal menyimpan aturan absensi');
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Rekap Absensi</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Data kehadiran karyawan per hari</p>
          </div>
        </div>
        <p className="text-muted-foreground">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rekap Absensi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Data kehadiran karyawan berdasarkan Clock In dan Clock Out
          </p>
        </div>
        {activeStoreId && (
          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <Button variant="outline" onClick={() => setHolidaysOpen(true)}>
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Hari Libur
                </Button>
                <Button variant="outline" onClick={openSettings}>
                  <Settings className="w-4 h-4 mr-2" />
                  Aturan Absensi
                </Button>
              </>
            )}
            <ZKTecoImportButton storeId={activeStoreId} onSuccess={loadData} />
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua Karyawan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Karyawan</SelectItem>
            {storeEmployees.map((e) => (
              <SelectItem key={e.id} value={String(e.id)}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Picker harian */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-48 justify-start text-left font-normal',
                !filterDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filterDate
                ? format(filterDate, 'd MMMM yyyy', { locale: localeId })
                : 'Pilih tanggal'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filterDate}
              onSelect={(date) => {
                setFilterDate(date);
                setCalendarOpen(false);
              }}
              initialFocus
            />
            {filterDate && (
              <div className="border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => { setFilterDate(undefined); setCalendarOpen(false); }}
                >
                  Tampilkan semua tanggal
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="hadir">Hadir</SelectItem>
            <SelectItem value="tidak_hadir">Tidak Hadir</SelectItem>
            <SelectItem value="libur">Libur</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Summary Cards ── */}
      {filterEmployee === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {storeEmployees
            .filter((e) => e.is_active)
            .map((emp) => {
              const s = summary[emp.id] || { hadir: 0, tidak_hadir: 0, libur: 0 };
              const hasData = s.hadir > 0 || s.tidak_hadir > 0 || s.libur > 0;
              return (
                <div key={emp.id} className="bg-card border border-border rounded-lg p-3">
                  <p className="font-medium text-sm">{emp.name}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {hasData ? (
                      <>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Hadir: {s.hadir}
                        </Badge>
                        <Badge variant="outline" className="bg-red-50 text-red-700">
                          Tidak Hadir: {s.tidak_hadir}
                        </Badge>
                        {s.libur > 0 && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            Libur: {s.libur}
                          </Badge>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Tidak ada data</span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ── Attendance Table ── */}
      <div className="bg-card border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Jam Masuk</TableHead>
              <TableHead>Jam Keluar</TableHead>
              <TableHead>Durasi</TableHead>
              <TableHead>Terlambat</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Tidak ada data absensi
                </TableCell>
              </TableRow>
            )}
            {filtered.slice(0, 200).map((row) => {
              const emp = employees.find((e) => e.id === row.employee_id);
              const durH = row.duration_minutes ? Math.floor(row.duration_minutes / 60) : null;
              const durM = row.duration_minutes ? row.duration_minutes % 60 : null;
              const simple = toSimpleStatus(row.status);
              const lateMinutes = row.penalty_minutes || 0;
              
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{emp?.name}</TableCell>
                  <TableCell>{row.attendance_date}</TableCell>
                  <TableCell>{row.clock_in || '-'}</TableCell>
                  <TableCell>{row.clock_out || '-'}</TableCell>
                  <TableCell>{durH !== null ? `${durH}j ${durM}m` : '-'}</TableCell>
                  <TableCell>
                    {lateMinutes > 0 ? (
                      <span className="text-red-600 font-medium">{lateMinutes} menit</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[simple]}>{STATUS_LABELS[simple]}</Badge>
                    {row.is_manual_edit && (
                      <span className="ml-1 text-xs text-muted-foreground">(edit)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.note}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editRow} onOpenChange={() => setEditRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Absensi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {employees.find((e) => e.id === editRow?.employee_id)?.name} —{' '}
              {editRow?.attendance_date}
            </p>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as SimpleStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hadir">Hadir</SelectItem>
                  <SelectItem value="tidak_hadir">Tidak Hadir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Keterangan</label>
              <Input
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Isi keterangan..."
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {/* Tombol Hapus — hanya owner */}
            {isOwner && (
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isDeleting || isSaving}
                className="sm:mr-auto"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                {isDeleting ? 'Menghapus...' : 'Hapus Data'}
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditRow(null)}>
              Batal
            </Button>
            <Button onClick={saveEdit} disabled={isSaving || isDeleting}>
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Absensi?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data absensi ini? Tindakan ini tidak dapat dibatalkan dan akan memengaruhi laporan penggajian.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Settings Dialog ── */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aturan Absensi</DialogTitle>
          </DialogHeader>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
            <p className="font-medium mb-1">Cara Kerja:</p>
            <ul className="space-y-1 text-xs">
              <li>• <strong>Clock In/Out</strong>: Karyawan hanya perlu fingerprint saat masuk dan keluar</li>
              <li>• <strong>Durasi</strong>: Dihitung dari Clock In - Clock Out, dikurangi waktu istirahat otomatis</li>
              <li>• <strong>Terlambat</strong>: Dihitung jika Clock In lebih dari Grace Period setelah Shift Start</li>
              <li>• <strong>Lembur</strong>: Tidak dihitung, durasi maksimal sampai Shift End</li>
            </ul>
          </div>
          <form onSubmit={handleSaveSettings(onSubmitSettings)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Jam Masuk (Shift Start)</label>
                <Input type="text" placeholder="08:00" {...registerSettings('shift_start', { required: true, pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ })} />
                <p className="text-[10px] text-muted-foreground">Format 24 Jam (misal: 08:00)</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Jam Keluar (Shift End)</label>
                <Input type="text" placeholder="17:00" {...registerSettings('shift_end', { required: true, pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ })} />
                <p className="text-[10px] text-muted-foreground">Format 24 Jam (misal: 17:00)</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Toleransi Keterlambatan (Menit)</label>
              <Input type="number" {...registerSettings('grace_period_minutes', { required: true, valueAsNumber: true })} />
              <p className="text-[10px] text-muted-foreground">Keterlambatan dihitung setelah Grace Period</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Mulai Istirahat</label>
                <Input type="text" placeholder="12:00" {...registerSettings('break_start', { required: true, pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ })} />
                <p className="text-[10px] text-muted-foreground">Otomatis dikurangi dari durasi</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Selesai Istirahat</label>
                <Input type="text" placeholder="13:00" {...registerSettings('break_end', { required: true, pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ })} />
                <p className="text-[10px] text-muted-foreground">Otomatis dikurangi dari durasi</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSavingSettings}>
                {isSavingSettings ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Work Holiday Dialog ── */}
      <WorkHolidayDialog 
        open={holidaysOpen} 
        onOpenChange={setHolidaysOpen}
        storeId={activeStoreId}
      />
    </div>
  );
}
