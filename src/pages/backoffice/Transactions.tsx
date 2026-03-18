import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sampleSales, sampleSaleDetails, getProduct } from '@/data/sampleData';
import { formatCurrency, formatDate } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Eye, Wallet, CreditCard, QrCode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sale } from '@/types/pos';
import { DateFilter, DateFilterType, DateRange, getDateRangeFromFilter } from '@/components/backoffice/DateFilter';

export default function Transactions() {
  const { activeStoreId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('all');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromFilter('all'));

  const handleDateFilterChange = (type: DateFilterType, range: DateRange) => {
    setDateFilterType(type);
    setDateRange(range);
  };

  const filteredSales = useMemo(() => {
    let filtered = sampleSales.filter(s => s.store_id === activeStoreId);
    if (dateRange.from) filtered = filtered.filter(s => s.date >= dateRange.from!);
    if (dateRange.to) filtered = filtered.filter(s => s.date <= dateRange.to!);
    if (searchQuery) {
      filtered = filtered.filter(s => s.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [activeStoreId, dateRange, searchQuery]);

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

  const selectedSaleDetails = useMemo(() => {
    if (!selectedSale) return [];
    return sampleSaleDetails
      .filter(d => d.sale_id === selectedSale.id)
      .map(d => ({ ...d, product: getProduct(d.product_id) }));
  }, [selectedSale]);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.grand_total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transaksi</h1>
          <p className="text-muted-foreground">Riwayat transaksi penjualan</p>
        </div>
        <Button variant="outline" className="gap-2"><Download className="w-4 h-4" />Export</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Total Transaksi</p>
          <p className="text-2xl font-bold text-foreground mt-1">{filteredSales.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Total Pendapatan</p>
          <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Rata-rata / Transaksi</p>
          <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari invoice..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <DateFilter value={dateFilterType} dateRange={dateRange} onChange={handleDateFilterChange} />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Pembayaran</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-medium font-mono">{sale.invoice_number}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(sale.date)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1">
                    {getPaymentIcon(sale.payment_method)}
                    {getPaymentLabel(sale.payment_method)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {sale.payment_status === 'paid' ? (
                    <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">Lunas</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">Utang</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(sale.grand_total)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedSale(sale)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredSales.length === 0 && (
          <div className="text-center py-12 text-muted-foreground"><p>Tidak ada transaksi ditemukan</p></div>
        )}
      </div>

      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Invoice</p>
                  <p className="font-medium">{selectedSale.invoice_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tanggal</p>
                  <p className="font-medium">{formatDate(selectedSale.date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Metode Pembayaran</p>
                  <p className="font-medium">{getPaymentLabel(selectedSale.payment_method)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedSale.payment_status === 'paid' ? 'Lunas' : 'Utang'}</p>
                </div>
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
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span><span>{formatCurrency(selectedSale.sub_total)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Diskon</span><span>-{formatCurrency(selectedSale.discount)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-semibold">
                  <span>Total</span><span>{formatCurrency(selectedSale.grand_total)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Dibayar</span><span>{formatCurrency(selectedSale.amount_received)}</span>
                </div>
                {selectedSale.change_amount > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Kembalian</span><span>{formatCurrency(selectedSale.change_amount)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
