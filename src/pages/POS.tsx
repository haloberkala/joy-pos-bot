import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { CustomerModal } from '@/components/pos/CustomerModal';
import { RefundModal } from '@/components/pos/RefundModal';
import { getProductsForStore, stores, customers, processRefund } from '@/data/sampleData';
import { PaymentMethod, Sale, SaleDetail, Product, Customer, PriceMode, ServiceItem, CartItem } from '@/types/pos';
import { Settings, LogOut, User, ShieldCheck, UserCog, ScanBarcode, Building2, Trash2, Search, ChevronDown, Truck, Wrench, Plus, Crown, X, RotateCcw, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { canAccessMenu } from '@/contexts/AuthContext';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ProductListPanel } from '@/components/pos/ProductListPanel';
import { ShippingModal } from '@/components/pos/ShippingModal';

// ========== OPEN BILL TYPES ==========
interface Bill {
  id: number;
  label: string;
  customerName: string;
  items: CartItem[];
  serviceItems: ServiceItem[];
  selectedCustomer: Customer | null;
}

let billCounter = 1;

function createBill(): Bill {
  const id = billCounter++;
  return {
    id,
    label: `Bill ${id}`,
    customerName: '',
    items: [],
    serviceItems: [],
    selectedCustomer: null,
  };
}

const MAX_BILLS = 10;

export default function POS() {
  // ========== OPEN BILL STATE ==========
  const [bills, setBills] = useState<Bill[]>(() => [createBill()]);
  const [activeBillId, setActiveBillId] = useState<number>(() => bills[0]?.id ?? 1);

  const activeBill = bills.find(b => b.id === activeBillId) || bills[0];

  // Sync cart hook with active bill
  const { items, addItem, removeItem, updateQuantity, clearCart, total, setPriceMode, setItems } = useCart();

  // Service items for active bill
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);

  // Save current cart state back to bills when switching
  const saveBillState = useCallback(() => {
    setBills(prev => prev.map(b =>
      b.id === activeBillId
        ? { ...b, items: [...items], serviceItems: [...serviceItems], selectedCustomer: selectedCustomerRef.current }
        : b
    ));
  }, [activeBillId, items, serviceItems]);

  // Ref to track selected customer for saving
  const selectedCustomerRef = useRef<Customer | null>(null);

  const switchToBill = useCallback((billId: number) => {
    if (billId === activeBillId) return;
    // Save current bill
    saveBillState();
    // Load target bill
    const target = bills.find(b => b.id === billId);
    if (target) {
      setActiveBillId(billId);
      setItems(target.items);
      setServiceItems(target.serviceItems);
      setSelectedCustomer(target.selectedCustomer);
    }
  }, [activeBillId, bills, saveBillState, setItems]);

  const addNewBill = useCallback(() => {
    if (bills.length >= MAX_BILLS) {
      toast.error(`Maksimal ${MAX_BILLS} bill terbuka`);
      return;
    }
    saveBillState();
    const newBill = createBill();
    setBills(prev => [...prev, newBill]);
    setActiveBillId(newBill.id);
    clearCart();
    setServiceItems([]);
    setSelectedCustomer(null);
  }, [bills.length, saveBillState, clearCart]);

  const closeBill = useCallback((billId: number) => {
    if (bills.length <= 1) {
      // Reset the only bill
      clearCart();
      setServiceItems([]);
      setSelectedCustomer(null);
      const fresh = createBill();
      setBills([fresh]);
      setActiveBillId(fresh.id);
      return;
    }
    const remaining = bills.filter(b => b.id !== billId);
    setBills(remaining);
    if (activeBillId === billId) {
      const next = remaining[0];
      setActiveBillId(next.id);
      setItems(next.items);
      setServiceItems(next.serviceItems);
      setSelectedCustomer(next.selectedCustomer);
    }
  }, [bills, activeBillId, clearCart, setItems]);

  // ========== EXISTING STATE ==========
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [currentSaleDetails, setCurrentSaleDetails] = useState<(SaleDetail & { product?: Product })[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<PaymentMethod | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDebt, setIsDebt] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [showShipping, setShowShipping] = useState(false);
  const [showRefund, setShowRefund] = useState(false);

  // Service input
  const [serviceDesc, setServiceDesc] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [showServiceInput, setShowServiceInput] = useState(false);

  // Owner withdrawal mode
  const [isOwnerWithdrawal, setIsOwnerWithdrawal] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const { user, logout, activeStoreId, setActiveStoreId, canSwitchStore, accessibleStoreIds } = useAuth();
  const navigate = useNavigate();

  // Keep ref in sync
  useEffect(() => { selectedCustomerRef.current = selectedCustomer; }, [selectedCustomer]);

  const storeProducts = useMemo(() => getProductsForStore(activeStoreId), [activeStoreId]);
  const activeStore = stores.find(s => s.id === activeStoreId);

  const serviceTotal = useMemo(() => serviceItems.reduce((sum, s) => sum + s.price, 0), [serviceItems]);
  const grandTotal = total + serviceTotal;

  useEffect(() => { searchRef.current?.focus(); }, []);

  useEffect(() => {
    if (paymentMethod && isDebt) handleConfirmPayment(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, isDebt]);

  useBarcodeScanner({
    onScan: (barcode) => {
      const product = storeProducts.find(p => p.code === barcode);
      if (product) {
        if (product.quantity > 0) { addItem(product); toast.success(`${product.name} ditambahkan`, { duration: 1500 }); }
        else toast.error(`${product.name} stok habis`);
      } else toast.error(`Produk tidak ditemukan: ${barcode}`);
    },
    enabled: scannerActive && !paymentMethod && !showReceipt && !showCustomerModal,
  });

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const product = storeProducts.find(p => p.code.toLowerCase() === q || p.name.toLowerCase().includes(q));
      if (product && product.quantity > 0) { addItem(product); setSearchQuery(''); toast.success(`${product.name} ditambahkan`, { duration: 1000 }); }
      else if (product) toast.error(`${product.name} stok habis`);
      else toast.error('Produk tidak ditemukan');
    }
  }, [searchQuery, storeProducts, addItem]);

  const handleQtyChange = (productId: number, value: string) => {
    const qty = parseInt(value, 10);
    if (!isNaN(qty)) updateQuantity(productId, qty);
  };

  const handleAddService = () => {
    if (!serviceDesc.trim() || !servicePrice.trim()) { toast.error('Isi deskripsi dan harga jasa'); return; }
    const price = parseFloat(servicePrice);
    if (isNaN(price) || price <= 0) { toast.error('Harga tidak valid'); return; }
    setServiceItems(prev => [...prev, { id: Date.now(), description: serviceDesc.trim(), price }]);
    setServiceDesc(''); setServicePrice('');
    setShowServiceInput(false);
    toast.success('Jasa ditambahkan');
  };

  const removeService = (id: number) => {
    setServiceItems(prev => prev.filter(s => s.id !== id));
  };

  const handleCheckout = (method: PaymentMethod) => {
    setPendingPaymentMethod(method);
    setShowCustomerModal(true);
  };

  const handleOwnerWithdrawal = () => {
    if (items.length === 0 && serviceItems.length === 0) { toast.error('Keranjang kosong'); return; }
    setIsOwnerWithdrawal(true);
    setPendingPaymentMethod('cash');
    setShowCustomerModal(true);
  };

  const handleCustomerSelected = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(false);
    if (isOwnerWithdrawal) {
      processOwnerWithdrawal();
    } else if (pendingPaymentMethod) {
      setPaymentMethod(pendingPaymentMethod);
      setPendingPaymentMethod(null);
    }
  };

  const processOwnerWithdrawal = () => {
    const now = new Date();
    const sale: Sale = {
      id: Date.now(), store_id: activeStoreId, user_id: 1,
      customer_id: selectedCustomer?.id || null,
      invoice_number: `OWN-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-3)}`,
      date: now, sub_total: grandTotal, discount: grandTotal, tax: 0, grand_total: 0,
      payment_method: 'cash', payment_status: 'paid',
      amount_received: 0, change_amount: 0,
      note: 'Pengambilan Owner',
      created_at: now, updated_at: now,
    };
    const details: (SaleDetail & { product?: Product })[] = items.map((item, idx) => ({
      id: Date.now() + idx, sale_id: sale.id, product_id: item.product.id,
      quantity: item.quantity, price_at_sale: item.price_per_unit, cost_at_sale: item.product.cost_price,
      total_price: item.price_per_unit * item.quantity, price_mode: item.price_mode, product: item.product,
      created_at: now, updated_at: now,
    }));
    setCurrentSale(sale); setCurrentSaleDetails(details); clearCart(); setServiceItems([]);
    setShowReceipt(true); setSelectedCustomer(null); setIsOwnerWithdrawal(false); setPendingPaymentMethod(null);
    // Close the bill after payment
    closeBill(activeBillId);
    toast.success('Pengambilan Owner berhasil dicatat!');
  };

  const handleConfirmPayment = (amountPaid: number) => {
    const now = new Date();
    const sale: Sale = {
      id: Date.now(), store_id: activeStoreId, user_id: 1,
      customer_id: selectedCustomer?.id || null,
      invoice_number: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-3)}`,
      date: now, sub_total: grandTotal, discount: 0, tax: 0, grand_total: grandTotal,
      payment_method: paymentMethod!, payment_status: isDebt ? 'debt' : 'paid',
      amount_received: isDebt ? 0 : amountPaid, change_amount: isDebt ? 0 : Math.max(0, amountPaid - grandTotal),
      due_date: isDebt && dueDate ? new Date(dueDate) : null,
      created_at: now, updated_at: now,
    };
    const details: (SaleDetail & { product?: Product })[] = [
      ...items.map((item, idx) => ({
        id: Date.now() + idx, sale_id: sale.id, product_id: item.product.id,
        quantity: item.quantity, price_at_sale: item.price_per_unit, cost_at_sale: item.product.cost_price,
        total_price: item.price_per_unit * item.quantity, price_mode: item.price_mode, product: item.product,
        created_at: now, updated_at: now,
      })),
      ...serviceItems.map((svc, idx) => ({
        id: Date.now() + items.length + idx, sale_id: sale.id, product_id: 0,
        quantity: 1, price_at_sale: svc.price, cost_at_sale: 0,
        total_price: svc.price, price_mode: 'retail' as const,
        product: { name: `🔧 ${svc.description}`, id: 0, store_id: activeStoreId, code: '', quantity: 999, min_stock_alert: 0, cost_price: 0, selling_price: svc.price, selling_price_retail: svc.price, selling_price_wholesale: svc.price, selling_price_special: svc.price, wholesale_min_qty: 1, special_min_qty: 1, is_active: true, created_at: now, updated_at: now, created_by: null, updated_by: null, category_id: null, brand_id: null, unit_id: null } as Product,
        created_at: now, updated_at: now,
      })),
    ];
    setCurrentSale(sale); setCurrentSaleDetails(details); setPaymentMethod(null);
    setShowReceipt(true); clearCart(); setServiceItems([]); setSelectedCustomer(null); setIsDebt(false); setDueDate('');
    // Close the bill after successful payment
    closeBill(activeBillId);
    toast.success(isDebt ? 'Penjualan (Utang) berhasil dicatat!' : 'Pembayaran berhasil!');
  };

  const handleRefund = (sale: Sale, reason: string) => {
    processRefund(sale, reason, user?.name || 'Kasir');
    toast.success(`Refund ${sale.invoice_number} berhasil! Stok dikembalikan.`);
  };

  // Active bill count for badge
  const activeBillCount = bills.filter(b => b.items.length > 0 || b.serviceItems.length > 0 || (b.id === activeBillId && (items.length > 0 || serviceItems.length > 0))).length;

  return (
    <div className="h-screen flex flex-col bg-[hsl(var(--pos-background))]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-card))]">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-[hsl(var(--pos-foreground))]">KASIR</h1>
          {activeBillCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[hsl(var(--pos-accent))] text-[hsl(var(--pos-accent-foreground))] text-xs font-bold">
              {activeBillCount} bill
            </span>
          )}
          {canSwitchStore ? (
            <div className="relative">
              <select
                value={activeStoreId}
                onChange={(e) => { setActiveStoreId(Number(e.target.value)); clearCart(); setServiceItems([]); setBills([createBill()]); }}
                className="appearance-none pl-7 pr-6 py-1.5 rounded-lg text-sm font-semibold border border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-card))] text-[hsl(var(--pos-foreground))] cursor-pointer focus:outline-none focus:border-[hsl(var(--pos-accent))]"
              >
                {stores.filter(s => accessibleStoreIds.includes(s.id) || user?.role === 'owner').map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <Building2 className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--pos-muted-foreground))] pointer-events-none" />
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--pos-muted-foreground))] pointer-events-none" />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--pos-muted-foreground))]">
              <Building2 className="w-3.5 h-3.5" />
              <span className="font-semibold">{activeStore?.name || 'Toko'}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Refund button - owner/admin only */}
          {canAccessMenu(user?.role, 'reports') && (
            <button onClick={() => setShowRefund(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 text-sm font-medium transition-colors">
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Refund</span>
            </button>
          )}
          <button onClick={() => setScannerActive(!scannerActive)} className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
            scannerActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-[hsl(var(--pos-muted))] text-[hsl(var(--pos-muted-foreground))]'
          )}>
            <ScanBarcode className="w-4 h-4" />
          </button>
          {canAccessMenu(user?.role, 'dashboard') && (
            <Link to="/backoffice" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[hsl(var(--pos-muted))] text-[hsl(var(--pos-foreground))] hover:bg-[hsl(var(--pos-border))] text-sm">
              <Settings className="w-4 h-4" /><span className="hidden sm:inline font-medium">Office</span>
            </Link>
          )}
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[hsl(var(--pos-accent))] text-[hsl(var(--pos-accent-foreground))]">
            {user?.role === 'owner' ? <ShieldCheck className="w-3.5 h-3.5" /> : user?.role === 'admin' ? <UserCog className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
            <span className="text-sm font-bold">{user?.name || 'User'}</span>
          </div>
          <button onClick={() => { logout(); navigate('/login'); toast.success('Logout berhasil'); }} className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Bill Tabs */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-muted))] overflow-x-auto">
        {bills.map(bill => {
          const isActive = bill.id === activeBillId;
          const billItems = isActive ? items : bill.items;
          const billSvc = isActive ? serviceItems : bill.serviceItems;
          const hasItems = billItems.length > 0 || billSvc.length > 0;
          return (
            <div
              key={bill.id}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-sm font-semibold cursor-pointer transition-colors shrink-0 group',
                isActive
                  ? 'bg-[hsl(var(--pos-card))] text-[hsl(var(--pos-foreground))] shadow-sm border border-b-0 border-[hsl(var(--pos-border))]'
                  : 'text-[hsl(var(--pos-muted-foreground))] hover:bg-[hsl(var(--pos-card))]/50'
              )}
            >
              <span onClick={() => switchToBill(bill.id)} className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                {bill.label}
                {hasItems && (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                    isActive ? 'bg-[hsl(var(--pos-accent))] text-[hsl(var(--pos-accent-foreground))]' : 'bg-[hsl(var(--pos-border))] text-[hsl(var(--pos-muted-foreground))]'
                  )}>
                    {billItems.length + billSvc.length}
                  </span>
                )}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); closeBill(bill.id); }}
                className="p-0.5 rounded hover:bg-[hsl(var(--pos-border))] text-[hsl(var(--pos-muted-foreground))] hover:text-[hsl(var(--pos-foreground))] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
        <button
          onClick={addNewBill}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-bold text-[hsl(var(--pos-muted-foreground))] hover:text-[hsl(var(--pos-foreground))] hover:bg-[hsl(var(--pos-card))]/50 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Baru
        </button>
      </div>

      {/* Main: 2-column layout — Left: product list, Right: cart */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Product Catalog */}
        <div className="w-80 lg:w-96 shrink-0 flex flex-col">
          {/* Search in product panel */}
          <div className="px-3 py-2 border-b border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-card))]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--pos-muted-foreground))]" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="🔍 Ketik / scan barcode + ENTER"
                className="w-full pl-10 pr-3 py-2.5 text-sm font-medium rounded-lg border-2 border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-background))] text-[hsl(var(--pos-foreground))] placeholder:text-[hsl(var(--pos-muted-foreground))] focus:border-[hsl(var(--pos-accent))] focus:outline-none"
              />
            </div>
          </div>
          <ProductListPanel
            products={storeProducts}
            onAddProduct={(product) => {
              if (product.quantity > 0) { addItem(product); toast.success(`${product.name} ditambahkan`, { duration: 1000 }); }
              else toast.error(`${product.name} stok habis`);
            }}
          />
        </div>

        {/* RIGHT: Cart (spreadsheet) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[hsl(var(--pos-accent))] text-[hsl(var(--pos-accent-foreground))]">
                  <th className="text-left px-3 py-2.5 text-sm font-bold w-10 border-r border-[hsl(var(--pos-accent-foreground))]/20">No</th>
                  <th className="text-left px-3 py-2.5 text-sm font-bold border-r border-[hsl(var(--pos-accent-foreground))]/20">Nama Barang</th>
                  <th className="text-center px-2 py-2.5 text-sm font-bold w-20 border-r border-[hsl(var(--pos-accent-foreground))]/20">Mode</th>
                  <th className="text-right px-3 py-2.5 text-sm font-bold w-32 border-r border-[hsl(var(--pos-accent-foreground))]/20">Harga</th>
                  <th className="text-center px-2 py-2.5 text-sm font-bold w-20 border-r border-[hsl(var(--pos-accent-foreground))]/20">Qty</th>
                  <th className="text-right px-3 py-2.5 text-sm font-bold w-36 border-r border-[hsl(var(--pos-accent-foreground))]/20">Subtotal</th>
                  <th className="text-center px-2 py-2.5 text-sm font-bold w-12">×</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && serviceItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-[hsl(var(--pos-muted-foreground))]">
                      <div className="text-5xl mb-3">📦</div>
                      <p className="text-xl font-bold">Belum ada barang</p>
                      <p className="text-sm mt-1">Pilih dari daftar di kiri atau scan barcode</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {items.map((item, index) => (
                      <tr
                        key={item.product.id}
                        className={cn(
                          'border-b border-[hsl(var(--pos-border))] transition-colors',
                          index % 2 === 0 ? 'bg-[hsl(var(--pos-card))]' : 'bg-[hsl(var(--pos-background))]',
                          'hover:bg-[hsl(var(--pos-accent))]/5'
                        )}
                      >
                        <td className="px-3 py-2 text-sm font-bold text-[hsl(var(--pos-muted-foreground))] border-r border-[hsl(var(--pos-border))]">{index + 1}</td>
                        <td className="px-3 py-2 border-r border-[hsl(var(--pos-border))]">
                          <p className="text-sm font-bold text-[hsl(var(--pos-foreground))]">{item.product.name}</p>
                          <p className="text-[10px] text-[hsl(var(--pos-muted-foreground))] mt-0.5">
                            E:{formatCurrency(item.product.selling_price_retail)} · G:{formatCurrency(item.product.selling_price_wholesale)} · S:{formatCurrency(item.product.selling_price_special)}
                          </p>
                        </td>
                        <td className="px-1 py-2 text-center border-r border-[hsl(var(--pos-border))]">
                          <button
                            onClick={() => {
                              const modes: PriceMode[] = ['retail', 'wholesale', 'special'];
                              const idx = modes.indexOf(item.price_mode);
                              setPriceMode(item.product.id, modes[(idx + 1) % modes.length]);
                            }}
                            className={cn(
                              'px-1.5 py-1 rounded text-[11px] font-bold transition-colors w-full',
                              item.price_mode === 'special' ? 'bg-emerald-100 text-emerald-800'
                                : item.price_mode === 'wholesale' ? 'bg-blue-100 text-blue-800'
                                : 'bg-orange-100 text-orange-800'
                            )}
                          >
                            {item.price_mode === 'special' ? 'SPL' : item.price_mode === 'wholesale' ? 'GRS' : 'ECR'}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-bold text-[hsl(var(--pos-foreground))] border-r border-[hsl(var(--pos-border))] tabular-nums">
                          {formatCurrency(item.price_per_unit)}
                        </td>
                        <td className="px-1 py-2 text-center border-r border-[hsl(var(--pos-border))]">
                          <input
                            type="number" min="1" value={item.quantity}
                            onChange={(e) => handleQtyChange(item.product.id, e.target.value)}
                            className="w-16 text-center text-sm font-bold rounded border-2 border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-card))] text-[hsl(var(--pos-foreground))] py-1.5 focus:border-[hsl(var(--pos-accent))] focus:outline-none mx-auto block"
                            onKeyDown={(e) => { if (e.key === 'Enter') searchRef.current?.focus(); }}
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-extrabold text-[hsl(var(--pos-accent))] border-r border-[hsl(var(--pos-border))] tabular-nums">
                          {formatCurrency(item.price_per_unit * item.quantity)}
                        </td>
                        <td className="px-1 py-2 text-center">
                          <button onClick={() => removeItem(item.product.id)} className="p-1.5 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Service Items */}
                    {serviceItems.map((svc, index) => (
                      <tr
                        key={`svc-${svc.id}`}
                        className={cn(
                          'border-b border-[hsl(var(--pos-border))] transition-colors bg-amber-50/50',
                          'hover:bg-amber-50'
                        )}
                      >
                        <td className="px-3 py-2 text-sm font-bold text-[hsl(var(--pos-muted-foreground))] border-r border-[hsl(var(--pos-border))]">{items.length + index + 1}</td>
                        <td className="px-3 py-2 border-r border-[hsl(var(--pos-border))]" colSpan={1}>
                          <div className="flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5 text-amber-600" />
                            <p className="text-sm font-bold text-amber-800">{svc.description}</p>
                          </div>
                          <p className="text-[10px] text-amber-600 mt-0.5">Biaya Jasa</p>
                        </td>
                        <td className="px-1 py-2 text-center border-r border-[hsl(var(--pos-border))]">
                          <span className="px-1.5 py-1 rounded text-[11px] font-bold bg-amber-100 text-amber-800">JASA</span>
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-bold text-[hsl(var(--pos-foreground))] border-r border-[hsl(var(--pos-border))] tabular-nums">
                          {formatCurrency(svc.price)}
                        </td>
                        <td className="px-1 py-2 text-center border-r border-[hsl(var(--pos-border))]">
                          <span className="text-sm font-bold text-[hsl(var(--pos-muted-foreground))]">1</span>
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-extrabold text-[hsl(var(--pos-accent))] border-r border-[hsl(var(--pos-border))] tabular-nums">
                          {formatCurrency(svc.price)}
                        </td>
                        <td className="px-1 py-2 text-center">
                          <button onClick={() => removeService(svc.id)} className="p-1.5 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Service Input Row */}
          {showServiceInput && (
            <div className="px-4 py-2 border-t border-[hsl(var(--pos-border))] bg-amber-50/30 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
              <input
                type="text" placeholder="Deskripsi jasa (mis: Pasang AC)"
                value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-card))] focus:border-[hsl(var(--pos-accent))] focus:outline-none"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddService(); }}
              />
              <input
                type="number" placeholder="Harga"
                value={servicePrice} onChange={(e) => setServicePrice(e.target.value)}
                className="w-32 px-3 py-2 text-sm rounded-lg border border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-card))] text-right focus:border-[hsl(var(--pos-accent))] focus:outline-none"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddService(); }}
              />
              <button onClick={handleAddService} className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold">
                <Plus className="w-4 h-4" />
              </button>
              <button onClick={() => { setShowServiceInput(false); setServiceDesc(''); setServicePrice(''); }} className="px-2 py-2 text-[hsl(var(--pos-muted-foreground))] hover:text-[hsl(var(--pos-foreground))]">
                ✕
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="border-t-2 border-[hsl(var(--pos-accent))] bg-[hsl(var(--pos-card))] px-4 py-2.5">
            {selectedCustomer && (
              <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-[hsl(var(--pos-accent))]/10 rounded-lg w-fit">
                <User className="w-3.5 h-3.5 text-[hsl(var(--pos-accent))]" />
                <span className="text-sm font-bold">{selectedCustomer.name}</span>
                <span className="text-xs text-[hsl(var(--pos-muted-foreground))]">• {selectedCustomer.phone}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-xs text-[hsl(var(--pos-muted-foreground))] font-medium">
                    TOTAL ({items.length} item{serviceItems.length > 0 ? ` + ${serviceItems.length} jasa` : ''})
                  </span>
                  <div className="text-2xl font-black text-[hsl(var(--pos-foreground))] tabular-nums">{formatCurrency(grandTotal)}</div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={isDebt} onChange={(e) => setIsDebt(e.target.checked)} className="w-4 h-4 rounded border-2 accent-[hsl(var(--pos-accent))]" />
                  <span className="text-sm font-bold text-[hsl(var(--pos-foreground))]">Utang</span>
                </label>
                {isDebt && (
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-[hsl(var(--pos-border))] text-xs font-medium bg-[hsl(var(--pos-background))]" />
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Add Service Button */}
                <button onClick={() => setShowServiceInput(!showServiceInput)}
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-sm font-extrabold transition-colors flex items-center gap-1.5",
                    showServiceInput ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                  )}>
                  <Wrench className="w-4 h-4" /> JASA
                </button>

                <button onClick={() => { if (items.length === 0 && serviceItems.length === 0) { toast.error('Keranjang kosong'); return; } setShowShipping(true); }}
                  disabled={items.length === 0 && serviceItems.length === 0}
                  className="px-3 py-2.5 rounded-xl bg-[hsl(var(--pos-muted))] hover:bg-[hsl(var(--pos-border))] text-[hsl(var(--pos-foreground))] text-sm font-extrabold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">
                  <Truck className="w-4 h-4" /> KIRIM
                </button>

                {/* Owner withdrawal button */}
                {user?.role === 'owner' && (
                  <button onClick={handleOwnerWithdrawal}
                    disabled={items.length === 0 && serviceItems.length === 0}
                    className="px-4 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-extrabold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">
                    <Crown className="w-4 h-4" /> AMBIL
                  </button>
                )}

                {isDebt ? (
                  <button onClick={() => { if (items.length === 0 && serviceItems.length === 0) { toast.error('Keranjang kosong'); return; } setPendingPaymentMethod('cash'); setShowCustomerModal(true); }}
                    disabled={items.length === 0 && serviceItems.length === 0}
                    className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-extrabold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    💳 SIMPAN UTANG
                  </button>
                ) : (
                  <>
                    <button onClick={() => handleCheckout('cash')} disabled={items.length === 0 && serviceItems.length === 0}
                      className="px-5 py-2.5 rounded-xl bg-[hsl(var(--pos-accent))] hover:bg-[hsl(var(--pos-accent-hover))] text-[hsl(var(--pos-accent-foreground))] text-sm font-extrabold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      💵 TUNAI
                    </button>
                    <button onClick={() => handleCheckout('transfer')} disabled={items.length === 0 && serviceItems.length === 0}
                      className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-extrabold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      💳 TRANSFER
                    </button>
                    <button onClick={() => handleCheckout('qris')} disabled={items.length === 0 && serviceItems.length === 0}
                      className="px-5 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-extrabold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      📱 QRIS
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CustomerModal isOpen={showCustomerModal} onClose={() => { setShowCustomerModal(false); setPendingPaymentMethod(null); setIsOwnerWithdrawal(false); }}
        storeId={activeStoreId} onSelectCustomer={handleCustomerSelected} selectedCustomer={selectedCustomer} requireCustomer={isDebt} />
      {paymentMethod && !isDebt && (
        <PaymentModal isOpen={!!paymentMethod} onClose={() => setPaymentMethod(null)} items={items} total={grandTotal}
          paymentMethod={paymentMethod} onConfirm={handleConfirmPayment} customer={selectedCustomer} />
      )}
      <ShippingModal isOpen={showShipping} onClose={() => setShowShipping(false)} items={items} total={grandTotal} customer={selectedCustomer} />
      <ReceiptModal isOpen={showReceipt} onClose={() => setShowReceipt(false)} sale={currentSale} saleDetails={currentSaleDetails}
        cashierName={user?.name || 'Kasir'} customerName={currentSale?.customer_id ? customers.find(c => c.id === currentSale.customer_id)?.name : undefined} />
      <RefundModal isOpen={showRefund} onClose={() => setShowRefund(false)} storeId={activeStoreId} onRefund={handleRefund} />
    </div>
  );
}
