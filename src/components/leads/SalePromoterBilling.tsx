import React from 'react';
import { BadgeEuro, Lock, Save } from 'lucide-react';
import type { Database } from '../../types/supabase';

type Sale = Database['public']['Tables']['sales']['Row'];
type PromoterInvoice = Database['public']['Tables']['promoter_invoices']['Row'];

interface Props {
  sale: Sale | null;
  promoterInvoices: PromoterInvoice[];
  loading: boolean;
  SALE_STEPS: ReadonlyArray<{ key: string; label: string; icon: any }>;
  fmt: (n: number) => string;
  setSale: React.Dispatch<React.SetStateAction<Sale | null>>;
  setPromoterInvoices: React.Dispatch<React.SetStateAction<PromoterInvoice[]>>;
  updateCommissionPercentage: (percentage: number) => Promise<void>;
  savePromoterInvoice: (inv: Partial<PromoterInvoice>) => Promise<void>;
}

export default function SalePromoterBilling({
  sale,
  promoterInvoices,
  loading,
  SALE_STEPS,
  fmt,
  setSale,
  setPromoterInvoices,
  updateCommissionPercentage,
  savePromoterInvoice
}: Props) {
  return (
    <section className="bg-white rounded-xl border border-slate-100 shadow-sm animate-in fade-in duration-300">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100 rounded-t-xl">
        <div className="flex items-center gap-2">
          <BadgeEuro size={14} className={sale ? "text-blue-600" : "text-slate-400"} />
          <h3 className={`text-[11px] font-bold uppercase tracking-widest ${sale ? "text-blue-600" : "text-slate-400"}`}>Facturación al Promotor (Comisiones)</h3>
        </div>
        <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${sale ? "bg-blue-50 text-blue-700 border-blue-100/50" : "bg-slate-100 text-slate-400 border-slate-200/50"}`}>
          Comisión de Venta
        </span>
      </div>
      
      {!sale ? (
        <div className="p-6 text-center flex flex-col items-center justify-center gap-2.5 py-8">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
            <Lock size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-700">Facturación al Promotor Desactivada</h4>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed max-w-sm mx-auto">
              Para configurar las comisiones y la facturación al promotor, primero debes seleccionar una vivienda y hacer clic en <strong>Formalizar Reserva</strong> en la sección del Proceso de Venta superior.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Precio de Venta Inmueble</span>
              <span className="text-sm font-bold text-slate-800">{fmt(sale.sale_price || 0)}</span>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Porcentaje de Comisión</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={sale.commission_percentage !== undefined && sale.commission_percentage !== null ? sale.commission_percentage : 3.0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        setSale(prev => prev ? { ...prev, commission_percentage: val } : null);
                      }
                    }}
                    className="w-16 px-2.5 py-1 text-xs text-slate-700 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-altavik-500 font-bold"
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
              </div>
              <button type="button"
                onClick={() => updateCommissionPercentage(sale.commission_percentage !== undefined && sale.commission_percentage !== null ? sale.commission_percentage : 3.0)}
                disabled={loading}
                className="px-3 py-1.5 bg-altavik-600 hover:bg-altavik-700 text-white text-[10px] font-bold rounded shadow-sm self-end mb-0.5 active:scale-95 transition-all"
              >
                Guardar %
              </button>
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Comisión Total Estimada</span>
              <span className="text-sm font-black text-altavik-700">
                {fmt((sale.sale_price || 0) * ((sale.commission_percentage !== undefined && sale.commission_percentage !== null ? sale.commission_percentage : 3.0) / 100))}
              </span>
            </div>
          </div>

          {/* Hitos de facturación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                key: 'contrato',
                title: '1º Hito (50%) — Contrato de Compraventa',
                description: 'Se cobra al formalizarse la firma del contrato privado de compraventa.',
                requirement: 'contrato',
                requirementLabel: 'Contrato de Compraventa'
              },
              {
                key: 'escrituracion',
                title: '2º Hito (50%) — Escrituración',
                description: 'Se cobra al formalizarse la firma de la escritura de venta ante notario.',
                requirement: 'escrituracion',
                requirementLabel: 'Escrituración'
              }
            ].map(hito => {
              const invoice = promoterInvoices.find(inv => inv.milestone === hito.key);
              const isStepReached = SALE_STEPS.findIndex(s => s.key === sale.sale_status) >= SALE_STEPS.findIndex(s => s.key === hito.requirement) || sale.sale_status === 'completada';

              // Si no se ha alcanzado la fase del hito
              if (!isStepReached) {
                return (
                  <div key={hito.key} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-center items-center text-center gap-2 py-8">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 border border-slate-200">
                      <Lock size={14} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400">{hito.title}</h4>
                      <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">{hito.description}</p>
                    </div>
                    <span className="mt-2 text-[8px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200/50">
                      Bloqueado hasta fase: {hito.requirementLabel}
                    </span>
                  </div>
                );
              }

              // Si se ha alcanzado pero no existe hito en BD (caso de ventas antiguas), proveer opción de crearlo
              if (!invoice) {
                const calculatedAmount = parseFloat(((sale.sale_price || 0) * ((sale.commission_percentage !== undefined && sale.commission_percentage !== null ? sale.commission_percentage : 3.0) / 100) * 0.5).toFixed(2));
                return (
                  <div key={hito.key} className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/20 flex flex-col justify-center items-center text-center gap-2 py-8">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100">
                      <BadgeEuro size={14} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-500">{hito.title}</h4>
                      <p className="text-[9px] text-slate-400 mt-1">{hito.description}</p>
                      <p className="text-xs font-black text-slate-700 mt-1.5">Importe Estimado: {fmt(calculatedAmount)}</p>
                    </div>
                    <button type="button"
                      onClick={() => savePromoterInvoice({ milestone: hito.key as any, amount: calculatedAmount, status: 'pending', issued_date: new Date().toISOString().slice(0, 10) })}
                      disabled={loading}
                      className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded shadow-sm active:scale-95 transition-all"
                    >
                      Generar Hito de Factura
                    </button>
                  </div>
                );
              }

              return (
                <div key={hito.key} className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  invoice.status === 'paid'
                    ? 'bg-emerald-50/20 border-emerald-100 shadow-sm shadow-emerald-50/10'
                    : invoice.status === 'sent'
                    ? 'bg-blue-50/10 border-blue-100 shadow-sm shadow-blue-50/10'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}>
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-dashed border-slate-100 pb-2 mb-3">
                      <h4 className="text-xs font-bold text-slate-800">{hito.title}</h4>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        invoice.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : invoice.status === 'sent'
                          ? 'bg-blue-50 text-blue-700 border-blue-100'
                          : invoice.status === 'cancelled'
                          ? 'bg-red-50 text-red-700 border-red-100'
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {invoice.status === 'paid' ? 'Cobrada' : invoice.status === 'sent' ? 'Enviada' : invoice.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Importe Factura</label>
                        <input
                          type="number"
                          step="0.01"
                          value={invoice.amount}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              setPromoterInvoices(prev => prev.map(inv => inv.id === invoice.id ? { ...inv, amount: val } : inv));
                            }
                          }}
                          className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-altavik-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Nº de Factura</label>
                        <input
                          type="text"
                          placeholder="FAC-2026-000"
                          value={invoice.invoice_number || ''}
                          onChange={(e) => {
                            setPromoterInvoices(prev => prev.map(inv => inv.id === invoice.id ? { ...inv, invoice_number: e.target.value } : inv));
                          }}
                          className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-altavik-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Fecha Emisión</label>
                        <input
                          type="date"
                          value={invoice.issued_date || ''}
                          onChange={(e) => {
                            setPromoterInvoices(prev => prev.map(inv => inv.id === invoice.id ? { ...inv, issued_date: e.target.value } : inv));
                          }}
                          className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-altavik-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Fecha Cobro</label>
                        <input
                          type="date"
                          value={invoice.paid_date || ''}
                          onChange={(e) => {
                            setPromoterInvoices(prev => prev.map(inv => inv.id === invoice.id ? { ...inv, paid_date: e.target.value } : inv));
                          }}
                          className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-altavik-500"
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Estado Cobro</label>
                      <select
                        value={invoice.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as any;
                          setPromoterInvoices(prev => prev.map(inv => {
                            if (inv.id === invoice.id) {
                              return {
                                ...inv,
                                status: newStatus,
                                paid_date: newStatus === 'paid' && !inv.paid_date ? new Date().toISOString().slice(0, 10) : inv.paid_date
                              };
                            }
                            return inv;
                          }));
                        }}
                        className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-altavik-500"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="sent">Enviada</option>
                        <option value="paid">Cobrada</option>
                        <option value="cancelled">Cancelada</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Notas</label>
                      <input
                        type="text"
                        placeholder="Observaciones de facturación..."
                        value={invoice.notes || ''}
                        onChange={(e) => {
                          setPromoterInvoices(prev => prev.map(inv => inv.id === invoice.id ? { ...inv, notes: e.target.value } : inv));
                        }}
                        className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-altavik-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                    <button type="button"
                      onClick={() => savePromoterInvoice(invoice)}
                      disabled={loading}
                      className="flex items-center gap-1 px-3 py-1.5 bg-altavik-600 hover:bg-altavik-700 text-white text-[10px] font-bold rounded shadow-sm active:scale-95 transition-all"
                    >
                      <Save size={11} /> Guardar Factura
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
