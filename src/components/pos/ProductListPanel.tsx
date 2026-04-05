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
    return products.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
  }, [products, search]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-3 py-2 border-b border-border space-y-2">
        <div className="flex items-center gap-2">
          <Package className="w-3.5 h-3.5 text-primary" />
          <span className="text-[12px] font-medium text-foreground">Daftar Barang ({products.length})</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari barang..."
            className="w-full pl-8 pr-3 py-1.5 text-[12px] rounded-lg border border-border bg-surface text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map(product => {
          const isOut = product.quantity <= 0;
          return (
            <button key={product.id} onClick={() => !isOut && onAddProduct(product)} disabled={isOut}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 border-b border-border text-left transition-colors',
                'hover:bg-surface active:bg-primary-light',
                isOut && 'opacity-40 cursor-not-allowed'
              )}>
              <div className="flex-1 min-w-0 mr-2">
                <p className="text-[13px] font-medium text-foreground truncate">{product.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground">{product.code}</span>
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded',
                    product.quantity <= product.min_stock_alert ? 'bg-destructive/10 text-destructive' : 'bg-[hsl(160,72%,27%)]/10 text-[hsl(160,72%,27%)]'
                  )}>Stok: {product.quantity}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[13px] font-medium text-primary">{formatCurrency(product.selling_price_retail)}</p>
                <p className="text-[10px] text-muted-foreground">Grosir: {formatCurrency(product.selling_price_wholesale)}</p>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-[12px] text-muted-foreground">Tidak ada barang ditemukan</div>
        )}
      </div>
    </div>
  );
}
