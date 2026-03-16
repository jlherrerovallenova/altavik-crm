// src/hooks/useAgendaAlerts.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface AgendaAlerts {
  todayCount: number;
  overdueCount: number;
  total: number;
  loading: boolean;
}

export function useAgendaAlerts(): AgendaAlerts {
  const { session } = useAuth();
  const [todayCount, setTodayCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    const fetchAlerts = async () => {
      try {
        const now = new Date();

        // Inicio y fin del día de hoy (en local → ISO)
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

        const [todayRes, overdueRes] = await Promise.all([
          // Tareas de hoy pendientes
          (supabase as any)
            .from('agenda')
            .select('id', { count: 'exact', head: true })
            .eq('completed', false)
            .gte('due_date', startOfDay)
            .lte('due_date', endOfDay),

          // Tareas vencidas (antes de hoy, pendientes)
          (supabase as any)
            .from('agenda')
            .select('id', { count: 'exact', head: true })
            .eq('completed', false)
            .lt('due_date', startOfDay),
        ]);

        setTodayCount(todayRes.count ?? 0);
        setOverdueCount(overdueRes.count ?? 0);
      } catch (err) {
        console.error('Error fetching agenda alerts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();

    // Refresca cada 5 minutos
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session]);

  return { todayCount, overdueCount, total: todayCount + overdueCount, loading };
}
