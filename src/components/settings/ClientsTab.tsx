import React, { useState, useEffect } from 'react';
import { Users, Upload, Download, Trash2, Loader as Loader2, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useDialog } from '../../context/DialogContext';
import { useQueryClient } from '@tanstack/react-query';
import ImportLeadsModal from '../leads/ImportLeadsModal';
import ExportLeadsModal from '../leads/ExportLeadsModal';
import { DuplicateLeadsModal } from '../leads/DuplicateLeadsModal';

export function ClientsTab() {
  const { showAlert, showConfirm } = useDialog();
  const queryClient = useQueryClient();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [leadToDelete, setLeadToDelete] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email')
        .order('name', { ascending: true });
      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLead = async () => {
    if (!leadToDelete) return;

    const lead = leads.find(l => l.id === leadToDelete);
    
    const confirmed = await showConfirm({
      title: 'Eliminar Cliente',
      message: `¿Estás seguro de que deseas eliminar permanentemente a "${lead?.name}"? Se borrará también su historial de actividad.`,
      confirmText: 'Sí, eliminar permanentemente',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      // 1. Borrar historial y tareas
      await (supabase as any).from('lead_history').delete().eq('lead_id', leadToDelete);
      await (supabase as any).from('agenda').delete().eq('lead_id', leadToDelete);

      // 2. Borrar el lead
      const { error } = await supabase.from('leads').delete().eq('id', leadToDelete);
      if (error) throw error;
      
      await showAlert({ title: 'Éxito', message: 'Cliente eliminado correctamente.' });
      setLeadToDelete('');
      setLeads(prev => prev.filter(l => l.id !== leadToDelete));
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error) {
      console.error('Error al intentar borrar lead:', error);
      await showAlert({ title: 'Error', message: 'Hubo un error al intentar borrar el cliente.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (l.email && l.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold text-slate-800">Administración de Clientes</h2>
        <p className="text-sm text-slate-500 mt-1">Gestión avanzada de la base de datos de contactos: importación, exportación y limpieza.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <button
          onClick={() => setIsImportModalOpen(true)}
          className="p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:border-altavik-400 transition-all flex flex-col items-center text-center group"
        >
          <div className="w-12 h-12 rounded-xl bg-altavik-100 text-altavik-600 flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform">
            <Upload size={24} />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Importar Leads</h3>
          <p className="text-[11px] text-slate-500 mt-1">Cargar desde Excel</p>
        </button>

        <button
          onClick={() => setIsExportModalOpen(true)}
          className="p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:border-emerald-400 transition-all flex flex-col items-center text-center group"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform">
            <Download size={24} />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Exportar Base</h3>
          <p className="text-[11px] text-slate-500 mt-1">Descargar Backup</p>
        </button>

        <button
          onClick={() => setIsDuplicateModalOpen(true)}
          className="p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:border-amber-400 transition-all flex flex-col items-center text-center group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform">
            <Users size={24} />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Gestionar Duplicados</h3>
          <p className="text-[11px] text-slate-500 mt-1">Limpieza de DB</p>
        </button>
      </div>

      {/* Zona Crítica: Borrado */}
      <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <Trash2 size={20} />
          </div>
          <div>
            <h3 className="font-bold text-rose-800 text-sm">Borrado Definitivo</h3>
            <p className="text-xs text-rose-600 opacity-80">Esta acción no se puede deshacer. Elimina un cliente y todos sus registros vinculados.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              value={leadToDelete}
              onChange={(e) => setLeadToDelete(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-rose-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="">-- Buscar cliente para eliminar --</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.name} {l.email ? `(${l.email})` : ''}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleDeleteLead}
            disabled={!leadToDelete || isDeleting}
            className="px-8 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Borrar Permanentemente
          </button>
        </div>
      </div>

      <ImportLeadsModal isOpen={isImportModalOpen} onClose={() => { setIsImportModalOpen(false); fetchLeads(); }} onSuccess={() => fetchLeads()} />
      <ExportLeadsModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
      <DuplicateLeadsModal isOpen={isDuplicateModalOpen} onClose={() => { setIsDuplicateModalOpen(false); fetchLeads(); }} />
    </div>
  );
}
