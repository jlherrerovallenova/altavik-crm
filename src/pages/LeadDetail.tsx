// src/pages/LeadDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar as CalendarIcon,
  Clock,
  User,
  Loader2,
  CheckCircle2,
  Circle,
  Save,
  Pencil,
  X,
  Plus,
  Trash2,
  Check,
  Wand2
} from 'lucide-react';
import { useDialog } from '../context/DialogContext';
import { useAuth } from '../context/AuthContext';
import type { Database } from '../types/supabase';
import { summarizeLeadWithCopilot, type CopilotSummaryResponse } from '../services/aiCopilot';

type Lead = Database['public']['Tables']['leads']['Row'];
type AgendaItem = Database['public']['Tables']['agenda']['Row'];

const STATUS_OPTIONS = [
  { value: 'new', label: 'Nuevo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'qualified', label: 'Cualificado' },


  { value: 'closed', label: 'Cerrado (Ganado)' },
  { value: 'lost', label: 'Perdido' },
];

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<Lead | null>(null);
  const [tasks, setTasks] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { showAlert, showConfirm } = useDialog();

  // Estados para Copilot
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotData, setCopilotData] = useState<CopilotSummaryResponse | null>(null);

  // Estados para la edición de la ficha
  const [isEditing, setIsEditing] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'Web'
  });

  const [savingStatus, setSavingStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('');

  const { session } = useAuth();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    type: 'Llamada',
    title: '',
    date: new Date().toISOString().slice(0, 10),
    time: (new Date().getHours() + 1).toString().padStart(2, '0') + ':00',
  });

  useEffect(() => {
    if (id) {
      fetchLeadData();
    }
  // react-doctor-disable-next-line exhaustive-deps
  }, [id]);

  // 1. CARGA DE DATOS DEL CLIENTE Y SUS TAREAS
  const fetchLeadData = async () => {
    setLoading(true);
    try {
      // Promesas en paralelo para mayor velocidad
      const [leadResponse, agendaResponse] = await Promise.all([
        (supabase as any).from('leads').select('*').eq('id', id as string).single(),
        (supabase as any).from('agenda').select('*').eq('lead_id', id as string).order('due_date', { ascending: true })
      ]);

      if (leadResponse.error) throw leadResponse.error;
      if (agendaResponse.error) throw agendaResponse.error;

      setLead(leadResponse.data);
      setCurrentStatus(leadResponse.data.status || 'new');
      setFormData({
        name: leadResponse.data.name || '',
        email: leadResponse.data.email || '',
        phone: leadResponse.data.phone || '',
        source: leadResponse.data.source || 'Web'
      });
      setTasks(agendaResponse.data || []);

    } catch (error) {
      console.error("Error cargando perfil del cliente:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopilotSummarize = async () => {
    setCopilotLoading(true);
    try {
      const data = await summarizeLeadWithCopilot(lead, tasks);
      setCopilotData(data);
    } catch (err) {
      console.error(err);
      showAlert({ title: 'Error Copilot', message: 'No se pudo generar el resumen. Verifica tu API Key.' });
    } finally {
      setCopilotLoading(false);
    }
  };

  // 2. ACTUALIZACIÓN DE DATOS DEL CLIENTE
  const handleSaveDetails = async () => {
    if (!lead) return;
    setSavingDetails(true);
    try {
      const { error } = await (supabase as any)
        .from('leads')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          source: formData.source
        })
        .eq('id', lead.id);

      if (error) throw error;
      setLead({ ...lead, ...formData });
      setIsEditing(false);
    } catch (error) {
      console.error("Error actualizando datos:", error);
      await showAlert({ title: 'Error', message: 'Error al guardar los cambios.' });
    } finally {
      setSavingDetails(false);
    }
  };

  // 3. ACTUALIZACIÓN DE ESTADO (PIPELINE)
  const handleStatusChange = async (newStatus: string) => {
    if (!lead) return;
    // react-doctor-disable-next-line no-impure-state-updater
    setCurrentStatus(newStatus);
    setSavingStatus(true);
    try {
      const { error } = await (supabase as any)
        .from('leads')
        .update({ status: newStatus })
        .eq('id', lead.id);

      if (error) throw error;
      setLead({ ...lead, status: newStatus as any });
    } catch (error) {
      console.error("Error actualizando estado:", error);
      setCurrentStatus(lead.status || 'new'); // Revertir si hay error
    } finally {
      setSavingStatus(false);
    }
  };

  // 4. ACTUALIZACIÓN DE TAREAS VINCULADAS
  const toggleTaskStatus = async (task: AgendaItem) => {
    const newStatus = !task.completed;
    // Actualización optimista en UI
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newStatus } : t));
    try {
      const { error } = await (supabase as any)
        .from('agenda')
        .update({ completed: newStatus })
        .eq('id', task.id);
      if (error) throw error;
    } catch (error) {
      console.error("Error actualizando tarea:", error);
      fetchLeadData(); // Recargar datos si falla
    }
  };

  const handleSaveTask = async () => {
    if (!newTask.title || !session?.user.id || !lead) return;
    setSavingTask(true);
    try {
      const dateTimeString = `${newTask.date}T${newTask.time}:00`;
      const finalDate = new Date(dateTimeString).toISOString();

      const taskData = {
        title: newTask.title,
        type: newTask.type,
        due_date: finalDate,
        lead_id: lead.id,
        user_id: session.user.id,
        completed: false
      };

      const { error } = await (supabase as any).from('agenda').insert([taskData]);
      if (error) throw error;

      // Abrir Google Calendar
      const parsedDate = new Date(finalDate);
      const endParsedDate = new Date(parsedDate.getTime() + 60 * 60 * 1000);
      const formatGoogleDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
      const googleCalUrl = new URL('https://calendar.google.com/calendar/render');
      googleCalUrl.searchParams.append('action', 'TEMPLATE');
      googleCalUrl.searchParams.append('text', `[${taskData.type}] ${taskData.title}`);
      googleCalUrl.searchParams.append('dates', `${formatGoogleDate(parsedDate)}/${formatGoogleDate(endParsedDate)}`);

      setTimeout(() => {
        try { window.open(googleCalUrl.toString(), '_blank'); } catch (e) { console.warn("Popup bloqueado"); }
      }, 100);

      setNewTask({
        type: 'Llamada',
        title: '',
        date: new Date().toISOString().slice(0, 10),
        time: (new Date().getHours() + 1).toString().padStart(2, '0') + ':00',
      });
      setIsAddingTask(false);
      fetchLeadData();
    } catch (error) {
      console.error("Error guardando tarea:", error);
      await showAlert({ title: 'Error', message: 'No se pudo agendar la tarea.' });
    } finally {
      setSavingTask(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    const confirmed = await showConfirm({
      title: 'Eliminar Acción',
      message: '¿Estás seguro de que deseas eliminar esta acción de la agenda?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    });
    if (!confirmed) return;
    try {
      const { error } = await (supabase as any).from('agenda').delete().eq('id', taskId);
      if (error) throw error;
      fetchLeadData();
    } catch (error) {
      console.error("Error eliminando tarea:", error);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('es-ES')} a las ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-slate-400 gap-4">
        <Loader2 className="animate-spin" size={40} />
        <p className="font-medium animate-pulse">Cargando perfil del cliente...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-800">Cliente no encontrado</h2>
        <button type="button" onClick={() => navigate('/leads')} className="mt-4 text-altavik-600 font-bold hover:underline">
          Volver a la lista
        </button>
      </div>
    );
  }

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">

      {/* BOTÓN DE RETROCESO */}
      <button type="button"
        onClick={() => navigate('/leads')}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft size={16} /> Volver a Leads
      </button>

      {/* CABECERA Y DATOS PRINCIPALES */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex items-center gap-5 w-full md:w-auto">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-altavik-100 to-emerald-200 border border-emerald-300 flex items-center justify-center text-altavik-700 font-bold text-2xl shrink-0 shadow-sm">
              {(isEditing ? formData.name : lead.name)?.substring(0, 2).toUpperCase() || <User />}
            </div>
            <div className="flex-1 w-full">
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight bg-slate-50 border-b-2 border-altavik-500 outline-none px-2 py-1 rounded transition-colors"
                  placeholder="Nombre Completo"
                />
              ) : (
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
                  {lead.name}
                </h1>
              )}
            </div>
          </div>

          {/* ACCIONES DE CONTACTO RÁPIDO Y EDICIÓN */}
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {isEditing ? (
              <>
                <button type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: lead.name || '',
                      email: lead.email || '',
                      phone: lead.phone || '',
                      source: lead.source || 'Web'
                    });
                  }}
                  className="flex-1 md:flex-none p-2.5 px-4 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all font-bold text-sm flex items-center justify-center gap-2"
                >
                  <X size={16} /> Cancelar
                </button>
                <button type="button"
                  onClick={handleSaveDetails}
                  disabled={savingDetails}
                  className="flex-1 md:flex-none p-2.5 px-4 bg-altavik-600 text-white rounded-xl hover:bg-altavik-700 transition-all font-bold text-sm shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingDetails ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Guardar
                </button>
              </>
            ) : (
              <>
                <button type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex-1 md:flex-none p-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2 font-bold text-sm"
                >
                  <Pencil size={16} /> Editar
                </button>
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="flex-1 md:flex-none p-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-altavik-50 hover:text-altavik-700 hover:border-emerald-200 transition-all shadow-sm flex items-center justify-center gap-2 font-bold text-sm">
                    <Phone size={16} /> Llamar
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex-1 md:flex-none p-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all shadow-sm flex items-center justify-center gap-2 font-bold text-sm">
                    <Mail size={16} /> Email
                  </a>
                )}
              </>
            )}
          </div>
        </div>

        {/* METADATOS Y ESTADO */}
        <div className="bg-slate-50 p-6 sm:p-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4 col-span-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Información de Contacto</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div className="flex items-center gap-3 text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                <Mail className="text-slate-400 shrink-0" size={16} />
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border-b-2 border-altavik-500 outline-none px-2 py-1 rounded font-medium"
                    placeholder="correo@ejemplo.com"
                  />
                ) : (
                  <span className="truncate w-full">{lead.email || <span className="text-slate-400 italic">No proporcionado</span>}</span>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                <Phone className="text-slate-400 shrink-0" size={16} />
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border-b-2 border-altavik-500 outline-none px-2 py-1 rounded font-medium"
                    placeholder="600 000 000"
                  />
                ) : (
                  <span className="w-full">{lead.phone || <span className="text-slate-400 italic">No proporcionado</span>}</span>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                <User className="text-slate-400 shrink-0" size={16} />
                {isEditing ? (
                  <div className="flex items-center gap-2 w-full">
                    <span className="whitespace-nowrap">Origen:</span>
                    <select
                      value={formData.source}
                      onChange={e => setFormData({ ...formData, source: e.target.value })}
                      className="w-full bg-slate-50 border-b-2 border-altavik-500 outline-none px-2 py-1 rounded font-bold cursor-pointer"
                    >
                      <option value="Idealista">Idealista</option>
                      <option value="Web">Web</option>
                      <option value="Google SEM">Google SEM</option>
                      <option value="Redes Sociales">Redes Sociales</option>
                      <option value="Referido">Referido</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                ) : (
                  <span className="w-full">Origen: <strong className="font-bold">{lead.source || 'Directo'}</strong></span>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                <CalendarIcon className="text-slate-400 shrink-0" size={16} />
                <span className="w-full">Creado: <strong className="font-bold">{new Date(lead.created_at).toLocaleDateString()}</strong></span>
              </div>

            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fase Actual</h3>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
              <select
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={savingStatus}
                className={`w-full p-2.5 rounded-lg border text-sm font-bold transition-all outline-none appearance-none cursor-pointer ${savingStatus ? 'opacity-50' : 'hover:border-altavik-400 focus:ring-2 focus:ring-altavik-500/20'}`}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {savingStatus && <Save className="absolute right-6 top-1/2 -translate-y-1/2 text-altavik-600 animate-pulse" size={16} />}
            </div>
          </div>
        </div>
      </div>

      {/* AI COPILOT SECTION */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
            <Wand2 className="text-indigo-500" size={20} />
            Copilot IA
          </h2>
          <button type="button"
            onClick={handleCopilotSummarize}
            disabled={copilotLoading}
            className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {copilotLoading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            Resumir y Recomendar
          </button>
        </div>
        
        {copilotData && (
          <div className="bg-white rounded-xl p-5 border border-indigo-100 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Resumen Ejecutivo</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">{copilotData.summary}</p>
            
            <h3 className="text-sm font-bold text-slate-800 mb-2">Próximos Pasos Recomendados</h3>
            <ul className="space-y-2">
              {copilotData.nextSteps.map((step, idx) => (
                // react-doctor-disable-next-line no-array-index-as-key
                <li key={idx} className="flex gap-2 text-sm text-slate-600">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* AGENDA VINCULADA */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock className="text-altavik-500" size={20} /> Historial y Tareas
          </h2>
          {!isAddingTask && (
            <button type="button" 
              onClick={() => setIsAddingTask(true)}
              className="text-sm font-bold text-altavik-600 hover:text-altavik-700 bg-altavik-50 px-4 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-2 border border-altavik-100"
            >
              <Plus size={16} /> Agendar Tarea
            </button>
          )}
        </div>

        {isAddingTask && (
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Nueva Tarea en Agenda</h3>
              <button type="button" onClick={() => setIsAddingTask(false)} className="text-slate-400 hover:text-red-500"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo</label>
                <select 
                  value={newTask.type}
                  onChange={e => setNewTask({...newTask, type: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-altavik-500/20"
                >
                  <option value="Llamada">📞 Llamada</option>
                  <option value="WhatsApp">🟢 WhatsApp</option>
                  <option value="Visita">🏠 Visita</option>
                  <option value="Email">📧 Email</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</label>
                <input 
                  type="date"
                  value={newTask.date}
                  onChange={e => setNewTask({...newTask, date: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-altavik-500/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hora</label>
                <input 
                  type="time"
                  value={newTask.time}
                  onChange={e => setNewTask({...newTask, time: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-altavik-500/20"
                />
              </div>
            </div>
            <div className="space-y-1.5 mb-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descripción</label>
              <input 
                type="text"
                placeholder="Ej: Llamar para confirmar visita"
                value={newTask.title}
                onChange={e => setNewTask({...newTask, title: e.target.value})}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-altavik-500/20"
              />
            </div>
            <button type="button" 
              onClick={handleSaveTask}
              disabled={savingTask || !newTask.title}
              className="w-full py-3 bg-altavik-600 hover:bg-altavik-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-altavik-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingTask ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Guardar Tarea
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {tasks.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center text-slate-500">
              <CalendarIcon size={40} className="text-slate-300 mb-3" />
              <p className="font-medium">No hay tareas asociadas a este cliente.</p>
              <p className="text-sm opacity-70">Crea una llamada o visita para empezar el seguimiento.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingTasks.map(task => (
                <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <button type="button"
                      onClick={() => toggleTaskStatus(task)}
                      className="text-slate-300 hover:text-altavik-500 transition-colors"
                    >
                      <Circle size={24} />
                    </button>
                    <div>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border mb-1 inline-block ${task.type === 'Llamada' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        task.type === 'WhatsApp' ? 'bg-altavik-50 text-altavik-600 border-altavik-100' :
                          task.type === 'Visita' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                            'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                        {task.type}
                      </span>
                      <p className="font-bold text-slate-800 text-sm">{task.title}</p>
                      <p className={`text-xs mt-0.5 ${new Date(task.due_date) < new Date() ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                        {formatDateTime(task.due_date)}
                      </p>
                    </div>
                  </div>
                  <button type="button" 
                    onClick={() => deleteTask(task.id.toString())}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              {completedTasks.length > 0 && (
                <div className="bg-slate-50/50">
                  <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Completadas ({completedTasks.length})
                  </div>
                  {completedTasks.map(task => (
                    <div key={task.id} className="p-4 flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-4">
                        <button type="button"
                          onClick={() => toggleTaskStatus(task)}
                          className="text-altavik-500 hover:text-slate-400 transition-colors"
                        >
                          <CheckCircle2 size={24} />
                        </button>
                        <div>
                          <p className="font-medium text-altavik-600 opacity-70 text-sm">{task.title}</p>
                          <p className="text-xs text-slate-500">{task.type} • {formatDateTime(task.due_date)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}