import { StatCard } from '@/components/backoffice/StatCard';
import { sampleTransactions, products } from '@/data/sampleData';
import { formatCurrency, formatDate } from '@/lib/format';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  Users,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export default function Dashboard() {
  const totalRevenue = sampleTransactions.reduce((sum, t) => sum + t.total, 0);
  const totalTransactions = sampleTransactions.length;
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.stock < 20).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Selamat datang di Back Office POS</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pendapatan"
          value={formatCurrency(totalRevenue)}
          change="+12% dari kemarin"
          changeType="positive"
          icon={TrendingUp}
          iconColor="bg-green-100 text-green-600"
        />
        <StatCard
          title="Total Transaksi"
          value={totalTransactions.toString()}
          change="+5 transaksi hari ini"
          changeType="positive"
          icon={ShoppingCart}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Total Produk"
          value={totalProducts.toString()}
          icon={Package}
          iconColor="bg-purple-100 text-purple-600"
        />
        <StatCard
          title="Stok Menipis"
          value={lowStockProducts.toString()}
          change="Perlu restok segera"
          changeType="negative"
          icon={Package}
          iconColor="bg-orange-100 text-orange-600"
        />
      </div>

      {/* Recent Transactions */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Transaksi Terbaru</h2>
        </div>
        <div className="divide-y divide-border">
          {sampleTransactions.slice(0, 5).map((transaction) => (
            <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{transaction.id}</p>
                  <p className="text-sm text-muted-foreground">
                    {transaction.items.length} item • {formatDate(transaction.createdAt)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">{formatCurrency(transaction.total)}</p>
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <ArrowUpRight className="w-3 h-3" />
                  <span className="capitalize">{transaction.paymentMethod}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-orange-800">Peringatan Stok Menipis</h3>
              <p className="text-sm text-orange-700 mt-1">
                {lowStockProducts} produk memiliki stok kurang dari 20 unit. 
                Segera lakukan restok untuk menghindari kehabisan stok.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {products.filter(p => p.stock < 20).map(p => (
                  <span key={p.id} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                    {p.name} ({p.stock})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
