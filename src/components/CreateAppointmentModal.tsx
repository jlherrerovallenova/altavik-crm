// src/components/CreateAppointmentModal.tsx
import { useState, useEffect } from 'react';
import { X, Loader2, Calendar, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leadName?: string; // Nuevo prop para pre-rellenar el nombre
}

export default function CreateAppointmentModal({ isOpen, onClose, onSuccess, leadName }: Props) {
  const { session } = useAuth();
  const { showAlert } = useDialog();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    contact_name: '',
    due_date: new Date().toISOString().split('T')[0],
    due_time: '10:00',
    type: 'call',
    priority: 'medium'
  });

  // Efecto para pre-rellenar el nombre si viene del LeadDetail
  useEffect(() => {
    if (isOpen && leadName) {
      setFormData(prev => ({ ...prev, contact_name: leadName }));
    }
  }, [isOpen, leadName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user.id) return;

    setLoading(true);
    try {
      // Guardamos en la tabla 'tasks' para que salga en la Agenda
      const { error } = await (supabase as any).from('tasks').insert([{
        title: formData.title,
        contact_name: formData.contact_name,
        due_date: formData.due_date,
        due_time: formData.due_time,
        type: formData.type as any,
        priority: formData.priority as any,
        user_id: session.user.id,
        status: 'pending'
      }] as any);

      if (error) throw error;

      onSuccess();
      onClose();
      // Resetear formulario (manteniendo fecha de hoy)
      setFormData(prev => ({
        ...prev,
        title: '',
        contact_name: '',
        type: 'call',
        priority: 'medium'
      }));

    } catch (error) {
      console.error('Error creando cita:', error);
      await showAlert({ title: 'Error', message: 'Error al guardar la acción.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">Nueva Acción</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título / Acción</label>
            <input
              required
              type="text"
              placeholder="Ej. Visita de captación"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-altavik-500 outline-none font-medium"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
            <input
              type="text"
              placeholder="Nombre del cliente"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-altavik-500 outline-none"
              value={formData.contact_name}
              onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type="date"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-altavik-500 outline-none"
                  value={formData.due_date}
                  onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hora</label>
              <div className="relative">
                <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="time"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-altavik-500 outline-none"
                  value={formData.due_time}
                  onChange={e => setFormData({ ...formData, due_time: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
              <select
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-altavik-500 outline-none"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="call">Llamada</option>
                <option value="visit">Visita</option>
                <option value="email">Email</option>
                <option value="meeting">Reunión</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prioridad</label>
              <select
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-altavik-500 outline-none"
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-altavik-600 text-white font-bold rounded-xl hover:bg-altavik-700 transition-colors flex items-center justify-center gap-2 shadow-lg">
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Guardar en Agenda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}