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
  Clock
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  created_at: string;
  event_type: string;
  description: string;
  metadata?: any;
}

const EVENT_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  creation: { icon: UserPlus, color: 'bg-emerald-100 text-emerald-600', label: 'Captación' },
  status_change: { icon: RefreshCw, color: 'bg-blue-100 text-blue-600', label: 'Cambio de Estado' },
  call: { icon: Phone, color: 'bg-indigo-100 text-indigo-600', label: 'Llamada' },
  email: { icon: Mail, color: 'bg-amber-100 text-amber-600', label: 'Email' },
  whatsapp: { icon: MessageSquare, color: 'bg-green-100 text-green-600', label: 'WhatsApp' },
  document: { icon: FileText, color: 'bg-red-100 text-red-600', label: 'Documentación' },
  note: { icon: StickyNote, color: 'bg-slate-100 text-slate-600', label: 'Nota Interna' },
};

export default function LeadTimeline({ leadId }: { leadId: string }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAggregatedEvents();
  }, [leadId]);

  async function fetchAggregatedEvents() {
    try {
      setLoading(true);
      
      // 1. Fetch de tabla lead_history (logs explícitos)
      const { data: historyData } = await supabase
        .from('lead_history')
        .select('*')
        .eq('lead_id', leadId);

      // 2. Fetch de tabla agenda (tareas completadas)
      const { data: tasksData } = await supabase
        .from('agenda')
        .select('*')
        .eq('lead_id', leadId)
        .eq('completed', true);

      // 3. Fetch de documentos enviados
      const { data: docsData } = await supabase
        .from('sent_documents')
        .select('*')
        .eq('lead_id', leadId);

      // 4. Datos del propio lead (Creación)
      const { data: leadData } = await supabase
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

      tasksData?.forEach(task => {
        allEvents.push({
          id: `task-${task.id}`,
          created_at: task.due_date,
          event_type: task.type === 'Llamada' ? 'call' : task.type === 'Visita' ? 'note' : 'note',
          description: `${task.type}: ${task.title}. ${task.comentario || ''}`,
          metadata: { taskId: task.id }
        });
      });

      docsData?.forEach(doc => {
        allEvents.push({
          id: `doc-${doc.id}`,
          created_at: doc.sent_at,
          event_type: 'document',
          description: `Documento enviado via ${doc.method}: ${doc.doc_name}`,
          metadata: { docId: doc.id }
        });
      });

      historyData?.forEach(h => {
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
