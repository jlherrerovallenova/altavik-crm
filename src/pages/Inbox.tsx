import { useState, useEffect } from 'react';
import { Mail, MailOpen, Star, Trash, Wand2, Search, Filter, MoreVertical, Reply, CheckCircle2, AlertCircle, Loader2, Send } from 'lucide-react';
import { extractLeadDataFromEmail, type GeminiExtractedLead } from '../services/geminiService';
import { useCreateLead } from '../hooks/useLeads';
import { useEmails, useUpdateEmail, type IncomingEmail } from '../hooks/useEmails';
import { AppNotification } from '../components/AppNotification';
import { supabase } from '../lib/supabase';
import { useDialog } from '../context/DialogContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';

export default function Inbox() {
  const { data: emails = [], isLoading } = useEmails();
  const updateEmailMutation = useUpdateEmail();
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'leads'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [existingLeadEmails, setExistingLeadEmails] = useState<Set<string>>(new Set());
  const [isSendingReply, setIsSendingReply] = useState(false);
  
  const filteredEmails = emails.filter(m => {
    const matchesFilter = filterType === 'leads' ? m.tags.includes('Escaneable IA') : true;
    const matchesSearch = 
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sender_email.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const selectedMail = filteredEmails.find(m => m.id === selectedMailId) || filteredEmails[0] || null;

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<GeminiExtractedLead | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, title: '', message: '', type: 'success' });

  const createLeadMutation = useCreateLead();
  const { showConfirm } = useDialog();
  
  // 1. Cargar emails de leads existentes para detección inmediata
  useEffect(() => {
    const fetchLeadEmails = async () => {
      const { data } = await supabase.from('leads').select('email');
      if (data) {
        const emailSet = new Set(data.map(l => l.email?.toLowerCase()).filter(Boolean) as string[]);
        setExistingLeadEmails(emailSet);
      }
    };
    fetchLeadEmails();
  }, []);

  const extractWithGemini = async () => {
    if (!selectedMail) return;
    setIsExtracting(true);
    setExtractionError(null);
    try {
      const data = await extractLeadDataFromEmail(selectedMail.body, selectedMail.sender_name);
      setExtractionResult(data);
    } catch (err: any) {
      setExtractionError(err.message || 'Error desconocido al conectar con Gemini.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleApproveLead = async () => {
    if (!extractionResult || !selectedMail) return;

    try {
      // 1. Verificar duplicados por Email o Teléfono
      const emailToCheck = extractionResult.email === 'No proporcionado' ? null : extractionResult.email;
      const phoneToCheck = extractionResult.phone === 'No proporcionado' ? null : extractionResult.phone;

      let duplicateQuery = [];
      if (emailToCheck) duplicateQuery.push(`email.eq.${emailToCheck}`);
      if (phoneToCheck) duplicateQuery.push(`phone.eq.${phoneToCheck}`);

      if (duplicateQuery.length > 0) {
        const { data: duplicates } = await supabase
          .from('leads')
          .select('id, name')
          .or(duplicateQuery.join(','));

        if (duplicates && duplicates.length > 0) {
          const names = duplicates.map(d => d.name).join(', ');
          const proceed = await showConfirm({
            title: 'Posible Duplicado detectado',
            message: `Ya existe un lead con estos datos (${names}). ¿Estás seguro de que quieres crear una nueva ficha?`,
            confirmText: 'Sí, crear de todas formas',
            cancelText: 'No, cancelar'
          });

          if (!proceed) return;
        }
      }

      await createLeadMutation.mutateAsync({
        name: extractionResult.name,
        email: emailToCheck,
        phone: phoneToCheck,
        source: extractionResult.source,
        notes: extractionResult.notes,
        status: 'new'
      });

      setNotification({
        show: true,
        title: 'Lead Creado',
        message: `Se ha creado la ficha de ${extractionResult.name} correctamente.`,
        type: 'success'
      });
      
      // Marcar el email como procesado y añadir etiqueta
      await updateEmailMutation.mutateAsync({
        id: selectedMail.id,
        updates: { 
          is_processed: true, 
          is_read: true,
          tags: [...selectedMail.tags, 'Procesado'].filter((v, i, a) => a.indexOf(v) === i) 
        }
      });

      setExtractionResult(null);

    } catch (err: any) {
      setNotification({
        show: true,
        title: 'Error al crear lead',
        message: err.message || 'No se pudo guardar el lead en la base de datos.',
        type: 'error'
      });
    }
  };

  const handleSendReply = async () => {
    if (!selectedMail || !replyText.trim()) return;

    setIsSendingReply(true);
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: selectedMail.sender_email,
          subject: `Re: ${selectedMail.subject}`,
          html: `<div style="font-family: sans-serif; color: #1e293b;">
            <p>${replyText.replace(/\n/g, '<br>')}</p>
            <hr style="margin: 20px 0; border: 0; border-top: 1px solid #e2e8f0;" />
            <p style="font-size: 12px; color: #64748b;">De: Residencial Altavik</p>
          </div>`
        }
      });

      if (error) throw error;

      setNotification({
        show: true,
        title: 'Respuesta Enviada',
        message: 'Tu mensaje ha sido enviado correctamente.',
        type: 'success'
      });
      setReplyText('');

      if (!selectedMail.is_read) {
        await updateEmailMutation.mutateAsync({
          id: selectedMail.id,
          updates: { is_read: true }
        });
      }

    } catch (err: any) {
      setNotification({
        show: true,
        title: 'Error al enviar',
        message: err.message || 'No se pudo enviar el correo.',
        type: 'error'
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-6 max-w-[1600px] mx-auto w-full">
      <PageHeader 
        title="Bandeja de Entrada"
        icon={<Mail className="text-white" strokeWidth={3} size={24} />}
        subtitle={
          <div className="flex bg-white/50 backdrop-blur rounded-xl border border-slate-200/50 overflow-hidden p-0.5 gap-0.5 mt-2">
            <button 
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilterType('leads')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 ${filterType === 'leads' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Wand2 size={12} />
              Leads
            </button>
          </div>
        }
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar correos..." 
                className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-altavik-500/20 outline-none text-slate-700 w-64 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        }
      />

      <div className="flex-1 flex bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* LEFT COLUMN: Lista de Correos */}
        <div className="w-1/3 min-w-[320px] max-w-[400px] border-r border-slate-200 flex flex-col bg-slate-50/50">
          
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Correos</h2>
            </div>
          </div>

        <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
          {isLoading ? (
            <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
              <span className="text-xs font-bold uppercase tracking-widest">Sincronizando...</span>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="text-xs font-bold uppercase tracking-widest">{filterType === 'leads' ? 'Sin Leads Detectados' : 'Bandeja Vacía'}</p>
            </div>
          ) : (
            filteredEmails.map((mail) => (
              <div 
                key={mail.id}
                onClick={() => {
                  setSelectedMailId(mail.id);
                  setExtractionResult(null);
                }}
                className={`p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-50 ${selectedMail?.id === mail.id ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    {!mail.is_read ? (
                      <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                    ) : null}
                    <span className={`text-sm ${!mail.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>{mail.sender_name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    {new Date(mail.date_received).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h3 className={`text-xs mb-1.5 line-clamp-1 ${!mail.is_read ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{mail.subject}</h3>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{mail.body.substring(0, 100)}...</p>
                
                <div className="flex gap-2 mt-3 flex-wrap">
                  {/* Etiqueta de contacto nuevo/existente */}
                  {existingLeadEmails.has(mail.sender_email.toLowerCase()) ? (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-blue-100 text-blue-700">
                       Cliente Registrado
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-orange-100 text-orange-700">
                       Contacto Nuevo
                    </span>
                  )}

                  {Array.from(new Set(mail.tags)).map((t, index) => (
                    <span key={`${t}-${index}`} className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${t === 'Escaneable IA' ? 'bg-indigo-100 text-indigo-700' : t === 'Procesado' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {t === 'Escaneable IA' && <Wand2 size={10} className="inline mr-1" />}
                      {t === 'Procesado' && <CheckCircle2 size={10} className="inline mr-1" />}
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        {selectedMail ? (
          <>
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
              <div>
                <h1 className="text-xl font-black text-slate-800 mb-2">{selectedMail.subject}</h1>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest text-sm">
                    {selectedMail.sender_name.substring(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{selectedMail.sender_name}</p>
                    <p className="text-xs text-slate-500 font-medium">De: {selectedMail.sender_email}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><Reply size={18} /></button>
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><Star size={18} /></button>
                <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash size={18} /></button>
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><MoreVertical size={18} /></button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="flex-1 p-8 overflow-y-auto text-slate-600 custom-scrollbar">
                  <div className="whitespace-pre-wrap break-all text-sm leading-relaxed max-w-full">
                    {selectedMail.body}
                  </div>
                  
                  <div className="mt-12 border border-slate-200 rounded-2xl p-4 bg-slate-50 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest mb-3">
                      <Reply size={14} /> Responder
                    </div>
                    <textarea 
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                      placeholder="Escribe tu respuesta aquí..."
                      rows={4}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <div className="flex justify-end mt-3">
                      <button 
                        onClick={handleSendReply}
                        disabled={isSendingReply || !replyText.trim()}
                        className="bg-[#1e293b] hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSendingReply ? (
                          <>Enviando... <Loader2 size={14} className="animate-spin" /></>
                        ) : (
                          <><Send size={14} /> Enviar</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-80 bg-slate-50 border-l border-slate-200 p-6 flex flex-col shrink-0 animate-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest mb-6">
                  <Wand2 size={16} /> Altavik Copilot
                </div>

                {!extractionResult ? (
                  <div className="bg-white border text-center border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <MailOpen size={24} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mb-2">
                      {selectedMail.tags.includes('Escaneable IA') ? 'Lead Detectado' : 'Analizar Correo'}
                    </h3>
                    <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                      {selectedMail.tags.includes('Escaneable IA') 
                        ? 'Parece que hay datos de un cliente potencial en este correo. ¿Quieres que la inteligencia artificial extraiga la información?'
                        : 'Usa la inteligencia artificial para intentar extraer información de contacto de este mensaje.'}
                    </p>
                    {extractionError && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">
                        {extractionError}
                      </div>
                    )}
                    <button 
                      onClick={extractWithGemini}
                      disabled={isExtracting}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg shadow-indigo-200 flex justify-center items-center gap-2 disabled:opacity-70 disabled:scale-100 active:scale-95"
                    >
                      {isExtracting ? (
                        <>Procesando datos<span className="animate-pulse">...</span></>
                      ) : (
                        <><Wand2 size={14} /> Extraer con Gemini</>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="bg-white border text-left border-indigo-100 rounded-2xl p-5 shadow-md shadow-indigo-100/50 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-4">
                      <CheckCircle2 size={14} /> Extracción Exitosa
                    </div>
                    
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nombre</label>
                        <p className="text-sm font-bold text-slate-800">{extractionResult.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Teléfono</label>
                          <p className="text-sm font-bold text-slate-800">{extractionResult.phone}</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origen</label>
                          <p className="text-sm font-bold text-indigo-600">{extractionResult.source}</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</label>
                        <p className="text-sm font-medium text-slate-600 truncate">{extractionResult.email || 'No proporcionado'}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Resumen (Notas)</label>
                        <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap">{extractionResult.notes}</p>
                      </div>
                    </div>

                    <button 
                      onClick={handleApproveLead}
                      disabled={createLeadMutation.isPending}
                      className="w-full bg-[#1e293b] hover:bg-slate-800 text-white font-black text-[11px] uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 disabled:opacity-70"
                    >
                      {createLeadMutation.isPending ? (
                        <>Guardando en CRM<Loader2 size={14} className="animate-spin" /></>
                      ) : (
                        <>Aprobar y Crear Ficha</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {notification.show && (
              <AppNotification
                title={notification.title}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Mail size={48} className="mb-4 text-slate-200" strokeWidth={1} />
            <p className="text-sm font-bold tracking-tight">Selecciona un correo para leerlo</p>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
