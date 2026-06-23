import React from 'react';
import { Circle, CheckCircle2, AlertCircle, Trash2, MessageCircle } from 'lucide-react';

interface AgendaListItemProps {
  task: {
    id: number;
    title: string;
    type: string;
    due_date: string;
    completed?: boolean;
    leads?: {
      name: string;
    } | null;
    email_tracking?: {
      id: string;
      status: string;
      opens_count: number;
      last_opened_at: string | null;
    } | null;
  };
  onToggle: () => void;
  onDelete: () => void;
  onWhatsApp?: () => void;
  formatDate: (date: string) => string;
  readOnly?: boolean;
  hideToggle?: boolean;
}

export function AgendaListItem({ task, onToggle, onDelete, onWhatsApp, formatDate, readOnly, hideToggle }: AgendaListItemProps) {
  const isOverdue = new Date(task.due_date) < new Date();
  
  return (
    <div className="py-4 flex items-center justify-between group hover:pl-2 transition-all rounded-2xl">
      <div className="flex items-center gap-4">
        {!readOnly && !hideToggle && (
          <button
            onClick={onToggle}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all border-2 hover:rotate-12 hover:scale-105 group-hover:shadow-lg shadow-slate-200/50 ${
              task.completed 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-500 hover:border-emerald-600 hover:text-emerald-600' 
                : 'border-slate-100 bg-white text-slate-200 hover:border-altavik-500 hover:text-altavik-500'
            }`}
          >
            {task.completed ? <CheckCircle2 size={22} strokeWidth={3} /> : <Circle size={22} strokeWidth={3} />}
          </button>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
              task.type === 'Llamada' ? 'bg-blue-50 text-blue-600 border-blue-100' :
              task.type === 'WhatsApp' ? 'bg-altavik-50 text-altavik-600 border-altavik-100' :
              task.type === 'Visita' ? 'bg-purple-50 text-purple-600 border-purple-100' :
              task.type === 'Email' ? 'bg-amber-50 text-amber-600 border-amber-100' :
              'bg-slate-50 text-slate-500 border-slate-100'
            }`}>
              {task.type}
            </span>
            {task.type === 'Email' && task.email_tracking && (() => {
              const tracking = task.email_tracking;
              const isOpened = tracking.status === 'opened' || tracking.opens_count > 0;
              const opensLabel = tracking.opens_count > 0 ? ` (${tracking.opens_count})` : '';
              return (
                <span 
                  className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                    isOpened 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                      : 'bg-slate-50 text-slate-400 border-slate-100'
                  }`}
                  title={
                    isOpened 
                      ? `Abierto${opensLabel}. Última apertura: ${new Date(tracking.last_opened_at || '').toLocaleString()}`
                      : 'Recibido pero aún no abierto.'
                  }
                >
                  {isOpened ? 'ABIERTO' : 'ENVIADO'}
                  {opensLabel}
                </span>
              );
            })()}
            <span className="text-[15px] font-black text-slate-800 tracking-tight truncate max-w-[200px]">
              {task.leads?.name || 'Cliente anónimo'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold">
            <span className={`truncate ${task.completed ? 'opacity-60' : ''}`}>
              {(() => {
                const match = task.title.match(/^(Envío\s+[^:]+):\s*(.*)$/i);
                if (match) {
                  const prefix = match[1];
                  const docs = match[2].split(',').map(d => d.trim()).filter(Boolean);
                  return `${prefix} (${docs.length} ${docs.length === 1 ? 'documento' : 'documentos'})`;
                }
                return task.title;
              })()}
            </span>
            <span className="opacity-30">•</span>
            <span className={`${isOverdue && !task.completed ? "text-red-500 font-black flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100" : "text-altavik-600"}`}>
              {isOverdue && !task.completed && <AlertCircle size={10} />}
              {formatDate(task.due_date)}
            </span>
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 transform translate-x-3 group-hover:translate-x-0">
          {onWhatsApp && (
            <button
              onClick={onWhatsApp}
              className="p-2.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
              title="Enviar recordatorio por WhatsApp"
            >
              <MessageCircle size={18} />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
