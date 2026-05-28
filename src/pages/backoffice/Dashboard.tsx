import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '@/components/backoffice/StatCard';
import { DateFilter, DateFilterType, DateRange, getDateRangeFromFilter } from '@/components/backoffice/DateFilter';
import { RevenueChart } from '@/components/backoffice/charts/RevenueChart';
import { CategorySalesChart } from '@/components/backoffice/charts/CategorySalesChart';
import { PaymentMethodChart } from '@/components/backoffice/charts/PaymentMethodChart';
import { TopProductsTable } from '@/components/backoffice/tables/TopProductsTable';
import { TransactionsTable } from '@/components/backoffice/tables/TransactionsTable';
import { getSalesByStore, Sale as DBSale } from '@/services/salesService';
import { getProductsByStore, Product } from '@/services/productsService';
import { getCustomersByStore } from '@/services/customersService';
import { Sale } from '@/types/pos';
import { formatCurrency } from '@/lib/format';
import { TrendingUp, ShoppingCart, Package, Users } from 'lucide-react';
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

  // Load data from Supabase
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
      
      // Convert DBSale to Sale format
      const convertedSales: Sale[] = salesData.map(s => ({
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
    if (dateRange.from) filtered = filtered.filter(s => s.date >= dateRange.from!);
    if (dateRange.to) filtered = filtered.filter(s => s.date <= dateRange.to!);
    return filtered;
  }, [sales, dateRange]);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.grand_total, 0);
  const totalTransactions = filteredSales.length;
  const totalProducts = storeProducts.length;
  const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const uniqueCustomersWithTransactions = new Set(filteredSales.filter(s => s.customer_id).map(s => s.customer_id)).size;
  const lowStockProducts = storeProducts.filter(p => p.quantity < p.min_stock_alert).length;

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
          <p className="text-muted-foreground">Memuat data dashboard...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Pendapatan" value={formatCurrency(totalRevenue)} change={dateFilterType !== 'all' ? `Periode: ${dateFilterType.replace('_', ' ')}` : undefined} changeType="neutral" icon={TrendingUp} iconColor="bg-green-100 text-green-600" />
            <StatCard title="Total Transaksi" value={totalTransactions.toString()} change={`Rata-rata: ${formatCurrency(avgTransactionValue)}`} changeType="neutral" icon={ShoppingCart} iconColor="bg-blue-100 text-blue-600" />
            <StatCard title="Pelanggan" value={totalCustomers.toString()} change={`${uniqueCustomersWithTransactions} dengan transaksi`} changeType="neutral" icon={Users} iconColor="bg-indigo-100 text-indigo-600" />
            <StatCard title="Total Produk" value={totalProducts.toString()} icon={Package} iconColor="bg-purple-100 text-purple-600" />
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
            <CategorySalesChart sales={filteredSales} storeId={activeStoreId} />
            {lowStockProducts > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-orange-800">Peringatan Stok Menipis</h3>
                    <p className="text-sm text-orange-700 mt-1">
                      {lowStockProducts} produk memiliki stok di bawah minimum.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {storeProducts.filter(p => p.quantity < p.min_stock_alert).slice(0, 5).map(p => (
                        <span key={p.id} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
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
