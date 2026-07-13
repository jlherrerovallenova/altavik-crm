import React, { useState } from 'react';
import { X, Upload, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UploadFichasModal({ isOpen, onClose, onSuccess }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{ name: string; status: 'pending' | 'success' | 'error'; message?: string }[]>([]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
      setFiles(selectedFiles);
      setResults(selectedFiles.map(f => ({ name: f.name, status: 'pending' })));
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    await Promise.all(files.map(async (file, i) => {
      const fileName = file.name.toUpperCase();
      let matchedProperties: { id: string }[] = [];

      try {
        // 1. Extraer el primer número que aparezca en el nombre (el nº de orden)
        const nOrdenMatch = fileName.match(/(\d+)/);
        const nOrden = nOrdenMatch ? nOrdenMatch[1] : null;

        if (!nOrden) {
          setResults(prev => {
            const next = [...prev];
            next[i] = { name: file.name, status: 'error', message: 'El nombre del archivo no contiene un número de orden' };
            return next;
          });
          return;
        }

        // 2. Buscar en la base de datos por n_orden
        const { data, error: findError } = await (supabase as any)
          .from('inventory')
          .select('id')
          .eq('n_orden', nOrden);

        if (findError) throw findError;

        if (!data || data.length === 0) {
          setResults(prev => {
            const next = [...prev];
            next[i] = { name: file.name, status: 'error', message: `No existe la vivienda con Nº Orden ${nOrden} en la base de datos` };
            return next;
          });
          return;
        }

        matchedProperties = data;

        // 3. Subir a Storage
        const filePath = `fichas/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('property-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 4. Obtener URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('property-files')
          .getPublicUrl(filePath);

        // 5. Asociar en la tabla inventory en paralelo
        await Promise.all(matchedProperties.map(p => 
          (supabase as any).from('inventory').update({ ficha_url: publicUrl }).eq('id', p.id)
        ));

        setResults(prev => {
          const next = [...prev];
          next[i] = { name: file.name, status: 'success', message: `Asociada(s) a vivienda(s) Nº ${nOrden}` };
          return next;
        });

      } catch (error: any) {
        setResults(prev => {
          const next = [...prev];
          next[i] = { name: file.name, status: 'error', message: error.message };
          return next;
        });
      }
    }));

    setUploading(false);
    if (onSuccess) onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Subir Fichas PDF</h2>
              <p className="text-sm text-slate-500">Asocia automáticamente los PDFs por el número de orden.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {files.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
              <Upload size={48} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-600 font-bold mb-2">Selecciona las fichas PDF</p>
              <p className="text-sm text-slate-400 mb-6">El nombre debe contener el número de orden (ej: 1.pdf, Vivienda 2.pdf)</p>
              <input
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center gap-2 bg-altavik-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-altavik-700 transition-all cursor-pointer"
              >
                Elegir Archivos
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((res, idx) => (
                // react-doctor-disable-next-line no-array-index-as-key
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{res.name}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                        {res.status === 'success' && <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold"><Check size={16} /> LISTO</div>}
                        {res.status === 'error' && <div className="flex items-center gap-1 text-red-600 text-xs font-bold"><AlertCircle size={16} /> ERROR</div>}
                        {res.status === 'pending' && <div className="text-slate-400 text-xs font-bold">ESPERANDO...</div>}
                    </div>
                    {res.status === 'error' && res.message && (
                        <p className="text-[10px] text-red-400 font-medium max-w-[200px] text-right leading-tight">
                            {res.message}
                        </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <button type="button"
            onClick={onClose}
            className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
          >
            {results.some(r => r.status === 'success') ? 'Cerrar' : 'Cancelar'}
          </button>
          {files.length > 0 && !results.every(r => r.status === 'success') && (
            <button type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="px-8 py-3 bg-altavik-600 text-white font-bold rounded-xl shadow-lg hover:bg-altavik-700 transition-all active:scale-95 flex items-center gap-2"
            >
              {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
              <span>{uploading ? 'Subiendo...' : 'Iniciar Carga'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
