import { Transaction } from '@/types/pos';
import { formatCurrency, formatDate } from '@/lib/format';
import { stores } from '@/data/sampleData';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Banknote, CreditCard, Smartphone, ShoppingBag } from 'lucide-react';

interface TransactionsTableProps {
  transactions: Transaction[];
  limit?: number;
  showAll?: boolean;
}

const PaymentIcon = ({ method }: { method: string }) => {
  switch (method) {
    case 'cash':
      return <Banknote className="w-4 h-4 text-green-600" />;
    case 'card':
      return <CreditCard className="w-4 h-4 text-blue-600" />;
    case 'qris':
      return <Smartphone className="w-4 h-4 text-purple-600" />;
    default:
      return null;
  }
};

const PaymentBadge = ({ method }: { method: string }) => {
  const variants: Record<string, { label: string; className: string }> = {
    cash: { label: 'Tunai', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
    card: { label: 'Kartu', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
    qris: { label: 'QRIS', className: 'bg-purple-100 text-purple-700 hover:bg-purple-100' },
  };
  const v = variants[method] || { label: method, className: '' };
  return (
    <Badge variant="secondary" className={v.className}>
      <PaymentIcon method={method} />
      <span className="ml-1">{v.label}</span>
    </Badge>
  );
};

export function TransactionsTable({ transactions, limit = 10, showAll = false }: TransactionsTableProps) {
  const displayedTransactions = showAll ? transactions : transactions.slice(0, limit);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Transaksi Terbaru</h3>
          <p className="text-sm text-muted-foreground">
            {showAll ? `${transactions.length} transaksi` : `Menampilkan ${displayedTransactions.length} dari ${transactions.length}`}
          </p>
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Transaksi</TableHead>
              <TableHead>Toko</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead className="text-center">Item</TableHead>
              <TableHead>Pembayaran</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedTransactions.map((transaction) => {
              const store = stores.find(s => s.id === transaction.storeId);
              return (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-mono text-sm">{transaction.id}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{store?.name.replace('Minimarket Berkah - ', '') || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{formatDate(transaction.createdAt)}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{transaction.items.length}</Badge>
                  </TableCell>
                  <TableCell>
                    <PaymentBadge method={transaction.paymentMethod} />
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(transaction.total)}
                  </TableCell>
                </TableRow>
              );
            })}
            {displayedTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Tidak ada transaksi
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
