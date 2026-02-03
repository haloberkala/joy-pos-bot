import { useState } from 'react';
import { products, categories, brands, stores, stockPerStore, getProductStock } from '@/data/sampleData';
import { formatCurrency } from '@/lib/format';
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
import { Plus, Search, Edit, Trash2, Barcode, Building2 } from 'lucide-react';
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
import { Product } from '@/types/pos';

export default function Products() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStore, setSelectedStore] = useState('store-1');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.barcode.includes(searchQuery) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? `${category.icon} ${category.name}` : categoryId;
  };

  const getBrandName = (brandId?: string) => {
    if (!brandId) return '-';
    const brand = brands.find(b => b.id === brandId);
    return brand?.name || '-';
  };

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock <= 0) return { label: 'Habis', variant: 'destructive' as const };
    if (stock < minStock) return { label: 'Menipis', variant: 'secondary' as const };
    return { label: 'Tersedia', variant: 'default' as const };
  };

  const calculateMargin = (buyPrice: number, sellPrice: number) => {
    return ((sellPrice - buyPrice) / buyPrice * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produk</h1>
          <p className="text-muted-foreground">Kelola produk, stok, dan harga</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Tambah Produk
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tambah Produk Baru</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Produk</Label>
                <Input id="name" placeholder="Nama produk" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <div className="relative">
                  <Input id="barcode" placeholder="Scan atau input barcode" />
                  <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" placeholder="SKU produk" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.id !== 'all').map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Satuan Dasar</Label>
                <Select defaultValue="unit-pcs">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unit-pcs">Pieces (pcs)</SelectItem>
                    <SelectItem value="unit-box">Box</SelectItem>
                    <SelectItem value="unit-kg">Kilogram (kg)</SelectItem>
                    <SelectItem value="unit-ltr">Liter (ltr)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyPrice">Harga Modal</Label>
                <Input id="buyPrice" type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellPrice">Harga Jual</Label>
                <Input id="sellPrice" type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStock">Stok Minimum</Label>
                <Input id="minStock" type="number" placeholder="10" />
              </div>
              <div className="col-span-2 flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Batal
                </Button>
                <Button onClick={() => setIsAddModalOpen(false)}>
                  Simpan Produk
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, SKU, atau barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-[200px]">
              <Building2 className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Pilih Toko" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name.split(' - ')[1] || store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="whitespace-nowrap"
              >
                {category.icon} {category.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead>SKU / Barcode</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Harga Modal</TableHead>
              <TableHead className="text-right">Harga Jual</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead className="text-right">Stok</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => {
              const stock = getProductStock(product.id, selectedStore);
              const stockStatus = getStockStatus(stock, product.minStock);
              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg">
                        {categories.find(c => c.id === product.categoryId)?.icon || '📦'}
                      </div>
                      <div>
                        <span className="font-medium block">{product.name}</span>
                        <span className="text-xs text-muted-foreground">{getBrandName(product.brandId)}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-mono text-muted-foreground">{product.sku}</div>
                      <div className="font-mono text-xs">{product.barcode}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {getCategoryLabel(product.categoryId)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(product.buyPrice)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(product.sellPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-green-600 font-medium">
                      {calculateMargin(product.buyPrice, product.sellPrice)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">{stock}</TableCell>
                  <TableCell>
                    <Badge variant={stockStatus.variant}>
                      {stockStatus.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setEditingProduct(product)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Tidak ada produk ditemukan</p>
          </div>
        )}
      </div>
    </div>
  );
}
