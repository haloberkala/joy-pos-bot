import { useState, useMemo } from 'react';
import { Product } from '@/types/pos';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Search, Package } from 'lucide-react';

interface ProductListPanelProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
}

export function ProductListPanel({ products, onAddProduct }: ProductListPanelProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
  }, [products, search]);

  return (
    <div className="flex flex-col h-full border-r border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-card))]">
      {/* Header + Search */}
      <div className="px-3 py-2 border-b border-[hsl(var(--pos-border))] space-y-2">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-[hsl(var(--pos-accent))]" />
          <span className="text-sm font-bold text-[hsl(var(--pos-foreground))]">
            Daftar Barang ({products.length})
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--pos-muted-foreground))]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari barang..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-[hsl(var(--pos-border))] bg-[hsl(var(--pos-background))] text-[hsl(var(--pos-foreground))] placeholder:text-[hsl(var(--pos-muted-foreground))] focus:border-[hsl(var(--pos-accent))] focus:outline-none"
          />
        </div>
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map(product => {
          const isOut = product.quantity <= 0;
          return (
            <button
              key={product.id}
              onClick={() => !isOut && onAddProduct(product)}
              disabled={isOut}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 border-b border-[hsl(var(--pos-border))] text-left transition-colors',
                'hover:bg-[hsl(var(--pos-accent))]/8 active:bg-[hsl(var(--pos-accent))]/15',
                isOut && 'opacity-40 cursor-not-allowed'
              )}
            >
              <div className="flex-1 min-w-0 mr-2">
                <p className="text-sm font-bold text-[hsl(var(--pos-foreground))] truncate">{product.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-mono text-[hsl(var(--pos-muted-foreground))]">{product.code}</span>
                  <span className={cn(
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                    product.quantity <= product.min_stock_alert
                      ? 'bg-red-100 text-red-700'
                      : 'bg-emerald-50 text-emerald-700'
                  )}>
                    Stok: {product.quantity}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-extrabold text-[hsl(var(--pos-accent))]">{formatCurrency(product.selling_price_retail)}</p>
                <p className="text-[10px] text-[hsl(var(--pos-muted-foreground))]">Grosir: {formatCurrency(product.selling_price_wholesale)}</p>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-[hsl(var(--pos-muted-foreground))]">
            Tidak ada barang ditemukan
          </div>
        )}
      </div>
    </div>
  );
}
