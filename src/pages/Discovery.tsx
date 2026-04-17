
import { useState, useEffect } from 'react';
import { Sparkles, Loader2, UserPlus, Mail, AlertCircle, CheckCircle2, Wand2, Search } from 'lucide-react';
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
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ show: boolean, title: string, message: string, type: 'success' | 'error' }>({
    show: false, title: '', message: '', type: 'success'
  });

  const { showConfirm } = useDialog();
  const createLeadMutation = useCreateLead();
  const updateEmailMutation = useUpdateEmail();

  const fetchDiscoveryData = async () => {
    setLoading(true);
    try {
      // 1. Obtener correos no procesados marcados como posible Lead
      const { data: emails, error: emailError } = await supabase
        .from('incoming_emails')
        .select('*')
        .eq('is_processed', false)
        .contains('tags', ['Escaneable IA'])
        .order('date_received', { ascending: false });

      if (emailError) throw emailError;

      // 2. Obtener todos los emails de leads actuales para filtrar
      const { data: leads, error: leadError } = await supabase
        .from('leads')
        .select('email');

      if (leadError) throw leadError;

      const existingEmails = new Set(leads.map(l => l.email?.toLowerCase()).filter(Boolean));

      // 3. Filtrar los que NO están en el sistema
      const filtered = (emails || []).filter(e => !existingEmails.has(e.sender_email?.toLowerCase()))
        .map(e => ({
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
    }
  };

  useEffect(() => {
    fetchDiscoveryData();
  }, []);

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
        const { data: duplicates } = await supabase
          .from('leads')
          .select('id, name')
          .or(duplicateQuery.join(','));

        if (duplicates && duplicates.length > 0) {
          console.log("⚠️ Duplicado(s) detectado(s):", duplicates);
          const names = duplicates.map(d => d.name).join(', ');
          const proceed = await showConfirm({
            title: 'Contacto Existente Detectado',
            message: `Gemini ha encontrado que los datos de este lead coinciden con: ${names}. ¿Quieres marcar el correo como procesado de todas formas?`,
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

      // Crear Lead
      console.log("📝 Registrando lead en la DB...");
      await createLeadMutation.mutateAsync({
        name: extracted.name,
        email: extracted.email === 'No proporcionado' ? null : extracted.email,
        phone: extracted.phone === 'No proporcionado' ? null : extracted.phone,
        source: extracted.source,
        notes: extracted.notes,
        status: 'new'
      });

      // Actualizar Email
      console.log("📧 Marcando email como procesado...");
      await updateEmailMutation.mutateAsync({
        id: lead.emailId,
        updates: { is_processed: true, tags: [...lead.tags, 'Procesado'] }
      });

      setNotification({
        show: true,
        title: 'Lead Capturado',
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <PageHeader 
        title="Lead Discovery"
        icon={<Sparkles className="text-white" strokeWidth={3} size={24} />}
        subtitle="Correos detectados de potenciales clientes que aún no tienes en tu base de datos."
        actions={
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
            <p className="text-sm text-slate-500 max-w-sm mx-auto">No hay correos en tu bandeja de entrada que no estén ya registrados como leads en el CRM.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contacto / Asunto</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                  <th className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Acción</th>
                </tr>
              </thead>
              <tbody>
                {discoveredLeads.map((lead) => (
                  <tr key={lead.emailId} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
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
                      <button 
                        onClick={() => handleProcessLead(lead)}
                        disabled={processingId !== null}
                        className="bg-white border border-slate-200 text-slate-800 hover:border-altavik-500 hover:text-altavik-600 p-2.5 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 inline-flex items-center gap-2 text-xs font-bold"
                      >
                        {processingId === lead.emailId ? (
                           <>Procesando... <Loader2 size={14} className="animate-spin" /></>
                        ) : (
                           <><UserPlus size={16} /> Capturar Lead</>
                        )}
                      </button>
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
