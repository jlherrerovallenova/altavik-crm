// src/hooks/useInventory.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type PropertyInfo = Database['public']['Tables']['inventory']['Row'];

/**
 * Hook para obtener el listado del Inventario 
 */
export function useInventory() {
    return useQuery({
        queryKey: ['inventory'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .order('numero_vivienda', { ascending: true }); // Por defecto ordenado por Nº Vivienda

            if (error) throw new Error(error.message);
            return data as PropertyInfo[];
        },
    });
}

/**
 * Mutación para eliminar una propiedad del inventario
 */
export function useDeleteProperty() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase.from('inventory').delete().eq('id', id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        },
    });
}
