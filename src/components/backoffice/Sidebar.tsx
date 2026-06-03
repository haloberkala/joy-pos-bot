import { NavLink } from '@/components/NavLink';
import { useAuth, canAccessMenu } from '@/contexts/AuthContext';
import { getAllStores, Store } from '@/services/storesService';
import {
  LayoutDashboard, Package, Receipt, Settings, Store as StoreIcon, ChevronLeft, LogOut,
  ShieldCheck, UserCog, User, Wallet, FileBarChart, ShoppingCart, Building2, Truck,
  ChevronDown, ClipboardList, Banknote, Star, UserPlus, Users, Tag, List, Menu, X,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export function Sidebar() {
  const { user, logout, activeStoreId, setActiveStoreId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sdmOpen, setSdmOpen] = useState(() => location.pathname.startsWith('/backoffice/sdm'));
  const [productsOpen, setProductsOpen] = useState(() => location.pathname.startsWith('/backoffice/products'));
  const [stores, setStores] = useState<Store[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const storesData = await getAllStores();
      setStores(storesData);
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); toast.success('Logout berhasil'); };

  const handleStoreChange = (storeId: number) => {
    setActiveStoreId(storeId);
    toast.success('Toko berhasil diganti');
  };

  const getRoleLabel = (role: string) => {
    switch (role) { case 'owner': return 'Owner'; case 'admin': return 'Kepala Toko'; case 'cashier': return 'Kasir'; default: return 'User'; }
  };

  const RoleIcon = user?.role === 'owner' ? ShieldCheck : user?.role === 'admin' ? UserCog : User;
  const activeStore = stores.find(s => s.id === activeStoreId);

  const linkCls = "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors";
  const activeCls = "bg-primary-light text-primary hover:bg-primary-light hover:text-primary";

  const topItems = [
    { to: '/backoffice', icon: LayoutDashboard, label: 'Dashboard', end: true, menuKey: 'dashboard' },
    { to: '/backoffice/purchases', icon: ShoppingCart, label: 'Kulakan/Supply', menuKey: 'purchases' },
    { to: '/backoffice/transactions', icon: Receipt, label: 'Transaksi & Utang', menuKey: 'transactions' },
    { to: '/backoffice/customers', icon: Users, label: 'Pelanggan', menuKey: 'transactions' },
    { to: '/backoffice/shipping', icon: Truck, label: 'Pengiriman', menuKey: 'transactions' },
    { to: '/backoffice/expenses', icon: Wallet, label: 'Pengeluaran', menuKey: 'expenses' },
  ];

  const productsSubItems = [
    { to: '/backoffice/products', icon: List, label: 'Daftar Produk' },
    { to: '/backoffice/products/categories-brands', icon: Tag, label: 'Klasifikasi Produk' },
  ];

  const sdmSubItems = [
    { to: '/backoffice/sdm/employees', icon: UserPlus, label: 'Manajemen Karyawan' },
    { to: '/backoffice/sdm/attendance', icon: ClipboardList, label: 'Rekap Absensi' },
    { to: '/backoffice/sdm/payroll', icon: Banknote, label: 'Penggajian' },
    { to: '/backoffice/sdm/evaluation', icon: Star, label: 'Evaluasi' },
  ];

  const bottomItems = [
    { to: '/backoffice/reports', icon: FileBarChart, label: 'Laporan', menuKey: 'reports' },
    { to: '/backoffice/settings', icon: Settings, label: 'Pengaturan', menuKey: 'settings' },
  ];

  const isSdmActive = location.pathname.startsWith('/backoffice/sdm');
  const isProductsActive = location.pathname.startsWith('/backoffice/products');
  const showSdm = canAccessMenu(user?.role, 'sdm');
  const showProducts = canAccessMenu(user?.role, 'products');

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-border shadow-lg"
      >
        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 lg:w-60 bg-white border-r border-border flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 shadow-sm border border-indigo-100">
            <img src="/logo.png" alt="Nadi" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-foreground tracking-tight">Nadi</h1>
            <p className="text-[11px] text-muted-foreground">Pusat Kendali Bisnismu</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-border">
        {user?.role === 'owner' ? (
          <div className="relative">
            <select
              value={activeStoreId}
              onChange={(e) => handleStoreChange(Number(e.target.value))}
              className="appearance-none w-full pl-7 pr-6 py-1.5 rounded-lg text-[12px] font-medium border border-border bg-white text-foreground cursor-pointer focus:outline-none focus:border-primary"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Building2 className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-lg">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[12px] font-medium truncate text-foreground">{activeStore?.name}</span>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center">
            <RoleIcon className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-[11px] text-muted-foreground">{getRoleLabel(user?.role || '')}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {topItems.filter(item => canAccessMenu(user?.role, item.menuKey)).map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkCls} activeClassName={activeCls}>
            <item.icon className="w-[14px] h-[14px]" /><span>{item.label}</span>
          </NavLink>
        ))}

        {/* Products collapsible */}
        {showProducts && (
          <div>
            <button
              onClick={() => setProductsOpen(!productsOpen)}
              className={`w-full ${linkCls} ${isProductsActive ? 'text-primary font-medium' : ''}`}
            >
              <Package className="w-[14px] h-[14px]" />
              <span className="flex-1 text-left">Produk & Stok</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${productsOpen ? 'rotate-180' : ''}`} />
            </button>
            {productsOpen && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
                {productsSubItems.map(item => (
                  <NavLink key={item.to} to={item.to} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" activeClassName={activeCls}>
                    <item.icon className="w-3.5 h-3.5" /><span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SDM collapsible */}
        {showSdm && (
          <div>
            <button
              onClick={() => setSdmOpen(!sdmOpen)}
              className={`w-full ${linkCls} ${isSdmActive ? 'text-primary font-medium' : ''}`}
            >
              <Users className="w-[14px] h-[14px]" />
              <span className="flex-1 text-left">SDM</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sdmOpen ? 'rotate-180' : ''}`} />
            </button>
            {sdmOpen && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
                {sdmSubItems.map(item => (
                  <NavLink key={item.to} to={item.to} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" activeClassName={activeCls}>
                    <item.icon className="w-3.5 h-3.5" /><span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        {bottomItems.filter(item => canAccessMenu(user?.role, item.menuKey)).map(item => (
          <NavLink key={item.to} to={item.to} className={linkCls} activeClassName={activeCls}>
            <item.icon className="w-[14px] h-[14px]" /><span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        {user?.role === 'owner' && (
          <NavLink to="/owner" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-light text-primary hover:bg-primary-light/80 transition-colors text-[13px]">
            <Building2 className="w-[14px] h-[14px]" /><span className="font-medium">Portal Owner</span>
          </NavLink>
        )}
        <NavLink to="/" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface text-foreground hover:bg-accent transition-colors text-[13px]">
          <ChevronLeft className="w-[14px] h-[14px]" /><span className="font-medium">Kembali ke POS</span>
        </NavLink>
        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-destructive hover:bg-destructive/5 transition-colors text-[13px]">
          <LogOut className="w-[14px] h-[14px]" /><span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
    </>
  );
}
