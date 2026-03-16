// src/pages/Settings.tsx
import React, { useState, useEffect } from 'react';
import {
  Save,
  FileText,
  Trash2,
  Eye,
  EyeOff,
  Edit3,
  Loader2,
  Search,
  Download,
  X,
  Settings as SettingsIcon,
  User as UserIcon,
  FolderOpen,
  Upload,
  FolderLock,
  KeyRound,
  CheckCircle2,
  Mail
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useDocuments, DOCUMENT_CATEGORIES } from '../hooks/useDocuments';
import type { SystemDocument } from '../hooks/useDocuments';
import { useQueryClient } from '@tanstack/react-query';

const Settings: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const { showConfirm, showAlert } = useDialog();
  const queryClient = useQueryClient();

  // Estados de Navegación y UI
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'integrations'>('profile');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Estados de Integraciones
  const [resendApiKey, setResendApiKey] = useState('');
  const [unlayerProjectId, setUnlayerProjectId] = useState('');
  const [isSavingResend, setIsSavingResend] = useState(false);
  const [isSavingUnlayer, setIsSavingUnlayer] = useState(false);
  const [showResendApiKey, setShowResendApiKey] = useState(false);

  // Estados de Documentos
  const { data: documents = [], isLoading: loadingDocs } = useDocuments();
  const [searchTerm, setSearchTerm] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Categoría seleccionada por defecto para subir
  const [uploadCategory, setUploadCategory] = useState<string>(DOCUMENT_CATEGORIES[0]);

  // Renombrado
  const [isEditingDoc, setIsEditingDoc] = useState<{ fullPath: string; category: string } | null>(null);
  const [newName, setNewName] = useState('');

  // Estados de Formulario de Perfil
  const [fullName, setFullName] = useState(profile?.full_name || '');

  // Sincronizar nombre de perfil cuando cargue el contexto
  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
    fetchIntegrations();
  }, [profile]);

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .in('key', ['resend_api_key', 'unlayer_project_id']);

      if (error) throw error;
      if (data) {
        const resend = data.find((s: any) => s.key === 'resend_api_key') as any;
        const unlayer = data.find((s: any) => s.key === 'unlayer_project_id') as any;
        if (resend) setResendApiKey(resend.value || '');
        if (unlayer) setUnlayerProjectId(unlayer.value || '');
      }
    } catch (err) {
      console.error('Error fetching integrations:', err);
    }
  };

  // --- Lógica de Perfil ---
  const handleUpdateProfile = async () => {
    if (!profile?.id) return;
    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        // @ts-expect-error
        .update({ full_name: fullName })
        .eq('id', profile.id);

      if (error) throw error;
      await refreshProfile();
      await showAlert({ title: 'Éxito', message: 'Perfil actualizado correctamente' });
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      await showAlert({ title: 'Error', message: 'No se pudo actualizar el perfil' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --- Lógica de Integraciones ---
  const handleSaveIntegration = async (key: string, value: string, setLoading: (l: boolean) => void) => {
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('settings')
        .upsert({ key, value }, { onConflict: 'key' });

      if (error) throw error;
      await showAlert({ title: 'Éxito', message: 'Configuración guardada correctamente' });
    } catch (err) {
      console.error(`Error saving ${key}:`, err);
      await showAlert({ title: 'Error', message: `No se pudo guardar la integración` });
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async (doc: SystemDocument, newCategory: string) => {
    if (doc.category === newCategory) return;

    const newFullPath = newCategory === 'Sin Categorizar' ? doc.name : `${newCategory}/${doc.name}`;

    try {
      const { error } = await supabase.storage.from('documents').move(doc.fullPath, newFullPath);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['system_documents'] });
    } catch (error) {
      console.error('Error moviendo documento:', error);
      await showAlert({ title: 'Error', message: 'El archivo ya existe en el destino o hubo un error de red.' });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const duplicateFiles: string[] = [];

      const uploadPromises = Array.from(files).map(async (file) => {
        const fullPath = `${uploadCategory}/${file.name}`;
        const { error } = await supabase.storage.from('documents').upload(fullPath, file);

        if (error) {
          if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
            duplicateFiles.push(file.name);
          } else {
            console.error(`Error al subir ${file.name}:`, error);
          }
        }
      });

      // Ejecutar todas las subidas en paralelo
      await Promise.all(uploadPromises);

      if (duplicateFiles.length > 0) {
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
      event.target.value = ''; // Limpiar el input para permitir subir los mismos archivos tras borrarlos
    }
  };

  const handleDelete = async (doc: SystemDocument) => {
    const confirmed = await showConfirm({
      title: 'Eliminar Archivo',
      message: `¿Estás seguro de que deseas eliminar "${doc.name}" de la categoría "${doc.category}"? Esta acción será para todos los usuarios.`,
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
      setPreviewUrl(data.signedUrl);
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
      const newFullPath = `${oldDoc.category}/${newName}`;
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

  // Filtrado de la lista por término de búsqueda antes de agruparlos
  const searchedDocs = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Encabezado Principal */}
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="text-altavik-600" size={24} />
        <h1 className="text-xl font-bold text-slate-800">Configuración del Sistema</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Navegación Lateral (Sidebar) */}
        <div className="w-full md:w-56 flex flex-col gap-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'profile'
              ? 'bg-altavik-600 text-white shadow-sm'
              : 'hover:bg-slate-100 text-slate-600'
              }`}
          >
            <UserIcon size={16} />
            <span className="font-medium">Mi Perfil</span>
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'documents'
              ? 'bg-altavik-600 text-white shadow-sm'
              : 'hover:bg-slate-100 text-slate-600'
              }`}
          >
            <FolderOpen size={16} />
            <span className="font-medium">Documentos Venta</span>
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'integrations'
              ? 'bg-altavik-600 text-white shadow-sm'
              : 'hover:bg-slate-100 text-slate-600'
              }`}
          >
            <SettingsIcon size={16} />
            <span className="font-medium">Integraciones</span>
          </button>
        </div>

        {/* Panel de Contenido */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">

          {/* VISTA: PERFIL */}
          {activeTab === 'profile' && (
            <div className="p-6 space-y-6 animate-in fade-in duration-300">
              <div className="border-b pb-2">
                <h2 className="text-lg font-semibold text-slate-800">Información Personal</h2>
                <p className="text-xs text-slate-500">Actualiza tus datos de contacto y visualización.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase">Nombre Completo</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all"
                    placeholder="Tu nombre"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase">Rol Asignado</label>
                  <div className="p-2.5 text-sm bg-slate-50 border rounded-lg text-slate-500 italic">
                    {profile?.role || 'Cargando...'}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleUpdateProfile}
                  disabled={isSavingProfile}
                  className="flex items-center gap-2 bg-altavik-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-altavik-700 transition-colors disabled:opacity-50"
                >
                  {isSavingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Guardar Cambios
                </button>
              </div>
            </div>
          )}

          {/* VISTA: INTEGRACIONES */}
          {activeTab === 'integrations' && (
            <div className="p-6 space-y-6 animate-in fade-in duration-300">
              <div className="border-b pb-2">
                <h2 className="text-lg font-semibold text-slate-800">Integraciones de Terceros</h2>
                <p className="text-xs text-slate-500">Configura las claves API para los servicios externos que utiliza el CRM.</p>
              </div>

              <div className="space-y-6 max-w-2xl">
                {/* Unlayer Project ID */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        Unlayer Project ID
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Necesario para el editor visual de Newsletters.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={unlayerProjectId}
                      onChange={(e) => setUnlayerProjectId(e.target.value)}
                      className="flex-1 p-2.5 text-sm border bg-white rounded-lg outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all font-mono"
                      placeholder="Ej. 285017"
                    />
                    <button
                      onClick={() => handleSaveIntegration('unlayer_project_id', unlayerProjectId, setIsSavingUnlayer)}
                      disabled={isSavingUnlayer}
                      className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {isSavingUnlayer ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}
                    </button>
                  </div>
                </div>

                {/* Resend API Key */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center shrink-0">
                        <Mail size={17} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">Resend API Key</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Necesaria para el envío de emails transaccionales desde el CRM.</p>
                      </div>
                    </div>
                    {resendApiKey && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-altavik-700 bg-altavik-50 border border-emerald-200 rounded-full px-2.5 py-1">
                        <CheckCircle2 size={12} /> Configurada
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clave API (Backend)</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input
                          type={showResendApiKey ? 'text' : 'password'}
                          value={resendApiKey}
                          onChange={(e) => setResendApiKey(e.target.value)}
                          className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 bg-white rounded-lg outline-none focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 transition-all font-mono text-slate-700"
                          placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResendApiKey(!showResendApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          title={showResendApiKey ? 'Ocultar' : 'Mostrar'}
                        >
                          {showResendApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      <button
                        onClick={() => handleSaveIntegration('resend_api_key', resendApiKey, setIsSavingResend)}
                        disabled={isSavingResend || !resendApiKey.trim()}
                        className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isSavingResend ? <Loader2 size={16} className="animate-spin" /> : <Save size={15} />}
                        {isSavingResend ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 pt-1">
                      Esta clave se almacena de forma segura en la base de datos para que las funciones del servidor puedan enviar correos.
                      Obtenla en{' '}
                      <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="text-altavik-600 hover:underline font-medium">resend.com/api-keys</a>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VISTA: DOCUMENTOS CLASIFICADOS */}
          {activeTab === 'documents' && (
            <div className="flex flex-col h-full animate-in fade-in duration-300">
              {/* Barra de Herramientas superior */}
              <div className="p-4 border-b bg-slate-50/50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-tight">Repositorio de Archivos</h2>
                  <p className="text-[11px] text-slate-500">Documentos que se podrán adjuntar en Emails y WhatsApps a los clientes.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                  {/* Buscador */}
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

                  {/* Selector de Categoría para Subida */}
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 bg-white border pr-1 rounded-lg">
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="opacity-90 outline-none text-sm font-medium bg-transparent border-none py-2 px-3 text-slate-700 w-full sm:w-auto cursor-pointer"
                    >
                      {DOCUMENT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <div className="h-4 w-px bg-slate-200"></div>
                    <label className={`flex items-center justify-center gap-1.5 px-3 py-1.5 my-1 ml-1 rounded text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${isUploading ? 'bg-slate-100 text-slate-400' : 'bg-altavik-600 text-white shadow-sm hover:bg-altavik-700'}`}>
                      {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      <span>Subir</span>
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
              </div>

              {/* Listado de Documentos Agrupados por Categoría */}
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
                    {['Sin Categorizar', ...DOCUMENT_CATEGORIES].map(categoryName => {
                      const categoryDocs = searchedDocs.filter(d => d.category === categoryName);
                      if (categoryDocs.length === 0) return null;

                      return (
                        <div key={categoryName} className="mb-6">
                          <div className="bg-slate-100/80 px-4 py-2 flex items-center gap-2 border-y border-slate-200 sticky top-0 z-10 backdrop-blur-sm">
                            <FolderOpen size={16} className={categoryName === 'Sin Categorizar' ? 'text-amber-600' : 'text-altavik-700'} />
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{categoryName}</h3>
                            <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-bold ml-auto">
                              {categoryDocs.length} archivo{categoryDocs.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <table className="w-full text-left border-collapse table-fixed">
                            <tbody className="divide-y divide-slate-50">
                              {categoryDocs.map((doc) => (
                                <tr key={doc.id} className="hover:bg-altavik-50/20 transition-colors group">
                                  <td className="px-6 py-3 w-1/2">
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
                                  <td className="px-4 py-3 text-xs font-medium text-slate-400 w-24 hidden sm:table-cell">
                                    {doc.metadata?.size ? (doc.metadata.size / 1024).toFixed(1) : 'N/A'} KB
                                  </td>
                                  <td className="px-4 py-3 text-xs text-slate-400 w-32 hidden md:table-cell">
                                    {new Date(doc.updated_at).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                    <div className="flex justify-end items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                      {/* Selector de reubicación */}
                                      <select
                                        value={doc.category}
                                        onChange={(e) => handleMove(doc, e.target.value)}
                                        className="text-xs bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-600 outline-none hover:border-altavik-400 hover:text-altavik-700 cursor-pointer mr-2 max-w-[120px] truncate"
                                        title="Mover a otra categoría"
                                      >
                                        <option value="Sin Categorizar">Mover a...</option>
                                        {DOCUMENT_CATEGORIES.map(c => (
                                          <option key={c} value={c}>{c}</option>
                                        ))}
                                      </select>

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
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE VISTA PREVIA */}
      {previewUrl && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b flex justify-between items-center bg-white">
              <div className="flex items-center gap-2">
                <FileText className="text-altavik-600" size={20} />
                <span className="text-sm font-bold text-slate-700">Visor de Documentación</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-altavik-50 text-altavik-700 rounded-lg text-xs font-bold hover:bg-altavik-100 transition-colors"
                >
                  <Download size={14} /> Abrir Externa
                </a>
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 relative">
              <iframe
                src={previewUrl}
                className="w-full h-full border-none shadow-inner"
                title="Document Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;