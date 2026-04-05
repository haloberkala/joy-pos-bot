import { Product } from '@/types/pos';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const isOutOfStock = product.quantity <= 0;

  return (
    <button
      onClick={() => !isOutOfStock && onAdd(product)}
      disabled={isOutOfStock}
      className={cn(
        'group relative flex flex-col rounded-xl p-4 text-left transition-all duration-150',
        'bg-white border border-border',
        'hover:border-primary hover:shadow-sm',
        'active:scale-[0.99] touch-target',
        isOutOfStock && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex-1">
        <h3 className="font-medium text-foreground text-[13px] leading-tight mb-1">{product.name}</h3>
        <p className="text-[11px] text-muted-foreground">Stok: {product.quantity}</p>
      </div>
      <div className="mt-3">
        <span className="text-[15px] font-medium text-primary tabular-nums">{formatCurrency(product.selling_price)}</span>
      </div>
      {isOutOfStock && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
          <span className="text-[12px] font-medium text-destructive">Habis</span>
        </div>
      )}
    </button>
  );
}
