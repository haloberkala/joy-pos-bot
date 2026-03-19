import { useState, useMemo } from 'react';
import { Product } from '@/types/pos';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Search, Package, ChevronUp, ChevronDown } from 'lucide-react';

interface ProductListPanelProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
}

export function ProductListPanel({ products, onAddProduct }: ProductListPanelProps) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
  }, [products, search]);

  return (
    <div className={cn(
      'border-t border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-card))] transition-all',
      collapsed ? 'h-10' : 'h-56'
    )}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-2 bg-[hsl(var(--pos-accent))]/10 hover:bg-[hsl(var(--pos-accent))]/15 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-[hsl(var(--pos-accent))]" />
          <span className="text-sm font-bold text-[hsl(var(--pos-foreground))]">
            Daftar Barang ({products.length})
          </span>
        </div>
        {collapsed ? <ChevronUp className="w-4 h-4 text-[hsl(var(--pos-muted-foreground))]" /> : <ChevronDown className="w-4 h-4 text-[hsl(var(--pos-muted-foreground))]" />}
      </button>

      {!collapsed && (
        <div className="flex flex-col h-[calc(100%-2.5rem)]">
          {/* Search */}
          <div className="px-3 py-1.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--pos-muted-foreground))]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari barang..."
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-background))] text-[hsl(var(--pos-foreground))] placeholder:text-[hsl(var(--pos-muted-foreground))] focus:border-[hsl(var(--pos-accent))] focus:outline-none"
              />
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto px-3 pb-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
              {filtered.map(product => {
                const isOut = product.quantity <= 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => !isOut && onAddProduct(product)}
                    disabled={isOut}
                    className={cn(
                      'relative flex flex-col p-2 rounded-lg border text-left transition-all text-xs',
                      'border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-background))]',
                      'hover:border-[hsl(var(--pos-accent))] hover:shadow-sm active:scale-[0.97]',
                      isOut && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <span className="font-semibold text-[hsl(var(--pos-foreground))] leading-tight line-clamp-2">
                      {product.name}
                    </span>
                    <div className="mt-auto pt-1 flex items-center justify-between gap-1">
                      <span className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded',
                        product.quantity <= product.min_stock_alert
                          ? 'bg-red-100 text-red-700'
                          : 'bg-[hsl(var(--pos-muted))] text-[hsl(var(--pos-muted-foreground))]'
                      )}>
                        Stok: {product.quantity}
                      </span>
                    </div>
                    <span className="font-bold text-[hsl(var(--pos-accent))] mt-0.5">
                      {formatCurrency(product.selling_price)}
                    </span>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-full text-center py-4 text-sm text-[hsl(var(--pos-muted-foreground))]">
                  Tidak ada barang ditemukan
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
