// src/components/inventory/CreatePropertyModal.tsx
import React, { useState } from 'react';
import {
  X,
  Home,
  Hash,
  Euro,
  Loader2,
  Save
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useDialog } from '../../context/DialogContext';

interface PropertyFormData {
  n_orden: string;
  planta: string;
  portal: string;
  letra: string;
  orientacion: string;
  dormitorios: string;
  banos: string;
  sup_util: string;
  sup_construida: string;
  sup_terrazas: string;
  sup_porche: string;
  garaje: string;
  trastero: string;
  precio: string;
  estado_vivienda: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: any;
}

export default function CreatePropertyModal({ isOpen, onClose, onSuccess, initialData }: Props) {
  const [loading, setLoading] = useState(false);
  const { showAlert } = useDialog();
  const [formData, setFormData] = useState<PropertyFormData>({
    n_orden: initialData?.n_orden || '',
    planta: initialData?.planta || '',
    portal: initialData?.portal || '',
    letra: initialData?.letra || '',
    orientacion: initialData?.orientacion || '',
    dormitorios: initialData?.dormitorios?.toString() || '3',
    banos: initialData?.banos?.toString() || '2',
    sup_util: initialData?.sup_util?.toString() || '',
    sup_construida: initialData?.sup_construida?.toString() || '',
    sup_terrazas: initialData?.sup_terrazas?.toString() || '0',
    sup_porche: initialData?.sup_porche?.toString() || '0',
    garaje: initialData?.garaje || 'SÍ',
    trastero: initialData?.trastero || 'SÍ',
    precio: initialData?.precio?.toString() || '',
    estado_vivienda: initialData?.estado_vivienda || 'DISPONIBLE'
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev: PropertyFormData) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const propertyData = {
        n_orden: formData.n_orden.trim(),
        planta: formData.planta.trim(),
        portal: formData.portal.trim(),
        letra: formData.letra.trim(),
        orientacion: formData.orientacion.trim(),
        dormitorios: parseInt(formData.dormitorios) || 0,
        banos: parseInt(formData.banos) || 0,
        sup_util: parseFloat(formData.sup_util) || 0,
        sup_construida: parseFloat(formData.sup_construida) || 0,
        sup_terrazas: parseFloat(formData.sup_terrazas) || 0,
        sup_porche: parseFloat(formData.sup_porche) || 0,
        garaje: formData.garaje,
        trastero: formData.trastero,
        precio: parseFloat(formData.precio) || 0,
        estado_vivienda: formData.estado_vivienda
      };

      let query = supabase
        .from('inventory')
        .select('id')
        .eq('n_orden', propertyData.n_orden);

      if (initialData?.id) {
        query = query.neq('id', initialData.id);
      }

      const { data: existing, error: checkError } = await query;

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        await showAlert({ 
          title: 'Vivienda Duplicada', 
          message: `Ya existe una vivienda con el nº de orden ${propertyData.n_orden}.` 
        });
        setLoading(false);
        return;
      }

      if (initialData?.id) {
        const { error } = await (supabase as any)
          .from('inventory')
          .update(propertyData)
          .eq('id', initialData.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('inventory')
          .insert([propertyData]);
        if (error) throw error;
      }

      onSuccess?.();
      onClose();

      if (!initialData?.id) {
        setFormData({
          n_orden: '',
          planta: '',
          portal: '',
          letra: '',
          orientacion: '',
          dormitorios: '3',
          banos: '2',
          sup_util: '',
          sup_construida: '',
          sup_terrazas: '0',
          sup_porche: '0',
          garaje: 'SÍ',
          trastero: 'SÍ',
          precio: '',
          estado_vivienda: 'DISPONIBLE'
        });
      }
    } catch (error: any) {
      console.error('Error saving property:', error);
      await showAlert({ title: 'Error', message: 'Error al guardar la propiedad: ' + (error.message || 'Error desconocido') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-altavik-600 text-white rounded-lg flex items-center justify-center shadow-md">
              <Home size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{initialData ? 'Editar Propiedad' : 'Nueva Propiedad'}</h3>
              <p className="text-xs text-slate-500">Datos técnicos del activo en Altavik</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          <form id="property-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* 1. Nº ORDEN */}
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nº Orden</label>
                <div className="relative mt-1.5">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    name="n_orden"
                    required
                    value={formData.n_orden}
                    onChange={handleChange}
                    placeholder="Ej: 01"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none text-sm font-medium text-slate-700 transition-all"
                  />
                </div>
              </div>

              {/* 2. PLANTA */}
              <div className="md:col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Planta</label>
                <input
                  name="planta"
                  required
                  value={formData.planta}
                  onChange={handleChange}
                  placeholder="Ej: BAJA"
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none text-sm font-medium text-slate-700"
                />
              </div>

              {/* 3. PORTAL */}
              <div className="md:col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Portal</label>
                <input
                  name="portal"
                  value={formData.portal}
                  onChange={handleChange}
                  placeholder="Ej: 1"
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none text-sm font-medium text-slate-700"
                />
              </div>

              {/* 4. LETRA */}
              <div className="md:col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Letra</label>
                <input
                  name="letra"
                  value={formData.letra}
                  onChange={handleChange}
                  placeholder="Ej: A"
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none text-sm font-medium text-slate-700"
                />
              </div>

              {/* 5. ORIENTACIÓN */}
              <div className="md:col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Orientación</label>
                <input
                  name="orientacion"
                  value={formData.orientacion}
                  onChange={handleChange}
                  placeholder="Ej: Norte"
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none text-sm font-medium text-slate-700"
                />
              </div>

              {/* 6. DORMITORIOS */}
              <div className="md:col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Dormitorio</label>
                <input
                  name="dormitorios"
                  type="number"
                  required
                  value={formData.dormitorios}
                  onChange={handleChange}
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none text-sm font-medium text-slate-700"
                />
              </div>

              {/* 7. BAÑOS */}
              <div className="md:col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Baños</label>
                <input
                  name="banos"
                  type="number"
                  required
                  value={formData.banos}
                  onChange={handleChange}
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none text-sm font-medium text-slate-700"
                />
              </div>

              {/* 8. SUP ÚTIL */}
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Sup. Útil (m²)</label>
                <input
                  name="sup_util"
                  type="number"
                  step="0.01"
                  required
                  value={formData.sup_util}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none text-sm font-medium text-slate-700"
                />
              </div>

              {/* 9. SUP CONSTRUIDA */}
              <div className="md:col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Sup. Const. (m²)</label>
                <input
                  name="sup_construida"
                  type="number"
                  step="0.01"
                  required
                  value={formData.sup_construida}
                  onChange={handleChange}
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none text-sm font-medium text-slate-700"
                />
              </div>

              {/* 10. SUP TERRAZAS */}
              <div className="md:col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Sup. Terrazas (m²)</label>
                <input
                  name="sup_terrazas"
                  type="number"
                  step="0.01"
                  value={formData.sup_terrazas}
                  onChange={handleChange}
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none text-sm font-medium text-slate-700"
                />
              </div>

              {/* 11. SUP PORCHE */}
              <div className="md:col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Sup. Porche (m²)</label>
                <input
                  name="sup_porche"
                  type="number"
                  step="0.01"
                  value={formData.sup_porche}
                  onChange={handleChange}
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none text-sm font-medium text-slate-700"
                />
              </div>

              {/* 12. GARAJE */}
              <div className="md:col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Garaje</label>
                <select
                  name="garaje"
                  value={formData.garaje}
                  onChange={handleChange}
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none text-sm font-medium text-slate-700"
                >
                  <option value="SÍ">SÍ</option>
                  <option value="NO">NO</option>
                </select>
              </div>

              {/* 13. TRASTERO */}
              <div className="md:col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Trastero</label>
                <select
                  name="trastero"
                  value={formData.trastero}
                  onChange={handleChange}
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none text-sm font-medium text-slate-700"
                >
                  <option value="SÍ">SÍ</option>
                  <option value="NO">NO</option>
                </select>
              </div>

              {/* 14. PRECIO */}
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Precio (€)</label>
                <div className="relative mt-1.5">
                  <Euro className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    name="precio"
                    type="number"
                    required
                    value={formData.precio}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none text-sm font-medium text-slate-700 transition-all font-bold"
                  />
                </div>
              </div>

              {/* 15. ESTADO VIVIENDA */}
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Estado de la Vivienda</label>
                <select
                  name="estado_vivienda"
                  value={formData.estado_vivienda}
                  onChange={handleChange}
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none text-sm font-medium text-slate-700 appearance-none cursor-pointer"
                >
                  <option value="DISPONIBLE">DISPONIBLE</option>
                  <option value="NO DISPONIBLE">NO DISPONIBLE</option>
                  <option value="BLOQUEADA">BLOQUEADA</option>
                  <option value="RESERVADA">RESERVADA</option>
                  <option value="CONTRATO CV">CONTRATO CV</option>
                  <option value="ESCRITURADA">ESCRITURADA</option>
                </select>
              </div>

            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-2.5 bg-altavik-600 text-white font-bold rounded-xl shadow-lg hover:bg-altavik-700 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Guardar Propiedad
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}