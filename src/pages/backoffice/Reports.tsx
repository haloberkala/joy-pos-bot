import { useState, useMemo } from 'react';
import {
  sampleTransactions,
  sampleExpenses,
  expenseCategories,
  products,
  stores,
  stockPerStore,
  categories,
  getProductStock,
} from '@/data/sampleData';
import { formatCurrency } from '@/lib/format';
import { exportToPDF, exportToExcel } from '@/lib/exportUtils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DateFilter,
  DateFilterType,
  DateRange,
  getDateRangeFromFilter,
} from '@/components/backoffice/DateFilter';
import {
  FileDown,
  FileSpreadsheet,
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Receipt,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function Reports() {
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('all');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromFilter('all'));

  const handleDateFilterChange = (type: DateFilterType, range: DateRange) => {
    setDateFilterType(type);
    setDateRange(range);
  };

  // Filtered data
  const filteredTransactions = useMemo(() => {
    let filtered = sampleTransactions;
    if (selectedStore !== 'all') {
      filtered = filtered.filter((t) => t.storeId === selectedStore);
    }
    if (dateRange.from) filtered = filtered.filter((t) => t.createdAt >= dateRange.from!);
    if (dateRange.to) filtered = filtered.filter((t) => t.createdAt <= dateRange.to!);
    return filtered;
  }, [selectedStore, dateRange]);

  const filteredExpenses = useMemo(() => {
    let filtered = sampleExpenses;
    if (selectedStore !== 'all') {
      filtered = filtered.filter((e) => e.storeId === selectedStore);
    }
    if (dateRange.from) filtered = filtered.filter((e) => e.date >= dateRange.from!);
    if (dateRange.to) filtered = filtered.filter((e) => e.date <= dateRange.to!);
    return filtered;
  }, [selectedStore, dateRange]);

  // Calculations
  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
  const totalCOGS = filteredTransactions.reduce(
    (sum, t) =>
      sum + t.items.reduce((is, item) => is + item.product.buyPrice * item.quantity, 0),
    0
  );
  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  const getStoreName = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId);
    return store?.name.split(' - ')[1] || store?.name || storeId;
  };

  const formatDateShort = (date: Date) =>
    new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);

  // --- Sales Report ---
  const salesByProduct = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number; cost: number }>();
    filteredTransactions.forEach((t) =>
      t.items.forEach((item) => {
        const existing = map.get(item.product.id) || {
          name: item.product.name,
          qty: 0,
          revenue: 0,
          cost: 0,
        };
        existing.qty += item.quantity;
        existing.revenue += item.pricePerUnit * item.quantity;
        existing.cost += item.product.buyPrice * item.quantity;
        map.set(item.product.id, existing);
      })
    );
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredTransactions]);

  // --- Expense breakdown ---
  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.forEach((e) => {
      map.set(e.categoryId, (map.get(e.categoryId) || 0) + e.amount);
    });
    return expenseCategories
      .map((cat) => ({ name: cat.name, amount: map.get(cat.id) || 0 }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  // --- Profit/Loss chart data ---
  const profitLossData = useMemo(() => {
    return [
      { name: 'Pendapatan', value: totalRevenue },
      { name: 'HPP', value: totalCOGS },
      { name: 'Laba Kotor', value: grossProfit },
      { name: 'Pengeluaran', value: totalExpenses },
      { name: 'Laba Bersih', value: netProfit },
    ];
  }, [totalRevenue, totalCOGS, grossProfit, totalExpenses, netProfit]);

  // --- Stock Report ---
  const stockReport = useMemo(() => {
    return products.map((p) => {
      const stocks =
        selectedStore === 'all'
          ? stockPerStore.filter((s) => s.productId === p.id)
          : stockPerStore.filter((s) => s.productId === p.id && s.storeId === selectedStore);
      const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0);
      const stockValue = totalStock * p.buyPrice;
      const category = categories.find((c) => c.id === p.categoryId)?.name || p.categoryId;
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category,
        stock: totalStock,
        minStock: p.minStock,
        buyPrice: p.buyPrice,
        sellPrice: p.sellPrice,
        stockValue,
        status: totalStock === 0 ? 'Habis' : totalStock < p.minStock ? 'Menipis' : 'Tersedia',
      };
    });
  }, [selectedStore]);

  // --- Export Handlers ---
  const handleExportSalesPDF = () => {
    exportToPDF({
      title: 'Laporan Penjualan',
      subtitle: `Toko: ${selectedStore === 'all' ? 'Semua' : getStoreName(selectedStore)} | Periode: ${dateFilterType}`,
      filename: `laporan-penjualan-${Date.now()}`,
      columns: [
        { header: 'Produk', key: 'name', width: 25 },
        { header: 'Qty Terjual', key: 'qty', width: 12 },
        { header: 'Pendapatan', key: 'revenue', width: 18 },
        { header: 'HPP', key: 'cost', width: 18 },
        { header: 'Laba Kotor', key: 'profit', width: 18 },
      ],
      data: salesByProduct.map((p) => ({
        name: p.name,
        qty: p.qty,
        revenue: formatCurrency(p.revenue),
        cost: formatCurrency(p.cost),
        profit: formatCurrency(p.revenue - p.cost),
      })),
      summaryRows: [
        { label: 'Total Pendapatan:', value: formatCurrency(totalRevenue) },
        { label: 'Total HPP:', value: formatCurrency(totalCOGS) },
        { label: 'Laba Kotor:', value: formatCurrency(grossProfit) },
      ],
    });
  };

  const handleExportSalesExcel = () => {
    exportToExcel({
      title: 'Laporan Penjualan',
      filename: `laporan-penjualan-${Date.now()}`,
      columns: [
        { header: 'Produk', key: 'name', width: 30 },
        { header: 'Qty Terjual', key: 'qty', width: 12 },
        { header: 'Pendapatan', key: 'revenue', width: 18 },
        { header: 'HPP', key: 'cost', width: 18 },
        { header: 'Laba Kotor', key: 'profit', width: 18 },
      ],
      data: salesByProduct.map((p) => ({
        name: p.name,
        qty: p.qty,
        revenue: p.revenue,
        cost: p.cost,
        profit: p.revenue - p.cost,
      })),
      summaryRows: [
        { label: 'Total Pendapatan', value: formatCurrency(totalRevenue) },
        { label: 'Total HPP', value: formatCurrency(totalCOGS) },
        { label: 'Laba Kotor', value: formatCurrency(grossProfit) },
      ],
    });
  };

  const handleExportStockPDF = () => {
    exportToPDF({
      title: 'Laporan Stok',
      subtitle: `Toko: ${selectedStore === 'all' ? 'Semua' : getStoreName(selectedStore)}`,
      filename: `laporan-stok-${Date.now()}`,
      columns: [
        { header: 'Produk', key: 'name', width: 25 },
        { header: 'SKU', key: 'sku', width: 12 },
        { header: 'Kategori', key: 'category', width: 15 },
        { header: 'Stok', key: 'stock', width: 10 },
        { header: 'Min', key: 'minStock', width: 10 },
        { header: 'Harga Modal', key: 'buyPrice', width: 15 },
        { header: 'Nilai Stok', key: 'stockValue', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
      ],
      data: stockReport.map((p) => ({
        name: p.name,
        sku: p.sku,
        category: p.category,
        stock: p.stock,
        minStock: p.minStock,
        buyPrice: formatCurrency(p.buyPrice),
        stockValue: formatCurrency(p.stockValue),
        status: p.status,
      })),
      summaryRows: [
        {
          label: 'Total Nilai Stok:',
          value: formatCurrency(stockReport.reduce((s, p) => s + p.stockValue, 0)),
        },
      ],
    });
  };

  const handleExportStockExcel = () => {
    exportToExcel({
      title: 'Laporan Stok',
      filename: `laporan-stok-${Date.now()}`,
      columns: [
        { header: 'Produk', key: 'name', width: 30 },
        { header: 'SKU', key: 'sku', width: 12 },
        { header: 'Kategori', key: 'category', width: 15 },
        { header: 'Stok', key: 'stock', width: 10 },
        { header: 'Min Stok', key: 'minStock', width: 10 },
        { header: 'Harga Modal', key: 'buyPrice', width: 15 },
        { header: 'Nilai Stok', key: 'stockValue', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
      ],
      data: stockReport.map((p) => ({
        name: p.name,
        sku: p.sku,
        category: p.category,
        stock: p.stock,
        minStock: p.minStock,
        buyPrice: p.buyPrice,
        stockValue: p.stockValue,
        status: p.status,
      })),
    });
  };

  const handleExportProfitLossPDF = () => {
    exportToPDF({
      title: 'Laporan Laba Rugi',
      subtitle: `Toko: ${selectedStore === 'all' ? 'Semua' : getStoreName(selectedStore)} | Periode: ${dateFilterType}`,
      filename: `laporan-laba-rugi-${Date.now()}`,
      columns: [
        { header: 'Keterangan', key: 'label', width: 30 },
        { header: 'Jumlah', key: 'amount', width: 25 },
      ],
      data: [
        { label: 'Total Pendapatan', amount: formatCurrency(totalRevenue) },
        { label: 'Harga Pokok Penjualan (HPP)', amount: formatCurrency(totalCOGS) },
        { label: 'Laba Kotor', amount: formatCurrency(grossProfit) },
        { label: '', amount: '' },
        { label: '--- Rincian Pengeluaran ---', amount: '' },
        ...expenseBreakdown.map((e) => ({ label: `  ${e.name}`, amount: formatCurrency(e.amount) })),
        { label: 'Total Pengeluaran Operasional', amount: formatCurrency(totalExpenses) },
        { label: '', amount: '' },
        { label: 'LABA BERSIH (Net Profit)', amount: formatCurrency(netProfit) },
      ],
    });
  };

  const handleExportProfitLossExcel = () => {
    exportToExcel({
      title: 'Laporan Laba Rugi',
      filename: `laporan-laba-rugi-${Date.now()}`,
      columns: [
        { header: 'Keterangan', key: 'label', width: 35 },
        { header: 'Jumlah (Rp)', key: 'amount', width: 20 },
      ],
      data: [
        { label: 'Total Pendapatan', amount: totalRevenue },
        { label: 'Harga Pokok Penjualan (HPP)', amount: totalCOGS },
        { label: 'Laba Kotor', amount: grossProfit },
        { label: '', amount: '' },
        ...expenseBreakdown.map((e) => ({ label: e.name, amount: e.amount })),
        { label: 'Total Pengeluaran Operasional', amount: totalExpenses },
        { label: '', amount: '' },
        { label: 'LABA BERSIH (Net Profit)', amount: netProfit },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laporan</h1>
          <p className="text-muted-foreground">
            Unduh laporan penjualan, stok, dan laba rugi
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <DateFilter
            value={dateFilterType}
            dateRange={dateRange}
            onChange={handleDateFilterChange}
          />
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pendapatan</p>
              <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-green-100 text-green-600">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">HPP</p>
              <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(totalCOGS)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Laba Kotor</p>
              <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(grossProfit)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pengeluaran</p>
              <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-red-100 text-red-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className={`rounded-xl border p-5 ${netProfit >= 0 ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Laba Bersih</p>
              <p className={`text-xl font-bold mt-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(netProfit)}
              </p>
            </div>
            <div className={`p-2.5 rounded-lg ${netProfit >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Profit/Loss Bar Chart */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">Ringkasan Laba Rugi</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={profitLossData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Bar
              dataKey="value"
              fill="hsl(173, 58%, 39%)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            Penjualan
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-2">
            <Package className="w-4 h-4" />
            Stok
          </TabsTrigger>
          <TabsTrigger value="profitloss" className="gap-2">
            <Receipt className="w-4 h-4" />
            Laba Rugi
          </TabsTrigger>
        </TabsList>

        {/* Sales Report */}
        <TabsContent value="sales" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Laporan penjualan per produk</p>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={handleExportSalesPDF}>
                <FileDown className="w-4 h-4" />
                PDF
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleExportSalesExcel}>
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </Button>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Qty Terjual</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                  <TableHead className="text-right">HPP</TableHead>
                  <TableHead className="text-right">Laba Kotor</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesByProduct.map((p) => {
                  const profit = p.revenue - p.cost;
                  const margin = p.revenue > 0 ? (profit / p.revenue) * 100 : 0;
                  return (
                    <TableRow key={p.name}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right">{p.qty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(p.cost)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(profit)}
                      </TableCell>
                      <TableCell className="text-right">{margin.toFixed(1)}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {salesByProduct.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Tidak ada data penjualan</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Stock Report */}
        <TabsContent value="stock" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Laporan stok produk saat ini</p>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={handleExportStockPDF}>
                <FileDown className="w-4 h-4" />
                PDF
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleExportStockExcel}>
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </Button>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Min</TableHead>
                  <TableHead className="text-right">Harga Modal</TableHead>
                  <TableHead className="text-right">Nilai Stok</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockReport.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{p.sku}</TableCell>
                    <TableCell className="text-muted-foreground">{p.category}</TableCell>
                    <TableCell className="text-right font-bold">{p.stock}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{p.minStock}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.buyPrice)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.stockValue)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          p.status === 'Habis'
                            ? 'bg-red-100 text-red-700'
                            : p.status === 'Menipis'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {p.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Profit/Loss Report */}
        <TabsContent value="profitloss" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Laporan laba rugi lengkap</p>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={handleExportProfitLossPDF}>
                <FileDown className="w-4 h-4" />
                PDF
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleExportProfitLossExcel}>
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </Button>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-2/3">Keterangan</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold text-foreground">PENDAPATAN</TableCell>
                  <TableCell />
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8">Total Penjualan ({filteredTransactions.length} transaksi)</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(totalRevenue)}</TableCell>
                </TableRow>
                <TableRow className="bg-muted/30">
                  <TableCell className="font-semibold">Harga Pokok Penjualan (HPP)</TableCell>
                  <TableCell className="text-right font-medium text-red-600">
                    ({formatCurrency(totalCOGS)})
                  </TableCell>
                </TableRow>
                <TableRow className="bg-green-50 dark:bg-green-950/20">
                  <TableCell className="font-bold text-green-700 dark:text-green-400">LABA KOTOR</TableCell>
                  <TableCell className="text-right font-bold text-green-700 dark:text-green-400">
                    {formatCurrency(grossProfit)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold text-foreground pt-6">PENGELUARAN OPERASIONAL</TableCell>
                  <TableCell />
                </TableRow>
                {expenseBreakdown.map((e) => (
                  <TableRow key={e.name}>
                    <TableCell className="pl-8">{e.name}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(e.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30">
                  <TableCell className="font-semibold">Total Pengeluaran Operasional</TableCell>
                  <TableCell className="text-right font-medium text-red-600">
                    ({formatCurrency(totalExpenses)})
                  </TableCell>
                </TableRow>
                <TableRow className={netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-red-50 dark:bg-red-950/20'}>
                  <TableCell className={`font-bold text-lg ${netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                    LABA BERSIH (Net Profit)
                  </TableCell>
                  <TableCell className={`text-right font-bold text-lg ${netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                    {formatCurrency(netProfit)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
