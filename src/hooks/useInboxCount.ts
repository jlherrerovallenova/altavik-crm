
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useInboxCount() {
  return useQuery({
    queryKey: ['incoming_emails', 'count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('incoming_emails')
        .select('*', { count: 'exact', head: true })
        .eq('is_processed', false);

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Cada 30 segundos
  });
}
