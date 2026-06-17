// src/components/leads/LeadDetailModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Mail, Phone, Save, Trash2, Loader2, Send,
  Clock, Compass, MessageCircle, Calendar as CalendarIcon,
  CheckCircle2, Circle, Plus, Pencil, RotateCcw, ShoppingCart, Smartphone,
  ChevronDown, ChevronUp, Globe, Users, FileText, Share, Bell, MessageSquareQuote,
  Heart, HelpCircle, XCircle, StickyNote, Check, Home, Zap, User, MapPin, Star
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


  closed:      { dot: 'bg-slate-400',   pill: 'bg-slate-700/50 text-slate-300 border border-slate-600/50',   label: 'Venta Cerrada', icon: ShoppingCart },
  lost:        { dot: 'bg-red-400',     pill: 'bg-red-900/40 text-red-200 border border-red-700/50',         label: 'Perdido', icon: X },
};

const SOURCE_CONFIG = [
  { id: 'Idealista', label: 'Idealista', icon: IdealistaIcon },
  { id: 'Web', label: 'Web', icon: Globe, color: 'text-blue-500' },
  { id: 'Redes Sociales', label: 'Redes Sociales', icon: Smartphone, color: 'text-purple-500' },
  { id: 'Referido', label: 'Referido', icon: Users, color: 'text-emerald-500' },
  { id: 'Valla', label: 'Valla', icon: MapPin, color: 'text-orange-500' },
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
  const [firstContactTemplateActive, setFirstContactTemplateActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'ficha' | 'venta' | 'historial'>('ficha');
  const { data: rawDocs = [] } = useDocuments();
  const availableDocs = rawDocs.filter(d => d.url).map(d => ({ name: d.name, url: d.url!, category: d.category }));
  const [sentHistory, setSentHistory] = useState<any[]>([]);
  const [waData, setWaData] = useState<any | null>(null);

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
    statusOriginal: lead.status || 'new',
    interest_bedrooms: lead.interest_bedrooms || [],
    interest_floor: lead.interest_floor || [],
    client_quality_rating: lead.client_quality_rating || 0
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
    fetchWaData();
  }, [lead.id]);

  async function fetchHistory() {
    const { data } = await supabase.from('sent_documents').select('*').eq('lead_id', lead.id).order('sent_at', { ascending: false });
    if (data) setSentHistory(data);
  }

  async function fetchWaData() {
    const { data } = await (supabase as any)
      .from('lead_history')
      .select('metadata, created_at')
      .eq('lead_id', lead.id)
      .eq('event_type', 'contact')
      .order('created_at', { ascending: false })
      .limit(10);
    if (!data) return;
    const waEntry = data.find((r: any) => r.metadata?.source === 'whatsapp_webhook');
    if (waEntry) setWaData({ ...waEntry.metadata?.extracted, created_at: waEntry.created_at, raw: waEntry.metadata?.raw_message });
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
      phone: restData.phone ? restData.phone.replace(/\s+/g, '') : null,
      created_at: new Date(`${created_at_date}T12:00:00Z`).toISOString(),
      client_quality_rating: restData.client_quality_rating === 0 ? null : restData.client_quality_rating
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
      title: 'Eliminar Contacto',
      message: '¿Estás seguro de que deseas eliminar este contacto y TODA su agenda asociada? Esta acción es irreversible.',
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

  const currentHour = new Date().getHours();
  const greeting = currentHour < 14 ? 'Buenos días' : 'Buenas tardes';
  const waMessage = `${greeting} ${formData.name || ''}:

Mi nombre es Juan Herrero, de inmobiliaria TERRAVALL. Le escribo porque hemos recibido su solicitud de información sobre la promoción ALTAVIK (C/ Isaac Peral 20, Arroyo de la Encomienda).

Para enviarle las opciones que mejor se ajusten a lo que busca, coménteme brevemente:

1️⃣ ¿Qué tipo de vivienda prefiere? (Bajo, planta intermedia o ático).
2️⃣ ¿Cuántos dormitorios necesita?
3️⃣ ¿Desea concertar una visita en nuestras oficinas para que le ampliemos la información con todo detalle?

Quedo a la espera de sus comentarios. ¡Muchas gracias y un saludo!`;

  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}` : '#';
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
        <div className="bg-white w-full max-w-6xl rounded-none sm:rounded-2xl shadow-2xl overflow-hidden h-full sm:h-auto sm:max-h-[96vh] flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">
          
          {/* HEADER PREMIUM */}
          <div className="px-5 sm:px-8 py-3 bg-slate-100 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg shrink-0 border-2 border-slate-800">
                <User size={20} strokeWidth={2.5} />
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
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Ficha del Contacto</span>
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
          <div className="flex items-center px-4 sm:px-8 py-1.5 bg-white border-b border-slate-100 gap-2 overflow-x-auto overflow-y-hidden custom-scrollbar-hide">
            <button
              onClick={() => setActiveTab('ficha')}
              className={`flex items-center gap-2.5 px-6 py-2 text-[11px] font-bold tracking-widest relative transition-all rounded-xl ${
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
              className={`flex items-center gap-2.5 px-6 py-2 text-[11px] font-bold tracking-widest relative transition-all rounded-xl ${
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
              className={`flex items-center gap-2.5 px-6 py-2 text-[11px] font-bold tracking-widest relative transition-all rounded-xl ${
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
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar-hide bg-white">
            {activeTab === 'ficha' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
                  
                  {/* COLUMNA IZQUIERDA */}
                  <div className="lg:col-start-1 lg:col-end-8 lg:row-start-1 lg:row-span-2 flex flex-col gap-3">
                    {/* DATOS DEL LEAD */}
                    <section className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
                      <h3 className="text-xs font-bold text-[#1e293b] flex items-center gap-2.5 mb-2 text-slate-500 uppercase tracking-widest">
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl"><FileText size={16} /></div> DATOS DEL CONTACTO
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-1.5">
                      <div className="space-y-1 group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors group-focus-within:text-blue-500">Nombre Completo</label>
                        <input name="name" value={formData.name} onChange={handleChange} className="w-full text-[14px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all shadow-sm" />
                      </div>
                      <div className="space-y-1 group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors group-focus-within:text-blue-500">Teléfono</label>
                        <div className="relative w-full group/phone">
                          <input 
                            name="phone" 
                            value={formData.phone} 
                            onChange={handleChange} 
                            placeholder="600 000 000"
                            className="w-full text-[14px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 pr-12 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all shadow-sm" 
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
                        <input name="email" value={formData.email} onChange={handleChange} className="w-full text-[14px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all shadow-sm" />
                      </div>
                      <div className="space-y-1 group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors group-focus-within:text-blue-500">Origen del Contacto</label>
                        <CustomSelect
                          value={formData.source}
                          onChange={(val) => setFormData({ ...formData, source: val })}
                          options={SOURCE_CONFIG}
                          className="w-full font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha de Alta</label>
                        <input type="date" name="created_at_date" value={formData.created_at_date} onChange={handleChange} className="w-full text-[14px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all shadow-sm" />
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
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-50/50 rounded-xl border border-slate-100">
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

                    {/* INTERÉS Y CALIDAD */}
                    <section className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* INTERÉS */}
                        <div>
                          <h3 className="text-xs font-bold text-[#1e293b] flex items-center gap-2.5 mb-3 text-slate-500 uppercase tracking-widest">
                            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-xl"><Heart size={16} /></div> INTERÉS
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Dormitorios</label>
                              <div className="flex flex-wrap gap-2">
                                {['1', '2', '3', '4'].map(bed => {
                                  const isSelected = formData.interest_bedrooms.includes(bed);
                                  return (
                                    <button
                                      key={bed}
                                      onClick={() => {
                                        const current = formData.interest_bedrooms;
                                        setFormData({ ...formData, interest_bedrooms: isSelected ? current.filter(v => v !== bed) : [...current, bed] });
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all border ${
                                        isSelected 
                                          ? 'bg-purple-100 text-purple-700 border-purple-200 shadow-inner' 
                                          : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                                      }`}
                                    >
                                      {bed}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Altura</label>
                              <div className="flex flex-wrap gap-2">
                                {['Bajo', '1º-2º-3º', 'Atico'].map(floor => {
                                  const isSelected = formData.interest_floor.includes(floor);
                                  return (
                                    <button
                                      key={floor}
                                      onClick={() => {
                                        const current = formData.interest_floor;
                                        setFormData({ ...formData, interest_floor: isSelected ? current.filter(v => v !== floor) : [...current, floor] });
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all border ${
                                        isSelected 
                                          ? 'bg-purple-100 text-purple-700 border-purple-200 shadow-inner' 
                                          : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                                      }`}
                                    >
                                      {floor}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* CALIDAD DEL CLIENTE */}
                        <div>
                          <h3 className="text-xs font-bold text-[#1e293b] flex items-center gap-2.5 mb-3 text-slate-500 uppercase tracking-widest">
                            <div className="p-1.5 bg-amber-50 text-amber-500 rounded-xl"><Star size={16} fill="currentColor" /></div> CALIDAD DEL CLIENTE
                          </h3>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Valoración</label>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(rating => (
                                <button
                                  key={rating}
                                  onClick={() => setFormData({ ...formData, client_quality_rating: formData.client_quality_rating === rating ? 0 : rating })}
                                  className={`p-1.5 rounded-lg transition-all hover:scale-110 ${
                                    rating <= formData.client_quality_rating ? 'text-amber-400' : 'text-slate-200 hover:text-amber-200'
                                  }`}
                                >
                                  <Star size={28} fill={rating <= formData.client_quality_rating ? 'currentColor' : 'none'} strokeWidth={1.5} />
                                </button>
                              ))}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 font-medium">
                              {formData.client_quality_rating === 0 ? 'Sin valorar' : `${formData.client_quality_rating} de 5 estrellas`}
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>

                  </div>

                  {/* COLUMNA DERECHA */}
                  <div className="lg:col-start-8 lg:col-end-13 lg:row-start-1 lg:row-span-2 flex flex-col gap-4">
                    {/* ACCIONES DE CONTACTO Y FEEDBACK */}
                    <section>
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 grid grid-cols-2 lg:grid-cols-4 gap-2">
                        
                        {/* WhatsApp */}
                        <button 
                          onClick={() => { setEmailModalMethod('whatsapp'); setIsEmailModalOpen(true); }}
                          className="flex flex-col items-center justify-center gap-1 h-12 rounded-xl bg-emerald-50/50 text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition-all active:scale-[0.98] group"
                        >
                          <MessageCircle size={18} strokeWidth={2.5} />
                          <span className="text-[9px] font-bold uppercase tracking-widest">WhatsApp</span>
                        </button>

                        {/* Email */}
                        <button 
                          onClick={() => { setEmailModalMethod('email'); setIsEmailModalOpen(true); }}
                          className="flex flex-col items-center justify-center gap-1 h-12 rounded-xl bg-blue-50/50 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all active:scale-[0.98] group"
                        >
                          <Mail size={18} strokeWidth={2.5} />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Email</span>
                        </button>

                        {/* Primer Contacto */}
                        <button 
                          onClick={() => { setEmailModalMethod('whatsapp'); setFirstContactTemplateActive(true); setIsEmailModalOpen(true); }}
                          className="flex flex-col items-center justify-center gap-1 h-12 rounded-xl bg-amber-50/50 text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-100 transition-all active:scale-[0.98] group"
                        >
                          <Zap size={18} strokeWidth={2.5} />
                          <span className="text-[9px] font-bold uppercase tracking-widest">1er Contacto</span>
                        </button>

                        {/* Opinión */}
                        <button 
                          onClick={() => setIsFeedbackModalOpen(true)}
                          className={`flex flex-col items-center justify-center gap-1 h-12 rounded-xl transition-all active:scale-[0.98] border border-transparent ${
                            lead.feedback_rating
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : lead.feedback_sent 
                              ? 'bg-amber-50 text-amber-700 border-amber-100' 
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <Send size={18} strokeWidth={2.5} />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Encuesta</span>
                        </button>

                      </div>
                    </section>

                  {/* AGENDA DE ACCIONES */}
                  <section className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm transition-all hover:shadow-md flex flex-col">
                    <h3 className="text-xs font-bold text-[#1e293b] flex items-center gap-2.5 mb-2 text-slate-500 uppercase tracking-widest">
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl"><CalendarIcon size={16} /></div> AGENDA DE ACCIONES
                    </h3>

                    <div className="bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100 mt-2 relative z-10">
                      <div className="flex items-center justify-between mb-3">
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

                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-[1fr_135px_85px] gap-3">
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
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</label>
                            <input
                              type="date"
                              value={newTask.date}
                              onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[13px] font-bold text-slate-700 shadow-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hora</label>
                            <input
                              type="time"
                              value={newTask.time}
                              onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[13px] font-bold text-slate-700 shadow-sm"
                            />
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
                              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[13px] font-bold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 shadow-sm outline-none transition-all"
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
                    <section className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm transition-all hover:shadow-md flex flex-col flex-1">
                      <h3 className="text-xs font-bold text-[#1e293b] flex items-center gap-2.5 mb-2 text-slate-500 uppercase tracking-widest">
                        <div className="p-1.5 bg-slate-50 text-slate-600 rounded-xl"><StickyNote size={16} /></div> NOTAS Y OBSERVACIONES
                      </h3>
                      <textarea 
                        name="notes" 
                        value={formData.notes} 
                        onChange={handleChange}
                        placeholder="Anota aquí detalles, preferencias o recordatorios rápidos sobre el cliente..." 
                        className="w-full h-full p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[14px] font-medium text-slate-600 italic focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all resize-none shadow-sm leading-relaxed flex-1 min-h-[60px]"
                      />
                    </section>
                  </div>

                  {/* PREFERENCIAS WHATSAPP */}
                  {waData && (
                    <section className="lg:col-span-12 lg:row-start-4 bg-white rounded-2xl p-3 border border-emerald-100 shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold flex items-center gap-2.5 text-slate-500 uppercase tracking-widest">
                          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl"><MessageCircle size={16} /></div>
                          Preferencias detectadas por WhatsApp
                        </h3>
                        <a
                          href="/whatsapp"
                          className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg transition-colors"
                        >
                          Ver conversación →
                        </a>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {/* Tipo de vivienda */}
                        <div className={`p-2 rounded-xl border-2 text-center ${
                          waData.tipo_vivienda && waData.tipo_vivienda !== 'no_especificado'
                            ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'
                        }`}>
                          <div className="text-xl mb-1">
                            {waData.tipo_vivienda === 'bajo' ? '🏠' :
                             waData.tipo_vivienda === 'atico' ? '🏙️' :
                             waData.tipo_vivienda === 'planta_intermedia' ? '🏢' : '❓'}
                          </div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Tipo vivienda</p>
                          <p className="text-xs font-bold text-slate-700 capitalize">
                            {waData.tipo_vivienda === 'no_especificado' ? 'Sin especificar' :
                             waData.tipo_vivienda === 'planta_intermedia' ? 'Planta intermedia' :
                             waData.tipo_vivienda || '–'}
                          </p>
                        </div>
                        {/* Dormitorios */}
                        <div className={`p-2 rounded-xl border-2 text-center ${
                          waData.dormitorios ? 'border-blue-200 bg-blue-50' : 'border-slate-100 bg-slate-50'
                        }`}>
                          <div className="text-xl mb-1">🛏️</div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Dormitorios</p>
                          <p className="text-xs font-bold text-slate-700">
                            {waData.dormitorios ? `${waData.dormitorios} dorm.` : 'Sin especificar'}
                          </p>
                        </div>
                        {/* Visita */}
                        <div className={`p-2 rounded-xl border-2 text-center ${
                          waData.quiere_visita === true  ? 'border-purple-200 bg-purple-50' :
                          waData.quiere_visita === false ? 'border-red-100 bg-red-50' : 'border-slate-100 bg-slate-50'
                        }`}>
                          <div className="text-xl mb-1">
                            {waData.quiere_visita === true ? '✅' : waData.quiere_visita === false ? '❌' : '❓'}
                          </div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Visita</p>
                          <p className="text-xs font-bold text-slate-700">
                            {waData.quiere_visita === true ? 'Quiere visita' :
                             waData.quiere_visita === false ? 'No por ahora' : 'Sin confirmar'}
                          </p>
                        </div>
                      </div>
                      {waData.summary && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">💬 Resumen</p>
                          <p className="text-xs text-slate-600 italic">"{waData.summary}"</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(waData.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      )}
                    </section>
                  )}


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
          <div className="px-5 sm:px-8 py-3 bg-white border-t border-slate-100 flex items-center justify-end">
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
                className="px-8 py-2 bg-[#334155] text-white rounded-xl font-bold text-xs hover:bg-[#1e293b] transition-all shadow-lg active:scale-95 flex items-center gap-2"
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
          onClose={() => {
            setIsEmailModalOpen(false);
            setFirstContactTemplateActive(false);
          }}
          leadId={lead.id}
          leadName={formData.name}
          leadEmail={formData.email}
          leadPhone={formData.phone}
          availableDocs={availableDocs}
          initialMethod={emailModalMethod}
          initialTemplate={firstContactTemplateActive ? 'first_contact' : undefined}
          onSentSuccess={fetchHistory}
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