import { useMemo, useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Sale } from '@/types/pos';
import { getSaleItemsBySaleIds } from '@/services/salesService';
import { getAllCategories } from '@/services/categoriesService';
import { getProductsByStore } from '@/services/productsService';
import { formatCurrency } from '@/lib/format';
import { Card } from '@/components/ui/card';

interface CategorySalesChartProps {
  sales: Sale[];
  storeId: number;
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
      
      // Load categories and products
      const [categoriesData, productsData] = await Promise.all([
        getAllCategories(),
        getProductsByStore(storeId),
      ]);
      
      setCategories(categoriesData);
      setProducts(productsData);
      
      // Load sale items
      const saleIds = sales.map(s => s.id);
      if (saleIds.length === 0) {
        setSaleItems([]);
        return;
      }
      
      const items = await getSaleItemsBySaleIds(saleIds);
      setSaleItems(items);
    } catch (error) {
      console.error('Error loading data:', error);
      setSaleItems([]);
      setCategories([]);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = useMemo(() => {
    if (saleItems.length === 0 || products.length === 0 || categories.length === 0) {
      return [];
    }

    const salesByCategory: Record<number, { name: string; value: number }> = {};

    saleItems.forEach(item => {
      // Find product by code or name
      const product = products.find(
        p => p.code === item.product_code || p.name === item.product_name
      );
      
      if (product && product.category_id) {
        const category = categories.find(c => c.id === product.category_id);
        if (category) {
          if (!salesByCategory[category.id]) {
            salesByCategory[category.id] = {
              name: category.name,
              value: 0,
            };
          }
          salesByCategory[category.id].value += item.total_price;
        }
      } else {
        // Uncategorized products
        if (!salesByCategory[0]) {
          salesByCategory[0] = {
            name: 'Tanpa Kategori',
            value: 0,
          };
        }
        salesByCategory[0].value += item.total_price;
      }
    });

    return Object.values(salesByCategory)
      .sort((a, b) => b.value - a.value);
  }, [saleItems, products, categories]);

  const totalSales = chartData.reduce((sum, item) => sum + item.value, 0);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="mb-4">
          <h3 className="font-semibold text-foreground">Penjualan per Kategori</h3>
          <p className="text-sm text-muted-foreground">Memuat data...</p>
        </div>
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">Penjualan per Kategori</h3>
        <p className="text-sm text-muted-foreground">Total: {formatCurrency(totalSales)}</p>
      </div>
      {chartData.length > 0 ? (
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
                  borderRadius: '8px' 
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
      ) : (
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Tidak ada data penjualan</p>
        </div>
      )}
    </Card>
  );
}
