import { useMemo, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Sale } from '@/types/pos';
import { getSaleItemsBySaleIds } from '@/services/salesService';
import { getAllBrands } from '@/services/brandsService';
import { getProductsByStore } from '@/services/productsService';
import { formatCurrency } from '@/lib/format';

interface BrandSalesChartProps {
  sales: Sale[];
  storeId: number;
}

const BAR_COLORS = [
  'hsl(245,100%,67%)',
  'hsl(200,70%,50%)',
  'hsl(160,64%,45%)',
  'hsl(35,90%,55%)',
  'hsl(340,70%,55%)',
  'hsl(280,60%,55%)',
  'hsl(45,80%,55%)',
  'hsl(15,80%,55%)',
];

export function BrandSalesChart({ sales, storeId }: BrandSalesChartProps) {
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [sales, storeId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [brandsData, productsData] = await Promise.all([
        getAllBrands(storeId),
        getProductsByStore(storeId),
      ]);
      setBrands(brandsData);
      setProducts(productsData);

      const saleIds = sales.map((s) => s.id);
      if (saleIds.length === 0) { setSaleItems([]); return; }
      const items = await getSaleItemsBySaleIds(saleIds);
      setSaleItems(items);
    } catch (err) {
      console.error('Error loading brand sales:', err);
      setSaleItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = useMemo(() => {
    if (saleItems.length === 0 || products.length === 0) return [];
    const byBrand: Record<number | string, { name: string; value: number }> = {};

    saleItems.forEach((item) => {
      const product = products.find((p) => p.code === item.product_code || p.name === item.product_name);
      const brandId = product?.brand_id ?? 0;
      const brand = brands.find((b) => b.id === brandId);
      const key = brandId || 'none';
      if (!byBrand[key]) byBrand[key] = { name: brand?.name || 'Tanpa Brand', value: 0 };
      byBrand[key].value += item.total_price;
    });

    return Object.values(byBrand).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [saleItems, products, brands]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground">Memuat data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        {/* Elegant placeholder bar chart skeleton */}
        <div className="flex items-end gap-2 h-24 opacity-20">
          {[60, 90, 45, 75, 55, 80].map((h, i) => (
            <div key={i} className="w-6 rounded-t bg-primary" style={{ height: `${h}%` }} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Belum ada data penjualan per brand</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
          <XAxis
            type="number"
            tickFormatter={(v) => formatCurrency(v).replace('Rp', '').trim()}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            type="category" dataKey="name"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false} tickLine={false} width={80}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }}
            formatter={(value: number) => [formatCurrency(value), 'Penjualan']}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
