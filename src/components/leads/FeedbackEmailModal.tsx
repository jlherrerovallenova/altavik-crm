// src/components/leads/FeedbackEmailModal.tsx
import { useState } from 'react';
import { X, Send, CheckCircle2, Loader2, MessageSquareQuote } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getFeedbackEmailTemplate } from '../../utils/feedbackTemplates';
import { useDialog } from '../../context/DialogContext';
import emailjs from '@emailjs/browser';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    name: string;
    email: string | null;
    source: string | null;
  };
  onSuccess: () => void;
}

export default function FeedbackEmailModal({ isOpen, onClose, lead, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const { showAlert } = useDialog();

  if (!isOpen) return null;

  const handleSendFeedbackEmail = async () => {
    if (!lead.email) {
      await showAlert({ title: 'Error', message: 'El cliente no tiene un correo electrónico registrado.' });
      return;
    }

    setLoading(true);
    try {
      // 1. Preparar el contenido
      const emailHtml = getFeedbackEmailTemplate(lead.name);

      // 2. Enviar vía Supabase Edge Function (Igual que en EmailComposerModal)
      const { data, error: sendError } = await supabase.functions.invoke('send-email', {
        body: {
          to: lead.email,
          subject: 'Nos encantaría saber tu opinión - RESIDENCIAL ALTAVIK',
          html: emailHtml,
        },
      });

      if (sendError || data?.error) {
        throw new Error(data?.error || sendError?.message || 'Error al enviar el email');
      }

      // 3. Actualizar base de datos
      const { error: dbError } = await supabase
        .from('leads')
        .update({ 
          feedback_sent: true,
          feedback_sent_at: new Date().toISOString()
        } as any)
        .eq('id', lead.id);

      if (dbError) throw dbError;

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
      <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 scale-in-center">
        
        {/* Header con gradiente suave */}
        <div className="bg-gradient-to-r from-altavik-600 to-emerald-500 px-8 py-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <MessageSquareQuote size={120} />
          </div>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-4">
              <MessageSquareQuote size={24} />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Solicitud de Opinión</h2>
            <p className="text-emerald-50 opacity-90 text-sm mt-1">Envía una encuesta de satisfacción personalizada</p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-altavik-600 font-black text-sm shadow-sm">
              {lead.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Destinatario</p>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">{lead.name}</h3>
              <p className="text-sm font-medium text-slate-500">{lead.email || '⚠️ Sin correo electrónico'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 size={16} className="text-altavik-500" />
              ¿Qué incluye este envío?
            </h4>
            <ul className="grid grid-cols-1 gap-3">
              {[
                "Diseño premium corporativo",
                "Botones interactivos de valoración",
                "Registro automático en el CRM",
                "Clasificación emocional del cliente"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                  <div className="w-1.5 h-1.5 rounded-full bg-altavik-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 transition-all text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSendFeedbackEmail}
              disabled={loading || !lead.email}
              className="flex-[2] px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-900/20 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              Enviar Invitación VIP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
