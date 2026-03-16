import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

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
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const themes = {
    success: {
      icon: <CheckCircle2 className="text-altavik-500" size={24} />,
      bg: 'bg-altavik-50/90',
      border: 'border-altavik-100',
      accent: 'bg-altavik-500',
    },
    error: {
      icon: <AlertCircle className="text-rose-500" size={24} />,
      bg: 'bg-rose-50/90',
      border: 'border-rose-100',
      accent: 'bg-rose-500',
    },
    info: {
      icon: <Info className="text-altavik-500" size={24} />,
      bg: 'bg-white/95',
      border: 'border-pine-100',
      accent: 'bg-altavik-500',
    },
  };

  const theme = themes[type];

  return (
    <div className={`
      fixed bottom-6 right-6 z-[100]
      w-full max-w-sm overflow-hidden
      ${theme.bg} backdrop-blur-md border ${theme.border}
      rounded-3xl shadow-2xl shadow-altavik-900/10
      animate-in slide-in-from-right-10 duration-500
    `}>
      {/* Barra de progreso o acento superior */}
      <div className={`h-1 w-full ${theme.accent} opacity-40`} />
      
      <div className="p-5 flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">
          {theme.icon}
        </div>
        
        <div className="flex-1">
          <h4 className="text-sm font-black text-altavik-900 font-poppins tracking-tight">
            {title}
          </h4>
          <p className="text-xs text-pine-700/80 font-lato mt-1 leading-relaxed">
            {message}
          </p>
        </div>

        <button 
          onClick={onClose}
          className="p-1 hover:bg-pine-100/50 rounded-full transition-colors text-pine-400"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};