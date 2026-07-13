import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  Mail, 
  Phone, 
  AlertCircle, 
  Loader2,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useDialog } from '../../context/DialogContext';

interface DuplicateLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdate?: () => void;
}

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

interface DuplicateGroup {
  key: string;
  type: 'email' | 'phone';
  leads: Lead[];
}

export const DuplicateLeadsModal: React.FC<DuplicateLeadsModalProps> = ({ isOpen, onClose, onLeadUpdate }) => {
  const [loading, setLoading] = useState(true);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const { showConfirm, showAlert } = useDialog();

  useEffect(() => {
    if (isOpen) {
      fetchAndFindDuplicates();
    }
  }, [isOpen]);

  const fetchAndFindDuplicates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, phone, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const leads = data as Lead[];
      const groups: DuplicateGroup[] = [];

      // Find by Email
      const emailMap = new Map<string, Lead[]>();
      leads.forEach(l => {
        if (l.email && l.email.trim()) {
          const email = l.email.toLowerCase().trim();
          emailMap.set(email, [...(emailMap.get(email) || []), l]);
        }
      });
      emailMap.forEach((groupLeads, email) => {
        if (groupLeads.length > 1) {
          groups.push({ key: email, type: 'email', leads: groupLeads });
        }
      });

      // Find by Phone
      const phoneMap = new Map<string, Lead[]>();
      leads.forEach(l => {
        if (l.phone && l.phone.trim()) {
          const phone = l.phone.replace(/\s+/g, '').trim();
          if (phone.length > 5) {
            phoneMap.set(phone, [...(phoneMap.get(phone) || []), l]);
          }
        }
      });
      phoneMap.forEach((groupLeads, phone) => {
        if (groupLeads.length > 1) {
          groups.push({ key: phone, type: 'phone', leads: groupLeads });
        }
      });

      setDuplicates(groups);
    } catch (err) {
      console.error('Error fetching duplicates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLead = async (leadId: string, leadName: string) => {
    const confirmed = await showConfirm({
      title: 'Eliminar Duplicado',
      message: `¿Estás seguro de que deseas eliminar permanentemente a "${leadName}"?`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase.from('leads').delete().eq('id', leadId);
      if (error) throw error;
      
      // Update local state
      setDuplicates(prev => 
        prev.map(g => ({
          ...g,
          leads: g.leads.filter(l => l.id !== leadId)
        })).filter(g => g.leads.length > 1)
      );
      
      if (onLeadUpdate) onLeadUpdate();
      await showAlert({ title: 'Éxito', message: 'Lead duplicado eliminado.' });
    } catch (err) {
      console.error('Error deleting lead:', err);
      await showAlert({ title: 'Error', message: 'No se pudo eliminar el lead.' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Localizador de Duplicados</h2>
              <p className="text-sm text-slate-500">Buscando coincidencias por Email o Teléfono.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-altavik-600" size={40} />
              <p className="text-slate-500 font-medium">Analizando base de datos...</p>
            </div>
          ) : duplicates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">¡Base de datos limpia!</h3>
              <p className="text-slate-500 max-w-xs mt-2">No se han encontrado clientes con emails o teléfonos duplicados en este momento.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-blue-800 leading-relaxed">
                  Se han encontrado <strong>{duplicates.length} grupos</strong> de posibles duplicados. 
                  Revisa cada grupo y elimina los registros redundantes. Próximamente añadiremos la opción de fusionar datos.
                </p>
              </div>

              {duplicates.map((group, idx) => (
                // react-doctor-disable-next-line no-array-index-as-key
                <div key={`${group.type}-${group.key}-${idx}`} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3 bg-slate-50 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        group.type === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {group.type === 'email' ? 'Email' : 'Teléfono'}
                      </span>
                      <span className="text-sm font-bold text-slate-700">{group.key}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-400">{group.leads.length} coincidencias</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.leads.map(lead => (
                      <div key={lead.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                            <Users size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{lead.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              {lead.email && (
                                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                  <Mail size={10} /> {lead.email}
                                </div>
                              )}
                              {lead.phone && (
                                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                  <Phone size={10} /> {lead.phone}
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Alta: {new Date(lead.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" 
                            onClick={() => window.open(`/leads?search=${lead.email || lead.phone || lead.name}`, '_blank')}
                            className="p-2 text-slate-400 hover:text-altavik-600 hover:bg-altavik-50 rounded-lg transition-colors"
                            title="Ver en tabla"
                          >
                            <ExternalLink size={16} />
                          </button>
                          <button type="button" 
                            onClick={() => handleDeleteLead(lead.id, lead.name)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar registro"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-white flex justify-end">
          <button type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
