import { Product } from '@/types/pos';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;

  return (
    <button
      onClick={() => !isOutOfStock && onAdd(product)}
      disabled={isOutOfStock}
      className={cn(
        'group relative flex flex-col rounded-xl p-4 text-left transition-all duration-200',
        'bg-[hsl(var(--pos-card))] border border-[hsl(var(--pos-border))]',
        'hover:bg-[hsl(var(--pos-muted))] hover:border-[hsl(var(--pos-accent))]',
        'active:scale-[0.98] touch-target',
        isOutOfStock && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex-1">
        <h3 className="font-semibold text-[hsl(var(--pos-foreground))] text-sm leading-tight mb-1">
          {product.name}
        </h3>
        <p className="text-xs text-[hsl(var(--pos-muted-foreground))]">
          Stok: {product.stock}
        </p>
      </div>
      <div className="mt-3">
        <span className="price-text text-lg text-[hsl(var(--pos-accent))]">
          {formatCurrency(product.price)}
        </span>
      </div>
      {isOutOfStock && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
          <span className="text-sm font-medium text-white">Habis</span>
        </div>
      )}
    </button>
  );
}
