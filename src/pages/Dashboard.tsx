// src/pages/Dashboard.tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Globe, Smartphone, Clock, Calendar, CircleCheck as CheckCircle2, Search, Plus, LayoutDashboard, Target, TrendingUp, Wand as Wand2, User, Mail, Sun, Sunset } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { supabase } from '../lib/supabase';
import { useSettings } from '../hooks/useSettings';

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
  const { data: settings } = useSettings();

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
  const [activeTab, setActiveTab] = useState<'hoy' | 'caducadas' | 'semana' | 'feedback' | 'emails'>('hoy');
  const [selectedLeadForFeedback, setSelectedLeadForFeedback] = useState<any | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const dateBoundaries = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const dayOfWeek = now.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const endSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 59, 59, 999);

    const next7Days = new Date(startToday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    const endW = endSunday.getTime() > next7Days.getTime() ? endSunday : next7Days;

    return {
      startTodayTime: startToday.getTime(),
      endTodayTime: endToday.getTime(),
      endWeekTime: endW.getTime(),
    };
  }, []);

  const todayCount = useMemo(() => agenda.filter(task => {
    if (task.completed) return false;
    const taskDate = new Date(task.due_date).getTime();
    return taskDate >= dateBoundaries.startTodayTime && taskDate <= dateBoundaries.endTodayTime;
  }).length, [agenda, dateBoundaries]);

  const overdueCount = useMemo(() => agenda.filter(task => {
    if (task.completed) return false;
    const taskDate = new Date(task.due_date).getTime();
    return taskDate < dateBoundaries.startTodayTime;
  }).length, [agenda, dateBoundaries]);

  const weekCount = useMemo(() => agenda.filter(task => {
    if (task.completed) return false;
    const taskDate = new Date(task.due_date).getTime();
    return taskDate >= dateBoundaries.startTodayTime && taskDate <= dateBoundaries.endWeekTime;
  }).length, [agenda, dateBoundaries]);

  const filteredAgenda = useMemo(() => agenda.filter(task => {
    const matchesSearch =
      task.leads?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (task.completed) return false;

    const taskDate = new Date(task.due_date).getTime();

    if (activeTab === 'hoy') {
      return taskDate >= dateBoundaries.startTodayTime && taskDate <= dateBoundaries.endTodayTime;
    }
    if (activeTab === 'caducadas') {
      return taskDate < dateBoundaries.startTodayTime;
    }
    if (activeTab === 'semana') {
      return taskDate >= dateBoundaries.startTodayTime && taskDate <= dateBoundaries.endWeekTime;
    }
    return true;
  }), [agenda, searchQuery, activeTab, dateBoundaries]);

  const sentEmails = useMemo(() => {
    return agenda
      .filter(task => task.type === 'Email')
      .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
  }, [agenda]);
  const unopenedEmailsCount = useMemo(() => sentEmails.filter(e => !e.email_tracking || (e.email_tracking.status !== 'opened' && e.email_tracking.opens_count === 0)).length, [sentEmails]);

  const getTasksForHour = (targetHour: number, period: 'morning' | 'afternoon') => {
    return filteredAgenda.filter(task => {
      const taskHour = new Date(task.due_date).getHours();
      if (period === 'morning') {
        if (targetHour === 9 && taskHour < 9) return true;
        return taskHour === targetHour;
      } else {
        if (targetHour === 20 && taskHour > 20) return true;
        return taskHour === targetHour;
      }
    });
  };

  const morningTaskCount = useMemo(() => {
    return filteredAgenda.filter(task => {
      const h = new Date(task.due_date).getHours();
      return h <= 14;
    }).length;
  }, [filteredAgenda]);

  const afternoonTaskCount = useMemo(() => {
    return filteredAgenda.filter(task => {
      const h = new Date(task.due_date).getHours();
      return h >= 15;
    }).length;
  }, [filteredAgenda]);

  const weekDays = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + distanceToMonday, 0, 0, 0, 0);
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    return dayNames.map((name, index) => {
      const dayStart = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index, 0, 0, 0, 0);
      const dayEnd = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index, 23, 59, 59, 999);
      const dateFormatted = dayStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      const isToday = now.getDate() === dayStart.getDate() && now.getMonth() === dayStart.getMonth() && now.getFullYear() === dayStart.getFullYear();

      return {
        name,
        dateFormatted,
        isToday,
        startTime: dayStart.getTime(),
        endTime: dayEnd.getTime()
      };
    });
  }, []);

  const getTasksForDay = (startTime: number, endTime: number) => {
    return agenda.filter(task => {
      if (task.completed) return false;
      const matchesSearch =
        task.leads?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      const taskTime = new Date(task.due_date).getTime();
      return taskTime >= startTime && taskTime <= endTime;
    });
  };

  const toggleTask = async (task: AgendaItem) => {
    const newStatus = !task.completed;
    setAgenda((prev: AgendaItem[]) => prev.map((t: AgendaItem) => t.id === task.id ? { ...t, completed: newStatus } : t));
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
    setAgenda((prev: AgendaItem[]) => prev.filter((t: AgendaItem) => t.id !== id));
    try {
      const { error } = await (supabase as any).from('agenda').delete().eq('id', id);
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
    const promotionName = settings?.promotion_name || 'Residencial Altavik';
    const promotionWebsite = settings?.promotion_name 
      ? `www.${settings.promotion_name.toLowerCase().replace(/\s+/g, '')}.com` 
      : 'www.residencialaltavik.com';
    
    const message = `${greeting}, ${leadName}:

Soy Juan Herrero, de Terravall, inmobiliaria comercializadora de ${promotionName}.

Le escribo para confirmar si pudo recibir el dossier informativo de la promoción que le enviamos hace unos días. Si no es así, le agradecería que revisase su carpeta de correo no deseado (SPAM); en caso de que siga sin localizarlo, por favor háganoslo saber y se lo haré llegar de inmediato.

Quedo a su entera disposición para resolver cualquier duda que pueda tener sobre la promoción.

Un cordial saludo,

Juan Herrero
${promotionWebsite}`;

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
    if (lower.includes('google sem') || lower.includes('sem')) return <Search />;
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
            // react-doctor-disable-next-line no-array-index-as-key
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

            <button type="button"
              onClick={() => navigate('/agenda')}
              className="text-[10px] font-black uppercase tracking-wider text-altavik-600 hover:text-altavik-700 transition-all bg-white px-4 py-2 rounded-xl border border-altavik-200/50 shadow-sm hover:bg-altavik-50"
            >
              Calendario Completo
            </button>
          </div>

          <div className="px-8 py-5 border-b border-slate-100/80">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex p-1 bg-slate-100/50 backdrop-blur rounded-2xl w-full sm:w-auto overflow-x-auto custom-scrollbar">
                <TabButton 
                  label="Hoy" 
                  count={todayCount > 0 ? todayCount : undefined} 
                  active={activeTab === 'hoy'} 
                  onClick={() => setActiveTab('hoy')} 
                />
                <TabButton 
                  label="Caducadas" 
                  count={overdueCount} 
                  active={activeTab === 'caducadas'} 
                  onClick={() => setActiveTab('caducadas')} 
                  variant="overdue" 
                />
                <TabButton 
                  label="Esta semana" 
                  count={weekCount > 0 ? weekCount : undefined} 
                  active={activeTab === 'semana'} 
                  onClick={() => setActiveTab('semana')} 
                />
                <TabButton 
                  label="Opinión" 
                  count={feedbackLeads.length} 
                  active={activeTab === 'feedback'} 
                  onClick={() => setActiveTab('feedback')} 
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

          <div className="flex-1 overflow-y-auto max-h-[520px] px-6 py-2 divide-y divide-slate-50">
            {activeTab === 'hoy' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 py-3">
                {/* Columna Mañana: 09:00 a 14:00 */}
                <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-100/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 flex items-center gap-2">
                      <Sun size={15} className="text-amber-500" />
                      Mañana (09:00 - 14:00)
                    </h4>
                    <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
                      {morningTaskCount} {morningTaskCount === 1 ? 'tarea' : 'tareas'}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {[9, 10, 11, 12, 13, 14].map(h => {
                      const slotTasks = getTasksForHour(h, 'morning');
                      const formattedHour = `${h.toString().padStart(2, '0')}:00`;
                      return (
                        <div key={h} className="group flex items-start gap-2.5 p-2 bg-white rounded-xl border border-slate-100 shadow-2xs hover:border-amber-200 transition-all">
                          <span className="text-[10px] font-black text-amber-700 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-100 shrink-0 font-mono mt-1">
                            {formattedHour}
                          </span>
                          <div className="flex-1 min-w-0">
                            {slotTasks.length === 0 ? (
                              <span className="text-[11px] text-slate-300 font-medium italic block py-1">Disponible</span>
                            ) : (
                              <div className="divide-y divide-slate-50">
                                {slotTasks.map(task => (
                                  <AgendaListItem
                                    key={task.id}
                                    task={task}
                                    onToggle={() => toggleTask(task)}
                                    onDelete={() => deleteTask(task.id)}
                                    formatDate={formatDateTime}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Columna Tarde: 15:00 a 20:00 */}
                <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-100/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-2">
                      <Sunset size={15} className="text-indigo-500" />
                      Tarde (15:00 - 20:00)
                    </h4>
                    <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                      {afternoonTaskCount} {afternoonTaskCount === 1 ? 'tarea' : 'tareas'}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {[15, 16, 17, 18, 19, 20].map(h => {
                      const slotTasks = getTasksForHour(h, 'afternoon');
                      const formattedHour = `${h.toString().padStart(2, '0')}:00`;
                      return (
                        <div key={h} className="group flex items-start gap-2.5 p-2 bg-white rounded-xl border border-slate-100 shadow-2xs hover:border-indigo-200 transition-all">
                          <span className="text-[10px] font-black text-indigo-700 bg-indigo-50/80 px-2 py-1 rounded-lg border border-indigo-100 shrink-0 font-mono mt-1">
                            {formattedHour}
                          </span>
                          <div className="flex-1 min-w-0">
                            {slotTasks.length === 0 ? (
                              <span className="text-[11px] text-slate-300 font-medium italic block py-1">Disponible</span>
                            ) : (
                              <div className="divide-y divide-slate-50">
                                {slotTasks.map(task => (
                                  <AgendaListItem
                                    key={task.id}
                                    task={task}
                                    onToggle={() => toggleTask(task)}
                                    onDelete={() => deleteTask(task.id)}
                                    formatDate={formatDateTime}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : activeTab === 'semana' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 py-3">
                {weekDays.map((day) => {
                  const dayTasks = getTasksForDay(day.startTime, day.endTime);
                  return (
                    <div 
                      key={day.name} 
                      className={`rounded-2xl p-3.5 border space-y-3 transition-all ${
                        day.isToday 
                          ? 'bg-altavik-50/40 border-altavik-200 shadow-xs' 
                          : 'bg-slate-50/70 border-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-xs font-black uppercase tracking-wider ${day.isToday ? 'text-altavik-700' : 'text-slate-700'}`}>
                            {day.name}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-400 capitalize">
                            {day.dateFormatted}
                          </span>
                          {day.isToday && (
                            <span className="text-[9px] font-black uppercase tracking-widest bg-altavik-600 text-white px-2 py-0.5 rounded-md">
                              Hoy
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                          dayTasks.length > 0 
                            ? 'text-altavik-700 bg-altavik-50 border-altavik-200' 
                            : 'text-slate-400 bg-white border-slate-200'
                        }`}>
                          {dayTasks.length} {dayTasks.length === 1 ? 'tarea' : 'tareas'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {dayTasks.length === 0 ? (
                          <div className="p-3 text-center rounded-xl bg-white/60 border border-dashed border-slate-200/80">
                            <span className="text-[11px] text-slate-300 font-medium italic">Sin tareas agendadas</span>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-100/80 p-2 shadow-2xs">
                            {dayTasks.map(task => (
                              <AgendaListItem
                                key={task.id}
                                task={task}
                                onToggle={() => toggleTask(task)}
                                onDelete={() => deleteTask(task.id)}
                                formatDate={formatDateTime}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                title={
                  activeTab === 'caducadas' 
                    ? "¡Al día!" 
                    : activeTab === 'hoy' 
                    ? "Sin tareas para hoy" 
                    : "Semana despejada"
                } 
                subtitle={
                  activeTab === 'caducadas' 
                    ? "No hay tareas caducadas pendientes." 
                    : activeTab === 'hoy' 
                    ? "No tienes tareas programadas para el día de hoy." 
                    : "No tienes tareas programadas para esta semana."
                } 
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
              <button type="button" onClick={() => navigate('/leads')} className="text-[10px] font-bold text-green-700 hover:text-green-800 bg-white hover:bg-green-50 px-3 py-1.5 rounded-lg border border-green-200/60 shadow-sm transition-all">
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