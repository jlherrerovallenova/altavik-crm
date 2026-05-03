import React from 'react';
import { Plus } from 'lucide-react';

interface RadarItemProps {
  lead: {
    id: string;
    name: string;
    source: string | null;
    daysSinceLastActivity: number;
  };
  onClick: () => void;
}

export function RadarItem({ lead, onClick }: RadarItemProps) {
  return (
    <div 
      className="p-4 hover:bg-red-50/30 transition-all flex items-center justify-between group cursor-pointer rounded-2xl border border-transparent hover:border-red-100" 
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-red-50 text-red-600 border border-red-100 font-black text-xs group-hover:scale-105 transition-transform relative">
          {lead.name.substring(0, 2).toUpperCase()}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[14px] font-black text-slate-800 tracking-tight">{lead.name}</span>
            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-lg border border-red-200">CRÍTICO</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
            <span>{lead.source || 'Sin registro'}</span>
            <span className="text-[8px] opacity-30">•</span>
            <span className="text-red-500 font-bold">Sin actividad hace {lead.daysSinceLastActivity} días</span>
          </div>
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 p-2 bg-slate-900 text-white rounded-xl shadow-lg">
        <Plus size={16} />
      </div>
    </div>
  );
}
