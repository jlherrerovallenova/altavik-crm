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
  // react-doctor-disable-next-line effect-needs-cleanup
  useEffect(() => {
    // Suscribirse a actualizaciones en la tabla email_tracking
    const channel = supabase
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
            // Buscamos información del lead
            const { data: lead } = await supabase
              .from('leads')
              .select('name')
              .eq('id', newRecord.lead_id)
              .single();

            showNotification({
              title: "¡Correo abierto!",
              message: `El cliente ${(lead as any)?.name || 'Desconocido'} ha abierto tu correo "${newRecord.subject}". Aperturas totales: ${newRecord.opens_count}`,
              type: "success"
            });
          }
        }
      )
      .subscribe();

    const unsubscribe = () => { supabase.removeChannel(channel); };
    return unsubscribe;
  }, [showNotification]);
}
