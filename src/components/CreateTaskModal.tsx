// src/components/CreateTaskModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Clock, User, Save, Loader2, Search, Smartphone, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useAutosave } from '../hooks/useAutosave';
import type { Database } from '../types/supabase';

type Lead = Database['public']['Tables']['leads']['Row'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTaskModal({ isOpen, onClose, onSuccess }: Props) {
  const { session } = useAuth();
  const { showAlert } = useDialog();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showWhatsAppSuccess, setShowWhatsAppSuccess] = useState(false);

  const [formData, setFormData, clearFormData] = useAutosave('draft-create-task', {
    title: '',
    type: 'Llamada' as Database['public']['Tables']['agenda']['Row']['type'],
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
  });

  // Buscar clientes cuando el usuario escribe
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.length > 2) {
        searchLeads();
      } else {
        setLeads([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  // react-doctor-disable-next-line exhaustive-deps
  }, [searchTerm]);

  async function searchLeads() {
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .limit(5);

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error buscando clientes:', error);
    } finally {
      setIsSearching(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user.id || !formData.title) return;

    setLoading(true);
    try {
      const parsedDate = new Date(`${formData.date}T${formData.time}:00`);
      const dateTime = parsedDate.toISOString();

      const taskData: any = {
        title: formData.title,
        type: formData.type,
        due_date: dateTime,
        user_id: session.user.id,
        lead_id: selectedLead?.id || null,
        completed: false,
      };

      const { error } = await (supabase as any).from('agenda').insert([taskData]);

      if (error) throw error;

      // 1. Generar URL para Google Calendar
      const endParsedDate = new Date(parsedDate.getTime() + 60 * 60 * 1000); // +1h
      const formatGoogleDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
      
      const googleCalUrl = new URL('https://calendar.google.com/calendar/render');
      googleCalUrl.searchParams.append('action', 'TEMPLATE');
      googleCalUrl.searchParams.append('text', `[${formData.type}] ${formData.title}`);
      
      let details = `Tarea añadida desde Altavik CRM.`;
      if (selectedLead) {
        details += `\nCliente vinculado: ${selectedLead.name}`;
      }
      googleCalUrl.searchParams.append('details', details);
      googleCalUrl.searchParams.append('dates', `${formatGoogleDate(parsedDate)}/${formatGoogleDate(endParsedDate)}`);

      // 2. Abrir en nueva pestaña
      window.open(googleCalUrl.toString(), '_blank');

      if (formData.type === 'Visita' && selectedLead?.phone) {
        setShowWhatsAppSuccess(true);
      } else {
        onClose();
      }
      
      onSuccess();

      if (formData.type !== 'Visita' || !selectedLead?.phone) {
        clearFormData();
        setSelectedLead(null);
        setSearchTerm('');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      await showAlert({ title: 'Error', message: 'No se pudo crear la tarea. Verifica los tipos permitidos.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">
            {showWhatsAppSuccess ? '¡Tarea Creada!' : 'Nueva Tarea en Agenda'}
          </h2>
          <button type="button" 
            onClick={() => {
              if (showWhatsAppSuccess) {
                clearFormData();
                setSelectedLead(null);
                setShowWhatsAppSuccess(false);
              }
              onClose();
            }} 
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        {showWhatsAppSuccess ? (
          <div className="p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={40} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Visita programada con éxito</h3>
              <p className="text-sm text-slate-500">¿Quieres enviar el recordatorio por WhatsApp ahora?</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-100 space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Vista previa del mensaje:</p>
              <p className="text-xs text-slate-600 italic whitespace-pre-wrap leading-relaxed">
                {(() => {
                  const now = new Date();
                  const greeting = now.getHours() < 14 ? 'Buenos días' : 'Buenas tardes';
                  const d = new Date(formData.date);
                  const day = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  return `${greeting}, ${selectedLead?.name}.\nRecordatorio de la cita:\n*Día:* ${day}\n*Hora:* ${formData.time}\n*Lugar:* Terravall. Plaza Mayor 8 1ºA.`;
                })()}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button type="button"
                onClick={() => {
                  const now = new Date();
                  const hour = now.getHours();
                  const greeting = hour < 14 ? 'Buenos días' : 'Buenas tardes';
                  const d = new Date(formData.date);
                  const day = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  
                  const text = `${greeting}, ${selectedLead?.name}.\n\nRecordatorio de la cita:\n*Día:* ${day}\n*Hora:* ${formData.time}\n*Lugar:* Terravall. Plaza Mayor 8 1ºA.`;
                  
                  const cleanPhone = selectedLead?.phone?.replace(/\D/g, '') || '';
                  const finalPhone = cleanPhone.startsWith('34') ? cleanPhone : `34${cleanPhone}`;
                  
                  window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`, '_blank');
                  onClose();
                  // Reset form
                  clearFormData();
                  setSelectedLead(null);
                  setShowWhatsAppSuccess(false);
                }}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-100"
              >
                <Smartphone size={20} /> ENVIAR POR WHATSAPP
              </button>
              <button type="button"
                onClick={() => {
                  onClose();
                  // Reset form
                  clearFormData();
                  setSelectedLead(null);
                  setShowWhatsAppSuccess(false);
                }}
                className="w-full py-3 text-slate-400 text-sm font-bold hover:text-slate-600 transition-colors"
              >
                Cerrar sin enviar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* VINCULAR CLIENTE */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vincular a Cliente (Opcional)</label>
              {selectedLead ? (
                <div className="flex items-center justify-between p-3 bg-altavik-50 border border-altavik-100 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-altavik-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {selectedLead.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-altavik-800">{selectedLead.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="text-altavik-600 hover:text-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar cliente por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:border-altavik-500 transition-all outline-none"
                  />
                  {isSearching && <Loader2 className="absolute right-3 top-3 animate-spin text-slate-400" size={16} />}

                  {leads.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                      {leads.map(lead => (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => {
                            setSelectedLead(lead);
                            setLeads([]);
                            setSearchTerm('');
                          }}
                          className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50 last:border-0"
                        >
                          <User size={14} className="text-slate-400" />
                          <span className="font-medium text-slate-700">{lead.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">¿Qué hay que hacer?</label>
                <input
                  required
                  placeholder="Ej: Llamar para confirmar visita..."
                  className="w-full mt-1 px-4 py-3 bg-slate-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-altavik-500 transition-all text-sm font-medium"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
                  <select
                    className="w-full mt-1 px-4 py-3 bg-slate-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-altavik-500 transition-all text-sm font-bold text-slate-700"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  >
                    <option value="Llamada">📞 Llamada</option>
                    <option value="Email">📧 Email</option>
                    <option value="WhatsApp">🟢 WhatsApp</option>
                    <option value="Visita">🏠 Visita</option>
                    <option value="Reunión">🤝 Reunión</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                  <input
                    type="date"
                    required
                    className="w-full mt-1 px-4 py-3 bg-slate-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-altavik-500 transition-all text-sm font-medium"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hora estimada</label>
                <div className="relative mt-1">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="time"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-altavik-500 transition-all text-sm font-medium"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-200 mt-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              CREAR TAREA EN AGENDA
            </button>
          </form>
        )}
      </div>
    </div>
  );
}