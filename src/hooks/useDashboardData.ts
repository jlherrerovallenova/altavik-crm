import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

export type AgendaItem = Database['public']['Tables']['agenda']['Row'] & {
  leads?: { name: string, phone: string | null } | null;
  email_tracking?: { id: string; status: string; opens_count: number; last_opened_at: string | null } | null;
};

export interface SourceStat {
  name: string;
  count: number;
  percentage: number;
}

export interface RecentLead {
  id: string;
  name: string;
  source: string | null;
  created_at: string;
}

export function useDashboardData(userId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: statsData, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard_stats', userId],
    queryFn: async () => {
      const [countRes, sourceRes] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('source')
      ]);
      const count = countRes.count;
      const sourceData = sourceRes.data;
      
      let topSources: SourceStat[] = [];
      const total = count || 0;
      if (sourceData) {
        const sourceCounts: Record<string, number> = {};
        sourceData.forEach((lead: any) => {
          const source = lead.source ? lead.source.trim() : 'Desconocido';
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        });
        topSources = Object.entries(sourceCounts)
          .map(([name, c]) => ({
            name,
            count: c,
            percentage: total > 0 ? Math.round((c / total) * 100) : 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
      }
      return { totalLeads: total, topSources };
    },
    enabled: !!userId,
  });

  const { data: recentLeads = [], isLoading: loadingRecent, refetch: refetchRecent } = useQuery({
    queryKey: ['dashboard_recent', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, source, created_at')
        .order('created_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data as RecentLead[];
    },
    enabled: !!userId,
  });

  const { data: agenda = [], isLoading: loadingAgenda, refetch: refetchAgenda } = useQuery({
    queryKey: ['dashboard_agenda', userId],
    queryFn: async () => {
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('agenda')
        .select('*, leads(name, phone), email_tracking(*)')
        .or(`completed.eq.false,and(completed.eq.true,due_date.gte.${lastWeek})`)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        leads: Array.isArray(item.leads) ? item.leads[0] : item.leads,
        email_tracking: Array.isArray(item.email_tracking) ? item.email_tracking[0] : item.email_tracking
      })) as AgendaItem[];
    },
    enabled: !!userId,
  });

  const { data: criticalLeads = [], isLoading: loadingCritical, refetch: refetchCritical } = useQuery({
    queryKey: ['dashboard_critical', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, source, created_at, status, agenda(due_date, completed)')
        .not('status', 'in', '("closed","lost")');
      if (error) throw error;
      const now = new Date();
      return (data || [])
        .map((l: any) => {
          const agendaItems = l.agenda || [];
          const lastActivity = agendaItems.length > 0
            ? new Date(Math.max(...agendaItems.map((a: any) => new Date(a.due_date).getTime())))
            : new Date(l.created_at);
          
          const daysSinceLastActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
          const hasFutureTask = agendaItems.some((a: any) => !a.completed && new Date(a.due_date) > now);

          return {
            id: l.id,
            name: l.name,
            source: l.source,
            created_at: l.created_at,
            status: l.status,
            daysSinceLastActivity,
            isCritical: daysSinceLastActivity >= 7 && !hasFutureTask,
            hasAgenda: agendaItems.length > 0
          };
        })
        .filter((l: any) => l.isCritical)
        .sort((a: any, b: any) => b.daysSinceLastActivity - a.daysSinceLastActivity)
        .slice(0, 50);
    },
    enabled: !!userId,
  });

  const { data: feedbackLeads = [], isLoading: loadingFeedback, refetch: refetchFeedback } = useQuery({
    queryKey: ['dashboard_feedback', userId],
    queryFn: async () => {
      let feedbackData: any[] = [];
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, source, created_at, status, feedback_sent, feedback_rating, feedback_responded_at')
        .or(`status.in.(visiting,closed),feedback_rating.not.is.null`);
      
      if (!error && data) {
        feedbackData = data;
      } else {
        const { data: fallbackData } = await supabase
          .from('leads')
          .select('id, name, email, source, created_at, status, feedback_sent')
          .in('status', ['visiting', 'closed'])
          .eq('feedback_sent', false);
        feedbackData = fallbackData || [];
      }
      const now = new Date();
      return feedbackData
        .map((l: any) => {
          const daysSinceCreated = Math.floor((now.getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24));
          return { ...l, daysSinceCreated };
        })
        .sort((a: any, b: any) => {
          if (a.feedback_responded_at && b.feedback_responded_at) {
            return new Date(b.feedback_responded_at).getTime() - new Date(a.feedback_responded_at).getTime();
          }
          if (a.feedback_responded_at) return -1;
          if (b.feedback_responded_at) return 1;
          return b.daysSinceCreated - a.daysSinceCreated;
        });
    },
    enabled: !!userId,
  });

  const { data: autoImportedLeads = [], isLoading: loadingAuto, refetch: refetchAuto } = useQuery({
    queryKey: ['dashboard_auto_imported', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('leads')
        .select('id, name, source, email, phone, status, created_at')
        .like('source', '%(Auto IA)%')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const loading = loadingStats || loadingRecent || loadingAgenda || loadingCritical || loadingFeedback || loadingAuto;

  const refresh = () => {
    refetchStats();
    refetchRecent();
    refetchAgenda();
    refetchCritical();
    refetchFeedback();
    refetchAuto();
  };

  const setAgenda = (updater: any) => {
    queryClient.setQueryData(['dashboard_agenda', userId], updater);
  };

  return {
    stats: statsData || { totalLeads: 0, topSources: [] },
    recentLeads,
    agenda,
    criticalLeads,
    feedbackLeads,
    autoImportedLeads,
    loading,
    refresh,
    setAgenda
  };
}
