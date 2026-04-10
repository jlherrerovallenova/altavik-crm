// src/pages/Leads.tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Mail,
  Phone,
  ChevronRight,
  UserPlus,
  Loader2,
  MessageCircle,
  Download,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  FilterX,
  Upload,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Globe,
  Smartphone,
  Users,
  HelpCircle
} from 'lucide-react';
import CreateLeadModal from '../components/leads/CreateLeadModal';
import LeadDetailModal from '../components/leads/LeadDetailModal';
import EmailComposerModal from '../components/leads/EmailComposerModal';
import ExportLeadsModal from '../components/leads/ExportLeadsModal';
import ImportLeadsModal from '../components/leads/ImportLeadsModal';
import { AppNotification } from '../components/AppNotification';
import { useDocuments } from '../hooks/useDocuments';
import { useLeads } from '../hooks/useLeads';
import { CustomSelect, IdealistaIcon } from '../components/Shared';
import type { Database } from '../types/supabase';

type Lead = Database['public']['Tables']['leads']['Row'];

const ITEMS_PER_PAGE = 10;

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  qualified: 'Cualificado',
  visiting: 'Visitando',
  closed: 'Venta Cerrada',
  lost: 'Perdido',
};

const STATUS_CONFIG: Record<string, { dot: string; pill: string; border: string }> = {
  new:         { dot: 'bg-blue-400',    pill: 'bg-blue-50 text-blue-700 border border-blue-200',       border: 'border-l-blue-400' },
  contacted:   { dot: 'bg-purple-400',  pill: 'bg-purple-50 text-purple-700 border border-purple-200', border: 'border-l-purple-400' },
  qualified:   { dot: 'bg-altavik-400', pill: 'bg-altavik-50 text-altavik-700 border border-emerald-200', border: 'border-l-altavik-400' },
  visiting:    { dot: 'bg-cyan-400',    pill: 'bg-cyan-50 text-cyan-700 border border-cyan-200',       border: 'border-l-cyan-400' },
  closed:      { dot: 'bg-slate-600',   pill: 'bg-slate-800 text-slate-100 border border-slate-700',  border: 'border-l-slate-600' },
  lost:        { dot: 'bg-red-400',     pill: 'bg-red-50 text-red-700 border border-red-200',         border: 'border-l-red-400' },
};

const getStatusBadge = (status: Lead['status']) => {
  const cfg = STATUS_CONFIG[status || 'new'] || STATUS_CONFIG['new'];
  const label = STATUS_LABELS[status || 'new'] || 'Nuevo';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {label}
    </span>
  );
};

const SourceIcon = ({ source }: { source: string | null }) => {
  const s = source?.trim() || 'Directo';
  const lower = s.toLowerCase();
  
  if (lower.includes('idealista')) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 group/source" title="Idealista">
        <IdealistaIcon className="w-5 h-5" />
        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">Idealista</span>
      </div>
    );
  }

  if (lower.includes('web') || lower.includes('google')) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 group/source" title={s}>
        <div className="w-5 h-5 bg-blue-50 flex items-center justify-center rounded border border-blue-100 shadow-sm">
          <Globe size={11} className="text-blue-600" />
        </div>
        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">Web</span>
      </div>
    );
  }

  if (lower.includes('insta') || lower.includes('facebook') || lower.includes('redes')) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 group/source" title="Redes Sociales">
        <div className="w-5 h-5 bg-purple-50 flex items-center justify-center rounded border border-purple-100 shadow-sm">
          <Smartphone size={11} className="text-purple-600" />
        </div>
        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">Social</span>
      </div>
    );
  }

  if (lower.includes('referido') || lower.includes('amigo')) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 group/source" title="Referido">
        <div className="w-5 h-5 bg-emerald-50 flex items-center justify-center rounded border border-emerald-100 shadow-sm">
          <Users size={11} className="text-emerald-600" />
        </div>
        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">Amigo</span>
      </div>
    );
  }

  if (lower.includes('llamada') || lower.includes('tel')) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 group/source" title="Llamada">
        <div className="w-5 h-5 bg-green-50 flex items-center justify-center rounded border border-green-100 shadow-sm">
          <Phone size={11} className="text-green-600" />
        </div>
        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">Llamada</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1 group/source" title={s}>
      <div className="w-5 h-5 bg-slate-50 flex items-center justify-center rounded border border-slate-200 shadow-sm">
        <HelpCircle size={11} className="text-slate-500" />
      </div>
      <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">Otros</span>
    </div>
  );
};

export default function Leads() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: rawDocs = [] } = useDocuments();
  const availableDocs = rawDocs
    .filter(doc => doc.url)
    .map(doc => ({ name: doc.name, url: doc.url!, category: doc.category }));

  // Estados de Búsqueda y Filtros sincronizados con la URL
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || '');
  const [sourceFilter, setSourceFilter] = useState<string>(searchParams.get('source') || '');

  // Estados de Paginación
  const [page, setPage] = useState(1);

  // Estados de Ordenación
  const [sortField, setSortField] = useState<'name' | 'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [emailLead, setEmailLead] = useState<Lead | null>(null);
  const [initialMethod, setInitialMethod] = useState<'email' | 'whatsapp'>('email');

  const [notification, setNotification] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, title: '', message: '', type: 'success' });

  // React Query para la gestión de leads
  const { 
    data, 
    isLoading: loading, 
    refetch 
  } = useLeads({
    page,
    pageSize: ITEMS_PER_PAGE,
    searchTerm,
    statusFilter,
    sourceFilter,
    sortField,
    sortDirection
  });

  const leads = data?.leads || [];
  const totalLeads = data?.totalCount || 0;

  // Sincronizar el estado interno si la URL cambia
  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
    setStatusFilter(searchParams.get('status') || '');
    setSourceFilter(searchParams.get('source') || '');
  }, [searchParams]);

  const handleSort = (field: 'name' | 'created_at') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const showMsg = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setNotification({ show: true, type, title, message });
  };

  const openComposer = (lead: Lead, method: 'email' | 'whatsapp') => {
    setInitialMethod(method);
    setEmailLead(lead);
  };

  const updateURLParams = (key: string, value: string) => {
    if (value) {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setPage(1);
    updateURLParams('search', value);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setSourceFilter('');
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = searchTerm !== '' || statusFilter !== '' || sourceFilter !== '';
  const totalPages = Math.ceil(totalLeads / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">

      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mis Clientes</h1>
            <p className="text-slate-500 text-sm font-medium flex items-center gap-2 mt-1">
              <span className="tabular-nums font-bold text-altavik-600 bg-altavik-50 px-2 py-0.5 rounded-lg border border-altavik-100">
                {totalLeads}
              </span> 
              prospectos {hasActiveFilters && `(filtrados)`}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-altavik-600 transition-colors shadow-sm hidden sm:flex items-center gap-2"
              title="Importar CSV"
            >
              <Upload size={18} />
              <span className="hidden lg:inline text-xs font-bold">Importar</span>
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-altavik-600 transition-colors shadow-sm hidden sm:flex items-center gap-2"
              title="Exportar Listado"
            >
              <Download size={18} />
              <span className="hidden lg:inline text-xs font-bold">Exportar</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 active:scale-95 shrink-0 flex-1 md:flex-none justify-center"
            >
              <UserPlus size={18} /> <span className="inline">Nuevo Cliente</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 items-center bg-white p-3 rounded-xl border border-slate-200">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-altavik-600 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all outline-none shadow-sm"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>

          <div className="flex w-full lg:w-auto gap-3">
            <CustomSelect
              className="flex-1 lg:w-48"
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
                updateURLParams('status', val);
              }}
              placeholder="Todos los Estados"
              options={[
                { id: '', label: 'Todos los Estados' },
                ...Object.entries(STATUS_LABELS).map(([id, label]) => ({
                  id,
                  label,
                  dotColor: STATUS_CONFIG[id]?.dot
                }))
              ]}
            />

            <CustomSelect
              className="flex-1 lg:w-48"
              value={sourceFilter}
              onChange={(val) => {
                setSourceFilter(val);
                setPage(1);
                updateURLParams('source', val);
              }}
              placeholder="Cualquier Origen"
              options={[
                   { id: '', label: 'Cualquier Origen' },
                   { id: 'Idealista', label: 'Idealista', icon: IdealistaIcon, color: 'text-[#deff30]' },
                   { id: 'Web', label: 'Web', icon: Globe, color: 'text-blue-500' },
                   { id: 'Redes Sociales', label: 'Redes Sociales', icon: Smartphone, color: 'text-purple-500' },
                   { id: 'Referido', label: 'Referido', icon: Users, color: 'text-emerald-500' },
                   { id: 'Llamada', label: 'Llamada', icon: Phone, color: 'text-green-500' },
                   { id: 'Otro', label: 'Otro', icon: HelpCircle, color: 'text-slate-500' }
              ]}
            />

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors shadow-sm flex items-center justify-center shrink-0"
                title="Limpiar filtros"
              >
                <FilterX size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col relative z-10">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
            <Loader2 className="animate-spin" size={40} />
            <p className="font-medium animate-pulse">Cargando base de datos...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
              <Search size={24} />
            </div>
            <p className="text-slate-500 font-medium text-center px-4">
              {hasActiveFilters
                ? "No hay clientes que coincidan con los filtros actuales."
                : "No hay clientes registrados en la base de datos."}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-altavik-600 font-bold text-sm mt-4 hover:underline px-4 py-2 bg-altavik-50 rounded-lg">
                Limpiar todos los filtros
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1">
            <div className="grid md:grid-cols-[22fr_12fr_26fr_10fr_12fr_10fr_8fr] gap-4 px-6 py-3 bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 border-l-4 border-transparent hidden md:grid">
              <div
                className={`flex items-center gap-1 cursor-pointer select-none transition-colors ${sortField === 'name' ? 'text-slate-700' : 'hover:text-slate-600'}`}
                onClick={() => handleSort('name')}
              >
                Cliente
                {sortField === 'name' ? (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}
              </div>
              <div className="text-left">Teléfono</div>
              <div className="text-left">Email</div>
              <div className="text-left">Origen</div>
              <div className="text-left pl-2">Estado</div>
              <div
                className={`flex items-center gap-1 cursor-pointer select-none transition-colors ${sortField === 'created_at' ? 'text-slate-700' : 'hover:text-slate-600'}`}
                onClick={() => handleSort('created_at')}
              >
                Alta
                {sortField === 'created_at' ? (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}
              </div>
              <div className="text-left">Acciones</div>
            </div>

            {leads.map((lead) => {
              const cfg = STATUS_CONFIG[lead.status || 'new'] || STATUS_CONFIG['new'];
              const isSelected = selectedLead?.id === lead.id;
              
              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`grid grid-cols-1 md:grid-cols-[22fr_12fr_26fr_10fr_12fr_10fr_8fr] gap-4 px-6 py-4 items-center cursor-pointer group border-b border-slate-100 border-l-4 ${cfg.border} ${isSelected ? 'bg-blue-50/80 ring-1 ring-blue-100/50 z-10 sticky' : 'hover:bg-slate-50/80'} transition-all duration-150`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-altavik-50 text-altavik-700 flex items-center justify-center font-bold text-sm border border-altavik-100 shrink-0">
                      {lead.name?.substring(0, 2).toUpperCase() || 'CL'}
                    </div>
                    <div className="min-w-0 flex items-center">
                      <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-altavik-700 transition-colors leading-tight">{lead.name}</h3>
                    </div>
                  </div>

                  <div className="flex justify-start items-center">
                    <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
                      <div className="w-5 h-5 rounded-md bg-altavik-50 flex items-center justify-center shrink-0">
                        <Phone size={11} className="text-altavik-400" />
                      </div>
                      <span className="truncate">{lead.phone || <span className="text-slate-300 italic">Sin teléfono</span>}</span>
                    </div>
                  </div>

                  <div className="flex justify-start items-center">
                    <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
                      <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center shrink-0">
                        <Mail size={11} className="text-blue-400" />
                      </div>
                      <span className="truncate">{lead.email || <span className="text-slate-300 italic">Sin email</span>}</span>
                    </div>
                  </div>

                  <div className="flex justify-start items-center">
                    <SourceIcon source={lead.source} />
                  </div>

                  <div className="flex justify-start items-center">
                    {getStatusBadge(lead.status)}
                  </div>

                  <div className="flex justify-start items-center">
                    <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="flex items-center justify-start gap-1 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); openComposer(lead, 'whatsapp'); }} className="p-1.5 text-slate-400 hover:text-altavik-600 hover:bg-altavik-50 rounded-lg transition-all" title="WhatsApp"><MessageCircle size={15} /></button>
                    <button onClick={(e) => { e.stopPropagation(); openComposer(lead, 'email'); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Email"><Mail size={15} /></button>
                    <ChevronRight size={15} className="text-slate-300 group-hover:text-altavik-500 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalLeads > 0 && (
          <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium text-center md:text-left">
              Mostrando {leads.length} de {totalLeads} leads
            </span>

            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-1.5 md:p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 md:p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="text-[10px] md:text-xs font-bold text-slate-700 px-1 md:px-2 whitespace-nowrap">
                {page} / {totalPages || 1}
              </span>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 md:p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="p-1.5 md:p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ExportLeadsModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />

      <ImportLeadsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => { refetch(); showMsg('success', '¡Importación completada!', 'Los clientes han sido importados correctamente.'); }}
      />

      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => { refetch(); showMsg('success', '¡Completado!', 'El nuevo cliente ha sido creado con éxito.'); }}
      />

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={(deleted?: boolean) => {
            refetch();
            if (deleted) showMsg('success', 'Cliente eliminado', 'Cliente borrado.');
            else showMsg('info', 'Cliente actualizado', 'Cambios guardados.');
          }}
        />
      )}

      {emailLead && (
        <EmailComposerModal
          isOpen={!!emailLead}
          onClose={() => setEmailLead(null)}
          leadId={emailLead.id}
          leadName={emailLead.name}
          leadEmail={emailLead.email}
          leadPhone={emailLead.phone}
          availableDocs={availableDocs}
          onSentSuccess={() => { showMsg('success', 'Mensaje enviado', 'Registrado correctamente.'); }}
          initialMethod={initialMethod}
        />
      )}

      {notification.show && (
        <AppNotification
          title={notification.title}
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}
    </div>
  );
}