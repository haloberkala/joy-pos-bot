import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getProductsByStore, Product } from "@/services/productsService";
import {
  getPurchasesByStore,
  createPurchase,
  getPurchaseWithItems,
  Purchase as DBPurchase,
  PurchaseItem as DBPurchaseItem,
} from "@/services/purchasesService";
import {
  getSuppliersByStore,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  Supplier,
} from "@/services/suppliersService";
import { deletePurchase } from "@/services/purchasesService";
import {
  getSupplierDebtSummary,
  getSupplierPaymentsByPurchase,
  createSupplierPayment,
  SupplierDebtSummary,
  SupplierPayment,
} from "@/services/supplierPaymentsService";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Eye,
  Truck,
  Package,
  ShoppingCart,
  ImagePlus,
  Trash2,
  Upload,
  Phone,
  Edit2,
  Wallet,
  DollarSign,
  AlertTriangle,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { AddProductModal } from "@/components/backoffice/AddProductModal";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

// Local types for compatibility
interface Purchase {
  id: number;
  store_id: number;
  supplier_id: number | null;
  reference_no: string;
  date: Date;
  total_amount: number;
  image_proof: string | null;
  note: string | null;
}

interface PurchaseDetail {
  id: number;
  purchase_id: number;
  product_id: number | null;
  product?: Product;
  quantity: number;
  cost_price: number;
  sub_total: number;
}

export default function Purchases() {
  // Features: Delete purchase (Owner), Clickable badge, Image viewer
  const { activeStoreId, user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterSupplier, setFilterSupplier] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isQuickAddSupplierOpen, setIsQuickAddSupplierOpen] = useState(false);
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewImageProof, setViewImageProof] = useState<string | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(
    null,
  );
  const [isDeleteSupplierOpen, setIsDeleteSupplierOpen] = useState(false);
  
  // Delete confirmation states
  const [deleteSupplierTarget, setDeleteSupplierTarget] = useState<Supplier | null>(null);
  const [deletePurchaseTarget, setDeletePurchaseTarget] = useState<Purchase | null>(null);

  // Supabase data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Supplier debt state
  const [supplierDebts, setSupplierDebts] = useState<SupplierDebtSummary[]>([]);
  const [selectedDebt, setSelectedDebt] = useState<SupplierDebtSummary | null>(
    null,
  );
  const [debtPayments, setDebtPayments] = useState<SupplierPayment[]>([]);
  const [isPayDebtOpen, setIsPayDebtOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");

  // Load data from Supabase
  useEffect(() => {
    loadData();
  }, [activeStoreId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [suppliersData, purchasesData, productsData, debtsData] =
        await Promise.all([
          getSuppliersByStore(activeStoreId),
          getPurchasesByStore(activeStoreId),
          getProductsByStore(activeStoreId),
          getSupplierDebtSummary(activeStoreId),
        ]);

      setSuppliers(suppliersData);
      setProducts(productsData);
      setSupplierDebts(debtsData);

      // Convert DBPurchase to Purchase
      const convertedPurchases: Purchase[] = purchasesData.map((p) => ({
        id: p.id,
        store_id: p.store_id,
        supplier_id: p.supplier_id,
        reference_no: p.reference_no,
        date: new Date(p.purchase_date),
        total_amount: p.total_amount,
        image_proof: p.image_proof,
        note: p.note,
      }));

      setPurchases(convertedPurchases);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  };

  // Purchase form
  const [formSupplier, setFormSupplier] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formDate, setFormDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [formImageProof, setFormImageProof] = useState<string>("");
  const [formPaymentStatus, setFormPaymentStatus] = useState<
    "paid" | "partial" | "unpaid"
  >("paid");
  const [formItems, setFormItems] = useState<
    { product_id: string; quantity: string; cost_price: string }[]
  >([{ product_id: "", quantity: "", cost_price: "" }]);

  // Supplier form
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");

  // Quick Add Product state
  const [isQuickAddProductOpen, setIsQuickAddProductOpen] = useState(false);
  const [quickAddItemIndex, setQuickAddItemIndex] = useState<number | null>(
    null,
  );

  // Helper function - must be before filteredPurchases
  const getSupplierName = (supplierId: number | null) => {
    if (!supplierId) return "Tanpa Supplier";
    return suppliers.find((s) => s.id === supplierId)?.name || "-";
  };

  const filteredPurchases = purchases.filter((p) => {
    // Text search
    const matchesSearch = 
      p.reference_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getSupplierName(p.supplier_id).toLowerCase().includes(searchQuery.toLowerCase());
    
    // Supplier filter
    const matchesSupplier = 
      filterSupplier === "all" || 
      String(p.supplier_id) === filterSupplier;
    
    // Date range filter
    const purchaseDate = new Date(p.date);
    const matchesDateFrom = !filterDateFrom || purchaseDate >= new Date(filterDateFrom);
    const matchesDateTo = !filterDateTo || purchaseDate <= new Date(filterDateTo);
    
    return matchesSearch && matchesSupplier && matchesDateFrom && matchesDateTo;
  });

  const totalPurchaseValue = purchases.reduce(
    (sum, p) => sum + p.total_amount,
    0,
  );

  const addFormItem = () => {
    setFormItems((prev) => [
      ...prev,
      { product_id: "", quantity: "", cost_price: "" },
    ]);
  };

  const removeFormItem = (index: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFormItem = (index: number, field: string, value: string) => {
    // If updating product_id, check for duplicates and auto-fill cost_price
    if (field === "product_id" && value) {
      const existingIndex = formItems.findIndex(
        (item, i) => i !== index && item.product_id === value
      );
      
      if (existingIndex !== -1) {
        // Product already exists, merge quantities
        toast.info("Produk sudah ada, menggabungkan kuantitas");
        setFormItems((prev) => {
          const newItems = [...prev];
          const existingQty = parseFloat(newItems[existingIndex].quantity || "0");
          const currentQty = parseFloat(newItems[index].quantity || "1");
          newItems[existingIndex].quantity = String(existingQty + currentQty);
          // Remove current row
          return newItems.filter((_, i) => i !== index);
        });
        return;
      }
      
      // Auto-fill cost_price from product data
      const selectedProduct = products.find((p) => p.id === Number(value));
      if (selectedProduct && selectedProduct.cost_price > 0) {
        setFormItems((prev) =>
          prev.map((item, i) => 
            i === index 
              ? { 
                  ...item, 
                  product_id: value, 
                  cost_price: String(selectedProduct.cost_price) 
                } 
              : item
          ),
        );
        return;
      }
    }
    
    setFormItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  // Quick Add Product handlers
  const handleQuickAddProduct = (index: number) => {
    setQuickAddItemIndex(index);
    setIsQuickAddProductOpen(true);
  };

  const handleProductAdded = async () => {
    // Reload products to get the latest list
    const newProducts = await getProductsByStore(activeStoreId);
    setProducts(newProducts);

    // Get the newly added product (last one in the sorted list)
    if (newProducts.length > 0 && quickAddItemIndex !== null) {
      const latestProduct = newProducts[newProducts.length - 1];

      // Auto-select the new product in the item row and auto-fill cost_price
      setFormItems((prev) =>
        prev.map((item, i) =>
          i === quickAddItemIndex
            ? {
                ...item,
                product_id: String(latestProduct.id),
                cost_price: String(latestProduct.cost_price),
              }
            : item
        )
      );

      toast.success(
        `Produk "${latestProduct.name}" berhasil ditambahkan dan dipilih`,
      );
    }

    setIsQuickAddProductOpen(false);
    setQuickAddItemIndex(null);
  };

  const formTotal = formItems.reduce((sum, item) => {
    return (
      sum +
      parseFloat(item.quantity || "0") * parseFloat(item.cost_price || "0")
    );
  }, 0);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, this would upload to storage. For demo, use data URL
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormImageProof(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPurchase = async () => {
    // Validate supplier (required)
    if (!formSupplier) {
      toast.error("Pilih supplier terlebih dahulu");
      return;
    }

    const validItems = formItems.filter(
      (i) => i.product_id && i.quantity && i.cost_price,
    );
    if (validItems.length === 0) {
      toast.error("Tambahkan minimal 1 item");
      return;
    }
    if (!formImageProof) {
      toast.error("Upload bukti struk pembelian");
      return;
    }

    try {
      const now = new Date();
      const refNo = `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Date.now()).slice(-3)}`;

      const items = validItems.map((item) => {
        const product = products.find((p) => p.id === Number(item.product_id));
        return {
          product_id: Number(item.product_id),
          product_name: product?.name || "",
          product_code: product?.code || "",
          quantity: Number(item.quantity),
          cost_price: Number(item.cost_price),
          sub_total: Number(item.quantity) * Number(item.cost_price),
        };
      });

      await createPurchase({
        store_id: activeStoreId,
        supplier_id: Number(formSupplier), // Now required, no need for null check
        reference_no: refNo,
        purchase_date: new Date(formDate),
        total_amount: formTotal,
        payment_status: formPaymentStatus,
        image_proof: formImageProof,
        note: formNote || null,
        items,
      });

      toast.success(`Pembelian ${refNo} berhasil dicatat`);
      setIsAddPurchaseOpen(false);
      setFormItems([{ product_id: "", quantity: "", cost_price: "" }]);
      setFormNote("");
      setFormSupplier("");
      setFormImageProof("");
      setFormPaymentStatus("paid");
      loadData(); // Reload data
    } catch (error) {
      console.error("Error creating purchase:", error);
      toast.error("Gagal menyimpan pembelian");
    }
  };

  const handleAddSupplier = async () => {
    if (!supplierName.trim() || !supplierPhone.trim()) {
      toast.error("Nama dan telepon supplier wajib diisi");
      return;
    }

    try {
      const newSupplier = await createSupplier({
        store_id: activeStoreId,
        name: supplierName.trim(),
        phone: supplierPhone.trim(),
        address: supplierAddress.trim() || undefined,
      });

      setIsAddSupplierOpen(false);
      setSupplierName("");
      setSupplierPhone("");
      setSupplierAddress("");
      toast.success("Supplier berhasil ditambahkan");
      loadData(); // Reload data
    } catch (error) {
      console.error("Error creating supplier:", error);
      toast.error("Gagal menambahkan supplier");
    }
  };

  const handleQuickAddSupplier = async () => {
    if (!supplierName.trim() || !supplierPhone.trim()) {
      toast.error("Nama dan telepon supplier wajib diisi");
      return;
    }

    try {
      const newSupplier = await createSupplier({
        store_id: activeStoreId,
        name: supplierName.trim(),
        phone: supplierPhone.trim(),
        address: supplierAddress.trim() || undefined,
      });

      // Auto-select the newly created supplier
      setFormSupplier(String(newSupplier.id));

      setIsQuickAddSupplierOpen(false);
      setSupplierName("");
      setSupplierPhone("");
      setSupplierAddress("");
      toast.success(
        `Supplier "${newSupplier.name}" berhasil ditambahkan dan dipilih`,
      );
      loadData(); // Reload data
    } catch (error) {
      console.error("Error creating supplier:", error);
      toast.error("Gagal menambahkan supplier");
    }
  };

  const handleEditSupplier = async () => {
    if (!editingSupplier || !supplierName.trim() || !supplierPhone.trim()) {
      toast.error("Nama dan telepon wajib diisi");
      return;
    }

    try {
      await updateSupplier(editingSupplier.id, {
        name: supplierName.trim(),
        phone: supplierPhone.trim(),
        address: supplierAddress.trim() || undefined,
      });

      setEditingSupplier(null);
      setSupplierName("");
      setSupplierPhone("");
      setSupplierAddress("");
      toast.success("Supplier berhasil diperbarui");
      loadData(); // Reload data
    } catch (error) {
      console.error("Error updating supplier:", error);
      toast.error("Gagal memperbarui supplier");
    }
  };

  const handleDeleteSupplier = async () => {
    if (!deleteSupplierTarget) return;

    try {
      await deleteSupplier(deleteSupplierTarget.id);
      toast.success("Supplier berhasil dihapus");
      setDeleteSupplierTarget(null);
      loadData(); // Reload data
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast.error("Gagal menghapus supplier");
    }
  };

  const startEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierName(supplier.name);
    setSupplierPhone(supplier.phone);
    setSupplierAddress(supplier.address || "");
  };

  // Debt payment handlers
  const handlePayDebt = async () => {
    if (!selectedDebt || !paymentAmount) {
      toast.error("Isi jumlah pembayaran");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedDebt.remaining_amount) {
      toast.error("Jumlah pembayaran tidak valid");
      return;
    }

    // Validate required fields
    if (!activeStoreId || !selectedDebt.purchase_id) {
      toast.error("Data tidak lengkap");
      return;
    }

    try {
      await createSupplierPayment({
        store_id: activeStoreId,
        purchase_id: selectedDebt.purchase_id,
        supplier_id: selectedDebt.supplier_id || null,
        amount,
      });

      toast.success("Pembayaran berhasil dicatat");
      setIsPayDebtOpen(false);
      setPaymentAmount("");
      setSelectedDebt(null);
      loadData();
    } catch (error) {
      console.error("Error creating payment:", error);
      toast.error("Gagal mencatat pembayaran");
    }
  };

  const openPayDebt = async (debt: SupplierDebtSummary) => {
    setSelectedDebt(debt);
    setIsPayDebtOpen(true);

    try {
      const payments = await getSupplierPaymentsByPurchase(debt.purchase_id);
      setDebtPayments(payments);
    } catch (error) {
      console.error("Error loading payments:", error);
    }
  };

  // Load purchase details when viewing
  useEffect(() => {
    if (viewPurchase) {
      loadPurchaseDetails(viewPurchase.id);
    }
  }, [viewPurchase]);

  const loadPurchaseDetails = async (purchaseId: number) => {
    try {
      const { items } = await getPurchaseWithItems(purchaseId);
      const details: PurchaseDetail[] = items.map((item) => ({
        id: item.id,
        purchase_id: item.purchase_id,
        product_id: item.product_id,
        product: item.product_id
          ? products.find((p) => p.id === item.product_id)
          : undefined,
        quantity: item.quantity,
        cost_price: item.cost_price,
        sub_total: item.sub_total,
      }));
      setPurchaseDetails(details);
    } catch (error) {
      console.error("Error loading purchase details:", error);
    }
  };

  // Delete purchase handler (Owner only)
  const handleDeletePurchase = async () => {
    if (!deletePurchaseTarget) return;
    
    if (user?.role !== "owner") {
      toast.error("Hanya Owner yang dapat menghapus riwayat pembelian");
      return;
    }

    try {
      await deletePurchase(deletePurchaseTarget.id);
      toast.success("Riwayat pembelian berhasil dihapus");
      setDeletePurchaseTarget(null);
      setViewPurchase(null);
      loadData(); // Reload data
    } catch (error) {
      console.error("Error deleting purchase:", error);
      toast.error("Gagal menghapus riwayat pembelian");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Kulakan / Supply
          </h1>
          <p className="text-muted-foreground">
            Catat pembelian stok dari supplier & kelola utang supplier
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <p className="text-sm text-muted-foreground">Total Pembelian</p>
                <span className="text-xs text-gray-400 font-normal">{formatMonthYear()}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(totalPurchaseValue)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Supplier Aktif</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {suppliers.length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-100 text-green-600">
              <Truck className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total SKU</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {products.length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="purchases" className="space-y-4">
        <TabsList>
          <TabsTrigger value="purchases" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            Riwayat Kulakan
          </TabsTrigger>
          <TabsTrigger value="supplier-debt" className="gap-2">
            <Wallet className="w-4 h-4" />
            Utang Supplier
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-2">
            <Truck className="w-4 h-4" />
            Daftar Supplier
          </TabsTrigger>
        </TabsList>

        {/* ========== PURCHASES TAB ========== */}
        <TabsContent value="purchases" className="space-y-4">
          {/* Primary Action Button - Paling Atas */}
          <Dialog
            open={isAddPurchaseOpen}
            onOpenChange={setIsAddPurchaseOpen}
          >
            <DialogTrigger asChild>
              <Button size="lg" className="w-full gap-2 shadow-md text-base font-semibold">
                <Plus className="w-5 h-5" />
                Catat Pembelian Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Catat Pembelian Baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Supplier</Label>
                      <div className="flex gap-2">
                        <Select
                          value={formSupplier}
                          onValueChange={setFormSupplier}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Pilih supplier" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setIsQuickAddSupplierOpen(true)}
                          title="Tambah Supplier Baru"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Tanggal</Label>
                      <Input
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Status Pembayaran</Label>
                    <Select
                      value={formPaymentStatus}
                      onValueChange={(v: any) => setFormPaymentStatus(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Lunas</SelectItem>
                        <SelectItem value="partial">Sebagian</SelectItem>
                        <SelectItem value="unpaid">
                          Belum Bayar (Utang)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Image proof upload */}
                  <div className="space-y-2">
                    <Label>Bukti Struk Pembelian</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-4">
                      {formImageProof ? (
                        <div className="relative">
                          <img
                            src={formImageProof}
                            alt="Bukti struk"
                            className="max-h-40 rounded-lg mx-auto object-contain"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => setFormImageProof("")}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center gap-2 cursor-pointer py-4">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Upload className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Klik untuk upload foto struk
                          </p>
                          <p className="text-xs text-muted-foreground">
                            JPG, PNG max 5MB
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Item Pembelian</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={addFormItem}
                      >
                        <Plus className="w-3 h-3" /> Tambah Item
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {formItems.map((item, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-12 gap-2 items-end"
                        >
                          <div className="col-span-5">
                            {index === 0 && (
                              <Label className="text-xs">Produk</Label>
                            )}
                            <div className="flex gap-1">
                              <Select
                                value={item.product_id}
                                onValueChange={(v) =>
                                  updateFormItem(index, "product_id", v)
                                }
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Pilih produk" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => handleQuickAddProduct(index)}
                                title="Tambah produk baru"
                                className="shrink-0"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="col-span-2">
                            {index === 0 && (
                              <Label className="text-xs">Qty</Label>
                            )}
                            <Input
                              type="number"
                              placeholder="0"
                              value={item.quantity}
                              onChange={(e) =>
                                updateFormItem(
                                  index,
                                  "quantity",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="col-span-3">
                            {index === 0 && (
                              <Label className="text-xs">Harga Modal</Label>
                            )}
                            <Input
                              type="number"
                              placeholder="0"
                              value={item.cost_price}
                              onChange={(e) =>
                                updateFormItem(
                                  index,
                                  "cost_price",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="col-span-2 flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                              {formatCurrency(
                                parseFloat(item.quantity || "0") *
                                  parseFloat(item.cost_price || "0"),
                              )}
                            </span>
                            {formItems.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeFormItem(index)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end border-t pt-2">
                      <span className="font-semibold">
                        Total: {formatCurrency(formTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Catatan</Label>
                    <Textarea
                      placeholder="Catatan pembelian..."
                      value={formNote}
                      onChange={(e) => setFormNote(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddPurchaseOpen(false)}
                    >
                      Batal
                    </Button>
                    <Button onClick={handleAddPurchase}>
                      Simpan Pembelian
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

          {/* Filter Section - Di Bawah Tombol */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-1">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Filter Pencarian</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                {/* Search Input */}
                <div className="md:col-span-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari referensi atau supplier..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10"
                    />
                  </div>
                </div>
                
                {/* Supplier Filter */}
                <div className="md:col-span-3">
                  <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Semua Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Supplier</SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Date Range Filter with Labels */}
                <div className="md:col-span-5 grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-600">Dari Tanggal</Label>
                    <Input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  
                  <div className="flex items-center pb-2">
                    <span className="text-gray-400 text-lg">→</span>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-600">Sampai Tanggal</Label>
                    <Input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="px-6 py-4 font-semibold">Referensi</TableHead>
                  <TableHead className="px-6 py-4 font-semibold">Tanggal</TableHead>
                  <TableHead className="px-6 py-4 font-semibold">Supplier</TableHead>
                  <TableHead className="px-6 py-4 font-semibold">Bukti</TableHead>
                  <TableHead className="text-right px-6 py-4 font-semibold">Total</TableHead>
                  <TableHead className="text-right px-6 py-4 font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-medium font-mono px-6 py-4">
                      {purchase.reference_no}
                    </TableCell>
                    <TableCell className="text-muted-foreground px-6 py-4">
                      {formatDate(purchase.date)}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {getSupplierName(purchase.supplier_id)}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {purchase.image_proof ? (
                        <Badge
                          variant="default"
                          className="gap-1 cursor-pointer hover:bg-primary/80"
                          onClick={() =>
                            setViewImageProof(purchase.image_proof)
                          }
                        >
                          <ImagePlus className="w-3 h-3" /> Ada
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Tidak ada</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold px-6 py-4">
                      {formatCurrency(purchase.total_amount)}
                    </TableCell>
                    <TableCell className="text-right px-6 py-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewPurchase(purchase)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredPurchases.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Belum ada pembelian tercatat</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ========== SUPPLIER DEBT TAB ========== */}
        <TabsContent value="supplier-debt" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Utang</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {formatCurrency(
                      supplierDebts.reduce(
                        (sum, d) => sum + d.remaining_amount,
                        0,
                      ),
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {supplierDebts.length} pembelian
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-red-100 text-red-600">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sudah Dibayar</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(
                      supplierDebts.reduce((sum, d) => sum + d.total_paid, 0),
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-100 text-green-600">
                  <Check className="w-5 h-5" />
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Pembelian
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(
                      supplierDebts.reduce((sum, d) => sum + d.total_amount, 0),
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Debt Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referensi</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Terbayar</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierDebts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Check className="w-10 h-10 text-green-500" />
                        <p className="font-semibold">
                          Tidak ada utang supplier
                        </p>
                        <p className="text-sm">Semua pembelian sudah lunas</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  supplierDebts.map((debt) => (
                    <TableRow key={debt.purchase_id}>
                      <TableCell className="font-mono font-medium">
                        {debt.reference_no}
                      </TableCell>
                      <TableCell>
                        {debt.supplier_name || "Tanpa Supplier"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(new Date(debt.purchase_date))}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(debt.total_amount)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(debt.total_paid)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        {formatCurrency(debt.remaining_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            debt.payment_status === "partial"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {debt.payment_status === "partial"
                            ? "Sebagian"
                            : "Belum Bayar"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => openPayDebt(debt)}
                        >
                          <DollarSign className="w-3 h-3" /> Bayar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ========== SUPPLIERS TAB ========== */}
        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex justify-between">
            <p className="text-muted-foreground">
              Kelola daftar supplier / pemasok
            </p>
            <Dialog
              open={isAddSupplierOpen}
              onOpenChange={(open) => {
                setIsAddSupplierOpen(open);
                if (!open) {
                  setSupplierName("");
                  setSupplierPhone("");
                  setSupplierAddress("");
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Tambah Supplier
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Supplier Baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nama Supplier</Label>
                    <Input
                      placeholder="Nama supplier"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telepon *</Label>
                    <Input
                      placeholder="08xxxxxxxxxx"
                      value={supplierPhone}
                      onChange={(e) => setSupplierPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Alamat</Label>
                    <Textarea
                      placeholder="Alamat supplier"
                      value={supplierAddress}
                      onChange={(e) => setSupplierAddress(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddSupplierOpen(false)}
                    >
                      Batal
                    </Button>
                    <Button onClick={handleAddSupplier}>Simpan</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Supplier</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      {supplier.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="w-3 h-3" /> {supplier.phone}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {supplier.address || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => startEditSupplier(supplier)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteSupplierTarget(supplier)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {suppliers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Belum ada supplier</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* View Purchase Detail Dialog */}
      <Dialog open={!!viewPurchase} onOpenChange={() => setViewPurchase(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Pembelian</DialogTitle>
          </DialogHeader>
          {viewPurchase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Referensi</p>
                  <p className="font-medium">{viewPurchase.reference_no}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tanggal</p>
                  <p className="font-medium">{formatDate(viewPurchase.date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Supplier</p>
                  <p className="font-medium">
                    {getSupplierName(viewPurchase.supplier_id)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-bold text-primary">
                    {formatCurrency(viewPurchase.total_amount)}
                  </p>
                </div>
              </div>

              {/* Image Proof Section */}
              {viewPurchase.image_proof && (
                <div className="border-t pt-4">
                  <p className="font-medium mb-2">Bukti Pembelian</p>
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img
                      src={viewPurchase.image_proof}
                      alt="Bukti pembelian"
                      className="w-full max-h-64 object-contain bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() =>
                        setViewImageProof(viewPurchase.image_proof)
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Klik gambar untuk memperbesar
                  </p>
                </div>
              )}

              {viewPurchase.note && (
                <div className="text-sm border-t pt-4">
                  <p className="text-muted-foreground">Catatan</p>
                  <p>{viewPurchase.note}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="font-medium mb-2">Item Pembelian</p>
                <div className="space-y-2">
                  {purchaseDetails.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.product?.name || `#${item.product_id}`} x
                        {item.quantity}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(item.sub_total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center border-t pt-4">
                {user?.role === "owner" ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => setDeletePurchaseTarget(viewPurchase)}
                  >
                    <Trash2 className="w-4 h-4" /> Hapus Riwayat
                  </Button>
                ) : (
                  <div></div>
                )}
                <Button onClick={() => setViewPurchase(null)}>
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog
        open={!!editingSupplier}
        onOpenChange={(open) => {
          if (!open) setEditingSupplier(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama *</Label>
              <Input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Telepon *</Label>
              <Input
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Textarea
                value={supplierAddress}
                onChange={(e) => setSupplierAddress(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditingSupplier(null)}
              >
                Batal
              </Button>
              <Button onClick={handleEditSupplier}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay Debt Dialog */}
      <Dialog open={isPayDebtOpen} onOpenChange={setIsPayDebtOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bayar Utang Supplier</DialogTitle>
          </DialogHeader>
          {selectedDebt && (
            <div className="space-y-4 py-4">
              {/* Debt Info */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Referensi:</span>
                  <span className="font-medium">
                    {selectedDebt.reference_no}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Supplier:</span>
                  <span className="font-medium">
                    {selectedDebt.supplier_name || "Tanpa Supplier"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Total Pembelian:
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(selectedDebt.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sudah Dibayar:</span>
                  <span className="text-green-600">
                    {formatCurrency(selectedDebt.total_paid)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Sisa Utang:</span>
                  <span className="font-bold text-red-600 text-lg">
                    {formatCurrency(selectedDebt.remaining_amount)}
                  </span>
                </div>
              </div>

              {/* Payment History */}
              {debtPayments.length > 0 && (
                <div className="space-y-2">
                  <Label>Riwayat Pembayaran</Label>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
                    {debtPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex justify-between text-xs"
                      >
                        <span className="text-muted-foreground">
                          {formatDate(new Date(payment.payment_date))}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Form */}
              <div className="space-y-2">
                <Label>Jumlah Pembayaran *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  max={selectedDebt.remaining_amount}
                />
                <p className="text-xs text-muted-foreground">
                  Maksimal: {formatCurrency(selectedDebt.remaining_amount)}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsPayDebtOpen(false)}
                >
                  Batal
                </Button>
                <Button onClick={handlePayDebt}>Bayar Sekarang</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Add Supplier Dialog (Nested Modal) */}
      <Dialog
        open={isQuickAddSupplierOpen}
        onOpenChange={(open) => {
          setIsQuickAddSupplierOpen(open);
          if (!open) {
            setSupplierName("");
            setSupplierPhone("");
            setSupplierAddress("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Supplier Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                Nama Supplier <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Nama supplier"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>
                Telepon <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="08xxxxxxxxxx"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Textarea
                placeholder="Alamat supplier (opsional)"
                value={supplierAddress}
                onChange={(e) => setSupplierAddress(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsQuickAddSupplierOpen(false)}
              >
                Batal
              </Button>
              <Button onClick={handleQuickAddSupplier}>Simpan & Pilih</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Add Product Modal */}
      <AddProductModal
        isOpen={isQuickAddProductOpen}
        onClose={() => {
          setIsQuickAddProductOpen(false);
          setQuickAddItemIndex(null);
        }}
        storeId={activeStoreId}
        onProductAdded={handleProductAdded}
      />

      {/* Image Proof Viewer Modal */}
      <Dialog
        open={!!viewImageProof}
        onOpenChange={() => setViewImageProof(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Bukti Pembelian</DialogTitle>
          </DialogHeader>
          {viewImageProof && (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
                <img
                  src={viewImageProof}
                  alt="Bukti pembelian"
                  className="w-full max-h-[70vh] object-contain"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => setViewImageProof(null)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Supplier Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteSupplierTarget}
        onOpenChange={(open) => !open && setDeleteSupplierTarget(null)}
        onConfirm={handleDeleteSupplier}
        title="Hapus Supplier?"
        itemName={deleteSupplierTarget?.name}
        description="Supplier ini akan dihapus. Pastikan tidak ada transaksi pembelian yang terkait."
      />

      {/* Delete Purchase Confirmation */}
      <DeleteConfirmDialog
        open={!!deletePurchaseTarget}
        onOpenChange={(open) => !open && setDeletePurchaseTarget(null)}
        onConfirm={handleDeletePurchase}
        title="Hapus Riwayat Pembelian?"
        description={
          deletePurchaseTarget 
            ? `Pembelian ${deletePurchaseTarget.reference_no} akan dihapus secara permanen. Data ini tidak dapat dikembalikan.`
            : undefined
        }
      />
    </div>
  );
}
