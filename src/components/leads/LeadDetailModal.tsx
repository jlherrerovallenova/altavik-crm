// src/components/leads/LeadDetailModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { X, Mail, Phone, Save, Trash2, Loader as Loader2, Send, Clock, Compass, MessageCircle, Calendar as CalendarIcon, CircleCheck as CheckCircle2, Circle, Plus, Pencil, RotateCcw, ShoppingCart, Smartphone, ChevronDown, ChevronUp, Globe, Users, FileText, Share, Bell, MessageSquareQuote, Heart, Circle as HelpCircle, Circle as XCircle, StickyNote, Check, Hop as Home, Zap, User, MapPin, Star, Search } from 'lucide-react';
import FeedbackEmailModal from './FeedbackEmailModal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import EmailComposerModal from './EmailComposerModal';
import { useDocuments } from '../../hooks/useDocuments';
import SaleTab from './SaleTab';
import { FichaTab } from './FichaTab';
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
  { id: 'Google SEM', label: 'Google SEM', icon: Search, color: 'text-blue-600' },
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
  const [activeTab, setActiveTab] = useState<'ficha' | 'venta' | 'historial' | 'notas' | 'encuesta'>('ficha');
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
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});
  const toggleExpand = (id: number) => setExpandedTasks(prev => ({ ...prev, [id]: !prev[id] }));

  function parseTaskTitle(title: string) {
    const match = title.match(/^(Envío\s+[^:]+):\s*(.*)$/i);
    if (match) {
      const prefix = match[1];
      const docsString = match[2];
      const docs = docsString.split(',').map(d => d.trim()).filter(Boolean);
      return { isDocSend: true, prefix, docs };
    }
    return { isDocSend: false, prefix: '', docs: [] };
  }

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
      await (supabase as any).from('lead_history').insert([{
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

    // Suscribirse a cambios en tiempo real en email_tracking para este lead
    const trackingChannel = supabase
      .channel(`email_tracking_changes_${lead.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_tracking',
          filter: `lead_id=eq.${lead.id}`
        },
        () => {
          fetchTasks();
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(trackingChannel);
    };
  }, [lead.id]);

  async function fetchHistory() {
    const { data } = await (supabase as any).from('sent_documents').select('*').eq('lead_id', lead.id).order('sent_at', { ascending: false });
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
    const { data } = await (supabase as any)
      .from('agenda')
      .select('*, email_tracking(*)')
      .eq('lead_id', lead.id)
      .order('due_date', { ascending: true });

    if (data) {
      const formatted = (data as any[]).map(item => ({
        ...item,
        email_tracking: Array.isArray(item.email_tracking) ? item.email_tracking[0] : item.email_tracking
      }));
      setTasks(formatted);
    }
  }

  function renderEmailTrackingBadge(task: any) {
    if (task.type !== 'Email' || !task.email_tracking) return null;
    const tracking = task.email_tracking;
    const isOpened = tracking.status === 'opened' || tracking.opens_count > 0;
    const opensLabel = tracking.opens_count > 0 ? ` (${tracking.opens_count})` : '';
    return (
      <span 
        className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
          isOpened 
            ? 'bg-emerald-100 text-emerald-700' 
            : 'bg-slate-100 text-slate-500'
        }`}
        title={
          isOpened 
            ? `Abierto${opensLabel}. Última apertura: ${new Date(tracking.last_opened_at || tracking.first_opened_at || '').toLocaleString()}`
            : 'Recibido pero aún no abierto.'
        }
      >
        {isOpened ? 'ABIERTO' : 'ENVIADO'}
        {opensLabel}
      </span>
    );
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

  let cleanPhone = formData.phone.replace(/\D/g, '');
  if (cleanPhone.length === 9 && (cleanPhone.startsWith('6') || cleanPhone.startsWith('7'))) {
    cleanPhone = `34${cleanPhone}`;
  }

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
        <div className="bg-white w-full max-w-6xl rounded-none sm:rounded-2xl shadow-2xl overflow-hidden h-full sm:h-auto sm:max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">
          
          {/* HEADER PREMIUM */}
          <div className="shrink-0 px-5 sm:px-8 py-3 bg-slate-100 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
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
          <div className="shrink-0 flex items-center px-4 sm:px-8 py-1.5 bg-white border-b border-slate-100 gap-2 overflow-x-auto overflow-y-hidden custom-scrollbar-hide">
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
              disabled={formData.status !== 'closed' && !lead.sale_status}
              title={formData.status !== 'closed' && !lead.sale_status ? 'Solo disponible cuando el estado es Venta Cerrada o hay una reserva activa' : ''}
              className={`flex items-center gap-2.5 px-6 py-2 text-[11px] font-bold tracking-widest relative transition-all rounded-xl ${
                formData.status !== 'closed' && !lead.sale_status
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
            <button
              onClick={() => setActiveTab('notas')}
              className={`flex items-center gap-2.5 px-6 py-2 text-[11px] font-bold tracking-widest relative transition-all rounded-xl ${
                activeTab === 'notas' 
                  ? 'text-emerald-600 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] ring-1 ring-slate-200/50' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              <StickyNote size={14} />
              NOTAS Y OBSERVACIONES
              {activeTab === 'notas' && <div className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-8 h-1 bg-emerald-600 rounded-t-full" />}
            </button>
            {lead.survey_data && Object.keys(lead.survey_data).length > 0 && (
              <button
                onClick={() => setActiveTab('encuesta')}
                className={`flex items-center gap-2.5 px-6 py-2 text-[11px] font-bold tracking-widest relative transition-all rounded-xl ${
                  activeTab === 'encuesta' 
                    ? 'text-altavik-600 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] ring-1 ring-slate-200/50' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Send size={14} />
                RESULTADOS ENCUESTA
                {activeTab === 'encuesta' && <div className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-8 h-1 bg-altavik-600 rounded-t-full" />}
              </button>
            )}
          </div>

          {/* CONTENIDO PRINCIPAL */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar-hide bg-white">
            {activeTab === 'ficha' && (
              <FichaTab
                formData={formData}
                setFormData={setFormData}
                handleChange={handleChange}
                whatsappUrl={whatsappUrl}
                SOURCE_CONFIG={SOURCE_CONFIG}
                STATUS_CONFIG={STATUS_CONFIG}
                setEmailModalMethod={setEmailModalMethod}
                setIsEmailModalOpen={setIsEmailModalOpen}
                setFirstContactTemplateActive={setFirstContactTemplateActive}
                setIsFeedbackModalOpen={setIsFeedbackModalOpen}
                lead={lead}
                tasks={tasks}
                editingTaskId={editingTaskId}
                setEditingTaskId={setEditingTaskId}
                newTask={newTask}
                setNewTask={setNewTask}
                saveTask={saveTask}
                toggleTaskStatus={toggleTaskStatus}
                renderEmailTrackingBadge={renderEmailTrackingBadge}
                expandedTasks={expandedTasks}
                toggleExpand={toggleExpand}
                parseTaskTitle={parseTaskTitle}
                startEditingTask={startEditingTask}
                deleteTask={deleteTask}
                loading={loading}
                waData={waData}
              />
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

            {activeTab === 'notas' && (
              <div className="max-w-4xl mx-auto py-4 h-[calc(100vh-320px)] min-h-[300px] flex flex-col animate-in fade-in duration-300">
                <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm transition-all hover:shadow-md flex flex-col flex-1 h-full">
                  <h3 className="text-xs font-bold text-[#1e293b] flex items-center gap-2.5 mb-3 text-slate-500 uppercase tracking-widest">
                    <div className="p-1.5 bg-slate-50 text-slate-600 rounded-xl"><StickyNote size={16} /></div> NOTAS Y OBSERVACIONES
                  </h3>
                  <textarea 
                    name="notes" 
                    value={formData.notes || ''} 
                    onChange={handleChange}
                    placeholder="Anota aquí detalles, preferencias o recordatorios rápidos sobre el cliente..." 
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 text-[14px] font-medium text-slate-600 italic focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all resize-none shadow-sm leading-relaxed flex-1 min-h-[200px] h-full"
                  />
                </section>
              </div>
            )}
            
            {activeTab === 'encuesta' && (
              <div className="max-w-4xl mx-auto py-4 h-[calc(100vh-320px)] min-h-[300px] flex flex-col animate-in fade-in duration-300">
                <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm transition-all hover:shadow-md flex flex-col flex-1 h-full overflow-y-auto custom-scrollbar-hide">
                  <h3 className="text-xs font-bold text-[#1e293b] flex items-center gap-2.5 mb-6 text-slate-500 uppercase tracking-widest">
                    <div className="p-1.5 bg-slate-50 text-slate-600 rounded-xl"><Send size={16} /></div> RESULTADOS DE LA ENCUESTA
                  </h3>
                  <div className="space-y-4">
                    {(lead.survey_data as any).pregunta_1 && (
                      <div className="bg-slate-50/70 p-4 rounded-xl text-sm border border-slate-100">
                        <span className="font-bold text-slate-400 uppercase tracking-widest block mb-1 text-[10px]">¿Qué le ha parecido la promoción?</span>
                        <span className="text-slate-800 font-black">{
                          ({
                            mas_info: 'Me interesa, quiero más información.',
                            pensarlo: 'Me interesa, pero necesito tiempo para pensarlo.',
                            no_encaja: 'No encaja con lo que estoy buscando actualmente.',
                            encontrado: 'Ya he encontrado otra vivienda.'
                          } as Record<string, string>)[(lead.survey_data as any).pregunta_1] || (lead.survey_data as any).pregunta_1
                        }</span>
                      </div>
                    )}
                    {(lead.survey_data as any).pregunta_2 && (
                      <div className="bg-slate-50/70 p-4 rounded-xl text-sm border border-slate-100">
                        <span className="font-bold text-slate-400 uppercase tracking-widest block mb-1 text-[10px]">Motivo principal del descarte</span>
                        <span className="text-slate-800 font-black">{
                          ({
                            ubicacion: 'Ubicación.',
                            precio: 'Precio/Presupuesto.',
                            distribucion: 'Distribución o tamaño de la vivienda.',
                            plazos: 'Plazos de entrega.',
                            falta_servicio: 'Falta de algún servicio o característica (ej. terraza, garaje).',
                            otro: 'Otro.'
                          } as Record<string, string>)[(lead.survey_data as any).pregunta_2] || (lead.survey_data as any).pregunta_2
                        }</span>
                      </div>
                    )}
                    {(lead.survey_data as any).pregunta_3 && (
                      <div className="bg-slate-50/70 p-4 rounded-xl text-sm border border-slate-100">
                        <span className="font-bold text-slate-400 uppercase tracking-widest block mb-1 text-[10px]">Calificación de la información recibida</span>
                        <span className="text-slate-800 font-black">{
                          ({
                            muy_clara: 'Muy clara y completa.',
                            suficiente: 'Suficiente, pero me faltan algunos detalles.',
                            poca_info: 'Poca información o difícil de entender.'
                          } as Record<string, string>)[(lead.survey_data as any).pregunta_3] || (lead.survey_data as any).pregunta_3
                        }</span>
                      </div>
                    )}
                    {(lead.survey_data as any).pregunta_4 && (
                      <div className="bg-slate-50/70 p-4 rounded-xl text-sm border border-slate-100">
                        <span className="font-bold text-slate-400 uppercase tracking-widest block mb-1 text-[10px]">¿Quiere ser contactado?</span>
                        <span className="text-slate-800 font-black">{
                          ({
                            si_llamada: 'Sí, por favor (llamadme).',
                            si_whatsapp: 'Sí, prefiero que me escribáis por WhatsApp/Email.',
                            no_mirar: 'No, prefiero seguir mirando por mi cuenta de momento.'
                          } as Record<string, string>)[(lead.survey_data as any).pregunta_4] || (lead.survey_data as any).pregunta_4
                        }</span>
                      </div>
                    )}
                  </div>
                </section>
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
          onSentSuccess={() => {
            fetchHistory();
            fetchTasks();
          }}
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
