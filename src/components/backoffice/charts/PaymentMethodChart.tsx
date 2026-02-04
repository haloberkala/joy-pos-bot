import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Transaction } from '@/types/pos';
import { formatCurrency } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Banknote, CreditCard, Smartphone } from 'lucide-react';

interface PaymentMethodChartProps {
  transactions: Transaction[];
}

const PAYMENT_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  cash: { label: 'Tunai', color: 'hsl(158, 64%, 52%)', icon: <Banknote className="w-4 h-4" /> },
  card: { label: 'Kartu', color: 'hsl(200, 70%, 50%)', icon: <CreditCard className="w-4 h-4" /> },
  qris: { label: 'QRIS', color: 'hsl(280, 60%, 55%)', icon: <Smartphone className="w-4 h-4" /> },
};

export function PaymentMethodChart({ transactions }: PaymentMethodChartProps) {
  const chartData = useMemo(() => {
    const salesByMethod: Record<string, { total: number; count: number }> = {};
    
    transactions.forEach(t => {
      if (!salesByMethod[t.paymentMethod]) {
        salesByMethod[t.paymentMethod] = { total: 0, count: 0 };
      }
      salesByMethod[t.paymentMethod].total += t.total;
      salesByMethod[t.paymentMethod].count += 1;
    });

    return Object.entries(salesByMethod).map(([method, data]) => ({
      name: PAYMENT_LABELS[method]?.label || method,
      value: data.total,
      count: data.count,
      color: PAYMENT_LABELS[method]?.color || 'hsl(var(--muted))',
    }));
  }, [transactions]);

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">Metode Pembayaran</h3>
        <p className="text-sm text-muted-foreground">{transactions.length} transaksi</p>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        {Object.entries(PAYMENT_LABELS).map(([key, { label, color, icon }]) => {
          const data = chartData.find(d => d.name === label);
          return (
            <div key={key} className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span style={{ color }}>{icon}</span>
                <span className="text-sm font-medium">{label}</span>
              </div>
              <p className="text-lg font-bold" style={{ color }}>{data?.count || 0}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(data?.value || 0)}</p>
            </div>
          );
        })}
      </div>

      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis 
              type="number" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [formatCurrency(value), 'Total']}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
