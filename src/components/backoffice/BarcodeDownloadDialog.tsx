/**
 * BarcodeDownloadDialog
 *
 * Download barcode label PDF for TSC TE300.
 * Format: 110 × 30 mm · 2 labels per page
 * Print:  Scale 100% · Margins None · 1 page per sheet
 */

import { useState } from 'react';
import { Product } from '@/services/productsService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button }   from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label }    from '@/components/ui/label';
import { Download, Loader2 } from 'lucide-react';
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedCount = selectedIds.size;
  const totalPages    = Math.ceil(selectedCount / 2);
  const isAllSelected = selectedCount === products.length && products.length > 0;

  const handleToggleAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(products.map((p) => p.id)) : new Set());
  };

  const handleToggleProduct = (id: number, checked: boolean) => {
    const next = new Set(selectedIds);
    checked ? next.add(id) : next.delete(id);
    setSelectedIds(next);
  };

  const handleDownload = async () => {
    if (selectedCount === 0) { toast.error('Pilih minimal 1 produk'); return; }

    setIsGenerating(true);
    try {
      const selected = products.filter((p) => selectedIds.has(p.id));
      generateRollLabelPDF(selected, 'tsc-te300', 'barcode-te300.pdf');
      toast.success(`PDF berhasil dibuat · ${selectedCount} label · ${totalPages} halaman`);
      setTimeout(() => { onClose(); setSelectedIds(new Set()); }, 500);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Gagal generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Download Barcode Label</DialogTitle>
          <p className="text-sm text-muted-foreground">
            TSC TE300 · 110 × 30 mm · 2 label per halaman
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {/* Select All */}
          <div className="flex items-center gap-2 pb-3 border-b">
            <Checkbox id="select-all" checked={isAllSelected}
              onCheckedChange={(v) => handleToggleAll(!!v)} />
            <Label htmlFor="select-all" className="font-semibold cursor-pointer">
              Pilih Semua
            </Label>
          </div>

          {/* Product list */}
          <div className="space-y-1 max-h-[340px] overflow-y-auto">
            {products.map((product) => (
              <div key={product.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                <Checkbox
                  id={`product-${product.id}`}
                  checked={selectedIds.has(product.id)}
                  onCheckedChange={(v) => handleToggleProduct(product.id, !!v)}
                />
                <Label htmlFor={`product-${product.id}`}
                  className="flex-1 cursor-pointer text-sm">
                  <span className="font-medium">{product.name}</span>
                  <span className="text-muted-foreground ml-2">({product.code})</span>
                </Label>
              </div>
            ))}
          </div>

          {/* Summary */}
          {selectedCount > 0 && (
            <div className="py-2 px-3 rounded-lg bg-muted/50 text-sm">
              <p>
                <span className="font-semibold">{selectedCount}</span> produk ·{' '}
                <span className="font-semibold">{totalPages}</span> halaman PDF
              </p>
              {selectedCount % 2 !== 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Halaman terakhir: 1 label (kanan kosong)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Download */}
        <div className="pt-4 border-t shrink-0">
          <Button onClick={handleDownload}
            disabled={selectedCount === 0 || isGenerating}
            className="w-full gap-2">
            {isGenerating
              ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
              : <><Download className="w-4 h-4" />Download PDF · TSC TE300</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
