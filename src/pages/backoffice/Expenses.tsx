import { useState, useMemo } from 'react';
import { sampleExpenses, expenseCategories, stores } from '@/data/sampleData';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Building2,
  Wallet,
  TrendingDown,
  Trash2,
  Edit,
  Receipt,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DateFilter, DateFilterType, DateRange, getDateRangeFromFilter } from '@/components/backoffice/DateFilter';
import { Expense } from '@/types/pos';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = [
  'hsl(173, 58%, 39%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(220, 70%, 55%)',
  'hsl(280, 60%, 55%)',
  'hsl(142, 71%, 45%)',
  'hsl(30, 80%, 55%)',
  'hsl(200, 70%, 50%)',
];

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>(sampleExpenses);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('all');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromFilter('all'));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [formStore, setFormStore] = useState('store-1');
  const [formCategory, setFormCategory] = useState('exp-cat-1');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  const handleDateFilterChange = (type: DateFilterType, range: DateRange) => {
    setDateFilterType(type);
    setDateRange(range);
  };

  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    if (selectedStore !== 'all') {
      filtered = filtered.filter((e) => e.storeId === selectedStore);
    }

    if (dateRange.from) {
      filtered = filtered.filter((e) => e.date >= dateRange.from!);
    }
    if (dateRange.to) {
      filtered = filtered.filter((e) => e.date <= dateRange.to!);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (e) =>
          e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [expenses, selectedStore, dateRange, searchQuery]);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.forEach((e) => {
      const current = map.get(e.categoryId) || 0;
      map.set(e.categoryId, current + e.amount);
    });
    return expenseCategories
      .map((cat) => ({
        name: cat.name,
        value: map.get(cat.id) || 0,
      }))
      .filter((c) => c.value > 0);
  }, [filteredExpenses]);

  const getCategoryName = (categoryId: string) => {
    return expenseCategories.find((c) => c.id === categoryId)?.name || categoryId;
  };

  const getStoreName = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId);
    return store?.name.split(' - ')[1] || store?.name || storeId;
  };

  const handleAddExpense = () => {
    if (!formAmount || !formDescription) {
      toast.error('Isi semua field yang wajib');
      return;
    }

    const newExpense: Expense = {
      id: `EXP-${Date.now()}`,
      storeId: formStore,
      categoryId: formCategory,
      amount: parseFloat(formAmount),
      description: formDescription,
      date: new Date(formDate),
      createdBy: 'current-user',
    };

    setExpenses((prev) => [newExpense, ...prev]);
    setIsAddModalOpen(false);
    setFormAmount('');
    setFormDescription('');
    toast.success('Pengeluaran berhasil ditambahkan');
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    toast.success('Pengeluaran berhasil dihapus');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Pengeluaran</h1>
          <p className="text-muted-foreground">Catat dan pantau biaya operasional toko</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <DateFilter value={dateFilterType} dateRange={dateRange} onChange={handleDateFilterChange} />
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-[220px]">
              <Building2 className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Pilih Toko" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Toko</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name.replace('Minimarket Berkah - ', '')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalExpenses)}</p>
              <p className="text-xs mt-1 text-muted-foreground">
                {filteredExpenses.length} transaksi
              </p>
            </div>
            <div className="p-3 rounded-lg bg-red-100 text-red-600">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Rata-rata / Transaksi</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-100 text-orange-600">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Kategori Terbesar</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {expensesByCategory.length > 0
                  ? expensesByCategory.sort((a, b) => b.value - a.value)[0].name
                  : '-'}
              </p>
              <p className="text-xs mt-1 text-muted-foreground">
                {expensesByCategory.length > 0
                  ? formatCurrency(expensesByCategory.sort((a, b) => b.value - a.value)[0].value)
                  : ''}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">Pengeluaran per Kategori</h3>
          {expensesByCategory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expensesByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {expensesByCategory.map((cat, index) => (
                  <div key={cat.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{cat.name}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(cat.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-12">Tidak ada data</p>
          )}
        </div>

        {/* Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari pengeluaran..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Tambah Pengeluaran
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Pengeluaran Baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Toko</Label>
                      <Select value={formStore} onValueChange={setFormStore}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name.split(' - ')[1] || store.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Kategori</Label>
                      <Select value={formCategory} onValueChange={setFormCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Jumlah (Rp)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tanggal</Label>
                    <Input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Deskripsi</Label>
                    <Textarea
                      placeholder="Deskripsi pengeluaran..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                      Batal
                    </Button>
                    <Button onClick={handleAddExpense}>Simpan</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Toko</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-muted-foreground">{formatDate(expense.date)}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {expense.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getCategoryName(expense.categoryId)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getStoreName(expense.storeId)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      -{formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteExpense(expense.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredExpenses.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Tidak ada pengeluaran ditemukan</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
