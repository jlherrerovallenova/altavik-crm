import React from 'react';
import { User, Phone, Mail, Zap, MessageCircle, ChevronRight } from 'lucide-react';
import { SourceIcon, StatusBadge, STATUS_CONFIG } from './LeadStatus';
import type { Database } from '../../types/supabase';

type Lead = Database['public']['Tables']['leads']['Row'];

interface LeadListItemProps {
  lead: Lead;
  isSelected: boolean;
  onClick: () => void;
  onCompose: (lead: Lead, method: 'email' | 'whatsapp', template?: 'first_contact') => void;
}

export function LeadListItem({ lead, isSelected, onClick, onCompose }: LeadListItemProps) {
  const cfg = STATUS_CONFIG[lead.status || 'new'] || STATUS_CONFIG['new'];
  
  return (
    <div
      onClick={onClick}
      className={`grid grid-cols-1 md:grid-cols-[24fr_12fr_20fr_10fr_14fr_12fr_8fr] gap-4 px-6 py-4 items-center cursor-pointer group border-b border-slate-100 border-l-4 ${cfg.border} ${isSelected ? 'bg-blue-50/80 ring-1 ring-blue-100/50 z-10 sticky' : 'hover:bg-slate-50/80'} transition-all duration-150`}
    >
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 shrink-0">
          <User size={18} strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex items-center">
          <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-altavik-700 transition-colors leading-tight">{lead.name}</h3>
        </div>
      </div>

      <div className="flex justify-start items-center">
        <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
          <div className="w-5 h-5 rounded-md bg-altavik-50 flex items-center justify-center shrink-0">
            <Phone size={11} className="text-altavik-400" />
          </div>
          <span className="truncate">{lead.phone || <span className="text-slate-300 italic">Sin teléfono</span>}</span>
        </div>
      </div>

      <div className="flex justify-start items-center">
        <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
          <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center shrink-0">
            <Mail size={11} className="text-blue-400" />
          </div>
          <span className="truncate">{lead.email || <span className="text-slate-300 italic">Sin email</span>}</span>
        </div>
      </div>

      <div className="flex justify-start items-center">
        <SourceIcon source={lead.source} />
      </div>

      <div className="flex justify-start items-center">
        <StatusBadge status={lead.status} />
      </div>

      <div className="flex justify-start items-center">
        <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
          {new Date(lead.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center justify-start gap-1 transition-opacity">
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            onCompose(lead, 'whatsapp', 'first_contact');
          }} 
          className="p-1 px-1.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 hover:bg-emerald-100 transition-colors flex items-center gap-1 group/btn"
          title="WhatsApp Primer Contacto"
        >
          <Zap size={12} fill="currentColor" className="text-altavik-500" />
          <span className="text-[9px] font-black uppercase hidden group-hover/btn:inline">Primer Contacto</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onCompose(lead, 'whatsapp'); }} className="p-1.5 text-slate-400 hover:text-altavik-600 hover:bg-altavik-50 rounded-lg transition-all" title="WhatsApp"><MessageCircle strokeWidth={2.5} size={15} /></button>
        <button onClick={(e) => { e.stopPropagation(); onCompose(lead, 'email'); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Email"><Mail strokeWidth={2.5} size={15} /></button>
        <ChevronRight strokeWidth={2.5} size={15} className="text-slate-300 group-hover:text-altavik-500 transition-colors" />
      </div>
    </div>
  );
}
