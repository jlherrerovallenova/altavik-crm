// src/components/leads/LeadDetailModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X, Mail, Phone, Save, Trash2, Loader2, Send,
  Clock, Compass, MessageCircle, Calendar as CalendarIcon,
  CheckCircle2, Circle, Plus, Pencil, RotateCcw, ShoppingCart, Smartphone,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import EmailComposerModal from './EmailComposerModal';
import { useDocuments } from '../../hooks/useDocuments';
import SaleTab from './SaleTab';
import type { Database } from '../../types/supabase';

type Lead = Database['public']['Tables']['leads']['Row'];
type AgendaItem = Database['public']['Tables']['agenda']['Row'];

// getAvatarColor removed as it's no longer used for emerald square avatars

const STATUS_CONFIG: Record<string, { dot: string; pill: string; label: string }> = {
  new:         { dot: 'bg-blue-400',    pill: 'bg-blue-900/40 text-blue-200 border border-blue-700/50',     label: 'Nuevo' },
  contacted:   { dot: 'bg-purple-400',  pill: 'bg-purple-900/40 text-purple-200 border border-purple-700/50', label: 'Contactado' },
  qualified:   { dot: 'bg-altavik-400', pill: 'bg-altavik-900/40 text-altavik-200 border border-altavik-700/50', label: 'Cualificado' },
  visiting:    { dot: 'bg-cyan-400',    pill: 'bg-cyan-900/40 text-cyan-200 border border-cyan-700/50',       label: 'Visitando' },
  closed:      { dot: 'bg-slate-400',   pill: 'bg-slate-700/50 text-slate-300 border border-slate-600/50',   label: 'Venta Cerrada' },
  lost:        { dot: 'bg-red-400',     pill: 'bg-red-900/40 text-red-200 border border-red-700/50',         label: 'Perdido' },
};

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

  // URLs rápidas
  const cleanPhone = formData.phone.replace(/\D/g, '');
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : '#';
  const mailtoUrl = formData.email ? `mailto:${formData.email}?subject=Información%20Finca%20Altavik` : '#';

  const statusCfg = STATUS_CONFIG[formData.status || 'new'] || STATUS_CONFIG['new'];

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-6xl rounded-xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">

          {/* HEADER oscuro con avatar de color */}
          <div className="px-8 py-5 bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-altavik-50 text-altavik-700 flex items-center justify-center font-bold text-xl border border-altavik-100/50 shadow-sm shrink-0">
                {formData.name.substring(0, 2).toUpperCase() || 'CL'}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-lg font-bold text-white leading-tight">{formData.name}</h2>
                  {/* Badge de estado */}
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${statusCfg.pill}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                    {statusCfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-400 font-medium">Ficha del Cliente</p>
                  <div className="flex gap-1.5">
                    {formData.phone && (
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-altavik-600 text-white rounded-lg hover:bg-altavik-500 transition-colors shadow-sm" title="WhatsApp">
                        <MessageCircle size={13} />
                      </a>
                    )}
                    {formData.email && (
                      <a href={mailtoUrl} className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-sm" title="Email">
                        <Mail size={13} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* TABS */}
          <div className="flex border-b border-slate-200 bg-white">
            <button
              onClick={() => setActiveTab('ficha')}
              className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${
                activeTab === 'ficha'
                  ? 'border-altavik-600 text-altavik-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Mail size={14} /> Ficha y Agenda
            </button>
            <button
              onClick={() => setActiveTab('venta')}
              className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${
                activeTab === 'venta'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <ShoppingCart size={14} /> Gestión de Compra
              {lead.sale_status && (
                <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full uppercase">{lead.sale_status}</span>
              )}
            </button>
          </div>

          {/* CONTENIDO PRINCIPAL */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {activeTab === 'venta' ? (
              <SaleTab lead={lead} onLeadUpdate={handleLeadUpdate} />
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">

              {/* COLUMNA IZQUIERDA: FORMULARIO */}
              <div className="space-y-4 flex flex-col h-full">
                <button
                  onClick={() => setIsEmailModalOpen(true)}
                  className="w-full py-3 px-4 bg-altavik-50 text-altavik-700 rounded-xl border border-altavik-100 font-bold flex items-center justify-center gap-2 hover:bg-altavik-100 transition-all active:scale-95 text-xs"
                >
                  <Send size={16} /> Enviar Documentación (WhatsApp / Email)
                </button>

                <form onSubmit={handleUpdate} className="space-y-3 flex-1 overflow-y-auto pr-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                    {/* Fila 1 */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                      <input name="name" value={formData.name} onChange={handleChange} className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-lg outline-none text-sm font-medium text-slate-700 border border-slate-100 focus:bg-white focus:border-altavik-500 transition-all" required />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input name="phone" value={formData.phone} onChange={handleChange} placeholder="600..." className="w-full mt-1 pl-9 pr-4 py-2.5 bg-slate-50 rounded-lg outline-none text-sm font-medium text-slate-700 border border-slate-100 focus:bg-white focus:border-altavik-500 transition-all" />
                      </div>
                    </div>

                    {/* Fila 2 */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
                      <input name="email" value={formData.email} onChange={handleChange} className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-lg outline-none text-sm font-medium text-slate-700 border border-slate-100 focus:bg-white focus:border-altavik-500 transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Origen</label>
                      <div className="relative">
                        <Compass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                          name="source"
                          value={formData.source}
                          onChange={handleChange}
                          className="w-full mt-1 pl-9 pr-4 py-2.5 bg-slate-50 rounded-lg outline-none text-sm font-medium text-slate-700 border border-slate-100 focus:bg-white focus:border-altavik-500 transition-all appearance-none cursor-pointer"
                        >
                          <option value="Idealista">Idealista</option>
                          <option value="Web">Web</option>
                          <option value="Redes Sociales">Redes Sociales</option>
                          <option value="Referido">Referido</option>
                          <option value="Otro">Otro</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                      </div>
                    </div>

                    {/* Fila 3 */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Estado</label>
                      <select name="status" value={formData.status} onChange={handleChange} className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-lg outline-none text-sm font-medium text-slate-700 border border-slate-100 focus:bg-white focus:border-altavik-500 cursor-pointer transition-all appearance-none">
                        <option value="new">Nuevo</option>
                        <option value="contacted">Contactado</option>
                        <option value="qualified">Cualificado</option>
                        <option value="visiting">Visitando</option>
                        <option value="closed">Venta Cerrada</option>
                        <option value="lost">Perdido</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Alta</label>
                      <input type="date" name="created_at_date" value={formData.created_at_date} onChange={handleChange} className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-lg outline-none text-sm font-medium text-slate-700 border border-slate-100 focus:bg-white focus:border-altavik-500 transition-all" />
                    </div>

                    {/* Fila 4: Newsletter al final a ancho completo */}
                    <div className="md:col-span-2 mt-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Newsletters</label>
                      <div className="mt-1 px-4 py-2.5 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-100 h-[42px]">
                         <span className="text-sm font-medium text-slate-700">Suscrito a Correos</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={formData.is_subscribed}
                            onChange={(e) => setFormData({ ...formData, is_subscribed: e.target.checked })}
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-altavik-500"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Notas Internas</label>
                    <textarea name="notes" rows={5} value={formData.notes} onChange={handleChange} className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-lg outline-none text-sm font-medium text-slate-700 resize-none border border-slate-100 focus:bg-white focus:border-altavik-500 transition-all" placeholder="Escribe detalles importantes..." />
                  </div>

                  {/* Historial de Documentos */}
                  <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                    <button 
                      type="button" 
                      onClick={() => setShowDocsHistory(!showDocsHistory)}
                      className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-100/50 transition-colors"
                    >
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={12} /> Documentación Enviada ({sentHistory.length})
                      </h3>
                      {showDocsHistory ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </button>
                    
                    {showDocsHistory && (
                      <div className="px-5 pb-5 space-y-2 max-h-48 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-1 duration-200">
                        {sentHistory.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">No hay envíos registrados.</p>
                        ) : (
                          sentHistory.map((item) => (
                            <div key={item.id} className="bg-white p-2.5 rounded-lg border border-slate-100 flex items-center justify-between shadow-sm">
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-xs font-bold text-slate-700 truncate" title={item.doc_name}>{item.doc_name}</span>
                                <span className="text-[9px] text-slate-400">
                                  {item.sent_at ? new Date(item.sent_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Fecha desconocida'}
                                </span>
                              </div>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0 ml-2 ${item.method === 'whatsapp' ? 'bg-altavik-100 text-altavik-600' : 'bg-blue-100 text-blue-600'}`}>
                                {item.method}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button type="button" onClick={handleDelete} className="text-red-500 font-medium text-xs flex items-center gap-1.5 px-3 py-2 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} /> Eliminar lead
                    </button>
                    <button type="submit" disabled={loading} className="px-6 py-2.5 bg-altavik-600 text-white font-semibold text-sm rounded-lg flex items-center gap-2 shadow-md hover:bg-altavik-700 transition-all active:scale-95">
                      {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Guardar cambios
                    </button>
                  </div>
                </form>
              </div>

              {/* COLUMNA DERECHA: AGENDA (CONECTADA A LA TABLA AGENDA) */}
              <div className="bg-slate-50 rounded-2xl p-6 text-slate-900 shadow-sm flex flex-col h-full border border-slate-200">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-altavik-600">
                  <CalendarIcon size={14} /> Agenda de Acciones
                </h3>

                {/* Formulario Inline Compacto */}
                <div className="grid grid-cols-1 gap-2 mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex gap-2">
                    <select
                      value={newTask.type}
                      onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}
                      className="bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium p-2.5 outline-none focus:border-altavik-500 focus:ring-2 focus:ring-altavik-500/20 text-slate-700"
                    >
                      <option value="Llamada">Llamada</option>
                      <option value="Email">Email</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Visita">Visita</option>
                      <option value="Reunión">Reunión</option>
                    </select>
                    <input
                      type="date"
                      value={newTask.date}
                      onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] p-2.5 outline-none focus:border-altavik-500 focus:ring-2 focus:ring-altavik-500/20 text-slate-700"
                    />
                    <input
                      type="time"
                      value={newTask.time}
                      onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                      className="w-20 bg-slate-50 border border-slate-200 rounded-lg text-[11px] p-2.5 outline-none focus:border-altavik-500 focus:ring-2 focus:ring-altavik-500/20 text-slate-700"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={editingTaskId ? "Editando tarea..." : "Nueva tarea pendiente..."}
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg text-xs p-2.5 outline-none focus:border-altavik-500 focus:ring-2 focus:ring-altavik-500/20 text-slate-900 placeholder-slate-400"
                    />
                    {editingTaskId && (
                      <button
                        onClick={() => {
                          setEditingTaskId(null);
                          setNewTask({ 
                            type: 'Llamada', 
                            title: '', 
                            date: new Date().toISOString().slice(0, 10), 
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                            comentario: ''
                          });
                        }}
                        className="bg-slate-100 px-3 rounded-lg hover:bg-slate-200 transition-colors text-slate-500"
                        title="Cancelar edición"
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => saveTask()}
                      className={`${editingTaskId ? 'bg-blue-600 hover:bg-blue-500' : 'bg-altavik-600 hover:bg-altavik-500'} px-4 text-white rounded-lg transition-colors shadow-sm active:scale-95`}
                    >
                      {editingTaskId ? <Save size={18} /> : <Plus size={18} />}
                    </button>
                  </div>
                </div>

                {/* Lista de Tareas */}
                <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
                  {tasks.length === 0 && (
                    <div className="text-center py-10 opacity-50">
                      <CalendarIcon size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-xs text-slate-500 italic">No hay tareas para este cliente.</p>
                    </div>
                  )}
                  {tasks.map((task) => {
                    const dateObj = new Date(task.due_date);
                    const isEditingComment = editingCommentId === task.id;
                    return (
                      <div key={task.id} className={`group rounded-lg border transition-all ${task.completed ? 'bg-slate-50 border-transparent opacity-60' : 'bg-white border-slate-200 hover:border-altavik-200 shadow-sm'}`}>
                        <div className="flex items-center justify-between p-2.5">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button onClick={() => toggleTaskStatus(task)} className={`shrink-0 transition-transform hover:scale-110 ${task.completed ? 'text-altavik-500' : 'text-slate-300 hover:text-altavik-500'}`}>
                              {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">{task.type}</span>
                                <p className={`text-sm font-bold truncate ${task.completed ? 'text-altavik-600 opacity-70' : 'text-slate-800'}`}>{task.title}</p>
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                <Clock size={10} /> {dateObj.toLocaleDateString()} • {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                            {task.type === 'Visita' && formData.phone && (
                              <button
                                onClick={() => {
                                  const now = new Date();
                                  const hour = now.getHours();
                                  const greeting = hour < 14 ? 'Buenos días' : 'Buenas tardes';
                                  const taskDate = new Date(task.due_date);
                                  const day = taskDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                  const time = taskDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                                  
                                  const text = `${greeting}, ${formData.name}.\n\nRecordatorio de la cita:\n*Día:* ${day}\n*Hora:* ${time}\n*Lugar:* Terravall. Plaza Mayor 8 1ºA.`;
                                  
                                  const cleanPhone = formData.phone.replace(/\D/g, '');
                                  const finalPhone = cleanPhone.startsWith('34') ? cleanPhone : `34${cleanPhone}`;
                                  
                                  window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                className="p-1.5 hover:bg-slate-100 rounded text-green-600 transition-colors"
                                title="Enviar recordatorio por WhatsApp"
                              >
                                <Smartphone size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingCommentId(isEditingComment ? null : task.id);
                                setCommentDraft(task.comentario || '');
                              }}
                              className={`p-1.5 rounded transition-colors text-xs font-bold ${ isEditingComment ? 'bg-altavik-100 text-altavik-600' : 'hover:bg-slate-100 text-slate-400 hover:text-altavik-600'}`}
                              title="Añadir comentario"
                            >
                              💬
                            </button>
                            <button
                              onClick={() => startEditingTask(task)}
                              className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600 transition-colors"
                              title="Borrar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Botones ATENDIDA / NO ATENDIDA — solo Llamadas pendientes */}
                        {task.type === 'Llamada' && !task.completed && (
                          <div className="px-2.5 pb-2 flex gap-1.5">
                            <button
                              onClick={() => handleCallResult(task, true)}
                              className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-md text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors active:scale-95"
                            >
                              ✅ Atendida
                            </button>
                            <button
                              onClick={() => handleCallResult(task, false)}
                              className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors active:scale-95"
                            >
                              ❌ No atendida
                            </button>
                          </div>
                        )}

                        {/* Área de comentario */}
                        {(isEditingComment || task.comentario) && (
                          <div className="px-2.5 pb-2.5">
                            {isEditingComment ? (
                              <div className="flex gap-1.5 items-end">
                                <textarea
                                  autoFocus
                                  value={commentDraft}
                                  onChange={(e) => setCommentDraft(e.target.value)}
                                  placeholder="Escribe el resultado de esta acción..."
                                  rows={2}
                                  className="flex-1 bg-altavik-50/50 border border-altavik-100 rounded-lg text-[11px] p-2 outline-none focus:border-altavik-500 text-slate-700 placeholder-slate-400 resize-none"
                                />
                                <button
                                  onClick={() => saveComment(task.id)}
                                  className="p-2 bg-altavik-600 hover:bg-altavik-500 text-white rounded-lg transition-colors shrink-0 shadow-sm"
                                  title="Guardar comentario"
                                >
                                  <Save size={14} />
                                </button>
                              </div>
                            ) : (
                              <p className="text-[11px] text-altavik-700 bg-altavik-50/30 border border-altavik-100/50 rounded-lg px-2.5 py-1.5 italic leading-relaxed">
                                💬 {task.comentario}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
            )}
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