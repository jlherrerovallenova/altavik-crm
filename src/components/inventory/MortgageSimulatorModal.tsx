// src/components/inventory/MortgageSimulatorModal.tsx
import { useState, useMemo } from 'react';
import { X, FileText, TrendingUp } from 'lucide-react';
import type { MortgageParams } from '../../utils/fichasVivienda';

interface Property {
  id: string;
  n_orden: string;
  portal: string;
  planta: string;
  letra: string;
  precio: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  onGenerate: (params: MortgageParams) => void;
  isGenerating?: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(n);

export default function MortgageSimulatorModal({ isOpen, onClose, property, onGenerate, isGenerating }: Props) {
  const totalWithIVA = property.precio * 1.1;

  const [entryPct, setEntryPct]       = useState(20);
  const [interestPct, setInterestPct] = useState(3.5);
  const [loanYears, setLoanYears]     = useState(30);

  const { entrada, capital, monthly, gastos } = useMemo(() => {
    const entrada  = totalWithIVA * (entryPct / 100);
    const capital  = totalWithIVA - entrada;
    const r        = (interestPct / 100) / 12;
    const n        = loanYears * 12;
    const monthly  = r > 0
      ? capital * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
      : capital / n;
    const notaria  = Math.round(Math.min(Math.max(property.precio * 0.005, 1200), 2500));
    const registro = Math.round(Math.min(Math.max(property.precio * 0.003, 600), 1400));
    const gastos   = notaria + registro + 450 + 400;
    return { entrada, capital, monthly, gastos };
  }, [entryPct, interestPct, loanYears, totalWithIVA, property.precio]);

  if (!isOpen) return null;

  const handleGenerate = () => {
    onGenerate({ interestRate: interestPct / 100, loanYears, entryPct: entryPct / 100 });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 font-sans">

        {/* Header — estilo app Altavik */}
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-altavik-500/20 flex items-center justify-center">
              <TrendingUp size={16} className="text-altavik-300" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-tight">Simulador Hipotecario</h2>
              <p className="text-slate-400 text-[11px] font-medium mt-0.5">
                Viv. #{property.n_orden} · P{property.portal} {property.planta}-{property.letra}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Grid de inputs */}
          <div className="grid grid-cols-2 gap-3">
            {/* Precio — readonly */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio</label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-600 font-semibold text-sm">
                {fmt(property.precio)}
              </div>
            </div>

            {/* Entrada % */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrada (%)</label>
              <input
                type="number" min={5} max={100} step={1}
                value={entryPct}
                onChange={e => setEntryPct(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-altavik-500/30 focus:border-altavik-400 transition-all"
              />
            </div>

            {/* Interés % */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interés (%)</label>
              <input
                type="number" min={0.1} max={15} step={0.1}
                value={interestPct}
                onChange={e => setInterestPct(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-altavik-500/30 focus:border-altavik-400 transition-all"
              />
            </div>

            {/* Plazo */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plazo (años)</label>
              <input
                type="number" min={5} max={40} step={1}
                value={loanYears}
                onChange={e => setLoanYears(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-altavik-500/30 focus:border-altavik-400 transition-all"
              />
            </div>
          </div>

          {/* Preview mensualidad — banner altavik */}
          <div className="bg-altavik-500 rounded-xl p-4 text-center">
            <p className="text-altavik-100 text-[10px] font-black uppercase tracking-widest mb-1">Cuota mensual estimada</p>
            <p className="text-white text-3xl font-black">
              {Math.round(monthly).toLocaleString('de-DE')} €
            </p>
          </div>

          {/* Resumen */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs font-medium">Capital a financiar:</span>
              <span className="font-bold text-slate-700 text-xs">{fmt(capital)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs font-medium">Entrada ({entryPct}%):</span>
              <span className="font-bold text-slate-700 text-xs">{fmt(entrada)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
              <span className="text-altavik-600 text-xs font-semibold">Notaría, Registro, Gestoría (Est.):</span>
              <span className="font-bold text-altavik-600 text-xs">{fmt(gastos)}</span>
            </div>
          </div>

          {/* Botones */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-altavik-600 hover:bg-altavik-700 active:scale-95 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-altavik-500/20 disabled:opacity-60"
          >
            <FileText size={17} />
            {isGenerating ? 'Generando...' : 'Generar PDF'}
          </button>

          <button
            onClick={onClose}
            className="w-full text-slate-500 font-semibold py-2 rounded-xl hover:bg-slate-50 transition-colors text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
