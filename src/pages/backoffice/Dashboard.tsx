import { useState, useMemo } from 'react';
import { StatCard } from '@/components/backoffice/StatCard';
import { DateFilter, DateFilterType, DateRange, getDateRangeFromFilter } from '@/components/backoffice/DateFilter';
import { RevenueChart } from '@/components/backoffice/charts/RevenueChart';
import { CategorySalesChart } from '@/components/backoffice/charts/CategorySalesChart';
import { PaymentMethodChart } from '@/components/backoffice/charts/PaymentMethodChart';
import { TopProductsTable } from '@/components/backoffice/tables/TopProductsTable';
import { TransactionsTable } from '@/components/backoffice/tables/TransactionsTable';
import { sampleSales, products, stores } from '@/data/sampleData';
import { formatCurrency } from '@/lib/format';
import { TrendingUp, ShoppingCart, Package, Building2, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Dashboard() {
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('all');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromFilter('all'));

  const handleDateFilterChange = (type: DateFilterType, range: DateRange) => {
    setDateFilterType(type);
    setDateRange(range);
  };

  const filteredSales = useMemo(() => {
    let filtered = sampleSales;
    if (selectedStore !== 'all') {
      filtered = filtered.filter(s => s.store_id === Number(selectedStore));
    }
    if (dateRange.from) filtered = filtered.filter(s => s.date >= dateRange.from!);
    if (dateRange.to) filtered = filtered.filter(s => s.date <= dateRange.to!);
    return filtered;
  }, [selectedStore, dateRange]);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.grand_total, 0);
  const totalTransactions = filteredSales.length;
  const totalProducts = products.length;
  const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const uniqueCustomers = new Set(filteredSales.filter(s => s.customer_id).map(s => s.customer_id)).size;

  const lowStockProducts = products.filter(p => p.quantity < p.min_stock_alert).length;

  const getLowStockProductsList = () => {
    return products.filter(p => p.quantity < p.min_stock_alert);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Selamat datang di Back Office POS</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <DateFilter value={dateFilterType} dateRange={dateRange} onChange={handleDateFilterChange} />
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-[220px]">
              <Building2 className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Pilih Toko" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Toko</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={String(store.id)}>
                  {store.name.replace('Minimarket Berkah - ', '')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Pendapatan" value={formatCurrency(totalRevenue)} change={dateFilterType !== 'all' ? `Periode: ${dateFilterType.replace('_', ' ')}` : undefined} changeType="neutral" icon={TrendingUp} iconColor="bg-green-100 text-green-600" />
        <StatCard title="Total Transaksi" value={totalTransactions.toString()} change={`Rata-rata: ${formatCurrency(avgTransactionValue)}`} changeType="neutral" icon={ShoppingCart} iconColor="bg-blue-100 text-blue-600" />
        <StatCard title="Pelanggan" value={uniqueCustomers.toString()} change="Dengan member" changeType="neutral" icon={Users} iconColor="bg-indigo-100 text-indigo-600" />
        <StatCard title="Total Produk" value={totalProducts.toString()} icon={Package} iconColor="bg-purple-100 text-purple-600" />
        <StatCard title="Stok Menipis" value={lowStockProducts.toString()} change="Perlu restok segera" changeType={lowStockProducts > 0 ? "negative" : "positive"} icon={Package} iconColor="bg-orange-100 text-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart sales={filteredSales} dateFrom={dateRange.from} dateTo={dateRange.to} />
        </div>
        <div>
          <PaymentMethodChart sales={filteredSales} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategorySalesChart sales={filteredSales} />
        {lowStockProducts > 0 && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-orange-800 dark:text-orange-300">Peringatan Stok Menipis</h3>
                <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                  {lowStockProducts} produk memiliki stok di bawah minimum.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {getLowStockProductsList().slice(0, 5).map(p => (
                    <span key={p.id} className="text-xs bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 px-2 py-1 rounded-full">
                      {p.name} ({p.quantity})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Produk Terlaris</TabsTrigger>
          <TabsTrigger value="transactions">Transaksi Terbaru</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <TopProductsTable sales={filteredSales} limit={10} />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsTable sales={filteredSales} limit={10} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
