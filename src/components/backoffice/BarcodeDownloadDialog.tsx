/**
 * BarcodeDownloadDialog
 *
 * Download barcode label PDF for TSC TE300.
 * Format: 110 × 30 mm · 2 labels per page
 * Print:  Scale 100% · Margins None · 1 page per sheet
 */

import { useMemo, useState } from 'react';
import { Product } from '@/services/productsService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button }   from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { AlertCircle, Download, Loader2, Minus, Plus, Search, SearchX, X } from 'lucide-react';
import { toast } from 'sonner';
import { generateRollLabelPDF } from '@/lib/barcode/rollLabelPdf';

interface BarcodeDownloadDialogProps {
  isOpen:   boolean;
  onClose:  () => void;
  products: Product[];
}

export function BarcodeDownloadDialog({
  isOpen,
  onClose,
  products,
}: BarcodeDownloadDialogProps) {
  const [quantities, setQuantities]     = useState<Map<number, number>>(new Map());
  const [searchQuery, setSearchQuery]   = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q),
    );
  }, [products, searchQuery]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const selectedCount = quantities.size;
  const totalLabels = useMemo(() => {
    let sum = 0;
    quantities.forEach(qty => sum += qty);
    return sum;
  }, [quantities]);
  const totalPages = Math.ceil(totalLabels / 2);
  const emptySlots = totalPages * 2 - totalLabels;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleToggleProduct = (id: number, checked: boolean) => {
    setQuantities((prev) => {
      const next = new Map(prev);
      if (checked) {
        next.set(id, 1);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleQuantityChange = (id: number, delta: number) => {
    setQuantities((prev) => {
      const next = new Map(prev);
      const current = next.get(id) || 0;
      const newQty = Math.max(1, current + delta);
      next.set(id, newQty);
      return next;
    });
  };

  const handleDownload = async () => {
    if (selectedCount === 0) { toast.error('Pilih minimal 1 produk'); return; }

    setIsGenerating(true);
    try {
      // Expand products by quantity
      const expanded: Product[] = [];
      products.forEach((p) => {
        const qty = quantities.get(p.id);
        if (qty) {
          for (let i = 0; i < qty; i++) {
            expanded.push(p);
          }
        }
      });

      // Always add empty labels if needed (auto-fill is always ON)
      if (emptySlots > 0) {
        const emptyProduct: Product = {
          id: -1,
          code: '',
          name: '',
          selling_price_retail: 0,
          selling_price_grosir: 0,
          buying_price: 0,
          stock: 0,
          store_id: 0,
          category_id: null,
          brand_id: null,
          is_active: true,
          created_at: '',
          updated_at: '',
        };
        for (let i = 0; i < emptySlots; i++) {
          expanded.push(emptyProduct);
        }
      }

      generateRollLabelPDF(expanded, 'tsc-te300', 'barcode-te300.pdf');
      toast.success(`PDF berhasil dibuat · ${totalLabels} label · ${totalPages} halaman`);
      setTimeout(() => {
        onClose();
        setQuantities(new Map());
        setSearchQuery('');
      }, 500);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Gagal generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[600px] flex flex-col gap-0 p-0">

        {/* Header */}
        <div className="px-6 py-4 border-b shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle>Download Barcode Label</DialogTitle>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="flex-1 flex min-h-0">
          
          {/* LEFT: Product Catalog */}
          <div className="flex-1 flex flex-col border-r min-w-0">
            {/* Search */}
            <div className="px-4 py-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari produk..."
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <SearchX className="w-10 h-10 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Tidak ada produk ditemukan</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredProducts.map((product) => {
                    const qty = quantities.get(product.id) || 0;
                    const isSelected = qty > 0;
                    
                    return (
                      <div
                        key={product.id}
                        className={`px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => handleToggleProduct(product.id, !isSelected)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(v) => handleToggleProduct(product.id, !!v)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.code}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Print Queue & Summary */}
          <div className="w-[380px] flex flex-col shrink-0">
            
            {/* Print Queue */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-4 py-3 border-b">
                <h3 className="text-sm font-semibold">Print Queue</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedCount === 0 ? 'Pilih produk untuk mulai' : `${selectedCount} produk dipilih`}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto">
                {selectedCount === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                      <Download className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Belum ada produk dipilih</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {Array.from(quantities.entries()).map(([productId, qty]) => {
                      const product = products.find(p => p.id === productId);
                      if (!product) return null;
                      
                      return (
                        <div key={productId} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.code}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => handleToggleProduct(productId, false)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Jumlah</span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleQuantityChange(productId, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-semibold w-8 text-center tabular-nums">
                                {qty}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleQuantityChange(productId, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Summary & Actions */}
            <div className="border-t bg-muted/20">
              {/* Summary */}
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Label</span>
                  <span className="font-semibold tabular-nums">{totalLabels}</span>
                </div>
              </div>

              {/* Warning */}
              {emptySlots > 0 && selectedCount > 0 && (
                <div className="px-4 pb-3">
                  <div className="bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-900 leading-snug">
                      <span className="font-medium">Label ganjil.</span> Halaman terakhir akan memiliki 1 slot kosong.
                    </p>
                  </div>
                </div>
              )}

              {/* Download Button */}
              <div className="px-4 pb-4">
                <Button
                  onClick={handleDownload}
                  disabled={selectedCount === 0 || isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
