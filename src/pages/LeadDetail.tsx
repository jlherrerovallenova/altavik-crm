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
  X
} from 'lucide-react';
import { useDialog } from '../context/DialogContext';
import type { Database } from '../types/supabase';

type Lead = Database['public']['Tables']['leads']['Row'];
type AgendaItem = Database['public']['Tables']['agenda']['Row'];

const STATUS_OPTIONS = [
  { value: 'new', label: 'Nuevo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'qualified', label: 'Cualificado' },
  { value: 'proposal', label: 'Propuesta Enviada' },
  { value: 'negotiation', label: 'En Negociación' },
  { value: 'closed', label: 'Cerrado (Ganado)' },
  { value: 'lost', label: 'Perdido' },
];

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<Lead | null>(null);
  const [tasks, setTasks] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useDialog();

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

  useEffect(() => {
    if (id) {
      fetchLeadData();
    }
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
        <button onClick={() => navigate('/leads')} className="mt-4 text-altavik-600 font-bold hover:underline">
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
      <button
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
                <button
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
                <button
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
                <button
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
                      <option value="Instagram">Instagram</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Referido">Referido</option>
                      <option value="Llamada">Llamada</option>
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

      {/* AGENDA VINCULADA */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock className="text-altavik-500" size={20} /> Historial y Tareas
          </h2>
          {/* Aquí iría un botón para abrir un modal de 'Nueva Tarea' pre-vinculada a este cliente */}
          <button className="text-sm font-bold text-altavik-600 hover:text-altavik-700 bg-altavik-50 px-3 py-1.5 rounded-lg transition-colors">
            + Agendar Tarea
          </button>
        </div>

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
                    <button
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
                        <button
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