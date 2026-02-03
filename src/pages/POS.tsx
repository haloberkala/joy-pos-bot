import { useState, useMemo } from 'react';
import { useCart } from '@/hooks/useCart';
import { ProductCard } from '@/components/pos/ProductCard';
import { CategoryTabs } from '@/components/pos/CategoryTabs';
import { CartPanel } from '@/components/pos/CartPanel';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { products, categories } from '@/data/sampleData';
import { PaymentMethod, Transaction } from '@/types/pos';
import { generateTransactionId } from '@/lib/format';
import { Settings, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function POS() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const { items, addItem, removeItem, updateQuantity, clearCart, total } = useCart();

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') return products;
    return products.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  const handleCheckout = (method: PaymentMethod) => {
    setPaymentMethod(method);
  };

  const handleConfirmPayment = (amountPaid: number) => {
    const transaction: Transaction = {
      id: generateTransactionId(),
      items: [...items],
      total,
      paymentMethod: paymentMethod!,
      amountPaid,
      change: Math.max(0, amountPaid - total),
      createdAt: new Date(),
      cashier: 'Admin',
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
        <header className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--pos-border))]">
          <div>
            <h1 className="text-xl font-bold text-[hsl(var(--pos-foreground))]">
              Point of Sale
            </h1>
            <p className="text-sm text-[hsl(var(--pos-muted-foreground))]">
              {new Date().toLocaleDateString('id-ID', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/backoffice"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--pos-card))] text-[hsl(var(--pos-foreground))] hover:bg-[hsl(var(--pos-muted))] transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Back Office</span>
            </Link>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--pos-accent))] text-white">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">Admin</span>
            </div>
          </div>
        </header>

        {/* Categories */}
        <div className="px-6 py-4">
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
