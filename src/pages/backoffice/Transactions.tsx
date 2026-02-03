import { useState } from 'react';
import { sampleTransactions, stores } from '@/data/sampleData';
import { formatCurrency, formatDate } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Eye, Wallet, CreditCard, QrCode, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Transaction } from '@/types/pos';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Transactions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedStore, setSelectedStore] = useState<string>('all');

  const filteredTransactions = sampleTransactions.filter((transaction) => {
    const matchesSearch = transaction.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStore = selectedStore === 'all' || transaction.storeId === selectedStore;
    return matchesSearch && matchesStore;
  });

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Wallet className="w-4 h-4" />;
      case 'card': return <CreditCard className="w-4 h-4" />;
      case 'qris': return <QrCode className="w-4 h-4" />;
      default: return null;
    }
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Tunai';
      case 'card': return 'Kartu';
      case 'qris': return 'QRIS';
      case 'transfer': return 'Transfer';
      default: return method;
    }
  };

  const getStoreName = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    return store?.name || storeId;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transaksi</h1>
          <p className="text-muted-foreground">Riwayat semua transaksi penjualan</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari transaksi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedStore} onValueChange={setSelectedStore}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <Building2 className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Pilih Toko" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Toko</SelectItem>
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Transaksi</TableHead>
              <TableHead>Toko</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Pembayaran</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">{transaction.id}</TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {getStoreName(transaction.storeId).split(' - ')[1] || getStoreName(transaction.storeId)}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(transaction.createdAt)}
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {transaction.items.length} item
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1">
                    {getPaymentIcon(transaction.paymentMethod)}
                    {getPaymentLabel(transaction.paymentMethod)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(transaction.total)}
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setSelectedTransaction(transaction)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Tidak ada transaksi ditemukan</p>
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">ID Transaksi</p>
                  <p className="font-medium">{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tanggal</p>
                  <p className="font-medium">{formatDate(selectedTransaction.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Toko</p>
                  <p className="font-medium">{getStoreName(selectedTransaction.storeId)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kasir</p>
                  <p className="font-medium">{selectedTransaction.cashierName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Metode Pembayaran</p>
                  <p className="font-medium">{getPaymentLabel(selectedTransaction.paymentMethod)}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="font-medium mb-2">Item</p>
                <div className="space-y-2">
                  {selectedTransaction.items.map((item) => (
                    <div key={item.product.id} className="flex justify-between text-sm">
                      <span>
                        {item.product.name} x{item.quantity}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(item.pricePerUnit * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-1">
                {selectedTransaction.discount > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatCurrency(selectedTransaction.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Diskon</span>
                      <span>-{formatCurrency(selectedTransaction.discount)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedTransaction.total)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Dibayar</span>
                  <span>{formatCurrency(selectedTransaction.amountPaid)}</span>
                </div>
                {selectedTransaction.change > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Kembalian</span>
                    <span>{formatCurrency(selectedTransaction.change)}</span>
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
