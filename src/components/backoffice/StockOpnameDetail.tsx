import { useState, useMemo } from 'react';
import { products, stockPerStore, categories } from '@/data/sampleData';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Save, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';

interface StockOpnameDetailProps {
  storeId: string;
  onBack: () => void;
}

interface OpnameItem {
  productId: string;
  name: string;
  sku: string;
  barcode: string;
  categoryName: string;
  systemQty: number;
  actualQty: number | null;
  difference: number;
  notes: string;
}

export function StockOpnameDetail({ storeId, onBack }: StockOpnameDetailProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [opnameItems, setOpnameItems] = useState<OpnameItem[]>(() => {
    return products.map((p) => {
      const stock = stockPerStore.find(
        (s) => s.productId === p.id && s.storeId === storeId
      );
      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        categoryName: categories.find((c) => c.id === p.categoryId)?.name || '',
        systemQty: stock?.quantity ?? 0,
        actualQty: null,
        difference: 0,
        notes: '',
      };
    });
  });

  // Barcode scanner support for quick navigation
  useBarcodeScanner({
    onScan: (barcode) => {
      const idx = opnameItems.findIndex((item) => item.barcode === barcode);
      if (idx >= 0) {
        setSearchQuery(barcode);
        toast.success(`Produk ditemukan: ${opnameItems[idx].name}`);
      } else {
        toast.error(`Produk dengan barcode ${barcode} tidak ditemukan`);
      }
    },
  });

  const updateActualQty = (productId: string, value: string) => {
    const qty = value === '' ? null : parseInt(value, 10);
    setOpnameItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              actualQty: qty,
              difference: qty !== null ? qty - item.systemQty : 0,
            }
          : item
      )
    );
  };

  const updateNotes = (productId: string, notes: string) => {
    setOpnameItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, notes } : item
      )
    );
  };

  const filtered = useMemo(() => {
    if (!searchQuery) return opnameItems;
    const q = searchQuery.toLowerCase();
    return opnameItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.barcode.includes(q)
    );
  }, [opnameItems, searchQuery]);

  const filledCount = opnameItems.filter((i) => i.actualQty !== null).length;
  const discrepancyCount = opnameItems.filter(
    (i) => i.actualQty !== null && i.difference !== 0
  ).length;

  const handleSave = () => {
    toast.success(
      `Stock opname disimpan! ${filledCount} produk diperiksa, ${discrepancyCount} selisih ditemukan.`
    );
  };

  const handleComplete = () => {
    if (filledCount < opnameItems.length) {
      toast.error('Lengkapi semua stok aktual terlebih dahulu');
      return;
    }
    toast.success('Stock opname selesai! Stok telah disesuaikan.');
    onBack();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-foreground">Stock Opname</h2>
            <p className="text-sm text-muted-foreground">
              {filledCount}/{opnameItems.length} produk diperiksa •{' '}
              {discrepancyCount} selisih
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleSave}>
            <Save className="w-4 h-4" />
            Simpan Draft
          </Button>
          <Button className="gap-2" onClick={handleComplete}>
            <CheckCircle className="w-4 h-4" />
            Selesaikan Opname
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Progress</span>
          <span className="text-sm text-muted-foreground">
            {Math.round((filledCount / opnameItems.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5">
          <div
            className="bg-primary h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${(filledCount / opnameItems.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama, SKU, atau scan barcode..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-barcode-input="true"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Stok Sistem</TableHead>
              <TableHead className="text-right">Stok Aktual</TableHead>
              <TableHead className="text-right">Selisih</TableHead>
              <TableHead>Catatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow
                key={item.productId}
                className={
                  item.actualQty !== null && item.difference !== 0
                    ? 'bg-orange-50/60 dark:bg-orange-950/10'
                    : ''
                }
              >
                <TableCell>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.categoryName}</div>
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {item.sku}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {item.systemQty}
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    min={0}
                    className="w-20 text-right ml-auto h-9"
                    placeholder="..."
                    value={item.actualQty ?? ''}
                    onChange={(e) => updateActualQty(item.productId, e.target.value)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  {item.actualQty !== null ? (
                    <Badge
                      variant={
                        item.difference === 0
                          ? 'outline'
                          : item.difference > 0
                          ? 'default'
                          : 'destructive'
                      }
                      className="gap-1"
                    >
                      {item.difference > 0 && '+'}
                      {item.difference}
                      {item.difference !== 0 && (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    className="h-9 text-sm"
                    placeholder="Catatan..."
                    value={item.notes}
                    onChange={(e) => updateNotes(item.productId, e.target.value)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
