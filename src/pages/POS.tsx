import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { CustomerModal } from '@/components/pos/CustomerModal';
import { getProductsForStore, stores, customers } from '@/data/sampleData';
import { PaymentMethod, Sale, SaleDetail, Product, Customer, PriceMode } from '@/types/pos';
import { Settings, LogOut, User, ShieldCheck, UserCog, ScanBarcode, Building2, Trash2, Search, ChevronDown, Truck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { canAccessMenu } from '@/contexts/AuthContext';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ProductListPanel } from '@/components/pos/ProductListPanel';
import { ShippingModal } from '@/components/pos/ShippingModal';

export default function POS() {
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

  const searchRef = useRef<HTMLInputElement>(null);
  const { user, logout, activeStoreId, setActiveStoreId, canSwitchStore, accessibleStoreIds } = useAuth();
  const navigate = useNavigate();

  const { items, addItem, removeItem, updateQuantity, clearCart, total, setPriceMode, setItems } = useCart();

  const storeProducts = useMemo(() => getProductsForStore(activeStoreId), [activeStoreId]);
  const activeStore = stores.find(s => s.id === activeStoreId);

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

  const handleCheckout = (method: PaymentMethod) => {
    setPendingPaymentMethod(method);
    setShowCustomerModal(true);
  };

  const handleCustomerSelected = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(false);
    if (pendingPaymentMethod) { setPaymentMethod(pendingPaymentMethod); setPendingPaymentMethod(null); }
  };

  const handleConfirmPayment = (amountPaid: number) => {
    const now = new Date();
    const sale: Sale = {
      id: Date.now(), store_id: activeStoreId, user_id: 1,
      customer_id: selectedCustomer?.id || null,
      invoice_number: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-3)}`,
      date: now, sub_total: total, discount: 0, tax: 0, grand_total: total,
      payment_method: paymentMethod!, payment_status: isDebt ? 'debt' : 'paid',
      amount_received: isDebt ? 0 : amountPaid, change_amount: isDebt ? 0 : Math.max(0, amountPaid - total),
      due_date: isDebt && dueDate ? new Date(dueDate) : null,
      created_at: now, updated_at: now,
    };
    const details: (SaleDetail & { product?: Product })[] = items.map((item, idx) => ({
      id: Date.now() + idx, sale_id: sale.id, product_id: item.product.id,
      quantity: item.quantity, price_at_sale: item.price_per_unit, cost_at_sale: item.product.cost_price,
      total_price: item.price_per_unit * item.quantity, price_mode: item.price_mode, product: item.product,
      created_at: now, updated_at: now,
    }));
    setCurrentSale(sale); setCurrentSaleDetails(details); setPaymentMethod(null);
    setShowReceipt(true); clearCart(); setSelectedCustomer(null); setIsDebt(false); setDueDate('');
    toast.success(isDebt ? 'Penjualan (Utang) berhasil dicatat!' : 'Pembayaran berhasil!');
  };

  return (
    <div className="h-screen flex flex-col bg-[hsl(var(--pos-background))]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-card))]">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-[hsl(var(--pos-foreground))]">KASIR</h1>
          {canSwitchStore ? (
            <div className="relative">
              <select
                value={activeStoreId}
                onChange={(e) => { setActiveStoreId(Number(e.target.value)); clearCart(); }}
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
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-[hsl(var(--pos-muted-foreground))]">
                      <div className="text-5xl mb-3">📦</div>
                      <p className="text-xl font-bold">Belum ada barang</p>
                      <p className="text-sm mt-1">Pilih dari daftar di kiri atau scan barcode</p>
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>

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
                  <span className="text-xs text-[hsl(var(--pos-muted-foreground))] font-medium">TOTAL ({items.length} item)</span>
                  <div className="text-2xl font-black text-[hsl(var(--pos-foreground))] tabular-nums">{formatCurrency(total)}</div>
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
                <button onClick={() => { if (items.length === 0) { toast.error('Keranjang kosong'); return; } setShowShipping(true); }}
                  disabled={items.length === 0}
                  className="px-3 py-2.5 rounded-xl bg-[hsl(var(--pos-muted))] hover:bg-[hsl(var(--pos-border))] text-[hsl(var(--pos-foreground))] text-sm font-extrabold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">
                  <Truck className="w-4 h-4" /> KIRIM
                </button>
                {isDebt ? (
                  <button onClick={() => { if (items.length === 0) { toast.error('Keranjang kosong'); return; } setPendingPaymentMethod('cash'); setShowCustomerModal(true); }}
                    disabled={items.length === 0}
                    className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-extrabold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    💳 SIMPAN UTANG
                  </button>
                ) : (
                  <>
                    <button onClick={() => handleCheckout('cash')} disabled={items.length === 0}
                      className="px-5 py-2.5 rounded-xl bg-[hsl(var(--pos-accent))] hover:bg-[hsl(var(--pos-accent-hover))] text-[hsl(var(--pos-accent-foreground))] text-sm font-extrabold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      💵 TUNAI
                    </button>
                    <button onClick={() => handleCheckout('transfer')} disabled={items.length === 0}
                      className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-extrabold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      💳 TRANSFER
                    </button>
                    <button onClick={() => handleCheckout('qris')} disabled={items.length === 0}
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
      <CustomerModal isOpen={showCustomerModal} onClose={() => { setShowCustomerModal(false); setPendingPaymentMethod(null); }}
        storeId={activeStoreId} onSelectCustomer={handleCustomerSelected} selectedCustomer={selectedCustomer} requireCustomer={isDebt} />
      {paymentMethod && !isDebt && (
        <PaymentModal isOpen={!!paymentMethod} onClose={() => setPaymentMethod(null)} items={items} total={total}
          paymentMethod={paymentMethod} onConfirm={handleConfirmPayment} customer={selectedCustomer} />
      )}
      <ShippingModal isOpen={showShipping} onClose={() => setShowShipping(false)} items={items} total={total} customer={selectedCustomer} />
      <ReceiptModal isOpen={showReceipt} onClose={() => setShowReceipt(false)} sale={currentSale} saleDetails={currentSaleDetails}
        cashierName={user?.name || 'Kasir'} customerName={currentSale?.customer_id ? customers.find(c => c.id === currentSale.customer_id)?.name : undefined} />
    </div>
  );
}
