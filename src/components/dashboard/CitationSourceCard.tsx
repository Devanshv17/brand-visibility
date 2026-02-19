import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link2 } from 'lucide-react';

interface CitationSource {
  name: string;
  mentions: number;
  percentage: number;
}

interface CitationSourceCardProps {
  sources: CitationSource[];
}

const sourceColors: Record<string, string> = {
  'PDP': 'bg-chart-discovery',
  'Brand.com': 'bg-chart-evaluation',
  'Customer Reviews': 'bg-chart-conversion',
  'External Websites': 'bg-chart-medium',
  'Q&A': 'bg-chart-low',
};

export function CitationSourceCard({ sources }: CitationSourceCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          Top Citation Sources
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sources.map((source, index) => (
          <div key={source.name} className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground truncate">
                  {source.name}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  {source.percentage}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${sourceColors[source.name] || 'bg-muted-foreground'}`}
                  style={{ width: `${source.percentage}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
