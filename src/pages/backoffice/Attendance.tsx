import { useState, useMemo, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { CalendarIcon, Pencil, Trash2, Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { getAttendancesByStore, updateAttendance, deleteAttendance, getAttendanceSetting, upsertAttendanceSetting, Attendance, AttendanceSetting, AttendanceStatus } from '@/services/attendanceService';
import { getEmployeesByStore } from '@/services/employeesService';
import { formatTime24h } from '@/lib/format';
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
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  complete:    'Hadir Penuh',
  partial:     'Hadir Sebagian',
  incomplete:  'Belum Lengkap',
};

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  complete:    'bg-green-100 text-green-800',
  partial:     'bg-yellow-100 text-yellow-800',
  incomplete:  'bg-red-100 text-red-800',
};

export default function AttendancePage() {
  const { activeStoreId, user } = useAuth();
  const isOwner = user?.role === 'owner';

  // Get current month/year for default filter
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear());
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [editRow, setEditRow] = useState<Attendance | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('incomplete');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const {
    register: registerSettings,
    handleSubmit: handleSaveSettings,
    reset: resetSettings,
  } = useForm<AttendanceSetting>();

  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Build employee map for O(1) lookup
  const employeeMap = useMemo(
    () => new Map(employees.map(e => [e.id, e])),
    [employees]
  );

  const loadData = useCallback(async () => {
    if (!activeStoreId) return;
    
    try {
      setIsLoading(true);
      const [attendancesData, employeesData] = await Promise.all([
        getAttendancesByStore(activeStoreId, {
          month: filterMonth,
          year: filterYear,
        }),
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
  }, [activeStoreId, filterMonth, filterYear]);

  useEffect(() => {
    let cancelled = false;
    
    const load = async () => {
      await loadData();
      if (cancelled) return;
    };
    
    load();
    
    return () => { cancelled = true; };
  }, [loadData]);

  const filtered = useMemo(() => {
    return attendances
      .filter((a) => {
        const emp = employeeMap.get(a.employee_id);
        if (!emp) return false;
        if (filterEmployee !== 'all' && String(a.employee_id) !== String(filterEmployee)) return false;
        
        // Date filtering: specific date OR month/year
        if (filterDate) {
          // Mode harian: filter by specific date
          const dateStr = format(filterDate, 'yyyy-MM-dd');
          if (a.attendance_date !== dateStr) return false;
        } else {
          // Mode bulanan: filter by month/year
          const attDate = new Date(a.attendance_date);
          if (attDate.getMonth() + 1 !== filterMonth || attDate.getFullYear() !== filterYear) {
            return false;
          }
        }
        
        if (filterStatus !== 'all' && a.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));
  }, [attendances, employeeMap, filterEmployee, filterDate, filterMonth, filterYear, filterStatus]);

  // Summary per karyawan (berdasarkan data yang sudah difilter)
  const summary = useMemo(() => {
    const map: Record<string, { complete: number; partial: number; incomplete: number }> = {};
    for (const a of filtered) {
      if (!map[a.employee_id]) {
        map[a.employee_id] = { complete: 0, partial: 0, incomplete: 0 };
      }
      map[a.employee_id][a.status]++;
    }
    return map;
  }, [filtered]);

  const openEdit = (row: Attendance) => {
    setEditRow(row);
    setEditNote(row.note ?? '');
    setEditStatus(row.status);
  };

  const saveEdit = async () => {
    if (!editRow) return;
    try {
      setIsSaving(true);
      await updateAttendance(editRow.id, {
        status: editStatus,
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
          break_start: formatTime24h(setting.break_start) || '12:00',
          break_end: formatTime24h(setting.break_end) || '13:00',
          break_return_tolerance_minutes: setting.break_return_tolerance_minutes ?? 15,
          clock_out_tolerance_minutes: setting.clock_out_tolerance_minutes ?? 30,
        });
      } else {
        resetSettings({
          shift_start: '08:00',
          shift_end: '17:00',
          grace_period_minutes: 15,
          break_start: '12:00',
          break_end: '13:00',
          break_return_tolerance_minutes: 15,
          clock_out_tolerance_minutes: 30,
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
        break_return_tolerance_minutes: data.break_return_tolerance_minutes ?? 15,
        clock_out_tolerance_minutes: data.clock_out_tolerance_minutes ?? 30,
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
              <Button variant="outline" onClick={openSettings}>
                <Settings className="w-4 h-4 mr-2" />
                Aturan Absensi
              </Button>
            )}
            <ZKTecoImportButton storeId={activeStoreId} onSuccess={loadData} />
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3">
        {/* Date Picker - Mode Bulanan atau Harian */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-64 justify-start text-left font-normal',
                !filterDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filterDate
                ? format(filterDate, 'd MMMM yyyy', { locale: localeId })
                : format(new Date(filterYear, filterMonth - 1), 'MMMM yyyy', { locale: localeId })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filterDate}
              onSelect={(date) => {
                setFilterDate(date);
                if (date) {
                  // Update month/year based on selected date
                  setFilterMonth(date.getMonth() + 1);
                  setFilterYear(date.getFullYear());
                }
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
                  onClick={() => { 
                    setFilterDate(undefined); 
                    setCalendarOpen(false); 
                  }}
                >
                  Tampilkan seluruh bulan
                </Button>
              </div>
            )}
            {!filterDate && (
              <div className="border-t p-2 space-y-2">
                <div className="flex gap-2">
                  <Select 
                    value={String(filterMonth)} 
                    onValueChange={(v) => setFilterMonth(Number(v))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = i + 1;
                        const date = new Date(filterYear, i);
                        return (
                          <SelectItem key={month} value={String(month)}>
                            {format(date, 'MMMM', { locale: localeId })}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={String(filterYear)} 
                    onValueChange={(v) => setFilterYear(Number(v))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y =>
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua Karyawan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Karyawan</SelectItem>
            {employees.filter((e) => e.is_active).map((e) => (
              <SelectItem key={e.id} value={String(e.id)}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="complete">Hadir Penuh</SelectItem>
            <SelectItem value="partial">Hadir Sebagian</SelectItem>
            <SelectItem value="incomplete">Belum Lengkap</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Summary Cards ── */}
      {filterEmployee === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {employees
            .filter((e) => e.is_active)
            .map((emp) => {
              const s = summary[emp.id] || { complete: 0, partial: 0, incomplete: 0 };
              const hasData = s.complete > 0 || s.partial > 0 || s.incomplete > 0;
              return (
                <div key={emp.id} className="bg-card border border-border rounded-lg p-3">
                  <p className="font-medium text-sm">{emp.name}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {hasData ? (
                      <>
                        {s.complete > 0 && (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Hadir Penuh: {s.complete}
                          </Badge>
                        )}
                        {s.partial > 0 && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                            Hadir Sebagian: {s.partial}
                          </Badge>
                        )}
                        {s.incomplete > 0 && (
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            Belum Lengkap: {s.incomplete}
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
              <TableHead>Mulai Istirahat</TableHead>
              <TableHead>Selesai Istirahat</TableHead>
              <TableHead>Jam Pulang</TableHead>
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
              const emp = employeeMap.get(row.employee_id);
              
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{emp?.name || 'Unknown'}</TableCell>
                  <TableCell>{row.attendance_date}</TableCell>
                  <TableCell>{row.clock_in || '-'}</TableCell>
                  <TableCell>{row.break_out || '-'}</TableCell>
                  <TableCell>{row.break_in || '-'}</TableCell>
                  <TableCell>{row.clock_out || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_COLORS[row.status]}>{STATUS_LABELS[row.status]}</Badge>
                      {row.is_manual_edit && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          🟡 Manual
                        </Badge>
                      )}
                    </div>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Absensi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {employeeMap.get(editRow?.employee_id || '')?.name || 'Unknown Employee'} —{' '}
                {editRow?.attendance_date}
              </p>
              {editRow?.is_manual_edit && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  🟡 Manual Edit
                </Badge>
              )}
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
              <p className="font-medium mb-1">Informasi</p>
              <p className="text-xs">
                Edit attendance hanya untuk mengubah status dan catatan. Waktu fingerprint (Jam Masuk, Jam Pulang, Istirahat) tetap berasal dari mesin fingerprint dan tidak bisa diedit manual.
              </p>
              <p className="text-xs mt-2">
                Setelah disimpan, attendance akan ditandai sebagai Manual Edit dan import fingerprint berikutnya tidak akan mengubahnya.
              </p>
            </div>

            {/* Display fingerprint times (read-only) */}
            <div className="bg-muted/30 p-3 rounded-lg space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Data Fingerprint</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Jam Masuk:</span>
                  <span className="ml-2 font-medium">{editRow?.clock_in || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Jam Pulang:</span>
                  <span className="ml-2 font-medium">{editRow?.clock_out || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Mulai Istirahat:</span>
                  <span className="ml-2 font-medium">{editRow?.break_out || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Selesai Istirahat:</span>
                  <span className="ml-2 font-medium">{editRow?.break_in || '-'}</span>
                </div>
              </div>
            </div>

            {/* Status - editable */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as AttendanceStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complete">Hadir Penuh</SelectItem>
                  <SelectItem value="partial">Hadir Sebagian</SelectItem>
                  <SelectItem value="incomplete">Belum Lengkap</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Ubah status jika diperlukan penyesuaian manual
              </p>
            </div>

            {/* Note - editable */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Catatan</label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Tambahkan keterangan tambahan (opsional)..."
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aturan Absensi</DialogTitle>
          </DialogHeader>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
            <p className="font-medium mb-1">Cara Kerja Absensi</p>
            <p className="text-xs">
              Sistem akan otomatis menentukan status kehadiran berdasarkan waktu fingerprint yang masuk. 
              Pastikan jam kerja dan jam istirahat di bawah ini sesuai dengan aturan di toko anda agar hasil absensi menjadi akurat.
            </p>
          </div>
          <form onSubmit={handleSaveSettings(onSubmitSettings)} className="space-y-6">
            {/* Shift Settings */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Jam Kerja</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Jam Masuk</label>
                  <Input type="text" placeholder="08:00" {...registerSettings('shift_start', { required: true, pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ })} />
                  <p className="text-[10px] text-muted-foreground">Contoh: 08:00 atau 09:30</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Toleransi Absen Masuk (Menit)</label>
                  <Input type="number" {...registerSettings('grace_period_minutes', { required: true, valueAsNumber: true })} />
                  <p className="text-[10px] text-muted-foreground">Berapa menit sesudah jam masuk yang masih dianggap sebagai absen masuk</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Jam Pulang</label>
                  <Input type="text" placeholder="17:00" {...registerSettings('shift_end', { required: true, pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ })} />
                  <p className="text-[10px] text-muted-foreground">Contoh: 17:00 atau 18:30</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Toleransi Absen Pulang (Menit)</label>
                  <Input type="number" defaultValue={30} {...registerSettings('clock_out_tolerance_minutes', { valueAsNumber: true })} />
                  <p className="text-[10px] text-muted-foreground">Berapa menit sesudah jam pulang yang masih dianggap sebagai absen pulang</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Break Settings */}
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold">Jam Istirahat</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Atur waktu istirahat untuk memastikan karyawan tercatat kembali bekerja setelah istirahat.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Jam Mulai Istirahat</label>
                  <Input type="text" placeholder="12:00" {...registerSettings('break_start', { pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ })} />
                  <p className="text-[10px] text-muted-foreground">Contoh: 12:00 atau 13:00</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Jam Selesai Istirahat</label>
                  <Input type="text" placeholder="13:00" {...registerSettings('break_end', { pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ })} />
                  <p className="text-[10px] text-muted-foreground">Contoh: 13:00 atau 14:00</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Toleransi Kembali Setelah Istirahat (Menit)</label>
                <Input 
                  type="number" 
                  {...registerSettings('break_return_tolerance_minutes', { 
                    required: true, 
                    valueAsNumber: true,
                    min: 0
                  })} 
                  placeholder="15"
                />
                <p className="text-[10px] text-muted-foreground">
                  Berapa menit sesudah jam istirahat selesai yang masih dianggap sebagai absen kembali bekerja
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSavingSettings}>
                {isSavingSettings ? 'Menyimpan...' : 'Simpan Aturan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
