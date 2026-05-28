import { ReactNode } from 'react';

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className = '' }: ResponsiveTableProps) {
  return (
    <div className={`overflow-x-auto -mx-4 sm:mx-0 ${className}`}>
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden border border-border rounded-xl">
          {children}
        </div>
      </div>
    </div>
  );
}

interface ResponsiveCardGridProps {
  children: ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  className?: string;
}

export function ResponsiveCardGrid({ 
  children, 
  cols = { default: 1, sm: 2, md: 3, lg: 4 },
  className = '' 
}: ResponsiveCardGridProps) {
  const gridCols = `grid-cols-${cols.default || 1} ${cols.sm ? `sm:grid-cols-${cols.sm}` : ''} ${cols.md ? `md:grid-cols-${cols.md}` : ''} ${cols.lg ? `lg:grid-cols-${cols.lg}` : ''} ${cols.xl ? `xl:grid-cols-${cols.xl}` : ''}`;
  
  return (
    <div className={`grid ${gridCols} gap-4 ${className}`}>
      {children}
    </div>
  );
}

interface ResponsiveDialogProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveDialogContent({ children, className = '' }: ResponsiveDialogProps) {
  return (
    <div className={`max-w-[95vw] sm:max-w-lg md:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto ${className}`}>
      {children}
    </div>
  );
}

interface ResponsiveButtonGroupProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveButtonGroup({ children, className = '' }: ResponsiveButtonGroupProps) {
  return (
    <div className={`flex flex-col sm:flex-row gap-2 sm:gap-3 ${className}`}>
      {children}
    </div>
  );
}

interface ResponsiveStatsGridProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveStatsGrid({ children, className = '' }: ResponsiveStatsGridProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}>
      {children}
    </div>
  );
}
