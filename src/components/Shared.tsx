import React from 'react';
import { CheckCircle2, AlertCircle, X, Info, ChevronDown, Check } from 'lucide-react';

// Icono personalizado de Idealista
export const IdealistaIcon = ({ className = "" }: { className?: string; size?: number }) => (
  <div className={`aspect-square bg-[#deff30] flex items-center justify-center rounded-md shadow-sm border border-black/5 overflow-hidden shrink-0 w-5 h-5 ${className}`}>
    <span translate="no" className="text-[10px] font-bold text-slate-900 leading-none select-none tracking-tighter">id</span>
  </div>
);

// 1. Tarjeta de Estadísticas
// (StatCard implementation remains same)
export function StatCard({ title, value, subtext, icon, type = 'neutral' }: any) {
  const colors = {
    primary: 'bg-blue-500',
    warning: 'bg-amber-500',
    success: 'bg-altavik-500',
    neutral: 'bg-slate-400',
    error: 'bg-rose-500'
  };
  
  const activeColor = colors[type as keyof typeof colors] || colors.neutral;

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group hover:border-slate-300 transition-all">
      <div className="flex justify-between items-start z-10">
        <div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
        </div>
        <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
            {icon}
        </div>
      </div>
      <div className="mt-auto z-10">
        <p className="text-xs font-medium text-slate-400 truncate">
          {subtext}
        </p>
      </div>
      <div className={`absolute bottom-0 left-0 w-full h-1 ${activeColor}`}></div>
    </div>
  );
}

// 2. Badge de Estado (CONECTADO A DB)
export function StageBadge({ stage }: { stage: string }) {
  // Mapeo directo de los valores de la base de datos a Estilos y Etiquetas
  const config: any = {
     'new':         { label: 'Nuevo', class: 'bg-slate-100 text-slate-600 border-slate-200' },
     'contacted':   { label: 'Contactado', class: 'bg-blue-50 text-blue-700 border-blue-200' },
     'qualified':   { label: 'Cualificado', class: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
     'visiting':    { label: 'Visitando', class: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
     'closed':      { label: 'Venta Cerrada', class: 'bg-altavik-50 text-altavik-700 border-emerald-200' },
     'lost':        { label: 'Perdido', class: 'bg-rose-50 text-rose-700 border-rose-200' },
  };

  const active = config[stage] || { label: stage, class: 'bg-slate-50 text-slate-600 border-slate-200' };

  return (
     <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wide ${active.class}`}>
        {active.label}
     </span>
  );
}

// 3. Notificaciones
interface AppNotificationProps {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export const AppNotification: React.FC<AppNotificationProps> = ({
  title,
  message,
  type = 'success',
  onClose,
  duration = 5000,
}) => {
  React.useEffect(() => {
    const timer = setTimeout(() => onClose(), duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const themes = {
    success: { icon: <CheckCircle2 strokeWidth={2.5} size={20} />, style: 'bg-altavik-600 text-white' },
    error: { icon: <AlertCircle strokeWidth={2.5} size={20} />, style: 'bg-rose-600 text-white' },
    info: { icon: <Info strokeWidth={2.5} size={20} />, style: 'bg-slate-800 text-white' },
  };

  const theme = themes[type];

  return (
    <div className={`
      fixed bottom-6 right-6 z-[100]
      w-full max-w-sm overflow-hidden
      ${theme.style} rounded-xl shadow-lg shadow-slate-900/20
      animate-in slide-in-from-right-10 duration-300
      flex items-start p-4 gap-3
    `}>
      <div className="mt-0.5">{theme.icon}</div>
      <div className="flex-1">
        <h4 className="text-sm font-bold uppercase tracking-wide">{title}</h4>
        <p className="text-sm opacity-90 leading-snug mt-1">{message}</p>
      </div>
      <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity">
        <X strokeWidth={2.5} size={16} />
      </button>
    </div>
  );
};

// 4. Custom Select con iconos
export interface SelectOption {
  id: string;
  label: string;
  icon?: any;
  color?: string;
  dotColor?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  label?: string;
}

export function CustomSelect({ value, onChange, options, placeholder = 'Seleccionar...', className = '', label }: CustomSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const selected = options.find(o => o.id === value);

  return (
    <div className={`relative ${className}`}>
      {label && <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none transition-all text-sm font-bold text-slate-700 flex items-center justify-between cursor-pointer shadow-sm"
      >
        <div className="flex items-center gap-3">
          {selected?.icon && <selected.icon strokeWidth={2.5} size={16} className={selected.color || 'text-slate-400'} />}
          {selected?.dotColor && <span className={`w-2 h-2 rounded-full ${selected.dotColor}`} />}
          <span>{selected?.label || placeholder}</span>
        </div>
        <ChevronDown strokeWidth={2.5} size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-[70] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 py-1">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                }}
                className={`w-full px-5 py-3 flex items-center justify-between text-sm hover:bg-slate-50 transition-colors ${value === option.id ? 'bg-altavik-50/50 text-altavik-700 font-bold' : 'text-slate-600'}`}
              >
                <div className="flex items-center gap-3">
                  {option.icon && <option.icon size={16} className={option.color || 'text-slate-400'} />}
                  {option.dotColor && <span className={`w-2 h-2 rounded-full ${option.dotColor}`} />}
                  {option.label}
                </div>
                {value === option.id && <Check size={16} className="text-altavik-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}