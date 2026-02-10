import { useState, useMemo, useRef, useEffect } from 'react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { ProductCard } from '@/components/pos/ProductCard';
import { CategoryTabs } from '@/components/pos/CategoryTabs';
import { CartPanel } from '@/components/pos/CartPanel';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { legacyProducts, legacyCategories, products } from '@/data/sampleData';
import { PaymentMethod, Transaction } from '@/types/pos';
import { generateTransactionId } from '@/lib/format';
import { Settings, LogOut, User, ShieldCheck, UserCog, ScanBarcode } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { canAccessMenu } from '@/contexts/AuthContext';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';

export default function POS() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { items, addItem, removeItem, updateQuantity, clearCart, total } = useCart();

  // Barcode scanner integration
  const { lastScanned } = useBarcodeScanner({
    onScan: (barcode) => {
      // Find product by barcode
      const product = products.find(p => p.barcode === barcode);
      if (product) {
        const legacy = legacyProducts.find(lp => lp.id === product.id);
        if (legacy && legacy.stock > 0) {
          addItem(legacy);
          toast.success(`${product.name} ditambahkan`, {
            description: `Barcode: ${barcode}`,
            duration: 1500,
          });
        } else {
          toast.error(`${product.name} stok habis`);
        }
      } else {
        toast.error(`Produk tidak ditemukan`, {
          description: `Barcode: ${barcode}`,
        });
      }
    },
    enabled: scannerActive && !paymentMethod && !showReceipt,
  });

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') return legacyProducts;
    return legacyProducts.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  const handleCheckout = (method: PaymentMethod) => {
    setPaymentMethod(method);
  };

  const handleConfirmPayment = (amountPaid: number) => {
    const subtotal = total;
    const discount = 0;
    const tax = 0;
    
    const transaction: Transaction = {
      id: generateTransactionId(),
      storeId: user?.storeIds[0] || 'store-1',
      items: [...items],
      subtotal,
      discount,
      tax,
      total: subtotal - discount + tax,
      paymentMethod: paymentMethod!,
      amountPaid,
      change: Math.max(0, amountPaid - total),
      createdAt: new Date(),
      cashierId: user?.id || 'user-1',
      cashierName: user?.name || 'Kasir',
    };

    setCurrentTransaction(transaction);
    setPaymentMethod(null);
    setShowReceipt(true);
    clearCart();
    toast.success('Pembayaran berhasil!');
  };

  return (
    <div className="h-screen flex bg-[hsl(var(--pos-background))]">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-card))] shadow-sm">
          <div>
            <h1 className="text-lg font-bold text-[hsl(var(--pos-foreground))]">
              Point of Sale
            </h1>
            <p className="text-xs text-[hsl(var(--pos-muted-foreground))]">
              {new Date().toLocaleDateString('id-ID', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Scanner status indicator */}
            <button
              onClick={() => setScannerActive(!scannerActive)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                scannerActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-[hsl(var(--pos-muted))] text-[hsl(var(--pos-muted-foreground))]'
              }`}
            >
              <ScanBarcode className="w-4 h-4" />
              <span className="hidden sm:inline">Scanner</span>
            </button>

            {canAccessMenu(user?.role, 'dashboard') && (
              <Link
                to="/backoffice"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(var(--pos-muted))] text-[hsl(var(--pos-foreground))] hover:bg-[hsl(var(--pos-border))] transition-colors text-sm"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">Back Office</span>
              </Link>
            )}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[hsl(var(--pos-accent))] text-[hsl(var(--pos-accent-foreground))]">
              {user?.role === 'owner' ? (
                <ShieldCheck className="w-4 h-4" />
              ) : user?.role === 'admin' ? (
                <UserCog className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">{user?.name || 'User'}</span>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
                toast.success('Logout berhasil');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Categories */}
        <div className="px-6 py-3">
          <CategoryTabs
            categories={legacyCategories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={addItem}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-80 lg:w-96">
        <CartPanel
          items={items}
          total={total}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
          onCheckout={handleCheckout}
        />
      </div>

      {/* Payment Modal */}
      {paymentMethod && (
        <PaymentModal
          isOpen={!!paymentMethod}
          onClose={() => setPaymentMethod(null)}
          items={items}
          total={total}
          paymentMethod={paymentMethod}
          onConfirm={handleConfirmPayment}
        />
      )}

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        transaction={currentTransaction}
      />
    </div>
  );
}
