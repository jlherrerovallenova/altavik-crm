import React, { useState } from 'react';
import { 
  FileText, Search, Upload, Loader2, FolderLock, 
  Eye, Edit3, Trash2, Save, X 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useDialog } from '../../context/DialogContext';
import { useDocuments, type SystemDocument } from '../../hooks/useDocuments';
import { useQueryClient } from '@tanstack/react-query';

export function DocumentsTab() {
  const { showAlert, showConfirm } = useDialog();
  const queryClient = useQueryClient();
  const { data: documents = [], isLoading: loadingDocs } = useDocuments();
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingDoc, setIsEditingDoc] = useState<{ fullPath: string; category: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const duplicateFiles: string[] = [];
      const uploadErrors: string[] = [];

      const uploadPromises = Array.from(files).map(async (file) => {
        const fullPath = `Documentos Olivo/${file.name}`;
        const { error } = await supabase.storage.from('documents').upload(fullPath, file);

        if (error) {
          if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
            duplicateFiles.push(file.name);
          } else {
            console.error(`Error al subir ${file.name}:`, error);
            uploadErrors.push(`${file.name}: ${error.message}`);
          }
        }
      });

      await Promise.all(uploadPromises);

      if (uploadErrors.length > 0) {
        await showAlert({
          title: 'Error de Permisos en Base de Datos',
          message: `El servidor de Supabase bloqueó la subida.\n\nDetalle técnico:\n${uploadErrors.join('\n')}`
        });
      } else if (duplicateFiles.length > 0) {
        await showAlert({
          title: 'Atención',
          message: `Se subieron los archivos, pero los siguientes ya existían y se omitieron:\n\n${duplicateFiles.join(', ')}`
        });
      }

      queryClient.invalidateQueries({ queryKey: ['system_documents'] });
    } catch (error) {
      console.error('Error general de subida:', error);
      await showAlert({ title: 'Error', message: 'Hubo un error de red al procesar los archivos.' });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (doc: SystemDocument) => {
    const confirmed = await showConfirm({
      title: 'Eliminar Archivo',
      message: `¿Estás seguro de que deseas eliminar "${doc.name}"? Esta acción será para todos los usuarios.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase.storage.from('documents').remove([doc.fullPath]);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['system_documents'] });
    } catch (error) {
      console.error('Error al borrar documento:', error);
      await showAlert({ title: 'Error', message: 'El archivo está bloqueado o hubo un error de red.' });
    }
  };

  const handlePreview = async (fullPath: string) => {
    try {
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(fullPath, 60);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (ignore) {
      await showAlert({ title: 'Error', message: 'No se pudo generar la vista temporizada del archivo.' });
    }
  };

  const handleRename = async (oldDoc: { fullPath: string; category: string; name: string }) => {
    if (!newName || oldDoc.name === newName) {
      setIsEditingDoc(null);
      return;
    }

    try {
      const folderPrefix = oldDoc.fullPath.substring(0, oldDoc.fullPath.lastIndexOf('/'));
      const newFullPath = folderPrefix ? `${folderPrefix}/${newName}` : newName;
      const { error } = await supabase.storage.from('documents').move(oldDoc.fullPath, newFullPath);
      if (error) throw error;

      setIsEditingDoc(null);
      setNewName('');
      queryClient.invalidateQueries({ queryKey: ['system_documents'] });
    } catch (error) {
      console.error('Error renombrando documento:', error);
      await showAlert({ title: 'Error', message: 'Error renombrando el archivo o extensión inválida.' });
    }
  };

  const searchedDocs = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="p-4 border-b bg-slate-50/50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-tight">Repositorio de Archivos</h2>
          <p className="text-[11px] text-slate-500">Documentos que se podrán adjuntar en Emails y WhatsApps a los clientes.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="relative w-full sm:w-56 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Filtrar..."
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <label className={`flex items-center justify-center gap-2 px-4 py-2 w-full sm:w-auto rounded-lg text-sm font-bold transition-all cursor-pointer whitespace-nowrap shadow-sm shrink-0 ${isUploading ? 'bg-slate-100 text-slate-400 border border-slate-200' : 'bg-altavik-600 text-white hover:bg-altavik-700'}`}>
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            <span>{isUploading ? 'Subiendo...' : 'Subir Documento'}</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        {loadingDocs ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="animate-spin text-altavik-600" size={32} />
            <span className="text-sm font-medium text-slate-400 animate-pulse">Explorando carpetas de Supabase...</span>
          </div>
        ) : searchedDocs.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center opacity-60">
            <FolderLock size={48} className="text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold">Sin Documentos</p>
            <p className="text-slate-400 text-sm mt-1">No hay archivos coincidentes en el servidor central o en tu búsqueda.</p>
          </div>
        ) : (
          <div className="pb-10">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-slate-100/80 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/2">Archivo</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24 hidden sm:table-cell">Tamaño</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32 hidden md:table-cell">Fecha</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {searchedDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-altavik-50/20 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-slate-400 shrink-0 group-hover:text-altavik-500 transition-colors" />
                        {isEditingDoc?.fullPath === doc.fullPath ? (
                          <div className="flex items-center gap-1 flex-1">
                            <input
                              autoFocus
                              className="text-sm font-medium border-altavik-500 border-2 rounded px-2 py-1 outline-none w-full bg-white shadow-inner"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename({ fullPath: doc.fullPath, category: doc.category, name: doc.name });
                                if (e.key === 'Escape') setIsEditingDoc(null);
                              }}
                            />
                            <button onClick={() => handleRename({ fullPath: doc.fullPath, category: doc.category, name: doc.name })} className="text-altavik-600 p-1 hover:bg-altavik-100 rounded shrink-0"><Save size={16} /></button>
                            <button onClick={() => setIsEditingDoc(null)} className="text-slate-400 p-1 hover:bg-slate-200 rounded shrink-0"><X size={16} /></button>
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-slate-700 truncate block" title={doc.name}>{doc.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-400 hidden sm:table-cell">
                      {doc.metadata?.size ? (doc.metadata.size / 1024).toFixed(1) : 'N/A'} KB
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell">
                      {new Date(doc.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handlePreview(doc.fullPath)}
                          className="p-1.5 text-slate-400 hover:text-altavik-600 hover:bg-altavik-100 rounded-md"
                          title="Previsualizar"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => { setIsEditingDoc({ fullPath: doc.fullPath, category: doc.category }); setNewName(doc.name); }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-md"
                          title="Renombrar Archivo"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-md"
                          title="Borrar Archivo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
