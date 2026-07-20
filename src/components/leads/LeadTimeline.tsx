import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  UserPlus, 
  RefreshCw, 
  Phone, 
  Mail, 
  MessageSquare, 
  FileText, 
  StickyNote,
  Clock,
  Check,
  CheckCheck,
  RotateCcw
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  created_at: string;
  event_type: string;
  description: string;
  metadata?: any;
}

interface LeadTimelineProps {
  leadId: string;
  onResendEmail?: (draft: { subject?: string; message?: string; docs?: string[] }) => void;
}

const EVENT_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  creation: { icon: UserPlus, color: 'bg-emerald-100 text-emerald-600', label: 'Captación' },
  status_change: { icon: RefreshCw, color: 'bg-blue-100 text-blue-600', label: 'Cambio de Estado' },
  call: { icon: Phone, color: 'bg-indigo-100 text-indigo-600', label: 'Llamada' },
  email: { icon: Mail, color: 'bg-amber-100 text-amber-600', label: 'Email' },
  whatsapp: { icon: MessageSquare, color: 'bg-green-100 text-green-600', label: 'WhatsApp' },
  document: { icon: FileText, color: 'bg-red-100 text-red-600', label: 'Documentación' },
  note: { icon: StickyNote, color: 'bg-slate-100 text-slate-600', label: 'Nota Interna' },
  feedback: { icon: MessageSquare, color: 'bg-pink-100 text-pink-600', label: 'Encuesta' },
};

export default function LeadTimeline({ leadId, onResendEmail }: LeadTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [trackingRecords, setTrackingRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmails, setExpandedEmails] = useState<Record<string, boolean>>({});

  const toggleEmailExpand = (eventId: string) => {
    setExpandedEmails(prev => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  useEffect(() => {
    fetchAggregatedEvents();
  // react-doctor-disable-next-line exhaustive-deps
  }, [leadId]);

  async function fetchAggregatedEvents() {
    try {
      setLoading(true);
      
      // Fetch the history, agenda, and sent docs in parallel
      const [
        { data: historyData },
        { data: tasksData },
        { data: docsData }
      ] = await Promise.all([
        (supabase as any).from('lead_history').select('*').eq('lead_id', leadId),
        (supabase as any).from('agenda').select('*').eq('lead_id', leadId).eq('completed', true),
        (supabase as any).from('sent_documents').select('*').eq('lead_id', leadId)
      ]);

      // 4. Fetch de email_tracking
      const { data: trackingData } = await (supabase as any)
        .from('email_tracking')
        .select('*')
        .eq('lead_id', leadId);

      if (trackingData) {
        setTrackingRecords(trackingData);
      }

      // 5. Datos del propio lead (Creación)
      const { data: leadData } = await (supabase as any)
        .from('leads')
        .select('created_at, source')
        .eq('id', leadId)
        .single();

      // Unificamos todo en un solo formato
      const allEvents: TimelineEvent[] = [];

      if (leadData) {
        allEvents.push({
          id: 'creation',
          created_at: leadData.created_at,
          event_type: 'creation',
          description: `Lead captado a través de ${leadData.source || 'Directo'}.`,
          metadata: { source: leadData.source }
        });
      }

      tasksData?.forEach((task: any) => {
        allEvents.push({
          id: `task-${task.id}`,
          created_at: task.due_date,
          event_type: task.type === 'Llamada' ? 'call' : task.type === 'Email' ? 'email' : task.type === 'Visita' ? 'note' : 'note',
          description: `${task.type}: ${task.title}. ${task.comentario || ''}`,
          metadata: { taskId: task.id, tracking_id: task.tracking_id }
        });
      });

      docsData?.forEach((doc: any) => {
        allEvents.push({
          id: `doc-${doc.id}`,
          created_at: doc.sent_at,
          event_type: 'document',
          description: `Documento enviado via ${doc.method}: ${doc.doc_name}`,
          metadata: { docId: doc.id }
        });
      });

      historyData?.forEach((h: any) => {
        allEvents.push({
          id: h.id,
          created_at: h.created_at,
          event_type: h.event_type,
          description: h.description,
          metadata: h.metadata
        });
      });

      // Ordenar por fecha descendente
      allEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setEvents(allEvents);
    } catch (err) {
      console.error('Error fetching aggregated timeline:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="flex justify-center py-10">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-altavik-600"></div>
    </div>
  );

  if (events.length === 0) return (
    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
      <Clock className="mx-auto text-slate-300 mb-2" size={32} />
      <p className="text-sm text-slate-400 font-medium">Sin actividad registrada todavía</p>
    </div>
  );

  return (
    <div className="relative space-y-6 pt-2 pb-6">
      <div className="absolute left-6 top-4 bottom-4 w-px bg-slate-100"></div>
      
      {events.map((event) => {
        const config = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.note;
        const Icon = config.icon;
        
        return (
          <div key={event.id} className="relative pl-14 animate-in fade-in slide-in-from-left-2 duration-300">
            {/* Timeline dot/icon */}
            <div className={`absolute left-2.5 top-0 w-8 h-8 rounded-xl shadow-sm border border-white flex items-center justify-center z-10 ${config.color}`}>
              <Icon size={16} />
            </div>

            {/* Content card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {config.label}
                </span>
                <span className="text-[10px] font-bold text-slate-400 italic">
                  {new Date(event.created_at).toLocaleString('es-ES', { 
                    day: '2-digit', 
                    month: 'short', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              <p className="text-sm text-slate-700 font-medium leading-relaxed break-words">
                {event.description.split('||').join(', ')}
              </p>
              {event.metadata?.source && (
                <span className="mt-2 inline-block px-2 py-0.5 bg-slate-50 rounded-md text-[9px] font-bold text-slate-400 border border-slate-100">
                  Vía: {event.metadata.source}
                </span>
              )}
              {(event.event_type === 'email' || event.event_type === 'document') && event.metadata?.tracking_id && (() => {
                const tracking = trackingRecords.find(t => t.id === event.metadata.tracking_id);
                const isOpened = tracking ? (tracking.status === 'opened' || tracking.opens_count > 0) : event.metadata.opened;
                const opensCount = tracking ? tracking.opens_count : (event.metadata.opened ? 1 : 0);
                const opensLabel = opensCount > 0 ? ` (${opensCount})` : '';
                const lastOpenedAt = tracking ? (tracking.last_opened_at || tracking.first_opened_at) : event.metadata.opened_at;

                return (
                  <div className="mt-2.5 flex items-center gap-1.5">
                    {isOpened ? (
                      <span 
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-0.5 cursor-help"
                        title={lastOpenedAt ? `Última apertura: ${new Date(lastOpenedAt).toLocaleString('es-ES')}` : ''}
                      >
                        <CheckCheck size={12} className="text-emerald-500" />
                        Abierto{opensLabel}
                        {lastOpenedAt && (
                          <span className="text-slate-400 font-normal ml-1">
                            {new Date(lastOpenedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5">
                        <Check size={12} className="text-slate-400" />
                        Enviado
                      </span>
                    )}
                  </div>
                );
              })()}
              
              {/* ACCIONES DEL CORREO (VER / REENVIAR) */}
              {((event.event_type === 'email' || event.event_type === 'document' || event.description.toLowerCase().includes('email') || event.description.toLowerCase().includes('documento')) || event.metadata?.body) && (
                <div className="mt-3 border-t border-slate-100 pt-2.5 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {event.metadata?.body && (
                      <button 
                        type="button"
                        onClick={() => toggleEmailExpand(event.id)}
                        className="text-[10px] font-black text-slate-600 hover:text-slate-800 flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg transition-all"
                      >
                        {expandedEmails[event.id] ? 'Ocultar mensaje' : 'Ver mensaje completo'}
                      </button>
                    )}

                    {(onResendEmail || true) && (
                      event.event_type === 'email' || 
                      event.event_type === 'document' || 
                      event.description.toLowerCase().includes('email') || 
                      event.description.toLowerCase().includes('documento')
                    ) && (
                      <button 
                        type="button"
                        onClick={() => {
                          const draft = {
                            subject: event.metadata?.subject || (event.description.startsWith('Envío') ? event.description : `Reenvío: ${event.description}`),
                            message: event.metadata?.body || '',
                            docs: event.metadata?.docs || (event.metadata?.doc_name ? event.metadata.doc_name.split('||') : [])
                          };
                          if (onResendEmail) {
                            onResendEmail(draft);
                          } else {
                            window.dispatchEvent(new CustomEvent('altavik-resend-email', { detail: draft }));
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm active:scale-95 cursor-pointer"
                        title="Abrir formulario para modificar y reenviar este correo"
                      >
                        <RotateCcw size={13} strokeWidth={2.5} />
                        Reenviar correo
                      </button>
                    )}
                  </div>
                </div>
              )}

              {event.metadata?.subject && (
                <p className="text-[11px] text-slate-500 font-bold mt-2">
                  Asunto: <span className="font-semibold text-slate-700">{event.metadata.subject}</span>
                </p>
              )}

              {expandedEmails[event.id] && event.metadata?.body && (
                <div className="mt-2.5 p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100 text-[12px] text-slate-600 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto font-medium">
                  {event.metadata.body}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
