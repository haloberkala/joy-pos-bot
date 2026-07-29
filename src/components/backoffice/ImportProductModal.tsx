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
import { generateProductName, generateShortName } from "@/lib/productUtils";
import { generateUniqueBarcode, processNullablePlaceholder, isAutoGeneratePlaceholder } from "@/lib/barcodeUtils";

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

        if (type === 'cat') {
          if (mapCat.has(lowerName)) return mapCat.get(lowerName);
          const item = await getOrCreateCategory(cleanName, storeId);
          mapCat.set(lowerName, item.id);
          return item.id;
        } else if (type === 'brand') {
          if (mapBrand.has(lowerName)) return mapBrand.get(lowerName);
          const item = await getOrCreateBrand(cleanName, storeId);
          mapBrand.set(lowerName, item.id);
          return item.id;
        } else if (type === 'unit') {
          if (mapUnit.has(lowerName)) return mapUnit.get(lowerName);
          const item = await getOrCreateUnit(cleanName, storeId);
          mapUnit.set(lowerName, item.id);
          return item.id;
        } else if (type === 'main') {
          if (mapMain.has(lowerName)) return mapMain.get(lowerName);
          const item = await getOrCreateMainProduct(cleanName, storeId);
          mapMain.set(lowerName, item.id);
          return item.id;
        } else if (type === 'var') {
          if (mapVar.has(lowerName)) return mapVar.get(lowerName);
          const item = await getOrCreateVariant(cleanName, storeId);
          mapVar.set(lowerName, item.id);
          return item.id;
        } else if (type === 'spec') {
          if (mapSpec.has(lowerName)) return mapSpec.get(lowerName);
          const item = await getOrCreateSpecification(cleanName, storeId);
          mapSpec.set(lowerName, item.id);
          return item.id;
        } else if (type === 'size') {
          if (mapSize.has(lowerName)) return mapSize.get(lowerName);
          const item = await getOrCreateSize(cleanName, storeId);
          mapSize.set(lowerName, item.id);
          return item.id;
        }
        return undefined;
      };

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
        const priceRetail = parseFloat(normRow["Harga Jual Eceran *"]);
        const priceWholesale = parseFloat(normRow["Harga Jual Grosir *"]);
        const minQtyGrosir = normRow["Min. Qty Grosir *"];
        const priceSpecial = parseFloat(normRow["Harga Jual Spesial *"]);
        const minQtySpesial = normRow["Min. Qty Spesial *"];

        // Validate required fields - reject "-" in required fields (except barcode)
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
        if (code === '-') {
          code = await generateUniqueBarcode(storeId);
        }
        
        // Stok Awal: required but CAN BE NEGATIVE (overselling allowed)
        if (stokAwal === undefined || stokAwal === null || stokAwal === "") { 
          errors.push({ rowNumber, sku: code, reason: "Stok Awal wajib diisi." }); 
          continue; 
        }
        const parsedStokAwal = parseInt(stokAwal);
        if (isNaN(parsedStokAwal)) {
          errors.push({ rowNumber, sku: code, reason: "Stok Awal harus berupa angka." }); 
          continue;
        }
        
        // Stok Minimum: required and must be >= 0
        if (stokMin === undefined || stokMin === null || stokMin === "") { 
          errors.push({ rowNumber, sku: code, reason: "Stok Minimum wajib diisi." }); 
          continue; 
        }
        const parsedStokMin = parseInt(stokMin);
        if (isNaN(parsedStokMin) || parsedStokMin < 0) {
          errors.push({ rowNumber, sku: code, reason: "Stok Minimum harus berupa angka >= 0." }); 
          continue;
        }
        
        // Harga Modal: required and must be >= 0
        if (!hargaModal || parseFloat(hargaModal) < 0) { 
          errors.push({ rowNumber, sku: code, reason: "Harga Modal wajib diisi dan tidak boleh negatif." }); 
          continue; 
        }
        
        // Prices: all required and must be >= 0
        if (isNaN(priceRetail) || priceRetail < 0) { 
          errors.push({ rowNumber, sku: code, reason: "Harga Jual Eceran wajib diisi dan tidak boleh negatif." }); 
          continue; 
        }
        if (isNaN(priceWholesale) || priceWholesale < 0) { 
          errors.push({ rowNumber, sku: code, reason: "Harga Jual Grosir wajib diisi dan tidak boleh negatif." }); 
          continue; 
        }
        if (isNaN(priceSpecial) || priceSpecial < 0) { 
          errors.push({ rowNumber, sku: code, reason: "Harga Jual Spesial wajib diisi dan tidak boleh negatif." }); 
          continue; 
        }
        
        // Min Quantities: all required and must be >= 0
        if (minQtyGrosir === undefined || minQtyGrosir === null || minQtyGrosir === "") { 
          errors.push({ rowNumber, sku: code, reason: "Min. Qty Grosir wajib diisi." }); 
          continue; 
        }
        const parsedMinQtyGrosir = parseInt(minQtyGrosir);
        if (isNaN(parsedMinQtyGrosir) || parsedMinQtyGrosir < 0) {
          errors.push({ rowNumber, sku: code, reason: "Min. Qty Grosir harus berupa angka >= 0." }); 
          continue;
        }
        
        if (minQtySpesial === undefined || minQtySpesial === null || minQtySpesial === "") { 
          errors.push({ rowNumber, sku: code, reason: "Min. Qty Spesial wajib diisi." }); 
          continue; 
        }
        const parsedMinQtySpesial = parseInt(minQtySpesial);
        if (isNaN(parsedMinQtySpesial) || parsedMinQtySpesial < 0) {
          errors.push({ rowNumber, sku: code, reason: "Min. Qty Spesial harus berupa angka >= 0." }); 
          continue;
        }

        setProgress(40 + Math.floor((i / rows.length) * 40)); // Progress 40 -> 80

        try {
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

          const catId = await getMasterId(categoryName, 'cat');
          const brandId = brandName ? await getMasterId(brandName, 'brand') : undefined;
          const mainId = await getMasterId(mainProductName, 'main');
          const varId = variantName ? await getMasterId(variantName, 'var') : undefined;
          const specId = specName ? await getMasterId(specName, 'spec') : undefined;
          const sizeId = sizeName ? await getMasterId(sizeName, 'size') : undefined;
          const unitId = await getMasterId(unitName, 'unit');

          const generatedName = generateProductName({
            brandName,
            mainProductName,
            variantName,
            specificationName: specName,
            sizeName
          });

          const shortName = generateShortName(generatedName);

          const productInput: CreateProductInput = {
            store_id: storeId,
            code,
            name: generatedName,
            short_name: shortName,
            
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
            cost_price: parseFloat(hargaModal),
            selling_price_retail: priceRetail,
            selling_price_wholesale: priceWholesale,
            selling_price_special: priceSpecial,
            
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
          errors: [...errors, ...bulkErrors]
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
          errors: errors
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
