import React from 'react';
import { Globe, Smartphone, Users, MapPin, Phone, HelpCircle, Search } from 'lucide-react';
import { IdealistaIcon } from '../Shared';

interface SourceIconProps {
  source: string | null;
}

export function SourceIcon({ source }: SourceIconProps) {
  const s = source?.trim() || 'Directo';
  const lower = s.toLowerCase();
  
  if (lower.includes('idealista')) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 group/source" title="Idealista">
        <IdealistaIcon className="w-5 h-5" />
        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">Idealista</span>
      </div>
    );
  }

  if (lower.includes('google sem') || lower.includes('sem')) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 group/source" title={s}>
        <div className="w-5 h-5 bg-blue-50 flex items-center justify-center rounded border border-blue-100 shadow-sm">
          <Search strokeWidth={2.5} size={11} className="text-blue-600" />
        </div>
        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">G. SEM</span>
      </div>
    );
  }

  if (lower.includes('web') || lower.includes('google')) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 group/source" title={s}>
        <div className="w-5 h-5 bg-blue-50 flex items-center justify-center rounded border border-blue-100 shadow-sm">
          <Globe strokeWidth={2.5} size={11} className="text-blue-600" />
        </div>
        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">Web</span>
      </div>
    );
  }

  if (lower.includes('insta') || lower.includes('facebook') || lower.includes('redes')) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 group/source" title="Redes Sociales">
        <div className="w-5 h-5 bg-purple-50 flex items-center justify-center rounded border border-purple-100 shadow-sm">
          <Smartphone strokeWidth={2.5} size={11} className="text-purple-600" />
        </div>
        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">Social</span>
      </div>
    );
  }

  if (lower.includes('referido') || lower.includes('amigo')) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 group/source" title="Referido">
        <div className="w-5 h-5 bg-emerald-50 flex items-center justify-center rounded border border-emerald-100 shadow-sm">
          <Users strokeWidth={2.5} size={11} className="text-emerald-600" />
        </div>
        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">Amigo</span>
      </div>
    );
  }

  if (lower.includes('valla')) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 group/source" title="Valla">
        <div className="w-5 h-5 bg-orange-50 flex items-center justify-center rounded border border-orange-100 shadow-sm">
          <MapPin strokeWidth={2.5} size={11} className="text-orange-500" />
        </div>
        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">Valla</span>
      </div>
    );
  }

  if (lower.includes('llamada') || lower.includes('tel')) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 group/source" title="Llamada">
        <div className="w-5 h-5 bg-green-50 flex items-center justify-center rounded border border-green-100 shadow-sm">
          <Phone strokeWidth={2.5} size={11} className="text-green-600" />
        </div>
        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">Llamada</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1 group/source" title={s}>
      <div className="w-5 h-5 bg-slate-50 flex items-center justify-center rounded border border-slate-200 shadow-sm">
        <HelpCircle strokeWidth={2.5} size={11} className="text-slate-500" />
      </div>
      <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">Otros</span>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  qualified: 'Cualificado',
  visiting: 'Visitando',
  closed: 'Venta Cerrada',
  lost: 'Perdido',
};

const STATUS_CONFIG: Record<string, { dot: string; pill: string; border: string }> = {
  new:         { dot: 'bg-blue-400',    pill: 'bg-blue-50 text-blue-700 border border-blue-200',       border: 'border-l-blue-400' },
  contacted:   { dot: 'bg-purple-400',  pill: 'bg-purple-50 text-purple-700 border border-purple-200', border: 'border-l-purple-400' },
  qualified:   { dot: 'bg-altavik-400', pill: 'bg-altavik-50 text-altavik-700 border border-emerald-200', border: 'border-l-altavik-400' },
  visiting:    { dot: 'bg-cyan-400',    pill: 'bg-cyan-50 text-cyan-700 border border-cyan-200',       border: 'border-l-cyan-400' },
  closed:      { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200', border: 'border-l-emerald-500' },
  lost:        { dot: 'bg-red-400',     pill: 'bg-red-50 text-red-700 border border-red-200',         border: 'border-l-red-400' },
};

export function StatusBadge({ status }: { status: string | null }) {
  const cfg = STATUS_CONFIG[status || 'new'] || STATUS_CONFIG['new'];
  const label = STATUS_LABELS[status || 'new'] || 'Nuevo';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {label}
    </span>
  );
}

export { STATUS_CONFIG, STATUS_LABELS };
