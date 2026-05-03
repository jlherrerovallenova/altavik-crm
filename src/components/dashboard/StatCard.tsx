import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon?: React.ReactNode;
  color?: 'slate' | 'indigo' | 'emerald' | 'amber' | 'rose';
  onClick?: () => void;
}

export function StatCard({ title, value, subtitle, icon, onClick, color = 'slate' }: StatCardProps) {
  const barColors = {
    slate: 'bg-blue-500',
    indigo: 'bg-indigo-600',
    emerald: 'bg-emerald-500',
    amber: 'bg-orange-500',
    rose: 'bg-rose-500'
  };

  const barColor = barColors[color] || barColors.slate;

  return (
    <div
      onClick={onClick}
      className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm transition-all duration-300 flex flex-col justify-between h-full min-h-[140px] group hover:shadow-md hover:-translate-y-1 cursor-pointer overflow-hidden relative active:scale-95"
    >
      <div className="flex justify-between items-center mb-4">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{title}</span>
        <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
          {icon && React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { size: 22, strokeWidth: 1.5 } as any) : icon}
        </div>
      </div>
      
      <div>
        <h4 className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-1">{value}</h4>
        <p className="text-[11px] text-slate-500 font-medium mt-3">{subtitle}</p>
      </div>

      {/* Bottom accent bar */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${barColor} opacity-90`} />
    </div>
  );
}
