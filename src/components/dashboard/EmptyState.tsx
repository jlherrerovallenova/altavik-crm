import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
      <div className="p-5 bg-slate-50 rounded-full text-slate-300 mb-4 ring-8 ring-slate-50/50">
        {icon && React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { size: 40 } as any) : icon}
      </div>
      <h4 className="text-sm font-black text-slate-800 mb-1 tracking-tight">{title}</h4>
      <p className="text-[11px] text-slate-400 font-medium px-10">{subtitle}</p>
    </div>
  );
}
