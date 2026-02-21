import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { mockTopics } from '@/data/mockData';
import { Topic } from '@/types/rufus';

interface SupabaseCategory {
    id: string;
    name: string;
}

interface SupabaseQuestionCategory {
    category_id: string;
    question_id: string;
}

async function fetchTopics(): Promise<Topic[]> {
    // 1. Fetch categories
    const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*');

    if (catError) {
        console.warn('Could not fetch categories from Supabase:', catError.message);
        return [];
    }

    if (!categories || categories.length === 0) return [];

    // 2. Fetch the question mapping
    const { data: mappings, error: mapError } = await supabase
        .from('question_category_map')
        .select('category_id, question_id');

    if (mapError) {
        console.warn('Could not fetch question mappings:', mapError.message);
    }

    // 3. Map to Topic shape
    const mappingsArray = mappings as SupabaseQuestionCategory[] || [];

    return (categories as SupabaseCategory[]).map((cat) => ({
        id: cat.id,
        name: cat.name,
        promptIds: mappingsArray
            .filter(m => m.category_id === cat.id)
            .map(m => m.question_id),
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
