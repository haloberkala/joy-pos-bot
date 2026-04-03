import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Search, RotateCcw, AlertTriangle } from 'lucide-react';
import { Sale } from '@/types/pos';
import { sampleSales, sampleSaleDetails, getProduct, customers } from '@/data/sampleData';
import { formatCurrency, formatDate } from '@/lib/format';
import { toast } from 'sonner';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: number;
  onRefund: (sale: Sale, reason: string) => void;
}

export function RefundModal({ isOpen, onClose, storeId, onRefund }: RefundModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return sampleSales
      .filter(s => s.store_id === storeId && s.payment_status !== 'refunded' as any)
      .filter(s => {
        const customer = s.customer_id ? customers.find(c => c.id === s.customer_id) : null;
        return s.invoice_number.toLowerCase().includes(q) ||
          customer?.name.toLowerCase().includes(q) || false;
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);
  }, [searchQuery, storeId]);

  const saleDetails = useMemo(() => {
    if (!selectedSale) return [];
    return sampleSaleDetails
      .filter(d => d.sale_id === selectedSale.id)
      .map(d => ({ ...d, product: getProduct(d.product_id) }));
  }, [selectedSale]);

  const getCustomerName = (id: number | null) =>
    id ? customers.find(c => c.id === id)?.name || '-' : 'Umum';

  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    setShowConfirm(false);
    setRefundReason('');
  };

  const handleConfirmRefund = () => {
    if (!refundReason.trim()) {
      toast.error('Alasan refund wajib diisi');
      return;
    }
    if (!selectedSale) return;
    onRefund(selectedSale, refundReason.trim());
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedSale(null);
    setRefundReason('');
    setShowConfirm(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { handleReset(); onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Refund / Retur Transaksi
          </DialogTitle>
        </DialogHeader>

        {!selectedSale ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari invoice atau nama pelanggan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {searchResults.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {searchResults.map(sale => (
                  <button
                    key={sale.id}
                    onClick={() => handleSelectSale(sale)}
                    className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono font-bold text-sm">{sale.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">{getCustomerName(sale.customer_id)} • {formatDate(sale.date)}</p>
                      </div>
                      <p className="font-bold text-foreground">{formatCurrency(sale.grand_total)}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery.trim() ? (
              <p className="text-center text-muted-foreground py-8">Transaksi tidak ditemukan</p>
            ) : (
              <p className="text-center text-muted-foreground py-8">Ketik nomor invoice atau nama pelanggan</p>
            )}
          </div>
        ) : !showConfirm ? (
          <div className="space-y-4">
            <button onClick={() => setSelectedSale(null)} className="text-sm text-primary hover:underline">← Kembali ke pencarian</button>

            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Invoice</span>
                <span className="font-mono font-bold">{selectedSale.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Pelanggan</span>
                <span className="font-medium">{getCustomerName(selectedSale.customer_id)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Tanggal</span>
                <span>{formatDate(selectedSale.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Status</span>
                <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                  {selectedSale.payment_status === 'paid' ? 'Lunas' : 'Utang'}
                </Badge>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Item Transaksi</p>
              <div className="space-y-1.5">
                {saleDetails.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.product?.name || `#${item.product_id}`} × {item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.total_price)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-3 pt-2 flex justify-between font-bold">
                <span>Total Refund</span>
                <span className="text-destructive">{formatCurrency(selectedSale.grand_total)}</span>
              </div>
            </div>

            <Button onClick={() => setShowConfirm(true)} variant="destructive" className="w-full gap-2">
              <RotateCcw className="w-4 h-4" />
              Proses Refund 100%
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <button onClick={() => setShowConfirm(false)} className="text-sm text-primary hover:underline">← Kembali ke detail</button>

            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-destructive">Konfirmasi Refund</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Refund sebesar <strong>{formatCurrency(selectedSale.grand_total)}</strong> untuk invoice{' '}
                  <strong>{selectedSale.invoice_number}</strong>. Stok barang akan dikembalikan.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Alasan Refund *</Label>
              <Textarea
                placeholder="Masukkan alasan refund (wajib diisi)..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={3}
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1">Batal</Button>
              <Button variant="destructive" onClick={handleConfirmRefund} className="flex-1 gap-2" disabled={!refundReason.trim()}>
                <RotateCcw className="w-4 h-4" />
                Konfirmasi Refund
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
