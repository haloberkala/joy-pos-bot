import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSalesByStore } from '@/services/salesService';
import { getExpensesByStore, getExpenseCategories } from '@/services/expensesService';
import { getSalesReport, getStockReport, getRefundReport, getTotalCOGS } from '@/services/reportsService';
import { formatCurrency, formatDate } from '@/lib/format';
import { exportToPDF, exportToExcel } from '@/lib/exportUtils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateFilter, DateFilterType, DateRange, getDateRangeFromFilter } from '@/components/backoffice/DateFilter';
import {
  FileDown, FileSpreadsheet, TrendingUp, TrendingDown,
  DollarSign, Package, ShoppingCart, Receipt, RotateCcw,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

export default function Reports() {
  const { activeStoreId } = useAuth();
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('all');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromFilter('all'));
  const [isLoading, setIsLoading] = useState(true);

  // Data from Supabase
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [salesByProduct, setSalesByProduct] = useState<any[]>([]);
  const [stockReport, setStockReport] = useState<any[]>([]);
  const [refundReport, setRefundReport] = useState<any[]>([]);
  const [totalCOGS, setTotalCOGS] = useState(0);

  // Load data from Supabase
  useEffect(() => {
    loadData();
  }, [activeStoreId, dateRange]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const dateFrom = dateRange.from || undefined;
      const dateTo = dateRange.to || undefined;

      const [
        salesData,
        expensesData,
        categoriesData,
        salesReportData,
        stockReportData,
        refundReportData,
        cogsData,
      ] = await Promise.all([
        getSalesByStore(activeStoreId),
        getExpensesByStore(activeStoreId),
        getExpenseCategories(),
        getSalesReport(activeStoreId, dateFrom, dateTo),
        getStockReport(activeStoreId),
        getRefundReport(activeStoreId, dateFrom, dateTo),
        getTotalCOGS(activeStoreId, dateFrom, dateTo),
      ]);

      // Filter sales by date
      let filteredSales = salesData.filter(s => s.payment_status !== 'refunded');
      if (dateFrom) {
        filteredSales = filteredSales.filter(s => new Date(s.sale_date) >= dateFrom);
      }
      if (dateTo) {
        filteredSales = filteredSales.filter(s => new Date(s.sale_date) <= dateTo);
      }

      // Filter expenses by date
      let filteredExpenses = expensesData;
      if (dateFrom) {
        filteredExpenses = filteredExpenses.filter(e => new Date(e.expense_date) >= dateFrom);
      }
      if (dateTo) {
        filteredExpenses = filteredExpenses.filter(e => new Date(e.expense_date) <= dateTo);
      }

      setSales(filteredSales);
      setExpenses(filteredExpenses);
      setExpenseCategories(categoriesData);
      setSalesByProduct(salesReportData);
      setStockReport(stockReportData);
      setRefundReport(refundReportData);
      setTotalCOGS(cogsData);
    } catch (error) {
      console.error('Error loading reports data:', error);
      toast.error('Gagal memuat data laporan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateFilterChange = (type: DateFilterType, range: DateRange) => {
    setDateFilterType(type);
    setDateRange(range);
  };

  const totalRevenue = sales.reduce((sum, s) => sum + s.grand_total, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  const expenseBreakdown = useMemo(() => {
    const map = new Map<number, number>();
    expenses.forEach(e => map.set(e.category_id, (map.get(e.category_id) || 0) + e.amount));
    return expenseCategories
      .map(cat => ({ name: cat.name, amount: map.get(cat.id) || 0 }))
      .filter(c => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, expenseCategories]);

  const profitLossData = useMemo(() => [
    { name: 'Pendapatan', value: totalRevenue },
    { name: 'HPP', value: totalCOGS },
    { name: 'Laba Kotor', value: grossProfit },
    { name: 'Pengeluaran', value: totalExpenses },
    { name: 'Laba Bersih', value: netProfit },
  ], [totalRevenue, totalCOGS, grossProfit, totalExpenses, netProfit]);

  const handleExportSalesPDF = () => {
    exportToPDF({
      title: 'Laporan Penjualan',
      subtitle: `Toko ID: ${activeStoreId}`,
      filename: `laporan-penjualan-${Date.now()}`,
      columns: [
        { header: 'Produk', key: 'name', width: 25 },
        { header: 'Qty', key: 'qty', width: 12 },
        { header: 'Pendapatan', key: 'revenue', width: 18 },
        { header: 'HPP', key: 'cost', width: 18 },
        { header: 'Laba Kotor', key: 'profit', width: 18 },
      ],
      data: salesByProduct.map(p => ({ 
        name: p.product_name, 
        qty: p.quantity, 
        revenue: formatCurrency(p.revenue), 
        cost: formatCurrency(p.cost), 
        profit: formatCurrency(p.profit) 
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
        { header: 'Qty', key: 'qty', width: 12 },
        { header: 'Pendapatan', key: 'revenue', width: 18 },
        { header: 'HPP', key: 'cost', width: 18 },
        { header: 'Laba Kotor', key: 'profit', width: 18 },
      ],
      data: salesByProduct.map(p => ({ 
        name: p.product_name, 
        qty: p.quantity, 
        revenue: p.revenue, 
        cost: p.cost, 
        profit: p.profit 
      })),
    });
  };

  const handleExportStockPDF = () => {
    exportToPDF({
      title: 'Laporan Stok',
      subtitle: `Toko ID: ${activeStoreId}`,
      filename: `laporan-stok-${Date.now()}`,
      columns: [
        { header: 'Produk', key: 'name', width: 25 }, { header: 'Kode', key: 'code', width: 15 },
        { header: 'Kategori', key: 'category', width: 15 }, { header: 'Stok', key: 'stock', width: 10 },
        { header: 'Min', key: 'minStock', width: 10 }, { header: 'Nilai Stok', key: 'stockValue', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
      ],
      data: stockReport.map(p => ({ 
        name: p.name, 
        code: p.code, 
        category: p.category, 
        stock: p.stock, 
        minStock: p.min_stock, 
        stockValue: formatCurrency(p.stock_value), 
        status: p.status 
      })),
      summaryRows: [{ label: 'Total Nilai Stok:', value: formatCurrency(stockReport.reduce((s, p) => s + p.stock_value, 0)) }],
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
      data: stockReport.map(p => ({ 
        name: p.name, 
        code: p.code, 
        category: p.category, 
        stock: p.stock, 
        minStock: p.min_stock, 
        stockValue: p.stock_value, 
        status: p.status 
      })),
    });
  };

  const handleExportProfitLossPDF = () => {
    exportToPDF({
      title: 'Laporan Laba Rugi',
      subtitle: `Toko ID: ${activeStoreId}`,
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laporan</h1>
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laporan</h1>
          <p className="text-muted-foreground">Unduh laporan penjualan, stok, dan laba rugi</p>
        </div>
        <DateFilter value={dateFilterType} dateRange={dateRange} onChange={handleDateFilterChange} />
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
          <TabsTrigger value="refunds" className="gap-2"><RotateCcw className="w-4 h-4" />Refund</TabsTrigger>
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
                    <TableCell className="font-medium">{p.product_name}</TableCell>
                    <TableCell className="text-right">{p.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(p.cost)}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">{formatCurrency(p.profit)}</TableCell>
                  </TableRow>
                ))}
                {salesByProduct.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Tidak ada data penjualan</TableCell>
                  </TableRow>
                )}
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
                    <TableCell className="text-right text-muted-foreground">{p.min_stock}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.stock_value)}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        p.status === 'Habis' ? 'bg-red-100 text-red-700' :
                        p.status === 'Menipis' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>{p.status}</span>
                    </TableCell>
                  </TableRow>
                ))}
                {stockReport.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Tidak ada data stok</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="profitloss" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Laporan laba rugi lengkap</p>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={handleExportProfitLossPDF}><FileDown className="w-4 h-4" />PDF</Button>
              <Button variant="outline" className="gap-2" onClick={handleExportProfitLossExcel}><FileSpreadsheet className="w-4 h-4" />Excel</Button>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-medium">Total Pendapatan</TableCell><TableCell className="text-right font-semibold">{formatCurrency(totalRevenue)}</TableCell></TableRow>
                <TableRow><TableCell className="text-muted-foreground">Harga Pokok Penjualan (HPP)</TableCell><TableCell className="text-right text-muted-foreground">{formatCurrency(totalCOGS)}</TableCell></TableRow>
                <TableRow className="bg-muted/50"><TableCell className="font-semibold">Laba Kotor</TableCell><TableCell className="text-right font-bold text-green-600">{formatCurrency(grossProfit)}</TableCell></TableRow>
                {expenseBreakdown.map(e => (
                  <TableRow key={e.name}><TableCell className="text-muted-foreground pl-8">{e.name}</TableCell><TableCell className="text-right text-red-600">-{formatCurrency(e.amount)}</TableCell></TableRow>
                ))}
                <TableRow><TableCell className="font-medium">Total Pengeluaran</TableCell><TableCell className="text-right font-semibold text-red-600">-{formatCurrency(totalExpenses)}</TableCell></TableRow>
                <TableRow className={netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}>
                  <TableCell className="font-bold text-lg">LABA BERSIH</TableCell>
                  <TableCell className={`text-right font-bold text-lg ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(netProfit)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="refunds" className="space-y-4">
          <p className="text-muted-foreground">Riwayat refund transaksi</p>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead className="text-right">Jumlah Refund</TableHead>
                  <TableHead>Diproses Oleh</TableHead>
                  <TableHead>Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refundReport.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada riwayat refund</TableCell>
                  </TableRow>
                ) : (
                  refundReport.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono font-medium text-xs">{r.invoice_number}</TableCell>
                      <TableCell>{r.customer_name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.reason}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">{formatCurrency(r.refund_amount)}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(new Date(r.refunded_at))}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
