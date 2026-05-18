// src/components/DailyBriefingModal.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, MessageSquare, Clock, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface WhatsAppReply {
  id: string;
  lead_id: string;
  lead_name: string;
  description: string;
  created_at: string;
  raw_message: string;
  summary: string;
}

const TODAY_KEY = 'altavik_briefing_shown_date';

interface AgendaTask {
  id: number;
  title: string;
  type: string;
  due_date: string;
  lead_id: string | null;
}

interface DailyBriefingModalProps {
  waReplies: WhatsAppReply[];
  onClose: () => void;
  onMarkRepliesSeen: () => void;
}

export function DailyBriefingModal({ waReplies, onClose, onMarkRepliesSeen }: DailyBriefingModalProps) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [todayTasks, setTodayTasks] = useState<AgendaTask[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<AgendaTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    const fetchTasks = async () => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

      const [todayRes, overdueRes] = await Promise.all([
        (supabase as any)
          .from('agenda')
          .select('id, title, type, due_date, lead_id')
          .eq('completed', false)
          .gte('due_date', startOfDay)
          .lte('due_date', endOfDay)
          .order('due_date', { ascending: true })
          .limit(5),
        (supabase as any)
          .from('agenda')
          .select('id, title, type, due_date, lead_id')
          .eq('completed', false)
          .lt('due_date', startOfDay)
          .order('due_date', { ascending: false })
          .limit(3),
      ]);

      setTodayTasks(todayRes.data || []);
      setOverdueTasks(overdueRes.data || []);
      setLoading(false);
    };
    fetchTasks();
  }, [session]);

  const handleClose = () => {
    onMarkRepliesSeen();
    onClose();
  };

  const formatHour = (iso: string) => {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatRelative = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor(diff / 60000);
    if (h > 24) return `hace ${Math.floor(h / 24)}d`;
    if (h >= 1) return `hace ${h}h`;
    return `hace ${m}m`;
  };

  const typeIcon: Record<string, string> = {
    'Llamada': '📞', 'Email': '✉️', 'WhatsApp': '💬',
    'Visita': '🏠', 'Reunión': '👥',
  };

  const totalAlerts = todayTasks.length + overdueTasks.length + waReplies.length;
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-1">Buenos días 👋</p>
              <h2 className="text-white font-black text-lg capitalize">{today}</h2>
            </div>
            <div className="flex items-center gap-3">
              {totalAlerts > 0 && (
                <div className="bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full">
                  {totalAlerts} pendientes
                </div>
              )}
              <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[70vh]">

          {/* WhatsApp Replies */}
          {waReplies.length > 0 && (
            <div className="border-b border-slate-100">
              <div className="px-6 py-3 bg-emerald-50 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">
                  {waReplies.length} respuesta{waReplies.length !== 1 ? 's' : ''} de WhatsApp
                </span>
              </div>
              <div className="px-6 py-3 space-y-2">
                {waReplies.map(reply => (
                  <button
                    key={reply.id}
                    onClick={() => { handleClose(); navigate(`/leads?highlight=${reply.lead_id}`); }}
                    className="w-full flex items-start gap-3 p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all text-left group"
                  >
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <MessageSquare size={15} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-emerald-900">{reply.lead_name}</p>
                      <p className="text-[12px] text-emerald-700 truncate">{reply.summary || reply.raw_message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-emerald-600 font-medium">{formatRelative(reply.created_at)}</span>
                      <ArrowRight size={13} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tareas de hoy */}
          <div className="border-b border-slate-100">
            <div className="px-6 py-3 bg-blue-50 flex items-center gap-2">
              <Clock size={13} className="text-blue-600" />
              <span className="text-[11px] font-black text-blue-700 uppercase tracking-widest">
                {loading ? 'Cargando...' : todayTasks.length === 0 ? 'Sin tareas hoy' : `${todayTasks.length} tarea${todayTasks.length !== 1 ? 's' : ''} para hoy`}
              </span>
            </div>
            {todayTasks.length > 0 && (
              <div className="px-6 py-3 space-y-2">
                {todayTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                    <span className="text-base shrink-0">{typeIcon[task.type] || '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{task.title}</p>
                    </div>
                    <span className="text-[11px] font-bold text-blue-600 shrink-0">{formatHour(task.due_date)}</span>
                  </div>
                ))}
              </div>
            )}
            {!loading && todayTasks.length === 0 && (
              <div className="px-6 py-4 flex items-center gap-2 text-slate-400">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span className="text-sm">¡Día libre de tareas!</span>
              </div>
            )}
          </div>

          {/* Tareas vencidas */}
          {overdueTasks.length > 0 && (
            <div>
              <div className="px-6 py-3 bg-red-50 flex items-center gap-2">
                <AlertTriangle size={13} className="text-red-600" />
                <span className="text-[11px] font-black text-red-700 uppercase tracking-widest">
                  {overdueTasks.length} tarea{overdueTasks.length !== 1 ? 's' : ''} vencida{overdueTasks.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="px-6 py-3 space-y-2">
                {overdueTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-2.5 bg-red-50 border border-red-100 rounded-xl">
                    <span className="text-base shrink-0">{typeIcon[task.type] || '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{task.title}</p>
                    </div>
                    <span className="text-[11px] font-bold text-red-500 shrink-0">
                      {new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            onClick={() => { handleClose(); navigate('/agenda'); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            <Calendar size={15} />
            Ver agenda completa
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/** Devuelve true si el briefing ya se mostró hoy */
export function briefingShownToday(): boolean {
  return localStorage.getItem(TODAY_KEY) === new Date().toDateString();
}

/** Marca el briefing como mostrado hoy */
export function markBriefingShown() {
  localStorage.setItem(TODAY_KEY, new Date().toDateString());
}
