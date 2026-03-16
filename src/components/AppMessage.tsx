import { X, Info, CheckCircle, AlertTriangle } from 'lucide-react';

interface AppMessageProps {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning';
  onClose?: () => void;
}

export function AppMessage({ title, message, type = 'info', onClose }: AppMessageProps) {
  const styles = {
    info: {
      bg: 'bg-white',
      border: 'border-pine-100',
      icon: <Info className="text-altavik-600" size={20} />,
      accent: 'bg-altavik-600'
    },
    success: {
      bg: 'bg-altavik-50',
      border: 'border-altavik-100',
      icon: <CheckCircle className="text-altavik-600" size={20} />,
      accent: 'bg-altavik-600'
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      icon: <AlertTriangle className="text-amber-500" size={20} />,
      accent: 'bg-amber-500'
    }
  };

  const currentStyle = styles[type];

  return (
    <div className={`${currentStyle.bg} border ${currentStyle.border} p-5 rounded-4xl shadow-xl shadow-altavik-900/5 flex items-start gap-4 relative overflow-hidden animate-in slide-in-from-right-8 duration-500`}>
      {/* Barra de acento lateral */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${currentStyle.accent}`}></div>

      <div className="p-3 bg-white rounded-2xl shadow-sm border border-altavik-50">
        {currentStyle.icon}
      </div>

      <div className="flex-1 pr-6">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
          {title}
        </h4>
        <p className="text-sm font-bold text-slate-800 leading-tight">
          {message}
        </p>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="p-2 hover:bg-altavik-50 rounded-xl transition-colors text-slate-300 hover:text-slate-600"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}