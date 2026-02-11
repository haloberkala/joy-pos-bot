import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Sale, SaleDetail } from '@/types/pos';
import { categories, sampleSaleDetails, getProduct } from '@/data/sampleData';
import { formatCurrency } from '@/lib/format';
import { Card } from '@/components/ui/card';

interface CategorySalesChartProps {
  sales: Sale[];
}

const COLORS = [
  'hsl(158, 64%, 52%)',
  'hsl(200, 70%, 50%)',
  'hsl(280, 60%, 55%)',
  'hsl(35, 90%, 55%)',
  'hsl(340, 70%, 55%)',
  'hsl(160, 50%, 40%)',
  'hsl(220, 60%, 50%)',
  'hsl(45, 80%, 55%)',
];

export function CategorySalesChart({ sales }: CategorySalesChartProps) {
  const chartData = useMemo(() => {
    const salesByCategory: Record<number, number> = {};
    const saleIds = new Set(sales.map(s => s.id));

    sampleSaleDetails
      .filter(d => saleIds.has(d.sale_id))
      .forEach(d => {
        const product = getProduct(d.product_id);
        if (product?.category_id) {
          salesByCategory[product.category_id] = (salesByCategory[product.category_id] || 0) + d.total_price;
        }
      });

    return Object.entries(salesByCategory)
      .map(([catId, total]) => {
        const category = categories.find(c => c.id === Number(catId));
        return {
          name: category?.name || String(catId),
          value: total,
          icon: category?.icon || '📦',
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [sales]);

  const totalSales = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">Penjualan per Kategori</h3>
        <p className="text-sm text-muted-foreground">Total: {formatCurrency(totalSales)}</p>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
              formatter={(value: number) => [formatCurrency(value), 'Penjualan']}
            />
            <Legend layout="vertical" align="right" verticalAlign="middle" formatter={(value) => <span className="text-sm text-foreground">{value}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
