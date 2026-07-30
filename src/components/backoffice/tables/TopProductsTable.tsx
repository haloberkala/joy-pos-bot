import { useMemo, useEffect, useState } from 'react';
import { Sale } from '@/types/pos';
import { getSaleItemsBySaleIds } from '@/services/salesService';
import { formatCurrency } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TopProductsTableProps {
  sales: Sale[];
  storeId: number;
  limit?: number;
}

interface ProductSales {
  productId: number | null;
  productName: string;
  quantitySold: number;
  totalRevenue: number;
  avgPrice: number;
}

export function TopProductsTable({ sales, storeId, limit = 10 }: TopProductsTableProps) {
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSaleItems();
  }, [sales]);

  const loadSaleItems = async () => {
    try {
      setIsLoading(true);
      const saleIds = sales.map(s => s.id);
      if (saleIds.length === 0) {
        setSaleItems([]);
        return;
      }
      const items = await getSaleItemsBySaleIds(saleIds);
      setSaleItems(items);
    } catch (error) {
      console.error('Error loading sale items:', error);
      setSaleItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const productSales = useMemo(() => {
    const salesMap: Record<string, ProductSales> = {};

    saleItems.forEach(item => {
      const key = item.product_id ? `prod-${item.product_id}` : `service-${item.product_name}`;
      
      // Use product.name from JOIN if available, fallback to product_name
      const displayName = item.product?.name ?? item.product_name;
      
      if (!salesMap[key]) {
        salesMap[key] = {
          productId: item.product_id,
          productName: displayName,
          quantitySold: 0,
          totalRevenue: 0,
          avgPrice: item.price_per_unit,
        };
      }
      salesMap[key].quantitySold += item.quantity;
      salesMap[key].totalRevenue += item.total_price;
    });

    return Object.values(salesMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);
  }, [saleItems, limit]);

  const maxRevenue = productSales[0]?.totalRevenue || 1;

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">Produk Terlaris</h3>
            <p className="text-sm text-muted-foreground">Memuat data...</p>
          </div>
        </div>
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Produk Terlaris</h3>
          <p className="text-sm text-muted-foreground">Top {limit} produk berdasarkan pendapatan</p>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead className="text-right">Qty Terjual</TableHead>
              <TableHead className="text-right">Total Pendapatan</TableHead>
              <TableHead className="w-[150px]">Performa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productSales.map((product, index) => {
              const performancePercent = (product.totalRevenue / maxRevenue) * 100;
              return (
                <TableRow key={`${product.productId}-${index}`}>
                  <TableCell>
                    <Badge variant={index < 3 ? "default" : "secondary"} className="w-6 h-6 flex items-center justify-center p-0">
                      {index + 1}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{product.productName}</p>
                      <p className="text-xs text-muted-foreground">@ {formatCurrency(product.avgPrice)}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{product.quantitySold}</TableCell>
                  <TableCell className="text-right font-medium text-primary">{formatCurrency(product.totalRevenue)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${performancePercent}%` }} />
                      </div>
                      {index === 0 && <TrendingUp className="w-4 h-4 text-green-500" />}
                      {index === productSales.length - 1 && productSales.length > 1 && <TrendingDown className="w-4 h-4 text-orange-500" />}
                      {index > 0 && index < productSales.length - 1 && <Minus className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {productSales.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Tidak ada data penjualan</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
