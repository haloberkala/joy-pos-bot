import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getProductsByStore, 
  deleteProduct,
  Product
} from "@/services/productsService";
import { getAllCategories } from "@/services/categoriesService";
import { getAllBrands } from "@/services/brandsService";
import { getAllUnits, Unit } from "@/services/unitsService";
import { getStockOpnamesByStore } from "@/services/stockOpnameService";
import { formatCurrency } from "@/lib/format";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Barcode,
  Download,
  Package,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Eye,
  LayoutGrid,
} from "lucide-react";
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
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { StockOpnameDetail } from "@/components/backoffice/StockOpnameDetail";
import { BarcodeGenerator } from "@/components/backoffice/BarcodeGenerator";
import { AddProductModal } from "@/components/backoffice/AddProductModal";
import { BulkProductModal } from "@/components/backoffice/BulkProductModal";
import JsBarcode from "jsbarcode";

export default function Products() {
  const { activeStoreId } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [activeStockFilter, setActiveStockFilter] = useState<"all" | "low" | "out">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showOpnameDetail, setShowOpnameDetail] = useState(false);
  const [activeTab, setActiveTab] = useState("products");
  const [qrProduct, setQrProduct] = useState<Product | null>(null);
  const [showBulkQr, setShowBulkQr] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Supabase integration
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [stockOpnames, setStockOpnames] = useState<any[]>([]);
  const [storeCategories, setStoreCategories] = useState<any[]>([]);
  const [storeBrands, setStoreBrands] = useState<any[]>([]);
  const [storeUnits, setStoreUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load products from Supabase
  useEffect(() => {
    loadProducts();
    loadStockOpnames();
    loadCategories();
    loadBrands();
    loadUnits();
  }, [activeStoreId, refreshKey]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const products = await getProductsByStore(activeStoreId);
      setStoreProducts(products);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Gagal memuat produk');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStockOpnames = async () => {
    try {
      const opnames = await getStockOpnamesByStore(activeStoreId, 10);
      setStockOpnames(opnames);
    } catch (error) {
      console.error('Error loading stock opnames:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const categories = await getAllCategories(activeStoreId);
      setStoreCategories(categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadBrands = async () => {
    try {
      const brands = await getAllBrands(activeStoreId);
      setStoreBrands(brands);
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const loadUnits = async () => {
    try {
      const units = await getAllUnits(activeStoreId);
      setStoreUnits(units);
    } catch (error) {
      console.error('Error loading units:', error);
    }
  };

  // Barcode download helper
  const downloadBarcode = (product: Product) => {
    const canvas = document.createElement("canvas");
    try {
      JsBarcode(canvas, product.code, {
        format: "CODE128",
        width: 2,
        height: 80,
        displayValue: true,
        fontSize: 14,
        margin: 10,
      });
    } catch {
      return;
    }
    // Add product name & price
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height + 50;
    const ctx = finalCanvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    ctx.drawImage(canvas, 0, 0);
    ctx.fillStyle = "#000";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      product.name.substring(0, 35),
      finalCanvas.width / 2,
      canvas.height + 20,
    );
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "#2563eb";
    ctx.fillText(
      formatCurrency(product.selling_price_retail),
      finalCanvas.width / 2,
      canvas.height + 40,
    );
    const link = document.createElement("a");
    link.download = `barcode-${product.code}.png`;
    link.href = finalCanvas.toDataURL("image/png");
    link.click();
  };

  const downloadAllBarcodes = () => {
    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF("p", "mm", "a4");
      let x = 10,
        y = 10;
      const colWidth = 45;
      const rowHeight = 45;
      const colsPerPage = 4;

      filteredProducts.forEach((product, i) => {
        if (y + rowHeight > 280) {
          doc.addPage();
          y = 10;
          x = 10;
        }
        const canvas = document.createElement("canvas");
        try {
          JsBarcode(canvas, product.code, {
            format: "CODE128",
            width: 1,
            height: 25,
            displayValue: true,
            fontSize: 7,
            margin: 2,
          });
          const imgData = canvas.toDataURL("image/png");
          doc.addImage(imgData, "PNG", x + 2, y + 2, colWidth - 4, 16);
        } catch {
          /* skip invalid */
        }
        doc.setFontSize(7);
        doc.text(product.name.substring(0, 20), x + colWidth / 2, y + 20, {
          align: "center",
          maxWidth: colWidth - 2,
        });
        doc.setFontSize(6);
        doc.text(`SKU: ${product.code}`, x + colWidth / 2, y + 25, {
          align: "center",
        });
        doc.setFontSize(7);
        doc.setTextColor(37, 99, 235);
        doc.text(
          formatCurrency(product.selling_price_retail),
          x + colWidth / 2,
          y + 30,
          { align: "center" },
        );
        doc.setTextColor(0, 0, 0);
        x += colWidth;
        if (x + colWidth > 200) {
          x = 10;
          y += rowHeight;
        }
      });

      doc.save("barcode-produk.pdf");
      toast.success("PDF Barcode berhasil di-download");
    });
  };

  useBarcodeScanner({
    onScan: (barcode) => {
      const product = storeProducts.find((p) => p.code === barcode);
      if (product) {
        setSearchQuery(barcode);
        toast.success(`Produk ditemukan: ${product.name}`);
      } else {
        toast.error(`Produk dengan barcode ${barcode} tidak ditemukan`);
      }
    },
    enabled: !showOpnameDetail && !isAddModalOpen && !showBulkModal,
  });

  // Open edit modal when editing product is set
  useEffect(() => {
    if (editingProduct) {
      setIsAddModalOpen(true);
    }
  }, [editingProduct]);

  const handleDeleteProduct = async (product: Product) => {
    if (
      confirm(`Apakah Anda yakin ingin menghapus produk "${product.name}"?`)
    ) {
      try {
        await deleteProduct(product.id);
        setRefreshKey((k) => k + 1);
        toast.success("Produk berhasil dihapus");
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Gagal menghapus produk');
      }
    }
  };

  const filteredProducts = storeProducts.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.code.includes(searchQuery);
    const matchesCategory =
      selectedCategory === "all" ||
      product.category_id === Number(selectedCategory);
    const matchesBrand =
      selectedBrand === "all" ||
      product.brand_id === Number(selectedBrand);
    const matchesUnit =
      selectedUnit === "all" ||
      product.unit_id === Number(selectedUnit);
    
    // Apply stock filter
    let matchesStockFilter = true;
    if (activeStockFilter === "low") {
      matchesStockFilter = product.quantity < product.min_stock_alert && product.quantity > 0;
    } else if (activeStockFilter === "out") {
      matchesStockFilter = product.quantity === 0;
    }
    
    return matchesSearch && matchesCategory && matchesBrand && matchesUnit && matchesStockFilter;
  });

  const getCategoryLabel = (categoryId: number | null) => {
    if (!categoryId) return "-";
    const c = storeCategories.find((c) => c.id === categoryId);
    return c ? c.name : "-";
  };

  const getBrandName = (brandId: number | null) => {
    if (!brandId) return "-";
    return storeBrands.find((b) => b.id === brandId)?.name || "-";
  };

  const getUnitName = (unitId: number | null) => {
    if (!unitId) return "";
    return storeUnits.find((u) => u.id === unitId)?.name || "";
  };

  const getStockStatus = (qty: number, min: number) => {
    if (qty <= 0) return { label: "Habis", variant: "destructive" as const };
    if (qty < min) return { label: "Menipis", variant: "secondary" as const };
    return { label: "Tersedia", variant: "default" as const };
  };

  // Stock summary stats
  const lowStockCount = storeProducts.filter(
    (p) => p.quantity < p.min_stock_alert && p.quantity > 0,
  ).length;
  const outOfStockCount = storeProducts.filter((p) => p.quantity === 0).length;
  const totalStockValue = storeProducts.reduce(
    (sum, p) => sum + p.quantity * p.cost_price,
    0,
  );

  // ======== (Excel import removed — replaced by BulkProductModal) ========

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
          <p className="text-muted-foreground">
            Kelola produk, stok, harga, dan stock opname
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowBulkQr(true)}
          >
            <Barcode className="w-4 h-4" /> Barcode
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowBulkModal(true)}
          >
            <LayoutGrid className="w-4 h-4" /> Tambah Massal
          </Button>
          <Button className="gap-2" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Tambah Produk
          </Button>

          <AddProductModal
            isOpen={isAddModalOpen}
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingProduct(null);
            }}
            storeId={activeStoreId}
            editingProduct={editingProduct}
            onProductAdded={() => {
              setRefreshKey((k) => k + 1);
              setEditingProduct(null);
            }}
          />
          <BulkProductModal
            isOpen={showBulkModal}
            onClose={() => setShowBulkModal(false)}
            storeId={activeStoreId}
            onProductsAdded={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      </div>

      {/* Stock Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 cursor-default">
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
        <div className="bg-card rounded-xl border border-border p-4 cursor-default">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nilai Stok</p>
              <p className="text-xl font-bold">
                {formatCurrency(totalStockValue)}
              </p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setActiveStockFilter(activeStockFilter === "low" ? "all" : "low")}
          className={`bg-card rounded-xl border-2 p-4 cursor-pointer transition-all ${
            activeStockFilter === "low" 
              ? "border-orange-500 bg-orange-50" 
              : "border-border hover:border-orange-300"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              activeStockFilter === "low" ? "bg-orange-200" : "bg-orange-100"
            }`}>
              <TrendingDown className={`w-5 h-5 ${
                activeStockFilter === "low" ? "text-orange-700" : "text-orange-600"
              }`} />
            </div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Stok Menipis</p>
              <p className="text-xl font-bold">{lowStockCount}</p>
            </div>
          </div>
        </button>
        <button 
          onClick={() => setActiveStockFilter(activeStockFilter === "out" ? "all" : "out")}
          className={`bg-card rounded-xl border-2 p-4 cursor-pointer transition-all ${
            activeStockFilter === "out" 
              ? "border-red-500 bg-red-50" 
              : "border-border hover:border-red-300"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              activeStockFilter === "out" ? "bg-red-200" : "bg-red-100"
            }`}>
              <AlertTriangle className={`w-5 h-5 ${
                activeStockFilter === "out" ? "text-red-700" : "text-red-600"
              }`} />
            </div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Stok Habis</p>
              <p className="text-xl font-bold">{outOfStockCount}</p>
            </div>
          </div>
        </button>
      </div>

      {/* Tabs: Produk, Opname */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="w-4 h-4" />
            Daftar Produk & Stok
          </TabsTrigger>
          <TabsTrigger value="opname" className="gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Stock Opname
          </TabsTrigger>
        </TabsList>

        {/* ========== PRODUCTS & STOCK (MERGED) ========== */}
        <TabsContent value="products" className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-barcode-input="true"
              />
            </div>
            
            {/* Filter Kategori */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {storeCategories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter Brand */}
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Semua Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Brand</SelectItem>
                {storeBrands.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter Satuan */}
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Semua Satuan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Satuan</SelectItem>
                {storeUnits.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Products Table - Merged */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Memuat produk...</p>
              </div>
            ) : (
              <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Produk</TableHead>
                  <TableHead className="font-semibold">Kode</TableHead>
                  <TableHead className="font-semibold">Kategori</TableHead>
                  <TableHead className="font-semibold">Brand</TableHead>
                  <TableHead className="text-right font-semibold">Modal</TableHead>
                  <TableHead className="text-right font-semibold">Eceran</TableHead>
                  <TableHead className="text-right font-semibold">Grosir</TableHead>
                  <TableHead className="text-right font-semibold">Spesial</TableHead>
                  <TableHead className="text-center font-semibold">Stok</TableHead>
                  <TableHead className="text-center font-semibold">Stok Minimum</TableHead>
                  <TableHead className="text-center font-semibold">Status</TableHead>
                  <TableHead className="text-center font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(
                    product.quantity,
                    product.min_stock_alert,
                  );
                  return (
                    <TableRow key={product.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium py-4">
                        {product.name}
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="font-mono text-sm text-muted-foreground">
                          {product.code}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground py-4">
                        {getCategoryLabel(product.category_id)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground py-4">
                        {getBrandName(product.brand_id)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground py-4">
                        {formatCurrency(product.cost_price)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm py-4">
                        {formatCurrency(product.selling_price_retail)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm text-blue-600 py-4">
                        {formatCurrency(product.selling_price_wholesale)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm text-purple-600 py-4">
                        {formatCurrency(product.selling_price_special)}
                      </TableCell>
                      <TableCell className="text-center font-medium text-sm py-4">
                        {product.quantity} {getUnitName(product.unit_id)}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground py-4">
                        {product.min_stock_alert}
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <Badge variant={stockStatus.variant} className="font-normal">
                          {stockStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setQrProduct(product)}
                            title="Lihat Barcode"
                          >
                            <Barcode className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingProduct(product)}
                            title="Edit Produk"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteProduct(product)}
                            title="Hapus Produk"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              </Table>
            )}
            {!isLoading && filteredProducts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Tidak ada produk ditemukan</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ========== OPNAME TAB ========== */}
        <TabsContent value="opname" className="space-y-4">
          <div className="flex justify-between">
            <p className="text-muted-foreground">
              Stock opname untuk memastikan keakuratan data stok
            </p>
            <Button className="gap-2" onClick={() => setShowOpnameDetail(true)}>
              <Plus className="w-4 h-4" />
              Mulai Stock Opname
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
                {stockOpnames.map((opname) => (
                  <TableRow key={opname.id}>
                    <TableCell className="font-medium">
                      {opname.opname_number}
                    </TableCell>
                    <TableCell>{formatDate(new Date(opname.opname_date))}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {opname.note || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {stockOpnames.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Belum ada stock opname
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Barcode Dialog */}
      <Dialog open={!!qrProduct} onOpenChange={() => setQrProduct(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="w-5 h-5" /> Barcode Produk
            </DialogTitle>
          </DialogHeader>
          {qrProduct && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-xl border border-border">
                <BarcodeGenerator
                  value={qrProduct.code}
                  height={80}
                  width={2}
                  fontSize={14}
                />
                <p className="text-center text-sm font-bold mt-2">
                  {qrProduct.name}
                </p>
                <p className="text-center text-sm font-semibold text-primary mt-1">
                  {formatCurrency(qrProduct.selling_price_retail)}
                </p>
              </div>
              <Button
                className="gap-2 w-full"
                onClick={() => downloadBarcode(qrProduct)}
              >
                <Download className="w-4 h-4" /> Download Barcode
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Download All Barcodes */}
      <Dialog open={showBulkQr} onOpenChange={setShowBulkQr}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Barcode Semua Produk ({filteredProducts.length})
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-end mb-4">
            <Button className="gap-2" onClick={downloadAllBarcodes}>
              <Download className="w-4 h-4" /> Download Semua Barcode (PDF)
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="flex flex-col items-center bg-white p-3 rounded-lg border border-border"
              >
                <BarcodeGenerator
                  value={product.code}
                  height={40}
                  width={1}
                  fontSize={8}
                />
                <p className="text-xs font-bold mt-2 text-center line-clamp-2">
                  {product.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  SKU: {product.code}
                </p>
                <p className="text-xs font-semibold text-primary">
                  {formatCurrency(product.selling_price_retail)}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
