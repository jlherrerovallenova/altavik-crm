import React, { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronUp, CheckCircle2, Circle } from 'lucide-react';
import type { Database } from '../../types/supabase';

type Installment = Database['public']['Tables']['installments']['Row'];

interface Props {
  installments: Installment[];
  monthlyAmount: number;
  fmt: (n: number) => string;
  toggleInstallment: (inst: Installment) => Promise<void>;
}

export default function SaleInstallments({ installments, monthlyAmount, fmt, toggleInstallment }: Props) {
  const [showInstallments, setShowInstallments] = useState(false);
  const paidCount = installments.filter(i => i.paid).length;

  if (installments.length === 0) return null;

  return (
    <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setShowInstallments(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-purple-600" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-purple-600">
            Recibos Mensuales — {paidCount}/{installments.length} pagados
          </h3>
        </div>
        {showInstallments ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {showInstallments && (
        <div className="p-4">
          {/* Barra de progreso */}
          <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${(paidCount / installments.length) * 100}%` }}
            />
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {installments.map(inst => (
              <div
                key={inst.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                  inst.paid ? 'bg-green-50 border-green-100' : 'bg-white border-slate-100 hover:border-purple-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <button onClick={() => toggleInstallment(inst)} className={`shrink-0 transition-transform hover:scale-110 ${inst.paid ? 'text-green-500' : 'text-slate-300 hover:text-purple-500'}`}>
                    {inst.paid ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </button>
                  <div>
                    <span className="text-xs font-bold text-slate-700">Cuota {inst.installment_number}</span>
                    <span className="text-[10px] text-slate-400 ml-2">{new Date(inst.due_date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${inst.paid ? 'text-green-600' : 'text-slate-700'}`}>{fmt(inst.amount)}</div>
                  {inst.paid && inst.paid_date && (
                    <div className="text-[9px] text-green-500">Pagado: {new Date(inst.paid_date).toLocaleDateString('es-ES')}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs font-bold">
            <span className="text-slate-600">Total cobrado</span>
            <span className="text-green-600">{fmt(paidCount * monthlyAmount)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-600">Pendiente</span>
            <span className="text-purple-600">{fmt((installments.length - paidCount) * monthlyAmount)}</span>
          </div>
        </div>
      )}
    </section>
  );
}
