import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  sampleSales, sampleSaleDetails, getProduct, customers,
  getDebtPaymentsForSale, getTotalPaidForSale, getRemainingDebt, addDebtPayment,
} from '@/data/sampleData';
import { formatCurrency, formatDate } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Eye, Wallet, CreditCard, QrCode, AlertTriangle, Check, Clock, DollarSign, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sale, DebtPayment } from '@/types/pos';
import { DateFilter, DateFilterType, DateRange, getDateRangeFromFilter } from '@/components/backoffice/DateFilter';
import { toast } from 'sonner';

export default function Transactions() {
  const { activeStoreId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('all');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromFilter('all'));

  // Debt state
  const [debtSearch, setDebtSearch] = useState('');
  const [debtFilter, setDebtFilter] = useState<'all' | 'unpaid' | 'paid'>('unpaid');
  const [selectedDebt, setSelectedDebt] = useState<Sale | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDateFilterChange = (type: DateFilterType, range: DateRange) => {
    setDateFilterType(type);
    setDateRange(range);
  };

  // ========== TRANSACTIONS ==========
  const filteredSales = useMemo(() => {
    let filtered = sampleSales.filter(s => s.store_id === activeStoreId);
    if (dateRange.from) filtered = filtered.filter(s => s.date >= dateRange.from!);
    if (dateRange.to) filtered = filtered.filter(s => s.date <= dateRange.to!);
    if (searchQuery) {
      filtered = filtered.filter(s => s.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [activeStoreId, dateRange, searchQuery]);

  const selectedSaleDetails = useMemo(() => {
    if (!selectedSale) return [];
    return sampleSaleDetails
      .filter(d => d.sale_id === selectedSale.id)
      .map(d => ({ ...d, product: getProduct(d.product_id) }));
  }, [selectedSale]);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.grand_total, 0);

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Wallet className="w-4 h-4" />;
      case 'debit': return <CreditCard className="w-4 h-4" />;
      case 'qris': return <QrCode className="w-4 h-4" />;
      default: return null;
    }
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Tunai';
      case 'debit': return 'Debit';
      case 'qris': return 'QRIS';
      case 'transfer': return 'Transfer';
      default: return method;
    }
  };

  // ========== DEBTS ==========
  const debtSales = useMemo(() => {
    let filtered = sampleSales.filter(s => s.store_id === activeStoreId && (s.payment_status === 'debt' || getTotalPaidForSale(s.id) > 0));
    if (debtFilter === 'unpaid') filtered = filtered.filter(s => s.payment_status === 'debt');
    if (debtFilter === 'paid') filtered = filtered.filter(s => s.payment_status === 'paid' && getTotalPaidForSale(s.id) > 0);
    if (debtSearch) {
      const q = debtSearch.toLowerCase();
      filtered = filtered.filter(s => {
        const customer = customers.find(c => c.id === s.customer_id);
        return s.invoice_number.toLowerCase().includes(q) || customer?.name.toLowerCase().includes(q);
      });
    }
    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStoreId, debtFilter, debtSearch, refreshKey]);

  const totalUnpaid = useMemo(() =>
    sampleSales
      .filter(s => s.store_id === activeStoreId && s.payment_status === 'debt')
      .reduce((sum, s) => sum + getRemainingDebt(s), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  [activeStoreId, refreshKey]);

  const unpaidCount = sampleSales.filter(s => s.store_id === activeStoreId && s.payment_status === 'debt').length;

  const getCustomerName = (id: number | null) => id ? customers.find(c => c.id === id)?.name || '-' : 'Umum';

  const selectedDebtPayments = useMemo(() => {
    if (!selectedDebt) return [];
    return getDebtPaymentsForSale(selectedDebt.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDebt, refreshKey]);

  const handlePay = () => {
    if (!selectedDebt || !payAmount) { toast.error('Masukkan jumlah bayar'); return; }
    const amount = parseFloat(payAmount);
    const remaining = getRemainingDebt(selectedDebt);
    if (amount <= 0 || amount > remaining) { toast.error(`Jumlah tidak valid. Sisa: ${formatCurrency(remaining)}`); return; }
    addDebtPayment({ id: Date.now(), sale_id: selectedDebt.id, amount, date: new Date(), note: payNote || undefined, created_at: new Date() });
    setPayAmount(''); setPayNote('');
    setRefreshKey(k => k + 1);
    toast.success(`Pembayaran ${formatCurrency(amount)} berhasil`);
    if (amount >= remaining) { setSelectedDebt(null); toast.success('Utang LUNAS!'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Transaksi & Utang</h1>
        <p className="text-muted-foreground">Riwayat penjualan dan manajemen piutang</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Transaksi</p>
          <p className="text-2xl font-bold text-foreground mt-1">{filteredSales.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Pendapatan</p>
          <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Piutang</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalUnpaid)}</p>
            </div>
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600"><AlertTriangle className="w-4 h-4" /></div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Utang Belum Lunas</p>
          <p className="text-2xl font-bold text-foreground mt-1">{unpaidCount} transaksi</p>
        </div>
      </div>

      {/* Side by side: Transactions | Debts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* LEFT: Transactions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Riwayat Transaksi</h2>
            <Button variant="outline" size="sm" className="gap-2"><Download className="w-4 h-4" />Export</Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari invoice..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <DateFilter value={dateFilterType} dateRange={dateRange} onChange={handleDateFilterChange} />
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Bayar</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium font-mono text-xs">{sale.invoice_number}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatDate(sale.date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1 text-xs">
                        {getPaymentIcon(sale.payment_method)}
                        {getPaymentLabel(sale.payment_method)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sale.payment_status === 'paid' ? (
                        <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">Lunas</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-xs">Utang</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatCurrency(sale.grand_total)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedSale(sale)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredSales.length === 0 && (
              <div className="text-center py-8 text-muted-foreground"><p>Tidak ada transaksi</p></div>
            )}
          </div>
        </div>

        {/* RIGHT: Debts */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">Daftar Utang</h2>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari pelanggan/invoice..." value={debtSearch} onChange={(e) => setDebtSearch(e.target.value)} className="pl-10" />
            </div>
            <Tabs value={debtFilter} onValueChange={(v) => setDebtFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="unpaid" className="gap-1 text-xs"><AlertTriangle className="w-3 h-3" />Belum</TabsTrigger>
                <TabsTrigger value="paid" className="gap-1 text-xs"><Check className="w-3 h-3" />Lunas</TabsTrigger>
                <TabsTrigger value="all" className="text-xs">Semua</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debtSales.map((sale) => {
                  const remaining = getRemainingDebt(sale);
                  const isOverdue = sale.due_date && new Date() > sale.due_date && sale.payment_status === 'debt';
                  return (
                    <TableRow key={sale.id} className={isOverdue ? 'bg-red-50/50' : ''}>
                      <TableCell>
                        <div className="font-medium text-sm">{getCustomerName(sale.customer_id)}</div>
                        {sale.due_date && (
                          <div className={`text-xs ${isOverdue ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                            JT: {formatDate(sale.due_date)} {isOverdue && '⚠️'}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{sale.invoice_number}</TableCell>
                      <TableCell className="text-right font-semibold text-sm">{formatCurrency(sale.grand_total)}</TableCell>
                      <TableCell className="text-right font-bold text-orange-600 text-sm">{formatCurrency(remaining)}</TableCell>
                      <TableCell>
                        {sale.payment_status === 'paid' ? (
                          <Badge variant="default" className="bg-green-100 text-green-700 text-xs">Lunas</Badge>
                        ) : isOverdue ? (
                          <Badge variant="destructive" className="text-xs">Jatuh Tempo</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">Belum</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedDebt(sale); setPayAmount(''); setPayNote(''); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {debtSales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada data utang</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detail Transaksi</DialogTitle></DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Invoice</p><p className="font-medium">{selectedSale.invoice_number}</p></div>
                <div><p className="text-muted-foreground">Tanggal</p><p className="font-medium">{formatDate(selectedSale.date)}</p></div>
                <div><p className="text-muted-foreground">Pembayaran</p><p className="font-medium">{getPaymentLabel(selectedSale.payment_method)}</p></div>
                <div><p className="text-muted-foreground">Status</p><p className="font-medium">{selectedSale.payment_status === 'paid' ? 'Lunas' : 'Utang'}</p></div>
              </div>
              <div className="border-t pt-4">
                <p className="font-medium mb-2">Item</p>
                <div className="space-y-2">
                  {selectedSaleDetails.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.product?.name || `Produk #${item.product_id}`} x{item.quantity}</span>
                      <span className="font-medium">{formatCurrency(item.total_price)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-4 space-y-1">
                {selectedSale.discount > 0 && (
                  <>
                    <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(selectedSale.sub_total)}</span></div>
                    <div className="flex justify-between text-sm text-green-600"><span>Diskon</span><span>-{formatCurrency(selectedSale.discount)}</span></div>
                  </>
                )}
                <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(selectedSale.grand_total)}</span></div>
                <div className="flex justify-between text-sm text-muted-foreground"><span>Dibayar</span><span>{formatCurrency(selectedSale.amount_received)}</span></div>
                {selectedSale.change_amount > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground"><span>Kembalian</span><span>{formatCurrency(selectedSale.change_amount)}</span></div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Debt Detail & Payment Dialog */}
      <Dialog open={!!selectedDebt} onOpenChange={() => setSelectedDebt(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detail Utang - {selectedDebt?.invoice_number}</DialogTitle></DialogHeader>
          {selectedDebt && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Pelanggan</span><p className="font-bold">{getCustomerName(selectedDebt.customer_id)}</p></div>
                <div><span className="text-muted-foreground">Tanggal</span><p className="font-medium">{formatDate(selectedDebt.date)}</p></div>
                <div><span className="text-muted-foreground">Total Utang</span><p className="font-bold text-lg">{formatCurrency(selectedDebt.grand_total)}</p></div>
                <div><span className="text-muted-foreground">Sisa</span><p className="font-bold text-lg text-orange-600">{formatCurrency(getRemainingDebt(selectedDebt))}</p></div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Riwayat Pembayaran</h4>
                {selectedDebtPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Belum ada pembayaran</p>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedDebtPayments.map((p) => (
                      <div key={p.id} className="flex justify-between items-center bg-muted/50 rounded-lg px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium text-green-600">+{formatCurrency(p.amount)}</span>
                          {p.note && <span className="text-muted-foreground ml-2">• {p.note}</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(p.date)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedDebt.payment_status === 'debt' && (
                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-semibold">Catat Pembayaran</h4>
                  <div className="space-y-2">
                    <Label>Jumlah Bayar (Rp)</Label>
                    <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0" className="text-lg font-bold" />
                    <Button variant="outline" size="sm" onClick={() => setPayAmount(String(getRemainingDebt(selectedDebt)))}>Bayar Lunas</Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Catatan (opsional)</Label>
                    <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Catatan pembayaran" />
                  </div>
                  <Button onClick={handlePay} className="w-full gap-2">
                    <DollarSign className="w-4 h-4" /> Konfirmasi Pembayaran
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
