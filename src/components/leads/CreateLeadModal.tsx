// src/components/leads/CreateLeadModal.tsx
import { useState } from 'react';
import { X, Loader2, AlertCircle, ClipboardPaste, Sparkles, Globe, Users, Plus, Smartphone, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { CustomSelect, IdealistaIcon } from '../Shared';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

import { useCreateLead } from '../../hooks/useLeads';

const SOURCE_CONFIG = [
  { id: 'Idealista', label: 'Idealista', icon: IdealistaIcon, color: 'text-[#deff30]' },
  { id: 'Web', label: 'Web', icon: Globe, color: 'text-blue-500' },
  { id: 'Redes Sociales', label: 'Redes Sociales', icon: Smartphone, color: 'text-purple-500' },
  { id: 'Referido', label: 'Referido', icon: Users, color: 'text-emerald-500' },
  { id: 'Valla', label: 'Valla', icon: MapPin, color: 'text-orange-500' },
];

export default function CreateLeadModal({ isOpen, onClose, onSuccess }: Props) {
  const { user, profile } = useAuth();
  const createMutation = useCreateLead();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'Idealista',
    notes: ''
  });
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(false);

  if (!isOpen) return null;

  const loading = createMutation.isPending;

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isValidPhone = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 9;
  };

  const checkDuplicates = async (email: string, phone: string) => {
    if (!email && !phone) return false;
    try {
      if (email) {
        const { data, error } = await supabase.from('leads').select('id').eq('email', email).limit(1);
        if (!error && data && data.length > 0) return true;
      }
      if (phone) {
        const { data, error } = await supabase.from('leads').select('id').eq('phone', phone).limit(1);
        if (!error && data && data.length > 0) return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };
  
  const handlePasteParse = () => {
    if (!pasteText.trim()) return;

    // 1. Buscamos el Email (es lo más fiable)
    const emailMatch = pasteText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    const email = emailMatch ? emailMatch[1].trim() : null;

    // 2. Buscamos el Teléfono (9-15 dígitos, permitiendo espacios/guiones)
    const phoneMatch = pasteText.match(/(?:\+?34\s?)?[6789][0-9\s-]{8,13}/);
    let phone = phoneMatch ? phoneMatch[0].trim().replace(/\s/g, '') : null;

    // 3. Buscamos el Nombre (Heurística: línea anterior al email o teléfono, o tras "Contactado por")
    let name = '';
    const lines = pasteText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Función para ver si una línea es un teléfono
    const isPhone = (line: string) => /(?:\+?34\s?)?[6789][0-9\s-]{8,13}/.test(line);

    // Intentamos buscar por palabras clave primero
    const nameKeywordMatch = pasteText.match(/(?:Nombre|Te ha contactado|Contactado por|de)\s*[:\s-]*\s*([a-zA-ZáéíóúÁÉÍÓÚñÑ.\s]{3,40})/i);
    
    if (nameKeywordMatch && nameKeywordMatch[1]) {
      name = nameKeywordMatch[1].trim();
    } else {
      // Si no hay palabras clave, buscamos la línea que NO sea el email ni el teléfono
      const emailLineIndex = lines.findIndex(l => email && l.includes(email));
      const phoneLineIndex = lines.findIndex(l => phone && l.replace(/\s/g, '').includes(phone));
      
      // Buscamos un índice que no sea parte de los datos
      const dataIndices = [emailLineIndex, phoneLineIndex].filter(idx => idx !== -1);
      const minDataIndex = dataIndices.length > 0 ? Math.min(...dataIndices) : -1;
      
      if (minDataIndex > 0) {
        // Probamos la línea justo encima del primer dato encontrado
        const candidate = lines[minDataIndex - 1];
        if (candidate.length > 3 && candidate.length < 40 && !candidate.includes('@') && !isPhone(candidate)) {
          name = candidate;
        }
      }

      // Si aún no hay nombre, probamos las primeras líneas fuera del bloque de contacto
      if (!name) {
        for (const line of lines.slice(0, 5)) {
          const lower = line.toLowerCase();
          if (
            line.length > 3 && 
            line.length < 40 && 
            !lower.includes('idealista') && 
            !lower.includes('hola') && 
            !lower.includes('@') &&
            !isPhone(line)
          ) {
            name = line;
            break;
          }
        }
      }
    }

    // 4. Buscamos el MENSAJE (Notas)
    // El mensaje suele empezar tras un saludo o después de los datos de contacto
    let message = '';
    const messageMatch = pasteText.match(/(?:Mensaje|Comentario|Consulta):\s*([\s\S]+?)(?:\d{2}\/\d{2}\/\d{4}|Atentamente|Un saludo|$)/i);
    
    if (messageMatch) {
      message = messageMatch[1].trim();
    } else {
      // Si no hay etiqueta, buscamos bloques de texto después del email/teléfono
      const emailLineIndex = lines.findIndex(l => email && l.includes(email));
      const phoneLineIndex = lines.findIndex(l => phone && l.replace(/\s/g, '').includes(phone));
      const lastDataIndex = Math.max(emailLineIndex, phoneLineIndex);
      
      if (lastDataIndex !== -1 && lastDataIndex < lines.length - 1) {
        const potentialMessage = lines.slice(lastDataIndex + 1).join('\n');
        if (potentialMessage.length > 10) {
          message = potentialMessage.trim();
        }
      }
    }

    // Limpieza final
    if (name) {
      name = name.replace(/^de:\s*/i, '').replace(/\.$/, '').trim();
      if (name.toLowerCase().includes('altavik') || name.toLowerCase().includes('terraval')) {
        name = '';
      }
    }

    const newFormData = { ...formData };
    if (name) newFormData.name = name;
    if (email) newFormData.email = email;
    if (phone) newFormData.phone = phone;
    if (message) newFormData.notes = message;

    setFormData(newFormData);
    setShowPaste(false);
    setPasteText('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      if (!user?.id) throw new Error('Sesión de usuario no detectada.');
      if (!formData.name.trim()) throw new Error('El nombre es obligatorio.');

      if (formData.email && !isValidEmail(formData.email)) {
        throw new Error('El formato del correo electrónico no es válido.');
      }

      if (formData.phone && !isValidPhone(formData.phone)) {
        throw new Error('El teléfono debe tener al menos 9 dígitos.');
      }

      const isDuplicate = await checkDuplicates(formData.email, formData.phone);
      if (isDuplicate) {
        throw new Error('Ya existe un cliente registrado con este email o teléfono.');
      }

      const formatTitleCase = (str: string) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      };

      const payload: any = {
        name: formatTitleCase(formData.name.trim()),
        email: formData.email || null,
        phone: formData.phone ? formData.phone.replace(/\s+/g, '') : null,
        notes: formData.notes || null,
        source: formData.source,
        status: 'new',
        assigned_to: (profile?.id || user?.id) || null,
        is_subscribed: true
      };

      createMutation.mutate(payload, {
        onSuccess: () => {
          setFormData({ name: '', email: '', phone: '', source: 'Idealista', notes: '' });
          onSuccess();
          onClose();
        },
        onError: (err: any) => {
          setErrorMsg(err.message || 'Error al guardar el cliente.');
        }
      });

    } catch (error: any) {
      setErrorMsg(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#f8fafc] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">

        {/* Header */}
        <div className="px-5 sm:px-8 py-2.5 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-altavik-50 text-altavik-600 flex items-center justify-center">
                    <Plus size={20} />
                </div>
                <h2 className="text-xl font-bold text-[#1e293b]">Nuevo Contacto</h2>
            </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        <div className="p-5 space-y-3.5 overflow-y-auto max-h-[80vh] custom-scrollbar">
          {/* Quick Paste Area */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
             <button 
              type="button"
              onClick={() => setShowPaste(!showPaste)}
              className="flex items-center justify-between w-full text-slate-600 hover:text-altavik-700 transition-colors"
             >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <Sparkles size={16} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#1e293b]">Pegado Rápido (Idealista)</span>
                </div>
                <ChevronDown size={18} className={`transition-transform duration-300 ${showPaste ? 'rotate-180 text-blue-600' : 'text-slate-300'}`} />
             </button>

             {showPaste && (
               <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <textarea 
                    className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all resize-none italic shadow-inner"
                    placeholder="Pega aquí el contenido del correo de Idealista..."
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handlePasteParse}
                    className="w-full py-2.5 bg-[#334155] text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#1e293b] transition-all shadow-md active:scale-95"
                  >
                    Extraer Datos del Contacto
                  </button>
               </div>
             )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2 border border-red-100">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre Completo <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white outline-none transition-all text-sm font-semibold text-slate-700 shadow-sm"
              placeholder="Ej. Juan Pérez"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
              <input
                type="email"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm font-semibold text-slate-700 shadow-sm"
                placeholder="juan@ejemplo.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
              <div className="relative w-full group/phone">
                <input
                  type="tel"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm font-semibold text-slate-700 shadow-sm pr-12"
                  placeholder="600 000 000"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
                {formData.phone && (
                  <a 
                    href={`https://wa.me/${formData.phone.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-sm active:scale-95"
                    title="Abrir WhatsApp"
                  >
                    <Smartphone size={16} />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Origen</label>
              <CustomSelect
                value={formData.source}
                onChange={(val) => setFormData({ ...formData, source: val })}
                options={SOURCE_CONFIG.map(s => ({
                  id: s.id,
                  label: s.label,
                  icon: s.icon,
                  color: s.color
                }))}
              />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Notas Internas / Mensaje</label>
            <textarea
              className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all text-sm font-medium text-slate-700 h-28 resize-none shadow-inner italic"
              placeholder="Ej. Interesado en piso de 3 habitaciones..."
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-[#334155] text-white font-bold rounded-xl shadow-lg hover:bg-[#1e293b] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Guardar Contacto'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}