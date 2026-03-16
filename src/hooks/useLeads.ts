// src/hooks/useLeads.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadUpdate = Database['public']['Tables']['leads']['Update'];
type LeadInsert = Database['public']['Tables']['leads']['Insert'];

export const LEADS_QUERY_KEY = ['leads'];

interface FetchLeadsParams {
  page: number;
  pageSize: number;
  searchTerm?: string;
  statusFilter?: string;
  sourceFilter?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

export function useLeads(params: FetchLeadsParams) {
  const { page, pageSize, searchTerm, statusFilter, sourceFilter, sortField = 'created_at', sortDirection = 'desc' } = params;

  return useQuery({
    queryKey: [...LEADS_QUERY_KEY, params],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('leads' as any)
        .select('*', { count: 'exact' });

      // Apply sorting
      query = query.order(sortField as any, { ascending: sortDirection === 'asc' });

      // Apply search
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      // Apply filters
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      if (sourceFilter) {
        query = query.ilike('source', `%${sourceFilter}%`);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      return {
        leads: (data || []) as Lead[],
        totalCount: count || 0
      };
    }
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: LeadUpdate }) => {
      const { data, error } = await supabase
        .from('leads' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Lead;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      queryClient.setQueryData(['lead', data.id], data);
    }
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newLead: LeadInsert) => {
      const { data, error } = await (supabase as any)
        .from('leads')
        .insert([newLead])
        .select()
        .single();

      if (error) throw error;
      return data as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
    }
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
    }
  });
}
