
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useRealtimeSync } from './useRealtimeSync';

export interface IncomingEmail {
  id: string;
  created_at: string;
  subject: string;
  sender_name: string;
  sender_email: string;
  body: string;
  date_received: string;
  is_read: boolean;
  is_processed: boolean;
  tags: string[];
  lead_id: string | null;
}

export const EMAILS_QUERY_KEY = ['incoming_emails'];

export function useEmails() {
  // Sincronización en tiempo real para correos entrantes
  useRealtimeSync('incoming_emails', EMAILS_QUERY_KEY);

  return useQuery({
    queryKey: EMAILS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incoming_emails')
        .select('*')
        .order('date_received', { ascending: false });

      if (error) throw error;
      return data as IncomingEmail[];
    }
  });
}

export function useUpdateEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<IncomingEmail> }) => {
      const { data, error } = await (supabase as any)
        .from('incoming_emails')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as IncomingEmail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMAILS_QUERY_KEY });
    }
  });
}
