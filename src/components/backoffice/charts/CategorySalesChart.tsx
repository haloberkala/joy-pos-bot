import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Transaction } from '@/types/pos';
import { categories } from '@/data/sampleData';
import { formatCurrency } from '@/lib/format';
import { Card } from '@/components/ui/card';

interface CategorySalesChartProps {
  transactions: Transaction[];
}

const COLORS = [
  'hsl(158, 64%, 52%)', // Primary mint
  'hsl(200, 70%, 50%)', // Blue
  'hsl(280, 60%, 55%)', // Purple
  'hsl(35, 90%, 55%)',  // Orange
  'hsl(340, 70%, 55%)', // Pink
  'hsl(160, 50%, 40%)', // Darker mint
  'hsl(220, 60%, 50%)', // Indigo
  'hsl(45, 80%, 55%)',  // Yellow
];

export function CategorySalesChart({ transactions }: CategorySalesChartProps) {
  const chartData = useMemo(() => {
    const salesByCategory: Record<string, number> = {};
    
    transactions.forEach(t => {
      t.items.forEach(item => {
        const categoryId = item.product.categoryId;
        salesByCategory[categoryId] = (salesByCategory[categoryId] || 0) + (item.pricePerUnit * item.quantity);
      });
    });

    return Object.entries(salesByCategory)
      .map(([categoryId, total]) => {
        const category = categories.find(c => c.id === categoryId);
        return {
          name: category?.name || categoryId,
          value: total,
          icon: category?.icon || '📦',
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

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
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [formatCurrency(value), 'Penjualan']}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
