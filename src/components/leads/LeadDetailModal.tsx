// src/components/leads/LeadDetailModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Mail, Phone, Save, Trash2, Loader2, Send,
  Clock, Compass, MessageCircle, Calendar as CalendarIcon,
  CheckCircle2, Circle, Plus, Pencil, RotateCcw, ShoppingCart, Smartphone,
  ChevronDown, ChevronUp, Globe, Users, FileText, Share, Bell
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import EmailComposerModal from './EmailComposerModal';
import { useDocuments } from '../../hooks/useDocuments';
import SaleTab from './SaleTab';
import { CustomSelect, IdealistaIcon } from '../Shared';
import type { Database } from '../../types/supabase';

type Lead = Database['public']['Tables']['leads']['Row'];
type AgendaItem = Database['public']['Tables']['agenda']['Row'];

// getAvatarColor removed as it's no longer used for emerald square avatars

const STATUS_CONFIG: Record<string, { dot: string; pill: string; label: string; icon: any }> = {
  new:         { dot: 'bg-blue-400',    pill: 'bg-blue-900/40 text-blue-200 border border-blue-700/50',     label: 'Nuevo', icon: Circle },
  contacted:   { dot: 'bg-purple-400',  pill: 'bg-purple-900/40 text-purple-200 border border-purple-700/50', label: 'Contactado', icon: MessageCircle },
  qualified:   { dot: 'bg-altavik-400', pill: 'bg-altavik-900/40 text-altavik-200 border border-altavik-700/50', label: 'Cualificado', icon: CheckCircle2 },
  visiting:    { dot: 'bg-cyan-400',    pill: 'bg-cyan-900/40 text-cyan-200 border border-cyan-700/50',       label: 'Visitando', icon: Compass },
  proposal:    { dot: 'bg-orange-400',  pill: 'bg-orange-900/40 text-orange-200 border border-orange-700/50', label: 'Propuesta', icon: Smartphone },
  negotiation: { dot: 'bg-amber-400',   pill: 'bg-amber-900/40 text-amber-200 border border-amber-700/50',   label: 'Negociación', icon: RotateCcw },
  closed:      { dot: 'bg-slate-400',   pill: 'bg-slate-700/50 text-slate-300 border border-slate-600/50',   label: 'Venta Cerrada', icon: ShoppingCart },
  lost:        { dot: 'bg-red-400',     pill: 'bg-red-900/40 text-red-200 border border-red-700/50',         label: 'Perdido', icon: X },
};

const SOURCE_CONFIG = [
  { id: 'Idealista', label: 'Idealista', icon: IdealistaIcon, color: 'text-[#deff30]' },
  { id: 'Web', label: 'Web', icon: Globe, color: 'text-blue-500' },
  { id: 'Redes Sociales', label: 'Redes Sociales', icon: Smartphone, color: 'text-purple-500' },
  { id: 'Referido', label: 'Referido', icon: Users, color: 'text-emerald-500' },
  { id: 'Otro', label: 'Otro', icon: Plus, color: 'text-slate-500' },
];

interface Props {
  lead: Lead;
  onClose: () => void;
  onUpdate: (deleted?: boolean) => void;
}

import { useUpdateLead, useDeleteLead } from '../../hooks/useLeads';

export default function LeadDetailModal({ lead, onClose, onUpdate }: Props) {
  const { session } = useAuth();
  const { showAlert, showConfirm } = useDialog();
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ficha' | 'venta'>('ficha');
  const { data: rawDocs = [] } = useDocuments();
  const availableDocs = rawDocs.filter(d => d.url).map(d => ({ name: d.name, url: d.url!, category: d.category }));
  const [sentHistory, setSentHistory] = useState<any[]>([]);

  // Mutations
  const updateMutation = useUpdateLead();
  const deleteMutation = useDeleteLead();
  const [loading, setLoading] = useState(false); // Mantener para el estado local de guardado de tareas o procesos largos

  // Tareas de la agenda
  const [tasks, setTasks] = useState<AgendaItem[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  // Estado local para el formulario de nueva tarea
  const [newTask, setNewTask] = useState({
    type: 'Llamada',
    title: '',
    date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    comentario: ''
  });
  // Edición inline del comentario de una tarea existente
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState('');

  const [showDocsHistory, setShowDocsHistory] = useState(false);
  const [formData, setFormData] = useState({
    name: lead.name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    status: lead.status || 'new',
    source: lead.source || 'Web',
    notes: lead.notes || '',
    is_subscribed: lead.is_subscribed ?? true,
    created_at_date: lead.created_at ? new Date(lead.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  });

  useEffect(() => {
    fetchHistory();
    fetchTasks();
  }, [lead.id]);

  async function fetchHistory() {
    const { data } = await supabase.from('sent_documents').select('*').eq('lead_id', lead.id).order('sent_at', { ascending: false });
    if (data) setSentHistory(data);
  }

  // Cargar tareas de la tabla agenda filtrando por ID del cliente
  async function fetchTasks() {
    const { data } = await supabase
      .from('agenda')
      .select('*')
      .eq('lead_id', lead.id)
      .order('due_date', { ascending: true });

    if (data) setTasks(data);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const saveComment = async (taskId: number) => {
    const { error } = await (supabase as any)
      .from('agenda')
      .update({ comentario: commentDraft || null })
      .eq('id', taskId);
    if (!error) {
      setEditingCommentId(null);
      fetchTasks();
    }
  };

  const saveTask = async (overrides?: any) => {
    const taskTitle = overrides?.title || newTask.title;
    const taskType = overrides?.type || newTask.type;
    const taskDate = overrides?.date || newTask.date;
    const taskTime = overrides?.time || newTask.time;
    const isCompleted = overrides?.completed !== undefined ? overrides.completed : false;

    if (!taskTitle || !session?.user.id) return;

    // Combinar fecha y hora para crear un ISO String
    const dateTimeString = `${taskDate}T${taskTime}:00`;
    const finalDate = new Date(dateTimeString).toISOString();

    const taskData = {
      title: taskTitle,
      type: taskType,
      due_date: finalDate,
      lead_id: lead.id,
      user_id: session.user.id,
      completed: isCompleted,
      comentario: newTask.comentario || null
    };

    setLoading(true);
    try {
      if (editingTaskId) {
        const { error } = await (supabase as any)
          .from('agenda')
          .update({
            title: taskData.title,
            type: taskData.type,
            due_date: finalDate,
            comentario: taskData.comentario
          })
          .eq('id', editingTaskId);
        if (error) throw error;
        setEditingTaskId(null);
      } else {
        const { error } = await (supabase as any).from('agenda').insert([taskData]);
        if (error) throw error;

        // Abrir Google Calendar
        const parsedDate = new Date(finalDate);
        const endParsedDate = new Date(parsedDate.getTime() + 60 * 60 * 1000);
        const formatGoogleDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');

        const googleCalUrl = new URL('https://calendar.google.com/calendar/render');
        googleCalUrl.searchParams.append('action', 'TEMPLATE');
        googleCalUrl.searchParams.append('text', `[${taskData.type}] ${taskData.title}`);
        googleCalUrl.searchParams.append('details', `Tarea añadida desde Altavik CRM.\nCliente vinculado: ${lead.name}`);
        googleCalUrl.searchParams.append('dates', `${formatGoogleDate(parsedDate)}/${formatGoogleDate(endParsedDate)}`);

        window.open(googleCalUrl.toString(), '_blank');
      }

      setNewTask({ 
        type: 'Llamada', 
        title: '', 
        date: new Date().toISOString().slice(0, 10), 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        comentario: ''
      });
      fetchTasks();

    } catch (error) {
      console.error("Error guardando tarea:", error);
      await showAlert({ title: 'Error', message: 'Error al guardar la tarea.' });
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (id: number) => {
    const confirmed = await showConfirm({
      title: 'Eliminar Tarea',
      message: '¿Estás seguro de que deseas eliminar esta tarea?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    });
    if (!confirmed) return;
    const { error } = await supabase.from('agenda').delete().eq('id', id);
    if (!error) fetchTasks();
  };

  const startEditingTask = (task: AgendaItem) => {
    setEditingTaskId(task.id);
    const dateObj = new Date(task.due_date);
    setNewTask({
      type: task.type,
      title: task.title,
      date: dateObj.toISOString().slice(0, 10),
      time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      comentario: task.comentario || ''
    });
  };

  const toggleTaskStatus = async (task: AgendaItem) => {
    const newStatus = !task.completed;
    setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: newStatus } : t));
    await (supabase as any).from('agenda').update({ completed: newStatus }).eq('id', task.id);
  };

  /** Calcula el siguiente slot dentro del horario comercial (10-14h y 17-20h) */
  const getNextCommercialSlot = (): Date => {
    const now = new Date();
    const totalMin = now.getHours() * 60 + now.getMinutes();

    if (totalMin >= 10 * 60 && totalMin < 14 * 60 - 30) {
      return new Date(now.getTime() + 30 * 60 * 1000);
    }
    if (totalMin >= 17 * 60 && totalMin < 20 * 60 - 30) {
      return new Date(now.getTime() + 30 * 60 * 1000);
    }
    if (totalMin < 10 * 60) {
      const slot = new Date(now); slot.setHours(10, 0, 0, 0); return slot;
    }
    if (totalMin >= 14 * 60 && totalMin < 17 * 60) {
      const slot = new Date(now); slot.setHours(17, 0, 0, 0); return slot;
    }
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    if (tomorrow.getDay() === 6) tomorrow.setDate(tomorrow.getDate() + 2);
    if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  const handleCallResult = async (task: AgendaItem, attended: boolean) => {
    const comentarioText = attended ? 'Llamada atendida ✅' : 'No atendida ❌ — reintento programado';
    await (supabase as any)
      .from('agenda')
      .update({ completed: true, comentario: comentarioText })
      .eq('id', task.id);

    if (!attended && session?.user.id) {
      const nextSlot = getNextCommercialSlot();
      await (supabase as any).from('agenda').insert([{
        title: task.title,
        type: 'Llamada',
        due_date: nextSlot.toISOString(),
        lead_id: task.lead_id,
        user_id: session.user.id,
        completed: false,
        comentario: null
      }]);
    }
    fetchTasks();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { created_at_date, ...restData } = formData;
    const finalData = {
      ...restData,
      created_at: new Date(`${created_at_date}T12:00:00Z`).toISOString()
    };

    updateMutation.mutate({ id: lead.id, updates: finalData }, {
      onSuccess: () => {
        onUpdate();
        onClose();
      },
      onError: (err) => {
        console.error("Error actualizando lead:", err);
      }
    });
  };

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title: 'Eliminar Cliente',
      message: '¿Estás seguro de que deseas eliminar este cliente y TODA su agenda asociada? Esta acción es irreversible.',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar'
    });
    if (!confirmed) return;

    // Borrar tareas asociadas primero (por seguridad)
    await supabase.from('agenda').delete().eq('lead_id', lead.id);
    
    deleteMutation.mutate(lead.id, {
      onSuccess: () => {
        onUpdate(true);
        onClose();
      },
      onError: (err) => {
        console.error("Error eliminando lead:", err);
      }
    });
  };

  // Función para actualizar el lead desde SaleTab
  const handleLeadUpdate = async (updates: Partial<Lead>) => {
    updateMutation.mutate({ id: lead.id, updates }, {
      onSuccess: () => onUpdate(),
    });
  };

  const cleanPhone = formData.phone.replace(/\D/g, '');
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : '#';
  const mailtoUrl = formData.email ? `mailto:${formData.email}?subject=Información%20Finca%20Altavik` : '#';

  const statusCfg = STATUS_CONFIG[formData.status || 'new'] || STATUS_CONFIG['new'];

  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});

  const toggleDocs = (id: string) => {
    setExpandedDocs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const groupedHistory = useMemo(() => {
    const combined = [...tasks, ...sentHistory].sort((a, b) => 
      new Date(b.sent_at || b.due_date).getTime() - new Date(a.sent_at || a.due_date).getTime()
    );

    const result: any[] = [];
    let currentGroup: any = null;

    combined.forEach((item) => {
      const isDoc = !!item.method;
      if (!isDoc) {
        result.push(item);
        currentGroup = null;
        return;
      }

      const time = new Date(item.sent_at).getTime();
      const groupTime = currentGroup ? new Date(currentGroup.sent_at).getTime() : 0;

      // Group if same method and within 30 seconds
      if (currentGroup && currentGroup.method === item.method && Math.abs(time - groupTime) < 30000) {
        const names = item.doc_name?.includes('||') ? item.doc_name.split('||') : [item.doc_name];
        currentGroup.allDocs = [...currentGroup.allDocs, ...names];
      } else {
        const names = item.doc_name?.includes('||') ? item.doc_name.split('||') : [item.doc_name];
        currentGroup = { ...item, allDocs: names };
        result.push(currentGroup);
      }
    });

    return result;
  }, [tasks, sentHistory]);

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-[#f8fafc] w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">
          
          {/* HEADER PREMIUM */}
          <div className="px-8 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#e0f2fe] text-[#0369a1] flex items-center justify-center shadow-sm shrink-0">
                <Users size={24} />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-xl font-bold text-[#1e293b] leading-tight">{formData.name}</h2>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusCfg.pill}`}>
                    <span className={`w-1 h-1 rounded-full ${statusCfg.dot}`} />
                    {statusCfg.label}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">Lead ID: #{lead.id.toString().slice(-5)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsEmailModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all shadow-sm"
              >
                <Mail size={14} /> Email
              </button>
              {formData.phone && (
                <a 
                  href={whatsappUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d] rounded-xl font-bold text-xs hover:bg-[#dcfce7] transition-all shadow-sm"
                >
                  <MessageCircle size={14} /> WhatsApp
                </a>
              )}
              <button onClick={onClose} className="p-2 ml-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* CONTENIDO PRINCIPAL EN DOS COLUMNAS */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              
              {/* COLUMNA IZQUIERDA (7/12) */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* DATOS DEL LEAD */}
                <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <h3 className="text-sm font-bold text-[#1e293b] flex items-center gap-2 mb-4">
                    <div className="p-1 bg-blue-50 text-blue-600 rounded-lg"><FileText size={16} /></div> DATOS DEL LEAD
                  </h3>

                  <div className="grid grid-cols-2 gap-x-12 gap-y-3">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nombre Completo</label>
                      <input name="name" value={formData.name} onChange={handleChange} className="w-full text-base font-semibold text-slate-700 bg-transparent border-none p-0 focus:ring-0" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Teléfono</label>
                      <input name="phone" value={formData.phone} onChange={handleChange} className="w-full text-base font-semibold text-slate-700 bg-transparent border-none p-0 focus:ring-0" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Correo Electrónico</label>
                      <input name="email" value={formData.email} onChange={handleChange} className="w-full text-base font-semibold text-slate-700 bg-transparent border-none p-0 focus:ring-0" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha de Alta</label>
                      <input type="date" name="created_at_date" value={formData.created_at_date} onChange={handleChange} className="w-full text-base font-semibold text-slate-700 bg-transparent border-none p-0 focus:ring-0" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origen del Lead</label>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="px-3 py-1 bg-[#f0f9ff] text-[#0369a1] rounded-lg text-[11px] font-bold uppercase border border-[#bae6fd]">
                                {formData.source}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado Actual</label>
                      <select 
                        name="status" 
                        value={formData.status} 
                        onChange={handleChange}
                        className="w-full mt-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:bg-white transition-all outline-none"
                      >
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                          <option key={key} value={key}>{cfg.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notas Internas</label>
                    <textarea 
                      name="notes" 
                      rows={3} 
                      value={formData.notes} 
                      onChange={handleChange}
                      placeholder="Escribe detalles importantes..." 
                      className="w-full p-3 bg-[#f1f5f9] rounded-xl border-none text-sm font-medium text-slate-700 italic focus:ring-2 focus:ring-blue-100 transition-all resize-none shadow-inner"
                    />
                  </div>
                </section>

                {/* NEWSLETTERS & MARKETING */}
                <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#1e293b] flex items-center gap-2">
                      <div className="p-1 bg-indigo-50 text-indigo-600 rounded-lg"><Bell size={16} /></div> NEWSLETTERS & MARKETING
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Suscrito a Correos</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.is_subscribed}
                          onChange={(e) => setFormData({ ...formData, is_subscribed: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3b82f6]"></div>
                      </label>
                    </div>
                  </div>
                </section>
              </div>

              {/* COLUMNA DERECHA (5/12) */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* AGENDA DE ACCIONES */}
                <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <h3 className="text-sm font-bold text-[#1e293b] flex items-center gap-2 mb-4">
                    <div className="p-1 bg-blue-50 text-blue-600 rounded-lg"><CalendarIcon size={16} /></div> AGENDA DE ACCIONES
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Acción</label>
                      <select
                        value={newTask.type}
                        onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:bg-white outline-none"
                      >
                        <option value="Llamada">Llamada</option>
                        <option value="Email">Email</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Visita">Visita</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha y Hora</label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={newTask.date}
                          onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                          className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                        />
                        <input
                          type="time"
                          value={newTask.time}
                          onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                          className="w-24 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descripción Corta</label>
                      <input
                        type="text"
                        placeholder="Ej: Llamar para confirmar visita"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        className="w-full bg-slate-50 border border-white rounded-xl px-4 py-2 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white shadow-sm outline-none"
                      />
                    </div>

                    <button
                      onClick={() => saveTask()}
                      disabled={loading || !newTask.title}
                      className="w-full py-2.5 bg-[#334155] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#1e293b] transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                    >
                      <Plus size={16} /> Programar Acción
                    </button>
                  </div>
                </section>

                {/* HISTORIAL DE ACTIVIDAD */}
                <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col h-full max-h-[400px]">
                  <h3 className="text-sm font-bold text-[#1e293b] flex items-center gap-2 mb-4">
                    <div className="p-1 bg-slate-50 text-slate-600 rounded-lg"><Clock size={14} /></div> HISTORIAL DE ACTIVIDAD
                  </h3>

                  <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2 pb-2">
                    {groupedHistory.map((item: any, idx) => {
                        const isDoc = !!item.method;
                        const docNames = item.allDocs || [];
                        const isExpanded = expandedDocs[item.id] || false;

                        return (
                          <div key={idx} className={`flex gap-5 relative ${item.completed === false ? 'opacity-100' : 'opacity-70'}`}>
                            {idx !== 0 && <div className="absolute left-6 -top-8 w-px h-8 bg-slate-100" />}
                            
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm shrink-0 ${
                              item.completed === false ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-50' :
                              item.type === 'Llamada' ? 'bg-blue-50 text-blue-500' : 
                              item.method ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-50 text-slate-400'
                            }`}>
                              {item.type === 'Llamada' ? <Phone size={18} /> : 
                               item.method === 'email' ? <Mail size={18} /> : 
                               item.method === 'whatsapp' ? <MessageCircle size={18} /> : 
                               item.type === 'Visita' ? <Compass size={18} /> : 
                               item.doc_name ? <FileText size={18} /> : <Clock size={18} />}
                            </div>
                            <div className="flex-1 pt-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <h4 className="text-sm font-bold text-slate-700 truncate">
                                  {item.title || (item.method ? 'Envío de documentación' : 'Actividad')}
                                </h4>
                                <span className="text-[10px] font-bold text-slate-400 shrink-0 uppercase tracking-tighter">
                                  {new Date(item.sent_at || item.due_date).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="mt-1">
                                {isDoc && docNames.length > 0 ? (
                                  <div className="space-y-1">
                                    <button 
                                      onClick={() => toggleDocs(item.id)}
                                      className="text-xs text-blue-500 font-bold flex items-center gap-1 hover:text-blue-700 transition-colors"
                                      type="button"
                                    >
                                      {docNames.length} {docNames.length === 1 ? 'documento enviado' : 'documentos enviados'}
                                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                    
                                    {isExpanded && (
                                      <div className="pl-2 border-l-2 border-slate-100 space-y-1 py-1 animate-in slide-in-from-top-1 duration-200">
                                        {docNames.map((name: string, dIdx: number) => (
                                          <div key={dIdx} className="flex items-center gap-2 text-[11px] text-slate-500">
                                            <FileText size={10} className="text-slate-300" />
                                            <span className="truncate italic">{name}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500 line-clamp-2 italic leading-relaxed">
                                    {item.comentario || 'Sin detalles adicionales registrados.'}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    {tasks.length === 0 && sentHistory.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-10 italic">No hay actividad registrada recientemente.</p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="px-8 py-4 bg-white border-t border-slate-100 flex items-center justify-end">
            <div className="flex items-center gap-4">
              <button 
                onClick={onClose}
                className="px-6 py-2 text-slate-500 font-bold text-xs hover:text-slate-700 transition-colors"
              >
                Descartar cambios
              </button>
              <button 
                onClick={handleUpdate}
                disabled={loading}
                className="px-8 py-2.5 bg-[#334155] text-white rounded-xl font-bold text-xs hover:bg-[#1e293b] transition-all shadow-lg active:scale-95 flex items-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />} Guardar cambios
              </button>
            </div>
          </div>
        </div>
      </div>

      {isEmailModalOpen && (
        <EmailComposerModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          leadId={lead.id}
          leadName={formData.name}
          leadEmail={formData.email}
          leadPhone={formData.phone}
          availableDocs={availableDocs}
          onSentSuccess={fetchHistory}
        />
      )}
    </>
  );
}