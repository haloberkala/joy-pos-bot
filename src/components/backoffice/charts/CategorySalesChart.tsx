import { useMemo, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Sale } from '@/types/pos';
import { getSaleItemsBySaleIds } from '@/services/salesService';
import { getAllCategories } from '@/services/categoriesService';
import { getProductsByStore } from '@/services/productsService';
import { formatCurrency } from '@/lib/format';

interface CategorySalesChartProps {
  sales: Sale[];
  storeId: number;
}

const BAR_COLORS = [
  'hsl(160,64%,45%)',
  'hsl(245,100%,67%)',
  'hsl(200,70%,50%)',
  'hsl(35,90%,55%)',
  'hsl(340,70%,55%)',
  'hsl(280,60%,55%)',
  'hsl(45,80%,55%)',
  'hsl(15,80%,55%)',
];

export function CategorySalesChart({ sales, storeId }: CategorySalesChartProps) {
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [sales, storeId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // Fix: pass storeId to getAllCategories
      const [categoriesData, productsData] = await Promise.all([
        getAllCategories(storeId),
        getProductsByStore(storeId),
      ]);
      setCategories(categoriesData);
      setProducts(productsData);

      const saleIds = sales.map((s) => s.id);
      if (saleIds.length === 0) { setSaleItems([]); return; }
      const items = await getSaleItemsBySaleIds(saleIds);
      setSaleItems(items);
    } catch (error) {
      console.error('Error loading category sales:', error);
      setSaleItems([]); setCategories([]); setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = useMemo(() => {
    if (saleItems.length === 0) return [];
    const byCategory: Record<number | string, { name: string; value: number }> = {};

    saleItems.forEach((item) => {
      // Use product_id for matching (more reliable than name matching)
      let catId: number | null = null;
      
      if (item.product_id) {
        const product = products.find((p) => p.id === item.product_id);
        catId = product?.category_id ?? null;
      }
      
      // Fallback to name matching for legacy data without product_id
      if (!catId && !item.product_id) {
        const product = products.find((p) => p.code === item.product_code || p.name === item.product_name);
        catId = product?.category_id ?? null;
      }
      
      const category = categories.find((c) => c.id === catId);
      const key = catId || 'none';
      if (!byCategory[key]) byCategory[key] = { name: category?.name || 'Tanpa Kategori', value: 0 };
      byCategory[key].value += item.total_price;
    });

    return Object.values(byCategory).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [saleItems, products, categories]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground">Memuat data...</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <div className="flex items-end gap-2 h-24 opacity-20">
          {[50, 80, 65, 90, 40, 70, 55].map((h, i) => (
            <div key={i} className="w-6 rounded-t" style={{ height: `${h}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Belum ada data penjualan per kategori</p>
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
            axisLine={false} tickLine={false} width={90}
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
