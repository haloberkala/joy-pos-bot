import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '@/components/backoffice/StatCard';
import { DateFilter, DateFilterType, DateRange, getDateRangeFromFilter } from '@/components/backoffice/DateFilter';
import { RevenueChart } from '@/components/backoffice/charts/RevenueChart';
import { CategorySalesChart } from '@/components/backoffice/charts/CategorySalesChart';
import { BrandSalesChart } from '@/components/backoffice/charts/BrandSalesChart';
import { PaymentMethodChart } from '@/components/backoffice/charts/PaymentMethodChart';
import { TopProductsTable } from '@/components/backoffice/tables/TopProductsTable';
import { TransactionsTable } from '@/components/backoffice/tables/TransactionsTable';
import { getSalesByStore, Sale as DBSale } from '@/services/salesService';
import { getProductsByStore, Product } from '@/services/productsService';
import { getCustomersByStore } from '@/services/customersService';
import { Sale } from '@/types/pos';
import { formatCurrency } from '@/lib/format';
import { TrendingUp, ShoppingCart, Package, Users, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function Dashboard() {
  const { activeStoreId } = useAuth();
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('all');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromFilter('all'));
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const handleDateFilterChange = (type: DateFilterType, range: DateRange) => {
    setDateFilterType(type);
    setDateRange(range);
  };

  useEffect(() => {
    loadDashboardData();
  }, [activeStoreId]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [salesData, productsData, customersData] = await Promise.all([
        getSalesByStore(activeStoreId),
        getProductsByStore(activeStoreId),
        getCustomersByStore(activeStoreId),
      ]);

      const convertedSales: Sale[] = salesData.map((s) => ({
        id: s.id,
        store_id: s.store_id,
        user_id: 1,
        customer_id: s.customer_id,
        invoice_number: s.invoice_number,
        date: new Date(s.sale_date),
        sub_total: s.sub_total,
        discount: s.discount,
        tax: s.tax,
        grand_total: s.grand_total,
        payment_method: s.payment_method,
        payment_status: s.payment_status,
        amount_received: s.amount_received,
        change_amount: s.change_amount,
        due_date: s.due_date ? new Date(s.due_date) : null,
        note: s.note,
        created_at: new Date(s.created_at),
        updated_at: new Date(s.updated_at),
      }));

      setSales(convertedSales);
      setProducts(productsData);
      setTotalCustomers(customersData.length);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const storeProducts = useMemo(() => products, [products]);

  const filteredSales = useMemo(() => {
    let filtered = sales;
    if (dateRange.from) filtered = filtered.filter((s) => s.date >= dateRange.from!);
    if (dateRange.to) filtered = filtered.filter((s) => s.date <= dateRange.to!);
    return filtered;
  }, [sales, dateRange]);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.grand_total, 0);
  const totalTransactions = filteredSales.length;
  const totalProducts = storeProducts.length;
  const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const uniqueCustomersWithTransactions = new Set(filteredSales.filter((s) => s.customer_id).map((s) => s.customer_id)).size;
  const lowStockProducts = storeProducts.filter((p) => p.quantity < p.min_stock_alert);

  const CHART_HEIGHT = 300;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Selamat datang di Back Office POS</p>
        </div>
        <DateFilter value={dateFilterType} dateRange={dateRange} onChange={handleDateFilterChange} />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Memuat data dashboard...</p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Pendapatan" value={formatCurrency(totalRevenue)} change={dateFilterType !== 'all' ? `Periode: ${dateFilterType.replace('_', ' ')}` : undefined} changeType="neutral" icon={TrendingUp} iconColor="bg-green-100 text-green-600" />
            <StatCard title="Total Transaksi" value={totalTransactions.toString()} change={`Rata-rata: ${formatCurrency(avgTransactionValue)}`} changeType="neutral" icon={ShoppingCart} iconColor="bg-blue-100 text-blue-600" />
            <StatCard title="Pelanggan" value={totalCustomers.toString()} change={`${uniqueCustomersWithTransactions} dengan transaksi`} changeType="neutral" icon={Users} iconColor="bg-indigo-100 text-indigo-600" />
            <StatCard title="Total Produk" value={totalProducts.toString()} icon={Package} iconColor="bg-purple-100 text-purple-600" />
          </div>

          {/* Revenue + Payment */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RevenueChart sales={filteredSales} dateFrom={dateRange.from} dateTo={dateRange.to} />
            </div>
            <div>
              <PaymentMethodChart sales={filteredSales} />
            </div>
          </div>

          {/* Category/Brand Charts + Low Stock */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Tabbed charts — takes 2 cols */}
            <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
              <Tabs defaultValue="category">
                <div className="flex items-center justify-between px-4 pt-4 pb-0">
                  <h3 className="font-semibold text-sm text-foreground">Analisis Penjualan</h3>
                  <TabsList className="h-8">
                    <TabsTrigger value="category" className="text-xs h-7 px-3">Per Kategori</TabsTrigger>
                    <TabsTrigger value="brand" className="text-xs h-7 px-3">Per Brand</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="category" className="mt-0 p-4" style={{ height: CHART_HEIGHT }}>
                  <CategorySalesChart sales={filteredSales} storeId={activeStoreId} />
                </TabsContent>
                <TabsContent value="brand" className="mt-0 p-4" style={{ height: CHART_HEIGHT }}>
                  <BrandSalesChart sales={filteredSales} storeId={activeStoreId} />
                </TabsContent>
              </Tabs>
            </div>

            {/* Low Stock Card — compact, scrollable */}
            <div
              className="bg-orange-50 border border-orange-200 rounded-xl overflow-hidden flex flex-col"
              style={{ height: CHART_HEIGHT + 56 /* header padding */ }}
            >
              {/* Header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-orange-200 flex-shrink-0">
                <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-orange-900">Stok Menipis</h3>
                  <p className="text-xs text-orange-600">
                    {lowStockProducts.length > 0 ? `${lowStockProducts.length} produk perlu restock` : 'Semua stok aman'}
                  </p>
                </div>
                {lowStockProducts.length > 0 && (
                  <span className="flex-shrink-0 bg-orange-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {lowStockProducts.length > 99 ? '99+' : lowStockProducts.length}
                  </span>
                )}
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto">
                {lowStockProducts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 px-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Package className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-xs text-center text-muted-foreground">Semua produk memiliki stok yang cukup</p>
                  </div>
                ) : (
                  <div className="divide-y divide-orange-100">
                    {lowStockProducts.map((p) => (
                      <div key={p.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-orange-100/60 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-orange-900 truncate">{p.name}</p>
                          <p className="text-[10px] text-orange-500">Sisa: {p.quantity} / Min: {p.min_stock_alert}</p>
                        </div>
                        <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          p.quantity === 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {p.quantity === 0 ? 'Habis' : 'Menipis'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Tables */}
          <Tabs defaultValue="products" className="space-y-4">
            <TabsList>
              <TabsTrigger value="products">Produk Terlaris</TabsTrigger>
              <TabsTrigger value="transactions">Transaksi Terbaru</TabsTrigger>
            </TabsList>
            <TabsContent value="products">
              <TopProductsTable sales={filteredSales} storeId={activeStoreId} limit={10} />
            </TabsContent>
            <TabsContent value="transactions">
              <TransactionsTable sales={filteredSales} limit={10} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
