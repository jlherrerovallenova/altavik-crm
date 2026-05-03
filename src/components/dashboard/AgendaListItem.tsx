import React from 'react';
import { Circle, AlertCircle, Trash2 } from 'lucide-react';

interface AgendaListItemProps {
  task: {
    id: number;
    title: string;
    type: string;
    due_date: string;
    leads?: {
      name: string;
    } | null;
  };
  onToggle: () => void;
  onDelete: () => void;
  formatDate: (date: string) => string;
}

export function AgendaListItem({ task, onToggle, onDelete, formatDate }: AgendaListItemProps) {
  const isOverdue = new Date(task.due_date) < new Date();
  
  return (
    <div className="py-4 flex items-center justify-between group hover:pl-2 transition-all rounded-2xl">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggle}
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all border-2 border-slate-100 bg-white text-slate-200 hover:border-altavik-500 hover:text-altavik-500 hover:rotate-12 hover:scale-105 group-hover:shadow-lg shadow-slate-200/50"
        >
          <Circle size={22} strokeWidth={3} />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
              task.type === 'Llamada' ? 'bg-blue-50 text-blue-600 border-blue-100' :
              task.type === 'WhatsApp' ? 'bg-altavik-50 text-altavik-600 border-altavik-100' :
              task.type === 'Visita' ? 'bg-purple-50 text-purple-600 border-purple-100' :
              'bg-slate-50 text-slate-500 border-slate-100'
            }`}>
              {task.type}
            </span>
            <span className="text-[15px] font-black text-slate-800 tracking-tight truncate max-w-[200px]">
              {task.leads?.name || 'Cliente anónimo'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold">
            <span className="truncate">{task.title}</span>
            <span className="opacity-30">•</span>
            <span className={`${isOverdue ? "text-red-500 font-black flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100" : "text-altavik-600"}`}>
              {isOverdue && <AlertCircle size={10} />}
              {formatDate(task.due_date)}
            </span>
          </div>
        </div>
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 transform translate-x-3 group-hover:translate-x-0">
        <button
          onClick={onDelete}
          className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
