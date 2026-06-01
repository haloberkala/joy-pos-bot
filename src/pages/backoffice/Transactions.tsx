import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSalesByStore, getSaleItemsBySale, Sale } from '@/services/salesService';
import { getCustomersByStore } from '@/services/customersService';
import { getStoreById } from '@/services/storesService';
import { 
  createDebtPayment, 
  getDebtPaymentsBySale, 
  getTotalPaidForSale,
  DebtPayment 
} from '@/services/debtPaymentsService';
import { formatCurrency, formatDate } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, Wallet, CreditCard, QrCode, AlertTriangle, Check, Clock, DollarSign, User, Printer, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateFilter, DateFilterType, DateRange, getDateRangeFromFilter } from '@/components/backoffice/DateFilter';
import { toast } from 'sonner';
import { printInvoice } from '@/components/pos/PrintInvoice';

export default function Transactions() {
  const { activeStoreId } = useAuth();
  const [activeTab, setActiveTab] = useState<'transactions' | 'debts'>('transactions');
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

  // Supabase data
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedSaleItems, setSelectedSaleItems] = useState<any[]>([]);
  const [selectedDebtPayments, setSelectedDebtPayments] = useState<DebtPayment[]>([]);
  const [debtTotals, setDebtTotals] = useState<Map<number, { paid: number; remaining: number }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStore, setCurrentStore] = useState<any>(null);

  // Load data from Supabase
  useEffect(() => {
    loadData();
  }, [activeStoreId, refreshKey]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [salesData, customersData, storeData] = await Promise.all([
        getSalesByStore(activeStoreId),
        getCustomersByStore(activeStoreId),
        getStoreById(activeStoreId),
      ]);
      
      setSales(salesData);
      setCustomers(customersData);
      setCurrentStore(storeData);

      // Calculate debt totals for all debt sales
      const debtSalesData = salesData.filter(s => s.payment_status === 'debt');
      const totalsMap = new Map();
      
      for (const sale of debtSalesData) {
        const paid = await getTotalPaidForSale(sale.id);
        const remaining = Math.max(0, sale.grand_total - paid);
        totalsMap.set(sale.id, { paid, remaining });
      }
      
      setDebtTotals(totalsMap);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data transaksi');
    } finally {
      setIsLoading(false);
    }
  };

  // Load sale items when sale is selected
  useEffect(() => {
    if (selectedSale) {
      loadSaleItems(selectedSale.id);
    }
  }, [selectedSale]);

  const loadSaleItems = async (saleId: number) => {
    try {
      const items = await getSaleItemsBySale(saleId);
      setSelectedSaleItems(items);
    } catch (error) {
      console.error('Error loading sale items:', error);
    }
  };

  // Load debt payments when debt is selected
  useEffect(() => {
    if (selectedDebt) {
      loadDebtPayments(selectedDebt.id);
    }
  }, [selectedDebt, refreshKey]);

  const loadDebtPayments = async (saleId: number) => {
    try {
      const payments = await getDebtPaymentsBySale(saleId);
      setSelectedDebtPayments(payments);
    } catch (error) {
      console.error('Error loading debt payments:', error);
    }
  };

  const handleDateFilterChange = (type: DateFilterType, range: DateRange) => {
    setDateFilterType(type);
    setDateRange(range);
  };

  // ========== TRANSACTIONS ==========
  const filteredSales = useMemo(() => {
    let filtered = sales;
    
    // Date filter
    if (dateRange.from) {
      filtered = filtered.filter(s => new Date(s.sale_date) >= dateRange.from!);
    }
    if (dateRange.to) {
      filtered = filtered.filter(s => new Date(s.sale_date) <= dateRange.to!);
    }
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(s => 
        s.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => 
      new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
    );
  }, [sales, dateRange, searchQuery]);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.grand_total, 0);

  const isOwnerWithdrawal = (sale: Sale) => {
    return sale.invoice_number.startsWith('OWN-');
  };

  const getPaymentIcon = (method: string | null, sale?: Sale) => {
    // Check if owner withdrawal
    if (sale && isOwnerWithdrawal(sale)) {
      return <User className="w-4 h-4" />;
    }
    
    switch (method) {
      case 'cash': return <Wallet className="w-4 h-4" />;
      case 'transfer': return <CreditCard className="w-4 h-4" />;
      case 'qris': return <QrCode className="w-4 h-4" />;
      case 'debt': return <Clock className="w-4 h-4" />;
      default: return null;
    }
  };

  const getPaymentLabel = (method: string | null, sale?: Sale) => {
    // Check if owner withdrawal
    if (sale && isOwnerWithdrawal(sale)) {
      return 'Owner';
    }
    
    switch (method) {
      case 'cash': return 'Tunai';
      case 'transfer': return 'Transfer';
      case 'qris': return 'QRIS';
      case 'debt': return 'Utang';
      default: return method || '-';
    }
  };

  // ========== DEBTS ==========
  const debtSales = useMemo(() => {
    // Get all sales that are debt or have been paid (were debt before)
    let filtered = sales.filter(s => s.payment_status === 'debt' || s.payment_status === 'paid');
    
    // Filter by status
    if (debtFilter === 'unpaid') {
      // Show only debts that are still unpaid
      filtered = filtered.filter(s => s.payment_status === 'debt');
    } else if (debtFilter === 'paid') {
      // Show only debts that have been fully paid
      filtered = filtered.filter(s => {
        const debtInfo = debtTotals.get(s.id);
        // Must be marked as paid AND have payment history
        return s.payment_status === 'paid' && debtInfo && debtInfo.paid > 0;
      });
    }
    // 'all' shows both unpaid and paid debts
    
    // Search filter
    if (debtSearch) {
      const q = debtSearch.toLowerCase();
      filtered = filtered.filter(s => {
        const customer = customers.find(c => c.id === s.customer_id);
        return s.invoice_number.toLowerCase().includes(q) || 
               customer?.name.toLowerCase().includes(q);
      });
    }
    
    return filtered.sort((a, b) => 
      new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
    );
  }, [sales, debtTotals, debtFilter, debtSearch, customers]);

  const totalUnpaid = useMemo(() => {
    return sales
      .filter(s => s.payment_status === 'debt')
      .reduce((sum, s) => {
        const debtInfo = debtTotals.get(s.id);
        return sum + (debtInfo?.remaining || s.grand_total);
      }, 0);
  }, [sales, debtTotals]);

  const unpaidCount = sales.filter(s => s.payment_status === 'debt').length;

  const getCustomerName = (id: number | null) => {
    if (!id) return 'Umum';
    return customers.find(c => c.id === id)?.name || '-';
  };

  const getRemainingDebtForSale = (sale: Sale): number => {
    const debtInfo = debtTotals.get(sale.id);
    return debtInfo?.remaining || sale.grand_total;
  };

  const handlePay = async () => {
    if (!selectedDebt || !payAmount) {
      toast.error('Masukkan jumlah bayar');
      return;
    }
    
    const amount = parseFloat(payAmount);
    const remaining = getRemainingDebtForSale(selectedDebt);
    
    if (amount <= 0 || amount > remaining) {
      toast.error(`Jumlah tidak valid. Sisa: ${formatCurrency(remaining)}`);
      return;
    }
    
    try {
      setIsSaving(true);
      
      await createDebtPayment({
        sale_id: selectedDebt.id,
        amount,
        payment_date: new Date(),
        note: payNote || undefined,
      });
      
      setPayAmount('');
      setPayNote('');
      setRefreshKey(k => k + 1);
      
      toast.success(`Pembayaran ${formatCurrency(amount)} berhasil`);
      
      if (amount >= remaining) {
        setSelectedDebt(null);
        toast.success('Utang LUNAS!');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Gagal memproses pembayaran');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transaksi & Utang</h1>
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

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

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="transactions" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Riwayat Transaksi
          </TabsTrigger>
          <TabsTrigger value="debts" className="gap-2">
            <Wallet className="w-4 h-4" />
            Daftar Utang
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Riwayat Transaksi */}
        <TabsContent value="transactions" className="space-y-4 mt-0">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Cari invoice..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <DateFilter value={dateFilterType} dateRange={dateRange} onChange={handleDateFilterChange} />
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
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
                  {filteredSales.map((sale) => {
                    const isOwner = isOwnerWithdrawal(sale);
                    return (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium font-mono text-xs">{sale.invoice_number}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatDate(new Date(sale.sale_date))}</TableCell>
                      <TableCell>
                        {isOwner ? (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                            Owner
                          </Badge>
                        ) : sale.payment_method ? (
                          <Badge variant="outline" className="text-xs">
                            {getPaymentLabel(sale.payment_method, sale)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isOwner ? (
                          <Badge variant="default" className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs">Pengambilan</Badge>
                        ) : sale.payment_status === 'paid' ? (
                          <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">Lunas</Badge>
                        ) : sale.payment_status === 'refunded' ? (
                          <Badge variant="default" className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">
                            Refund
                          </Badge>
                        ) : sale.payment_status === 'debt' ? (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-xs">Utang</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">{formatCurrency(sale.grand_total)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedSale(sale)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {filteredSales.length === 0 && (
              <div className="text-center py-12 text-muted-foreground"><p>Tidak ada transaksi</p></div>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Daftar Utang */}
        <TabsContent value="debts" className="space-y-4 mt-0">
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

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
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
                    const remaining = getRemainingDebtForSale(sale);
                    const isOverdue = sale.due_date && new Date() > new Date(sale.due_date) && sale.payment_status === 'debt';
                    return (
                      <TableRow key={sale.id} className={isOverdue ? 'bg-red-50/50' : ''}>
                        <TableCell>
                          <div className="font-medium text-sm">{getCustomerName(sale.customer_id)}</div>
                          {sale.due_date && (
                            <div className={`text-xs ${isOverdue ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                              JT: {formatDate(new Date(sale.due_date))} {isOverdue && '⚠️'}
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
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Tidak ada data utang</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detail Transaksi</DialogTitle></DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Invoice</p><p className="font-medium">{selectedSale.invoice_number}</p></div>
                <div><p className="text-muted-foreground">Tanggal</p><p className="font-medium">{formatDate(new Date(selectedSale.sale_date))}</p></div>
                <div>
                  <p className="text-muted-foreground">Pembayaran</p>
                  <p className="font-medium">
                    {isOwnerWithdrawal(selectedSale) ? 'Pengambilan Owner' : getPaymentLabel(selectedSale.payment_method, selectedSale)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">
                    {isOwnerWithdrawal(selectedSale) ? 'Pengambilan' : 
                     selectedSale.payment_status === 'paid' ? 'Lunas' : 
                     selectedSale.payment_status === 'refunded' ? 'Direfund' : 
                     selectedSale.payment_status === 'debt' ? 'Utang' : '-'}
                  </p>
                </div>
              </div>
              {isOwnerWithdrawal(selectedSale) && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-purple-700 mb-1">
                    <User className="w-4 h-4" />
                    <p className="font-semibold text-sm">Pengambilan Owner</p>
                  </div>
                  <p className="text-sm text-purple-900">
                    Transaksi ini adalah pengambilan barang oleh owner dengan diskon 100%
                  </p>
                </div>
              )}
              {selectedSale.payment_status === 'refunded' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-700 mb-1">
                    <RotateCcw className="w-4 h-4" />
                    <p className="font-semibold text-sm">Alasan Refund</p>
                  </div>
                  <p className="text-sm text-red-900">
                    {selectedSale.note || '(Tidak ada catatan alasan)'}
                  </p>
                </div>
              )}
              <div className="border-t pt-4">
                <p className="font-medium mb-2">Item</p>
                <div className="space-y-2">
                  {selectedSaleItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.product_name || item.service_name || `Item #${item.id}`} x{item.quantity}</span>
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
              <div className="border-t pt-4">
                <Button variant="outline" className="w-full gap-2" onClick={() => {
                  if (currentStore) {
                    printInvoice({ 
                      sale: selectedSale, 
                      items: selectedSaleItems, 
                      store: currentStore,
                      customerName: getCustomerName(selectedSale.customer_id),
                    });
                  }
                }}>
                  <Printer className="w-4 h-4" /> Cetak Faktur
                </Button>
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
                <div><span className="text-muted-foreground">Tanggal</span><p className="font-medium">{formatDate(new Date(selectedDebt.sale_date))}</p></div>
                <div><span className="text-muted-foreground">Total Utang</span><p className="font-bold text-lg">{formatCurrency(selectedDebt.grand_total)}</p></div>
                <div><span className="text-muted-foreground">Sisa</span><p className="font-bold text-lg text-orange-600">{formatCurrency(getRemainingDebtForSale(selectedDebt))}</p></div>
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
                        <span className="text-xs text-muted-foreground">{formatDate(new Date(p.payment_date))}</span>
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
                    <Button variant="outline" size="sm" onClick={() => setPayAmount(String(getRemainingDebtForSale(selectedDebt)))}>Bayar Lunas</Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Catatan (opsional)</Label>
                    <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Catatan pembayaran" />
                  </div>
                  <Button onClick={handlePay} className="w-full gap-2" disabled={isSaving}>
                    <DollarSign className="w-4 h-4" /> {isSaving ? 'Memproses...' : 'Konfirmasi Pembayaran'}
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
