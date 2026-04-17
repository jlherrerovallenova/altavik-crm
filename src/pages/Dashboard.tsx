// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ArrowUpRight,
  Globe,
  Smartphone,
  Clock,
  Calendar,
  CheckCircle2,
  Trash2,
  Circle,
  AlertCircle,
  Search,
  Plus,
  LayoutDashboard,
  Target,
  BarChart3,
  TrendingUp,
  Inbox,
  Send,
  Heart,
  HelpCircle,
  XCircle,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import FeedbackEmailModal from '../components/leads/FeedbackEmailModal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';

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
  const { showConfirm } = useDialog();
  const navigate = useNavigate();

  // Estados para datos
  const [stats, setStats] = useState<{ totalLeads: number; topSources: SourceStat[] }>({
    totalLeads: 0,
    topSources: []
  });
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);

  // Estado para la búsqueda del cliente y el tab activo
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'futuras' | 'caducadas' | 'radar' | 'feedback'>('futuras');
  const [criticalLeads, setCriticalLeads] = useState<any[]>([]);
  const [feedbackLeads, setFeedbackLeads] = useState<any[]>([]);
  const [selectedLeadForFeedback, setSelectedLeadForFeedback] = useState<any | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      loadDashboardData();
    }
  }, [session?.user?.id]);

  const loadDashboardData = async () => {
    try {
      // 1. CARGA DE LEADS Y ESTADÍSTICAS
      const leadsResponse = await supabase.from('leads').select('source');
      const recentResponse = await supabase
        .from('leads')
        .select('id, name, source, created_at')
        .order('created_at', { ascending: false })
        .limit(6);

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

      // 2. CARGA DE AGENDA
      const { data: agendaData, error: agendaError } = await supabase
        .from('agenda')
        .select('*, leads(name, phone)')
        .eq('completed', false)
        .order('due_date', { ascending: true });

      if (!agendaError && agendaData) {
        const formattedData = (agendaData || []).map((item: any) => ({
          ...item,
          leads: Array.isArray(item.leads) ? item.leads[0] : item.leads
        })) as AgendaItem[];
        setAgenda(formattedData);
      }

      // 3. CARGA DE RADAR DE OPORTUNIDADES CRÍTICAS
      const { data: radarData, error: radarError } = await supabase
        .from('leads')
        .select('id, name, source, created_at, status, agenda(due_date, completed)')
        .not('status', 'in', '("closed","lost")'); // Excluir ventas cerradas o perdidas

      if (!radarError && radarData) {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

        const processedRadar = radarData
          .map((l: any) => {
            // Encontrar la fecha de última actividad (o creación si no hay agenda)
            const agendaItems = l.agenda || [];
            const lastActivity = agendaItems.length > 0
              ? new Date(Math.max(...agendaItems.map((a: any) => new Date(a.due_date).getTime())))
              : new Date(l.created_at);
            
            const daysSinceLastActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
            const hasFutureTask = agendaItems.some((a: any) => !a.completed && new Date(a.due_date) > now);

            return {
              id: l.id,
              name: l.name,
              source: l.source,
              created_at: l.created_at,
              status: l.status,
              daysSinceLastActivity,
              isCritical: daysSinceLastActivity >= 7 && !hasFutureTask,
              hasAgenda: agendaItems.length > 0
            };
          })
          .filter((l: any) => l.isCritical)
          .sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity)
          .slice(0, 50);

        setCriticalLeads(processedRadar);

        // 4. CARGA DE LEADS PARA FEEDBACK (Resiliente)
        let feedbackData: any[] = [];
        try {
          // Intentamos cargar con las nuevas columnas
          const { data, error } = await supabase
            .from('leads')
            .select('id, name, email, source, created_at, status, feedback_sent, feedback_rating, feedback_responded_at')
            .or(`status.in.(visiting,closed),feedback_rating.not.is.null`);
          
          if (!error && data) {
            feedbackData = data;
          } else {
            // Fallback si las columnas no existen todavía
            const { data: fallbackData } = await supabase
              .from('leads')
              .select('id, name, email, source, created_at, status, feedback_sent')
              .in('status', ['visiting', 'closed'])
              .eq('feedback_sent', false);
            feedbackData = fallbackData || [];
          }
        } catch (e) {
          console.error("Error cargando feedback:", e);
        }

        const processedFeedback = feedbackData
          .map((l: any) => {
            const daysSinceCreated = Math.floor((now.getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24));
            return {
              ...l,
              daysSinceCreated
            };
          })
          .sort((a, b) => {
            if (a.feedback_responded_at && b.feedback_responded_at) {
              return new Date(b.feedback_responded_at).getTime() - new Date(a.feedback_responded_at).getTime();
            }
            if (a.feedback_responded_at) return -1;
            if (b.feedback_responded_at) return 1;
            return b.daysSinceCreated - a.daysSinceCreated;
          });

        setFeedbackLeads(processedFeedback);
      }

    } catch (error) {
      console.error("Error general cargando dashboard:", error);
    }
  };

  const filteredAgenda = agenda.filter(task => {
    const matchesSearch =
      task.leads?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    const taskDate = new Date(task.due_date).getTime();
    const isOverdue = taskDate < new Date().getTime();
    if (activeTab === 'caducadas' && !isOverdue) return false;
    if (activeTab === 'futuras' && isOverdue) return false;
    if (activeTab === 'radar') return false; 
    if (activeTab === 'feedback') return false;
    return true;
  });

  const overdueCount = agenda.filter(task => {
    const taskDate = new Date(task.due_date).getTime();
    return taskDate < new Date().getTime();
  }).length;

  const toggleTask = async (task: AgendaItem) => {
    const newStatus = !task.completed;
    if (newStatus) setAgenda(prev => prev.filter(t => t.id !== task.id));
    try {
      const { error } = await supabase.from('agenda').update({ completed: newStatus as any }).eq('id', task.id);
      if (error) throw error;
    } catch (error) {
      console.error("Error actualizando tarea:", error);
      loadDashboardData();
    }
  };

  const deleteTask = async (id: number) => {
    const confirmed = await showConfirm({
      title: 'Eliminar Tarea',
      message: '¿Deseas eliminar esta tarea?',
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
      loadDashboardData();
    }
  };

  const getSourceIcon = (sourceName: string) => {
    const lower = sourceName.toLowerCase();
    if (lower.includes('idealista')) {
      return (
        <div className="w-[22px] h-[22px] bg-slate-100 flex items-center justify-center rounded-md border border-slate-200">
          <span translate="no" className="text-[9px] font-black text-slate-500 leading-none select-none">ID</span>
        </div>
      );
    }
    if (lower.includes('web')) return <Globe />;
    if (lower.includes('insta')) return <Smartphone />;
    if (lower.includes('referido')) return <Users />;
    return <Target />;
  };


  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isToday ? `Hoy, ${time}` : `${date.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} ${time}`;
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500 relative">
      {/* HEADER SECTION (Top Bento Row) */}

      <PageHeader 
        title="Panel de Control"
        icon={<LayoutDashboard size={24} strokeWidth={3} />}
        subtitle={
          <>Resumen comercial de <span className="text-altavik-600 font-bold ml-1">Terravall</span></>
        }
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => navigate('/agenda')}
            >
              <Calendar size={18} /> Nueva Tarea
            </Button>
            <Button
              onClick={() => navigate('/leads')}
            >
              <Plus size={18} /> Nuevo Contacto
            </Button>
          </>
        }
      />

      {/* BENTO GRID */}
      <div className="grid grid-cols-12 gap-5 flex-1">
        
        {/* STATS AREA (Top Row Bento) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <StatCard
            title="TOTAL CLIENTES"
            value={stats.totalLeads.toString()}
            subtitle="Base histórica completa"
            icon={<Users />}
            color="slate"
            onClick={() => navigate('/leads')}
          />
        </div>
        {stats.topSources.map((source, idx) => {
          const colors = ['indigo', 'emerald', 'amber', 'rose'];
          return (
            <div key={idx} className="col-span-12 sm:col-span-6 lg:col-span-3">
              <StatCard
                title={`ORIGEN: ${source.name.toUpperCase()}`}
                value={source.count.toString()}
                subtitle={`${source.percentage}% del total de registros`}
                icon={getSourceIcon(source.name)}
                color={colors[idx % colors.length]}
                onClick={() => navigate(`/leads?source=${encodeURIComponent(source.name)}`)}
              />
            </div>
          );
        })}


        {/* MAIN BENTO: AGENDA WIDGET */}
        <Card variant="glass" noPadding className="col-span-12 lg:col-span-8 flex flex-col group">
          <div className="p-8 border-b border-slate-100/80 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-950 flex items-center gap-2.5 text-xl tracking-tight">
                  <div className="p-2 bg-altavik-50 rounded-xl">
                    <Clock size={22} className="text-altavik-600" />
                  </div>
                  Agenda Comercial
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-1.5 ml-1">Seguimiento de acciones prioritarias</p>
              </div>

              <button
                onClick={() => navigate('/agenda')}
                className="text-[10px] font-black uppercase tracking-wider text-altavik-600 hover:text-altavik-700 transition-all bg-altavik-50 px-4 py-2 rounded-xl border border-altavik-100/50 hover:bg-altavik-100"
              >
                Calendario Completo
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {/* TABS BENTO STYLE */}
              <div className="flex p-1 bg-slate-100/50 backdrop-blur rounded-2xl w-full sm:w-auto">
                <TabButton label="Próximas" active={activeTab === 'futuras'} onClick={() => setActiveTab('futuras')} />
                <TabButton 
                  label="Caducadas" 
                  count={overdueCount} 
                  active={activeTab === 'caducadas'} 
                  onClick={() => setActiveTab('caducadas')} 
                  variant="overdue" 
                />
                <TabButton 
                  label="Opinión" 
                  count={feedbackLeads.length} 
                  active={activeTab === 'feedback'} 
                  onClick={() => setActiveTab('feedback')} 
                  variant="primary" 
                />
              </div>

              {/* SEARCH MINIMAL */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar contacto o tarea..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-100/30 border border-slate-200/50 rounded-2xl text-xs font-medium focus:outline-none focus:ring-4 focus:ring-altavik-500/5 focus:bg-white transition-all text-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[480px] px-6 py-2 divide-y divide-slate-50">
            {activeTab === 'radar' ? (
              criticalLeads.length === 0 ? (
                <EmptyState icon={<CheckCircle2 />} title="¡Sin fugas!" subtitle="No hay oportunidades en riesgo crítico de enfriamiento." />
              ) : (
                criticalLeads.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase())).map(lead => (
                  <RadarItem key={lead.id} lead={lead} onClick={() => navigate(`/leads?search=${encodeURIComponent(lead.name)}`)} />
                ))
              )
            ) : activeTab === 'feedback' ? (
              feedbackLeads.length === 0 ? (
                <EmptyState icon={<CheckCircle2 />} title="¡Todo en orden!" subtitle="No hay clientes esperando encuesta de opinión hoy." />
              ) : (
                feedbackLeads.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase())).map(lead => (
                  <FeedbackListItem 
                    key={lead.id} 
                    lead={lead} 
                    onSend={() => {
                      setSelectedLeadForFeedback(lead);
                      setIsFeedbackModalOpen(true);
                    }} 
                  />
                ))
              )
            ) : filteredAgenda.length === 0 ? (
              <EmptyState 
                icon={activeTab === 'caducadas' ? <CheckCircle2 /> : <Calendar />} 
                title={activeTab === 'caducadas' ? "¡Al día!" : "Agenda despejada"} 
                subtitle="No hay tareas que mostrar en esta sección." 
              />
            ) : (
              filteredAgenda.map(task => (
                <AgendaListItem 
                  key={task.id} 
                  task={task} 
                  onToggle={() => toggleTask(task)} 
                  onDelete={() => deleteTask(task.id)} 
                  formatDate={formatDateTime}
                />
              ))
            )}
          </div>
        </Card>

        {/* RIGHT BENTO: SIDEBAR MODULES */}
        <div className="col-span-12 lg:col-span-4 space-y-6 flex flex-col">
          
          {/* RECENT LEADS BENTO */}
          <Card variant="white" noPadding className="flex-1 flex flex-col group">

            <div className="p-6 border-b border-slate-100/50 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-800 text-sm tracking-tight flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-500" />
                  Nuevos Contactos
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Últimas entradas al sistema</p>
              </div>
              <button onClick={() => navigate('/leads')} className="text-[10px] font-bold text-slate-600 hover:text-altavik-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 transition-all">
                Ver todos
              </button>
            </div>
            <div className="p-4 space-y-1.5 overflow-y-auto max-h-[300px]">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => navigate(`/leads?search=${encodeURIComponent(lead.name)}`)}
                  className="flex items-center gap-3 p-3 hover:bg-slate-100/50 rounded-2xl transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:scale-105 group-hover:border-altavik-200 transition-all duration-300">
                    <User size={18} strokeWidth={2.5} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[13px] font-bold text-slate-800 tracking-tight group-hover:text-altavik-700 transition-colors">{lead.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">{lead.source || 'Directo'}</span>
                      <span className="text-[8px] text-slate-300">•</span>
                      <span className="text-[10px] text-slate-400 font-medium">{new Date(lead.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>



          {selectedLeadForFeedback && (
            <FeedbackEmailModal
              isOpen={isFeedbackModalOpen}
              onClose={() => setIsFeedbackModalOpen(false)}
              lead={selectedLeadForFeedback}
              onSuccess={loadDashboardData}
            />
          )}

      </div>
      
      {/* DECORATIVE BACKGROUND ELEMENTS */}
      <div className="absolute top-[-5%] left-[-2%] w-96 h-96 bg-altavik-200/15 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-[10%] right-[-5%] w-[500px] h-[500px] bg-indigo-200/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      </div>
    </div>
  );
}

// --- SUBCOMPONENTES ---

function StatCard({ title, value, subtitle, icon, isTrend, trendValue, onClick, color = 'slate' }: any) {
  const barColors: any = {
    slate: 'bg-blue-500',
    indigo: 'bg-indigo-600',
    emerald: 'bg-emerald-500',
    amber: 'bg-orange-500',
    rose: 'bg-rose-500'
  };

  const barColor = barColors[color] || barColors.slate;

  return (
    <div
      onClick={onClick}
      className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm transition-all duration-300 flex flex-col justify-between h-full min-h-[140px] group hover:shadow-md hover:-translate-y-1 cursor-pointer overflow-hidden relative active:scale-95"
    >
      <div className="flex justify-between items-center mb-4">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{title}</span>
        <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
          {icon && React.cloneElement(icon as React.ReactElement, { size: 22, strokeWidth: 1.5 })}
        </div>
      </div>
      
      <div>
        <h4 className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-1">{value}</h4>
        <p className="text-[11px] text-slate-500 font-medium mt-3">{subtitle}</p>
      </div>

      {/* Bottom accent bar */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${barColor} opacity-90`} />
    </div>
  );
}



function TabButton({ label, active, onClick, count, variant }: any) {
  const countColor = variant === 'overdue' ? 'bg-red-500' : variant === 'warning' ? 'bg-orange-500' : 'bg-altavik-500';
  const textColor = active 
    ? (variant === 'overdue' ? 'text-red-700' : variant === 'warning' ? 'text-orange-700' : 'text-altavik-700')
    : 'text-slate-500 hover:text-slate-700';

  return (
    <button
      onClick={onClick}
      className={`relative px-5 py-2.5 rounded-xl text-[13px] font-black transition-all flex items-center gap-2 whitespace-nowrap active:scale-95 ${active ? 'bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/50 ' + textColor : 'text-slate-400 hover:text-slate-600'}`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`${countColor} text-white text-[9px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full font-black animate-in zoom-in px-1`}>
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({ icon, title, subtitle }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
      <div className="p-5 bg-slate-50 rounded-full text-slate-300 mb-4 ring-8 ring-slate-50/50">
        {icon && Object.assign({}, icon, { props: { ...icon.props, size: 40 } })}
      </div>
      <h4 className="text-sm font-black text-slate-800 mb-1 tracking-tight">{title}</h4>
      <p className="text-[11px] text-slate-400 font-medium px-10">{subtitle}</p>
    </div>
  );
}

function RadarItem({ lead, onClick }: any) {
  return (
    <div className="p-4 hover:bg-red-50/30 transition-all flex items-center justify-between group cursor-pointer rounded-2xl border border-transparent hover:border-red-100" onClick={onClick}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-red-50 text-red-600 border border-red-100 font-black text-xs group-hover:scale-105 transition-transform relative">
          {lead.name.substring(0, 2).toUpperCase()}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[14px] font-black text-slate-800 tracking-tight">{lead.name}</span>
            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-lg border border-red-200">CRÍTICO</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
            <span>{lead.source || 'Sin registro'}</span>
            <span className="text-[8px] opacity-30">•</span>
            <span className="text-red-500 font-bold">Sin actividad hace {lead.daysSinceLastActivity} días</span>
          </div>
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 p-2 bg-slate-900 text-white rounded-xl shadow-lg">
        <Plus size={16} />
      </div>
    </div>
  );
}

function FeedbackListItem({ lead, onSend }: any) {
  const hasFeedback = !!lead.feedback_rating;
  
  const ratingCfg = {
    positive: { icon: <Heart size={14} className="text-pink-500" />, label: 'Me ha encantado', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    neutral: { icon: <HelpCircle size={14} className="text-amber-500" />, label: 'Tengo dudas', color: 'bg-amber-50 text-amber-700 border-amber-100' },
    negative: { icon: <XCircle size={14} className="text-slate-400" />, label: 'No es lo que buscaba', color: 'bg-slate-50 text-slate-600 border-slate-200' },
  }[lead.feedback_rating as 'positive' | 'neutral' | 'negative'] || null;

  return (
    <div className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:pl-2 transition-all rounded-2xl ${hasFeedback ? 'bg-slate-50/50 px-4 mb-2 border border-slate-100' : ''}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-xs group-hover:scale-105 transition-transform ${hasFeedback ? 'bg-white border-slate-200 text-slate-700' : 'bg-altavik-50 text-altavik-600 border-altavik-100 border'}`}>
          {lead.name.substring(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="text-[14px] font-black text-slate-800 tracking-tight truncate">{lead.name}</span>
            {hasFeedback ? (
              <span className={`flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${ratingCfg?.color}`}>
                {ratingCfg?.icon}
                <span className="truncate">{ratingCfg?.label}</span>
              </span>
            ) : (
              <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-200 whitespace-nowrap">
                {lead.status === 'visiting' ? 'VISITÓ HACE +7 DÍAS' : 'VENTA CERRADA'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
            <span className="truncate max-w-[100px] sm:max-w-none">{lead.source || 'Sin registro'}</span>
            <span className="text-[8px] opacity-30">•</span>
            {hasFeedback ? (
              <span className="text-slate-500 font-bold italic truncate">
                {new Date(lead.feedback_responded_at).toLocaleDateString()}
              </span>
            ) : (
              <span className="text-altavik-600 font-bold">Esperando feedback</span>
            )}
          </div>
        </div>
      </div>
      
      {!hasFeedback ? (
        <button
          onClick={onSend}
          className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-[11px] font-black shadow-lg sm:transform sm:translate-x-2 sm:group-hover:translate-x-0 active:scale-95 w-full sm:w-auto"
        >
          <Send size={14} /> ENVIAR ENCUESTA
        </button>
      ) : (
        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border border-slate-100 text-center sm:text-left">
          Registrado
        </div>
      )}
    </div>
  );
}

function AgendaListItem({ task, onToggle, onDelete, formatDate }: any) {
  const isOverdue = new Date(task.due_date) < new Date();
  
  return (
    <div className="py-4 flex items-center justify-between group hover:pl-2 transition-all rounded-2xl">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggle}
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all border-2 border-slate-100 bg-white text-slate-200 hover:border-altavik-500 hover:text-altavik-500 hover:rotate-12 hover:scale-105 group-hover:shadow-lg shadow-slate-200/50"
        >
          <Circle size={22} strokeWidth={3} />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
              task.type === 'Llamada' ? 'bg-blue-50 text-blue-600 border-blue-100' :
              task.type === 'WhatsApp' ? 'bg-altavik-50 text-altavik-600 border-altavik-100' :
              task.type === 'Visita' ? 'bg-purple-50 text-purple-600 border-purple-100' :
              'bg-slate-50 text-slate-500 border-slate-100'
            }`}>
              {task.type}
            </span>
            <span className="text-[15px] font-black text-slate-800 tracking-tight truncate max-w-[200px]">
              {task.leads?.name || 'Cliente anónimo'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold">
            <span className="truncate">{task.title}</span>
            <span className="opacity-30">•</span>
            <span className={`${isOverdue ? "text-red-500 font-black flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100" : "text-altavik-600"}`}>
              {isOverdue && <AlertCircle size={10} />}
              {formatDate(task.due_date)}
            </span>
          </div>
        </div>
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 transform translate-x-3 group-hover:translate-x-0">
        <button
          onClick={onDelete}
          className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}