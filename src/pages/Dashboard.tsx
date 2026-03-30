// src/pages/Dashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Smartphone,
  HelpCircle,
  Clock,
  Calendar,
  CheckCircle2,
  Trash2,
  Circle,
  AlertCircle,
  Search,
  Plus,
  Phone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

// --- TIPOS ---
type AgendaItem = Database['public']['Tables']['agenda']['Row'] & {
  leads?: { name: string, phone: string | null } | null
};

interface SourceStat {
  name: string;
  count: number;
  percentage: number;
}

interface RecentLead {
  id: string;
  name: string;
  source: string | null;
  created_at: string;
}

export default function Dashboard() {
  const { session } = useAuth();
  const { showConfirm, showAlert } = useDialog();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Estados para datos
  const [stats, setStats] = useState<{ totalLeads: number; topSources: SourceStat[] }>({
    totalLeads: 0,
    topSources: []
  });
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);

  // Estado para la búsqueda del cliente y el tab activo
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'futuras' | 'caducadas' | 'sinActividad'>('futuras');
  const [noActivityLeads, setNoActivityLeads] = useState<RecentLead[]>([]);

  useEffect(() => {
    if (session?.user?.id) {
      loadDashboardData();
    }
  }, [session?.user?.id]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. CARGA DE LEADS Y ESTADÍSTICAS
      const leadsResponse = await supabase.from('leads').select('source');
      const recentResponse = await supabase
        .from('leads')
        .select('id, name, source, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (leadsResponse.data) {
        const total = leadsResponse.data.length;
        const sourceCounts: Record<string, number> = {};
        leadsResponse.data.forEach((lead: any) => {
          const source = lead.source ? lead.source.trim() : 'Desconocido';
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        });
        const sortedSources = Object.entries(sourceCounts)
          .map(([name, count]) => ({
            name,
            count,
            percentage: total > 0 ? Math.round((count / total) * 100) : 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        setStats({ totalLeads: total, topSources: sortedSources });
      }

      if (recentResponse.data) {
        setRecentLeads(recentResponse.data);
      }

      // 2. CARGA DE AGENDA (Aprovechando la relación Foreign Key)
      // Traemos más de 20 por si hay muchas caducadas mezcladas con futuras
      const { data: agendaData, error: agendaError } = await supabase
        .from('agenda')
        .select('*, leads(name, phone)')
        .eq('completed', false)
        .order('due_date', { ascending: true });

      if (agendaError) {
        console.error("Error fetching agenda:", agendaError);
      } else if (agendaData) {
        const formattedData = (agendaData || []).map((item: any) => ({
          ...item,
          leads: Array.isArray(item.leads) ? item.leads[0] : item.leads
        })) as AgendaItem[];

        setAgenda(formattedData);
      }

      // 3. CARGA DE CLIENTES SIN ACTIVIDAD
      // Obtenemos leads y sus IDs de agenda para filtrar los que no tienen nada
      const { data: noActivityData, error: noActError } = await supabase
        .from('leads')
        .select('id, name, source, created_at, agenda(id)');

      if (!noActError && noActivityData) {
        const filtered = noActivityData
          .filter((l: any) => !l.agenda || l.agenda.length === 0)
          .map((l: any) => ({
            id: l.id,
            name: l.name,
            source: l.source,
            created_at: l.created_at
          }))
          .slice(0, 50); // Mostramos los 50 más antiguos o relevantes
        setNoActivityLeads(filtered);
      }

    } catch (error) {
      console.error("Error general cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE FILTRADO Y PESTAÑAS ---
  const filteredAgenda = agenda.filter(task => {
    // 1. Filtro por búsqueda de cliente o título
    const matchesSearch =
      task.leads?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Filtro por Tab (Caducadas vs Futuras)
    const taskDate = new Date(task.due_date).getTime();
    const isOverdue = taskDate < new Date().getTime();

    if (activeTab === 'caducadas' && !isOverdue) return false;
    if (activeTab === 'futuras' && isOverdue) return false;

    return true;
  });

  // Contador para el badge de tareas caducadas
  const overdueCount = agenda.filter(task => {
    const taskDate = new Date(task.due_date).getTime();
    return taskDate < new Date().getTime();
  }).length;

  // --- ACCIONES DE LA AGENDA ---
  const toggleTask = async (task: AgendaItem) => {
    const newStatus = !task.completed;
    if (newStatus) {
      setAgenda(prev => prev.filter(t => t.id !== task.id));
    }
    try {
      const { error } = await supabase
        .from('agenda')
        // @ts-ignore: Tipado complejo entre joins causa fallos de inferencia
        .update({ completed: newStatus })
        .eq('id', task.id);
      if (error) throw error;
    } catch (error) {
      console.error("Error actualizando tarea:", error);
      loadDashboardData();
    }
  };

  const deleteTask = async (id: number) => {
    const confirmed = await showConfirm({
      title: 'Eliminar Tarea',
      message: '¿Estás seguro de que deseas eliminar esta tarea de la agenda?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    });
    if (!confirmed) return;
    setAgenda(prev => prev.filter(t => t.id !== id));
    try {
      const { error } = await supabase.from('agenda').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error("Error eliminando tarea:", error);
      await showAlert({ title: 'Error', message: 'No se pudo eliminar la tarea' });
      loadDashboardData();
    }
  };

  // --- HELPERS DE UI ---
  const getSourceIcon = (sourceName: string) => {
    const lower = sourceName.toLowerCase();
    if (lower.includes('idealista')) {
      return (
        <div className="w-5 h-5 bg-[#deff30] flex items-center justify-center rounded shadow-sm border border-black/10 overflow-hidden">
          <span className="text-[10px] font-black text-slate-900 leading-none mr-[0.5px]">id</span>
        </div>
      );
    }
    if (lower.includes('web') || lower.includes('google')) return <Globe className="text-blue-600" size={16} />;
    if (lower.includes('insta') || lower.includes('facebook') || lower.includes('redes') || lower.includes('social')) return <Smartphone className="text-purple-600" size={16} />;
    if (lower.includes('referido') || lower.includes('amigo')) return <Users className="text-altavik-600" size={16} />;
    if (lower.includes('llamada') || lower.includes('tel')) return <Phone className="text-green-600" size={16} />;
    return <HelpCircle className="text-slate-400" size={16} />;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isToday ? `Hoy, ${time}` : `${date.toLocaleDateString()} ${time}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">

      {/* CABECERA CON CTAs RÁPIDOS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Panel de Control</h1>
          <p className="text-slate-500">Hola {session?.user.email?.split('@')[0]}, resumen de actividad.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate('/agenda')}
            className="flex-1 sm:flex-none bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <Calendar size={16} /> Nueva Tarea
          </button>
          <button
            onClick={() => navigate('/leads')}
            className="flex-1 sm:flex-none bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS COMPACTAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-24 animate-pulse" />
          ))
        ) : (
          <>
            <StatCard
              title="Total Contactos"
              value={stats.totalLeads.toString()}
              change="Base de Datos"
              isPositive={true}
              icon={<Users className="text-slate-900" size={16} />}
              trendIcon={false}
              onClick={() => navigate('/leads')}
            />
            {stats.topSources.map((source, index) => (
              <StatCard
                key={index}
                title={`Origen: ${source.name}`}
                value={source.count.toString()}
                change={`${source.percentage}%`}
                isPositive={true}
                icon={getSourceIcon(source.name)}
                trendIcon={true}
                onClick={() => navigate(`/leads?source=${encodeURIComponent(source.name)}`)}
              />
            ))}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* WIDGET: AGENDA DE ACCIONES */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-6 border-b border-slate-100 flex flex-col gap-4 bg-white">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock size={18} className="text-altavik-500" />
                Agenda de Acciones
              </h3>
              <button
                onClick={() => navigate('/agenda')}
                className="text-xs font-bold text-altavik-600 hover:text-altavik-700 transition-colors bg-altavik-50 px-3 py-1.5 rounded-full"
              >
                VER CALENDARIO
              </button>
            </div>

            {/* PESTAÑAS (TABS) */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-full sm:w-fit">
              <button
                onClick={() => setActiveTab('futuras')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'futuras'
                  ? 'bg-white text-altavik-700 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
              >
                Próximas
              </button>
              <button
                onClick={() => setActiveTab('caducadas')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'caducadas'
                  ? 'bg-white text-red-600 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
              >
                Caducadas
                {overdueCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full select-none">
                    {overdueCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('sinActividad')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'sinActividad'
                  ? 'bg-white text-orange-600 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
              >
                Sin Actividad
                {noActivityLeads.length > 0 && (
                  <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full select-none">
                    {noActivityLeads.length}
                  </span>
                )}
              </button>
            </div>

            {/* BUSCADOR DE CLIENTE */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por cliente o tarea..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all font-medium text-slate-700"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[500px]">
            {activeTab === 'sinActividad' ? (
              noActivityLeads.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-in fade-in">
                  <CheckCircle2 size={48} className="mb-4 opacity-30 text-altavik-500" />
                  <p className="text-sm font-medium text-slate-600">¡Increíble!</p>
                  <p className="text-xs opacity-60">Todos tus clientes tienen acciones programadas.</p>
                </div>
              ) : (
                noActivityLeads
                  .filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((lead) => (
                    <div key={lead.id} className="p-4 hover:bg-slate-50 transition-all flex items-center justify-between group bg-white cursor-pointer" onClick={() => navigate(`/leads?search=${encodeURIComponent(lead.name)}`)}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-orange-50 text-orange-600 border border-orange-100 font-bold text-xs">
                          {lead.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-slate-800">{lead.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-medium">{lead.source || 'Sin origen'}</span>
                            <span>•</span>
                            <span className="text-red-400 font-medium">Sin actividad registrada</span>
                          </div>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus size={18} className="text-altavik-500" />
                      </div>
                    </div>
                  ))
              )
            ) : filteredAgenda.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-in fade-in">
                {activeTab === 'caducadas' ? (
                  <>
                    <CheckCircle2 size={48} className="mb-4 opacity-30 text-altavik-500" />
                    <p className="text-sm font-medium text-slate-600">¡Impecable!</p>
                    <p className="text-xs opacity-60">No tienes ninguna tarea vencida.</p>
                  </>
                ) : (
                  <>
                    <Calendar size={48} className="mb-4 opacity-20 text-slate-500" />
                    <p className="text-sm font-medium text-slate-600">
                      {searchQuery ? 'No hay coincidencias' : 'Todo al día'}
                    </p>
                    <p className="text-xs opacity-60">
                      {searchQuery ? 'Prueba con otro nombre' : 'No tienes acciones futuras pendientes'}
                    </p>
                  </>
                )}
              </div>
            ) : (
              filteredAgenda.map((task) => {
                const isOverdue = new Date(task.due_date) < new Date();
                return (
                  <div key={task.id} className="p-4 hover:bg-slate-50 transition-all flex items-center justify-between group bg-white">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleTask(task)}
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all shadow-sm bg-white border border-slate-200 text-slate-300 hover:border-altavik-400 hover:text-altavik-500"
                      >
                        <Circle size={20} />
                      </button>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium uppercase tracking-wider px-2 py-0.5 rounded border ${task.type === 'Llamada' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            task.type === 'WhatsApp' ? 'bg-altavik-50 text-altavik-600 border-altavik-100' :
                              task.type === 'Visita' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                'bg-slate-50 text-slate-600 border-slate-100'
                            }`}>
                            {task.type}
                          </span>
                          <span className="text-sm font-bold text-slate-800">
                            {task.leads?.name || 'Sin cliente vinculado'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                           <span className="font-medium">{task.title}</span>
                          <span>•</span>
                          <span className={`${isOverdue ? "text-red-500 font-bold flex items-center gap-1" : ""}`}>
                            {isOverdue && <AlertCircle size={10} />}
                            {formatDateTime(task.due_date)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                      {task.type === 'Visita' && task.leads?.phone && (
                        <button
                          onClick={() => {
                            const now = new Date();
                            const hour = now.getHours();
                            const greeting = hour < 14 ? 'Buenos días' : 'Buenas tardes';
                            const taskDate = new Date(task.due_date);
                            const day = taskDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            const time = taskDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                            const leadName = task.leads?.name || 'Cliente';
                            const leadPhone = task.leads?.phone || '';
                            
                            const text = `${greeting}, ${leadName}.\n\nRecordatorio de la cita:\n*Día:* ${day}\n*Hora:* ${time}\n*Lugar:* Terravall. Plaza Mayor 8 1ºA.`;
                            
                            const cleanPhone = leadPhone.replace(/\D/g, '');
                            const finalPhone = cleanPhone.startsWith('34') ? cleanPhone : `34${cleanPhone}`;
                            
                            window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`, '_blank');
                          }}
                          title="Enviar recordatorio por WhatsApp"
                          className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <Smartphone size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* BARRA LATERAL: LEADS Y ACCESOS */}
        <div className="space-y-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="font-bold text-slate-800 text-sm">Clientes Recientes</h3>
              <button onClick={() => navigate('/leads')} className="text-[10px] font-bold text-altavik-600 hover:text-altavik-700 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">
                VER TODOS
              </button>
            </div>
            <div className="p-4 space-y-3">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => navigate(`/leads?search=${encodeURIComponent(lead.name)}`)}
                  className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs border border-slate-200 group-hover:bg-white group-hover:border-altavik-200 transition-colors">
                    {lead.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-800 truncate group-hover:text-altavik-700 transition-colors">{lead.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{lead.source || 'Sin origen'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-white">
              <h3 className="font-bold text-slate-800 text-sm">Accesos Rápidos</h3>
            </div>
            <div className="p-5 space-y-3">
              <button
                onClick={() => navigate('/leads')}
                className="w-full py-3 bg-slate-900 text-white rounded-lg text-xs font-bold shadow hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <Users size={14} /> Gestionar Clientes
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/inventory')}
                  className="w-full py-3 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Clock size={14} /> Inventario
                </button>
                <button
                  onClick={() => navigate('/agenda')}
                  className="w-full py-3 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Calendar size={14} /> Agenda
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, isPositive, icon, trendIcon = true, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 transition-all duration-200 flex flex-col justify-between ${onClick ? 'cursor-pointer hover:shadow-md hover:border-altavik-200 hover:-translate-y-0.5' : ''
        }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="p-1.5 bg-slate-50 rounded-lg">{icon}</div>
        {trendIcon && (
          <div className={`flex items-center text-[10px] font-bold ${isPositive ? 'text-altavik-600' : 'text-red-600'}`}>
            {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            <span className="ml-1">{change}</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-slate-500 text-xs font-medium">{title}</p>
        <h4 className="text-xl font-bold text-slate-900 mt-0.5">{value}</h4>
      </div>
    </div>
  );
}