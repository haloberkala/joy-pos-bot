import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getExpensesByStore, 
  getExpenseCategories, 
  createExpense, 
  deleteExpense,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  Expense,
  ExpenseCategory 
} from '@/services/expensesService';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Wallet, TrendingDown, Trash2, Receipt, Edit, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DateFilter, DateFilterType, DateRange, getDateRangeFromFilter } from '@/components/backoffice/DateFilter';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';

const COLORS = [
  'hsl(245, 100%, 67%)', 'hsl(40, 72%, 42%)', 'hsl(4, 68%, 46%)', 'hsl(220, 70%, 55%)',
  'hsl(280, 60%, 55%)', 'hsl(160, 72%, 27%)', 'hsl(30, 80%, 55%)', 'hsl(200, 70%, 50%)',
];

export default function Expenses() {
  const { activeStoreId } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('all');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromFilter('all'));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formCategory, setFormCategory] = useState<string>('1');
  const [formAmount, setFormAmount] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  // Category form state
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<ExpenseCategory | null>(null);

  // Load data from Supabase
  useEffect(() => {
    loadData();
  }, [activeStoreId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [expensesData, categoriesData] = await Promise.all([
        getExpensesByStore(activeStoreId),
        getExpenseCategories(),
      ]);
      
      setExpenses(expensesData);
      setExpenseCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data pengeluaran');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateFilterChange = (type: DateFilterType, range: DateRange) => {
    setDateFilterType(type);
    setDateRange(range);
  };

  const filteredExpenses = useMemo(() => {
    let filtered = expenses;
    
    // Date filter
    if (dateRange.from) {
      const fromTime = dateRange.from.getTime();
      filtered = filtered.filter((e) => new Date(e.expense_date).getTime() >= fromTime);
    }
    if (dateRange.to) {
      const toTime = dateRange.to.getTime();
      filtered = filtered.filter((e) => new Date(e.expense_date).getTime() <= toTime);
    }
    
    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((e) => e.category_id === Number(categoryFilter));
    }
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((e) =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(e.id).includes(searchQuery)
      );
    }
    
    return filtered.sort((a, b) => 
      new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
    );
  }, [expenses, dateRange, categoryFilter, searchQuery]);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const expensesByCategory = useMemo(() => {
    const map = new Map<number, number>();
    filteredExpenses.forEach((e) => {
      map.set(e.category_id, (map.get(e.category_id) || 0) + e.amount);
    });
    return expenseCategories
      .map((cat) => ({ name: cat.name, value: map.get(cat.id) || 0 }))
      .filter((c) => c.value > 0);
  }, [filteredExpenses]);

  const getCategoryName = (categoryId: number) => {
    return expenseCategories.find((c) => c.id === categoryId)?.name || String(categoryId);
  };

  const handleAddExpense = async () => {
    if (!formAmount || !formTitle) {
      toast.error('Isi semua field yang wajib');
      return;
    }
    
    try {
      setIsSaving(true);
      
      await createExpense({
        store_id: activeStoreId,
        category_id: Number(formCategory),
        title: formTitle,
        amount: parseFloat(formAmount),
        expense_date: formDate,
        note: formNote || undefined,
      });
      
      setIsAddModalOpen(false);
      setFormAmount('');
      setFormTitle('');
      setFormNote('');
      setFormDate(new Date().toISOString().split('T')[0]);
      
      await loadData();
      toast.success('Pengeluaran berhasil ditambahkan');
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Gagal menambahkan pengeluaran');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    try {
      await deleteExpense(id);
      await loadData();
      toast.success('Pengeluaran berhasil dihapus');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Gagal menghapus pengeluaran');
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast.error('Nama kategori wajib diisi');
      return;
    }

    try {
      setIsSaving(true);
      
      if (editingCategory) {
        await updateExpenseCategory(editingCategory.id, categoryName, categoryDescription || undefined);
        toast.success('Kategori berhasil diupdate');
      } else {
        await createExpenseCategory(categoryName, categoryDescription || undefined);
        toast.success('Kategori berhasil ditambahkan');
      }
      
      setIsCategoryModalOpen(false);
      setCategoryName('');
      setCategoryDescription('');
      setEditingCategory(null);
      await loadData();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Gagal menyimpan kategori');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCategory = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryTarget) return;

    try {
      await deleteExpenseCategory(deleteCategoryTarget.id);
      await loadData();
      setDeleteCategoryTarget(null);
      toast.success('Kategori berhasil dihapus');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Gagal menghapus kategori. Mungkin masih ada pengeluaran yang menggunakan kategori ini.');
    }
  };

  const openCategoryModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
    setIsCategoryModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Pengeluaran</h1>
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Pengeluaran</h1>
          <p className="text-muted-foreground">Catat dan pantau biaya operasional toko</p>
        </div>
        <DateFilter value={dateFilterType} dateRange={dateRange} onChange={handleDateFilterChange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalExpenses)}</p>
              <p className="text-xs mt-1 text-muted-foreground">{filteredExpenses.length} transaksi</p>
            </div>
            <div className="p-3 rounded-lg bg-red-100 text-red-600"><TrendingDown className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Rata-rata / Transaksi</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0)}</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-100 text-orange-600"><Wallet className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Kategori Terbesar</p>
              <p className="text-2xl font-bold text-foreground mt-1">{expensesByCategory.length > 0 ? expensesByCategory.sort((a, b) => b.value - a.value)[0].name : '-'}</p>
              <p className="text-xs mt-1 text-muted-foreground">{expensesByCategory.length > 0 ? formatCurrency(expensesByCategory.sort((a, b) => b.value - a.value)[0].value) : ''}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-100 text-purple-600"><Receipt className="w-5 h-5" /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">Pengeluaran per Kategori</h3>
          {expensesByCategory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={expensesByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {expensesByCategory.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {expensesByCategory.map((cat, index) => (
                  <div key={cat.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
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

        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari pengeluaran..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {expenseCategories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" />Tambah Pengeluaran</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Tambah Pengeluaran Baru</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Kategori</Label>
                    <div className="flex gap-2">
                      <Select value={formCategory} onValueChange={setFormCategory}>
                        <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map((cat) => (<SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="icon" onClick={openCategoryModal} title="Kelola Kategori">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Judul</Label>
                    <Input placeholder="Judul pengeluaran" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Jumlah (Rp)</Label>
                    <Input type="number" placeholder="0" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tanggal</Label>
                    <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Catatan (opsional)</Label>
                    <Textarea placeholder="Catatan pengeluaran..." value={formNote} onChange={(e) => setFormNote(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSaving}>Batal</Button>
                    <Button onClick={handleAddExpense} disabled={isSaving}>
                      {isSaving ? 'Menyimpan...' : 'Simpan'}
                    </Button>
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
                  <TableHead>Judul</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-muted-foreground">{formatDate(new Date(expense.expense_date))}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{expense.title}</TableCell>
                    <TableCell><Badge variant="secondary">{getCategoryName(expense.category_id)}</Badge></TableCell>
                    <TableCell className="text-right font-semibold text-red-600">-{formatCurrency(expense.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteExpense(expense.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredExpenses.length === 0 && (
              <div className="text-center py-12 text-muted-foreground"><p>Tidak ada pengeluaran ditemukan</p></div>
            )}
          </div>
        </div>
      </div>

      {/* Category Management Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Kategori' : 'Kelola Kategori Pengeluaran'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Form Add/Edit Category */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-sm">{editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Nama Kategori *</Label>
                  <Input 
                    placeholder="Contoh: Gaji Karyawan, Listrik & Air" 
                    value={categoryName} 
                    onChange={(e) => setCategoryName(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deskripsi (opsional)</Label>
                  <Textarea 
                    placeholder="Deskripsi kategori..." 
                    value={categoryDescription} 
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  {editingCategory && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingCategory(null);
                        setCategoryName('');
                        setCategoryDescription('');
                      }}
                    >
                      Batal Edit
                    </Button>
                  )}
                  <Button onClick={handleSaveCategory} disabled={isSaving}>
                    {isSaving ? 'Menyimpan...' : editingCategory ? 'Update' : 'Tambah'}
                  </Button>
                </div>
              </div>
            </div>

            {/* List of Categories */}
            <div>
              <h3 className="font-semibold text-sm mb-3">Daftar Kategori</h3>
              <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                {expenseCategories.map((cat) => (
                  <div key={cat.id} className="p-3 flex items-start justify-between hover:bg-muted/50">
                    <div className="flex-1">
                      <p className="font-medium">{cat.name}</p>
                      {cat.description && (
                        <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleEditCategory(cat)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteCategoryTarget(cat)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
                Tutup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteCategoryTarget}
        onOpenChange={(open) => !open && setDeleteCategoryTarget(null)}
        onConfirm={handleDeleteCategory}
        title="Hapus Kategori Pengeluaran?"
        itemName={deleteCategoryTarget?.name}
        description="Kategori ini akan dihapus. Pengeluaran dengan kategori ini akan terpengaruh."
      />
    </div>
  );
}
