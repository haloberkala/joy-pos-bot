import { useState, useMemo } from 'react';
import {
  sampleSales, sampleSaleDetails, sampleExpenses, expenseCategories,
  products, stores, categories, getProduct,
} from '@/data/sampleData';
import { formatCurrency } from '@/lib/format';
import { exportToPDF, exportToExcel } from '@/lib/exportUtils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateFilter, DateFilterType, DateRange, getDateRangeFromFilter } from '@/components/backoffice/DateFilter';
import {
  FileDown, FileSpreadsheet, Building2, TrendingUp, TrendingDown,
  DollarSign, Package, ShoppingCart, Receipt,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Reports() {
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('all');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromFilter('all'));

  const handleDateFilterChange = (type: DateFilterType, range: DateRange) => {
    setDateFilterType(type);
    setDateRange(range);
  };

  const filteredSales = useMemo(() => {
    let filtered = sampleSales;
    if (selectedStore !== 'all') filtered = filtered.filter(s => s.store_id === Number(selectedStore));
    if (dateRange.from) filtered = filtered.filter(s => s.date >= dateRange.from!);
    if (dateRange.to) filtered = filtered.filter(s => s.date <= dateRange.to!);
    return filtered;
  }, [selectedStore, dateRange]);

  const filteredExpenses = useMemo(() => {
    let filtered = sampleExpenses;
    if (selectedStore !== 'all') filtered = filtered.filter(e => e.store_id === Number(selectedStore));
    if (dateRange.from) filtered = filtered.filter(e => e.date >= dateRange.from!);
    if (dateRange.to) filtered = filtered.filter(e => e.date <= dateRange.to!);
    return filtered;
  }, [selectedStore, dateRange]);

  // Get sale details for filtered sales
  const filteredSaleDetails = useMemo(() => {
    const saleIds = new Set(filteredSales.map(s => s.id));
    return sampleSaleDetails.filter(d => saleIds.has(d.sale_id));
  }, [filteredSales]);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.grand_total, 0);
  const totalCOGS = filteredSaleDetails.reduce((sum, d) => sum + d.cost_at_sale * d.quantity, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  const getStoreName = (storeId: number) => {
    const store = stores.find(s => s.id === storeId);
    return store?.name.split(' - ')[1] || store?.name || String(storeId);
  };

  const salesByProduct = useMemo(() => {
    const map = new Map<number, { name: string; qty: number; revenue: number; cost: number }>();
    filteredSaleDetails.forEach(d => {
      const product = getProduct(d.product_id);
      const existing = map.get(d.product_id) || { name: product?.name || `#${d.product_id}`, qty: 0, revenue: 0, cost: 0 };
      existing.qty += d.quantity;
      existing.revenue += d.total_price;
      existing.cost += d.cost_at_sale * d.quantity;
      map.set(d.product_id, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSaleDetails]);

  const expenseBreakdown = useMemo(() => {
    const map = new Map<number, number>();
    filteredExpenses.forEach(e => map.set(e.category_id, (map.get(e.category_id) || 0) + e.amount));
    return expenseCategories
      .map(cat => ({ name: cat.name, amount: map.get(cat.id) || 0 }))
      .filter(c => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  const profitLossData = useMemo(() => [
    { name: 'Pendapatan', value: totalRevenue },
    { name: 'HPP', value: totalCOGS },
    { name: 'Laba Kotor', value: grossProfit },
    { name: 'Pengeluaran', value: totalExpenses },
    { name: 'Laba Bersih', value: netProfit },
  ], [totalRevenue, totalCOGS, grossProfit, totalExpenses, netProfit]);

  const stockReport = useMemo(() => {
    const storeProducts = selectedStore === 'all' ? products : products.filter(p => p.store_id === Number(selectedStore));
    return storeProducts.map(p => {
      const category = categories.find(c => c.id === p.category_id)?.name || '-';
      return {
        id: p.id, name: p.name, code: p.code, category,
        stock: p.quantity, minStock: p.min_stock_alert,
        costPrice: p.cost_price, sellingPrice: p.selling_price,
        stockValue: p.quantity * p.cost_price,
        status: p.quantity === 0 ? 'Habis' : p.quantity < p.min_stock_alert ? 'Menipis' : 'Tersedia',
      };
    });
  }, [selectedStore]);

  // Export handlers
  const handleExportSalesPDF = () => {
    exportToPDF({
      title: 'Laporan Penjualan',
      subtitle: `Toko: ${selectedStore === 'all' ? 'Semua' : getStoreName(Number(selectedStore))}`,
      filename: `laporan-penjualan-${Date.now()}`,
      columns: [
        { header: 'Produk', key: 'name', width: 25 },
        { header: 'Qty', key: 'qty', width: 12 },
        { header: 'Pendapatan', key: 'revenue', width: 18 },
        { header: 'HPP', key: 'cost', width: 18 },
        { header: 'Laba Kotor', key: 'profit', width: 18 },
      ],
      data: salesByProduct.map(p => ({ name: p.name, qty: p.qty, revenue: formatCurrency(p.revenue), cost: formatCurrency(p.cost), profit: formatCurrency(p.revenue - p.cost) })),
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
        { header: 'Qty', key: 'qty', width: 12 },
        { header: 'Pendapatan', key: 'revenue', width: 18 },
        { header: 'HPP', key: 'cost', width: 18 },
        { header: 'Laba Kotor', key: 'profit', width: 18 },
      ],
      data: salesByProduct.map(p => ({ name: p.name, qty: p.qty, revenue: p.revenue, cost: p.cost, profit: p.revenue - p.cost })),
    });
  };

  const handleExportStockPDF = () => {
    exportToPDF({
      title: 'Laporan Stok',
      subtitle: `Toko: ${selectedStore === 'all' ? 'Semua' : getStoreName(Number(selectedStore))}`,
      filename: `laporan-stok-${Date.now()}`,
      columns: [
        { header: 'Produk', key: 'name', width: 25 }, { header: 'Kode', key: 'code', width: 15 },
        { header: 'Kategori', key: 'category', width: 15 }, { header: 'Stok', key: 'stock', width: 10 },
        { header: 'Min', key: 'minStock', width: 10 }, { header: 'Nilai Stok', key: 'stockValue', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
      ],
      data: stockReport.map(p => ({ name: p.name, code: p.code, category: p.category, stock: p.stock, minStock: p.minStock, stockValue: formatCurrency(p.stockValue), status: p.status })),
      summaryRows: [{ label: 'Total Nilai Stok:', value: formatCurrency(stockReport.reduce((s, p) => s + p.stockValue, 0)) }],
    });
  };

  const handleExportStockExcel = () => {
    exportToExcel({
      title: 'Laporan Stok',
      filename: `laporan-stok-${Date.now()}`,
      columns: [
        { header: 'Produk', key: 'name', width: 30 }, { header: 'Kode', key: 'code', width: 15 },
        { header: 'Kategori', key: 'category', width: 15 }, { header: 'Stok', key: 'stock', width: 10 },
        { header: 'Min Stok', key: 'minStock', width: 10 }, { header: 'Nilai Stok', key: 'stockValue', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
      ],
      data: stockReport.map(p => ({ name: p.name, code: p.code, category: p.category, stock: p.stock, minStock: p.minStock, stockValue: p.stockValue, status: p.status })),
    });
  };

  const handleExportProfitLossPDF = () => {
    exportToPDF({
      title: 'Laporan Laba Rugi',
      subtitle: `Toko: ${selectedStore === 'all' ? 'Semua' : getStoreName(Number(selectedStore))}`,
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
        ...expenseBreakdown.map(e => ({ label: `  ${e.name}`, amount: formatCurrency(e.amount) })),
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
        { label: 'HPP', amount: totalCOGS },
        { label: 'Laba Kotor', amount: grossProfit },
        { label: '', amount: '' },
        ...expenseBreakdown.map(e => ({ label: e.name, amount: e.amount })),
        { label: 'Total Pengeluaran', amount: totalExpenses },
        { label: '', amount: '' },
        { label: 'LABA BERSIH', amount: netProfit },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laporan</h1>
          <p className="text-muted-foreground">Unduh laporan penjualan, stok, dan laba rugi</p>
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
              {stores.map(store => (
                <SelectItem key={store.id} value={String(store.id)}>
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
            <div><p className="text-sm text-muted-foreground">Pendapatan</p><p className="text-xl font-bold text-foreground mt-1">{formatCurrency(totalRevenue)}</p></div>
            <div className="p-2.5 rounded-lg bg-green-100 text-green-600"><ShoppingCart className="w-4 h-4" /></div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div><p className="text-sm text-muted-foreground">HPP</p><p className="text-xl font-bold text-foreground mt-1">{formatCurrency(totalCOGS)}</p></div>
            <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600"><Package className="w-4 h-4" /></div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div><p className="text-sm text-muted-foreground">Laba Kotor</p><p className="text-xl font-bold text-foreground mt-1">{formatCurrency(grossProfit)}</p></div>
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600"><TrendingUp className="w-4 h-4" /></div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div><p className="text-sm text-muted-foreground">Pengeluaran</p><p className="text-xl font-bold text-foreground mt-1">{formatCurrency(totalExpenses)}</p></div>
            <div className="p-2.5 rounded-lg bg-red-100 text-red-600"><TrendingDown className="w-4 h-4" /></div>
          </div>
        </div>
        <div className={`rounded-xl border p-5 ${netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start justify-between">
            <div><p className="text-sm text-muted-foreground">Laba Bersih</p><p className={`text-xl font-bold mt-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(netProfit)}</p></div>
            <div className={`p-2.5 rounded-lg ${netProfit >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}><DollarSign className="w-4 h-4" /></div>
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
            <Bar dataKey="value" fill="hsl(173, 58%, 39%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales" className="gap-2"><ShoppingCart className="w-4 h-4" />Penjualan</TabsTrigger>
          <TabsTrigger value="stock" className="gap-2"><Package className="w-4 h-4" />Stok</TabsTrigger>
          <TabsTrigger value="profitloss" className="gap-2"><Receipt className="w-4 h-4" />Laba Rugi</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Laporan penjualan per produk</p>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={handleExportSalesPDF}><FileDown className="w-4 h-4" />PDF</Button>
              <Button variant="outline" className="gap-2" onClick={handleExportSalesExcel}><FileSpreadsheet className="w-4 h-4" />Excel</Button>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead><TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead><TableHead className="text-right">HPP</TableHead>
                  <TableHead className="text-right">Laba Kotor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesByProduct.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.qty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(p.cost)}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">{formatCurrency(p.revenue - p.cost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Laporan stok per produk</p>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={handleExportStockPDF}><FileDown className="w-4 h-4" />PDF</Button>
              <Button variant="outline" className="gap-2" onClick={handleExportStockExcel}><FileSpreadsheet className="w-4 h-4" />Excel</Button>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead><TableHead>Kode</TableHead><TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Stok</TableHead><TableHead className="text-right">Min</TableHead>
                  <TableHead className="text-right">Nilai Stok</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockReport.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{p.code}</TableCell>
                    <TableCell className="text-muted-foreground">{p.category}</TableCell>
                    <TableCell className="text-right font-bold">{p.stock}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{p.minStock}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.stockValue)}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${p.status === 'Habis' ? 'bg-red-100 text-red-700' : p.status === 'Menipis' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{p.status}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="profitloss" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Laporan laba rugi</p>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={handleExportProfitLossPDF}><FileDown className="w-4 h-4" />PDF</Button>
              <Button variant="outline" className="gap-2" onClick={handleExportProfitLossExcel}><FileSpreadsheet className="w-4 h-4" />Excel</Button>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Keterangan</TableHead><TableHead className="text-right">Jumlah</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-medium">Total Pendapatan</TableCell><TableCell className="text-right font-semibold">{formatCurrency(totalRevenue)}</TableCell></TableRow>
                <TableRow><TableCell className="text-muted-foreground">Harga Pokok Penjualan (HPP)</TableCell><TableCell className="text-right text-muted-foreground">({formatCurrency(totalCOGS)})</TableCell></TableRow>
                <TableRow className="border-t-2"><TableCell className="font-semibold">Laba Kotor</TableCell><TableCell className="text-right font-bold text-green-600">{formatCurrency(grossProfit)}</TableCell></TableRow>
                <TableRow><TableCell colSpan={2} className="font-medium pt-4">Pengeluaran Operasional</TableCell></TableRow>
                {expenseBreakdown.map((e, i) => (
                  <TableRow key={i}><TableCell className="pl-8 text-muted-foreground">{e.name}</TableCell><TableCell className="text-right text-muted-foreground">({formatCurrency(e.amount)})</TableCell></TableRow>
                ))}
                <TableRow className="border-t"><TableCell className="font-medium">Total Pengeluaran</TableCell><TableCell className="text-right font-semibold text-red-600">({formatCurrency(totalExpenses)})</TableCell></TableRow>
                <TableRow className="border-t-2 bg-muted/30">
                  <TableCell className="font-bold text-lg">LABA BERSIH</TableCell>
                  <TableCell className={`text-right font-bold text-lg ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(netProfit)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
