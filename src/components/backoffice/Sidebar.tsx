import { NavLink } from '@/components/NavLink';
import { useAuth, canAccessMenu } from '@/contexts/AuthContext';
import { stores } from '@/data/sampleData';
import {
  LayoutDashboard, Package, Receipt, Settings, Store, ChevronLeft, LogOut,
  ShieldCheck, UserCog, User, Wallet, FileBarChart, ShoppingCart, Building2, AlertTriangle, Truck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  end?: boolean;
  menuKey: string;
}

const navItems: NavItem[] = [
  { to: '/backoffice', icon: LayoutDashboard, label: 'Dashboard', end: true, menuKey: 'dashboard' },
  { to: '/backoffice/products', icon: Package, label: 'Produk & Stok', menuKey: 'products' },
  { to: '/backoffice/purchases', icon: ShoppingCart, label: 'Kulakan/Supply', menuKey: 'purchases' },
  { to: '/backoffice/transactions', icon: Receipt, label: 'Transaksi', menuKey: 'transactions' },
  
  { to: '/backoffice/shipping', icon: Truck, label: 'Pengiriman', menuKey: 'transactions' },
  { to: '/backoffice/expenses', icon: Wallet, label: 'Pengeluaran', menuKey: 'expenses' },
  { to: '/backoffice/reports', icon: FileBarChart, label: 'Laporan', menuKey: 'reports' },
  { to: '/backoffice/settings', icon: Settings, label: 'Pengaturan', menuKey: 'settings' },
];

export function Sidebar() {
  const { user, logout, activeStoreId } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); toast.success('Logout berhasil'); };

  const getRoleLabel = (role: string) => {
    switch (role) { case 'owner': return 'Owner'; case 'admin': return 'Kepala Toko'; case 'cashier': return 'Kasir'; default: return 'User'; }
  };

  const RoleIcon = user?.role === 'owner' ? ShieldCheck : user?.role === 'admin' ? UserCog : User;
  const activeStore = stores.find(s => s.id === activeStoreId);

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center"><Store className="w-6 h-6 text-primary-foreground" /></div>
          <div><h1 className="font-bold text-foreground">POS Admin</h1><p className="text-xs text-muted-foreground">Back Office</p></div>
        </div>
      </div>

      {/* Active Store Display */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate">{activeStore?.name}</span>
        </div>
      </div>

      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><RoleIcon className="w-5 h-5 text-primary" /></div>
          <div className="flex-1 min-w-0"><p className="font-medium text-foreground truncate">{user?.name}</p><p className="text-xs text-muted-foreground">{getRoleLabel(user?.role || '')}</p></div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.filter(item => canAccessMenu(user?.role, item.menuKey)).map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors" activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground">
            <item.icon className="w-5 h-5" /><span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        {user?.role === 'owner' && (
          <NavLink to="/owner" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <Building2 className="w-5 h-5" /><span className="font-medium">Portal Owner</span>
          </NavLink>
        )}
        <NavLink to="/" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">
          <ChevronLeft className="w-5 h-5" /><span className="font-medium">Kembali ke POS</span>
        </NavLink>
        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
          <LogOut className="w-5 h-5" /><span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
