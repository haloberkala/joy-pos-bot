import { useState } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type DateFilterType = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_year' | 'custom' | 'all';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateFilterProps {
  value: DateFilterType;
  dateRange: DateRange;
  onChange: (type: DateFilterType, range: DateRange) => void;
}

const filterOptions: { value: DateFilterType; label: string }[] = [
  { value: 'today', label: 'Hari Ini' },
  { value: 'yesterday', label: 'Kemarin' },
  { value: 'this_week', label: 'Minggu Ini' },
  { value: 'this_month', label: 'Bulan Ini' },
  { value: 'this_year', label: 'Tahun Ini' },
  { value: 'custom', label: 'Pilih Tanggal' },
  { value: 'all', label: 'Semua Data' },
];

export function getDateRangeFromFilter(type: DateFilterType): DateRange {
  const now = new Date();
  
  switch (type) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    case 'this_week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'this_month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'this_year':
      return { from: startOfYear(now), to: endOfYear(now) };
    case 'all':
      return { from: undefined, to: undefined };
    default:
      return { from: undefined, to: undefined };
  }
}

export function DateFilter({ value, dateRange, onChange }: DateFilterProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange>(dateRange);

  const handleFilterChange = (type: DateFilterType) => {
    if (type === 'custom') {
      setIsCalendarOpen(true);
      return;
    }
    const range = getDateRangeFromFilter(type);
    onChange(type, range);
  };

  const handleApplyCustomRange = () => {
    onChange('custom', tempRange);
    setIsCalendarOpen(false);
  };

  const getDisplayLabel = () => {
    if (value === 'custom' && dateRange.from) {
      if (dateRange.to) {
        return `${format(dateRange.from, 'd MMM yyyy', { locale: id })} - ${format(dateRange.to, 'd MMM yyyy', { locale: id })}`;
      }
      return format(dateRange.from, 'd MMM yyyy', { locale: id });
    }
    return filterOptions.find(o => o.value === value)?.label || 'Pilih Periode';
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[180px] justify-between">
            <span className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {getDisplayLabel()}
            </span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]">
          {filterOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleFilterChange(option.value)}
              className={cn(value === option.value && 'bg-accent')}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <span />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-3 border-b">
            <p className="text-sm font-medium">Pilih Rentang Tanggal</p>
          </div>
          <Calendar
            mode="range"
            selected={{ from: tempRange.from, to: tempRange.to }}
            onSelect={(range) => setTempRange({ from: range?.from, to: range?.to })}
            numberOfMonths={2}
            className="p-3 pointer-events-auto"
          />
          <div className="p-3 border-t flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCalendarOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleApplyCustomRange} disabled={!tempRange.from}>
              Terapkan
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
