import React from 'react';
import { User, Phone, Mail, Zap, MessageCircle, ChevronRight, Star, Heart } from 'lucide-react';
import { SourceIcon, StatusBadge, STATUS_CONFIG } from './LeadStatus';
import type { Database } from '../../types/supabase';

type Lead = Database['public']['Tables']['leads']['Row'];

interface LeadListItemProps {
  lead: Lead;
  isSelected: boolean;
  onClick: () => void;
  onCompose: (lead: Lead, method: 'email' | 'whatsapp', template?: 'first_contact') => void;
  onSendFeedback: (lead: Lead) => void;
}

export function LeadListItem({ lead, isSelected, onClick, onCompose, onSendFeedback }: LeadListItemProps) {
  const cfg = STATUS_CONFIG[lead.status || 'new'] || STATUS_CONFIG['new'];
  
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer group border-b border-slate-100 border-l-4 ${cfg.border} ${isSelected ? 'bg-blue-50/80 ring-1 ring-blue-100/50 z-10 sticky' : 'hover:bg-slate-50/80'} transition-all duration-150 relative`}
    >
      {/* ================= DESKTOP VIEW ================= */}
      <div className="hidden md:grid grid-cols-[22fr_12fr_18fr_10fr_12fr_10fr_8fr_8fr] gap-4 px-6 py-4 items-center">
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

        <div className="flex justify-center items-center">
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

        <div className="flex justify-start items-center">
          {lead.client_quality_rating ? (
            <div className="flex items-center gap-0.5 text-amber-400">
              <Star size={12} fill="currentColor" />
              <span className="text-[10px] font-bold ml-1 text-slate-600">{lead.client_quality_rating}/5</span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-300 italic">N/A</span>
          )}
        </div>

        <div className="flex items-center justify-start gap-1 transition-opacity">
          <button type="button" onClick={(e) => { e.stopPropagation(); onCompose(lead, 'whatsapp'); }} className="p-1.5 text-slate-400 hover:text-altavik-600 hover:bg-altavik-50 rounded-lg transition-all" title="WhatsApp"><MessageCircle strokeWidth={2.5} size={15} /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onCompose(lead, 'email'); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Email"><Mail strokeWidth={2.5} size={15} /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onSendFeedback(lead); }} className="p-1.5 text-slate-400 hover:text-pink-500 hover:bg-pink-50 rounded-lg transition-all" title="Enviar Encuesta de Opinión"><Heart strokeWidth={2.5} size={15} /></button>
          <ChevronRight strokeWidth={2.5} size={15} className="text-slate-300 group-hover:text-altavik-500 transition-colors" />
        </div>
      </div>

      {/* ================= MOBILE VIEW ================= */}
      <div className="md:hidden flex flex-col gap-3 px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 shrink-0">
              <User size={18} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm truncate leading-tight">{lead.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-slate-400 font-medium">
                  {new Date(lead.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                {lead.client_quality_rating && (
                  <div className="flex items-center gap-0.5 text-amber-400">
                    <Star size={10} fill="currentColor" />
                    <span className="text-[10px] font-bold text-slate-600">{lead.client_quality_rating}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="shrink-0 scale-90 origin-right">
            <StatusBadge status={lead.status} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 pl-[52px]">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Phone size={12} className="text-slate-400" />
            <span className="truncate">{lead.phone || <span className="text-slate-300 italic">Sin teléfono</span>}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Mail size={12} className="text-slate-400" />
            <span className="truncate">{lead.email || <span className="text-slate-300 italic">Sin email</span>}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-1 pl-[52px] pt-3 border-t border-slate-100/60">
          <div className="scale-90 origin-left">
            <SourceIcon source={lead.source} />
          </div>
          
          <div className="flex items-center gap-1">
            <button type="button" onClick={(e) => { e.stopPropagation(); onCompose(lead, 'whatsapp'); }} className="p-2 text-slate-400 hover:text-altavik-600 hover:bg-altavik-50 rounded-lg transition-all bg-slate-50/50 border border-slate-100" title="WhatsApp">
              <MessageCircle strokeWidth={2.5} size={16} />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onCompose(lead, 'email'); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all bg-slate-50/50 border border-slate-100" title="Email">
              <Mail strokeWidth={2.5} size={16} />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onSendFeedback(lead); }} className="p-2 text-slate-400 hover:text-pink-500 hover:bg-pink-50 rounded-lg transition-all bg-slate-50/50 border border-slate-100" title="Enviar Encuesta de Opinión">
              <Heart strokeWidth={2.5} size={16} />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <ChevronRight strokeWidth={2.5} size={18} className="text-slate-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
