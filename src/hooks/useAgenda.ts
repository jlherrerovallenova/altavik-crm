// src/hooks/useAgenda.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

// Tipo enriquecido con nombre para mostrar en UI
type AgendaItem = Database['public']['Tables']['agenda']['Row'] & {
    leads?: { name: string } | null;
};
type AgendaUpdate = Database['public']['Tables']['agenda']['Update'];

/**
 * Hook para conseguir todas las tareas de la agenda y sus leads anidados
 */
export function useAgenda() {
    return useQuery({
        queryKey: ['agenda'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('agenda')
                .select(`
          *,
          leads (name)
        `)
                .order('due_date', { ascending: true });

            if (error) throw new Error(error.message);
            return data as AgendaItem[];
        },
    });
}

/**
 * Hook para conseguir tareas de un cliente específico
 */
export function useLeadAgenda(leadId: string | undefined) {
    return useQuery({
        queryKey: ['agenda', leadId],
        queryFn: async () => {
            if (!leadId) return [];
            const { data, error } = await supabase
                .from('agenda')
                .select(`*, leads (name)`)
                .eq('lead_id', leadId)
                .order('due_date', { ascending: true });

            if (error) throw new Error(error.message);
            return data as AgendaItem[];
        },
        enabled: !!leadId,
    });
}

/**
 * Hook mutador genérico para la agenda (Status toggle / update)
 */
export function useUpdateAgendaItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: number; updates: AgendaUpdate }) => {
            const { error } = await (supabase as any)
                .from('agenda')
                .update(updates)
                .eq('id', id);

            if (error) throw new Error(error.message);
        },
        // Mutación optimista: La UI lo cambia primero, luego se certifica al servidor
        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['agenda'] });

            queryClient.setQueriesData({ queryKey: ['agenda'] }, (old: any) => {
                if (!old) return old;
                if (Array.isArray(old)) {
                    return old.map((item: any) => item.id === id ? { ...item, ...updates } : item);
                }
                return old;
            });
        },
        onError: () => {
            // onSettled manejará el refresh en caso de error
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['agenda'] });
        },
    });
}

/**
 * Mutación para eliminar un item
 */
export function useDeleteAgendaItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase.from('agenda').delete().eq('id', id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agenda'] });
        },
    });
}
