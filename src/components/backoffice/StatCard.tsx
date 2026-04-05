import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'bg-primary-light text-primary'
}: StatCardProps) {
  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-caption">{title}</p>
          <p className="text-[22px] font-medium text-foreground mt-1.5" style={{ letterSpacing: '-0.5px' }}>{value}</p>
          {change && (
            <p className={cn(
              'text-[12px] mt-1',
              changeType === 'positive' && 'text-[hsl(160,72%,27%)]',
              changeType === 'negative' && 'text-destructive',
              changeType === 'neutral' && 'text-muted-foreground'
            )}>
              {change}
            </p>
          )}
        </div>
        <div className={cn('p-2.5 rounded-lg', iconColor)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
