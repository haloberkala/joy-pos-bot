import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  sampleSales, customers, stores, getDebtPaymentsForSale,
  getTotalPaidForSale, getRemainingDebt, addDebtPayment,
} from '@/data/sampleData';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle, Check, Clock, DollarSign, Eye, Search, User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Sale, DebtPayment } from '@/types/pos';

export default function Debts() {
  const { activeStoreId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'paid'>('unpaid');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const debtSales = useMemo(() => {
    let filtered = sampleSales.filter(s => s.store_id === activeStoreId && (s.payment_status === 'debt' || s.customer_id));
    // Only keep sales that were ever debt
    filtered = filtered.filter(s => s.payment_status === 'debt' || getTotalPaidForSale(s.id) > 0);

    if (filterStatus === 'unpaid') filtered = filtered.filter(s => s.payment_status === 'debt');
    if (filterStatus === 'paid') filtered = filtered.filter(s => s.payment_status === 'paid' && getTotalPaidForSale(s.id) > 0);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => {
        const customer = customers.find(c => c.id === s.customer_id);
        return s.invoice_number.toLowerCase().includes(q) ||
               customer?.name.toLowerCase().includes(q) ||
               customer?.phone.includes(q);
      });
    }

    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStoreId, filterStatus, searchQuery, refreshKey]);

  const totalUnpaid = useMemo(() =>
    sampleSales
      .filter(s => s.store_id === activeStoreId && s.payment_status === 'debt')
      .reduce((sum, s) => sum + getRemainingDebt(s), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  [activeStoreId, refreshKey]);

  const unpaidCount = sampleSales.filter(s => s.store_id === activeStoreId && s.payment_status === 'debt').length;

  const handlePay = () => {
    if (!selectedSale || !payAmount) { toast.error('Masukkan jumlah bayar'); return; }
    const amount = parseFloat(payAmount);
    const remaining = getRemainingDebt(selectedSale);
    if (amount <= 0 || amount > remaining) { toast.error(`Jumlah tidak valid. Sisa utang: ${formatCurrency(remaining)}`); return; }

    const payment: DebtPayment = {
      id: Date.now(),
      sale_id: selectedSale.id,
      amount,
      date: new Date(),
      note: payNote || undefined,
      created_at: new Date(),
    };
    addDebtPayment(payment);
    setPayAmount('');
    setPayNote('');
    setRefreshKey(k => k + 1);
    toast.success(`Pembayaran ${formatCurrency(amount)} berhasil dicatat`);

    if (amount >= remaining) {
      setSelectedSale(null);
      toast.success('Utang telah LUNAS!');
    }
  };

  const getCustomerName = (customerId: number | null) => {
    if (!customerId) return 'Umum';
    return customers.find(c => c.id === customerId)?.name || '-';
  };

  const getCustomerPhone = (customerId: number | null) => {
    if (!customerId) return '';
    return customers.find(c => c.id === customerId)?.phone || '';
  };

  const selectedPayments = useMemo(() => {
    if (!selectedSale) return [];
    return getDebtPaymentsForSale(selectedSale.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSale, refreshKey]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daftar Utang</h1>
          <p className="text-muted-foreground">Kelola utang pelanggan dan riwayat pembayaran</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Piutang</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalUnpaid)}</p>
              <p className="text-xs text-muted-foreground mt-1">{unpaidCount} transaksi belum lunas</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-100 text-orange-600"><AlertTriangle className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Jatuh Tempo Terdekat</p>
              {(() => {
                const nearest = sampleSales
                  .filter(s => s.store_id === activeStoreId && s.payment_status === 'debt' && s.due_date)
                  .sort((a, b) => (a.due_date?.getTime() || 0) - (b.due_date?.getTime() || 0))[0];
                return nearest ? (
                  <>
                    <p className="text-lg font-bold text-foreground mt-1">{formatDate(nearest.due_date!)}</p>
                    <p className="text-xs text-muted-foreground">{getCustomerName(nearest.customer_id)}</p>
                  </>
                ) : <p className="text-lg font-bold text-foreground mt-1">-</p>;
              })()}
            </div>
            <div className="p-3 rounded-lg bg-red-100 text-red-600"><Clock className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Pelanggan Utang</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {new Set(sampleSales.filter(s => s.store_id === activeStoreId && s.payment_status === 'debt').map(s => s.customer_id)).size}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600"><User className="w-5 h-5" /></div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari invoice atau pelanggan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <TabsList>
            <TabsTrigger value="unpaid" className="gap-1"><AlertTriangle className="w-3.5 h-3.5" />Belum Lunas</TabsTrigger>
            <TabsTrigger value="paid" className="gap-1"><Check className="w-3.5 h-3.5" />Lunas</TabsTrigger>
            <TabsTrigger value="all">Semua</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Jatuh Tempo</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Terbayar</TableHead>
              <TableHead className="text-right">Sisa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {debtSales.map((sale) => {
              const paid = getTotalPaidForSale(sale.id);
              const remaining = getRemainingDebt(sale);
              const isOverdue = sale.due_date && new Date() > sale.due_date && sale.payment_status === 'debt';
              return (
                <TableRow key={sale.id} className={isOverdue ? 'bg-red-50/50' : ''}>
                  <TableCell className="font-mono font-medium">{sale.invoice_number}</TableCell>
                  <TableCell>
                    <div><span className="font-medium">{getCustomerName(sale.customer_id)}</span></div>
                    <div className="text-xs text-muted-foreground">{getCustomerPhone(sale.customer_id)}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(sale.date)}</TableCell>
                  <TableCell>
                    {sale.due_date ? (
                      <span className={isOverdue ? 'text-red-600 font-bold' : 'text-muted-foreground'}>
                        {formatDate(sale.due_date)}
                        {isOverdue && ' ⚠️'}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(sale.grand_total)}</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(paid)}</TableCell>
                  <TableCell className="text-right font-bold text-orange-600">{formatCurrency(remaining)}</TableCell>
                  <TableCell>
                    {sale.payment_status === 'paid' ? (
                      <Badge variant="default" className="bg-green-100 text-green-700">Lunas</Badge>
                    ) : isOverdue ? (
                      <Badge variant="destructive">Jatuh Tempo</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700">Belum Lunas</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedSale(sale); setPayAmount(''); setPayNote(''); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {debtSales.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Tidak ada data utang</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail & Payment Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Utang - {selectedSale?.invoice_number}</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Pelanggan</span><p className="font-bold">{getCustomerName(selectedSale.customer_id)}</p></div>
                <div><span className="text-muted-foreground">Tanggal</span><p className="font-medium">{formatDate(selectedSale.date)}</p></div>
                <div><span className="text-muted-foreground">Total Utang</span><p className="font-bold text-lg">{formatCurrency(selectedSale.grand_total)}</p></div>
                <div><span className="text-muted-foreground">Sisa</span><p className="font-bold text-lg text-orange-600">{formatCurrency(getRemainingDebt(selectedSale))}</p></div>
              </div>

              {/* Payment History */}
              <div>
                <h4 className="font-semibold mb-2">Riwayat Pembayaran</h4>
                {selectedPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Belum ada pembayaran</p>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedPayments.map((p) => (
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

              {/* Pay form */}
              {selectedSale.payment_status === 'debt' && (
                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-semibold">Catat Pembayaran</h4>
                  <div className="space-y-2">
                    <Label>Jumlah Bayar (Rp)</Label>
                    <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0" className="text-lg font-bold" />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPayAmount(String(getRemainingDebt(selectedSale)))}>Bayar Lunas</Button>
                    </div>
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
