import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2, AlertCircle, Upload, FileSpreadsheet, CheckCircle, Settings2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const INVENTORY_FIELDS = [
  { key: 'n_orden', label: 'Nº Orden', required: true },
  { key: 'planta', label: 'Planta', required: false },
  { key: 'portal', label: 'Portal', required: false },
  { key: 'letra', label: 'Letra', required: false },
  { key: 'orientacion', label: 'Orientación', required: false },
  { key: 'dormitorios', label: 'Dormitorios', required: false, type: 'number' },
  { key: 'banos', label: 'Baños', required: false, type: 'number' },
  { key: 'sup_util', label: 'Sup. Útil (m²)', required: false, type: 'number' },
  { key: 'sup_construida', label: 'Sup. Const. (m²)', required: false, type: 'number' },
  { key: 'sup_terrazas', label: 'Sup. Terrazas (m²)', required: false, type: 'number' },
  { key: 'sup_porche', label: 'Sup. Porche (m²)', required: false, type: 'number' },
  { key: 'garaje', label: 'Garaje (SÍ/NO)', required: false },
  { key: 'trastero', label: 'Trastero (SÍ/NO)', required: false },
  { key: 'precio', label: 'Precio (€)', required: true, type: 'number' },
  { key: 'estado_vivienda', label: 'Estado', required: false }
];

export default function ImportInventoryModal({ isOpen, onClose, onSuccess }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setStep(1);
    setLoading(false);
    setErrorMsg(null);
    setFileName('');
    setHeaders([]);
    setRawData([]);
    setMapping({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (data.length < 2) {
          throw new Error('El archivo no contiene suficientes datos (mínimo cabecera y una fila).');
        }

        const fileHeaders = data[0].map((h: any) => String(h || '').trim());
        const contentRows = XLSX.utils.sheet_to_json(ws) as any[];

        setHeaders(fileHeaders);
        setRawData(contentRows);

        // Intento de auto-mapping básico
        const initialMapping: Record<string, string> = {};
        INVENTORY_FIELDS.forEach(field => {
          const match = fileHeaders.find(h => 
            h.toLowerCase() === field.label.toLowerCase() || 
            h.toLowerCase() === field.key.toLowerCase() ||
            h.toLowerCase().includes(field.label.toLowerCase())
          );
          if (match) initialMapping[field.key] = match;
        });
        setMapping(initialMapping);

        setStep(2);
      } catch (err: any) {
        setErrorMsg(err.message || 'Error al procesar el archivo.');
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Error de lectura del archivo.');
      setLoading(false);
    };

    reader.readAsBinaryString(file);
  };

  const handleMappingChange = (fieldKey: string, fileHeader: string) => {
    setMapping(prev => ({ ...prev, [fieldKey]: fileHeader }));
  };

  const handleImport = async () => {
    // Validar campos obligatorios
    const missing = INVENTORY_FIELDS.filter(f => f.required && !mapping[f.key]);
    if (missing.length > 0) {
      setErrorMsg(`Por favor, mapea los campos obligatorios: ${missing.map(f => f.label).join(', ')}`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const formattedData = rawData.map(row => {
        const item: any = {};
        INVENTORY_FIELDS.forEach(field => {
          const fileHeader = mapping[field.key];
          let value = fileHeader ? row[fileHeader] : undefined;

          if (field.type === 'number') {
            const num = parseFloat(String(value).replace(/[^0-9.,-]/g, '').replace(',', '.'));
            item[field.key] = isNaN(num) ? 0 : num;
          } else {
            item[field.key] = value !== undefined ? String(value).trim() : null;
          }
        });
        return item;
      });

      const { error } = await (supabase as any).from('inventory').insert(formattedData);
      if (error) throw error;

      setStep(3);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg(err.message || 'Error al guardar los datos en Supabase.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="text-altavik-600" />
              Importar Catálogo de Viviendas
            </h2>
            <p className="text-sm text-slate-500 mt-1">Sube tu Excel y relaciona las columnas con los campos del sistema.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-lg">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 hover:bg-slate-100/50 transition-all cursor-pointer group"
                 onClick={() => fileInputRef.current?.click()}>
              <div className="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Upload className="text-altavik-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Sube tu archivo .xlsx, .xls o .csv</h3>
              <p className="text-slate-500 text-sm max-w-sm text-center">Haz clic para buscar o arrastra el documento aquí.</p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
              {loading && <Loader2 className="animate-spin text-altavik-600 mt-6" size={32} />}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-altavik-50 p-4 rounded-2xl border border-altavik-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-altavik-600" size={20} />
                  <span className="text-altavik-900 font-bold">Archivo Cargado: <span className="text-altavik-700">{fileName}</span></span>
                </div>
                <button onClick={() => setStep(1)} className="text-xs font-bold text-altavik-600 hover:underline">Cambiar archivo</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div className="col-span-1 md:col-span-2 flex items-center gap-2 mb-2">
                  <Settings2 size={18} className="text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Mapeo de Columnas</h3>
                </div>
                
                {INVENTORY_FIELDS.map(field => (
                  <div key={field.key} className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 bg-white hover:border-altavik-200 transition-colors">
                    <label className="text-xs font-bold text-slate-600 flex items-center justify-between">
                      {field.label}
                      {field.required && <span className="text-red-500 text-[10px] bg-red-50 px-1.5 py-0.5 rounded">Obligatorio</span>}
                    </label>
                    <select
                      value={mapping[field.key] || ''}
                      onChange={(e) => handleMappingChange(field.key, e.target.value)}
                      className="w-full text-xs py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-altavik-500/20 outline-none font-medium cursor-pointer"
                    >
                      <option value="">-- No importar --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-altavik-100 text-altavik-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle size={48} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">¡Importación Exitosa!</h2>
              <p className="text-slate-500 mt-2">Se han importado {rawData.length} viviendas correctamente.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
          {step === 2 && (
            <>
              <button onClick={onClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all">
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                Confirmar Importación ({rawData.length})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
