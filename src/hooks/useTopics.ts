import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { mockTopics } from '@/data/mockData';
import { Topic } from '@/types/rufus';

interface SupabaseTopic {
    name: string;
    prompt_count: number;
    avg_monthly_volume: number;
    question_ids: string[];
}

async function fetchTopics(): Promise<Topic[]> {
    const { data, error } = await supabase
        .from('v_topics')
        .select('*');

    if (error) {
        console.warn('Could not fetch topics from Supabase:', error.message);
        return [];
    }

    if (!data || data.length === 0) return [];

    // Transform Supabase rows into the Topic shape
    return (data as SupabaseTopic[]).map((row, index) => ({
        id: `topic-${index}`,
        name: row.name,
        promptIds: row.question_ids || [],
    }));
}

export function useTopics() {
    const query = useQuery({
        queryKey: ['topics'],
        queryFn: fetchTopics,
        staleTime: 60_000,
    });

    // Use live data if available, fallback to mock
    const topics: Topic[] =
        query.data && query.data.length > 0 ? query.data : mockTopics;

    return {
        topics,
        isLoading: query.isLoading,
        error: query.error,
        hasLiveData: !!(query.data && query.data.length > 0),
    };
}
