import { StabilityIndicator as StabilityType } from '@/types/rufus';
import { cn } from '@/lib/utils';
import { Activity, TrendingUp } from 'lucide-react';

interface StabilityIndicatorProps {
  stability: StabilityType;
  testCount: number;
  lastTested: string;
}

export function StabilityIndicator({ stability, testCount, lastTested }: StabilityIndicatorProps) {
  const isStable = stability === 'Stable';
  const lastTestedDate = new Date(lastTested);
  const formattedDate = lastTestedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      {/* Stability */}
      <div className={cn(
        'flex items-center gap-1',
        isStable ? 'text-success' : 'text-warning'
      )}>
        {isStable ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <Activity className="h-3 w-3" />
        )}
        <span className="font-medium">{stability}</span>
      </div>

      {/* Test count */}
      <div className="flex items-center gap-1">
        <span>n = {testCount} runs</span>
      </div>

      {/* Last tested */}
      <div className="flex items-center gap-1">
        <span>Last: {formattedDate}</span>
      </div>
    </div>
  );
}
