import { useState, useMemo } from 'react';
import { DateFilter, DateFilterType, DateRange, getDateRangeFromFilter } from '@/components/backoffice/DateFilter';
import { useReportData } from '@/hooks/useReportData';
import { formatCurrency, formatDate } from '@/lib/format';
import { exportToPDF } from '@/lib/exportUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import {
  FileDown, TrendingUp, TrendingDown, DollarSign, Package,
  ShoppingCart, Receipt, RotateCcw, Search, Loader2, RefreshCw,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string; icon: any; color: string; sub?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${color}`}><Icon className="w-4 h-4" /></div>
      </div>
    </div>
  );
}

function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="text-center py-10 text-muted-foreground text-sm">{text}</td>
    </tr>
  );
}

export default function Reports() {
  const { activeStoreId } = useAuth();
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('all');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromFilter('all'));
  const [search, setSearch] = useState('');

  const {
    sales, expenses, expenseCategories, salesByProduct, stockReport, refundReport,
    totalCOGS, totalPayroll, isLoading, error, reload,
    totalRevenue, grossProfit, totalExpenses, netProfit,
  } = useReportData(dateRange, dateFilterType);

  const handleDateChange = (type: DateFilterType, range: DateRange) => {
    setDateFilterType(type);
    setDateRange(range);
    setSearch('');
  };

  // Derived
  const expenseBreakdown = useMemo(() => {
    const map = new Map<number, number>();
    expenses.forEach((e) => map.set(e.category_id, (map.get(e.category_id) || 0) + e.amount));
    return expenseCategories
      .map((cat) => ({ name: cat.name, amount: map.get(cat.id) || 0 }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, expenseCategories]);

  const profitLossChartData = [
    { name: 'Pendapatan', value: totalRevenue, color: 'hsl(160,64%,45%)' },
    { name: 'HPP', value: totalCOGS, color: 'hsl(200,70%,50%)' },
    { name: 'Laba Kotor', value: grossProfit, color: 'hsl(245,100%,67%)' },
    { name: 'Pengeluaran', value: totalExpenses, color: 'hsl(0,72%,55%)' },
    { name: 'Laba Bersih', value: netProfit, color: netProfit >= 0 ? 'hsl(145,70%,40%)' : 'hsl(0,72%,55%)' },
  ];

  const q = search.toLowerCase();
  const filteredSales = useMemo(() => salesByProduct.filter((p) => p.product_name?.toLowerCase().includes(q)), [salesByProduct, q]);
  const filteredStock = useMemo(() => stockReport.filter((p) => p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)), [stockReport, q]);
  const filteredRefunds = useMemo(() => refundReport.filter((r) => r.invoice_number?.toLowerCase().includes(q) || r.customer_name?.toLowerCase().includes(q)), [refundReport, q]);

  // PDF Exports
  const exportSalesPDF = () => exportToPDF({
    title: 'Laporan Penjualan', subtitle: `Periode: ${dateFilterType}`, filename: `laporan-penjualan-${Date.now()}`,
    columns: [{ header: 'Produk', key: 'name', width: 28 }, { header: 'Qty', key: 'qty', width: 10 }, { header: 'Pendapatan', key: 'revenue', width: 20 }, { header: 'HPP', key: 'cost', width: 18 }, { header: 'Laba Kotor', key: 'profit', width: 18 }],
    data: filteredSales.map((p) => ({ name: p.product_name, qty: p.quantity, revenue: formatCurrency(p.revenue), cost: formatCurrency(p.cost), profit: formatCurrency(p.profit) })),
    summaryRows: [{ label: 'Total Pendapatan:', value: formatCurrency(totalRevenue) }, { label: 'Laba Kotor:', value: formatCurrency(grossProfit) }],
  });

  const exportStockPDF = () => exportToPDF({
    title: 'Laporan Stok', subtitle: `Toko ID: ${activeStoreId}`, filename: `laporan-stok-${Date.now()}`,
    columns: [{ header: 'Produk', key: 'name', width: 25 }, { header: 'Kode', key: 'code', width: 14 }, { header: 'Kategori', key: 'category', width: 14 }, { header: 'Brand', key: 'brand', width: 14 }, { header: 'Stok', key: 'stock', width: 10 }, { header: 'Min', key: 'min', width: 8 }, { header: 'Nilai Stok', key: 'value', width: 16 }, { header: 'Status', key: 'status', width: 10 }],
    data: filteredStock.map((p) => ({ name: p.name, code: p.code, category: p.category, brand: p.brand, stock: p.stock, min: p.min_stock, value: formatCurrency(p.stock_value), status: p.status })),
    summaryRows: [{ label: 'Total Nilai Stok:', value: formatCurrency(filteredStock.reduce((s, p) => s + p.stock_value, 0)) }],
  });

  const exportProfitLossPDF = () => exportToPDF({
    title: 'Laporan Laba Rugi', subtitle: `Periode: ${dateFilterType}`, filename: `laporan-laba-rugi-${Date.now()}`,
    columns: [{ header: 'Keterangan', key: 'label', width: 35 }, { header: 'Jumlah', key: 'amount', width: 25 }],
    data: [
      { label: 'Total Pendapatan', amount: formatCurrency(totalRevenue) },
      { label: 'Harga Pokok Penjualan (HPP)', amount: formatCurrency(totalCOGS) },
      { label: 'Laba Kotor', amount: formatCurrency(grossProfit) },
      { label: '─── Rincian Pengeluaran ───', amount: '' },
      ...expenseBreakdown.map((e) => ({ label: `  ${e.name}`, amount: formatCurrency(e.amount) })),
      { label: 'Total Pengeluaran', amount: formatCurrency(totalExpenses) },
      { label: 'LABA BERSIH', amount: formatCurrency(netProfit) },
    ],
  });

  const exportRefundPDF = () => exportToPDF({
    title: 'Laporan Refund', subtitle: `Periode: ${dateFilterType}`, filename: `laporan-refund-${Date.now()}`,
    columns: [{ header: 'Invoice', key: 'invoice', width: 20 }, { header: 'Pelanggan', key: 'customer', width: 20 }, { header: 'Alasan', key: 'reason', width: 30 }, { header: 'Jumlah', key: 'amount', width: 18 }, { header: 'Tanggal', key: 'date', width: 16 }],
    data: filteredRefunds.map((r) => ({ invoice: r.invoice_number, customer: r.customer_name, reason: r.reason, amount: formatCurrency(r.refund_amount), date: formatDate(new Date(r.refunded_at)) })),
    summaryRows: [{ label: 'Total Refund:', value: formatCurrency(filteredRefunds.reduce((s, r) => s + r.refund_amount, 0)) }],
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Memuat data laporan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-destructive">{error}</p>
        <Button onClick={reload} variant="outline" className="gap-2"><RefreshCw className="w-4 h-4" />Coba Lagi</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laporan</h1>
          <p className="text-muted-foreground text-sm">Analisis penjualan, stok, laba rugi, dan refund</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={reload} title="Refresh data"><RefreshCw className="w-4 h-4" /></Button>
          <DateFilter value={dateFilterType} dateRange={dateRange} onChange={handleDateChange} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Pendapatan" value={formatCurrency(totalRevenue)} icon={ShoppingCart} color="bg-green-100 text-green-600" sub={`${sales.length} transaksi`} />
        <StatCard label="HPP" value={formatCurrency(totalCOGS)} icon={Package} color="bg-blue-100 text-blue-600" />
        <StatCard label="Laba Kotor" value={formatCurrency(grossProfit)} icon={TrendingUp} color="bg-emerald-100 text-emerald-600" />
        <StatCard label="Pengeluaran" value={formatCurrency(totalExpenses)} icon={TrendingDown} color="bg-red-100 text-red-600" />
        <div className={`rounded-xl border p-5 col-span-2 lg:col-span-1 ${netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Laba Bersih</p>
              <p className={`text-xl font-bold mt-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(netProfit)}</p>
            </div>
            <div className={`p-2.5 rounded-lg ${netProfit >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}><DollarSign className="w-4 h-4" /></div>
          </div>
        </div>
      </div>

      {/* Profit/Loss Chart */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4 text-sm">Ringkasan Laba Rugi</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={profitLossChartData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }}
              formatter={(value: number) => [formatCurrency(value), '']}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
              {profitLossChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Global search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Cari di semua tab..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 text-sm" />
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales" className="gap-2 text-xs"><ShoppingCart className="w-3.5 h-3.5" />Penjualan</TabsTrigger>
          <TabsTrigger value="stock" className="gap-2 text-xs"><Package className="w-3.5 h-3.5" />Stok</TabsTrigger>
          <TabsTrigger value="profitloss" className="gap-2 text-xs"><Receipt className="w-3.5 h-3.5" />Laba Rugi</TabsTrigger>
          <TabsTrigger value="refunds" className="gap-2 text-xs"><RotateCcw className="w-3.5 h-3.5" />Refund</TabsTrigger>
        </TabsList>

        {/* ── Sales Tab ── */}
        <TabsContent value="sales" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{filteredSales.length} produk terjual</p>
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={exportSalesPDF}><FileDown className="w-3.5 h-3.5" />Export PDF</Button>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                  <TableHead className="text-right">HPP</TableHead>
                  <TableHead className="text-right">Laba Kotor</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? <EmptyRow cols={6} text="Tidak ada data penjualan pada periode ini" /> : filteredSales.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{p.product_name}</TableCell>
                    <TableCell className="text-right">{p.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(p.cost)}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">{formatCurrency(p.profit)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {p.revenue > 0 ? `${((p.profit / p.revenue) * 100).toFixed(1)}%` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Stock Tab ── */}
        <TabsContent value="stock" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Total nilai stok: <span className="font-semibold text-foreground">{formatCurrency(filteredStock.reduce((s, p) => s + p.stock_value, 0))}</span>
            </p>
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={exportStockPDF}><FileDown className="w-3.5 h-3.5" />Export PDF</Button>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Min</TableHead>
                  <TableHead className="text-right">Nilai Stok</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStock.length === 0 ? <EmptyRow cols={8} text="Tidak ada data stok" /> : filteredStock.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.code}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.category}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.brand}</TableCell>
                    <TableCell className="text-right font-bold">{p.stock}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{p.min_stock}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.stock_value)}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.status === 'Habis' ? 'bg-red-100 text-red-700' : p.status === 'Menipis' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{p.status}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Profit/Loss Tab ── */}
        <TabsContent value="profitloss" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Laporan laba rugi lengkap</p>
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={exportProfitLossPDF}><FileDown className="w-3.5 h-3.5" />Export PDF</Button>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Keterangan</TableHead><TableHead className="text-right">Jumlah</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-medium">Total Pendapatan</TableCell><TableCell className="text-right font-semibold text-green-600">{formatCurrency(totalRevenue)}</TableCell></TableRow>
                <TableRow><TableCell className="text-muted-foreground pl-6">Harga Pokok Penjualan (HPP)</TableCell><TableCell className="text-right text-muted-foreground">-{formatCurrency(totalCOGS)}</TableCell></TableRow>
                <TableRow className="bg-emerald-50/50"><TableCell className="font-semibold">Laba Kotor</TableCell><TableCell className="text-right font-bold text-emerald-600">{formatCurrency(grossProfit)}</TableCell></TableRow>
                <TableRow><TableCell className="text-xs text-muted-foreground pt-3 pb-1 font-medium uppercase tracking-wide" colSpan={2}>Pengeluaran Operasional</TableCell></TableRow>
                {expenseBreakdown.length === 0 && totalPayroll === 0
                  ? <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground text-sm py-4">Tidak ada pengeluaran tercatat</TableCell></TableRow>
                  : expenseBreakdown.map((e) => (
                    <TableRow key={e.name}><TableCell className="text-muted-foreground pl-6">{e.name}</TableCell><TableCell className="text-right text-red-600">-{formatCurrency(e.amount)}</TableCell></TableRow>
                  ))}
                {totalPayroll > 0 && (
                  <TableRow>
                    <TableCell className="text-muted-foreground pl-6">Gaji Karyawan</TableCell>
                    <TableCell className="text-right text-red-600">-{formatCurrency(totalPayroll)}</TableCell>
                  </TableRow>
                )}
                <TableRow><TableCell className="font-medium">Total Pengeluaran</TableCell><TableCell className="text-right font-semibold text-red-600">-{formatCurrency(totalExpenses)}</TableCell></TableRow>
                <TableRow className={netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}>
                  <TableCell className="font-bold text-base">LABA BERSIH</TableCell>
                  <TableCell className={`text-right font-bold text-base ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(netProfit)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Refund Tab ── */}
        <TabsContent value="refunds" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredRefunds.length} refund &nbsp;·&nbsp; Total: <span className="font-semibold text-destructive">{formatCurrency(filteredRefunds.reduce((s, r) => s + r.refund_amount, 0))}</span>
            </p>
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={exportRefundPDF}><FileDown className="w-3.5 h-3.5" />Export PDF</Button>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead className="text-right">Jumlah Refund</TableHead>
                  <TableHead>Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRefunds.length === 0 ? <EmptyRow cols={5} text="Belum ada riwayat refund" /> : filteredRefunds.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs font-medium">{r.invoice_number}</TableCell>
                    <TableCell>{r.customer_name}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground text-sm">{r.reason}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">{formatCurrency(r.refund_amount)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(new Date(r.refunded_at))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
