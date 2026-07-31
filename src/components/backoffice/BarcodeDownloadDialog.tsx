/**
 * Barcode Download Dialog
 * 
 * Professional barcode label download for roll label printers.
 * Features:
 * - Product selection (individual + select all)
 * - Real-time count display
 * - Label size selection: 40×30mm, 50×30mm, 58mm, 80mm
 * - One label per page (compatible with Thermal Transfer & Direct Thermal)
 */

import { useState } from 'react';
import { Product } from '@/services/productsService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateRollLabelPDF, LabelSize } from '@/lib/barcode/rollLabelPdf';

interface BarcodeDownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export function BarcodeDownloadDialog({
  isOpen,
  onClose,
  products,
}: BarcodeDownloadDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [labelSize, setLabelSize] = useState<LabelSize>('58mm');
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedCount = selectedIds.size;
  const isAllSelected = selectedCount === products.length && products.length > 0;

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(products.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleProduct = (productId: number, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedIds(newSelected);
  };

  const handleDownload = async () => {
    if (selectedCount === 0) {
      toast.error('Pilih minimal 1 produk');
      return;
    }

    setIsGenerating(true);

    try {
      // Filter selected products
      const selectedProducts = products.filter((p) =>
        selectedIds.has(p.id)
      );

      // Generate PDF
      generateRollLabelPDF(
        selectedProducts,
        labelSize,
        `barcode-label-${labelSize}.pdf`
      );
      
      toast.success(`PDF Label ${labelSize} berhasil di-download`);

      // Close dialog after successful download
      setTimeout(() => {
        onClose();
        setSelectedIds(new Set()); // Reset selection
      }, 500);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Gagal generate PDF barcode');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Download Barcode Label</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Select All */}
          <div className="flex items-center gap-2 pb-3 border-b">
            <Checkbox
              id="select-all"
              checked={isAllSelected}
              onCheckedChange={handleToggleAll}
            />
            <Label htmlFor="select-all" className="font-semibold cursor-pointer">
              Pilih Semua
            </Label>
          </div>

          {/* Product List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50"
              >
                <Checkbox
                  id={`product-${product.id}`}
                  checked={selectedIds.has(product.id)}
                  onCheckedChange={(checked) =>
                    handleToggleProduct(product.id, checked as boolean)
                  }
                />
                <Label
                  htmlFor={`product-${product.id}`}
                  className="flex-1 cursor-pointer text-sm"
                >
                  <span className="font-medium">{product.name}</span>
                  <span className="text-muted-foreground ml-2">
                    ({product.code})
                  </span>
                </Label>
              </div>
            ))}
          </div>

          {/* Selected Count */}
          <div className="py-3 border-y">
            <p className="text-sm font-semibold">
              Dipilih: {selectedCount} Produk
            </p>
          </div>

          {/* Label Size Selection */}
          <div className="space-y-3">
            <Label className="font-semibold">Ukuran Label</Label>
            <RadioGroup
              value={labelSize}
              onValueChange={(value) => setLabelSize(value as LabelSize)}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="40x30mm" id="size-40x30" />
                <Label htmlFor="size-40x30" className="cursor-pointer">
                  40 × 30 mm
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="50x30mm" id="size-50x30" />
                <Label htmlFor="size-50x30" className="cursor-pointer">
                  50 × 30 mm
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="58mm" id="size-58" />
                <Label htmlFor="size-58" className="cursor-pointer">
                  58 mm
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="80mm" id="size-80" />
                <Label htmlFor="size-80" className="cursor-pointer">
                  80 mm
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Download Button */}
        <div className="pt-4 border-t">
          <Button
            onClick={handleDownload}
            disabled={selectedCount === 0 || isGenerating}
            className="w-full gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
