import React, { useState, useEffect } from 'react';
import { Plus, Upload, FileText, Trash2, Hop as Home, Loader as Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useDialog } from '../../context/DialogContext';
import CreatePropertyModal from '../inventory/CreatePropertyModal';
import ImportInventoryModal from '../inventory/ImportInventoryModal';
import UploadFichasModal from '../inventory/UploadFichasModal';

export function InventoryTab() {
  const { showAlert, showConfirm } = useDialog();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFichasModalOpen, setIsFichasModalOpen] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [propertyToDelete, setPropertyToDelete] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase.from('inventory').select('id, n_orden, portal, planta, letra');
      if (error) throw error;
      
      const sorted = (data || []).sort((a: any, b: any) => {
        const numA = parseInt(a.n_orden) || 0;
        const numB = parseInt(b.n_orden) || 0;
        if (numA !== numB) return numA - numB;
        return a.n_orden.localeCompare(b.n_orden, undefined, { numeric: true });
      });
      setProperties(sorted);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSingleProperty = async () => {
    if (!propertyToDelete) return;

    const property = properties.find(p => p.id === propertyToDelete);
    
    const confirmed = await showConfirm({
      title: 'Eliminar Vivienda',
      message: `¿Estás seguro de que deseas eliminar la vivienda Nº ${property?.n_orden}?`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      // Validar si tiene leads asociados
      const { data: leads, error: leadsErr } = await supabase.from('leads').select('id').eq('property_id', propertyToDelete).limit(1);
      if (leadsErr) throw leadsErr;
      if (leads && leads.length > 0) {
        await showAlert({ title: 'Operación denegada', message: 'No se puede borrar esta vivienda porque tiene contactos asociados.' });
        return;
      }

      // Validar si tiene ventas asociadas
      const { data: sales, error: salesErr } = await supabase.from('sales').select('id').eq('property_id', propertyToDelete).limit(1);
      if (salesErr) throw salesErr;
      if (sales && sales.length > 0) {
        await showAlert({ title: 'Operación denegada', message: 'No se puede borrar esta vivienda porque ya tiene una venta o reserva.' });
        return;
      }

      const { error } = await supabase.from('inventory').delete().eq('id', propertyToDelete);
      if (error) throw error;
      
      await showAlert({ title: 'Éxito', message: 'Vivienda eliminada correctamente.' });
      setPropertyToDelete('');
      setProperties(prev => prev.filter(p => p.id !== propertyToDelete));
    } catch (error) {
      console.error('Error al intentar borrar vivienda:', error);
      await showAlert({ title: 'Error', message: 'Hubo un error al intentar borrar la vivienda.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold text-slate-800">Gestión de Catálogo de Viviendas</h2>
        <p className="text-sm text-slate-500 mt-1">Administra las propiedades, importa datos de Excel o sube las fichas técnicas en PDF.</p>
      </div>

      <div className="flex flex-col gap-4 max-w-4xl">
        {/* Acciones Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button type="button"
            onClick={() => setIsModalOpen(true)}
            className="p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-altavik-300 transition-all flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-altavik-100 text-altavik-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Plus size={24} />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Añadir</h3>
            <p className="text-[11px] text-slate-500 mt-1">Manualmente</p>
          </button>

          <button type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Importar</h3>
            <p className="text-[11px] text-slate-500 mt-1">Excel/CSV</p>
          </button>

          <button type="button"
            onClick={() => setIsFichasModalOpen(true)}
            className="p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-purple-300 transition-all flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <FileText size={24} />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Fichas PDF</h3>
            <p className="text-[11px] text-slate-500 mt-1">Subida Masiva</p>
          </button>
        </div>

        {/* Borrado Individual */}
        <div className="bg-red-50 p-5 rounded-2xl border border-red-200 mt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-red-800 text-sm">Zona de Peligro</h3>
              <p className="text-xs text-red-600 opacity-80">Selecciona una vivienda para eliminarla permanentemente.</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={propertyToDelete}
              onChange={(e) => setPropertyToDelete(e.target.value)}
              className="flex-1 p-2.5 text-sm border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
            >
              <option value="">-- Seleccionar vivienda a eliminar --</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>
                  Vivienda Nº {p.n_orden} (Portal {p.portal}, {p.planta} {p.letra})
                </option>
              ))}
            </select>
            <button type="button"
              onClick={handleDeleteSingleProperty}
              disabled={!propertyToDelete || isDeleting}
              className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Eliminar
            </button>
          </div>
        </div>
      </div>

      <CreatePropertyModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); fetchProperties(); }} />
      <ImportInventoryModal isOpen={isImportModalOpen} onClose={() => { setIsImportModalOpen(false); fetchProperties(); }} onSuccess={() => fetchProperties()} />
      <UploadFichasModal isOpen={isFichasModalOpen} onClose={() => setIsFichasModalOpen(false)} onSuccess={() => fetchProperties()} />
    </div>
  );
}
