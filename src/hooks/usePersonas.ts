import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { personas as mockPersonas } from '@/data/mockData';

async function fetchPersonas(): Promise<string[]> {
    const { data, error } = await supabase
        .from('personas')
        .select('name')
        .order('name');

    if (error) {
        console.warn('Could not fetch personas from Supabase:', error.message);
        return [];
    }

    if (!data || data.length === 0) return [];
    return data.map((row: { name: string }) => row.name);
}

export function usePersonas() {
    const query = useQuery({
        queryKey: ['personas'],
        queryFn: fetchPersonas,
        staleTime: 60_000,
    });

    const personas: string[] =
        query.data && query.data.length > 0 ? query.data : mockPersonas;

    return {
        personas,
        isLoading: query.isLoading,
        error: query.error,
        hasLiveData: !!(query.data && query.data.length > 0),
    };
}

// Mutation: insert a new persona
export function useAddPersona() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (name: string) => {
            const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const { data, error } = await supabase
                .from('personas')
                .insert({ name, slug })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['personas'] });
        },
    });
}
