import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ClipboardCheck, Download, Loader2 } from 'lucide-react';
import {
  getStockOpnameWithItems,
  StockOpname,
  StockOpnameItem,
} from '@/services/stockOpnameService';
import { getProductsByStore, Product } from '@/services/productsService';
import { formatDate } from '@/lib/format';
import { toast } from 'sonner';

interface StockOpnameViewModalProps {
  opname: StockOpname | null;
  storeId: number;
  onClose: () => void;
}

interface EnrichedItem extends StockOpnameItem {
  productName: string;
  productCode: string;
}

export function StockOpnameViewModal({
  opname,
  storeId,
  onClose,
}: StockOpnameViewModalProps) {
  const [items, setItems] = useState<EnrichedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!opname) return;
    loadDetail();
  }, [opname]);

  const loadDetail = async () => {
    if (!opname) return;
    try {
      setIsLoading(true);
      const [{ items: rawItems }, products] = await Promise.all([
        getStockOpnameWithItems(opname.id),
        getProductsByStore(storeId),
      ]);

      const productMap = new Map<number, Product>(
        products.map((p) => [p.id, p])
      );

      const enriched: EnrichedItem[] = rawItems.map((item) => ({
        ...item,
        productName: productMap.get(item.product_id)?.name ?? `Produk #${item.product_id}`,
        productCode: productMap.get(item.product_id)?.code ?? '-',
      }));

      setItems(enriched);
    } catch (error) {
      console.error('Error loading opname detail:', error);
      toast.error('Gagal memuat detail stock opname');
    } finally {
      setIsLoading(false);
    }
  };

  const discrepancies = items.filter((i) => i.difference !== 0);
  const totalItems = items.length;

  const handleExport = () => {
    if (!opname) return;
    import('jspdf').then(async ({ jsPDF }) => {
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text('Laporan Stock Opname', 14, 18);
      doc.setFontSize(10);
      doc.text(`No. Opname : ${opname.opname_number}`, 14, 28);
      doc.text(`Tanggal    : ${formatDate(new Date(opname.opname_date))}`, 14, 34);
      if (opname.note) doc.text(`Catatan    : ${opname.note}`, 14, 40);

      const startY = opname.note ? 48 : 42;

      autoTable(doc, {
        startY,
        head: [['#', 'Produk', 'Kode', 'Stok Sistem', 'Stok Aktual', 'Selisih', 'Catatan']],
        body: items.map((item, idx) => [
          idx + 1,
          item.productName,
          item.productCode,
          item.system_stock,
          item.physical_stock,
          item.difference > 0 ? `+${item.difference}` : item.difference,
          item.note || '-',
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [99, 60, 220] },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 5) {
            const val = Number(data.cell.raw);
            if (val < 0) data.cell.styles.textColor = [220, 38, 38];
            else if (val > 0) data.cell.styles.textColor = [22, 163, 74];
          }
        },
      });

      doc.save(`${opname.opname_number}.pdf`);
      toast.success('PDF berhasil diunduh');
    });
  };

  return (
    <Dialog open={!!opname} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            Detail Stock Opname
          </DialogTitle>
        </DialogHeader>

        {opname && (
          <>
            {/* Meta info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm border border-border rounded-lg p-4 bg-muted/40">
              <div>
                <p className="text-muted-foreground text-xs">No. Opname</p>
                <p className="font-semibold">{opname.opname_number}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Tanggal</p>
                <p className="font-semibold">{formatDate(new Date(opname.opname_date))}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <Badge variant={opname.status === 'completed' ? 'default' : 'secondary'}>
                  {opname.status === 'completed' ? 'Selesai' : 'Draft'}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total Produk</p>
                <p className="font-semibold">{totalItems} produk</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Selisih</p>
                <p className={`font-semibold ${discrepancies.length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {discrepancies.length} produk
                </p>
              </div>
              {opname.note && (
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-muted-foreground text-xs">Catatan</p>
                  <p className="font-medium">{opname.note}</p>
                </div>
              )}
            </div>

            {/* Action */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleExport}
                disabled={isLoading || items.length === 0}
              >
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
            </div>

            {/* Table */}
            <div className="overflow-y-auto flex-1 rounded-xl border border-border">
              {isLoading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Memuat detail...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Produk</TableHead>
                      <TableHead>Kode</TableHead>
                      <TableHead className="text-right">Stok Sistem</TableHead>
                      <TableHead className="text-right">Stok Aktual</TableHead>
                      <TableHead className="text-right">Selisih</TableHead>
                      <TableHead>Catatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow
                        key={item.id}
                        className={
                          item.difference !== 0
                            ? 'bg-orange-50/60 dark:bg-orange-950/10'
                            : ''
                        }
                      >
                        <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{item.productCode}</TableCell>
                        <TableCell className="text-right font-semibold">{item.system_stock}</TableCell>
                        <TableCell className="text-right font-semibold">{item.physical_stock}</TableCell>
                        <TableCell className="text-right">
                          {item.difference !== 0 ? (
                            <Badge
                              variant={item.difference > 0 ? 'default' : 'destructive'}
                              className="gap-1"
                            >
                              {item.difference > 0 && '+'}
                              {item.difference}
                              <AlertTriangle className="w-3 h-3" />
                            </Badge>
                          ) : (
                            <Badge variant="outline">0</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.note || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Tidak ada item ditemukan
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
