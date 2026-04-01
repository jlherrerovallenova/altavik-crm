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
                .select('*');

            if (error) throw new Error(error.message);
            
            // Ordenar numéricamente por n_orden (1, 2, 3... en lugar de 1, 10, 11...)
            const sorted = ((data as PropertyInfo[]) || []).sort((a, b) => {
                const valA = a.n_orden || '';
                const valB = b.n_orden || '';
                const numA = parseInt(valA) || 0;
                const numB = parseInt(valB) || 0;
                if (numA !== numB) return numA - numB;
                // Si los números son iguales (o ambos 0), comparamos como string por si acaso (natural sort)
                return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
            });
            
            return sorted;
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
