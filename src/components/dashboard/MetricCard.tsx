import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: number;
  suffix?: string;
  subtitle?: string;
  variant: 'visibility' | 'coverage';
  icon?: ReactNode;
  children?: ReactNode;
}

export function MetricCard({ 
  title, 
  value, 
  suffix = '', 
  subtitle, 
  variant,
  icon,
  children 
}: MetricCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl p-4 bg-card border border-border shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {icon}
            {title}
          </div>
          
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight text-foreground">{value}</span>
            <span className="text-lg font-medium text-muted-foreground">{suffix}</span>
          </div>
          
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        
        {children && (
          <div className="flex-shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
