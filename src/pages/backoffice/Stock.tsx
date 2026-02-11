import { useState } from 'react';
import { products, stores, sampleStockOpnames, categories } from '@/data/sampleData';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Building2, ClipboardCheck, Package, AlertTriangle, TrendingUp, TrendingDown, Eye, FileSpreadsheet } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { toast } from 'sonner';
import { StockOpnameDetail } from '@/components/backoffice/StockOpnameDetail';

export default function Stock() {
  const [selectedStore, setSelectedStore] = useState<string>('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOpnameDetail, setShowOpnameDetail] = useState(false);

  useBarcodeScanner({
    onScan: (barcode) => {
      const product = products.find(p => p.code === barcode);
      if (product) {
        setSearchQuery(barcode);
        toast.success(`Produk ditemukan: ${product.name}`);
      } else {
        toast.error(`Produk dengan barcode ${barcode} tidak ditemukan`);
      }
    },
    enabled: !showOpnameDetail,
  });

  const storeProducts = products.filter(p => p.store_id === Number(selectedStore));

  const filteredStock = storeProducts.filter((product) => {
    return product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           product.code.includes(searchQuery);
  });

  const lowStockCount = filteredStock.filter(p => p.quantity < p.min_stock_alert && p.quantity > 0).length;
  const outOfStockCount = filteredStock.filter(p => p.quantity === 0).length;
  const totalStockValue = filteredStock.reduce((sum, p) => sum + (p.quantity * p.cost_price), 0);

  const getStoreName = (storeId: number) => {
    const store = stores.find(s => s.id === storeId);
    return store?.name.split(' - ')[1] || store?.name || String(storeId);
  };

  if (showOpnameDetail) {
    return (
      <StockOpnameDetail
        storeId={Number(selectedStore)}
        onBack={() => setShowOpnameDetail(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Stok</h1>
          <p className="text-muted-foreground">Kelola stok dan stock opname</p>
        </div>
        <Select value={selectedStore} onValueChange={setSelectedStore}>
          <SelectTrigger className="w-[250px]">
            <Building2 className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Pilih Toko" />
          </SelectTrigger>
          <SelectContent>
            {stores.map((store) => (
              <SelectItem key={store.id} value={String(store.id)}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total SKU</p>
              <p className="text-xl font-bold">{storeProducts.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nilai Stok</p>
              <p className="text-xl font-bold">{formatCurrency(totalStockValue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stok Menipis</p>
              <p className="text-xl font-bold">{lowStockCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stok Habis</p>
              <p className="text-xl font-bold">{outOfStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock" className="gap-2"><Package className="w-4 h-4" />Stok Produk</TabsTrigger>
          <TabsTrigger value="opname" className="gap-2"><ClipboardCheck className="w-4 h-4" />Stock Opname</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari nama atau scan barcode..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-barcode-input="true" />
            </div>
            <Button variant="outline" className="gap-2"><FileSpreadsheet className="w-4 h-4" />Export</Button>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Min. Alert</TableHead>
                  <TableHead className="text-right">Nilai Stok</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStock.map((product) => {
                  const isLow = product.quantity < product.min_stock_alert && product.quantity > 0;
                  const isOut = product.quantity === 0;
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg">
                            {categories.find(c => c.id === product.category_id)?.icon || '📦'}
                          </div>
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">{product.code}</TableCell>
                      <TableCell className="text-muted-foreground">{categories.find(c => c.id === product.category_id)?.name}</TableCell>
                      <TableCell className="text-right font-bold">{product.quantity}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{product.min_stock_alert}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.quantity * product.cost_price)}</TableCell>
                      <TableCell>
                        {isOut ? <Badge variant="destructive">Habis</Badge> : isLow ? <Badge variant="secondary">Menipis</Badge> : <Badge variant="outline">Tersedia</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="opname" className="space-y-4">
          <div className="flex justify-between">
            <p className="text-muted-foreground">Stock opname untuk memastikan keakuratan data stok</p>
            <Button className="gap-2" onClick={() => setShowOpnameDetail(true)}>
              <Plus className="w-4 h-4" />Mulai Stock Opname
            </Button>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Opname</TableHead>
                  <TableHead>Toko</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleStockOpnames.map((opname) => (
                  <TableRow key={opname.id}>
                    <TableCell className="font-medium">{opname.opname_number}</TableCell>
                    <TableCell>{getStoreName(opname.store_id)}</TableCell>
                    <TableCell>{formatDate(opname.date)}</TableCell>
                    <TableCell className="text-muted-foreground">{opname.note || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                    </TableCell>
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
