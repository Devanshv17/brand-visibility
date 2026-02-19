import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

interface Competitor {
  name: string;
  mentions: number;
  percentage: number;
}

interface CompetitorCardProps {
  competitors: Competitor[];
}

export function CompetitorCard({ competitors }: CompetitorCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Users className="h-4 w-4 text-muted-foreground" />
          Top Mentioned Competitors
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {competitors.slice(0, 5).map((competitor, index) => (
          <div key={competitor.name} className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground truncate">
                  {competitor.name}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  {competitor.mentions} mentions
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-chart-high transition-all duration-500"
                  style={{ width: `${competitor.percentage}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
