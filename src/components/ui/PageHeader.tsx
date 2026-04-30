
import React from 'react';
import { Card } from './Card';

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, icon }) => {
  return (
    <Card variant="glass" className="mb-8 animate-fade-in-scale !rounded-[2.5rem] border-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="p-3 bg-altavik-600 rounded-2xl shadow-lg shadow-altavik-600/20 text-white">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight text-gradient leading-tight">
              {title}
            </h1>
            {subtitle && (
              <div className="text-slate-500 text-sm font-medium mt-1 flex items-center gap-2">
                {subtitle}
              </div>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </Card>
  );
};
