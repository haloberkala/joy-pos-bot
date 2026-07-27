import { Product } from '@/types/pos';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Package } from 'lucide-react';

interface ProductListPanelProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  selectedIndex?: number;
}

export function ProductListPanel({ products, onAddProduct, selectedIndex = -1 }: ProductListPanelProps) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Package className="w-3.5 h-3.5 text-primary" />
          <span className="text-[12px] font-medium text-foreground">Daftar Barang ({products.length})</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {products.map((product, index) => {
          const isOut = product.quantity <= 0;
          const isSelected = index === selectedIndex;
          return (
            <button key={product.id} onClick={() => !isOut && onAddProduct(product)} disabled={isOut}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 border-b border-border text-left transition-colors',
                isSelected ? 'bg-primary/10' : 'hover:bg-surface active:bg-primary-light',
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
        {products.length === 0 && (
          <div className="text-center py-8 text-[12px] text-muted-foreground">Tidak ada barang ditemukan</div>
        )}
      </div>
    </div>
  );
}
