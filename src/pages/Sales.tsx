import React, { useState } from 'react';
import { BadgeDollarSign, Loader2, Calendar, FileText, CheckCircle2, User, Home, Search, AlertCircle } from 'lucide-react';
import { useSales, type SaleWithDetails } from '../hooks/useSales';
import { PageHeader } from '../components/ui/PageHeader';
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG: Record<string, { label: string, color: string, icon: React.ReactNode }> = {
  reserva: { label: 'Reserva', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Calendar size={14} /> },
  contrato: { label: 'Contrato', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <FileText size={14} /> },
  mensualidades: { label: 'Mensualidades', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <BadgeDollarSign size={14} /> },
  escrituracion: { label: 'Escrituración', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: <FileText size={14} /> },
  completada: { label: 'Cerrada', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={14} /> }
};

export default function Sales() {
  const { data: sales, isLoading } = useSales();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('completada');

  const formatCurrency = (val: number | null) => {
    if (val === null || isNaN(val)) return '-';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-ES');
  };

  const getPromoterBillingStatus = (sale: SaleWithDetails) => {
    const invoices = sale.promoter_invoices || [];
    if (invoices.length === 0) {
      return { label: 'Sin facturar', color: 'bg-slate-100 text-slate-500 border-slate-200/60' };
    }
    
    const paid = invoices.filter(i => i.status === 'paid');
    const sent = invoices.filter(i => i.status === 'sent');
    const cancelled = invoices.filter(i => i.status === 'cancelled');
    
    if (cancelled.length === invoices.length) {
      return { label: 'Cancelada', color: 'bg-red-50 text-red-700 border-red-200/50' };
    }
    
    if (paid.length === invoices.length) {
      return { label: 'Completada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200/50 font-bold' };
    }
    
    if (paid.length > 0) {
      return { label: `${paid.length}/${invoices.length} Cobrada`, color: 'bg-teal-50 text-teal-700 border-teal-200/50 font-bold' };
    }
    
    if (sent.length > 0) {
      return { label: `${sent.length}/${invoices.length} Enviada`, color: 'bg-blue-50 text-blue-700 border-blue-200/50 font-bold' };
    }
    
    return { label: 'Pendiente', color: 'bg-amber-50 text-amber-700 border-amber-200/50 font-bold' };
  };

  const filteredSales = (sales || []).filter(sale => {
    const matchesSearch = 
      sale.lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.property.n_orden.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || sale.sale_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalClosedValue = (sales || [])
    .filter(s => s.sale_status === 'completada')
    .reduce((acc, curr) => acc + (curr.sale_price || 0), 0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-slate-400 gap-4">
        <Loader2 className="animate-spin" size={40} />
        <p className="font-medium animate-pulse">Cargando datos de ventas...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-in fade-in duration-500 max-w-[1600px] mx-auto w-full gap-6">
      <PageHeader 
        title="Ventas y Operaciones"
        icon={<BadgeDollarSign className="text-white" strokeWidth={3} size={24} />}
        subtitle={
          <p className="text-slate-500 text-sm font-medium flex items-center gap-2 mt-1">
            <span className="tabular-nums font-bold text-altavik-600 bg-altavik-50 px-2 py-0.5 rounded-lg border border-altavik-100">
              {formatCurrency(totalClosedValue)}
            </span> 
            en ventas cerradas
          </p>
        }
      />

      {/* Barra de Herramientas */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por cliente o vivienda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-altavik-500 focus:bg-white transition-all text-sm font-medium"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${statusFilter === 'all' ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            Todas las operaciones
          </button>
          <button
            onClick={() => setStatusFilter('completada')}
            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${statusFilter === 'completada' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'}`}
          >
            Ventas Cerradas
          </button>
        </div>
      </div>

      {/* Tabla de Ventas */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Cliente</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Vivienda</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Estado</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Precio Venta</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Facturación Promotor</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Fecha Cierre</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={32} className="text-slate-300" />
                      <p className="font-medium">No se encontraron operaciones con los filtros actuales</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => {
                  const statusConf = STATUS_CONFIG[sale.sale_status] || STATUS_CONFIG.reserva;
                  
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div 
                          className="flex items-center gap-3 cursor-pointer group-hover:text-altavik-600"
                          onClick={() => navigate(`/leads?search=${encodeURIComponent(sale.lead.name)}`)}
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                            <User size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{sale.lead.name}</p>
                            <p className="text-xs text-slate-500">{sale.lead.phone || sale.lead.email || 'Sin contacto'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div 
                          className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-altavik-600"
                          onClick={() => navigate(`/inventory?search=${encodeURIComponent(sale.property.n_orden)}`)}
                        >
                          <Home size={16} className="text-slate-400" />
                          <span className="font-bold">{sale.property.n_orden}</span>
                          <span className="text-xs text-slate-400">({sale.property.portal} - {sale.property.planta}{sale.property.letra})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusConf.color}`}>
                          {statusConf.icon}
                          {statusConf.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-black text-slate-900">{formatCurrency(sale.sale_price)}</span>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const billing = getPromoterBillingStatus(sale);
                          return (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${billing.color}`}>
                              {billing.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {formatDate(sale.escritura_date || sale.contract_date)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          className="text-xs font-bold text-altavik-600 hover:text-altavik-800 bg-altavik-50 hover:bg-altavik-100 px-3 py-1.5 rounded transition-colors"
                          onClick={() => navigate(`/leads?search=${encodeURIComponent(sale.lead.name)}`)}
                        >
                          Ver Detalles
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
