export type JourneyStage = 'Discovery' | 'Evaluation' | 'Conversion';
export type Priority = 'High' | 'Medium' | 'Low';
export type Persona = 'Picky-Eater Dog Parent' | 'Busy New Dog Parent' | 'Multi-Dog Household';
export type VisibilityOutcome = 'brand_wins' | 'competitor_wins' | 'no_clear_winner';
export type CoverageStatus = 'Covered' | 'Not Covered' | 'Partially Covered';
export type StabilityIndicator = 'Stable' | 'Volatile';
export type SurfaceType = 'PDP' | 'Brand Store' | 'Q&A' | 'Reviews';
export type MonthlyVolume = '5K+' | '2K+' | '1.2K+' | '<1K';
export type Platform = 'All' | 'Rufus' | 'ChatGPT' | 'Perplexity';

// Supports future extensibility for other assistants
export type AssistantSource = 'rufus' | 'perplexity' | 'chatgpt';

export interface VisibilityTestResult {
  runId: string;
  timestamp: string;
  brandMentioned: boolean;
  competitorsMentioned: string[];
  topCompetitor: string | null;
  outcome: VisibilityOutcome;
  citations: string[];
  rawOutput?: string;
}

export interface CoverageEvidence {
  surfaceType: SurfaceType;
  snippet: string;
  location?: string;
}

export interface CoverageResult {
  status: CoverageStatus;
  surfaces: SurfaceType[];
  evidence: CoverageEvidence[];
  missingExplanation?: string;
}

export interface Prompt {
  id: string;
  text: string;
  journeyStage: JourneyStage;
  priority: Priority;
  persona: Persona;
  monthlyVolume: MonthlyVolume;
  topicId: string;

  // Visibility data
  visibilityScore: number;
  visibilityOutcome: VisibilityOutcome;
  topCompetitor: string | null;
  testResults: VisibilityTestResult[];

  // Coverage data
  coverage: CoverageResult;

  // Test metadata
  lastTested: string;
  testRunCount: number;
  stability: StabilityIndicator;

  // Future extensibility
  assistantSource: AssistantSource;
}

export interface Topic {
  id: string;
  name: string;
  promptIds: string[];
}

export interface BreakdownMetric {
  label: string;
  value: number;
  total: number;
  percentage: number;
}

export interface SurfaceBreakdown {
  surface: SurfaceType;
  covered: number;
  total: number;
  percentage: number;
}

export interface VisibilityTrendPoint {
  month: string;
  score: number;
}

export interface RollupMetrics {
  overallVisibilityScore: number;
  overallCoveragePercentage: number;
  visibilityTrend: VisibilityTrendPoint[];
  trendDelta: number;

  byJourneyStage: Record<JourneyStage, BreakdownMetric>;
  byPriority: Record<Priority, BreakdownMetric>;
  bySurface: SurfaceBreakdown[];

  coverageBreakdown: {
    covered: number;
    partial: number;
    notCovered: number;
  };
}
