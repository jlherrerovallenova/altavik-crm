import { useState, useMemo } from 'react';
import { X, Search, Building2, Check, Plus, Home, Loader2, Filter } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';

interface Property {
  id: string;
  n_orden: string;
  planta: string;
  portal: string;
  letra: string;
  precio: number;
  estado_vivienda?: string;
  sup_util: number;
  dormitorios: number;
  banos: number;
  orientacion: string;
  ficha_url?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (properties: Property[]) => void;
  alreadySelected?: string[]; // IDs of properties already selected
}

export default function PropertySelector({ isOpen, onClose, onSelect, alreadySelected = [] }: Props) {
  const { data: properties = [], isLoading } = useInventory();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filters
  const [portal, setPortal] = useState('');
  const [planta, setPlanta] = useState('');
  const [letra, setLetra] = useState('');
  const [orientacion, setOrientacion] = useState('');
  const [dormitorios, setDormitorios] = useState('');

  const uniquePortals = useMemo(() => Array.from(new Set(properties.map(p => p.portal).filter(Boolean))).sort(), [properties]);
  const uniquePlantas = useMemo(() => Array.from(new Set(properties.map(p => p.planta).filter(Boolean))).sort(), [properties]);
  const uniqueLetras = useMemo(() => Array.from(new Set(properties.map(p => p.letra).filter(Boolean))).sort(), [properties]);
  const uniqueOrientaciones = useMemo(() => Array.from(new Set(properties.map(p => p.orientacion).filter(Boolean))).sort(), [properties]);
  const uniqueDormitorios = useMemo(() => Array.from(new Set(properties.map(p => p.dormitorios.toString()).filter(Boolean))).sort((a,b) => parseInt(a)-parseInt(b)), [properties]);

  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      const matchPortal = !portal || p.portal === portal;
      const matchPlanta = !planta || p.planta === planta;
      const matchLetra = !letra || p.letra === letra;
      const matchOrientacion = !orientacion || p.orientacion === orientacion;
      const matchDormitorios = !dormitorios || p.dormitorios.toString() === dormitorios;
      const isAvailable = p.estado_vivienda === 'DISPONIBLE';
      return matchPortal && matchPlanta && matchLetra && matchOrientacion && matchDormitorios && isAvailable;
    });
  }, [properties, portal, planta, letra, orientacion, dormitorios]);

  const toggleProperty = (id: string) => {
    if (alreadySelected.includes(id)) return;
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleFinish = () => {
    const selectedObjects = properties.filter(p => selectedIds.includes(p.id)) as unknown as Property[];
    onSelect(selectedObjects);
    setSelectedIds([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-6xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[100dvh] sm:h-[80vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-altavik-600 text-white flex items-center justify-center">
              <Plus size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Seleccionar Viviendas</h2>
              <p className="text-xs text-slate-500 font-medium">Filtra por portal, altura, letra, orientación y dormitorios</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl transition-all shadow-sm">
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 sm:p-6 bg-white border-b border-slate-100 flex flex-wrap gap-3 sm:gap-4 items-end overflow-y-auto max-h-[30vh] sm:max-h-none shrink-0 custom-scrollbar">
          <div className="flex-1 min-w-[120px] sm:min-w-[140px] space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Portal</label>
            <div className="relative">
              <select 
                value={portal} 
                onChange={e => setPortal(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-altavik-500/20 outline-none appearance-none cursor-pointer"
              >
                <option value="">Todos</option>
                {uniquePortals.map(p => <option key={p} value={p}>Portal {p}</option>)}
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
            </div>
          </div>

          <div className="flex-1 min-w-[120px] sm:min-w-[140px] space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Altura (Planta)</label>
            <div className="relative">
              <select 
                value={planta} 
                onChange={e => setPlanta(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-altavik-500/20 outline-none appearance-none cursor-pointer"
              >
                <option value="">Todas</option>
                {uniquePlantas.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
            </div>
          </div>

          <div className="flex-1 min-w-[120px] sm:min-w-[140px] space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Letra</label>
            <div className="relative">
              <select 
                value={letra} 
                onChange={e => setLetra(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-altavik-500/20 outline-none appearance-none cursor-pointer"
              >
                <option value="">Todas</option>
                {uniqueLetras.map(l => <option key={l} value={l}>Letra {l}</option>)}
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
            </div>
          </div>

          <div className="flex-1 min-w-[120px] sm:min-w-[140px] space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Orientación</label>
            <div className="relative">
              <select 
                value={orientacion} 
                onChange={e => setOrientacion(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-altavik-500/20 outline-none appearance-none cursor-pointer"
              >
                <option value="">Todas</option>
                {uniqueOrientaciones.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
            </div>
          </div>

          <div className="flex-1 min-w-[120px] sm:min-w-[140px] space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dormitorios</label>
            <div className="relative">
              <select 
                value={dormitorios} 
                onChange={e => setDormitorios(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-altavik-500/20 outline-none appearance-none cursor-pointer"
              >
                <option value="">Todos</option>
                {uniqueDormitorios.map(d => <option key={d} value={d}>{d} Dorm.</option>)}
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
            </div>
          </div>

          <button type="button" 
            onClick={() => { setPortal(''); setPlanta(''); setLetra(''); setOrientacion(''); setDormitorios(''); }}
            className="px-4 py-2.5 text-slate-400 hover:text-red-500 font-bold text-xs transition-colors"
          >
            Resetear
          </button>
        </div>

        {/* Property Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/30 custom-scrollbar">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-altavik-600" size={32} />
              <p className="text-slate-400 font-bold">Cargando inventario...</p>
            </div>
          ) : filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

              {filteredProperties.map(p => {
                const isSelected = selectedIds.includes(p.id);
                const isAlreadyIn = alreadySelected.includes(p.id);
                
                return (
                  <button type="button"
                    key={p.id}
                    onClick={() => toggleProperty(p.id)}
                    disabled={isAlreadyIn}
                    className={`relative p-5 rounded-3xl border-2 text-left transition-all duration-300 ${
                      isSelected 
                        ? 'bg-altavik-50 border-altavik-500 shadow-lg shadow-altavik-100 -translate-y-1' 
                        : isAlreadyIn
                          ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                          : 'bg-white border-slate-100 hover:border-altavik-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-altavik-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                        <Home size={18} />
                      </div>
                      {(isSelected || isAlreadyIn) && (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${isAlreadyIn ? 'bg-slate-300' : 'bg-altavik-500 animate-in zoom-in-50'}`}>
                          <Check size={14} />
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <h4 className="text-lg font-black text-slate-900 leading-none">P{p.portal} · {p.planta} - {p.letra}</h4>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Orden: {p.n_orden}</p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-end">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        {p.sup_util.toFixed(2)} m² · {p.dormitorios}D / {p.banos}B
                      </div>
                      <div className="text-sm font-black text-altavik-600">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p.precio)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
               <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                  <Search size={40} />
               </div>
               <div>
                  <h3 className="text-slate-900 font-black text-lg">No hay viviendas disponibles</h3>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto">Prueba a cambiar los filtros o busca en otro portal.</p>
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-8 py-4 sm:py-6 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div className="text-sm font-bold text-slate-500 hidden sm:block">
            {selectedIds.length} vivienda(s) seleccionada(s)
          </div>
          <div className="text-sm font-bold text-slate-500 sm:hidden">
            {selectedIds.length} selecc.
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button type="button" 
              onClick={onClose}
              className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button type="button" 
              onClick={handleFinish}
              disabled={selectedIds.length === 0}
              className="px-8 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 disabled:opacity-30 active:scale-95 transition-all"
            >
              Añadir {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
