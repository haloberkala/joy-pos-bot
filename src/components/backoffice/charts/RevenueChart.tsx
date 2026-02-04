import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, eachDayOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth, isSameDay, isSameMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { Transaction } from '@/types/pos';
import { formatCurrency } from '@/lib/format';
import { Card } from '@/components/ui/card';

interface RevenueChartProps {
  transactions: Transaction[];
  dateFrom?: Date;
  dateTo?: Date;
}

export function RevenueChart({ transactions, dateFrom, dateTo }: RevenueChartProps) {
  const chartData = useMemo(() => {
    if (!dateFrom || !dateTo) {
      // Group by month for all data
      const monthlyData: Record<string, number> = {};
      transactions.forEach(t => {
        const monthKey = format(t.createdAt, 'yyyy-MM');
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + t.total;
      });
      return Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, total]) => ({
          name: format(new Date(month + '-01'), 'MMM yyyy', { locale: id }),
          revenue: total,
        }));
    }

    const daysDiff = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 31) {
      // Daily view
      const days = eachDayOfInterval({ start: dateFrom, end: dateTo });
      return days.map(day => {
        const dayTotal = transactions
          .filter(t => isSameDay(t.createdAt, day))
          .reduce((sum, t) => sum + t.total, 0);
        return {
          name: format(day, 'd MMM', { locale: id }),
          revenue: dayTotal,
        };
      });
    } else {
      // Monthly view
      const months = eachMonthOfInterval({ start: startOfMonth(dateFrom), end: endOfMonth(dateTo) });
      return months.map(month => {
        const monthTotal = transactions
          .filter(t => isSameMonth(t.createdAt, month))
          .reduce((sum, t) => sum + t.total, 0);
        return {
          name: format(month, 'MMM yyyy', { locale: id }),
          revenue: monthTotal,
        };
      });
    }
  }, [transactions, dateFrom, dateTo]);

  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Grafik Pendapatan</h3>
          <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(totalRevenue)}</p>
        </div>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [formatCurrency(value), 'Pendapatan']}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
