
import { useState, useEffect } from 'react';
import { Sparkles, Loader2, UserPlus, Mail, AlertCircle, CheckCircle2, Wand2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { extractLeadDataFromEmail } from '../services/geminiService';
import { useCreateLead } from '../hooks/useLeads';
import { useUpdateEmail } from '../hooks/useEmails';
import { AppNotification } from '../components/AppNotification';
import { useDialog } from '../context/DialogContext';

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
    setProcessingId(lead.emailId);
    try {
      // Extraemos datos con Gemini
      const extracted = await extractLeadDataFromEmail(lead.body, lead.senderName);
      
      // Verificamos de nuevo por si el email extraído (si era portal) ya existe
      if (extracted.email && extracted.email !== 'No proporcionado') {
        const { data: dup } = await supabase.from('leads').select('id, name').eq('email', extracted.email).maybeSingle();
        if (dup) {
          const proceed = await showConfirm({
            title: 'Contacto Existente Detectado',
            message: `Gemini ha encontrado que este lead es ${extracted.name} (${extracted.email}), quien ya está en tu sistema como ${dup.name}. ¿Quieres marcar el correo como procesado de todas formas?`,
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
          return;
        }
      }

      // Crear Lead
      await createLeadMutation.mutateAsync({
        name: extracted.name,
        email: extracted.email === 'No proporcionado' ? null : extracted.email,
        phone: extracted.phone === 'No proporcionado' ? null : extracted.phone,
        source: extracted.source,
        notes: extracted.notes,
        status: 'new'
      });

      // Actualizar Email
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

      fetchDiscoveryData();
    } catch (err: any) {
      setNotification({
        show: true,
        title: 'Error en procesamiento',
        message: err.message,
        type: 'error'
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
             <Sparkles className="text-altavik-500" /> Lead Discovery
          </h1>
          <p className="text-slate-500 text-sm font-medium">Correos detectados de potenciales clientes que aún no tienes en tu base de datos.</p>
        </div>
        <button 
          onClick={() => {
            setIsScanning(true);
            setTimeout(() => {
              fetchDiscoveryData();
              setIsScanning(false);
            }, 1500);
          }}
          disabled={isScanning}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
          {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Escanear Bandeja
        </button>
      </div>

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
                        {lead.tags.map(t => (
                          <span key={t} className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-600">
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
