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
  Mail,
  Home,
  Plus,
  Users
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useDocuments } from '../hooks/useDocuments';
import type { SystemDocument } from '../hooks/useDocuments';
import { useQueryClient } from '@tanstack/react-query';
import CreatePropertyModal from '../components/inventory/CreatePropertyModal';
import ImportInventoryModal from '../components/inventory/ImportInventoryModal';
import UploadFichasModal from '../components/inventory/UploadFichasModal';
import ExportLeadsModal from '../components/leads/ExportLeadsModal';
import ImportLeadsModal from '../components/leads/ImportLeadsModal';
import { AppNotification } from '../components/AppNotification';

const Settings: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const { showConfirm, showAlert } = useDialog();
  const queryClient = useQueryClient();

  // Estados de Navegación y UI
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'integrations' | 'inventory' | 'clients'>('profile');
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

  // Categoría seleccionada por defecto para subir (Eliminada - Todo va a General)
  // const [uploadCategory, setUploadCategory] = useState<string>(DOCUMENT_CATEGORIES[0]);

  // Renombrado
  const [isEditingDoc, setIsEditingDoc] = useState<{ fullPath: string; category: string } | null>(null);
  const [newName, setNewName] = useState('');
  
  // Estados para Viviendas
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFichasModalOpen, setIsFichasModalOpen] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, title: '', message: '', type: 'success' });

  const [properties, setProperties] = useState<any[]>([]);
  const [propertyToDeleteSettings, setPropertyToDeleteSettings] = useState<string>('');
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  // Estados para Clientes
  const [isImportLeadsModalOpen, setIsImportLeadsModalOpen] = useState(false);
  const [isExportLeadsModalOpen, setIsExportLeadsModalOpen] = useState(false);
  const [leadsForSettings, setLeadsForSettings] = useState<any[]>([]);
  const [leadToDeleteSettings, setLeadToDeleteSettings] = useState<string>('');
  const [isDeletingLead, setIsDeletingLead] = useState(false);

  // Estados de Formulario de Perfil
  const [fullName, setFullName] = useState(profile?.full_name || '');

  // Sincronizar nombre de perfil cuando cargue el contexto
  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
    fetchIntegrations();
  }, [profile]);

  useEffect(() => {
    if (activeTab === 'inventory') {
      const fetchPropertiesList = async () => {
        try {
          const { data, error } = await supabase.from('inventory').select('id, n_orden, portal, planta, letra');
          if (error) throw error;
          
          // Ordenar numéricamente por n_orden (1, 2, 3... en lugar de 1, 10, 11...)
          const sorted = (data || []).sort((a: any, b: any) => {
            const valA = a.n_orden || '';
            const valB = b.n_orden || '';
            const numA = parseInt(valA) || 0;
            const numB = parseInt(valB) || 0;
            if (numA !== numB) return numA - numB;
            return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
          });
          setProperties(sorted);
        } catch (err) {
          console.error(err);
        }
      };
      fetchPropertiesList();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'clients') {
      const fetchLeadsList = async () => {
        try {
          const { data, error } = await supabase
            .from('leads')
            .select('id, name, email')
            .order('name', { ascending: true });
          if (error) throw error;
          setLeadsForSettings(data || []);
        } catch (err) {
          console.error(err);
        }
      };
      fetchLeadsList();
    }
  }, [activeTab]);

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


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const duplicateFiles: string[] = [];

      const uploadErrors: string[] = [];

      const uploadPromises = Array.from(files).map(async (file) => {
        const fullPath = `Documentos Olivo/${file.name}`; // Se guarda internamente en una carpeta permitida por RLS
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

      // Ejecutar todas las subidas en paralelo
      await Promise.all(uploadPromises);

      if (uploadErrors.length > 0) {
        await showAlert({
          title: 'Error de Permisos en Base de Datos',
          message: `El servidor de Supabase bloqueó la subida. Verifica las políticas RLS del Storage.\n\nDetalle técnico:\n${uploadErrors.join('\n')}`
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
      event.target.value = ''; // Limpiar el input para permitir subir los mismos archivos tras borrarlos
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

  const handleDeleteSingleProperty = async () => {
    if (!propertyToDeleteSettings) return;

    const property = properties.find(p => p.id === propertyToDeleteSettings);
    
    const confirmed = await showConfirm({
      title: 'Eliminar Vivienda',
      message: `¿Estás seguro de que deseas eliminar la vivienda Nº ${property?.n_orden}?`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    setIsDeletingSingle(true);
    try {
      // Validar si tiene leads asociados
      const { data: leads, error: leadsErr } = await supabase.from('leads').select('id').eq('property_id', propertyToDeleteSettings).limit(1);
      if (leadsErr) throw leadsErr;
      if (leads && leads.length > 0) {
        await showAlert({ title: 'Operación denegada', message: 'No se puede borrar esta vivienda porque tiene contactos/leads asociados.' });
        setIsDeletingSingle(false);
        return;
      }

      // Validar si tiene ventas asociadas
      const { data: sales, error: salesErr } = await supabase.from('sales').select('id').eq('property_id', propertyToDeleteSettings).limit(1);
      if (salesErr) throw salesErr;
      if (sales && sales.length > 0) {
        await showAlert({ title: 'Operación denegada', message: 'No se puede borrar esta vivienda porque ya tiene una venta o reserva.' });
        setIsDeletingSingle(false);
        return;
      }

      const { error } = await supabase.from('inventory').delete().eq('id', propertyToDeleteSettings);
      if (error) throw error;
      
      await showAlert({ title: 'Éxito', message: 'Vivienda eliminada correctamente.' });
      setPropertyToDeleteSettings('');
      // Refrescar lista local
      setProperties(prev => prev.filter(p => p.id !== propertyToDeleteSettings));
    } catch (error) {
      console.error('Error al intentar borrar vivienda:', error);
      await showAlert({ title: 'Error', message: 'Hubo un error al intentar borrar la vivienda.' });
    } finally {
      setIsDeletingSingle(false);
    }
  };


  const handleDeleteLead = async () => {
    if (!leadToDeleteSettings) return;

    const lead = leadsForSettings.find(l => l.id === leadToDeleteSettings);
    
    const confirmed = await showConfirm({
      title: 'Eliminar Cliente',
      message: `¿Estás seguro de que deseas eliminar permanentemente a "${lead?.name}"? Se borrará también su historial de actividad.`,
      confirmText: 'Sí, eliminar permanentemente',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    setIsDeletingLead(true);
    try {
      // 1. Borrar historial (lead_history)
      await supabase.from('lead_history').delete().eq('lead_id', leadToDeleteSettings);
      
      // 2. Borrar tareas (agenda)
      await supabase.from('agenda').delete().eq('lead_id', leadToDeleteSettings);

      // 3. Borrar el lead
      const { error } = await supabase.from('leads').delete().eq('id', leadToDeleteSettings);
      if (error) throw error;
      
      await showAlert({ title: 'Éxito', message: 'Cliente y su historial eliminados correctamente.' });
      setLeadToDeleteSettings('');
      setLeadsForSettings(prev => prev.filter(l => l.id !== leadToDeleteSettings));
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error) {
      console.error('Error al intentar borrar lead:', error);
      await showAlert({ title: 'Error', message: 'Hubo un error al intentar borrar el cliente.' });
    } finally {
      setIsDeletingLead(false);
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

  // Filtrado de la lista por término de búsqueda antes de agruparlos
  const searchedDocs = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configuración del Sistema</h1>
            <p className="text-slate-500 text-sm font-medium flex items-center gap-2 mt-1 -ml-1">
              <span className="tabular-nums font-bold text-altavik-600 bg-altavik-50 px-2 py-0.5 rounded-lg border border-altavik-100 opacity-0 select-none pointer-events-none w-0 overflow-hidden p-0 m-0">
                0
              </span> 
              <span className="ml-1">Panel central de administración y ajustes globales.</span>
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 w-full md:w-auto h-[48px]">
             {/* Espacio reservado para igualar coords */}
          </div>
        </div>
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
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'inventory'
              ? 'bg-altavik-600 text-white shadow-sm'
              : 'hover:bg-slate-100 text-slate-600'
              }`}
          >
            <Home size={16} />
            <span className="font-medium">Viviendas</span>
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'clients'
              ? 'bg-altavik-600 text-white shadow-sm'
              : 'hover:bg-slate-100 text-slate-600'
              }`}
          >
            <Users size={16} />
            <span className="font-medium">Clientes</span>
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

                  {/* Botón de Subida */}
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
          )}

          {/* VISTA: VIVIENDAS (GESTIÓN) */}
          {activeTab === 'inventory' && (
            <div className="p-8 space-y-8 animate-in fade-in duration-300">
              <div className="border-b pb-4">
                <h2 className="text-xl font-bold text-slate-800">Gestión de Catálogo de Viviendas</h2>
                <p className="text-sm text-slate-500 mt-1">Administra las propiedades, importa datos de Excel o sube las fichas técnicas en PDF.</p>
              </div>

              <div className="flex flex-col gap-4 max-w-4xl">
                {/* Card: Añadir Propiedad */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-altavik-300 transition-colors group flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-12 h-12 rounded-xl bg-altavik-100 text-altavik-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Plus size={24} />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-bold text-slate-800 text-sm">Nueva Propiedad</h3>
                    <p className="text-xs text-slate-500">Añade una vivienda manualmente al inventario completando todos sus datos.</p>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full sm:w-48 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-altavik-600 hover:text-white hover:border-altavik-600 transition-all shadow-sm shrink-0"
                  >
                    Añadir Propiedad
                  </button>
                </div>

                {/* Card: Importar Excel */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-altavik-300 transition-colors group flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Upload size={24} />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-bold text-slate-800 text-sm">Importar Datos</h3>
                    <p className="text-xs text-slate-500">Carga masivamente viviendas desde un archivo Excel o CSV (Num. Orden, Portal...).</p>
                  </div>
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="w-full sm:w-48 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm shrink-0"
                  >
                    Importar Excel
                  </button>
                </div>

                {/* Card: Subir Fichas PDF */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-altavik-300 transition-colors group flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <FileText size={24} />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-bold text-slate-800 text-sm">Subir Fichas</h3>
                    <p className="text-xs text-slate-500">Sube los documentos PDF de las fichas comerciales. Se vincularán por Nº de Orden.</p>
                  </div>
                  <button
                    onClick={() => setIsFichasModalOpen(true)}
                    className="w-full sm:w-48 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all shadow-sm shrink-0"
                  >
                    Subir PDF
                  </button>
                </div>

                {/* Card: Borrar Vivienda de 1 en 1 */}
                <div className="bg-red-50 p-5 rounded-2xl border border-red-200 transition-colors group flex flex-col gap-4">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-12 h-12 rounded-xl bg-red-100/80 text-red-600 flex items-center justify-center shrink-0">
                      <Trash2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-red-800 text-sm">Eliminar Vivienda Específica</h3>
                      <p className="text-xs text-red-600/80 mt-0.5">Te permite borrar individualmente una vivienda siempre que antes no haya tenido ninguna acción asociada (compras, reservas, leads...)</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full pl-0 sm:pl-[60px]">
                    <select
                      value={propertyToDeleteSettings}
                      onChange={(e) => setPropertyToDeleteSettings(e.target.value)}
                      className="flex-1 w-full p-3 bg-white border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 font-medium text-slate-700 text-sm"
                    >
                      <option value="">-- Selecciona una vivienda para borrar --</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>Nº {p.n_orden} - Portal {p.portal} {p.planta} {p.letra}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleDeleteSingleProperty}
                      disabled={!propertyToDeleteSettings || isDeletingSingle}
                      className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white font-bold rounded-xl shadow-sm shadow-red-100 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isDeletingSingle ? <Loader2 size={18} className="animate-spin" /> : 'Borrar'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-altavik-50 p-4 rounded-xl border border-altavik-100 flex items-start gap-3">
                <div className="p-1 bg-white rounded-full text-altavik-600 shadow-sm shrink-0">
                  <CheckCircle2 size={16} />
                </div>
                <p className="text-xs text-altavik-800 leading-relaxed">
                  <strong>Recordatorio:</strong> Al subir fichas PDF, asegúrate de que el nombre del archivo comience con el Nº de Orden correspondiente (ej: "1_orden.pdf") para que el sistema las vincule automáticamente.
                </p>
              </div>
            </div>
          )}

          {/* VISTA: CLIENTES */}
          {activeTab === 'clients' && (
            <div className="p-8 space-y-8 animate-in fade-in duration-300">
              <div className="border-b pb-4">
                <h2 className="text-xl font-bold text-slate-800">Gestión de Clientes</h2>
                <p className="text-sm text-slate-500 mt-1">Importa bases de datos masivas o exporta el listado completo de leads actuales.</p>
              </div>

              <div className="flex flex-col gap-4 max-w-4xl">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-altavik-300 transition-colors group flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Upload size={24} />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-bold text-slate-800 text-sm">Importar Clientes</h3>
                    <p className="text-xs text-slate-500">Carga contactos desde un archivo Excel o CSV para añadirlos al CRM.</p>
                  </div>
                  <button
                    onClick={() => setIsImportLeadsModalOpen(true)}
                    className="w-full sm:w-48 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm shrink-0"
                  >
                    Importar CSV/Excel
                  </button>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-altavik-300 transition-colors group flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Download size={24} />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-bold text-slate-800 text-sm">Exportar Clientes</h3>
                    <p className="text-xs text-slate-500">Descarga un archivo Excel con toda la información de la base de datos.</p>
                  </div>
                  <button
                    onClick={() => setIsExportLeadsModalOpen(true)}
                    className="w-full sm:w-48 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all shadow-sm shrink-0"
                  >
                    Exportar DB
                  </button>
                </div>

                {/* Card: Borrar Cliente */}
                <div className="bg-red-50 p-5 rounded-2xl border border-red-200 transition-colors group flex flex-col gap-4">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-12 h-12 rounded-xl bg-red-100/80 text-red-600 flex items-center justify-center shrink-0">
                      <Trash2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-red-800 text-sm">Eliminar Cliente Específico</h3>
                      <p className="text-xs text-red-600/80 mt-0.5">Te permite borrar permanentemente un contacto y todo su historial del sistema.</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full pl-0 sm:pl-[60px]">
                    <select
                      value={leadToDeleteSettings}
                      onChange={(e) => setLeadToDeleteSettings(e.target.value)}
                      className="flex-1 w-full p-3 bg-white border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 font-medium text-slate-700 text-sm"
                    >
                      <option value="">-- Selecciona un cliente para borrar --</option>
                      {leadsForSettings.map(l => (
                        <option key={l.id} value={l.id}>{l.name} {l.email ? `(${l.email})` : ''}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleDeleteLead}
                      disabled={!leadToDeleteSettings || isDeletingLead}
                      className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white font-bold rounded-xl shadow-sm shadow-red-100 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isDeletingLead ? <Loader2 size={18} className="animate-spin" /> : 'Borrar Permanentemente'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals Viviendas */}
      {isModalOpen && (
        <CreatePropertyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            setNotification({ show: true, type: 'success', title: 'Completado', message: 'Vivienda guardada con éxito.' });
          }}
        />
      )}

      {isImportModalOpen && (
        <ImportInventoryModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            setNotification({ show: true, type: 'success', title: 'Importación Finalizada', message: 'El catálogo se ha actualizado correctamente.' });
          }}
        />
      )}

      {isFichasModalOpen && (
        <UploadFichasModal
          isOpen={isFichasModalOpen}
          onClose={() => setIsFichasModalOpen(false)}
          onSuccess={() => {}}
        />
      )}

      {isExportLeadsModalOpen && (
        <ExportLeadsModal isOpen={isExportLeadsModalOpen} onClose={() => setIsExportLeadsModalOpen(false)} />
      )}

      {isImportLeadsModalOpen && (
        <ImportLeadsModal
          isOpen={isImportLeadsModalOpen}
          onClose={() => setIsImportLeadsModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            setNotification({ show: true, type: 'success', title: 'Completado', message: 'Los clientes han sido importados correctamente.' });
          }}
        />
      )}

      {notification.show && (
        <AppNotification
          title={notification.title}
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}

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