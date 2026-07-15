import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'white' | 'glass' | 'dark';
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  variant = 'white',
  noPadding = false
}) => {
  const baseStyles = 'rounded-[2.5rem] transition-all duration-500 overflow-hidden';
  
  const variants = {
    white: 'bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
    glass: 'glass-card animate-fade-in-scale',
    dark: 'bg-slate-900 text-white shadow-xl shadow-slate-900/15'
  };

  return (
    <div 
      className={`${baseStyles} ${variants[variant]} ${noPadding ? '' : 'p-6'} animate-in fade-in slide-in-from-bottom-5 duration-500 ${className}`}
    >
      {children}
    </div>
  );
};
