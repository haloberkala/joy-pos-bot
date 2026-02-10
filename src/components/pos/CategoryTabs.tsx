import { Category } from '@/types/pos';
import { cn } from '@/lib/utils';

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export function CategoryTabs({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all',
            'touch-target text-sm font-medium',
            activeCategory === category.id
              ? 'bg-[hsl(var(--pos-accent))] text-[hsl(var(--pos-accent-foreground))] shadow-sm'
              : 'bg-[hsl(var(--pos-card))] text-[hsl(var(--pos-muted-foreground))] hover:bg-[hsl(var(--pos-muted))] border border-[hsl(var(--pos-border))]'
          )}
        >
          <span>{category.icon}</span>
          <span>{category.name}</span>
        </button>
      ))}
    </div>
  );
}
