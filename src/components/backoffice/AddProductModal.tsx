import { useState, useEffect, useMemo } from "react";
import { Product, Category, Brand, Unit } from "@/types/pos";
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
  getCategoriesForStore,
  getBrandsForStore,
  getUnitsForStore,
  addProduct,
  getOrCreateCategory,
  getOrCreateBrand,
  getOrCreateUnit,
} from "@/data/sampleData";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: number;
  onProductAdded?: (product: Product) => void;
  editingProduct?: Product | null;
}

export function AddProductModal({
  isOpen,
  onClose,
  storeId,
  onProductAdded,
  editingProduct,
}: AddProductModalProps) {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    code: "",
    category_id: null,
    brand_id: null,
    unit_id: null,
    cost_price: 0,
    selling_price_retail: 0,
    selling_price_wholesale: 0,
    selling_price_special: 0,
    wholesale_min_qty: 10,
    special_min_qty: 20,
    min_stock_alert: 10,
    quantity: 0,
  });

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewBrand, setShowNewBrand] = useState(false);

  const storeCategories = useMemo(
    () => getCategoriesForStore(storeId),
    [storeId],
  );
  const storeBrands = useMemo(() => getBrandsForStore(storeId), [storeId]);
  const storeUnits = useMemo(() => getUnitsForStore(storeId), [storeId]);

  useEffect(() => {
    if (editingProduct) {
      setFormData(editingProduct);
    } else {
      setFormData({
        name: "",
        code: "",
        category_id: null,
        brand_id: null,
        unit_id: null,
        cost_price: 0,
        selling_price_retail: 0,
        selling_price_wholesale: 0,
        selling_price_special: 0,
        wholesale_min_qty: 10,
        special_min_qty: 20,
        min_stock_alert: 10,
        quantity: 0,
      });
    }
    setShowNewCategory(false);
    setShowNewBrand(false);
    setNewCategoryName("");
    setNewBrandName("");
  }, [isOpen, editingProduct]);

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error("Nama kategori tidak boleh kosong");
      return;
    }
    const categoryId = getOrCreateCategory(newCategoryName.trim(), storeId);
    setFormData((p) => ({ ...p, category_id: categoryId }));
    setNewCategoryName("");
    setShowNewCategory(false);
    toast.success("Kategori berhasil ditambahkan");
  };

  const handleAddBrand = () => {
    if (!newBrandName.trim()) {
      toast.error("Nama brand tidak boleh kosong");
      return;
    }
    const brandId = getOrCreateBrand(newBrandName.trim(), storeId);
    setFormData((p) => ({ ...p, brand_id: brandId }));
    setNewBrandName("");
    setShowNewBrand(false);
    toast.success("Brand berhasil ditambahkan");
  };

  const handleSave = () => {
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

    const newProduct: Product = {
      id: editingProduct?.id || Date.now(),
      store_id: storeId,
      category_id: formData.category_id || null,
      brand_id: formData.brand_id || null,
      unit_id: formData.unit_id || null,
      name: formData.name,
      code: formData.code,
      expiry_date: null,
      quantity: formData.quantity || 0,
      min_stock_alert: formData.min_stock_alert || 10,
      cost_price: formData.cost_price || 0,
      selling_price: formData.selling_price_retail || 0,
      selling_price_retail: formData.selling_price_retail || 0,
      selling_price_wholesale:
        formData.selling_price_wholesale || formData.selling_price_retail || 0,
      selling_price_special:
        formData.selling_price_special ||
        Math.round(
          (formData.selling_price_wholesale ||
            formData.selling_price_retail ||
            0) * 0.9,
        ),
      wholesale_min_qty: formData.wholesale_min_qty || 10,
      special_min_qty: formData.special_min_qty || 20,
      is_active: true,
      created_at: editingProduct?.created_at || new Date(),
      updated_at: new Date(),
      created_by: null,
      updated_by: null,
    };

    addProduct(newProduct);
    toast.success(
      editingProduct
        ? "Produk berhasil diperbarui"
        : "Produk berhasil ditambahkan",
    );
    onProductAdded?.(newProduct);
    onClose();
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

          <div className="space-y-2">
            <Label>Kategori</Label>
            <div className="flex gap-1">
              <Select
                value={formData.category_id?.toString() || ""}
                onValueChange={(val) =>
                  setFormData((p) => ({
                    ...p,
                    category_id: parseInt(val) || null,
                  }))
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {storeCategories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.icon || "📦"} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowNewCategory(!showNewCategory)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {showNewCategory && (
              <div className="flex gap-1 mt-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nama kategori baru"
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
                onValueChange={(val) =>
                  setFormData((p) => ({
                    ...p,
                    brand_id: parseInt(val) || null,
                  }))
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Pilih brand" />
                </SelectTrigger>
                <SelectContent>
                  {storeBrands.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowNewBrand(!showNewBrand)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {showNewBrand && (
              <div className="flex gap-1 mt-2">
                <Input
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Nama brand baru"
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

          <div className="space-y-2">
            <Label>Satuan</Label>
            <Select
              value={formData.unit_id?.toString() || ""}
              onValueChange={(val) =>
                setFormData((p) => ({ ...p, unit_id: parseInt(val) || null }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih satuan" />
              </SelectTrigger>
              <SelectContent>
                {storeUnits.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name} ({u.short_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Harga Modal *</Label>
            <Input
              type="number"
              value={formData.cost_price || 0}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  cost_price: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Harga Jual Eceran *</Label>
            <Input
              type="number"
              value={formData.selling_price_retail || 0}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  selling_price_retail: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Harga Jual Grosir</Label>
            <Input
              type="number"
              value={formData.selling_price_wholesale || 0}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  selling_price_wholesale: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Min Qty Grosir</Label>
            <Input
              type="number"
              value={formData.wholesale_min_qty || 10}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  wholesale_min_qty: parseInt(e.target.value) || 10,
                }))
              }
              placeholder="10"
            />
          </div>

          <div className="space-y-2">
            <Label>Harga Jual Spesial</Label>
            <Input
              type="number"
              value={formData.selling_price_special || 0}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  selling_price_special: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Min Qty Spesial</Label>
            <Input
              type="number"
              value={formData.special_min_qty || 20}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  special_min_qty: parseInt(e.target.value) || 20,
                }))
              }
              placeholder="20"
            />
          </div>

          <div className="space-y-2">
            <Label>Stok Awal</Label>
            <Input
              type="number"
              value={formData.quantity || 0}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  quantity: parseInt(e.target.value) || 0,
                }))
              }
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Stok Minimum Alert</Label>
            <Input
              type="number"
              value={formData.min_stock_alert || 10}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  min_stock_alert: parseInt(e.target.value) || 10,
                }))
              }
              placeholder="10"
            />
          </div>

          <div className="col-span-2 flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={handleSave}>
              {editingProduct ? "Perbarui Produk" : "Simpan Produk"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
