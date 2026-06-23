// src/pages/Dashboard.tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Globe,
  Smartphone,
  Clock,
  Calendar,
  CheckCircle2,
  Search,
  Plus,
  LayoutDashboard,
  Target,
  TrendingUp,
  Wand2,
  User,
  Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { supabase } from '../lib/supabase';

// UI Components
import FeedbackEmailModal from '../components/leads/FeedbackEmailModal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';

// Dashboard Components
import { StatCard } from '../components/dashboard/StatCard';
import { TabButton } from '../components/dashboard/TabButton';
import { EmptyState } from '../components/dashboard/EmptyState';
import { RadarItem } from '../components/dashboard/RadarItem';
import { FeedbackListItem } from '../components/dashboard/FeedbackListItem';
import { AgendaListItem } from '../components/dashboard/AgendaListItem';

// Hooks
import { useDashboardData, type AgendaItem } from '../hooks/useDashboardData';

export default function Dashboard() {
  const { session } = useAuth();
  const { showConfirm } = useDialog();
  const navigate = useNavigate();

  const {
    stats,
    recentLeads,
    agenda,
    criticalLeads,
    feedbackLeads,
    autoImportedLeads,
    refresh,
    setAgenda
  } = useDashboardData(session?.user?.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'futuras' | 'caducadas' | 'recientes' | 'feedback' | 'inboxia' | 'radar' | 'emails'>('futuras');
  const [selectedLeadForFeedback, setSelectedLeadForFeedback] = useState<any | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const filteredAgenda = useMemo(() => agenda.filter(task => {
    const matchesSearch =
      task.leads?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'recientes') {
      return task.completed;
    }

    if (task.completed) return false;

    const taskDate = new Date(task.due_date).getTime();
    const isOverdue = taskDate < new Date().getTime();
    if (activeTab === 'caducadas' && !isOverdue) return false;
    if (activeTab === 'futuras' && isOverdue) return false;
    return true;
  }), [agenda, searchQuery, activeTab]);

  const overdueCount = useMemo(() => agenda.filter(task => {
    if (task.completed) return false;
    const taskDate = new Date(task.due_date).getTime();
    return taskDate < new Date().getTime();
  }).length, [agenda]);

  const sentEmails = useMemo(() => agenda.filter(task => task.type === 'Email'), [agenda]);
  const unopenedEmailsCount = useMemo(() => sentEmails.filter(e => !e.email_tracking || (e.email_tracking.status !== 'opened' && e.email_tracking.opens_count === 0)).length, [sentEmails]);

  const toggleTask = async (task: AgendaItem) => {
    const newStatus = !task.completed;
    setAgenda(prev => prev.map(t => t.id === task.id ? { ...t, completed: newStatus } : t));
    try {
      const { error } = await (supabase as any).from('agenda').update({ completed: newStatus as any }).eq('id', task.id);
      if (error) throw error;
    } catch (error) {
      console.error("Error actualizando tarea:", error);
      refresh();
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
      refresh();
    }
  };

  const handleWhatsAppFollowup = (task: AgendaItem) => {
    const leadName = task.leads?.name || 'Cliente';
    const phone = task.leads?.phone;
    const hour = new Date().getHours();
    const greeting = hour < 14 ? 'Buenos días' : 'Buenas tardes';
    
    const message = `${greeting}, ${leadName}:

Soy Juan Herrero, de Terravall, inmobiliaria comercializadora de Residencial Altavik.

Le escribo para confirmar si pudo recibir el dossier informativo de la promoción que le enviamos hace unos días. Si no es así, le agradecería que revisase su carpeta de correo no deseado (SPAM); en caso de que siga sin localizarlo, por favor háganoslo saber y se lo haré llegar de inmediato.

Quedo a su entera disposición para resolver cualquier duda que pueda tener sobre la promoción.

Un cordial saludo,

Juan Herrero
www.residencialaltavik.com`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = phone 
      ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;
      
    window.open(whatsappUrl, '_blank');
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
      <PageHeader 
        title="Panel de Control"
        icon={<LayoutDashboard size={24} strokeWidth={3} />}
        subtitle={
          <>Resumen comercial de <span className="text-altavik-600 font-bold ml-1">Terravall</span></>
        }
      />

      <div className="grid grid-cols-12 gap-5 flex-1">
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
          const colors: Array<'indigo' | 'emerald' | 'amber' | 'rose'> = ['indigo', 'emerald', 'amber', 'rose'];
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

        <Card variant="glass" noPadding className="col-span-12 lg:col-span-8 flex flex-col group">
          <div className="p-8 bg-altavik-100 border-b border-altavik-200/50 flex justify-between items-center">
            <div>
              <h3 className="font-black text-slate-950 flex items-center gap-2.5 text-xl tracking-tight">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-altavik-100/30">
                  <Clock size={22} className="text-altavik-600" />
                </div>
                Agenda Comercial
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-1.5 ml-1">Seguimiento de acciones prioritarias</p>
            </div>

            <button
              onClick={() => navigate('/agenda')}
              className="text-[10px] font-black uppercase tracking-wider text-altavik-600 hover:text-altavik-700 transition-all bg-white px-4 py-2 rounded-xl border border-altavik-200/50 shadow-sm hover:bg-altavik-50"
            >
              Calendario Completo
            </button>
          </div>

          <div className="px-8 py-5 border-b border-slate-100/80">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex p-1 bg-slate-100/50 backdrop-blur rounded-2xl w-full sm:w-auto overflow-x-auto custom-scrollbar">
                <TabButton label="Próximas" active={activeTab === 'futuras'} onClick={() => setActiveTab('futuras')} />
                <TabButton 
                  label="Caducadas" 
                  count={overdueCount} 
                  active={activeTab === 'caducadas'} 
                  onClick={() => setActiveTab('caducadas')} 
                  variant="overdue" 
                />
                <TabButton 
                  label="Recientes" 
                  active={activeTab === 'recientes'} 
                  onClick={() => setActiveTab('recientes')} 
                  variant="primary" 
                />
                <TabButton 
                  label="Opinión" 
                  count={feedbackLeads.length} 
                  active={activeTab === 'feedback'} 
                  onClick={() => setActiveTab('feedback')} 
                  variant="primary" 
                />
                <TabButton 
                  label="Nuevos (IA)" 
                  count={autoImportedLeads.length} 
                  active={activeTab === 'inboxia'} 
                  onClick={() => setActiveTab('inboxia')} 
                  variant="primary" 
                />
                <TabButton 
                  label="Correos" 
                  count={unopenedEmailsCount} 
                  active={activeTab === 'emails'} 
                  onClick={() => setActiveTab('emails')} 
                  variant="primary" 
                />
              </div>

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
            ) : activeTab === 'inboxia' ? (
              autoImportedLeads.length === 0 ? (
                <EmptyState icon={<Wand2 />} title="Bandeja IA Limpia" subtitle="No hay clientes importados automáticamente de momento." />
              ) : (
                autoImportedLeads.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase())).map(lead => (
                  <div key={lead.id} onClick={() => navigate(`/leads?search=${encodeURIComponent(lead.name)}`)} className="group relative bg-white border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-md p-4 rounded-2xl transition-all cursor-pointer flex items-start gap-4 mx-4 my-2">
                    <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                      <Wand2 size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold text-slate-800 truncate">{lead.name}</h4>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-wider rounded-md">Smart Inbox</span>
                      </div>
                      <p className="text-xs font-medium text-slate-500 line-clamp-1">{lead.source}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] font-bold text-slate-400 mb-1">{formatDateTime(lead.created_at)}</p>
                      <button className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100/50 shadow-sm transition-all group-hover:bg-indigo-600 group-hover:text-white">Abrir Ficha</button>
                    </div>
                  </div>
                ))
              )
            ) : activeTab === 'emails' ? (
              sentEmails.length === 0 ? (
                <EmptyState icon={<Mail />} title="Sin Correos" subtitle="No hay correos enviados recientemente." />
              ) : (
                sentEmails.filter(t => t.leads?.name?.toLowerCase().includes(searchQuery.toLowerCase())).map(task => {
                  const isUnopened = !task.email_tracking || (task.email_tracking.status !== 'opened' && task.email_tracking.opens_count === 0);
                  return (
                    <AgendaListItem 
                      key={task.id} 
                      task={task} 
                      onToggle={() => toggleTask(task)} 
                      onDelete={() => deleteTask(task.id)} 
                      onWhatsApp={isUnopened ? () => handleWhatsAppFollowup(task) : undefined}
                      formatDate={formatDateTime}
                      hideToggle={true}
                    />
                  );
                })
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
                  readOnly={activeTab === 'recientes'}
                />
              ))
            )}
          </div>
        </Card>

        <div className="col-span-12 lg:col-span-4 space-y-6 flex flex-col">
          <Card variant="white" noPadding className="flex-1 flex flex-col group">
            <div className="p-6 bg-green-50 border-b border-green-100/50 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-800 text-sm tracking-tight flex items-center gap-2">
                  <div className="p-1.5 bg-white rounded-lg shadow-sm border border-green-100/50">
                    <TrendingUp size={16} className="text-green-500" />
                  </div>
                  Nuevos Contactos
                </h3>
                <p className="text-[10px] text-slate-500 font-medium mt-1">Últimas entradas al sistema</p>
              </div>
              <button onClick={() => navigate('/leads')} className="text-[10px] font-bold text-green-700 hover:text-green-800 bg-white hover:bg-green-50 px-3 py-1.5 rounded-lg border border-green-200/60 shadow-sm transition-all">
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
              onSuccess={refresh}
            />
          )}
        </div>
      </div>
      
      <div className="absolute top-[-5%] left-[-2%] w-96 h-96 bg-altavik-200/15 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-[10%] right-[-5%] w-[500px] h-[500px] bg-indigo-200/10 rounded-full blur-[120px] pointer-events-none -z-10" />
    </div>
  );
}