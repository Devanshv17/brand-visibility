import { cn } from '@/lib/utils';

interface BreakdownItem {
  label: string;
  value: number;
  percentage: number;
  color?: string;
}

interface BreakdownCardProps {
  title: string;
  items: BreakdownItem[];
  type?: 'bar' | 'list';
}

const defaultColors = [
  'bg-surface-pdp',
  'bg-surface-store',
  'bg-surface-qa',
  'bg-surface-reviews',
];

export function BreakdownCard({ title, items, type = 'bar' }: BreakdownCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium text-foreground">
                {item.value}
                <span className="text-muted-foreground ml-1">({item.percentage.toFixed(0)}%)</span>
              </span>
            </div>
            
            {type === 'bar' && (
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    item.color || defaultColors[index % defaultColors.length]
                  )}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
