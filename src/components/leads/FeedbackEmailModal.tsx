// src/components/leads/FeedbackEmailModal.tsx
import { useState } from 'react';
import { X, Send, Loader as Loader2, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getFeedbackEmailTemplate } from '../../utils/feedbackTemplates';
import { useDialog } from '../../context/DialogContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../hooks/useSettings';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    name: string;
    email: string | null;
    secondary_email?: string | null;
    source: string | null;
  };
  onSuccess: () => void;
}

export default function FeedbackEmailModal({ isOpen, onClose, lead, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const { showAlert, showConfirm } = useDialog();
  const { session } = useAuth();
  const { data: settings } = useSettings();

  if (!isOpen) return null;

  const promotionName = settings?.promotion_name || 'Residencial Altavik';

  const handleSendFeedbackEmail = async () => {
    const recipients = [lead.email, lead.secondary_email].filter(Boolean) as string[];
    if (recipients.length === 0) {
      await showAlert({ title: 'Error', message: 'El cliente no tiene ningún correo electrónico registrado.' });
      return;
    }

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const proceed = await showConfirm({
        title: 'Advertencia: Entorno Local',
        message: 'Estás ejecutando la aplicación en modo local (localhost). Si envías esta encuesta, el enlace apuntará a tu equipo y no funcionará para el cliente. ¿Deseas enviarla de todos modos?',
        confirmText: 'Enviar de todos modos',
        cancelText: 'Cancelar',
      });
      if (!proceed) return;
    }

    setLoading(true);
    try {
      // 1. Preparar el pixel de seguimiento
      let trackingId = '';
      let trackingPixelHtml = '';
      try {
        const { data: trackingRecord, error: trackingError } = await (supabase as any)
          .from('email_tracking')
          .insert([{ 
            lead_id: lead.id, 
            subject: `Una breve opinión sobre ${promotionName}` 
          }])
          .select()
          .single();

        if (trackingError) {
          console.error("No se pudo registrar el tracking para la encuesta:", trackingError);
        } else if (trackingRecord) {
          trackingId = trackingRecord.id;
          const trackingPixelUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-email-open?tracking_id=${trackingId}`;
          trackingPixelHtml = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
        }
      } catch (err) {
        console.error("Error al generar pixel de seguimiento:", err);
      }

      // 2. Preparar el contenido
      const baseUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
      let emailHtml = getFeedbackEmailTemplate(lead.name, promotionName, lead.id, baseUrl);
      if (trackingPixelHtml) {
        emailHtml = emailHtml.replace('</body>', `${trackingPixelHtml}</body>`);
      }

      // 3. Enviar vía Supabase Edge Function
      const recipients = [lead.email, lead.secondary_email].filter(Boolean) as string[];
      const { data, error: sendError } = await supabase.functions.invoke('send-email', {
        body: {
          to: recipients.length === 1 ? recipients[0] : recipients,
          subject: `Una breve opinión sobre ${promotionName}`,
          html: emailHtml,
        },
      });

      if (sendError || data?.error) {
        throw new Error(data?.error || sendError?.message || 'Error al enviar el email');
      }

      // 4. Actualizar base de datos del lead
      const { error: dbError } = await (supabase as any)
        .from('leads')
        .update({ 
          feedback_sent: true,
          feedback_sent_at: new Date().toISOString()
        } as any)
        .eq('id', lead.id);

      if (dbError) throw dbError;

      // 5. Registrar en el historial del lead
      const { error: historyError } = await (supabase as any)
        .from('lead_history')
        .insert([{
          lead_id: lead.id,
          user_id: session?.user?.id,
          event_type: 'email',
          description: `Solicitud de opinión de ${promotionName} enviada al cliente.`,
          metadata: {
            type: 'survey_request',
            sent_at: new Date().toISOString(),
            tracking_id: trackingId
          }
        }]);

      if (historyError) {
        console.error('Error logging survey send to lead_history:', historyError);
      }

      // 6. Registrar en la agenda (como correo enviado) para que aparezca en la pestaña "Correos"
      try {
        const agendaPayload: any = {
          lead_id: lead.id,
          user_id: session?.user?.id,
          title: `Envío Email: Solicitud de opinión`,
          type: 'Email',
          due_date: new Date().toISOString(),
          completed: true
        };
        if (trackingId) {
          agendaPayload.tracking_id = trackingId;
        }
        await (supabase as any).from('agenda').insert([agendaPayload]);
      } catch (agendaErr) {
        console.error('Error al crear tarea de agenda para encuesta:', agendaErr);
      }

      await showAlert({ 
        title: '¡Email Enviado!', 
        message: `Se ha enviado la solicitud de opinión a ${lead.name} correctamente.` 
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error enviando feedback:', err);
      await showAlert({ title: 'Error', message: err.message || 'No se pudo enviar el correo. Verifica tu conexión.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100 p-6 relative">
        <button type="button" 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <MessageSquare size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Enviar Encuesta de Opinión</h2>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Se va a enviar un correo electrónico a <strong className="text-slate-900">{lead.name}</strong> ({lead.email || 'Sin correo electrónico'}) solicitando su opinión sobre <strong>{promotionName}</strong>.
          </p>

          <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100">
            El correo electrónico contiene el nuevo diseño corporativo e incluye un botón interactivo para comenzar la encuesta de satisfacción.
          </p>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors text-sm font-semibold"
          >
            Cancelar
          </button>
          <button type="button"
            onClick={handleSendFeedbackEmail}
            disabled={loading || !lead.email}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold shadow-md shadow-blue-500/10 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {loading ? 'Enviando...' : 'Enviar encuesta'}
          </button>
        </div>
      </div>
    </div>
  );
}
