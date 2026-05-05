import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { RefundModal } from '@/components/pos/RefundModal';
import { getProductsForStore, stores, customers, processRefund, addSale } from '@/data/sampleData';
import { addShipment } from '@/data/shippingStore';
import { PaymentMethod, Sale, SaleDetail, Product, Customer, PriceMode, ServiceItem, CartItem } from '@/types/pos';
import { Settings, LogOut, User, ShieldCheck, UserCog, ScanBarcode, Building2, Trash2, Search, ChevronDown, Truck, Wrench, Plus, Crown, X, RotateCcw, FileText, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { canAccessMenu } from '@/contexts/AuthContext';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ProductListPanel } from '@/components/pos/ProductListPanel';
import { ShippingModal } from '@/components/pos/ShippingModal';
import { DebtModal } from '@/components/pos/DebtModal';

// ========== OPEN BILL TYPES ==========
interface Bill {
  id: number;
  label: string;
  customerName: string;
  items: CartItem[];
  serviceItems: ServiceItem[];
  selectedCustomer: Customer | null;
}

// Find the smallest available bill number starting from 1
function findNextBillNumber(bills: Bill[]): number {
  const usedNumbers = new Set(bills.map(b => b.id));
  let num = 1;
  while (usedNumbers.has(num)) num++;
  return num;
}

function createBillWithNumber(num: number): Bill {
  return { id: num, label: `Bill ${num}`, customerName: '', items: [], serviceItems: [], selectedCustomer: null };
}

const MAX_BILLS = 10;

export default function POS() {
  // ========== OPEN BILL STATE ==========
  const [bills, setBills] = useState<Bill[]>(() => [createBillWithNumber(1)]);
  const [activeBillId, setActiveBillId] = useState<number>(() => 1);
  const _activeBill = bills.find(b => b.id === activeBillId) || bills[0];
  const { items, addItem, removeItem, updateQuantity, clearCart, total, setPriceMode, setItems } = useCart();
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);

  const saveBillState = useCallback(() => {
    setBills(prev => prev.map(b =>
      b.id === activeBillId ? { ...b, items: [...items], serviceItems: [...serviceItems], selectedCustomer: selectedCustomerRef.current } : b
    ));
  }, [activeBillId, items, serviceItems]);

  const selectedCustomerRef = useRef<Customer | null>(null);

  const switchToBill = useCallback((billId: number) => {
    if (billId === activeBillId) return;
    saveBillState();
    const target = bills.find(b => b.id === billId);
    if (target) { setActiveBillId(billId); setItems(target.items); setServiceItems(target.serviceItems); setSelectedCustomer(target.selectedCustomer); }
  }, [activeBillId, bills, saveBillState, setItems]);

  const addNewBill = useCallback(() => {
    if (bills.length >= MAX_BILLS) { toast.error(`Maksimal ${MAX_BILLS} bill terbuka`); return; }
    saveBillState();
    const num = findNextBillNumber(bills);
    const newBill = createBillWithNumber(num);
    setBills(prev => [...prev, newBill]);
    setActiveBillId(newBill.id); clearCart(); setServiceItems([]); setSelectedCustomer(null);
  }, [bills, saveBillState, clearCart]);

  const closeBill = useCallback((billId: number) => {
    if (bills.length <= 1) {
      clearCart(); setServiceItems([]); setSelectedCustomer(null);
      const fresh = createBillWithNumber(1);
      setBills([fresh]); setActiveBillId(fresh.id);
      return;
    }
    const remaining = bills.filter(b => b.id !== billId);
    setBills(remaining);
    if (activeBillId === billId) {
      const next = remaining[0];
      setActiveBillId(next.id); setItems(next.items); setServiceItems(next.serviceItems); setSelectedCustomer(next.selectedCustomer);
    }
  }, [bills, activeBillId, clearCart, setItems]);

  // ========== EXISTING STATE ==========
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [currentSaleDetails, setCurrentSaleDetails] = useState<(SaleDetail & { product?: Product })[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDebt, setIsDebt] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [showShipping, setShowShipping] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [serviceDesc, setServiceDesc] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [showServiceInput, setShowServiceInput] = useState(false);
  const [isOwnerWithdrawal, setIsOwnerWithdrawal] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const { user, logout, activeStoreId, setActiveStoreId, canSwitchStore, accessibleStoreIds } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { selectedCustomerRef.current = selectedCustomer; }, [selectedCustomer]);

  const storeProducts = useMemo(() => getProductsForStore(activeStoreId), [activeStoreId]);
  const activeStore = stores.find(s => s.id === activeStoreId);
  const serviceTotal = useMemo(() => serviceItems.reduce((sum, s) => sum + s.price, 0), [serviceItems]);
  const grandTotal = total + serviceTotal;

  useEffect(() => { searchRef.current?.focus(); }, []);
  // Note: Debt flow now handled via DebtModal — no auto-trigger.

  useBarcodeScanner({
    onScan: (barcode) => {
      const product = storeProducts.find(p => p.code === barcode);
      if (product) { if (product.quantity > 0) { addItem(product); toast.success(`${product.name} ditambahkan`, { duration: 1500 }); } else toast.error(`${product.name} stok habis`); }
      else toast.error(`Produk tidak ditemukan: ${barcode}`);
    },
    enabled: scannerActive && !paymentMethod && !showReceipt,
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

  const handleQtyChange = (productId: number, value: string) => { const qty = parseInt(value, 10); if (!isNaN(qty)) updateQuantity(productId, qty); };

  const handleAddService = () => {
    if (!serviceDesc.trim() || !servicePrice.trim()) { toast.error('Isi deskripsi dan harga jasa'); return; }
    const price = parseFloat(servicePrice);
    if (isNaN(price) || price <= 0) { toast.error('Harga tidak valid'); return; }
    setServiceItems(prev => [...prev, { id: Date.now(), description: serviceDesc.trim(), price }]);
    setServiceDesc(''); setServicePrice(''); setShowServiceInput(false); toast.success('Jasa ditambahkan');
  };

  const removeService = (id: number) => { setServiceItems(prev => prev.filter(s => s.id !== id)); };

  // Direct checkout — open combined payment modal
  const handleCheckout = (method: PaymentMethod) => {
    if (items.length === 0 && serviceItems.length === 0) { toast.error('Keranjang kosong'); return; }
    setPaymentMethod(method);
  };

  const handleOwnerWithdrawal = () => {
    if (items.length === 0 && serviceItems.length === 0) { toast.error('Keranjang kosong'); return; }
    setIsOwnerWithdrawal(true);
    processOwnerWithdrawal();
  };

  const processOwnerWithdrawal = () => {
    const now = new Date();
    const sale: Sale = {
      id: Date.now(), store_id: activeStoreId, user_id: 1, customer_id: selectedCustomer?.id || null,
      invoice_number: `OWN-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-3)}`,
      date: now, sub_total: grandTotal, discount: grandTotal, tax: 0, grand_total: 0,
      payment_method: 'cash', payment_status: 'paid', amount_received: 0, change_amount: 0, note: 'Pengambilan Owner', created_at: now, updated_at: now,
    };
    const details: (SaleDetail & { product?: Product })[] = items.map((item, idx) => ({
      id: Date.now() + idx, sale_id: sale.id, product_id: item.product.id, quantity: item.quantity, price_at_sale: item.price_per_unit, cost_at_sale: item.product.cost_price,
      total_price: item.price_per_unit * item.quantity, price_mode: item.price_mode, product: item.product, created_at: now, updated_at: now,
    }));
    setCurrentSale(sale); setCurrentSaleDetails(details); clearCart(); setServiceItems([]);
    setShowReceipt(true); setSelectedCustomer(null); setIsOwnerWithdrawal(false);
    closeBill(activeBillId); toast.success('Pengambilan Owner berhasil dicatat!');
  };

  const handleCustomerChangeInPayment = (customer: Customer | null) => {
    setSelectedCustomer(customer);
  };

  const handleConfirmPayment = (amountPaid: number) => {
    const now = new Date();
    const sale: Sale = {
      id: Date.now(), store_id: activeStoreId, user_id: 1, customer_id: selectedCustomer?.id || null,
      invoice_number: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-3)}`,
      date: now, sub_total: grandTotal, discount: 0, tax: 0, grand_total: grandTotal,
      payment_method: paymentMethod!, payment_status: isDebt ? 'debt' : 'paid',
      amount_received: isDebt ? 0 : amountPaid, change_amount: isDebt ? 0 : Math.max(0, amountPaid - grandTotal),
      due_date: isDebt && dueDate ? new Date(dueDate) : null, created_at: now, updated_at: now,
    };
    const details: (SaleDetail & { product?: Product })[] = [
      ...items.map((item, idx) => ({
        id: Date.now() + idx, sale_id: sale.id, product_id: item.product.id, quantity: item.quantity, price_at_sale: item.price_per_unit, cost_at_sale: item.product.cost_price,
        total_price: item.price_per_unit * item.quantity, price_mode: item.price_mode, product: item.product, created_at: now, updated_at: now,
      })),
      ...serviceItems.map((svc, idx) => ({
        id: Date.now() + items.length + idx, sale_id: sale.id, product_id: 0, quantity: 1, price_at_sale: svc.price, cost_at_sale: 0,
        total_price: svc.price, price_mode: 'retail' as const,
        product: { name: `🔧 ${svc.description}`, id: 0, store_id: activeStoreId, code: '', quantity: 999, min_stock_alert: 0, cost_price: 0, selling_price: svc.price, selling_price_retail: svc.price, selling_price_wholesale: svc.price, selling_price_special: svc.price, wholesale_min_qty: 1, special_min_qty: 1, is_active: true, created_at: now, updated_at: now, created_by: null, updated_by: null, category_id: null, brand_id: null, unit_id: null } as Product,
        created_at: now, updated_at: now,
      })),
    ];
    addSale(sale, details);
    setCurrentSale(sale); setCurrentSaleDetails(details); setPaymentMethod(null);
    setShowReceipt(true); clearCart(); setServiceItems([]); setSelectedCustomer(null); setIsDebt(false); setDueDate('');
    closeBill(activeBillId); toast.success(isDebt ? 'Penjualan (Utang) berhasil dicatat!' : 'Pembayaran berhasil!');
  };

  const handleConfirmDebt = (opts: { shipping?: { recipient_name: string; recipient_phone: string; recipient_address: string; shipping_cost: number; note?: string } } = {}) => {
    const now = new Date();
    const invoice = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-3)}`;
    const sale: Sale = {
      id: Date.now(), store_id: activeStoreId, user_id: 1, customer_id: selectedCustomer?.id || null,
      invoice_number: invoice,
      date: now, sub_total: grandTotal, discount: 0, tax: 0, grand_total: grandTotal,
      payment_method: 'cash', payment_status: 'debt',
      amount_received: 0, change_amount: 0,
      due_date: dueDate ? new Date(dueDate) : null,
      note: opts.shipping ? `Termasuk pengiriman ke ${opts.shipping.recipient_address}` : undefined,
      created_at: now, updated_at: now,
    };
    const details: (SaleDetail & { product?: Product })[] = [
      ...items.map((item, idx) => ({
        id: Date.now() + idx, sale_id: sale.id, product_id: item.product.id, quantity: item.quantity, price_at_sale: item.price_per_unit, cost_at_sale: item.product.cost_price,
        total_price: item.price_per_unit * item.quantity, price_mode: item.price_mode, product: item.product, created_at: now, updated_at: now,
      })),
      ...serviceItems.map((svc, idx) => ({
        id: Date.now() + items.length + idx, sale_id: sale.id, product_id: 0, quantity: 1, price_at_sale: svc.price, cost_at_sale: 0,
        total_price: svc.price, price_mode: 'retail' as const,
        product: { name: `🔧 ${svc.description}`, id: 0, store_id: activeStoreId, code: '', quantity: 999, min_stock_alert: 0, cost_price: 0, selling_price: svc.price, selling_price_retail: svc.price, selling_price_wholesale: svc.price, selling_price_special: svc.price, wholesale_min_qty: 1, special_min_qty: 1, is_active: true, created_at: now, updated_at: now, created_by: null, updated_by: null, category_id: null, brand_id: null, unit_id: null } as Product,
        created_at: now, updated_at: now,
      })),
    ];

    // Persist sale into shared store so it appears in Back Office Transactions/Debts
    addSale(sale, details);

    // If shipping requested, create linked shipment record (links sale_id + invoice)
    if (opts.shipping && selectedCustomer) {
      const itemsDesc = items.map(i => `${i.product.name} x${i.quantity}`).join(', ');
      addShipment({
        id: Date.now() + 1,
        store_id: activeStoreId,
        sale_id: sale.id,
        invoice_number: invoice,
        customer_id: selectedCustomer.id,
        recipient_name: opts.shipping.recipient_name,
        recipient_phone: opts.shipping.recipient_phone,
        recipient_address: opts.shipping.recipient_address,
        items_description: itemsDesc,
        note: opts.shipping.note,
        shipping_cost: opts.shipping.shipping_cost,
        status: 'pending',
        created_at: now,
        updated_at: now,
      });
    }

    setCurrentSale(sale); setCurrentSaleDetails(details);
    setShowReceipt(true); clearCart(); setServiceItems([]); setSelectedCustomer(null); setIsDebt(false); setDueDate('');
    setShowDebtModal(false);
    closeBill(activeBillId);
    toast.success(opts.shipping ? 'Utang & pengiriman tercatat!' : 'Penjualan (Utang) berhasil dicatat!');
  };

  const handleRefund = (sale: Sale, reason: string) => { processRefund(sale, reason, user?.name || 'Kasir'); toast.success(`Refund ${sale.invoice_number} berhasil! Stok dikembalikan.`); };

  const activeBillCount = bills.filter(b => b.items.length > 0 || b.serviceItems.length > 0 || (b.id === activeBillId && (items.length > 0 || serviceItems.length > 0))).length;

  return (
    <div className="h-screen flex flex-col bg-surface">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <h1 className="text-[15px] font-medium text-foreground">MiniPOS</h1>
          </div>
          {activeBillCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
              {activeBillCount} bill
            </span>
          )}
          {canSwitchStore ? (
            <div className="relative">
              <select value={activeStoreId}
                onChange={(e) => { setActiveStoreId(Number(e.target.value)); clearCart(); setServiceItems([]); setBills([createBillWithNumber(1)]); setActiveBillId(1); }}
                className="appearance-none pl-7 pr-6 py-1.5 rounded-lg text-[12px] font-medium border border-border bg-white text-foreground cursor-pointer focus:outline-none focus:border-primary">
                {stores.filter(s => accessibleStoreIds.includes(s.id) || user?.role === 'owner').map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
              <Building2 className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Building2 className="w-3.5 h-3.5" /><span className="font-medium">{activeStore?.name || 'Toko'}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canAccessMenu(user?.role, 'reports') && (
            <button onClick={() => setShowRefund(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent text-[12px] font-medium transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /><span className="hidden sm:inline">Refund</span>
            </button>
          )}
          <button onClick={() => setScannerActive(!scannerActive)} className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors border',
            scannerActive ? 'border-primary bg-primary-light text-primary' : 'border-border text-muted-foreground'
          )}>
            <ScanBarcode className="w-3.5 h-3.5" />
          </button>
          {canAccessMenu(user?.role, 'dashboard') && (
            <Link to="/backoffice" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent text-[12px] font-medium transition-colors">
              <Settings className="w-3.5 h-3.5" /><span className="hidden sm:inline">Office</span>
            </Link>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface text-foreground text-[12px]">
            {user?.role === 'owner' ? <ShieldCheck className="w-3.5 h-3.5 text-primary" /> : user?.role === 'admin' ? <UserCog className="w-3.5 h-3.5 text-primary" /> : <User className="w-3.5 h-3.5 text-primary" />}
            <span className="font-medium">{user?.name || 'User'}</span>
          </div>
          <button onClick={() => { logout(); navigate('/login'); toast.success('Logout berhasil'); }} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Bill Tabs */}
      <div className="flex items-center gap-0 px-4 bg-white border-b border-border overflow-x-auto">
        {bills.map(bill => {
          const isActive = bill.id === activeBillId;
          const billItems = isActive ? items : bill.items;
          const billSvc = isActive ? serviceItems : bill.serviceItems;
          const hasItems = billItems.length > 0 || billSvc.length > 0;
          return (
            <div key={bill.id}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium cursor-pointer transition-colors shrink-0 group border-b-2',
                isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}>
              <span onClick={() => switchToBill(bill.id)} className="flex items-center gap-1.5">
                <FileText className="w-3 h-3" />
                {bill.label}
                {hasItems && (
                  <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted-foreground'
                  )}>{billItems.length + billSvc.length}</span>
                )}
              </span>
              <button onClick={(e) => { e.stopPropagation(); closeBill(bill.id); }}
                className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
        <button onClick={addNewBill}
          className="flex items-center gap-1 px-3 py-2.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <Plus className="w-3 h-3" /> Baru
        </button>
      </div>

      {/* Main: 2-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Product Catalog */}
        <div className="w-80 lg:w-96 shrink-0 flex flex-col border-r border-border">
          <div className="px-3 py-2 border-b border-border bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input ref={searchRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearchKeyDown}
                placeholder="Ketik / scan barcode + ENTER"
                className="w-full pl-9 pr-3 py-2 text-[13px] rounded-lg border border-border bg-surface text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
          <ProductListPanel products={storeProducts} onAddProduct={(product) => {
            if (product.quantity > 0) { addItem(product); toast.success(`${product.name} ditambahkan`, { duration: 1000 }); }
            else toast.error(`${product.name} stok habis`);
          }} />
        </div>

        {/* RIGHT: Cart */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-surface">
                  <th className="text-left px-3 py-2.5 text-caption w-10 border-b border-border">No</th>
                  <th className="text-left px-3 py-2.5 text-caption border-b border-border">Nama Barang</th>
                  <th className="text-center px-2 py-2.5 text-caption w-16 border-b border-border">Mode</th>
                  <th className="text-right px-3 py-2.5 text-caption w-28 border-b border-border">Harga</th>
                  <th className="text-center px-2 py-2.5 text-caption w-16 border-b border-border">Qty</th>
                  <th className="text-right px-3 py-2.5 text-caption w-32 border-b border-border">Subtotal</th>
                  <th className="text-center px-2 py-2.5 text-caption w-10 border-b border-border">×</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && serviceItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-muted-foreground">
                      <div className="text-4xl mb-3 opacity-30">📦</div>
                      <p className="text-[15px] font-medium text-foreground">Belum ada barang</p>
                      <p className="text-[12px] mt-1 text-muted-foreground">Pilih dari daftar di kiri atau scan barcode</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {items.map((item, index) => (
                      <tr key={item.product.id} className="border-b border-border hover:bg-surface/50 transition-colors">
                        <td className="px-3 py-2 text-[12px] text-muted-foreground">{index + 1}</td>
                        <td className="px-3 py-2">
                          <p className="text-[13px] font-medium text-foreground">{item.product.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            E:{formatCurrency(item.product.selling_price_retail)} · G:{formatCurrency(item.product.selling_price_wholesale)} · S:{formatCurrency(item.product.selling_price_special)}
                          </p>
                        </td>
                        <td className="px-1 py-2 text-center">
                          <button onClick={() => {
                            const modes: PriceMode[] = ['retail', 'wholesale', 'special'];
                            const idx = modes.indexOf(item.price_mode);
                            setPriceMode(item.product.id, modes[(idx + 1) % modes.length]);
                          }} className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors w-full',
                            item.price_mode === 'special' ? 'bg-primary-light text-primary'
                            : item.price_mode === 'wholesale' ? 'bg-blue-50 text-blue-600'
                            : 'bg-surface text-muted-foreground'
                          )}>
                            {item.price_mode === 'special' ? 'SPL' : item.price_mode === 'wholesale' ? 'GRS' : 'ECR'}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right text-[13px] font-medium text-foreground tabular-nums">{formatCurrency(item.price_per_unit)}</td>
                        <td className="px-1 py-2 text-center">
                          <input type="number" min="1" value={item.quantity} onChange={(e) => handleQtyChange(item.product.id, e.target.value)}
                            className="w-14 text-center text-[13px] font-medium rounded-lg border border-border bg-white text-foreground py-1 focus:border-primary focus:outline-none mx-auto block"
                            onKeyDown={(e) => { if (e.key === 'Enter') searchRef.current?.focus(); }} />
                        </td>
                        <td className="px-3 py-2 text-right text-[13px] font-medium text-primary tabular-nums">{formatCurrency(item.price_per_unit * item.quantity)}</td>
                        <td className="px-1 py-2 text-center">
                          <button onClick={() => removeItem(item.product.id)} className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Service Items */}
                    {serviceItems.map((svc, index) => (
                      <tr key={`svc-${svc.id}`} className="border-b border-border hover:bg-surface/50 transition-colors">
                        <td className="px-3 py-2 text-[12px] text-muted-foreground">{items.length + index + 1}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5 text-[hsl(40,72%,42%)]" />
                            <p className="text-[13px] font-medium text-foreground">{svc.description}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Biaya Jasa</p>
                        </td>
                        <td className="px-1 py-2 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[hsl(40,72%,42%)]/10 text-[hsl(40,72%,42%)]">JASA</span>
                        </td>
                        <td className="px-3 py-2 text-right text-[13px] font-medium text-foreground tabular-nums">{formatCurrency(svc.price)}</td>
                        <td className="px-1 py-2 text-center"><span className="text-[13px] text-muted-foreground">1</span></td>
                        <td className="px-3 py-2 text-right text-[13px] font-medium text-primary tabular-nums">{formatCurrency(svc.price)}</td>
                        <td className="px-1 py-2 text-center">
                          <button onClick={() => removeService(svc.id)} className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
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
            <div className="px-4 py-2 border-t border-border bg-white flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-[hsl(40,72%,42%)] shrink-0" />
              <input type="text" placeholder="Deskripsi jasa" value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)}
                className="flex-1 px-3 py-1.5 text-[13px] rounded-lg border border-border bg-surface focus:border-primary focus:outline-none"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddService(); }} />
              <input type="number" placeholder="Harga" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)}
                className="w-28 px-3 py-1.5 text-[13px] rounded-lg border border-border bg-surface text-right focus:border-primary focus:outline-none"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddService(); }} />
              <button onClick={handleAddService} className="px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-medium"><Plus className="w-3.5 h-3.5" /></button>
              <button onClick={() => { setShowServiceInput(false); setServiceDesc(''); setServicePrice(''); }} className="px-2 py-1.5 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-border bg-white px-4 py-3">
            {selectedCustomer && (
              <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-primary-light rounded-lg w-fit">
                <User className="w-3.5 h-3.5 text-primary" />
                <span className="text-[12px] font-medium text-primary">{selectedCustomer.name}</span>
                <span className="text-[11px] text-muted-foreground">• {selectedCustomer.phone}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-caption">TOTAL ({items.length} item{serviceItems.length > 0 ? ` + ${serviceItems.length} jasa` : ''})</span>
                  <div className="text-[22px] font-medium text-foreground tabular-nums" style={{ letterSpacing: '-0.5px' }}>{formatCurrency(grandTotal)}</div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={isDebt} onChange={(e) => setIsDebt(e.target.checked)} className="w-3.5 h-3.5 rounded border accent-primary" />
                  <span className="text-[12px] font-medium text-foreground">Utang</span>
                </label>
                {isDebt && (
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-border text-[11px] font-medium bg-surface" />
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button onClick={() => setShowServiceInput(!showServiceInput)}
                  className={cn("px-3 py-2 rounded-lg text-[12px] font-medium transition-colors flex items-center gap-1.5",
                    showServiceInput ? "bg-[hsl(40,72%,42%)] text-white" : "border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}>
                  <Wrench className="w-3.5 h-3.5" /> JASA
                </button>

                {!isDebt && user?.role === 'owner' && (
                  <div className="relative group">
                    <button onClick={handleOwnerWithdrawal} disabled={items.length === 0 && serviceItems.length === 0}
                      className="px-3 py-2 rounded-lg bg-[hsl(40,72%,42%)] hover:bg-[hsl(40,72%,36%)] text-white text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      title="Ambil produk tanpa pembayaran — tercatat sebagai pengambilan internal">
                      <Crown className="w-3.5 h-3.5" /> AMBIL (OWNER)
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-foreground text-white text-[11px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                      <Info className="w-3 h-3 inline mr-1" />
                      Ambil produk tanpa bayar — terdata sebagai pengambilan internal
                    </div>
                  </div>
                )}

                {isDebt ? (
                  <button onClick={() => {
                    if (items.length === 0 && serviceItems.length === 0) { toast.error('Keranjang kosong'); return; }
                    setShowDebtModal(true);
                  }}
                    disabled={items.length === 0 && serviceItems.length === 0}
                    className="px-4 py-2 rounded-lg bg-[hsl(40,72%,42%)] hover:bg-[hsl(40,72%,36%)] text-white text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    SIMPAN UTANG
                  </button>
                ) : (
                  <>
                    <button onClick={() => handleCheckout('cash')} disabled={items.length === 0 && serviceItems.length === 0}
                      className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      TUNAI
                    </button>
                    <button onClick={() => handleCheckout('transfer')} disabled={items.length === 0 && serviceItems.length === 0}
                      className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      TRANSFER
                    </button>
                    <button onClick={() => handleCheckout('qris')} disabled={items.length === 0 && serviceItems.length === 0}
                      className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      QRIS
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals — combined payment modal with customer selection */}
      {paymentMethod && !isDebt && (
        <PaymentModal isOpen={!!paymentMethod} onClose={() => setPaymentMethod(null)} items={items} total={grandTotal}
          paymentMethod={paymentMethod} onConfirm={handleConfirmPayment}
          storeId={activeStoreId} selectedCustomer={selectedCustomer} onCustomerChange={handleCustomerChangeInPayment}
          requireCustomer={false} />
      )}
      <ShippingModal isOpen={showShipping} onClose={() => setShowShipping(false)} items={items} total={grandTotal} customer={selectedCustomer} />
      <DebtModal
        isOpen={showDebtModal}
        onClose={() => setShowDebtModal(false)}
        items={items}
        serviceItems={serviceItems}
        total={grandTotal}
        storeId={activeStoreId}
        selectedCustomer={selectedCustomer}
        onCustomerChange={setSelectedCustomer}
        onConfirm={(opts) => handleConfirmDebt(opts)}
      />
      <ReceiptModal isOpen={showReceipt} onClose={() => setShowReceipt(false)} sale={currentSale} saleDetails={currentSaleDetails}
        cashierName={user?.name || 'Kasir'} customerName={currentSale?.customer_id ? customers.find(c => c.id === currentSale.customer_id)?.name : undefined} />
      <RefundModal isOpen={showRefund} onClose={() => setShowRefund(false)} storeId={activeStoreId} onRefund={handleRefund} />
    </div>
  );
}
