import { Prompt } from '@/types/rufus';
import { VisibilityBadge } from './VisibilityBadge';
import { CoverageBadge } from './CoverageBadge';
import { StabilityIndicator } from './StabilityIndicator';
import { FileText, Store, MessageSquare, Star, ExternalLink } from 'lucide-react';

interface PromptDetailPanelProps {
  prompt: Prompt;
}

const surfaceIcons = {
  'PDP': FileText,
  'Brand Store': Store,
  'Q&A': MessageSquare,
  'Reviews': Star,
};

const surfaceColors = {
  'PDP': 'border-surface-pdp/30 bg-surface-pdp/5',
  'Brand Store': 'border-surface-store/30 bg-surface-store/5',
  'Q&A': 'border-surface-qa/30 bg-surface-qa/5',
  'Reviews': 'border-surface-reviews/30 bg-surface-reviews/5',
};

export function PromptDetailPanel({ prompt }: PromptDetailPanelProps) {
  const latestTest = prompt.testResults[0];

  return (
    <div className="mt-4 space-y-6 border-t border-border pt-6">
      {/* Test metadata */}
      <div className="flex items-center justify-between">
        <StabilityIndicator
          stability={prompt.stability}
          testCount={prompt.testRunCount}
          lastTested={prompt.lastTested}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Visibility Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Visibility Details</h4>
          
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <VisibilityBadge
              outcome={prompt.visibilityOutcome}
              score={prompt.visibilityScore}
              competitor={prompt.topCompetitor}
            />

            {latestTest && (
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  Latest test output summary:
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Brand mentioned:</span>
                    <span className={latestTest.brandMentioned ? 'text-success font-medium' : 'text-danger font-medium'}>
                      {latestTest.brandMentioned ? 'Yes' : 'No'}
                    </span>
                  </div>

                  {latestTest.competitorsMentioned.length > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Competitors mentioned: </span>
                      <span className="text-foreground">
                        {latestTest.competitorsMentioned.join(', ')}
                      </span>
                    </div>
                  )}

                  {latestTest.citations.length > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Citations: </span>
                      <span className="text-foreground">
                        {latestTest.citations.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coverage Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Coverage Evidence</h4>
          
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <CoverageBadge
              status={prompt.coverage.status}
              surfaces={prompt.coverage.surfaces}
            />

            {prompt.coverage.evidence.length > 0 ? (
              <div className="space-y-3 pt-3 border-t border-border">
                {prompt.coverage.evidence.map((evidence, index) => {
                  const Icon = surfaceIcons[evidence.surfaceType];
                  const colorClass = surfaceColors[evidence.surfaceType];
                  
                  return (
                    <div
                      key={index}
                      className={`rounded-lg border p-3 ${colorClass}`}
                    >
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                        <Icon className="h-3.5 w-3.5" />
                        <span>{evidence.surfaceType}</span>
                        {evidence.location && (
                          <>
                            <span>•</span>
                            <span>{evidence.location}</span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        "{evidence.snippet}"
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground italic">
                  No evidence found on Amazon surfaces.
                </p>
              </div>
            )}

            {prompt.coverage.missingExplanation && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                <div className="flex items-start gap-2">
                  <ExternalLink className="h-4 w-4 text-warning mt-0.5" />
                  <div>
                    <span className="text-xs font-medium text-warning">What's missing:</span>
                    <p className="text-sm text-foreground mt-1">
                      {prompt.coverage.missingExplanation}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
