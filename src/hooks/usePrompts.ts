import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { mockPrompts } from '@/data/mockData';
import { Prompt, JourneyStage, Priority, Persona, MonthlyVolume, VisibilityOutcome, CoverageStatus, StabilityIndicator, AssistantSource } from '@/types/rufus';

function mapVolumeToLabel(vol: number | null): MonthlyVolume {
    if (!vol) return '<1K';
    if (vol >= 5000) return '5K+';
    if (vol >= 2000) return '2K+';
    if (vol >= 1200) return '1.2K+';
    return '<1K';
}

function mapJourneyStage(stage: string | null): JourneyStage {
    if (!stage) return 'Discovery';
    const normalized = stage.charAt(0).toUpperCase() + stage.slice(1).toLowerCase();
    if (normalized === 'Discovery' || normalized === 'Evaluation' || normalized === 'Conversion') {
        return normalized as JourneyStage;
    }
    return 'Discovery';
}

function mapPriority(priority: string | null): Priority {
    if (!priority) return 'Medium';
    const normalized = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
    if (normalized === 'High' || normalized === 'Medium' || normalized === 'Low') {
        return normalized as Priority;
    }
    return 'Medium';
}

async function fetchPrompts(): Promise<Prompt[]> {
    const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.warn('Could not fetch prompts from Supabase:', error.message);
        return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        text: row.text as string,
        journeyStage: mapJourneyStage(row.commerce_stage_primary as string | null),
        priority: mapPriority(row.priority as string | null),
        persona: ((row.metadata as Record<string, unknown>)?.persona as Persona) || 'Busy New Dog Parent',
        monthlyVolume: mapVolumeToLabel(row.monthly_volume as number | null),
        topicId: '',
        visibilityScore: 0,
        visibilityOutcome: 'no_clear_winner' as VisibilityOutcome,
        topCompetitor: null,
        testResults: [],
        coverage: {
            status: 'Not Covered' as CoverageStatus,
            surfaces: [],
            evidence: [],
        },
        lastTested: (row.created_at as string) || new Date().toISOString(),
        testRunCount: 0,
        stability: 'Stable' as StabilityIndicator,
        assistantSource: 'rufus' as AssistantSource,
    }));
}

export function usePrompts() {
    const query = useQuery({
        queryKey: ['prompts'],
        queryFn: fetchPrompts,
        staleTime: 60_000,
    });

    const prompts: Prompt[] =
        query.data && query.data.length > 0 ? query.data : mockPrompts;

    return {
        prompts,
        isLoading: query.isLoading,
        error: query.error,
        hasLiveData: !!(query.data && query.data.length > 0),
    };
}
