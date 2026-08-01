import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Download, Upload, FileSpreadsheet, XCircle, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

import { bulkCreateProducts, CreateProductInput } from "@/services/productsService";
import { getOrCreateCategory, getAllCategories } from "@/services/categoriesService";
import { getOrCreateBrand, getAllBrands } from "@/services/brandsService";
import { getOrCreateUnit, getAllUnits } from "@/services/unitsService";
import { 
  getMainProducts, getOrCreateMainProduct,
  getVariants, getOrCreateVariant,
  getSpecifications, getOrCreateSpecification,
  getSizes, getOrCreateSize,
  ProductMaster 
} from "@/services/productMasterService";
import { generateProductName } from "@/lib/productUtils";
import { generateUniqueBarcode, processNullablePlaceholder } from "@/lib/barcodeUtils";
import { validateProductForCreate } from "@/lib/product/validators";
import { 
  fetchExistingBarcodes, 
  fetchExistingProductCombinations,
  createCombinationKey,
  checkDuplicateBarcodeInMemory,
  checkDuplicateProductInMemory
} from "@/lib/product/validators/duplicateValidators";

interface ImportProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: number;
  onSuccess?: () => void;
}

interface FailedRow {
  rowNumber: number | string;
  sku: string;
  reason: string;
}

interface ImportSummary {
  total: number;
  success: number;
  failed: number;
  errors: FailedRow[];
  masterDataCreated: {
    categories: number;
    brands: number;
    mainProducts: number;
    variants: number;
    specifications: number;
    sizes: number;
    units: number;
  };
  autoBarcodesGenerated: number;
}

export function ImportProductModal({ isOpen, onClose, storeId, onSuccess }: ImportProductModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const HEADERS = [
    "Barcode/SKU * (atau \"-\")",
    "Kategori *",
    "Brand (atau \"-\")",
    "Produk Utama *",
    "Varian (atau \"-\")",
    "Spesifikasi (atau \"-\")",
    "Ukuran/Isi (atau \"-\")",
    "Satuan *",
    "Stok Awal *",
    "Stok Minimum *",
    "Harga Modal *",
    "Harga Jual Eceran *",
    "Harga Jual Grosir *",
    "Min. Qty Grosir *",
    "Harga Jual Spesial *",
    "Min. Qty Spesial *"
  ];

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      HEADERS,
      [
        "SKU-12345",         // Barcode * (atau "-")
        "Bahan Bangunan",    // Kategori *
        "Propan",            // Brand (atau "-")
        "Cat Kayu dan Besi", // Produk Utama *
        "Merah",             // Varian (atau "-")
        "Gloss",             // Spesifikasi (atau "-")
        "1 Kg",              // Ukuran/Isi (atau "-")
        "Kaleng",            // Satuan *
        100,                 // Stok Awal *
        10,                  // Stok Minimum *
        40000,               // Harga Modal *
        50000,               // Harga Jual Eceran *
        48000,               // Harga Jual Grosir *
        12,                  // Min. Qty Grosir *
        45000,               // Harga Jual Spesial *
        50                   // Min. Qty Spesial *
      ]
    ]);
    
    // Auto-fit columns
    const wscols = HEADERS.map(h => ({ wch: Math.max(h.length, 12) }));
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Produk");
    XLSX.writeFile(wb, "Template_Import_Produk.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProgress(10);
    setSummary(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      if (rows.length === 0) {
        throw new Error("File Excel kosong");
      }

      setProgress(20);

      // Pre-fetch all master data to cache locally
      const [
        cats, brs, mains, vars, specs, szs, uns
      ] = await Promise.all([
        getAllCategories(storeId),
        getAllBrands(storeId),
        getMainProducts(storeId),
        getVariants(storeId),
        getSpecifications(storeId),
        getSizes(storeId),
        getAllUnits(storeId),
      ]);

      setProgress(40);

      // Maps for quick lookup (case-insensitive)
      const mapCat = new Map(cats.map(i => [i.name.toLowerCase(), i.id]));
      const mapBrand = new Map(brs.map(i => [i.name.toLowerCase(), i.id]));
      const mapMain = new Map(mains.map(i => [i.name.toLowerCase(), i.id]));
      const mapVar = new Map(vars.map(i => [i.name.toLowerCase(), i.id]));
      const mapSpec = new Map(specs.map(i => [i.name.toLowerCase(), i.id]));
      const mapSize = new Map(szs.map(i => [i.name.toLowerCase(), i.id]));
      const mapUnit = new Map(uns.map(i => [i.name.toLowerCase(), i.id]));

      // Cache mapping function to retrieve or create and then update cache
      const getMasterId = async (name: string, type: 'cat'|'brand'|'main'|'var'|'spec'|'size'|'unit') => {
        if (!name || !name.trim()) return undefined;
        const cleanName = name.trim();
        const lowerName = cleanName.toLowerCase();
        
        let id: number | undefined;
        let isNew = false;

        if (type === 'cat') {
          if (mapCat.has(lowerName)) return mapCat.get(lowerName);
          const item = await getOrCreateCategory(cleanName, storeId);
          mapCat.set(lowerName, item.id);
          isNew = item.id > 0 && !cats.some(c => c.id === item.id);
          if (isNew) masterDataCreated.categories++;
          return item.id;
        } else if (type === 'brand') {
          if (mapBrand.has(lowerName)) return mapBrand.get(lowerName);
          const item = await getOrCreateBrand(cleanName, storeId);
          mapBrand.set(lowerName, item.id);
          isNew = item.id > 0 && !brs.some(b => b.id === item.id);
          if (isNew) masterDataCreated.brands++;
          return item.id;
        } else if (type === 'unit') {
          if (mapUnit.has(lowerName)) return mapUnit.get(lowerName);
          const item = await getOrCreateUnit(cleanName, storeId);
          mapUnit.set(lowerName, item.id);
          isNew = item.id > 0 && !uns.some(u => u.id === item.id);
          if (isNew) masterDataCreated.units++;
          return item.id;
        } else if (type === 'main') {
          if (mapMain.has(lowerName)) return mapMain.get(lowerName);
          const item = await getOrCreateMainProduct(cleanName, storeId);
          mapMain.set(lowerName, item.id);
          isNew = item.id > 0 && !mains.some(m => m.id === item.id);
          if (isNew) masterDataCreated.mainProducts++;
          return item.id;
        } else if (type === 'var') {
          if (mapVar.has(lowerName)) return mapVar.get(lowerName);
          const item = await getOrCreateVariant(cleanName, storeId);
          mapVar.set(lowerName, item.id);
          isNew = item.id > 0 && !vars.some(v => v.id === item.id);
          if (isNew) masterDataCreated.variants++;
          return item.id;
        } else if (type === 'spec') {
          if (mapSpec.has(lowerName)) return mapSpec.get(lowerName);
          const item = await getOrCreateSpecification(cleanName, storeId);
          mapSpec.set(lowerName, item.id);
          isNew = item.id > 0 && !specs.some(s => s.id === item.id);
          if (isNew) masterDataCreated.specifications++;
          return item.id;
        } else if (type === 'size') {
          if (mapSize.has(lowerName)) return mapSize.get(lowerName);
          const item = await getOrCreateSize(cleanName, storeId);
          mapSize.set(lowerName, item.id);
          isNew = item.id > 0 && !szs.some(s => s.id === item.id);
          if (isNew) masterDataCreated.sizes++;
          return item.id;
        }
        return undefined;
      };

      // ═══════════════════════════════════════════════════════════════
      // BATCH OPTIMIZATION - Fetch all existing data once
      // ═══════════════════════════════════════════════════════════════
      const [existingBarcodes, existingCombinations] = await Promise.all([
        fetchExistingBarcodes(storeId),
        fetchExistingProductCombinations(storeId),
      ]);

      // Track in-file duplicates
      const seenBarcodes = new Map<string, number>(); // barcode -> row number
      const seenCombinations = new Map<string, number>(); // combination key -> row number

      // Track master data creation
      const masterDataCreated = {
        categories: 0,
        brands: 0,
        mainProducts: 0,
        variants: 0,
        specifications: 0,
        sizes: 0,
        units: 0,
      };
      let autoBarcodesGenerated = 0;

      const validProducts: CreateProductInput[] = [];
      const errors: FailedRow[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // +1 for 0-index, +1 for header
        
        // Normalize keys by trimming spaces
        const normRow: Record<string, any> = {};
        Object.keys(row).forEach(k => normRow[k.trim()] = row[k]);

        // Read all field values first
        let code = normRow["Barcode/SKU * (atau \"-\")"]?.toString().trim() || "";
        const categoryName = normRow["Kategori *"]?.toString().trim() || "";
        const mainProductName = normRow["Produk Utama *"]?.toString().trim() || "";
        const unitName = normRow["Satuan *"]?.toString().trim() || "";
        
        const stokAwal = normRow["Stok Awal *"];
        const stokMin = normRow["Stok Minimum *"];
        const hargaModal = normRow["Harga Modal *"];
        const priceRetail = normRow["Harga Jual Eceran *"];
        const priceWholesale = normRow["Harga Jual Grosir *"];
        const minQtyGrosir = normRow["Min. Qty Grosir *"];
        const priceSpecial = normRow["Harga Jual Spesial *"];
        const minQtySpesial = normRow["Min. Qty Spesial *"];

        // Basic pre-validation for required string fields (before calling validator)
        if (!code) { errors.push({ rowNumber, sku: code, reason: "Barcode/SKU wajib diisi." }); continue; }
        if (!categoryName || categoryName === '-') { 
          errors.push({ rowNumber, sku: code, reason: "Kategori wajib diisi. Nilai '-' hanya diperbolehkan untuk field opsional." }); 
          continue; 
        }
        if (!mainProductName || mainProductName === '-') { 
          errors.push({ rowNumber, sku: code, reason: "Produk Utama wajib diisi. Nilai '-' hanya diperbolehkan untuk field opsional." }); 
          continue; 
        }
        if (!unitName || unitName === '-') { 
          errors.push({ rowNumber, sku: code, reason: "Satuan wajib diisi. Nilai '-' hanya diperbolehkan untuk field opsional." }); 
          continue; 
        }
        
        // Process barcode: if "-", generate unique barcode
        let wasAutoGenerated = false;
        if (code === '-') {
          try {
            code = await generateUniqueBarcode(storeId);
            wasAutoGenerated = true;
            autoBarcodesGenerated++;
          } catch (error: any) {
            errors.push({ rowNumber, sku: code, reason: error.message || "Gagal generate barcode" });
            continue;
          }
        }

        setProgress(40 + Math.floor((i / rows.length) * 40)); // Progress 40 -> 80

        try {
          // Parse numeric values
          const parsedStokAwal = parseInt(stokAwal);
          const parsedStokMin = parseInt(stokMin);
          const parsedHargaModal = parseFloat(hargaModal);
          const parsedPriceRetail = parseFloat(priceRetail);
          const parsedPriceWholesale = parseFloat(priceWholesale);
          const parsedPriceSpecial = parseFloat(priceSpecial);
          const parsedMinQtyGrosir = parseInt(minQtyGrosir);
          const parsedMinQtySpesial = parseInt(minQtySpesial);
          
          // Optional fields - process "-" as NULL, don't create master data
          let brandName = normRow["Brand (atau \"-\")"]?.toString().trim();
          let variantName = normRow["Varian (atau \"-\")"]?.toString().trim();
          let specName = normRow["Spesifikasi (atau \"-\")"]?.toString().trim();
          let sizeName = normRow["Ukuran/Isi (atau \"-\")"]?.toString().trim();
          
          // Process nullable placeholders
          brandName = processNullablePlaceholder(brandName) || undefined;
          variantName = processNullablePlaceholder(variantName) || undefined;
          specName = processNullablePlaceholder(specName) || undefined;
          sizeName = processNullablePlaceholder(sizeName) || undefined;

          // Get or create master data IDs
          const catId = await getMasterId(categoryName, 'cat');
          const brandId = brandName ? await getMasterId(brandName, 'brand') : undefined;
          const mainId = await getMasterId(mainProductName, 'main');
          const varId = variantName ? await getMasterId(variantName, 'var') : undefined;
          const specId = specName ? await getMasterId(specName, 'spec') : undefined;
          const sizeId = sizeName ? await getMasterId(sizeName, 'size') : undefined;
          const unitId = await getMasterId(unitName, 'unit');

          // ═══════════════════════════════════════════════════════════════
          // IN-FILE DUPLICATE CHECK (before validator)
          // ═══════════════════════════════════════════════════════════════
          const rowErrors: string[] = [];
          
          // Check barcode duplicate within file
          const lowerCode = code.toLowerCase();
          if (seenBarcodes.has(lowerCode)) {
            rowErrors.push(`Barcode sama dengan Baris ${seenBarcodes.get(lowerCode)}`);
          } else {
            seenBarcodes.set(lowerCode, rowNumber);
            
            // Check barcode duplicate in database (using cached set)
            if (checkDuplicateBarcodeInMemory(code, existingBarcodes)) {
              rowErrors.push(`Barcode "${code}" sudah ada di database`);
            }
          }
          
          // Check product combination duplicate within file
          const combinationKey = createCombinationKey({
            brand_id: brandId,
            main_product_id: mainId!,
            variant_id: varId,
            specification_id: specId,
            size_id: sizeId,
          });
          
          if (seenCombinations.has(combinationKey)) {
            rowErrors.push(`Kombinasi master data sama dengan Baris ${seenCombinations.get(combinationKey)}`);
          } else {
            seenCombinations.set(combinationKey, rowNumber);
            
            // Check product combination duplicate in database (using cached map)
            const existingProduct = checkDuplicateProductInMemory(
              { brand_id: brandId, main_product_id: mainId!, variant_id: varId, specification_id: specId, size_id: sizeId },
              existingCombinations
            );
            
            if (existingProduct) {
              rowErrors.push(
                `Produk dengan kombinasi master data sama sudah ada: ` +
                `"${existingProduct.name}" (${existingProduct.code}), ` +
                `Stok: ${existingProduct.quantity}, ` +
                `Harga: Rp ${existingProduct.selling_price_retail.toLocaleString()}`
              );
            }
          }

          // ═══════════════════════════════════════════════════════════════
          // FIELD & BUSINESS RULE VALIDATION (without duplicate checks)
          // ═══════════════════════════════════════════════════════════════
          
          const validationPayload = {
            category_id: catId || 0,
            main_product_id: mainId || 0,
            unit_id: unitId || 0,
            brand_id: brandId,
            variant_id: varId,
            specification_id: specId,
            size_id: sizeId,
            code,
            quantity: parsedStokAwal,
            min_stock_alert: parsedStokMin,
            cost_price: parsedHargaModal,
            selling_price_retail: parsedPriceRetail,
            selling_price_wholesale: parsedPriceWholesale,
            selling_price_special: parsedPriceSpecial,
            wholesale_min_qty: parsedMinQtyGrosir,
            special_min_qty: parsedMinQtySpesial,
          };
          
          // Note: We already checked duplicates above using cached data
          // So we skip validator's duplicate checks to avoid redundant queries
          // We only need field validation and business rule validation
          
          // Import field validators directly for non-duplicate validation
          const { 
            validateRequiredFields, 
            validateNumberFields, 
            validateMasterDataIds 
          } = await import('@/lib/product/validators/fieldValidators');
          const { validateAllBusinessRules } = await import('@/lib/product/validators/businessRuleValidators');
          
          const requiredResult = validateRequiredFields(validationPayload);
          const numberResult = validateNumberFields(validationPayload);
          const masterDataResult = validateMasterDataIds(validationPayload);
          const businessRuleResult = validateAllBusinessRules(
            {
              cost_price: parsedHargaModal,
              selling_price_retail: parsedPriceRetail,
              selling_price_wholesale: parsedPriceWholesale,
              selling_price_special: parsedPriceSpecial,
            },
            {
              wholesale_min_qty: parsedMinQtyGrosir,
              special_min_qty: parsedMinQtySpesial,
            }
          );
          
          // Collect ALL validation errors
          const validationErrors = [
            ...requiredResult.errors,
            ...numberResult.errors,
            ...masterDataResult.errors,
            ...businessRuleResult.errors,
          ];
          
          validationErrors.forEach(err => {
            rowErrors.push(err.message);
          });
          
          // If there are ANY errors (duplicate or validation), add to error list
          if (rowErrors.length > 0) {
            errors.push({ 
              rowNumber, 
              sku: code, 
              reason: rowErrors.join('; ') 
            });
            continue;
          }
          
          // ═══════════════════════════════════════════════════════════════
          // ALL VALIDATION PASSED - Generate name and prepare product
          // ═══════════════════════════════════════════════════════════════

          const generatedName = generateProductName({
            brandName,
            mainProductName,
            variantName,
            specificationName: specName,
            sizeName
          });

          const productInput: CreateProductInput = {
            store_id: storeId,
            code,
            name: generatedName,
            
            // Required master data
            category_id: catId!,
            main_product_id: mainId!,
            unit_id: unitId!,
            
            // Optional master data
            brand_id: brandId,
            variant_id: varId,
            specification_id: specId,
            size_id: sizeId,
            
            // Required inventory (quantity can be negative - overselling)
            quantity: parsedStokAwal,
            min_stock_alert: parsedStokMin,
            
            // Required prices (all must be >= 0)
            cost_price: parsedHargaModal,
            selling_price_retail: parsedPriceRetail,
            selling_price_wholesale: parsedPriceWholesale,
            selling_price_special: parsedPriceSpecial,
            
            // Required min quantities (all must be >= 0)
            wholesale_min_qty: parsedMinQtyGrosir,
            special_min_qty: parsedMinQtySpesial,
          };

          validProducts.push(productInput);
        } catch (e: any) {
          errors.push({ rowNumber, sku: code, reason: e.message || "Gagal memproses master data/produk" });
        }
      }

      setProgress(90);

      if (validProducts.length > 0) {
        // Bulk insert / upsert using existing bulkCreateProducts
        // bulkCreateProducts actually performs an upsert by inserting, but Supabase standard .insert doesn't upsert unless specified.
        // Wait, bulkCreateProducts uses .insert(products).select(). Let's assume it handles what it needs.
        const result = await bulkCreateProducts(validProducts);
        
        const bulkErrors = result.errors.map(err => ({ rowNumber: "Bulk", sku: "-", reason: err }));

        setSummary({
          total: rows.length,
          success: result.success,
          failed: (rows.length - validProducts.length) + bulkErrors.length,
          errors: [...errors, ...bulkErrors],
          masterDataCreated,
          autoBarcodesGenerated,
        });

        if (result.success > 0) {
          toast.success(`Berhasil mengimport ${result.success} produk`);
          onSuccess?.();
        }
      } else {
        setSummary({
          total: rows.length,
          success: 0,
          failed: rows.length,
          errors: errors,
          masterDataCreated,
          autoBarcodesGenerated,
        });
        toast.error("Tidak ada data valid yang bisa diimport");
      }
      
      setProgress(100);

    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || "Gagal memproses file Excel");
    } finally {
      setIsProcessing(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !open && onClose()}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Import Produk via Excel</DialogTitle>
          <DialogDescription>
            Download template, isi data produk Anda, lalu upload kembali ke sistem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-900 space-y-1">
              <p className="font-semibold">Petunjuk Pengisian:</p>
              <ul className="list-disc list-inside space-y-1 ml-1 text-blue-800">
                <li>Kolom bertanda <strong className="text-red-600">*</strong> wajib diisi dan tidak boleh kosong</li>
                <li>Kolom tanpa tanda * (Brand, Varian, Spesifikasi, Ukuran/Isi) boleh dikosongkan</li>
                <li>Isi <strong>"-"</strong> pada Barcode/SKU untuk membuat kode barcode otomatis</li>
                <li>Isi <strong>"-"</strong> pada bagian opsional (Brand, Varian, Spesifikasi, Ukuran/Isi) untuk mengosongkan data</li>
                <li>Jangan isi <strong>"-"</strong> pada field wajib (Kategori, Produk Utama, Satuan, dll) karena akan ditolak sistem</li>
                <li>Baris pertama (Header) tidak boleh diubah</li>
                <li>Nama yang belum ada di daftar akan otomatis ditambahkan sebagai pilihan baru</li>
                <li>Nama produk otomatis di-generate dari gabungan master data</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-4 items-center justify-center border-2 border-dashed border-border rounded-xl p-8 bg-muted/20">
            <Button variant="outline" className="gap-2" onClick={handleDownloadTemplate} disabled={isProcessing}>
              <Download className="w-4 h-4" />
              Download Template Excel
            </Button>
            
            <div className="text-xs text-muted-foreground">atau</div>
            
            <div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
              />
              <Button className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isProcessing ? 'Memproses File...' : 'Upload File Excel'}
              </Button>
            </div>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Memproses dan Sinkronisasi Master Data...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {summary && (
            <div className="bg-muted/30 rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center bg-card">
                <h4 className="font-semibold">Hasil Import</h4>
                <div className="flex gap-4 text-sm font-medium">
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Sukses: {summary.success}
                  </span>
                  <span className="text-red-600 flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> Gagal: {summary.failed}
                  </span>
                </div>
              </div>
              
              {/* Summary Statistics */}
              <div className="p-4 bg-blue-50/50 border-b border-border">
                <p className="text-xs font-semibold text-blue-900 mb-2">Statistik Import:</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-blue-800 font-medium">Total Data: {summary.total}</p>
                    <p className="text-green-700">✓ Berhasil: {summary.success}</p>
                    <p className="text-red-700">✗ Gagal: {summary.failed}</p>
                  </div>
                  <div>
                    <p className="text-blue-800 font-medium mb-1">Master Data Baru:</p>
                    {summary.masterDataCreated.categories > 0 && <p className="text-blue-700">• Kategori: {summary.masterDataCreated.categories}</p>}
                    {summary.masterDataCreated.brands > 0 && <p className="text-blue-700">• Brand: {summary.masterDataCreated.brands}</p>}
                    {summary.masterDataCreated.mainProducts > 0 && <p className="text-blue-700">• Produk Utama: {summary.masterDataCreated.mainProducts}</p>}
                    {summary.masterDataCreated.variants > 0 && <p className="text-blue-700">• Varian: {summary.masterDataCreated.variants}</p>}
                    {summary.masterDataCreated.specifications > 0 && <p className="text-blue-700">• Spesifikasi: {summary.masterDataCreated.specifications}</p>}
                    {summary.masterDataCreated.sizes > 0 && <p className="text-blue-700">• Ukuran: {summary.masterDataCreated.sizes}</p>}
                    {summary.masterDataCreated.units > 0 && <p className="text-blue-700">• Satuan: {summary.masterDataCreated.units}</p>}
                    {summary.autoBarcodesGenerated > 0 && <p className="text-blue-700 mt-1">• Barcode Auto: {summary.autoBarcodesGenerated}</p>}
                    {Object.values(summary.masterDataCreated).every(v => v === 0) && summary.autoBarcodesGenerated === 0 && (
                      <p className="text-blue-600 italic">Tidak ada master data baru</p>
                    )}
                  </div>
                </div>
              </div>
              
              {summary.errors.length > 0 && (
                <div className="p-4 bg-red-50/50 max-h-60 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-800 mb-2">Detail Error ({summary.errors.length} baris gagal):</p>
                  <table className="w-full text-left text-xs text-red-900 border-collapse">
                    <thead>
                      <tr className="border-b border-red-200">
                        <th className="py-2 pr-2 w-16">Baris</th>
                        <th className="py-2 pr-2 w-32">SKU</th>
                        <th className="py-2">Detail Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.errors.map((err, idx) => (
                        <tr key={idx} className="border-b border-red-100 last:border-0 align-top">
                          <td className="py-2 pr-2 whitespace-nowrap">#{err.rowNumber}</td>
                          <td className="py-2 pr-2 font-mono break-all">{err.sku || "-"}</td>
                          <td className="py-2">{err.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
