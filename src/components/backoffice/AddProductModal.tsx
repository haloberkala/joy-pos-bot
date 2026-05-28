import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Barcode, X } from "lucide-react";
import { toast } from "sonner";
import { 
  createProduct, 
  updateProduct, 
  Product,
  CreateProductInput 
} from "@/services/productsService";
import { getAllCategories, getOrCreateCategory } from "@/services/categoriesService";
import { getAllBrands, getOrCreateBrand } from "@/services/brandsService";
import { getAllUnits, getOrCreateUnit } from "@/services/unitsService";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: number;
  onProductAdded?: () => void;
  editingProduct?: Product | null;
}

export function AddProductModal({
  isOpen,
  onClose,
  storeId,
  onProductAdded,
  editingProduct,
}: AddProductModalProps) {
  const [formData, setFormData] = useState<Partial<CreateProductInput>>({
    name: "",
    code: "",
    category_id: undefined,
    brand_id: undefined,
    unit_id: undefined,
    cost_price: undefined,
    selling_price_retail: undefined,
    selling_price_wholesale: undefined,
    selling_price_special: undefined,
    min_stock_alert: undefined,
    quantity: undefined,
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [newUnitName, setNewUnitName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load categories, brands, and units
  useEffect(() => {
    if (isOpen) {
      loadCategories();
      loadBrands();
      loadUnits();
    }
  }, [isOpen, storeId]);

  const loadCategories = async () => {
    try {
      const data = await getAllCategories(storeId);
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadBrands = async () => {
    try {
      const data = await getAllBrands(storeId);
      setBrands(data);
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const loadUnits = async () => {
    try {
      const data = await getAllUnits(storeId);
      setUnits(data);
    } catch (error) {
      console.error('Error loading units:', error);
    }
  };

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name,
        code: editingProduct.code,
        category_id: editingProduct.category_id || undefined,
        brand_id: editingProduct.brand_id || undefined,
        unit_id: editingProduct.unit_id || undefined,
        cost_price: editingProduct.cost_price,
        selling_price_retail: editingProduct.selling_price_retail,
        selling_price_wholesale: editingProduct.selling_price_wholesale,
        selling_price_special: editingProduct.selling_price_special,
        min_stock_alert: editingProduct.min_stock_alert,
        quantity: editingProduct.quantity,
      });
    } else {
      setFormData({
        name: "",
        code: "",
        category_id: undefined,
        brand_id: undefined,
        unit_id: undefined,
        cost_price: undefined,
        selling_price_retail: undefined,
        selling_price_wholesale: undefined,
        selling_price_special: undefined,
        min_stock_alert: undefined,
        quantity: undefined,
      });
    }
    setShowNewCategory(false);
    setShowNewBrand(false);
    setShowNewUnit(false);
    setNewCategoryName("");
    setNewBrandName("");
    setNewUnitName("");
  }, [isOpen, editingProduct]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Nama kategori tidak boleh kosong");
      return;
    }
    
    try {
      const category = await getOrCreateCategory(newCategoryName.trim(), storeId);
      
      // Set kategori yang baru dibuat sebagai kategori terpilih
      setFormData((p) => ({ 
        ...p, 
        category_id: category.id,
        brand_id: undefined // Reset brand karena kategori berubah
      }));
      
      setNewCategoryName("");
      setShowNewCategory(false);
      await loadCategories();
      
      toast.success(`Kategori "${category.name}" berhasil ditambahkan dan dipilih`);
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error("Gagal menambahkan kategori");
    }
  };

  const handleAddBrand = async () => {
    if (!newBrandName.trim()) {
      toast.error("Nama brand tidak boleh kosong");
      return;
    }
    
    try {
      const brand = await getOrCreateBrand(newBrandName.trim(), storeId);
      
      // Set brand yang baru dibuat sebagai brand terpilih
      setFormData((p) => ({ ...p, brand_id: brand.id }));
      
      setNewBrandName("");
      setShowNewBrand(false);
      await loadBrands();
      
      toast.success(`Brand "${brand.name}" berhasil ditambahkan dan dipilih`);
    } catch (error) {
      console.error('Error adding brand:', error);
      toast.error("Gagal menambahkan brand");
    }
  };

  const handleAddUnit = async () => {
    if (!newUnitName.trim()) {
      toast.error("Nama satuan tidak boleh kosong");
      return;
    }
    
    try {
      const unit = await getOrCreateUnit(newUnitName.trim(), storeId);
      
      // Set unit yang baru dibuat sebagai unit terpilih
      setFormData((p) => ({ ...p, unit_id: unit.id }));
      
      setNewUnitName("");
      setShowNewUnit(false);
      await loadUnits();
      
      toast.success(`Satuan "${unit.name}" berhasil ditambahkan dan dipilih`);
    } catch (error) {
      console.error('Error adding unit:', error);
      toast.error("Gagal menambahkan satuan");
    }
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error("Nama produk wajib diisi");
      return;
    }
    if (!formData.code?.trim()) {
      toast.error("Kode/Barcode wajib diisi");
      return;
    }
    if ((formData.cost_price || 0) <= 0) {
      toast.error("Harga modal harus > 0");
      return;
    }
    if ((formData.selling_price_retail || 0) <= 0) {
      toast.error("Harga jual eceran harus > 0");
      return;
    }

    try {
      setIsSaving(true);

      // Prepare payload - no min qty fields
      const payload = {
        name: formData.name,
        code: formData.code, // Include code for updates
        category_id: formData.category_id,
        brand_id: formData.brand_id,
        unit_id: formData.unit_id,
        cost_price: formData.cost_price || 0,
        selling_price_retail: formData.selling_price_retail || 0,
        selling_price_wholesale: formData.selling_price_wholesale || 0,
        selling_price_special: formData.selling_price_special || 0,
        min_stock_alert: formData.min_stock_alert || 0,
        quantity: formData.quantity || 0,
      };

      if (editingProduct) {
        // Update existing product
        await updateProduct(editingProduct.id, payload);
        toast.success("Produk berhasil diperbarui");
      } else {
        // Create new product
        await createProduct({
          store_id: storeId,
          code: formData.code!,
          ...payload,
        });
        toast.success("Produk berhasil ditambahkan");
      }

      onProductAdded?.();
      onClose();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || "Gagal menyimpan produk");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Baris 1: Klasifikasi - Kategori | Brand */}
          <div className="space-y-2">
            <Label>Kategori</Label>
            <div className="flex gap-1">
              <Select
                value={formData.category_id?.toString() || ""}
                onValueChange={(val) => {
                  const categoryId = parseInt(val) || undefined;
                  setFormData((p) => ({
                    ...p,
                    category_id: categoryId,
                  }));
                  setShowNewCategory(false);
                  setNewCategoryName("");
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setShowNewCategory(!showNewCategory);
                  setShowNewBrand(false);
                }}
                title="Tambah kategori baru"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {showNewCategory && (
              <div className="flex gap-1 mt-2 p-3 bg-muted/50 rounded-lg">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nama kategori baru"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  autoFocus
                />
                <Button size="sm" onClick={handleAddCategory}>
                  Tambah
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowNewCategory(false);
                    setNewCategoryName("");
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Brand</Label>
            <div className="flex gap-1">
              <Select
                value={formData.brand_id?.toString() || ""}
                onValueChange={(val) => {
                  setFormData((p) => ({
                    ...p,
                    brand_id: parseInt(val) || undefined,
                  }));
                  setShowNewBrand(false);
                  setNewBrandName("");
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Pilih brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Belum ada brand
                    </div>
                  ) : (
                    brands.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setShowNewBrand(!showNewBrand);
                  setShowNewCategory(false);
                }}
                title="Tambah brand baru"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {showNewBrand && (
              <div className="flex gap-1 mt-2 p-3 bg-muted/50 rounded-lg">
                <Input
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Nama brand baru"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddBrand();
                    }
                  }}
                  autoFocus
                />
                <Button size="sm" onClick={handleAddBrand}>
                  Tambah
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowNewBrand(false);
                    setNewBrandName("");
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Baris 2: Identitas - Nama Produk | Barcode/SKU */}
          <div className="space-y-2">
            <Label>Nama Produk *</Label>
            <Input
              value={formData.name || ""}
              onChange={(e) =>
                setFormData((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Nama produk"
            />
          </div>

          <div className="space-y-2">
            <Label>Barcode/SKU *</Label>
            <div className="relative">
              <Input
                value={formData.code || ""}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, code: e.target.value }))
                }
                placeholder="Scan barcode"
                data-barcode-input="true"
              />
              <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Baris 3: Fisik - Satuan (Full Width) */}
          <div className="col-span-2 space-y-2">
            <Label>Satuan</Label>
            <div className="flex gap-1">
              <Select
                value={formData.unit_id?.toString() || ""}
                onValueChange={(val) => {
                  setFormData((p) => ({
                    ...p,
                    unit_id: parseInt(val) || undefined,
                  }));
                  setShowNewUnit(false);
                  setNewUnitName("");
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Pilih satuan" />
                </SelectTrigger>
                <SelectContent>
                  {units.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Belum ada satuan
                    </div>
                  ) : (
                    units.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setShowNewUnit(!showNewUnit);
                  setShowNewCategory(false);
                  setShowNewBrand(false);
                }}
                title="Tambah satuan baru"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {showNewUnit && (
              <div className="flex gap-1 mt-2 p-3 bg-muted/50 rounded-lg">
                <Input
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  placeholder="Nama satuan baru (contoh: Pcs, Kg, Liter)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddUnit();
                    }
                  }}
                  autoFocus
                />
                <Button size="sm" onClick={handleAddUnit}>
                  Tambah
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowNewUnit(false);
                    setNewUnitName("");
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Baris 4: Stok & Kontrol - Stok Awal | Stok Minimum Alert */}
          <div className="space-y-2">
            <Label>Stok Awal</Label>
            <Input
              type="number"
              value={formData.quantity !== undefined ? formData.quantity : ""}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  quantity: e.target.value === "" ? undefined : parseInt(e.target.value) || 0,
                }))
              }
              placeholder="0"
              disabled={!!editingProduct}
            />
          </div>

          <div className="space-y-2">
            <Label>Stok Minimum</Label>
            <Input
              type="number"
              value={formData.min_stock_alert !== undefined ? formData.min_stock_alert : ""}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  min_stock_alert: e.target.value === "" ? undefined : parseInt(e.target.value) || 0,
                }))
              }
              placeholder="0"
            />
          </div>

          {/* Baris 5: Harga Dasar & Diskon - Harga Modal | Harga Jual Spesial */}
          <div className="space-y-2">
            <Label>Harga Modal *</Label>
            <Input
              type="number"
              value={formData.cost_price !== undefined ? formData.cost_price : ""}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  cost_price: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Harga Jual Spesial</Label>
            <Input
              type="number"
              value={formData.selling_price_special !== undefined ? formData.selling_price_special : ""}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  selling_price_special: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0"
            />
          </div>

          {/* Baris 6: Harga Tingkat - Harga Jual Grosir | Harga Jual Eceran */}
          <div className="space-y-2">
            <Label>Harga Jual Grosir</Label>
            <Input
              type="number"
              value={formData.selling_price_wholesale !== undefined ? formData.selling_price_wholesale : ""}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  selling_price_wholesale: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Harga Jual Eceran *</Label>
            <Input
              type="number"
              value={formData.selling_price_retail !== undefined ? formData.selling_price_retail : ""}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  selling_price_retail: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0"
            />
          </div>

          <div className="col-span-2 flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Menyimpan...' : editingProduct ? "Perbarui Produk" : "Simpan Produk"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
