import { CoverageStatus, SurfaceType } from '@/types/rufus';
import { cn } from '@/lib/utils';
import { Check, AlertCircle, X, FileText, Store, MessageSquare, Star } from 'lucide-react';

interface CoverageBadgeProps {
  status: CoverageStatus;
  surfaces: SurfaceType[];
  size?: 'sm' | 'md';
}

const statusConfig: Record<CoverageStatus, { className: string; icon: typeof Check }> = {
  'Covered': {
    className: 'bg-success/10 text-success border-success/30',
    icon: Check,
  },
  'Partially Covered': {
    className: 'bg-warning/10 text-warning border-warning/30',
    icon: AlertCircle,
  },
  'Not Covered': {
    className: 'bg-danger/10 text-danger border-danger/30',
    icon: X,
  },
};

const surfaceConfig: Record<SurfaceType, { icon: typeof FileText; className: string }> = {
  'PDP': { icon: FileText, className: 'text-surface-pdp' },
  'Brand Store': { icon: Store, className: 'text-surface-store' },
  'Q&A': { icon: MessageSquare, className: 'text-surface-qa' },
  'Reviews': { icon: Star, className: 'text-surface-reviews' },
};

export function CoverageBadge({ status, surfaces, size = 'md' }: CoverageBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3">
      {/* Status badge */}
      <div className={cn(
        'flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        config.className,
        size === 'sm' ? 'text-xs' : 'text-sm'
      )}>
        <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        <span className="font-medium">{status}</span>
      </div>

      {/* Surface icons */}
      {surfaces.length > 0 && (
        <div className="flex items-center gap-1">
          {surfaces.map((surface) => {
            const surfaceInfo = surfaceConfig[surface];
            const SurfaceIcon = surfaceInfo.icon;
            return (
              <div
                key={surface}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-md bg-card border',
                  surfaceInfo.className
                )}
                title={surface}
              >
                <SurfaceIcon className="h-3.5 w-3.5" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
