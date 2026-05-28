import { useState, useMemo, useEffect } from 'react';
import { getProductsByStore, Product } from '@/services/productsService';
import { createStockOpname } from '@/services/stockOpnameService';
import { useAuth } from '@/contexts/AuthContext';
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
  storeId: number;
  onBack: () => void;
}

interface OpnameItem {
  productId: number;
  name: string;
  code: string;
  categoryName: string;
  systemQty: number;
  actualQty: number | null;
  difference: number;
  notes: string;
}

// Hardcoded categories (same as Products.tsx)
const storeCategories = [
  { id: 1, name: 'Sembako', icon: '🌾' },
  { id: 2, name: 'Snack', icon: '🍪' },
  { id: 3, name: 'Minuman', icon: '🥤' },
  { id: 4, name: 'Kebersihan', icon: '🧼' },
];

export function StockOpnameDetail({ storeId, onBack }: StockOpnameDetailProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [opnameItems, setOpnameItems] = useState<OpnameItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load products from Supabase
  useEffect(() => {
    loadProducts();
  }, [storeId]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const products = await getProductsByStore(storeId);
      
      const items: OpnameItem[] = products.map((p) => ({
        productId: p.id,
        name: p.name,
        code: p.code,
        categoryName: storeCategories.find((c) => c.id === p.category_id)?.name || '',
        systemQty: p.quantity,
        actualQty: null,
        difference: 0,
        notes: '',
      }));
      
      setOpnameItems(items);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Gagal memuat produk');
    } finally {
      setIsLoading(false);
    }
  };

  useBarcodeScanner({
    onScan: (barcode) => {
      const idx = opnameItems.findIndex((item) => item.code === barcode);
      if (idx >= 0) {
        setSearchQuery(barcode);
        toast.success(`Produk ditemukan: ${opnameItems[idx].name}`);
      } else {
        toast.error(`Produk dengan barcode ${barcode} tidak ditemukan`);
      }
    },
  });

  const updateActualQty = (productId: number, value: string) => {
    const qty = value === '' ? null : parseInt(value, 10);
    setOpnameItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, actualQty: qty, difference: qty !== null ? qty - item.systemQty : 0 }
          : item
      )
    );
  };

  const updateNotes = (productId: number, notes: string) => {
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
        item.code.toLowerCase().includes(q)
    );
  }, [opnameItems, searchQuery]);

  const filledCount = opnameItems.filter((i) => i.actualQty !== null).length;
  const discrepancyCount = opnameItems.filter(
    (i) => i.actualQty !== null && i.difference !== 0
  ).length;

  const handleSave = async () => {
    // Draft save - not implemented yet, just show message
    toast.info('Fitur simpan draft akan segera tersedia');
  };

  const handleComplete = async () => {
    if (filledCount < opnameItems.length) {
      toast.error('Lengkapi semua stok aktual terlebih dahulu');
      return;
    }

    try {
      setIsSaving(true);

      // Generate opname number: SO-YYYYMMDD-XXX
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const opnameNumber = `SO-${dateStr}-${randomNum}`;

      // Prepare items for submission
      const items = opnameItems
        .filter(item => item.actualQty !== null)
        .map(item => ({
          product_id: item.productId,
          system_stock: item.systemQty,
          physical_stock: item.actualQty!,
          difference: item.difference,
          note: item.notes || undefined,
        }));

      // Create stock opname
      await createStockOpname({
        store_id: storeId,
        opname_number: opnameNumber,
        opname_date: now,
        note: `Stock opname ${filledCount} produk, ${discrepancyCount} selisih`,
        created_by: user?.email || undefined,
        items,
      });

      toast.success(`Stock opname selesai! ${filledCount} produk diperiksa, ${discrepancyCount} selisih ditemukan.`);
      onBack();
    } catch (error) {
      console.error('Error completing stock opname:', error);
      toast.error('Gagal menyelesaikan stock opname');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-foreground">Stock Opname</h2>
            <p className="text-sm text-muted-foreground">Memuat produk...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} disabled={isSaving}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-foreground">Stock Opname</h2>
            <p className="text-sm text-muted-foreground">
              {filledCount}/{opnameItems.length} produk diperiksa • {discrepancyCount} selisih
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4" />
            Simpan Draft
          </Button>
          <Button className="gap-2" onClick={handleComplete} disabled={isSaving}>
            <CheckCircle className="w-4 h-4" />
            {isSaving ? 'Menyimpan...' : 'Selesaikan Opname'}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Progress</span>
          <span className="text-sm text-muted-foreground">
            {opnameItems.length > 0 ? Math.round((filledCount / opnameItems.length) * 100) : 0}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5">
          <div
            className="bg-primary h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${opnameItems.length > 0 ? (filledCount / opnameItems.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama atau scan barcode..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-barcode-input="true"
        />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead>Kode</TableHead>
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
                  {item.code}
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
                        item.difference === 0 ? 'outline' : item.difference > 0 ? 'default' : 'destructive'
                      }
                      className="gap-1"
                    >
                      {item.difference > 0 && '+'}
                      {item.difference}
                      {item.difference !== 0 && <AlertTriangle className="w-3 h-3" />}
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
