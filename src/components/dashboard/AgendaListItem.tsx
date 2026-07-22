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
    <div className="py-1.5 flex items-center justify-between group rounded-xl transition-all">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {!readOnly && !hideToggle && (
          <button type="button"
            onClick={onToggle}
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all border shadow-2xs active:scale-95 ${
              task.completed 
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20' 
                : 'border-slate-200 bg-white text-slate-300 hover:border-altavik-500 hover:text-altavik-600'
            }`}
            title={task.completed ? "Marcar como pendiente" : "Marcar como completada"}
          >
            {task.completed ? <CheckCircle2 size={16} strokeWidth={2.5} /> : <Circle size={16} strokeWidth={2} />}
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
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
                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
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
            <span className="text-xs font-bold text-slate-800 tracking-tight truncate max-w-[180px]">
              {task.leads?.name || 'Cliente anónimo'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mt-0.5">
            <span className={`truncate ${task.completed ? 'line-through opacity-60' : ''}`}>
              {(() => {
                const match = task.title.match(/^(Envío\s+[^:]+):\s*(.*)$/i);
                if (match) {
                  const prefix = match[1];
                  const docs = match[2].split(',').map(d => d.trim()).filter(Boolean);
                  return `${prefix} (${docs.length} ${docs.length === 1 ? 'doc' : 'docs'})`;
                }
                return task.title;
              })()}
            </span>
            <span className="opacity-30">•</span>
            <span className={`${isOverdue && !task.completed ? "text-red-500 font-bold flex items-center gap-0.5 bg-red-50 px-1.5 py-0.5 rounded border border-red-100" : "text-slate-400"}`}>
              {isOverdue && !task.completed && <AlertCircle size={10} />}
              {formatDate(task.due_date)}
            </span>
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-0.5 shrink-0 ml-2">
          {onWhatsApp && (
            <button type="button"
              onClick={onWhatsApp}
              className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all"
              title="Enviar recordatorio por WhatsApp"
            >
              <MessageCircle size={14} />
            </button>
          )}
          <button type="button"
            onClick={onDelete}
            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
            title="Eliminar tarea"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
