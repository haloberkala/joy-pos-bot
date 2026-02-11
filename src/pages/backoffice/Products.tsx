import { useState } from 'react';
import { products, categories, brands, stores } from '@/data/sampleData';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Barcode, Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Product } from '@/types/pos';

export default function Products() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStore, setSelectedStore] = useState<string>('1');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.code.includes(searchQuery);
    const matchesCategory = selectedCategory === 'all' || product.category_id === Number(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (categoryId: number | null) => {
    if (!categoryId) return '-';
    const category = categories.find(c => c.id === categoryId);
    return category ? `${category.icon || ''} ${category.name}` : '-';
  };

  const getBrandName = (brandId: number | null) => {
    if (!brandId) return '-';
    const brand = brands.find(b => b.id === brandId);
    return brand?.name || '-';
  };

  const getStockStatus = (quantity: number, minStock: number) => {
    if (quantity <= 0) return { label: 'Habis', variant: 'destructive' as const };
    if (quantity < minStock) return { label: 'Menipis', variant: 'secondary' as const };
    return { label: 'Tersedia', variant: 'default' as const };
  };

  const calculateMargin = (costPrice: number, sellingPrice: number) => {
    if (costPrice === 0) return '0.0';
    return ((sellingPrice - costPrice) / costPrice * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
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
                <Label htmlFor="code">Barcode/SKU</Label>
                <div className="relative">
                  <Input id="code" placeholder="Scan atau input barcode" />
                  <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.id !== 0).map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
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
                      <SelectItem key={brand.id} value={String(brand.id)}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPrice">Harga Modal</Label>
                <Input id="costPrice" type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Harga Jual</Label>
                <Input id="sellingPrice" type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStock">Stok Minimum Alert</Label>
                <Input id="minStock" type="number" placeholder="10" />
              </div>
              <div className="col-span-2 flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Batal</Button>
                <Button onClick={() => setIsAddModalOpen(false)}>Simpan Produk</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari nama atau barcode..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-[200px]">
              <Building2 className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Pilih Toko" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={String(store.id)}>
                  {store.name.split(' - ')[1] || store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === String(category.id) || (selectedCategory === 'all' && category.id === 0) ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id === 0 ? 'all' : String(category.id))}
                className="whitespace-nowrap"
              >
                {category.icon} {category.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead>Kode</TableHead>
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
              const stockStatus = getStockStatus(product.quantity, product.min_stock_alert);
              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg">
                        {categories.find(c => c.id === product.category_id)?.icon || '📦'}
                      </div>
                      <div>
                        <span className="font-medium block">{product.name}</span>
                        <span className="text-xs text-muted-foreground">{getBrandName(product.brand_id)}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm text-muted-foreground">{product.code}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{getCategoryLabel(product.category_id)}</span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(product.cost_price)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(product.selling_price)}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-green-600 font-medium">{calculateMargin(product.cost_price, product.selling_price)}%</span>
                  </TableCell>
                  <TableCell className="text-right font-medium">{product.quantity}</TableCell>
                  <TableCell>
                    <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingProduct(product)}>
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
