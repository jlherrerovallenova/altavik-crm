// src/pages/Agenda.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Loader2,
  Trash2,
  User
} from 'lucide-react';
import CreateTaskModal from '../components/CreateTaskModal';
import { useDialog } from '../context/DialogContext';
import type { Database } from '../types/supabase';

// Tipo AgendaItem enriquecido con datos del cliente
type AgendaItem = Database['public']['Tables']['agenda']['Row'] & {
  leads?: { name: string } | null
};

const ITEMS_PER_PAGE = 8;

export default function Agenda() {
  const { session } = useAuth();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'today' | 'overdue'>('pending');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { showConfirm, showAlert } = useDialog();

  useEffect(() => {
    // Check for query parameters (?filter=today, ?filter=overdue, etc.)
    const searchParams = new URLSearchParams(window.location.search);
    const filterParam = searchParams.get('filter') as any;
    
    if (filterParam && ['all', 'pending', 'completed', 'today', 'overdue'].includes(filterParam)) {
      setFilterStatus(filterParam);
    }

    // Check for "create=true" to open the New Task modal
    if (searchParams.get('create') === 'true') {
      setIsCreateModalOpen(true);
    }
  }, [window.location.search]); // React to URL changes

  useEffect(() => {
    fetchAgenda();
  }, [page, filterStatus]);

  const fetchAgenda = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Consulta a 'agenda' trayendo el nombre del cliente relacionado
      let query = supabase
        .from('agenda')
        .select('*, leads(name)', { count: 'exact' });

      // Aplicar filtros inteligentes
      if (filterStatus === 'pending') {
        query = query.eq('completed', false).order('due_date', { ascending: true });
      } else if (filterStatus === 'completed') {
        query = query.eq('completed', true).order('due_date', { ascending: false });
      } else if (filterStatus === 'today') {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
        query = query
          .eq('completed', false)
          .gte('due_date', startOfDay)
          .lte('due_date', endOfDay)
          .order('due_date', { ascending: true });
      } else if (filterStatus === 'overdue') {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query
          .eq('completed', false)
          .lt('due_date', startOfDay)
          .order('due_date', { ascending: true });
      } else {
        query = query.order('due_date', { ascending: true });
      }

      const { data, count, error } = await query.range(from, to);

      if (error) throw error;

      // Mapeamos los datos para asegurar compatibilidad de tipos si leads es array o objeto
      const formattedData = (data || []).map(item => ({
        ...(item as any),
        leads: Array.isArray((item as any).leads) ? (item as any).leads[0] : (item as any).leads
      })) as AgendaItem[];

      setItems(formattedData);
      if (count !== null) setTotalItems(count);

    } catch (error) {
      console.error('Error fetching agenda:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (item: AgendaItem) => {
    const newStatus = !item.completed;
    await (supabase as any).from('agenda').update({ completed: newStatus }).eq('id', item.id);
    fetchAgenda();
  };

  const deleteItem = async (id: number) => {
    const confirmed = await showConfirm({
      title: 'Eliminar Tarea',
      message: '¿Estás seguro de que deseas eliminar esta tarea de la agenda de forma permanente?',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar'
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('agenda').delete().eq('id', id);
      if (error) throw error;
      fetchAgenda();
    } catch (error) {
      await showAlert({ title: 'Error', message: 'No se pudo eliminar la tarea' });
    }
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const getTypeIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('llamada')) return <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Clock size={18} /></div>;
    if (t.includes('visita')) return <div className="p-2 bg-altavik-50 text-altavik-600 rounded-lg"><CalendarIcon size={18} /></div>;
    if (t.includes('whatsapp')) return <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Smartphone size={18} /></div>;
    if (t.includes('email')) return <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock size={18} /></div>;
    if (t.includes('reunión')) return <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><User size={18} /></div>;
    return <div className="p-2 bg-slate-50 text-slate-500 rounded-lg"><AlertCircle size={18} /></div>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agenda Global</h1>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden p-1 gap-1">
            <button
              onClick={() => { setFilterStatus('today'); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === 'today' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Hoy
            </button>
            <button
              onClick={() => { setFilterStatus('overdue'); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === 'overdue' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Vencidas
            </button>
            <div className="w-px h-4 bg-slate-200 my-auto mx-1"></div>
            <button
              onClick={() => { setFilterStatus('pending'); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === 'pending' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Pendientes
            </button>
            <button
              onClick={() => { setFilterStatus('completed'); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === 'completed' ? 'bg-altavik-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Completadas
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus size={20} /> <span className="hidden sm:inline">Nueva Tarea</span>
          </button>
        </div>
      </header>

      {/* Lista */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="p-6 border-b border-slate-100 bg-white flex justify-between items-center">
          <h3 className="font-bold text-slate-700">Próximas Actividades</h3>
          <span className="text-xs font-medium text-slate-400">{totalItems} registros</span>
        </div>

        <div className="divide-y divide-slate-100 flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-400 gap-2">
              <Loader2 className="animate-spin" /> Cargando...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
              <p className="font-medium">No hay tareas en esta vista.</p>
            </div>
          ) : (
            items.map((item) => {
              const dateObj = new Date(item.due_date);
              return (
                <div key={item.id} className={`p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors group ${item.completed ? 'opacity-60 bg-slate-50/50' : ''}`}>
                  <button
                    onClick={() => toggleStatus(item)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${item.completed ? 'bg-altavik-500 border-altavik-500 text-white' : 'border-slate-300 hover:border-altavik-500 text-transparent'}`}
                  >
                    <CheckCircle2 size={14} />
                  </button>

                  {getTypeIcon(item.type)}

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-bold ${item.completed ? 'text-altavik-600 opacity-70' : 'text-slate-800'}`}>
                        {item.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      {item.leads?.name ? (
                        <span className="flex items-center gap-1 text-altavik-700 font-medium bg-altavik-50 px-2 py-0.5 rounded-md">
                          <User size={12} /> {item.leads.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Sin cliente vinculado</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-4">
                    <p className="text-sm font-bold text-slate-700">
                      {dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </p>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Paginación */}
        {totalItems > 0 && (
          <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Página {page} de {totalPages || 1}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 bg-white border rounded-lg disabled:opacity-50">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 bg-white border rounded-lg disabled:opacity-50">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchAgenda()}
      />
    </div>
  );
}