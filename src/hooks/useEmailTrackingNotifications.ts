import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface NotificationData {
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function useEmailTrackingNotifications(
  showNotification: (data: NotificationData) => void
) {
  useEffect(() => {
    // Suscribirse a actualizaciones en la tabla email_tracking
    const subscription = supabase
      .channel('email-opens')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'email_tracking',
          filter: 'status=eq.opened' // Notificar solo cuando el estado cambia a opened
        },
        async (payload) => {
          const newRecord = payload.new;
          const oldRecord = payload.old;

          // Solo notificamos si el opens_count cambia/aumenta
          if (newRecord.opens_count > (oldRecord?.opens_count || 0)) {
            // Obtener info del lead
            const { data: lead } = await supabase
              .from('leads')
              .select('name, status')
              .eq('id', newRecord.lead_id)
              .single();

            // Solo notificar si el lead es "caliente" o siempre.
            // Para no hacer spam, notificamos siempre pero con mensaje especial si es "caliente"
            const hotStatuses = ['qualified', 'visiting'];
            const isHot = lead && hotStatuses.includes((lead as any).status);

            showNotification({
              title: isHot ? "🔥 ¡Email Abierto (Cliente Caliente)!" : "📧 Email Abierto",
              message: `El cliente ${(lead as any)?.name || 'Desconocido'} ha abierto tu correo "${newRecord.subject}". Aperturas totales: ${newRecord.opens_count}`,
              type: "success"
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [showNotification]);
}
