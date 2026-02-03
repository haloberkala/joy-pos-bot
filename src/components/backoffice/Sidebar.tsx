import { NavLink } from '@/components/NavLink';
import { 
  LayoutDashboard, 
  Package, 
  Receipt, 
  Settings,
  Store,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/backoffice', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/backoffice/products', icon: Package, label: 'Produk' },
  { to: '/backoffice/transactions', icon: Receipt, label: 'Transaksi' },
  { to: '/backoffice/settings', icon: Settings, label: 'Pengaturan' },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Store className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">POS Admin</h1>
            <p className="text-xs text-muted-foreground">Back Office</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Back to POS */}
      <div className="p-4 border-t border-border">
        <NavLink
          to="/"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium">Kembali ke POS</span>
        </NavLink>
      </div>
    </aside>
  );
}
