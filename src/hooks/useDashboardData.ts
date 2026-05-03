import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

export type AgendaItem = Database['public']['Tables']['agenda']['Row'] & {
  leads?: { name: string, phone: string | null } | null
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
  const [stats, setStats] = useState<{ totalLeads: number; topSources: SourceStat[] }>({
    totalLeads: 0,
    topSources: []
  });
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [criticalLeads, setCriticalLeads] = useState<any[]>([]);
  const [feedbackLeads, setFeedbackLeads] = useState<any[]>([]);
  const [autoImportedLeads, setAutoImportedLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // 1. CARGA DE LEADS Y ESTADÍSTICAS
      const leadsResponse = await supabase.from('leads').select('source');
      const recentResponse = await supabase
        .from('leads')
        .select('id, name, source, created_at')
        .order('created_at', { ascending: false })
        .limit(6);

      if (leadsResponse.data) {
        const total = leadsResponse.data.length;
        const sourceCounts: Record<string, number> = {};
        leadsResponse.data.forEach((lead: any) => {
          const source = lead.source ? lead.source.trim() : 'Desconocido';
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        });
        const sortedSources = Object.entries(sourceCounts)
          .map(([name, count]) => ({
            name,
            count,
            percentage: total > 0 ? Math.round((count / total) * 100) : 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        setStats({ totalLeads: total, topSources: sortedSources });
      }

      if (recentResponse.data) {
        setRecentLeads(recentResponse.data);
      }

      // 2. CARGA DE AGENDA
      const { data: agendaData, error: agendaError } = await supabase
        .from('agenda')
        .select('*, leads(name, phone)')
        .eq('completed', false)
        .order('due_date', { ascending: true });

      if (!agendaError && agendaData) {
        const formattedData = (agendaData || []).map((item: any) => ({
          ...item,
          leads: Array.isArray(item.leads) ? item.leads[0] : item.leads
        })) as AgendaItem[];
        setAgenda(formattedData);
      }

      // 3. CARGA DE RADAR DE OPORTUNIDADES CRÍTICAS
      const { data: radarData, error: radarError } = await supabase
        .from('leads')
        .select('id, name, source, created_at, status, agenda(due_date, completed)')
        .not('status', 'in', '("closed","lost")');

      if (!radarError && radarData) {
        const now = new Date();
        const processedRadar = radarData
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
          .sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity)
          .slice(0, 50);

        setCriticalLeads(processedRadar);
      }

      // 4. CARGA DE LEADS PARA FEEDBACK
      const now = new Date();
      let feedbackData: any[] = [];
      try {
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
      } catch (e) {
        console.error("Error cargando feedback:", e);
      }

      const processedFeedback = feedbackData
        .map((l: any) => {
          const daysSinceCreated = Math.floor((now.getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24));
          return {
            ...l,
            daysSinceCreated
          };
        })
        .sort((a, b) => {
          if (a.feedback_responded_at && b.feedback_responded_at) {
            return new Date(b.feedback_responded_at).getTime() - new Date(a.feedback_responded_at).getTime();
          }
          if (a.feedback_responded_at) return -1;
          if (b.feedback_responded_at) return 1;
          return b.daysSinceCreated - a.daysSinceCreated;
        });

      setFeedbackLeads(processedFeedback);

      // 5. CARGA DE LEADS AUTOGENERADOS POR IA
      const { data: iaData } = await supabase
        .from('leads')
        .select('id, name, source, email, phone, status, created_at')
        .like('source', '%(Auto IA)%')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (iaData) setAutoImportedLeads(iaData);

    } catch (error) {
      console.error("Error general cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return {
    stats,
    recentLeads,
    agenda,
    criticalLeads,
    feedbackLeads,
    autoImportedLeads,
    loading,
    refresh: loadDashboardData,
    setAgenda
  };
}
