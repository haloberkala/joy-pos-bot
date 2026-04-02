import { useState, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  products, categories, brands, units,
  getProductsForStore, getCategoriesForStore, getBrandsForStore, getUnitsForStore,
  addProduct, getOrCreateCategory, getOrCreateBrand, getOrCreateUnit,
  sampleStockOpnames,
} from '@/data/sampleData';
import { formatCurrency } from '@/lib/format';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, Barcode, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Package, ClipboardCheck, TrendingUp, TrendingDown, AlertTriangle, Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Product } from '@/types/pos';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { StockOpnameDetail } from '@/components/backoffice/StockOpnameDetail';
import { BarcodeGenerator } from '@/components/backoffice/BarcodeGenerator';
import JsBarcode from 'jsbarcode';

export default function Products() {
  const { activeStoreId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] } | null>(null);
  const [showOpnameDetail, setShowOpnameDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [qrProduct, setQrProduct] = useState<Product | null>(null);
  const [showBulkQr, setShowBulkQr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Barcode download helper
  const downloadBarcode = (product: Product) => {
    const canvas = document.createElement('canvas');
    try {
      JsBarcode(canvas, product.code, { format: 'CODE128', width: 2, height: 80, displayValue: true, fontSize: 14, margin: 10 });
    } catch { return; }
    // Add product name & price
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height + 50;
    const ctx = finalCanvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    ctx.drawImage(canvas, 0, 0);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(product.name.substring(0, 35), finalCanvas.width / 2, canvas.height + 20);
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#2563eb';
    ctx.fillText(formatCurrency(product.selling_price_retail), finalCanvas.width / 2, canvas.height + 40);
    const link = document.createElement('a');
    link.download = `barcode-${product.code}.png`;
    link.href = finalCanvas.toDataURL('image/png');
    link.click();
  };

  const downloadAllBarcodes = () => {
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF('p', 'mm', 'a4');
      let x = 10, y = 10;
      const colWidth = 50;
      const rowHeight = 35;

      filteredProducts.forEach((product, i) => {
        if (y + rowHeight > 280) { doc.addPage(); y = 10; }
        const canvas = document.createElement('canvas');
        try {
          JsBarcode(canvas, product.code, { format: 'CODE128', width: 1, height: 30, displayValue: true, fontSize: 8, margin: 2 });
          const imgData = canvas.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', x, y, colWidth - 5, 18);
        } catch { /* skip invalid */ }
        doc.setFontSize(6);
        doc.text(product.name.substring(0, 25), x + (colWidth - 5) / 2, y + 22, { align: 'center' });
        doc.text(formatCurrency(product.selling_price_retail), x + (colWidth - 5) / 2, y + 26, { align: 'center' });
        x += colWidth;
        if (x + colWidth > 200) { x = 10; y += rowHeight; }
      });

      doc.save('barcode-produk.pdf');
      toast.success('PDF Barcode berhasil di-download');
    });
  };

  const storeProducts = useMemo(() => getProductsForStore(activeStoreId), [activeStoreId]);
  const storeCategories = useMemo(() => getCategoriesForStore(activeStoreId), [activeStoreId]);
  const storeBrands = useMemo(() => getBrandsForStore(activeStoreId), [activeStoreId]);

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
    enabled: !showOpnameDetail && !isAddModalOpen && !showImportDialog,
  });

  const filteredProducts = storeProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || product.code.includes(searchQuery);
    const matchesCategory = selectedCategory === 'all' || product.category_id === Number(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (categoryId: number | null) => {
    if (!categoryId) return '-';
    const c = categories.find(c => c.id === categoryId);
    return c ? `${c.icon || ''} ${c.name}` : '-';
  };

  const getBrandName = (brandId: number | null) => {
    if (!brandId) return '-';
    return brands.find(b => b.id === brandId)?.name || '-';
  };

  const getStockStatus = (qty: number, min: number) => {
    if (qty <= 0) return { label: 'Habis', variant: 'destructive' as const };
    if (qty < min) return { label: 'Menipis', variant: 'secondary' as const };
    return { label: 'Tersedia', variant: 'default' as const };
  };

  // Stock summary stats
  const lowStockCount = storeProducts.filter(p => p.quantity < p.min_stock_alert && p.quantity > 0).length;
  const outOfStockCount = storeProducts.filter(p => p.quantity === 0).length;
  const totalStockValue = storeProducts.reduce((sum, p) => sum + (p.quantity * p.cost_price), 0);

  // ======== EXCEL TEMPLATE DOWNLOAD ========
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Nama Produk*': '', 'Kode/Barcode*': '', 'Kategori': '', 'Brand': '',
        'Satuan': '', 'Singkatan Satuan': '',
        'Harga Modal*': '', 'Harga Jual Eceran*': '', 'Harga Jual Grosir': '', 'Min Qty Grosir': '',
        'Harga Jual Spesial': '', 'Min Qty Spesial': '',
        'Stok Awal': '', 'Min Stok Alert': '', 'Tanggal Kadaluarsa': '',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 15 },
      { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 15 },
      { wch: 18 }, { wch: 15 },
      { wch: 12 }, { wch: 14 }, { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produk');
    XLSX.writeFile(wb, `template-produk-${activeStoreId}.xlsx`);
    toast.success('Template Excel berhasil di-download');
  };

  // ======== EXCEL IMPORT ========
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

        let success = 0;
        const errors: string[] = [];
        const existingCodes = new Set(products.map(p => p.code));

        rows.forEach((row, idx) => {
          const rowNum = idx + 2;
          const name = String(row['Nama Produk*'] || '').trim();
          const code = String(row['Kode/Barcode*'] || '').trim();
          const costPrice = parseFloat(row['Harga Modal*']) || 0;
          const retailPrice = parseFloat(row['Harga Jual Eceran*']) || 0;
          const wholesalePrice = parseFloat(row['Harga Jual Grosir']) || retailPrice;
          const wholesaleMinQty = parseInt(row['Min Qty Grosir']) || 10;

          if (!name) { errors.push(`Baris ${rowNum}: Nama produk kosong`); return; }
          if (!code) { errors.push(`Baris ${rowNum}: Kode/Barcode kosong`); return; }
          if (costPrice <= 0) { errors.push(`Baris ${rowNum}: Harga modal tidak valid`); return; }
          if (retailPrice <= 0) { errors.push(`Baris ${rowNum}: Harga jual eceran tidak valid`); return; }
          if (existingCodes.has(code)) { errors.push(`Baris ${rowNum}: Kode "${code}" sudah ada (duplikat)`); return; }

          const categoryName = String(row['Kategori'] || '').trim();
          const brandName = String(row['Brand'] || '').trim();
          const unitName = String(row['Satuan'] || '').trim();
          const unitShort = String(row['Singkatan Satuan'] || '').trim();

          const categoryId = categoryName ? getOrCreateCategory(categoryName, activeStoreId) : null;
          const brandId = brandName ? getOrCreateBrand(brandName, activeStoreId) : null;
          const unitId = unitName ? getOrCreateUnit(unitName, unitShort || unitName.substring(0, 3), activeStoreId) : null;

          const newProduct: Product = {
            id: Date.now() + idx,
            store_id: activeStoreId,
            category_id: categoryId,
            brand_id: brandId,
            unit_id: unitId,
            name,
            code,
            expiry_date: row['Tanggal Kadaluarsa'] ? String(row['Tanggal Kadaluarsa']) : null,
            quantity: parseInt(row['Stok Awal']) || 0,
            min_stock_alert: parseInt(row['Min Stok Alert']) || 10,
            cost_price: costPrice,
            selling_price: retailPrice,
            selling_price_retail: retailPrice,
            selling_price_wholesale: wholesalePrice,
            selling_price_special: parseFloat(row['Harga Jual Spesial']) || Math.round(wholesalePrice * 0.9),
            wholesale_min_qty: wholesaleMinQty,
            special_min_qty: parseInt(row['Min Qty Spesial']) || wholesaleMinQty * 2,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: null,
            updated_by: null,
          };

          addProduct(newProduct);
          existingCodes.add(code);
          success++;
        });

        setImportResults({ success, errors });
        if (success > 0) toast.success(`${success} produk berhasil diimport`);
        if (errors.length > 0) toast.error(`${errors.length} baris gagal`);
      } catch (err) {
        toast.error('File tidak valid. Pastikan format Excel sesuai template.');
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (showOpnameDetail) {
    return (
      <StockOpnameDetail
        storeId={activeStoreId}
        onBack={() => setShowOpnameDetail(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produk & Stok</h1>
          <p className="text-muted-foreground">Kelola produk, stok, harga, dan stock opname</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowBulkQr(true)}>
            <Barcode className="w-4 h-4" /> Barcode
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setShowImportDialog(true)}>
            <Upload className="w-4 h-4" /> Import Excel
          </Button>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />Tambah Produk</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Tambah Produk Baru</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2"><Label>Nama Produk</Label><Input placeholder="Nama produk" /></div>
                <div className="space-y-2"><Label>Barcode/SKU</Label><div className="relative"><Input placeholder="Scan barcode" /><Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /></div></div>
                <div className="space-y-2"><Label>Kategori</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>{storeCategories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.icon} {c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Brand</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Pilih brand" /></SelectTrigger>
                    <SelectContent>{storeBrands.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Harga Modal</Label><Input type="number" placeholder="0" /></div>
                <div className="space-y-2"><Label>Harga Jual Eceran</Label><Input type="number" placeholder="0" /></div>
                <div className="space-y-2"><Label>Harga Jual Grosir</Label><Input type="number" placeholder="0" /></div>
                <div className="space-y-2"><Label>Min Qty Grosir</Label><Input type="number" placeholder="10" /></div>
                <div className="space-y-2"><Label>Harga Jual Spesial</Label><Input type="number" placeholder="0" /></div>
                <div className="space-y-2"><Label>Min Qty Spesial</Label><Input type="number" placeholder="20" /></div>
                <div className="space-y-2"><Label>Stok Minimum Alert</Label><Input type="number" placeholder="10" /></div>
                <div className="col-span-2 flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Batal</Button>
                  <Button onClick={() => setIsAddModalOpen(false)}>Simpan Produk</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stock Summary Cards */}
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

      {/* Tabs: Produk, Stok, Opname */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="products" className="gap-2"><Package className="w-4 h-4" />Daftar Produk</TabsTrigger>
          <TabsTrigger value="stock" className="gap-2"><TrendingUp className="w-4 h-4" />Stok</TabsTrigger>
          <TabsTrigger value="opname" className="gap-2"><ClipboardCheck className="w-4 h-4" />Stock Opname</TabsTrigger>
        </TabsList>

        {/* ========== PRODUCTS TAB ========== */}
        <TabsContent value="products" className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari nama atau barcode..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-barcode-input="true" />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              <Button variant={selectedCategory === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory('all')}>Semua</Button>
              {storeCategories.map(c => (
                <Button key={c.id} variant={selectedCategory === String(c.id) ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(String(c.id))} className="whitespace-nowrap">
                  {c.icon} {c.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Modal</TableHead>
                  <TableHead className="text-right">Eceran</TableHead>
                  <TableHead className="text-right">Grosir</TableHead>
                  <TableHead className="text-right">Spesial</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Barcode</TableHead>
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
                      <TableCell><span className="font-mono text-sm text-muted-foreground">{product.code}</span></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{getCategoryLabel(product.category_id)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(product.cost_price)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(product.selling_price_retail)}</TableCell>
                      <TableCell className="text-right font-medium text-blue-600">{formatCurrency(product.selling_price_wholesale)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{formatCurrency(product.selling_price_special)}</TableCell>
                      <TableCell className="text-right font-medium">{product.quantity}</TableCell>
                      <TableCell><Badge variant={stockStatus.variant}>{stockStatus.label}</Badge></TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQrProduct(product)}>
                          <Barcode className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingProduct(product)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredProducts.length === 0 && <div className="text-center py-12 text-muted-foreground"><p>Tidak ada produk ditemukan</p></div>}
          </div>
        </TabsContent>

        {/* ========== STOCK TAB ========== */}
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
                {filteredProducts.map((product) => {
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

        {/* ========== OPNAME TAB ========== */}
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
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleStockOpnames.filter(o => o.store_id === activeStoreId).map((opname) => (
                  <TableRow key={opname.id}>
                    <TableCell className="font-medium">{opname.opname_number}</TableCell>
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

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" /> Import Produk dari Excel</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-sm">Langkah-langkah:</h4>
              <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Download template Excel di bawah</li>
                <li>Isi data produk sesuai kolom</li>
                <li>Upload file yang sudah diisi</li>
                <li>Kategori, brand, dan satuan otomatis dibuat jika belum ada</li>
              </ol>
            </div>

            <Button variant="outline" className="w-full gap-2" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4" /> Download Template Excel
            </Button>

            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Klik untuk upload file Excel</p>
              <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Upload className="w-4 h-4" /> Pilih File
              </Button>
            </div>

            {importResults && (
              <div className="space-y-2">
                {importResults.success > 0 && (
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{importResults.success} produk berhasil diimport</span>
                  </div>
                )}
                {importResults.errors.length > 0 && (
                  <div className="bg-red-50 rounded-lg px-3 py-2 space-y-1">
                    <div className="flex items-center gap-2 text-red-700"><AlertCircle className="w-4 h-4" /><span className="text-sm font-medium">{importResults.errors.length} baris gagal</span></div>
                    <div className="max-h-32 overflow-y-auto space-y-0.5">
                      {importResults.errors.map((err, i) => <p key={i} className="text-xs text-red-600">{err}</p>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Barcode Dialog */}
      <Dialog open={!!qrProduct} onOpenChange={() => setQrProduct(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Barcode className="w-5 h-5" /> Barcode Produk</DialogTitle></DialogHeader>
          {qrProduct && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-xl border border-border">
                <BarcodeGenerator value={qrProduct.code} height={80} width={2} fontSize={14} />
                <p className="text-center text-sm font-bold mt-2">{qrProduct.name}</p>
                <p className="text-center text-sm font-semibold text-primary mt-1">{formatCurrency(qrProduct.selling_price_retail)}</p>
              </div>
              <Button className="gap-2 w-full" onClick={() => downloadBarcode(qrProduct)}>
                <Download className="w-4 h-4" /> Download Barcode
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Download All Barcodes */}
      <Dialog open={showBulkQr} onOpenChange={setShowBulkQr}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Barcode Semua Produk ({filteredProducts.length})</DialogTitle></DialogHeader>
          <div className="flex justify-end mb-4">
            <Button className="gap-2" onClick={downloadAllBarcodes}>
              <Download className="w-4 h-4" /> Download Semua Barcode (PDF)
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <div key={product.id} className="flex flex-col items-center bg-white p-3 rounded-lg border border-border">
                <BarcodeGenerator value={product.code} height={40} width={1} fontSize={8} />
                <p className="text-xs font-bold mt-2 text-center line-clamp-2">{product.name}</p>
                <p className="text-xs font-semibold text-primary">{formatCurrency(product.selling_price_retail)}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
