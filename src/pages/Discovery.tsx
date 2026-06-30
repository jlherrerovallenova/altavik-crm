
import { useState, useEffect } from 'react';
import { Sparkles, Loader2, UserPlus, Mail, AlertCircle, CheckCircle2, Wand2, Search, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { extractLeadDataFromEmail } from '../services/geminiService';
import { useCreateLead } from '../hooks/useLeads';
import { useUpdateEmail } from '../hooks/useEmails';
import { AppNotification } from '../components/AppNotification';
import { useDialog } from '../context/DialogContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';

interface DiscoveredLead {
  emailId: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  date: string;
  body: string;
  tags: string[];
}

export default function Discovery() {
  const [loading, setLoading] = useState(true);
  const [discoveredLeads, setDiscoveredLeads] = useState<DiscoveredLead[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [viewMode, setViewMode] = useState<'pending' | 'imported'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ show: boolean, title: string, message: string, type: 'success' | 'error' }>({
    show: false, title: '', message: '', type: 'success'
  });

  const { showConfirm } = useDialog();
  const createLeadMutation = useCreateLead();
  const updateEmailMutation = useUpdateEmail();

  const fetchDiscoveryData = async () => {
    setLoading(true);
    try {
      // 1. Obtener TODOS los correos marcados como posible Lead
      const { data: emails, error: emailError } = await (supabase as any)
        .from('incoming_emails')
        .select('*')
        .not('tags', 'cs', '{"Descartado"}')
        .contains('tags', ['Escaneable IA'])
        .order('date_received', { ascending: false });

      if (emailError) throw emailError;

      // 2. Obtener todos los emails de leads actuales para cruzar datos
      const { data: leads, error: leadError } = await (supabase as any)
        .from('leads')
        .select('email');

      if (leadError) throw leadError;

      const existingEmails = new Set((leads as any[]).map((l: any) => l.email?.toLowerCase()).filter(Boolean));

      // 3. Filtrar según la vista seleccionada (pendientes o importados)
      const filtered = ((emails as any[]) || []).filter((e: any) => {
        const isExisting = existingEmails.has(e.sender_email?.toLowerCase());
        const isImported = e.is_processed || isExisting;
        return viewMode === 'pending' ? !isImported : isImported;
      }).map((e: any) => ({
          emailId: e.id,
          senderName: e.sender_name,
          senderEmail: e.sender_email,
          subject: e.subject,
          date: e.date_received,
          body: e.body,
          tags: e.tags
        }));

      setDiscoveredLeads(filtered);
    } catch (err: any) {
      console.error("Error en Discovery:", err);
    } finally {
      setLoading(false);
      setSelectedIds([]); // Limpiar selección al refrescar
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    fetchDiscoveryData();
  }, [viewMode]);

  const handleProcessLead = async (lead: DiscoveredLead) => {
    console.log("🚀 Iniciando captura de lead desde email:", lead.emailId);
    setProcessingId(lead.emailId);
    try {
      // Extraemos datos con Gemini
      console.log("📡 Llamando a Gemini para extracción...");
      const extracted = await extractLeadDataFromEmail(lead.body, lead.senderName);
      console.log("✅ Datos extraídos por Gemini:", extracted);
      
      // Verificamos duplicados por Email o Teléfono
      const emailToCheck = extracted.email === 'No proporcionado' ? null : extracted.email;
      const phoneToCheck = extracted.phone === 'No proporcionado' ? null : extracted.phone;

      let duplicateQuery = [];
      if (emailToCheck) duplicateQuery.push(`email.eq.${emailToCheck}`);
      if (phoneToCheck) duplicateQuery.push(`phone.eq.${phoneToCheck}`);

      if (duplicateQuery.length > 0) {
        const { data: duplicates } = await (supabase as any)
          .from('leads')
          .select('id, name')
          .or(duplicateQuery.join(','));

        if (duplicates && duplicates.length > 0) {
          console.log("⚠️ Duplicado(s) detectado(s):", duplicates);
          const names = duplicates.map((d: any) => d.name).join(', ');
          const proceed = await showConfirm({
            title: 'Contacto Existente Detectado',
            message: `Gemini ha encontrado que los datos de este contacto coinciden con: ${names}. ¿Quieres marcar el correo como procesado de todas formas?`,
            confirmText: 'Sí, marcar como procesado',
            cancelText: 'Cancelar'
          });
          
          if (proceed) {
             await updateEmailMutation.mutateAsync({
               id: lead.emailId,
               updates: { is_processed: true, tags: [...lead.tags, 'Procesado'] }
             });
             fetchDiscoveryData();
          }
          setProcessingId(null);
          return;
        }
      }

      const formatName = (name: string) => {
        if (!name || name === 'Desconocido') return name;
        return name.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      };
      const formattedName = formatName(extracted.name);

      // Crear Lead
      console.log("📝 Registrando lead en la DB...");
      await createLeadMutation.mutateAsync({
        name: formattedName,
        email: extracted.email === 'No proporcionado' ? null : extracted.email,
        phone: extracted.phone === 'No proporcionado' ? null : extracted.phone,
        source: extracted.source,
        notes: extracted.notes,
        status: 'new',
        created_at: lead.date
      });

      // Actualizar Email
      console.log("📧 Marcando email como procesado...");
      await updateEmailMutation.mutateAsync({
        id: lead.emailId,
        updates: { is_processed: true, tags: [...lead.tags, 'Procesado'] }
      });

      setNotification({
        show: true,
        title: 'Contacto Capturado',
        message: `${extracted.name} ha sido añadido al CRM.`,
        type: 'success'
      });

      console.log("✨ Proceso completado con éxito.");
      fetchDiscoveryData();
    } catch (err: any) {
      console.error("❌ Error en procesamiento de lead:", err);
      setNotification({
        show: true,
        title: 'Error en procesamiento',
        message: err.message || 'Error desconocido durante la captura',
        type: 'error'
      });
    } finally {
      console.log("🔚 Finalizando estado de procesamiento.");
      setProcessingId(null);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === discoveredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(discoveredLeads.map(l => l.emailId));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const confirmed = await showConfirm({
      title: `¿Eliminar ${selectedIds.length} entradas?`,
      message: `Vas a eliminar ${selectedIds.length} correos de la lista de descubrimiento. Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar todo',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      // Para borrado masivo, necesitamos actualizar cada uno para añadir el tag
      const { data: currentEmails } = await supabase
        .from('incoming_emails')
        .select('id, tags')
        .in('id', selectedIds);

      if (currentEmails) {
        for (const email of currentEmails) {
          await (supabase as any)
            .from('incoming_emails')
            .update({ tags: [...(email.tags || []), 'Descartado'] })
            .eq('id', email.id);
        }
      }

      setNotification({
        show: true,
        title: 'Entradas eliminadas',
        message: `Se han eliminado ${selectedIds.length} correos correctamente.`,
        type: 'success'
      });

      fetchDiscoveryData();
    } catch (err: any) {
      console.error("Error en borrado masivo:", err);
      setNotification({
        show: true,
        title: 'Error',
        message: 'No se pudieron eliminar algunas entradas.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmail = async (emailId: string) => {
    const confirmed = await showConfirm({
      title: '¿Eliminar entrada?',
      message: 'Esta acción eliminará el correo de la lista de descubrimiento. No se creará ningún contacto.',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    try {
      // Obtener tags actuales
      const { data: emailData } = await supabase
        .from('incoming_emails')
        .select('tags')
        .eq('id', emailId)
        .single();

      const { error } = await (supabase as any)
        .from('incoming_emails')
        .update({ tags: [...(emailData?.tags || []), 'Descartado'] })
        .eq('id', emailId);

      if (error) throw error;

      setNotification({
        show: true,
        title: 'Entrada eliminada',
        message: 'El correo ha sido descartado del sistema.',
        type: 'success'
      });

      fetchDiscoveryData();
    } catch (err: any) {
      console.error("Error al eliminar email:", err);
      setNotification({
        show: true,
        title: 'Error',
        message: 'No se pudo eliminar la entrada.',
        type: 'error'
      });
    }
  };

  const handleBulkProcessLeads = async () => {
    if (selectedIds.length === 0) return;

    const confirmed = await showConfirm({
      title: `¿Capturar ${selectedIds.length} contactos?`,
      message: `El sistema procesará ${selectedIds.length} correos con Inteligencia Artificial para extraer los datos y crear los contactos automáticamente.`,
      confirmText: 'Sí, empezar captura',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    const leadsToProcess = discoveredLeads.filter(l => selectedIds.includes(l.emailId));
    let successCount = 0;
    let errorCount = 0;

    setIsScanning(true); // Usamos el estado de scanning para mostrar progreso global
    
    for (let i = 0; i < leadsToProcess.length; i++) {
      const lead = leadsToProcess[i];
      setProcessingId(lead.emailId);
      
      try {
        await handleProcessLead(lead);
        successCount++;
      } catch (err: any) {
        console.error(`Error procesando lead ${lead.emailId}:`, err);
        errorCount++;
      }

      // Si no es el último lead, no ponemos pausa (plan de pago)
    }

    setIsScanning(false);
    setProcessingId(null);
    setSelectedIds([]);

    setNotification({
      show: true,
      title: 'Proceso masivo completado',
      message: `Se han procesado ${leadsToProcess.length} correos. Éxitos: ${successCount}, Errores: ${errorCount}.`,
      type: successCount > 0 ? 'success' : 'error'
    });

    fetchDiscoveryData();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <PageHeader 
        title="Descubrimiento de Contactos"
        icon={<Sparkles className="text-white" strokeWidth={3} size={24} />}
        subtitle="Correos detectados de potenciales clientes que aún no tienes en tu base de datos."
        actions={
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={handleBulkProcessLeads}
                  disabled={isScanning || processingId !== null}
                  className="bg-altavik-600 hover:bg-altavik-700 text-white h-9 px-4 rounded-lg"
                >
                  <UserPlus size={16} />
                  Capturar ({selectedIds.length})
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isScanning || processingId !== null}
                  className="bg-white border-slate-200 text-red-600 hover:bg-red-50 h-9 px-4 rounded-lg"
                >
                  <Trash2 size={16} />
                  Eliminar
                </Button>
              </div>
            )}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('pending')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'pending' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Pendientes
              </button>
              <button 
                onClick={() => setViewMode('imported')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'imported' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Importados
              </button>
            </div>
            <Button 
              onClick={() => {
                setIsScanning(true);
                setTimeout(() => {
                  fetchDiscoveryData();
                  setIsScanning(false);
                }, 1500);
              }}
              disabled={isScanning}
            >
              {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Escanear Bandeja
            </Button>
          </div>
        }
      />

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center text-slate-400 gap-4">
            <Loader2 size={32} className="animate-spin text-altavik-500" />
            <p className="text-xs font-black uppercase tracking-widest">Buscando oportunidades...</p>
          </div>
        ) : discoveredLeads.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">¡Todo al día!</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">No hay correos en tu bandeja de entrada que no estén ya registrados como contactos en el CRM.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 w-10">
                    <input 
                      type="checkbox" 
                      checked={discoveredLeads.length > 0 && selectedIds.length === discoveredLeads.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-altavik-600 focus:ring-altavik-500 cursor-pointer w-4 h-4"
                    />
                  </th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contacto / Asunto</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                  <th className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Acción</th>
                </tr>
              </thead>
              <tbody>
                {discoveredLeads.map((lead) => (
                  <tr 
                    key={lead.emailId} 
                    className={`border-b border-slate-50 transition-colors group ${selectedIds.includes(lead.emailId) ? 'bg-altavik-50/50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="p-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(lead.emailId)}
                        onChange={() => handleToggleSelect(lead.emailId)}
                        className="rounded border-slate-300 text-altavik-600 focus:ring-altavik-500 cursor-pointer w-4 h-4"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{lead.senderName}</span>
                        <span className="text-xs text-slate-400 mb-1">{lead.senderEmail}</span>
                        <span className="text-xs text-slate-600 italic line-clamp-1">"{lead.subject}"</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold text-slate-500">
                        {new Date(lead.date).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {lead.tags.map((t, idx) => (
                          <span key={`${t}-${idx}`} className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-600">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {viewMode === 'imported' ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-[11px] uppercase tracking-wider bg-emerald-50 px-3 py-2 rounded-xl">
                            <CheckCircle2 size={14} /> Importado
                          </span>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleProcessLead(lead)}
                              disabled={processingId !== null}
                              className="bg-white border border-slate-200 text-slate-800 hover:border-altavik-500 hover:text-altavik-600 px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 inline-flex items-center gap-2 text-xs font-bold"
                            >
                              {processingId === lead.emailId ? (
                                <>Procesando... <Loader2 size={14} className="animate-spin" /></>
                              ) : (
                                <><UserPlus size={16} /> Capturar</>
                              )}
                            </button>
                            <button 
                              onClick={() => handleDeleteEmail(lead.emailId)}
                              disabled={processingId !== null}
                              className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                              title="Eliminar de la lista"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {notification.show && (
        <AppNotification 
          title={notification.title} 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification({ ...notification, show: false })} 
        />
      )}
    </div>
  );
}
