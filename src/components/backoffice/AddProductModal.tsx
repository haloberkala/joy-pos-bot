import { useState, useEffect, useMemo } from "react";
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
import { Plus, Barcode, X, RefreshCw } from "lucide-react";
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
import { 
  getMainProducts, getOrCreateMainProduct,
  getVariants, getOrCreateVariant,
  getSpecifications, getOrCreateSpecification,
  getSizes, getOrCreateSize,
  ProductMaster 
} from "@/services/productMasterService";
import { generateProductName, generateProductShortName } from "@/lib/productUtils";
import { generateUniqueBarcode } from "@/lib/barcodeUtils";

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
  const [formData, setFormData] = useState<Partial<CreateProductInput>>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [mainProducts, setMainProducts] = useState<ProductMaster[]>([]);
  const [variants, setVariants] = useState<ProductMaster[]>([]);
  const [specifications, setSpecifications] = useState<ProductMaster[]>([]);
  const [sizes, setSizes] = useState<ProductMaster[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  const [quickAdd, setQuickAdd] = useState<{
    type: 'category' | 'brand' | 'main_product' | 'variant' | 'specification' | 'size' | 'unit';
  } | null>(null);
  const [quickAddName, setQuickAddName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingBarcode, setIsGeneratingBarcode] = useState(false);

  // Auto-generate name preview
  const generatedName = useMemo(() => {
    return generateProductName({
      brandName: brands.find(b => b.id === formData.brand_id)?.name,
      mainProductName: mainProducts.find(m => m.id === formData.main_product_id)?.name,
      variantName: variants.find(v => v.id === formData.variant_id)?.name,
      specificationName: specifications.find(s => s.id === formData.specification_id)?.name,
      sizeName: sizes.find(s => s.id === formData.size_id)?.name,
    });
  }, [formData, brands, mainProducts, variants, specifications, sizes]);

  const generatedShortName = useMemo(() => {
    const brand = brands.find(b => b.id === formData.brand_id);
    const mainProduct = mainProducts.find(m => m.id === formData.main_product_id);
    const variant = variants.find(v => v.id === formData.variant_id);
    const specification = specifications.find(s => s.id === formData.specification_id);
    const size = sizes.find(s => s.id === formData.size_id);
    
    return generateProductShortName({
      brand,
      mainProduct,
      variant,
      specification,
      size,
    });
  }, [formData, brands, mainProducts, variants, specifications, sizes]);

  const loadData = async () => {
    try {
      const [cats, brs, mains, vars, specs, szs, uns] = await Promise.all([
        getAllCategories(storeId),
        getAllBrands(storeId),
        getMainProducts(storeId),
        getVariants(storeId),
        getSpecifications(storeId),
        getSizes(storeId),
        getAllUnits(storeId),
      ]);
      setCategories(cats);
      setBrands(brs);
      setMainProducts(mains);
      setVariants(vars);
      setSpecifications(specs);
      setSizes(szs);
      setUnits(uns);
    } catch (error) {
      console.error('Error loading master data:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, storeId]);

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name,
        code: editingProduct.code,
        category_id: editingProduct.category_id || undefined,
        brand_id: editingProduct.brand_id || undefined,
        main_product_id: editingProduct.main_product_id || undefined,
        variant_id: editingProduct.variant_id || undefined,
        specification_id: editingProduct.specification_id || undefined,
        size_id: editingProduct.size_id || undefined,
        unit_id: editingProduct.unit_id || undefined,
        cost_price: editingProduct.cost_price,
        selling_price_retail: editingProduct.selling_price_retail,
        selling_price_wholesale: editingProduct.selling_price_wholesale,
        selling_price_special: editingProduct.selling_price_special,
        wholesale_min_qty: editingProduct.wholesale_min_qty,
        special_min_qty: editingProduct.special_min_qty,
        min_stock_alert: editingProduct.min_stock_alert,
        quantity: editingProduct.quantity,
      });
    } else {
      setFormData({
        name: "",
        code: "",
        category_id: undefined,
        brand_id: undefined,
        main_product_id: undefined,
        variant_id: undefined,
        specification_id: undefined,
        size_id: undefined,
        unit_id: undefined,
        cost_price: undefined,
        selling_price_retail: undefined,
        selling_price_wholesale: undefined,
        selling_price_special: undefined,
        wholesale_min_qty: undefined,
        special_min_qty: undefined,
        min_stock_alert: undefined,
        quantity: undefined,
      });
    }
    setQuickAdd(null);
    setQuickAddName("");
  }, [isOpen, editingProduct]);

  const handleQuickAdd = async () => {
    if (!quickAddName.trim()) {
      toast.error("Nama tidak boleh kosong");
      return;
    }
    
    try {
      const name = quickAddName.trim();
      let createdId: number;
      
      switch (quickAdd!.type) {
        case 'category':
          createdId = (await getOrCreateCategory(name, storeId)).id;
          setFormData(p => ({ ...p, category_id: createdId, brand_id: undefined }));
          break;
        case 'brand':
          createdId = (await getOrCreateBrand(name, storeId)).id;
          setFormData(p => ({ ...p, brand_id: createdId }));
          break;
        case 'main_product':
          createdId = (await getOrCreateMainProduct(name, storeId)).id;
          setFormData(p => ({ ...p, main_product_id: createdId }));
          break;
        case 'variant':
          createdId = (await getOrCreateVariant(name, storeId)).id;
          setFormData(p => ({ ...p, variant_id: createdId }));
          break;
        case 'specification':
          createdId = (await getOrCreateSpecification(name, storeId)).id;
          setFormData(p => ({ ...p, specification_id: createdId }));
          break;
        case 'size':
          createdId = (await getOrCreateSize(name, storeId)).id;
          setFormData(p => ({ ...p, size_id: createdId }));
          break;
        case 'unit':
          createdId = (await getOrCreateUnit(name, storeId)).id;
          setFormData(p => ({ ...p, unit_id: createdId }));
          break;
      }
      
      toast.success("Berhasil ditambahkan");
      setQuickAdd(null);
      setQuickAddName("");
      await loadData();
    } catch (error) {
      console.error('Error in quick add:', error);
      toast.error("Gagal menambahkan data");
    }
  };

  const handleGenerateBarcode = async () => {
    try {
      setIsGeneratingBarcode(true);
      const barcode = await generateUniqueBarcode(storeId);
      setFormData(p => ({ ...p, code: barcode }));
      toast.success("Barcode berhasil digenerate");
    } catch (error: any) {
      console.error('Error generating barcode:', error);
      toast.error(error.message || "Gagal generate barcode");
    } finally {
      setIsGeneratingBarcode(false);
    }
  };

  const handleSave = async () => {
    // Validate ALL REQUIRED fields
    // Master data
    if (!formData.category_id) {
      toast.error("Kategori wajib dipilih");
      return;
    }
    if (!formData.main_product_id) {
      toast.error("Produk Utama wajib dipilih");
      return;
    }
    if (!formData.unit_id) {
      toast.error("Satuan wajib dipilih");
      return;
    }
    
    // Barcode
    if (!formData.code?.trim()) {
      toast.error("Barcode/SKU wajib diisi");
      return;
    }
    
    // Inventory - quantity is required but CAN BE NEGATIVE (overselling allowed)
    // Only validate on ADD mode, not EDIT (stock is managed separately)
    if (!editingProduct) {
      if (formData.quantity === undefined || formData.quantity === null) {
        toast.error("Stok Awal wajib diisi");
        return;
      }
    }
    
    // min_stock_alert is always required and must be >= 0
    if (formData.min_stock_alert === undefined || formData.min_stock_alert < 0) {
      toast.error("Stok Minimum wajib diisi (minimal 0)");
      return;
    }
    
    // Prices - all required and must be >= 0
    if (!formData.cost_price || formData.cost_price < 0) {
      toast.error("Harga Modal wajib diisi dan tidak boleh negatif");
      return;
    }
    if (!formData.selling_price_retail || formData.selling_price_retail < 0) {
      toast.error("Harga Jual Eceran wajib diisi dan tidak boleh negatif");
      return;
    }
    if (!formData.selling_price_wholesale || formData.selling_price_wholesale < 0) {
      toast.error("Harga Jual Grosir wajib diisi dan tidak boleh negatif");
      return;
    }
    if (!formData.selling_price_special || formData.selling_price_special < 0) {
      toast.error("Harga Jual Spesial wajib diisi dan tidak boleh negatif");
      return;
    }
    
    // Min quantities - all required and must be >= 0
    if (formData.wholesale_min_qty === undefined || formData.wholesale_min_qty < 0) {
      toast.error("Min. Qty Grosir wajib diisi (minimal 0)");
      return;
    }
    if (formData.special_min_qty === undefined || formData.special_min_qty < 0) {
      toast.error("Min. Qty Spesial wajib diisi (minimal 0)");
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        name: generatedName,
        code: formData.code,
        category_id: formData.category_id,
        brand_id: formData.brand_id,
        main_product_id: formData.main_product_id,
        variant_id: formData.variant_id,
        specification_id: formData.specification_id,
        size_id: formData.size_id,
        unit_id: formData.unit_id,
        cost_price: formData.cost_price!,
        selling_price_retail: formData.selling_price_retail!,
        selling_price_wholesale: formData.selling_price_wholesale!,
        selling_price_special: formData.selling_price_special!,
        wholesale_min_qty: formData.wholesale_min_qty!,
        special_min_qty: formData.special_min_qty!,
        min_stock_alert: formData.min_stock_alert!,
        // quantity only for create, not for update (stock managed separately)
        ...(editingProduct ? {} : { quantity: formData.quantity! }),
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        toast.success("Produk berhasil diperbarui");
      } else {
        await createProduct({
          store_id: storeId,
          code: formData.code!,
          category_id: formData.category_id!,
          main_product_id: formData.main_product_id!,
          unit_id: formData.unit_id!,
          quantity: formData.quantity!,
          min_stock_alert: formData.min_stock_alert!,
          cost_price: formData.cost_price!,
          selling_price_retail: formData.selling_price_retail!,
          selling_price_wholesale: formData.selling_price_wholesale!,
          selling_price_special: formData.selling_price_special!,
          wholesale_min_qty: formData.wholesale_min_qty!,
          special_min_qty: formData.special_min_qty!,
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

  const MasterDropdown = ({ 
    label, 
    type, 
    items, 
    valueKey,
    isRequired = true
  }: { 
    label: string, 
    type: 'category' | 'brand' | 'main_product' | 'variant' | 'specification' | 'size' | 'unit', 
    items: any[], 
    valueKey: keyof CreateProductInput,
    isRequired?: boolean
  }) => (
    <div className="space-y-2">
      <Label>
        {label}
        {isRequired && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <div className="flex gap-1">
        <Select
          value={formData[valueKey]?.toString() || "none"}
          onValueChange={(val) => {
            const numVal = val === "none" ? undefined : parseInt(val);
            setFormData(p => ({ ...p, [valueKey]: numVal }));
            setQuickAdd(null);
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={`Pilih ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="italic text-muted-foreground">— Kosong —</SelectItem>
            {items.map((i) => (
              <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            setQuickAdd(quickAdd?.type === type ? null : { type });
            setQuickAddName("");
          }}
          title={`Tambah ${label.toLowerCase()} baru`}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {quickAdd?.type === type && (
        <div className="flex gap-1 mt-2 p-3 bg-muted/50 rounded-lg">
          <Input
            value={quickAddName}
            onChange={(e) => setQuickAddName(e.target.value)}
            placeholder={`Nama ${label.toLowerCase()} baru`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleQuickAdd(); }
            }}
            autoFocus
          />
          <Button size="sm" onClick={handleQuickAdd}>Tambah</Button>
          <Button variant="ghost" size="icon" onClick={() => setQuickAdd(null)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          
          <MasterDropdown label="Kategori" type="category" items={categories} valueKey="category_id" isRequired={true} />
          <MasterDropdown label="Brand" type="brand" items={brands} valueKey="brand_id" isRequired={false} />
          <MasterDropdown label="Produk Utama" type="main_product" items={mainProducts} valueKey="main_product_id" isRequired={true} />
          <MasterDropdown label="Varian" type="variant" items={variants} valueKey="variant_id" isRequired={false} />
          <MasterDropdown label="Spesifikasi" type="specification" items={specifications} valueKey="specification_id" isRequired={false} />
          <MasterDropdown label="Ukuran/Isi" type="size" items={sizes} valueKey="size_id" isRequired={false} />

          {/* Barcode/SKU */}
          <div className="space-y-2">
            <Label>Barcode/SKU <span className="text-destructive">*</span></Label>
            <div className="flex gap-1">
              <div className="relative flex-1">
                <Input
                  value={formData.code || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
                  data-barcode-input="true"
                />
                <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleGenerateBarcode}
                disabled={isGeneratingBarcode}
                title="Generate barcode otomatis"
              >
                {isGeneratingBarcode ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Isi "-" untuk generate otomatis saat menyimpan
            </p>
          </div>

          <MasterDropdown label="Satuan" type="unit" items={units} valueKey="unit_id" isRequired={true} />

          {/* Stok */}
          <div className="space-y-2">
            <Label>Stok Awal <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              value={formData.quantity !== undefined ? formData.quantity : ""}
              onChange={(e) => setFormData((p) => ({ ...p, quantity: e.target.value === "" ? undefined : parseInt(e.target.value) || 0 }))}
              placeholder="0"
              disabled={!!editingProduct}
            />
            {!editingProduct && (
              <p className="text-[11px] text-muted-foreground">
                Boleh bernilai negatif apabila stok fisik belum tercatat di sistem
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Stok Minimum <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              value={formData.min_stock_alert !== undefined ? formData.min_stock_alert : ""}
              onChange={(e) => setFormData((p) => ({ ...p, min_stock_alert: e.target.value === "" ? undefined : parseInt(e.target.value) || 0 }))}
              placeholder="0"
            />
          </div>

          {/* Harga Dasar & Eceran */}
          <div className="space-y-2">
            <Label>Harga Modal <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              value={formData.cost_price !== undefined ? formData.cost_price : ""}
              onChange={(e) => setFormData((p) => ({ ...p, cost_price: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0 }))}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Harga Jual Eceran <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              value={formData.selling_price_retail !== undefined ? formData.selling_price_retail : ""}
              onChange={(e) => setFormData((p) => ({ ...p, selling_price_retail: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0 }))}
              placeholder="0"
            />
          </div>

          {/* Harga Grosir */}
          <div className="space-y-2">
            <Label>Harga Jual Grosir <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              value={formData.selling_price_wholesale !== undefined ? formData.selling_price_wholesale : ""}
              onChange={(e) => setFormData((p) => ({ ...p, selling_price_wholesale: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0 }))}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Min. Qty Grosir <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              value={formData.wholesale_min_qty !== undefined ? formData.wholesale_min_qty : ""}
              onChange={(e) => setFormData((p) => ({ ...p, wholesale_min_qty: e.target.value === "" ? undefined : parseInt(e.target.value) || 0 }))}
              placeholder="0"
            />
          </div>

          {/* Harga Spesial */}
          <div className="space-y-2">
            <Label>Harga Jual Spesial <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              value={formData.selling_price_special !== undefined ? formData.selling_price_special : ""}
              onChange={(e) => setFormData((p) => ({ ...p, selling_price_special: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0 }))}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Min. Qty Spesial <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              value={formData.special_min_qty !== undefined ? formData.special_min_qty : ""}
              onChange={(e) => setFormData((p) => ({ ...p, special_min_qty: e.target.value === "" ? undefined : parseInt(e.target.value) || 0 }))}
              placeholder="0"
            />
          </div>

          {/* Live Preview Name */}
          <div className="col-span-2 mt-4 p-4 bg-muted/30 rounded-lg border border-border">
            <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2 block">
              Preview Penamaan Produk
            </Label>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] text-muted-foreground">Nama Lengkap:</div>
                <div className="font-medium text-foreground">{generatedName || <span className="italic text-muted-foreground">Belum ada data</span>}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">Nama Pendek (Struk):</div>
                <div className="font-mono text-sm text-primary font-bold">{generatedShortName || <span className="italic text-muted-foreground font-sans font-normal">Belum ada data</span>}</div>
              </div>
            </div>
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
