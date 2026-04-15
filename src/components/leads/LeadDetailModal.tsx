// src/components/leads/LeadDetailModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Mail, Phone, Save, Trash2, Loader2, Send,
  Clock, Compass, MessageCircle, Calendar as CalendarIcon,
  CheckCircle2, Circle, Plus, Pencil, RotateCcw, ShoppingCart, Smartphone,
  ChevronDown, ChevronUp, Globe, Users, FileText, Share, Bell, MessageSquareQuote,
  Heart, HelpCircle, XCircle, StickyNote, Check, Home
} from 'lucide-react';
import FeedbackEmailModal from './FeedbackEmailModal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import EmailComposerModal from './EmailComposerModal';
import { useDocuments } from '../../hooks/useDocuments';
import SaleTab from './SaleTab';
import LeadTimeline from './LeadTimeline';
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
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [emailModalMethod, setEmailModalMethod] = useState<'email' | 'whatsapp'>('email');
  const [activeTab, setActiveTab] = useState<'ficha' | 'venta' | 'historial'>('ficha');
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
    created_at_date: lead.created_at ? new Date(lead.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    statusOriginal: lead.status || 'new'
  });

  const logEvent = async (type: string, description: string, metadata = {}) => {
    try {
      await supabase.from('lead_history').insert([{
        lead_id: lead.id,
        user_id: session?.user.id,
        event_type: type,
        description,
        metadata
      }]);
    } catch (err) {
      console.error('Error logging event:', err);
    }
  };

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

    if (!taskTitle || !session?.user.id) {
       if (!taskTitle) await showAlert({ title: 'Atención', message: 'Debes añadir una descripción a la acción.' });
       return;
    }

    setLoading(true);
    try {
      // Parse dates safely
      let finalDate;
      try {
        const dateTimeString = `${taskDate}T${taskTime}:00`;
        const d = new Date(dateTimeString);
        if (isNaN(d.getTime())) throw new Error("Fecha inválida");
        finalDate = d.toISOString();
      } catch (e) {
        // Fallback to today same time if parsing fails
        const now = new Date();
        finalDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0).toISOString();
      }

      const taskData = {
        title: taskTitle,
        type: taskType,
        due_date: finalDate,
        lead_id: lead.id,
        user_id: session.user.id,
        completed: isCompleted,
        comentario: newTask.comentario || null
      };

      if (editingTaskId) {
        const { error } = await (supabase as any)
          .from('agenda')
          .update({
            title: taskData.title,
            type: taskData.type,
            due_date: finalDate,
            comentario: taskData.comentario,
            completed: taskData.completed
          })
          .eq('id', editingTaskId);
        
        if (error) throw error;
        setEditingTaskId(null);
      } else {
        const { error } = await (supabase as any).from('agenda').insert([taskData]);
        if (error) throw error;

        // Abrir Google Calendar solo para nuevas tareas
        const parsedDate = new Date(finalDate);
        const endParsedDate = new Date(parsedDate.getTime() + 60 * 60 * 1000);
        const formatGoogleDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');

        const googleCalUrl = new URL('https://calendar.google.com/calendar/render');
        googleCalUrl.searchParams.append('action', 'TEMPLATE');
        googleCalUrl.searchParams.append('text', `[${taskData.type}] ${taskData.title}`);
        googleCalUrl.searchParams.append('details', `Tarea añadida desde Altavik CRM.\nCliente vinculado: ${lead.name}`);
        googleCalUrl.searchParams.append('dates', `${formatGoogleDate(parsedDate)}/${formatGoogleDate(endParsedDate)}`);

        // Usamos un pequeño delay para evitar bloqueos agresivos de popups
        setTimeout(() => {
          try {
            window.open(googleCalUrl.toString(), '_blank');
          } catch (e) {
            console.warn("Popup de Google Calendar bloqueado");
          }
        }, 100);
      }

      setNewTask({ 
        type: 'Llamada', 
        title: '', 
        date: new Date().toISOString().slice(0, 10), 
        time: (new Date().getHours() + 1).toString().padStart(2, '0') + ':00',
        comentario: '' 
      });
      
      await fetchTasks();
      if (onUpdate) await onUpdate(); // Notificar al padre para que refresque si es necesario

    } catch (error) {
      console.error("Error guardando tarea:", error);
      await showAlert({ title: 'Error', message: 'Error al guardar la acción en la agenda.' });
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

  const handleUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const { created_at_date, statusOriginal, ...restData } = formData;
    const finalData = {
      ...restData,
      created_at: new Date(`${created_at_date}T12:00:00Z`).toISOString()
    };

    // Si el estado ha cambiado, lo registramos en el historial
    if (formData.status !== statusOriginal) {
      const oldLabel = STATUS_CONFIG[statusOriginal]?.label || statusOriginal;
      const newLabel = STATUS_CONFIG[formData.status]?.label || formData.status;
      await logEvent('status_change', `Estado actualizado: de "${oldLabel}" a "${newLabel}"`);
    }

    try {
      // Si el usuario escribió una descripción en el campo de "Acción/Memo" pero no le dio a "Añadir",
      // intentamos guardarlo automáticamente antes de cerrar.
      if (newTask.title && !editingTaskId) {
        await saveTask();
      }

      setLoading(true);
      updateMutation.mutate({ id: lead.id, updates: finalData }, {
        onSuccess: () => {
          onUpdate();
          onClose();
          setLoading(false);
        },
        onError: async (err: any) => {
          setLoading(false);
          console.error("Error actualizando lead:", err);
          await showAlert({ 
            title: 'Error al Guardar', 
            message: err.message || 'No se pudieron guardar los cambios. Por favor, revisa los datos e inténtalo de nuevo.' 
          });
        }
      });
    } catch (error) {
      setLoading(false);
    }
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
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
        <div className="bg-[#f8fafc] w-full max-w-6xl rounded-none sm:rounded-2xl shadow-2xl overflow-hidden h-full sm:max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">
          
          {/* HEADER PREMIUM */}
          <div className="px-5 sm:px-8 py-3 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg shrink-0 font-bold text-sm tracking-tight border-2 border-slate-800">
                {formData.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-[#1e293b] leading-tight tracking-tight truncate">{formData.name}</h2>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusCfg.pill}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} animate-pulse`} />
                    {statusCfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Ficha del Cliente</span>
                  <div className="flex items-center gap-1.5 ml-1">
                    <button 
                      onClick={() => {
                        setEmailModalMethod('whatsapp');
                        setIsEmailModalOpen(true);
                      }} 
                      className="p-1 px-1.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 hover:bg-emerald-100 transition-colors"
                      title="Enviar por WhatsApp"
                    >
                      <MessageCircle size={10} strokeWidth={3} />
                    </button>
                    <button 
                      onClick={() => {
                        setEmailModalMethod('email');
                        setIsEmailModalOpen(true);
                      }} 
                      className="p-1 px-1.5 bg-blue-600 text-white rounded shadow-sm hover:bg-blue-700 transition-colors"
                      title="Enviar por Email"
                    >
                      <Mail size={10} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 absolute sm:static top-3 right-3">
              <button 
                onClick={onClose} 
                className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600 hover:rotate-90 duration-300"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div className="flex items-center px-4 sm:px-8 py-2 bg-slate-50 border-b border-slate-100 gap-2 overflow-x-auto overflow-y-hidden custom-scrollbar-hide">
            <button
              onClick={() => setActiveTab('ficha')}
              className={`flex items-center gap-2.5 px-6 py-2.5 text-[11px] font-bold tracking-widest relative transition-all rounded-xl ${
                activeTab === 'ficha' 
                  ? 'text-blue-600 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] ring-1 ring-slate-200/50' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText size={14} />
              FICHA Y AGENDA
              {activeTab === 'ficha' && <div className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-t-full" />}
            </button>
            <button
              onClick={() => setActiveTab('venta')}
              disabled={formData.status !== 'closed'}
              title={formData.status !== 'closed' ? 'Solo disponible cuando el estado es Venta Cerrada' : ''}
              className={`flex items-center gap-2.5 px-6 py-2.5 text-[11px] font-bold tracking-widest relative transition-all rounded-xl ${
                formData.status !== 'closed'
                  ? 'opacity-50 cursor-not-allowed text-slate-300'
                  : activeTab === 'venta' 
                    ? 'text-altavik-600 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] ring-1 ring-slate-200/50' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShoppingCart size={14} />
              GESTIÓN DE COMPRA
              {lead.sale_status === 'reserva' && (
                <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[8px] font-black uppercase">Reserva</span>
              )}
              {activeTab === 'venta' && <div className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-8 h-1 bg-altavik-600 rounded-t-full" />}
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`flex items-center gap-2.5 px-6 py-2.5 text-[11px] font-bold tracking-widest relative transition-all rounded-xl ${
                activeTab === 'historial' 
                  ? 'text-indigo-600 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] ring-1 ring-slate-200/50' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock size={14} />
              HISTORIAL
              {activeTab === 'historial' && <div className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-8 h-1 bg-indigo-600 rounded-t-full" />}
            </button>
          </div>

          {/* CONTENIDO PRINCIPAL */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar-hide bg-[#f8fafc]">
            {activeTab === 'ficha' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  
                  {/* DATOS DEL LEAD */}
                  <section className="lg:col-start-1 lg:col-end-8 lg:row-start-1 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
                    <h3 className="text-xs font-bold text-[#1e293b] flex items-center gap-2.5 mb-3 text-slate-500 uppercase tracking-widest">
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl"><FileText size={16} /></div> DATOS DEL CLIENTE
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-3">
                      <div className="space-y-1 group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors group-focus-within:text-blue-500">Nombre Completo</label>
                        <input name="name" value={formData.name} onChange={handleChange} className="w-full text-[15px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all shadow-sm" />
                      </div>
                      <div className="space-y-1 group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors group-focus-within:text-blue-500">Teléfono</label>
                        <div className="relative w-full group/phone">
                          <input 
                            name="phone" 
                            value={formData.phone} 
                            onChange={handleChange} 
                            placeholder="600 000 000"
                            className="w-full text-[15px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-12 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all shadow-sm" 
                          />
                          {formData.phone && (
                            <a 
                              href={whatsappUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-sm active:scale-95"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle size={16} strokeWidth={3} />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors group-focus-within:text-blue-500">Correo Electrónico</label>
                        <input name="email" value={formData.email} onChange={handleChange} className="w-full text-[15px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all shadow-sm" />
                      </div>
                      <div className="space-y-1 group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors group-focus-within:text-blue-500">Origen del Lead</label>
                        <CustomSelect
                          value={formData.source}
                          onChange={(val) => setFormData({ ...formData, source: val })}
                          options={SOURCE_CONFIG}
                          className="w-full font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha de Alta</label>
                        <input type="date" name="created_at_date" value={formData.created_at_date} onChange={handleChange} className="w-full text-[15px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all shadow-sm" />
                      </div>
                      <div className="space-y-1 group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors group-focus-within:text-blue-500">Estado Actual</label>
                        <CustomSelect
                          value={formData.status}
                          onChange={(val) => setFormData({ ...formData, status: val as any })}
                          className="w-full font-bold"
                          options={Object.entries(STATUS_CONFIG).map(([id, cfg]) => ({
                            id,
                            label: cfg.label,
                            dotColor: cfg.dot
                          }))}
                        />
                      </div>
                      {/* MARKETING INTEGRADO */}
                      <div className="sm:col-span-2 pt-2 border-t border-slate-50 mt-2">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Bell size={14} /></div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Suscrito a Comunicaciones</span>
                          </div>
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
                    </div>
                  </section>


                  {/* FEEDBACK & OPINIÓN */}
                  {(['visiting', 'proposal', 'negotiation', 'closed'].includes(formData.status) || sentHistory.length > 0 || tasks.some(t => t.type === 'Visita' && t.completed) || lead.feedback_rating) && (
                    <section className={`lg:col-start-1 lg:col-end-8 lg:row-start-2 rounded-2xl p-6 border shadow-sm transition-all hover:shadow-md animate-in slide-in-from-bottom-2 duration-300 flex flex-col justify-center ${
                      lead.feedback_rating === 'positive' ? 'bg-emerald-50 border-emerald-100' :
                      lead.feedback_rating === 'neutral' ? 'bg-amber-50 border-amber-100' :
                      lead.feedback_rating === 'negative' ? 'bg-slate-50 border-slate-200' :
                      'bg-gradient-to-br from-altavik-50 to-emerald-50 border-altavik-100'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl shadow-sm border ${
                            lead.feedback_rating === 'positive' ? 'bg-white text-pink-500 border-pink-100' :
                            lead.feedback_rating === 'neutral' ? 'bg-white text-amber-500 border-amber-100' :
                            lead.feedback_rating === 'negative' ? 'bg-white text-slate-400 border-slate-200' :
                            'bg-white text-altavik-600 border-altavik-100'
                          }`}>
                            {lead.feedback_rating === 'positive' ? <Heart size={20} /> :
                             lead.feedback_rating === 'neutral' ? <HelpCircle size={20} /> :
                             lead.feedback_rating === 'negative' ? <XCircle size={20} /> :
                             <MessageSquareQuote size={20} />}
                          </div>
                          <div>
                            <h3 className={`text-xs font-black uppercase tracking-widest ${
                              lead.feedback_rating === 'positive' ? 'text-emerald-800' :
                              lead.feedback_rating === 'neutral' ? 'text-amber-800' :
                              lead.feedback_rating === 'negative' ? 'text-slate-700' :
                              'text-altavik-800'
                            }`}>
                              {lead.feedback_rating === 'positive' ? '¡Opinión Muy Positiva!' :
                               lead.feedback_rating === 'neutral' ? 'Tiene algunas dudas' :
                               lead.feedback_rating === 'negative' ? 'No es lo que buscaba' :
                               'Encuesta de Opinión'}
                            </h3>
                            <p className={`text-[10px] font-bold uppercase tracking-tight mt-0.5 ${
                              lead.feedback_rating ? 'text-slate-500' : 'text-altavik-600/70'
                            }`}>
                              {lead.feedback_rating 
                                ? `Recibida el ${new Date(lead.feedback_responded_at!).toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}` 
                                : lead.feedback_sent 
                                  ? `Enviada el ${new Date(lead.feedback_sent_at!).toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}` 
                                  : 'Disponible para enviar'}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setIsFeedbackModalOpen(true)}
                          className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto ${
                            lead.feedback_rating
                            ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            : lead.feedback_sent 
                              ? 'bg-white text-altavik-600 border border-altavik-200 hover:bg-altavik-50' 
                              : 'bg-altavik-600 text-white hover:bg-altavik-700 shadow-altavik-200'
                          }`}
                        >
                          <Send size={12} />
                          {lead.feedback_rating ? 'Enviar de nuevo' : lead.feedback_sent ? 'Reenviar Encuesta' : 'Enviar Encuesta VIP'}
                        </button>
                      </div>
                    </section>
                  )}
                  {/* AGENDA DE ACCIONES */}
                  <section className="lg:col-start-8 lg:col-end-13 lg:row-start-1 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
                    <h3 className="text-xs font-bold text-[#1e293b] flex items-center gap-2.5 mb-3 text-slate-500 uppercase tracking-widest">
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl"><CalendarIcon size={16} /></div> AGENDA DE ACCIONES
                    </h3>

                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          {editingTaskId ? <Pencil size={12} className="text-amber-500" /> : <Plus size={12} className="text-blue-500" />}
                          {editingTaskId ? 'Editar Acción' : 'Nueva Acción en Agenda'}
                        </h4>
                        {editingTaskId && (
                          <button onClick={() => { setEditingTaskId(null); setNewTask({ ...newTask, title: '', comentario: '' }); }} className="text-[10px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1">
                            <X size={12} /> Cancelar edición
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo</label>
                            <CustomSelect
                              value={newTask.type}
                              onChange={(val) => setNewTask({ ...newTask, type: val as any })}
                              className="w-full font-bold"
                              options={[
                                { id: 'Llamada', label: 'Llamada', icon: Phone, color: 'text-blue-600' },
                                { id: 'WhatsApp', label: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-600' },
                                { id: 'Visita', label: 'Visita', icon: Home, color: 'text-purple-600' },
                                { id: 'Email', label: 'Email', icon: Mail, color: 'text-amber-600' },
                              ]}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hora</label>
                              <input
                                type="time"
                                value={newTask.time}
                                onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2.5 text-[13px] font-bold text-slate-700 shadow-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</label>
                              <input
                                type="date"
                                value={newTask.date}
                                onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2.5 text-[13px] font-bold text-slate-700 shadow-sm"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5 group">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-focus-within:text-blue-500">Descripción</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder={editingTaskId ? "Modificar descripción..." : "Ej: Llamar para confirmar visita"}
                              value={newTask.title}
                              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 shadow-sm outline-none transition-all"
                            />
                            <button
                              onClick={() => saveTask()}
                              disabled={loading || !newTask.title}
                              className={`px-6 rounded-xl flex items-center justify-center gap-2 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale ${
                                editingTaskId ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : 'bg-altavik-600 hover:bg-altavik-700 shadow-altavik-200'
                              }`}
                            >
                              {loading ? <Loader2 size={16} className="animate-spin" /> : editingTaskId ? <Save size={16} /> : <Plus size={16} />}
                              {editingTaskId ? 'Guardar' : 'Añadir'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* LISTADO DE ACCIONES PENDIENTES */}
                    {tasks.filter(t => !t.completed).length > 0 && (
                      <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Clock size={10} /> Acciones Programadas ({tasks.filter(t => !t.completed).length})
                        </p>
                        {tasks.filter(t => !t.completed).map(task => (
                          <div key={task.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-blue-200 transition-all group">
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => toggleTaskStatus(task)}
                                className="w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center text-transparent hover:border-emerald-500 hover:text-emerald-500 transition-all"
                              >
                                <Check size={12} strokeWidth={3} />
                              </button>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                    task.type === 'Llamada' ? 'bg-blue-50 text-blue-600' :
                                    task.type === 'WhatsApp' ? 'bg-emerald-50 text-emerald-600' :
                                    'bg-slate-50 text-slate-500'
                                  }`}>
                                    {task.type}
                                  </span>
                                  <h5 className="text-[12px] font-bold text-slate-700">{task.title}</h5>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  {new Date(task.due_date).toLocaleDateString('es-ES')} a las {new Date(task.due_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEditingTask(task)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Pencil size={14} /></button>
                              <button onClick={() => deleteTask(task.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* NOTAS INTERNAS */}
                  <section className="lg:col-span-12 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm transition-all hover:shadow-md flex flex-col">
                    <h3 className="text-xs font-bold text-[#1e293b] flex items-center gap-2.5 mb-2 text-slate-500 uppercase tracking-widest">
                      <div className="p-1.5 bg-slate-50 text-slate-600 rounded-xl"><StickyNote size={16} /></div> NOTAS Y OBSERVACIONES
                    </h3>
                    <textarea 
                      name="notes" 
                      value={formData.notes} 
                      onChange={handleChange}
                      placeholder="Anota aquí detalles, preferencias o recordatorios rápidos sobre el cliente..." 
                      className="w-full h-full p-4 bg-slate-50 rounded-2xl border border-slate-200 text-[14px] font-medium text-slate-600 italic focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all resize-none shadow-sm leading-relaxed flex-1 min-h-[100px]"
                    />
                  </section>
              </div>
            )}
            {activeTab === 'venta' && (
              <div className="animate-in fade-in duration-300">
                <SaleTab 
                  lead={lead} 
                  onLeadUpdate={handleLeadUpdate} 
                />
              </div>
            )}

            {activeTab === 'historial' && (
              <div className="max-w-4xl mx-auto py-4">
                <LeadTimeline leadId={lead.id} />
              </div>
            )}
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
          initialMethod={emailModalMethod}
        />
      )}

      {isFeedbackModalOpen && (
        <FeedbackEmailModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          lead={lead}
          onSuccess={() => onUpdate()}
        />
      )}
    </>
  );
}