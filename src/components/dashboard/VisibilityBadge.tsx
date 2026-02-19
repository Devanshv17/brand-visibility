import { VisibilityOutcome } from '@/types/rufus';
import { cn } from '@/lib/utils';
import { Trophy, Users, Minus } from 'lucide-react';

interface VisibilityBadgeProps {
  outcome: VisibilityOutcome;
  score: number;
  competitor?: string | null;
  size?: 'sm' | 'md';
}

const outcomeConfig: Record<VisibilityOutcome, { label: string; className: string; icon: typeof Trophy }> = {
  brand_wins: {
    label: 'Brand Wins',
    className: 'bg-brand-win/10 text-brand-win border-brand-win/30',
    icon: Trophy,
  },
  competitor_wins: {
    label: 'Competitor Wins',
    className: 'bg-competitor-win/10 text-competitor-win border-competitor-win/30',
    icon: Users,
  },
  no_clear_winner: {
    label: 'No Clear Winner',
    className: 'bg-neutral/10 text-neutral border-neutral/30',
    icon: Minus,
  },
};

export function VisibilityBadge({ outcome, score, competitor, size = 'md' }: VisibilityBadgeProps) {
  const config = outcomeConfig[outcome];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3">
      {/* Score indicator */}
      <div className={cn(
        'flex items-center justify-center rounded-lg font-semibold',
        size === 'sm' ? 'h-8 w-12 text-sm' : 'h-10 w-14 text-base',
        score >= 70 ? 'bg-brand-win/10 text-brand-win' :
        score >= 50 ? 'bg-warning/10 text-warning' :
        'bg-competitor-win/10 text-competitor-win'
      )}>
        {score}
      </div>

      {/* Outcome badge */}
      <div className={cn(
        'flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        config.className,
        size === 'sm' ? 'text-xs' : 'text-sm'
      )}>
        <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        <span className="font-medium">{config.label}</span>
        {competitor && outcome === 'competitor_wins' && (
          <span className="opacity-75">({competitor})</span>
        )}
      </div>
    </div>
  );
}
