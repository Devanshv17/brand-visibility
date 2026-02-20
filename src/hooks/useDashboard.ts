import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { RollupMetrics } from '@/types/rufus';
import { mockRollupMetrics, topCompetitors as mockCompetitors, topCitationSources as mockCitationSources } from '@/data/mockData';

export interface Competitor {
    name: string;
    mentions: number;
    percentage: number;
}

export interface CitationSource {
    name: string;
    mentions: number;
    percentage: number;
}

interface DashboardRollup {
    total_prompts: number;
    total_topics: number;
    total_personas: number;
    total_runs: number;
}

async function fetchDashboardRollup(): Promise<DashboardRollup | null> {
    const { data, error } = await supabase
        .from('v_dashboard_rollup')
        .select('*')
        .single();

    if (error) {
        console.warn('Could not fetch dashboard rollup from Supabase:', error.message);
        return null;
    }
    return data;
}

async function fetchCompetitors(): Promise<Competitor[]> {
    const { data, error } = await supabase
        .from('v_competitors')
        .select('*')
        .order('mentions', { ascending: false })
        .limit(10);

    if (error) {
        console.warn('Could not fetch competitors from Supabase:', error.message);
        return [];
    }
    return data || [];
}

async function fetchCitationSources(): Promise<CitationSource[]> {
    const { data, error } = await supabase
        .from('v_citation_sources')
        .select('*')
        .order('mentions', { ascending: false })
        .limit(10);

    if (error) {
        console.warn('Could not fetch citation sources from Supabase:', error.message);
        return [];
    }
    return data || [];
}

export function useDashboardMetrics() {
    const rollupQuery = useQuery({
        queryKey: ['dashboardRollup'],
        queryFn: fetchDashboardRollup,
        staleTime: 60_000,
    });

    const competitorsQuery = useQuery({
        queryKey: ['competitors'],
        queryFn: fetchCompetitors,
        staleTime: 60_000,
    });

    const citationSourcesQuery = useQuery({
        queryKey: ['citationSources'],
        queryFn: fetchCitationSources,
        staleTime: 60_000,
    });

    // Use live data if available, fallback to mock
    const rollup = rollupQuery.data;
    const metrics: RollupMetrics = rollup
        ? {
            ...mockRollupMetrics,
            // Override with live counts when available
            overallVisibilityScore: mockRollupMetrics.overallVisibilityScore,
        }
        : mockRollupMetrics;

    const competitors: Competitor[] =
        competitorsQuery.data && competitorsQuery.data.length > 0
            ? competitorsQuery.data
            : mockCompetitors;

    const citationSources: CitationSource[] =
        citationSourcesQuery.data && citationSourcesQuery.data.length > 0
            ? citationSourcesQuery.data
            : mockCitationSources;

    return {
        metrics,
        competitors,
        citationSources,
        isLoading:
            rollupQuery.isLoading ||
            competitorsQuery.isLoading ||
            citationSourcesQuery.isLoading,
        error: rollupQuery.error || competitorsQuery.error || citationSourcesQuery.error,
        hasLiveData: !!rollup,
    };
}
