import React, { useEffect, useState } from 'react';
import { useClientAuth } from '../../context/ClientAuthContext';
import { supabase } from '../../lib/supabase';
import { Building2, CreditCard, CalendarDays, CheckCircle2, Circle, Loader2, Euro } from 'lucide-react';
import type { Database } from '../../types/supabase';

type InventoryRow = Database['public']['Tables']['inventory']['Row'];
type Installment = Database['public']['Tables']['installments']['Row'];

const fmt = (n: number) =>
  n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });

export default function ClientDashboard() {
  const { client } = useClientAuth();
  const [property, setProperty] = useState<InventoryRow | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!client || !client.sale) {
        setLoading(false);
        return;
      }

      try {
        // Load property details
        const { data: propData } = await supabase
          .from('inventory')
          .select('*')
          .eq('id', client.sale.property_id)
          .single();

        if (propData) setProperty(propData);

        // Load installments
        const { data: instData } = await supabase
          .from('installments')
          .select('*')
          .eq('sale_id', client.sale.id)
          .order('installment_number', { ascending: true });

        if (instData) setInstallments(instData);
      } catch (err) {
        console.error('Error loading client dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [client]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-altavik-600 animate-spin" />
      </div>
    );
  }

  if (!client?.sale) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Aún no tienes una vivienda asignada</h3>
        <p className="mt-2 text-slate-500">Contacta con tu asesor comercial para formalizar tu reserva.</p>
      </div>
    );
  }

  const totalPaid = installments.filter(i => i.paid).reduce((sum, i) => sum + i.amount, 0);
  const totalPending = installments.filter(i => !i.paid).reduce((sum, i) => sum + i.amount, 0);
  const totalInstallments = installments.length;
  const paidCount = installments.filter(i => i.paid).length;
  const progressPercent = totalInstallments > 0 ? (paidCount / totalInstallments) * 100 : 0;

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Mi Vivienda Card */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-altavik-600" />
              Detalles de la Vivienda
            </h2>
          </div>
          <div className="p-6">
            {property ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Vivienda</p>
                  <p className="text-lg font-medium text-slate-900">
                    Portal {property.portal}, Planta {property.planta}, Letra {property.letra}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Dormitorios</p>
                    <p className="font-medium text-slate-900">{property.dormitorios}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Superficie</p>
                    <p className="font-medium text-slate-900">{property.sup_construida} m²</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Garaje</p>
                    <p className="font-medium text-slate-900">{property.garaje || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Trastero</p>
                    <p className="font-medium text-slate-900">{property.trastero || '-'}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 mt-4">
                  <p className="text-sm text-slate-500">Precio Total de Venta</p>
                  <p className="text-2xl font-bold text-altavik-600">{fmt(client.sale.sale_price)}</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-500">Cargando detalles de la vivienda...</p>
            )}
          </div>
        </div>

        {/* Resumen de Pagos Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-altavik-600" />
              Resumen de Pagos
            </h2>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-altavik-100 text-altavik-800">
              {paidCount} de {totalInstallments} cuotas pagadas
            </span>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500 font-medium">Progreso Total</span>
                <span className="text-altavik-600 font-bold">{Math.round(progressPercent)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div 
                  className="bg-altavik-500 h-3 rounded-full transition-all duration-1000" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Total Pagado</span>
                </div>
                <p className="text-2xl font-bold text-emerald-700">{fmt(totalPaid)}</p>
              </div>
              
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <div className="flex items-center gap-2 text-orange-600 mb-1">
                  <CalendarDays className="w-4 h-4" />
                  <span className="text-sm font-medium">Total Pendiente</span>
                </div>
                <p className="text-2xl font-bold text-orange-700">{fmt(totalPending)}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Lista de Cuotas */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-altavik-600" />
            Desglose de Mensualidades
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                <th className="py-4 px-6 font-semibold text-slate-600">Cuota</th>
                <th className="py-4 px-6 font-semibold text-slate-600">Fecha de Vencimiento</th>
                <th className="py-4 px-6 font-semibold text-slate-600">Importe</th>
                <th className="py-4 px-6 font-semibold text-slate-600">Estado</th>
                <th className="py-4 px-6 font-semibold text-slate-600 text-right">Fecha de Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {installments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No hay mensualidades configuradas para esta compra.
                  </td>
                </tr>
              ) : (
                installments.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 text-sm font-medium text-slate-900">
                      Nº {inst.installment_number}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600">
                      {new Date(inst.due_date).toLocaleDateString('es-ES', { 
                        year: 'numeric', month: 'long', day: 'numeric' 
                      })}
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-900">
                      {fmt(inst.amount)}
                    </td>
                    <td className="py-4 px-6">
                      {inst.paid ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Pagado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800">
                          <Circle className="w-3.5 h-3.5" />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-500 text-right">
                      {inst.paid_date 
                        ? new Date(inst.paid_date).toLocaleDateString('es-ES')
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
