// src/components/DailyTasksModal.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Calendar, 
  Clock, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Loader2,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DailyTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string;
  completed: boolean;
  priority: string;
  leads?: {
    first_name: string;
    last_name: string;
  };
}

export const DailyTasksModal: React.FC<DailyTasksModalProps> = ({ isOpen, onClose }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      fetchTodayTasks();
    }
  }, [isOpen]);

  const fetchTodayTasks = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('agenda')
        .select(`
          *,
          leads (
            first_name,
            last_name
          )
        `)
        .eq('completed', false)
        .gte('due_date', startOfDay)
        .lte('due_date', endOfDay)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching today tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border border-white/20">
        {/* Header con gradiente premium */}
        <div className="bg-gradient-to-r from-altavik-600 to-altavik-800 p-6 text-white relative">
          <div className="absolute top-0 right-0 p-4">
            <button type="button" 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-inner">
              <Calendar className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Tu Agenda de Hoy</h2>
              <p className="text-altavik-100 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={12} /> {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto bg-slate-50/50">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-sm font-medium">Preparando tus tareas...</p>
            </div>
          ) : tasks.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-blue-700 font-medium">
                  Tienes <span className="font-black underline">{tasks.length} tareas</span> pendientes para hoy. ¡A por ello!
                </p>
              </div>

              {tasks.map((task) => (
                <div 
                  key={task.id}
                  onClick={() => {
                    navigate('/agenda');
                    onClose();
                  }}
                  className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-altavik-200 transition-all cursor-pointer flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-altavik-50 transition-colors">
                    <Clock className="text-slate-400 group-hover:text-altavik-500" size={18} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 truncate group-hover:text-altavik-600 transition-colors">
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.leads && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                          {task.leads.first_name} {task.leads.last_name}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(task.due_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="text-slate-300 group-hover:text-altavik-400 group-hover:translate-x-1 transition-all" size={20} />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
                <CheckCircle2 className="text-emerald-500" size={40} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">¡Todo al día!</h3>
                <p className="text-sm text-slate-500 max-w-[240px]">No tienes tareas programadas para hoy. Disfruta de la jornada.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 flex gap-3">
          <button type="button" 
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Cerrar
          </button>
          <button type="button" 
            onClick={() => {
              navigate('/agenda');
              onClose();
            }}
            className="flex-[2] py-3 px-4 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all active:scale-[0.98]"
          >
            Ir a la Agenda Completa
          </button>
        </div>
      </div>
    </div>
  );
};
