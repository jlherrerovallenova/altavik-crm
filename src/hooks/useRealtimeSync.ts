
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Hook para sincronizar automáticamente las queries de React Query 
 * cuando ocurren cambios en tiempo real en Supabase.
 * 
 * @param table Nombre de la tabla a escuchar
 * @param queryKey Clave de la query a invalidar (ej: ['leads'])
 */
export function useRealtimeSync(table: string, queryKey: any[]) {
  const queryClient = useQueryClient();

  // react-doctor-disable-next-line effect-needs-cleanup
  useEffect(() => {
    // 1. Suscribirse a los cambios de la tabla
    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar INSERT, UPDATE y DELETE
          schema: 'public',
          table: table
        },
        (payload) => {
          console.log(`🔔 Realtime update on ${table}:`, payload);
          // 2. Invalidar la caché de React Query para forzar un refresco
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    // 3. Limpiar la suscripción al desmontar el componente
    const unsubscribe = () => supabase.removeChannel(channel);
    return unsubscribe;
  }, [table, queryKey, queryClient]);
}
