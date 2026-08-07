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
import { Download, Loader2, Search, SearchX } from 'lucide-react';
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
  const [selectedIds, setSelectedIds]   = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery]   = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // ── Filtered list (useMemo for performance with large catalogs) ────────────
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
  const selectedCount = selectedIds.size;
  const totalPages    = Math.ceil(selectedCount / 2);

  // "Select All" is scoped to the current filtered list
  const filteredIds       = useMemo(() => new Set(filteredProducts.map((p) => p.id)), [filteredProducts]);
  const isAllFilteredSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds.has(p.id));

  // ── Handlers ───────────────────────────────────────────────────────────────

  /** Toggle all within the currently visible (filtered) list only. */
  const handleToggleAll = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const handleToggleProduct = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const handleDownload = async () => {
    if (selectedCount === 0) { toast.error('Pilih minimal 1 produk'); return; }

    setIsGenerating(true);
    try {
      // Preserve original order from the products prop
      const selected = products.filter((p) => selectedIds.has(p.id));
      generateRollLabelPDF(selected, 'tsc-te300', 'barcode-te300.pdf');
      toast.success(`PDF berhasil dibuat · ${selectedCount} label · ${totalPages} halaman`);
      setTimeout(() => {
        onClose();
        setSelectedIds(new Set());
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
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">

        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>Download Barcode Label</DialogTitle>
          <p className="text-xs text-muted-foreground">
            TSC TE300 · 110 × 30 mm · 2 label per halaman
          </p>
        </DialogHeader>

        {/* Search bar */}
        <div className="px-6 pb-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama produk atau kode..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Select All */}
        <div className="px-6 py-2 border-y shrink-0">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={isAllFilteredSelected}
              onCheckedChange={(v) => handleToggleAll(!!v)}
            />
            <Label htmlFor="select-all" className="font-semibold cursor-pointer text-sm">
              {searchQuery.trim()
                ? `Pilih semua hasil "${searchQuery.trim()}"`
                : 'Pilih Semua'}
            </Label>
          </div>
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto px-6 py-2 min-h-0">
          {filteredProducts.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <SearchX className="w-8 h-8 opacity-40" />
              <p className="text-sm">Tidak ada produk ditemukan.</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleToggleProduct(product.id, !selectedIds.has(product.id))}
                >
                  <Checkbox
                    id={`product-${product.id}`}
                    checked={selectedIds.has(product.id)}
                    onCheckedChange={(v) => handleToggleProduct(product.id, !!v)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Label
                    htmlFor={`product-${product.id}`}
                    className="flex-1 cursor-pointer text-sm select-none"
                    onClick={(e) => e.preventDefault()} /* row click handles it */
                  >
                    <span className="font-medium">{product.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {product.code}
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary + Download */}
        <div className="px-6 pt-3 pb-5 border-t shrink-0 space-y-3">
          {/* Counter – always shows total selected, not filtered count */}
          <div className="text-sm text-muted-foreground">
            {selectedCount > 0 ? (
              <>
                <span className="font-semibold text-foreground">{selectedCount}</span> produk dipilih ·{' '}
                <span className="font-semibold text-foreground">{totalPages}</span> halaman PDF
                {selectedCount % 2 !== 0 && (
                  <span className="block text-xs mt-0.5">
                    Halaman terakhir: 1 label (kanan kosong)
                  </span>
                )}
              </>
            ) : (
              'Belum ada produk dipilih'
            )}
          </div>

          <Button
            onClick={handleDownload}
            disabled={selectedCount === 0 || isGenerating}
            className="w-full gap-2"
          >
            {isGenerating
              ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
              : <><Download className="w-4 h-4" />Download PDF · TSC TE300</>}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
