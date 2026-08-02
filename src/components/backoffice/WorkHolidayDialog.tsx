import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Calendar as CalendarIcon, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAttendanceSetting,
  upsertAttendanceSetting,
  getWorkHolidaysByYear,
  createWorkHoliday,
  updateWorkHoliday,
  deleteWorkHoliday,
  WorkHoliday,
  CreateWorkHolidayInput,
  AttendanceSetting,
} from '@/services/attendanceService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: number;
}

export function WorkHolidayDialog({ open, onOpenChange, storeId }: Props) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<Date>(now);

  // Weekly off days
  const [weeklyOffDays, setWeeklyOffDays] = useState<number[]>([]);
  const [isSavingWeeklyOff, setIsSavingWeeklyOff] = useState(false);

  // Holidays
  const [holidays, setHolidays] = useState<WorkHoliday[]>([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);

  // Form state
  const [editingHoliday, setEditingHoliday] = useState<WorkHoliday | null>(null);
  const [formDate, setFormDate] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'national' | 'store'>('store');
  const [isSavingHoliday, setIsSavingHoliday] = useState(false);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      loadWeeklyOffDays();
      loadHolidays();
    }
  }, [open, selectedYear, storeId]);

  const loadWeeklyOffDays = async () => {
    try {
      const setting = await getAttendanceSetting(storeId);
      setWeeklyOffDays(Array.isArray(setting?.weekly_off_days) ? setting.weekly_off_days : []);
    } catch (error) {
      console.error('Error loading weekly off days:', error);
    }
  };

  const loadHolidays = async () => {
    try {
      setIsLoadingHolidays(true);
      const data = await getWorkHolidaysByYear(storeId, selectedYear);
      setHolidays(data);
    } catch (error) {
      console.error('Error loading holidays:', error);
      toast.error('Gagal memuat data hari libur');
    } finally {
      setIsLoadingHolidays(false);
    }
  };

  const toggleWeeklyOff = (day: number) => {
    setWeeklyOffDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSaveWeeklyOff = async () => {
    try {
      setIsSavingWeeklyOff(true);
      const current = await getAttendanceSetting(storeId);
      await upsertAttendanceSetting(storeId, {
        ...(current ?? {}),
        weekly_off_days: weeklyOffDays,
      } as AttendanceSetting);
      toast.success('Hari libur mingguan berhasil disimpan');
    } catch (error) {
      console.error('Error saving weekly off days:', error);
      toast.error('Gagal menyimpan hari libur mingguan');
    } finally {
      setIsSavingWeeklyOff(false);
    }
  };

  const handleAddOrUpdate = async () => {
    if (!formDate || !formName.trim()) {
      toast.error('Tanggal dan nama harus diisi');
      return;
    }

    try {
      setIsSavingHoliday(true);
      const input: CreateWorkHolidayInput = {
        store_id: formType === 'store' ? storeId : null,
        date: formDate,
        name: formName.trim(),
        type: formType,
      };

      if (editingHoliday) {
        await updateWorkHoliday(editingHoliday.id, input);
        toast.success('Hari libur berhasil diperbarui');
      } else {
        await createWorkHoliday(input);
        toast.success('Hari libur berhasil ditambahkan');
      }

      // Reset form
      setFormDate('');
      setFormName('');
      setFormType('store');
      setEditingHoliday(null);
      await loadHolidays();
    } catch (error) {
      console.error('Error saving holiday:', error);
      toast.error(editingHoliday ? 'Gagal memperbarui hari libur' : 'Gagal menambahkan hari libur');
    } finally {
      setIsSavingHoliday(false);
    }
  };

  const handleEdit = (holiday: WorkHoliday) => {
    setEditingHoliday(holiday);
    setFormDate(holiday.date);
    setFormName(holiday.name);
    setFormType(holiday.type);
    // Scroll to form
    const formElement = document.getElementById('holiday-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleCancelEdit = () => {
    setEditingHoliday(null);
    setFormDate('');
    setFormName('');
    setFormType('store');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;

    try {
      setIsDeleting(true);
      await deleteWorkHoliday(deleteConfirmId);
      toast.success('Hari libur berhasil dihapus');
      await loadHolidays();
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error('Gagal menghapus hari libur');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter holidays by search query
  const filteredHolidays = useMemo(() => {
    if (!searchQuery.trim()) return holidays;
    const query = searchQuery.toLowerCase();
    return holidays.filter(
      (h) =>
        h.name.toLowerCase().includes(query) ||
        (h.type === 'national' ? 'nasional' : 'libur toko').includes(query)
    );
  }, [holidays, searchQuery]);

  // Get holiday dates for calendar markers
  const holidayDates = useMemo(() => {
    const dateSet = new Set<string>();
    holidays.forEach((h) => dateSet.add(h.date));
    return dateSet;
  }, [holidays]);

  // Check if a date is holiday
  const isHolidayDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidayDates.has(dateStr);
  };

  // Modifiers for calendar
  const modifiers = {
    holiday: (date: Date) => isHolidayDate(date),
  };

  const modifiersStyles = {
    holiday: {
      backgroundColor: 'rgb(239 246 255)',
      color: 'rgb(29 78 216)',
      fontWeight: 'bold',
    },
  };

  // Handle month change on calendar
  const handleMonthChange = (date: Date) => {
    setSelectedMonth(date);
    setSelectedYear(date.getFullYear());
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Kelola Hari Libur</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Section 1: Libur Mingguan */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <h3 className="text-sm font-semibold">Libur Mingguan</h3>
              <div className="grid grid-cols-4 gap-y-2 gap-x-4">
                {[
                  { day: 1, label: 'Senin' },
                  { day: 2, label: 'Selasa' },
                  { day: 3, label: 'Rabu' },
                  { day: 4, label: 'Kamis' },
                  { day: 5, label: 'Jumat' },
                  { day: 6, label: 'Sabtu' },
                  { day: 0, label: 'Minggu' },
                ].map(({ day, label }) => (
                  <label
                    key={day}
                    className="flex items-center gap-2 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-primary"
                      checked={weeklyOffDays.includes(day)}
                      onChange={() => toggleWeeklyOff(day)}
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
              <Button
                size="sm"
                className="w-full"
                disabled={isSavingWeeklyOff}
                onClick={handleSaveWeeklyOff}
              >
                {isSavingWeeklyOff ? 'Menyimpan...' : 'Simpan Libur Mingguan'}
              </Button>
            </div>

            {/* Section 2: Calendar & Holidays List */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Calendar */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Kalender</h3>
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                    Tahun {selectedYear}
                  </Badge>
                </div>
                <Calendar
                  mode="single"
                  selected={selectedMonth}
                  onMonthChange={handleMonthChange}
                  month={selectedMonth}
                  locale={localeId}
                  modifiers={modifiers}
                  modifiersStyles={modifiersStyles}
                  className="rounded-md border"
                />
                <p className="text-xs text-muted-foreground">
                  <span className="inline-block w-3 h-3 rounded bg-blue-100 border border-blue-200 mr-1.5" />
                  Tanggal dengan hari libur
                </p>
              </div>

              {/* Holidays List */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Hari Libur Terdaftar</h3>
                  <Badge variant="outline" className="text-xs">
                    {filteredHolidays.length} libur
                  </Badge>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama hari libur..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* List */}
                <ScrollArea className="h-[320px]">
                  {isLoadingHolidays ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Memuat data...
                    </p>
                  ) : filteredHolidays.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? 'Tidak ditemukan' : 'Belum ada hari libur'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 pr-4">
                      {filteredHolidays.map((holiday) => (
                        <div
                          key={holiday.id}
                          className={cn(
                            'border rounded-lg p-3 space-y-1.5 bg-card hover:bg-muted/50 transition-colors',
                            editingHoliday?.id === holiday.id && 'ring-2 ring-primary'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{holiday.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(holiday.date + 'T00:00:00'), 'd MMMM yyyy', {
                                    locale: localeId,
                                  })}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-xs',
                                    holiday.type === 'national'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-purple-50 text-purple-700 border-purple-200'
                                  )}
                                >
                                  {holiday.type === 'national' ? 'Nasional' : 'Libur Toko'}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(holiday)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => setDeleteConfirmId(holiday.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            {/* Section 3: Add/Edit Form */}
            <div id="holiday-form" className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {editingHoliday ? 'Edit Hari Libur' : 'Tambah Hari Libur'}
                </h3>
                {editingHoliday && (
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                    Batal
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Tanggal</label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Jenis</label>
                  <Select
                    value={formType}
                    onValueChange={(v) => setFormType(v as 'national' | 'store')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="store">Libur Toko</SelectItem>
                      <SelectItem value="national">Nasional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nama</label>
                <Input
                  placeholder="Contoh: Hari Kemerdekaan, Renovasi Toko..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                disabled={isSavingHoliday || !formDate || !formName.trim()}
                onClick={handleAddOrUpdate}
              >
                {isSavingHoliday
                  ? 'Menyimpan...'
                  : editingHoliday
                  ? 'Update Hari Libur'
                  : 'Tambah Hari Libur'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Hari Libur?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus hari libur ini? Tindakan ini tidak dapat
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
