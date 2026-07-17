import React from 'react';
import { Heart, HelpCircle, XCircle, Send } from 'lucide-react';

interface FeedbackListItemProps {
  lead: {
    id: string;
    name: string;
    source: string | null;
    status: string;
    feedback_sent?: boolean;
    feedback_rating: string | null;
    feedback_responded_at: string | null;
  };
  onSend: () => void;
}

export function FeedbackListItem({ lead, onSend }: FeedbackListItemProps) {
  const hasFeedback = !!lead.feedback_rating;
  const isSent = !!lead.feedback_sent;
  
  const ratingCfg = {
    mas_info: { icon: <Heart size={14} className="text-pink-500" />, label: 'Me interesa', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    pensarlo: { icon: <HelpCircle size={14} className="text-amber-500" />, label: 'Necesito pensarlo', color: 'bg-amber-50 text-amber-700 border-amber-100' },
    no_encaja: { icon: <XCircle size={14} className="text-slate-400" />, label: 'No encaja', color: 'bg-slate-50 text-slate-600 border-slate-200' },
    encontrado: { icon: <XCircle size={14} className="text-slate-400" />, label: 'Ya compró/alquiló', color: 'bg-slate-50 text-slate-600 border-slate-200' },
    positive: { icon: <Heart size={14} className="text-pink-500" />, label: 'Me ha encantado', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    neutral: { icon: <HelpCircle size={14} className="text-amber-500" />, label: 'Tengo dudas', color: 'bg-amber-50 text-amber-700 border-amber-100' },
    negative: { icon: <XCircle size={14} className="text-slate-400" />, label: 'No es lo que buscaba', color: 'bg-slate-50 text-slate-600 border-slate-200' },
  }[lead.feedback_rating as string] || null;

  return (
    <div className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:pl-2 transition-all rounded-2xl ${hasFeedback ? 'bg-slate-50/50 px-4 mb-2 border border-slate-100' : ''}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-xs group-hover:scale-105 transition-transform ${hasFeedback ? 'bg-white border-slate-200 text-slate-700' : 'bg-altavik-50 text-altavik-600 border-altavik-100 border'}`}>
          {lead.name.substring(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="text-[14px] font-black text-slate-800 tracking-tight truncate">{lead.name}</span>
            {hasFeedback ? (
              <span className={`flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${ratingCfg?.color}`}>
                {ratingCfg?.icon}
                <span className="truncate">{ratingCfg?.label}</span>
              </span>
            ) : isSent ? (
              <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg border border-blue-100 whitespace-nowrap">
                SOLICITADA
              </span>
            ) : (
              <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-200 whitespace-nowrap">
                {lead.status === 'visiting' ? 'VISITÓ HACE +7 DÍAS' : 'VENTA CERRADA'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
            <span className="truncate max-w-[100px] sm:max-w-none">{lead.source || 'Sin registro'}</span>
            <span className="text-[8px] opacity-30">•</span>
            {hasFeedback ? (
              <span className="text-slate-500 font-bold italic truncate">
                {lead.feedback_responded_at ? new Date(lead.feedback_responded_at).toLocaleDateString() : ''}
              </span>
            ) : isSent ? (
              <span className="text-blue-600 font-bold">Encuesta enviada, esperando respuesta</span>
            ) : (
              <span className="text-altavik-600 font-bold">Esperando feedback</span>
            )}
          </div>
        </div>
      </div>
      
      {!hasFeedback ? (
        <button type="button"
          onClick={onSend}
          className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-[11px] font-black shadow-lg sm:transform sm:translate-x-2 sm:group-hover:translate-x-0 active:scale-95 w-full sm:w-auto"
        >
          <Send size={14} /> {isSent ? 'REENVIAR ENCUESTA' : 'ENVIAR ENCUESTA'}
        </button>
      ) : (
        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border border-slate-100 text-center sm:text-left">
          Registrado
        </div>
      )}
    </div>
  );
}
