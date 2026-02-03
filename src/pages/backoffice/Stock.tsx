import { useState } from 'react';
import { 
  products, 
  stores, 
  stockPerStore, 
  getProductStock, 
  sampleStockOpnames, 
  sampleStockTransfers,
  categories 
} from '@/data/sampleData';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Building2, 
  ArrowRightLeft, 
  ClipboardCheck,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StockOpname, StockTransfer } from '@/types/pos';

export default function Stock() {
  const [selectedStore, setSelectedStore] = useState('store-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isOpnameModalOpen, setIsOpnameModalOpen] = useState(false);
  const [selectedOpname, setSelectedOpname] = useState<StockOpname | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);

  // Get stock data for selected store
  const storeStock = stockPerStore.filter(s => s.storeId === selectedStore);
  
  const filteredStock = products.filter((product) => {
    return product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
           product.barcode.includes(searchQuery);
  }).map(product => {
    const stockData = storeStock.find(s => s.productId === product.id);
    return {
      ...product,
      stock: stockData?.quantity ?? 0,
      lastUpdated: stockData?.lastUpdated ?? new Date(),
    };
  });

  const lowStockCount = filteredStock.filter(p => p.stock < p.minStock && p.stock > 0).length;
  const outOfStockCount = filteredStock.filter(p => p.stock === 0).length;
  const totalStockValue = filteredStock.reduce((sum, p) => sum + (p.stock * p.buyPrice), 0);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return { label: 'Draft', variant: 'secondary' as const };
      case 'in_progress': return { label: 'Berlangsung', variant: 'default' as const };
      case 'completed': return { label: 'Selesai', variant: 'outline' as const };
      case 'cancelled': return { label: 'Dibatalkan', variant: 'destructive' as const };
      case 'pending': return { label: 'Menunggu', variant: 'secondary' as const };
      case 'in_transit': return { label: 'Dalam Perjalanan', variant: 'default' as const };
      case 'received': return { label: 'Diterima', variant: 'outline' as const };
      default: return { label: status, variant: 'secondary' as const };
    }
  };

  const getStoreName = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    return store?.name.split(' - ')[1] || store?.name || storeId;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Stok</h1>
          <p className="text-muted-foreground">Kelola stok, opname, dan transfer antar toko</p>
        </div>
        <Select value={selectedStore} onValueChange={setSelectedStore}>
          <SelectTrigger className="w-[250px]">
            <Building2 className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Pilih Toko" />
          </SelectTrigger>
          <SelectContent>
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total SKU</p>
              <p className="text-xl font-bold">{products.length}</p>
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

      {/* Tabs */}
      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock" className="gap-2">
            <Package className="w-4 h-4" />
            Stok Produk
          </TabsTrigger>
          <TabsTrigger value="opname" className="gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Stock Opname
          </TabsTrigger>
          <TabsTrigger value="transfer" className="gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            Transfer Stok
          </TabsTrigger>
        </TabsList>

        {/* Stock Tab */}
        <TabsContent value="stock" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, SKU, atau barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Export
            </Button>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Min. Stok</TableHead>
                  <TableHead className="text-right">Nilai Stok</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStock.map((product) => {
                  const isLow = product.stock < product.minStock && product.stock > 0;
                  const isOut = product.stock === 0;
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg">
                            {categories.find(c => c.id === product.categoryId)?.icon || '📦'}
                          </div>
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">{product.sku}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {categories.find(c => c.id === product.categoryId)?.name}
                      </TableCell>
                      <TableCell className="text-right font-bold">{product.stock}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{product.minStock}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.stock * product.buyPrice)}
                      </TableCell>
                      <TableCell>
                        {isOut ? (
                          <Badge variant="destructive">Habis</Badge>
                        ) : isLow ? (
                          <Badge variant="secondary">Menipis</Badge>
                        ) : (
                          <Badge variant="outline">Tersedia</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Stock Opname Tab */}
        <TabsContent value="opname" className="space-y-4">
          <div className="flex justify-between">
            <p className="text-muted-foreground">
              Stock opname untuk memastikan keakuratan data stok
            </p>
            <Dialog open={isOpnameModalOpen} onOpenChange={setIsOpnameModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Mulai Stock Opname
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Mulai Stock Opname Baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Toko</Label>
                    <Select defaultValue={selectedStore}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Catatan</Label>
                    <Textarea placeholder="Catatan stock opname (opsional)" />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsOpnameModalOpen(false)}>
                      Batal
                    </Button>
                    <Button onClick={() => setIsOpnameModalOpen(false)}>
                      Mulai Opname
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Opname</TableHead>
                  <TableHead>Toko</TableHead>
                  <TableHead>Tanggal Mulai</TableHead>
                  <TableHead>Tanggal Selesai</TableHead>
                  <TableHead>Dibuat Oleh</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleStockOpnames.map((opname) => {
                  const status = getStatusLabel(opname.status);
                  return (
                    <TableRow key={opname.id}>
                      <TableCell className="font-medium">{opname.id}</TableCell>
                      <TableCell>{getStoreName(opname.storeId)}</TableCell>
                      <TableCell>{formatDate(opname.startedAt)}</TableCell>
                      <TableCell>
                        {opname.completedAt ? formatDate(opname.completedAt) : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{opname.createdBy}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => setSelectedOpname(opname)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Transfer Tab */}
        <TabsContent value="transfer" className="space-y-4">
          <div className="flex justify-between">
            <p className="text-muted-foreground">
              Transfer stok antar toko/cabang
            </p>
            <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Buat Transfer Baru
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transfer Stok Antar Toko</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Dari Toko</Label>
                      <Select defaultValue="store-1">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name.split(' - ')[1] || store.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Ke Toko</Label>
                      <Select defaultValue="store-2">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name.split(' - ')[1] || store.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Catatan</Label>
                    <Textarea placeholder="Catatan transfer (opsional)" />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>
                      Batal
                    </Button>
                    <Button onClick={() => setIsTransferModalOpen(false)}>
                      Lanjut Pilih Produk
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Transfer</TableHead>
                  <TableHead>Dari</TableHead>
                  <TableHead>Ke</TableHead>
                  <TableHead>Tanggal Buat</TableHead>
                  <TableHead>Tanggal Terima</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleStockTransfers.map((transfer) => {
                  const status = getStatusLabel(transfer.status);
                  return (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">{transfer.id}</TableCell>
                      <TableCell>{getStoreName(transfer.fromStoreId)}</TableCell>
                      <TableCell>{getStoreName(transfer.toStoreId)}</TableCell>
                      <TableCell>{formatDate(transfer.createdAt)}</TableCell>
                      <TableCell>
                        {transfer.receivedAt ? formatDate(transfer.receivedAt) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => setSelectedTransfer(transfer)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
