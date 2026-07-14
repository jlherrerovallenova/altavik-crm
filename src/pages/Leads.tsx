// src/pages/Leads.tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Mail,
  ChevronRight,
  Loader2,
  Download,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  FilterX,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Globe,
  Smartphone,
  Users,
  Plus,
  Phone,
  MapPin
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useDocuments } from '../hooks/useDocuments';
import { useLeads } from '../hooks/useLeads';
import { CustomSelect, IdealistaIcon } from '../components/Shared';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import type { Database } from '../types/supabase';

// Modular Components
import CreateLeadModal from '../components/leads/CreateLeadModal';
import LeadDetailModal from '../components/leads/LeadDetailModal';
import EmailComposerModal from '../components/leads/EmailComposerModal';
import { AppNotification } from '../components/AppNotification';
import { LeadListItem } from '../components/leads/LeadListItem';
import { STATUS_LABELS, STATUS_CONFIG } from '../components/leads/LeadStatus';

type Lead = Database['public']['Tables']['leads']['Row'];
const ITEMS_PER_PAGE = 10;

export default function Leads() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: rawDocs = [] } = useDocuments();
  const availableDocs = rawDocs
    .filter(doc => doc.url)
    .map(doc => ({ name: doc.name, url: doc.url!, category: doc.category }));

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || '');
  const [sourceFilter, setSourceFilter] = useState<string>(searchParams.get('source') || '');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<'name' | 'created_at' | 'client_quality_rating'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [emailLead, setEmailLead] = useState<Lead | null>(null);
  const [initialMethod, setInitialMethod] = useState<'email' | 'whatsapp'>('email');
  const [initialTemplate, setInitialTemplate] = useState<'first_contact' | undefined>(undefined);

  const [notification, setNotification] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, title: '', message: '', type: 'success' });

  const { data, isLoading: loading, refetch } = useLeads({
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

  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
    setStatusFilter(searchParams.get('status') || '');
    setSourceFilter(searchParams.get('source') || '');
  }, [searchParams]);

  const handleSort = (field: 'name' | 'created_at' | 'client_quality_rating') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // react-doctor-disable-next-line no-impure-state-updater
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const showMsg = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setNotification({ show: true, type, title, message });
  };

  const handleCompose = (lead: Lead, method: 'email' | 'whatsapp', template?: 'first_contact') => {
    // react-doctor-disable-next-line no-impure-state-updater
    setInitialMethod(method);
    // react-doctor-disable-next-line no-impure-state-updater
    setInitialTemplate(template);
    // react-doctor-disable-next-line no-impure-state-updater
    setEmailLead(lead);
  };

  const updateURLParams = (key: string, value: string) => {
    if (value) searchParams.set(key, value);
    else searchParams.delete(key);
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
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <PageHeader 
        title="Mis Clientes"
        icon={<Users strokeWidth={3} size={24} />}
        subtitle={
          <p className="text-slate-500 text-sm font-medium flex items-center gap-2 mt-1">
            <span className="tabular-nums font-bold text-altavik-600 bg-altavik-50 px-2 py-0.5 rounded-lg border border-altavik-100">
              {totalLeads}
            </span> 
            contactos registrados {hasActiveFilters && `(filtrados)`}
          </p>
        }
        actions={
          <>
            <Button onClick={() => setIsCreateModalOpen(true)} size="lg">
              <Plus size={18} strokeWidth={3} />
              Nuevo Contacto
            </Button>
          </>
        }
      />

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row gap-3 items-center p-3">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-altavik-600 transition-colors" strokeWidth={2.5} size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              className="w-full pl-12 pr-4 py-3 bg-white/50 border border-slate-200/50 rounded-xl text-sm focus:ring-4 focus:ring-altavik-500/10 focus:border-altavik-500 transition-all outline-none"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>

          <div className="flex w-full lg:w-auto gap-3">
            <CustomSelect
              className="flex-1 lg:w-48"
              value={statusFilter}
              // react-doctor-disable-next-line no-impure-state-updater
              onChange={(val) => { setStatusFilter(val); setPage(1); updateURLParams('status', val); }}
              placeholder="Todos los Estados"
              options={[
                { id: '', label: 'Todos los Estados' },
                ...Object.entries(STATUS_LABELS).map(([id, label]) => ({ id, label, dotColor: STATUS_CONFIG[id]?.dot }))
              ]}
            />

            <CustomSelect
              className="flex-1 lg:w-48"
              value={sourceFilter}
              // react-doctor-disable-next-line no-impure-state-updater
              onChange={(val) => { setSourceFilter(val); setPage(1); updateURLParams('source', val); }}
              placeholder="Cualquier Origen"
              options={[
                   { id: '', label: 'Cualquier Origen' },
                   { id: 'Idealista', label: 'Idealista', icon: IdealistaIcon, color: 'text-[#deff30]' },
                   { id: 'Web', label: 'Web', icon: Globe, color: 'text-blue-500' },
                   { id: 'Google SEM', label: 'Google SEM', icon: Search, color: 'text-blue-600' },
                   { id: 'Redes Sociales', label: 'Redes Sociales', icon: Smartphone, color: 'text-purple-500' },
                   { id: 'Referido', label: 'Referido', icon: Users, color: 'text-emerald-500' },
                   { id: 'Llamada', label: 'Llamada', icon: Phone, color: 'text-green-500' },
                   { id: 'Valla', label: 'Valla', icon: MapPin, color: 'text-orange-500' }
              ]}
            />

            {hasActiveFilters && (
              <Button variant="danger" size="sm" onClick={clearFilters} className="shrink-0 aspect-square p-0 w-11 h-11">
                <FilterX strokeWidth={3} size={20} />
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card noPadding className="min-h-[500px] flex flex-col relative z-20">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
            <Loader2 className="animate-spin" size={40} />
            <p className="font-medium animate-pulse">Cargando base de datos...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300"><Search size={24} /></div>
            <p className="text-slate-500 font-medium text-center px-4">{hasActiveFilters ? "No hay clientes que coincidan." : "No hay clientes registrados."}</p>
            {hasActiveFilters && <button type="button" onClick={clearFilters} className="text-altavik-600 font-bold text-sm mt-4 hover:underline px-4 py-2 bg-altavik-50 rounded-lg">Limpiar filtros</button>}
          </div>
        ) : (
          <div className="flex-1">
            <div className="grid md:grid-cols-[22fr_12fr_18fr_10fr_12fr_10fr_8fr_8fr] gap-4 px-6 py-3 bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 border-l-4 border-transparent hidden md:grid">
              <div className={`flex items-center gap-1 cursor-pointer select-none transition-colors ${sortField === 'name' ? 'text-slate-700' : 'hover:text-slate-600'}`} onClick={() => handleSort('name')}>
                Cliente
                {sortField === 'name' ? (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}
              </div>
              <div>Teléfono</div><div>Email</div><div>Origen</div><div className="pl-2">Estado</div>
              <div className={`flex items-center gap-1 cursor-pointer select-none transition-colors ${sortField === 'created_at' ? 'text-slate-700' : 'hover:text-slate-600'}`} onClick={() => handleSort('created_at')}>
                Alta
                {sortField === 'created_at' ? (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}
              </div>
              <div className={`flex items-center gap-1 cursor-pointer select-none transition-colors ${sortField === 'client_quality_rating' ? 'text-slate-700' : 'hover:text-slate-600'}`} onClick={() => handleSort('client_quality_rating')}>
                Valoración
                {sortField === 'client_quality_rating' ? (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}
              </div>
              <div>Acciones</div>
            </div>

            {leads.map((lead) => (
              <LeadListItem 
                key={lead.id} 
                lead={lead} 
                isSelected={selectedLead?.id === lead.id} 
                onClick={() => setSelectedLead(lead)} 
                onCompose={handleCompose}
              />
            ))}
          </div>
        )}

        {totalLeads > 0 && (
          <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Mostrando {leads.length} de {totalLeads}</span>
            <div className="flex items-center gap-1 md:gap-2">
              <button type="button" onClick={() => setPage(1)} disabled={page === 1} className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-50"><ChevronsLeft size={16} /></button>
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-50"><ChevronLeft size={16} /></button>
              <span className="text-xs font-bold text-slate-700 px-2">{page} / {totalPages || 1}</span>
              <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-50"><ChevronRight size={16} /></button>
              <button type="button" onClick={() => setPage(totalPages)} disabled={page >= totalPages} className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-50"><ChevronsRight size={16} /></button>
            </div>
          </div>
        )}
      </Card>

      <CreateLeadModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={() => { refetch(); showMsg('success', '¡Completado!', 'Cliente creado.'); }} />
      {selectedLead && <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={(del) => { refetch(); showMsg(del ? 'success' : 'info', del ? 'Borrado' : 'Actualizado', del ? 'Cliente borrado.' : 'Cambios guardados.'); }} />}
      {emailLead && <EmailComposerModal isOpen={!!emailLead} onClose={() => { setEmailLead(null); setInitialTemplate(undefined); }} leadId={emailLead.id} leadName={emailLead.name!} leadEmail={emailLead.email} leadPhone={emailLead.phone} availableDocs={availableDocs} onSentSuccess={() => showMsg('success', 'Mensaje enviado', 'Registrado.')} initialMethod={initialMethod} initialTemplate={initialTemplate} />}
      {notification.show && <AppNotification title={notification.title} message={notification.message} type={notification.type} onClose={() => setNotification({ ...notification, show: false })} />}
    </div>
  );
}