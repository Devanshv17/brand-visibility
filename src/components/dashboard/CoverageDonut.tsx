interface CoverageDonutProps {
  covered: number;
  partial: number;
  notCovered: number;
}

export function CoverageDonut({ covered, partial, notCovered }: CoverageDonutProps) {
  const total = covered + partial + notCovered;
  const coveredPct = (covered / total) * 100;
  const partialPct = (partial / total) * 100;
  
  // SVG donut chart calculations
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  
  const coveredDash = (coveredPct / 100) * circumference;
  const partialDash = (partialPct / 100) * circumference;
  const notCoveredDash = circumference - coveredDash - partialDash;

  const coveredOffset = 0;
  const partialOffset = -coveredDash;
  const notCoveredOffset = -(coveredDash + partialDash);

  return (
    <div className="flex items-center gap-6">
      {/* Donut chart */}
      <div className="relative">
        <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
          {/* Covered - Success */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="hsl(var(--success))"
            strokeWidth="12"
            strokeDasharray={`${coveredDash} ${circumference - coveredDash}`}
            strokeDashoffset={coveredOffset}
            className="transition-all duration-700"
          />
          {/* Partial - Warning */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="hsl(var(--warning))"
            strokeWidth="12"
            strokeDasharray={`${partialDash} ${circumference - partialDash}`}
            strokeDashoffset={partialOffset}
            className="transition-all duration-700"
          />
          {/* Not Covered - Danger */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="hsl(var(--danger))"
            strokeWidth="12"
            strokeDasharray={`${notCoveredDash} ${circumference - notCoveredDash}`}
            strokeDashoffset={notCoveredOffset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-foreground">{total}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <div className="h-3 w-3 rounded-full bg-success" />
          <span className="text-muted-foreground">Covered</span>
          <span className="font-medium text-foreground">{covered}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="h-3 w-3 rounded-full bg-warning" />
          <span className="text-muted-foreground">Partial</span>
          <span className="font-medium text-foreground">{partial}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="h-3 w-3 rounded-full bg-danger" />
          <span className="text-muted-foreground">Not Covered</span>
          <span className="font-medium text-foreground">{notCovered}</span>
        </div>
      </div>
    </div>
  );
}
