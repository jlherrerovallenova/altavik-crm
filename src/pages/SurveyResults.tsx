import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquareQuote, BarChart3, Clock, AlertTriangle, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SurveyLead {
  id: string;
  name: string;
  feedback_sent: boolean;
  feedback_sent_at: string | null;
  feedback_responded_at: string | null;
  feedback_rating: string | null;
  survey_data: any;
}

export default function SurveyResults() {
  const [leads, setLeads] = useState<SurveyLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    fetchSurveys();
  }, [session]);

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const { data, error: dbError } = await (supabase as any)
        .from('leads')
        .select('id, name, feedback_sent, feedback_sent_at, feedback_responded_at, feedback_rating, survey_data')
        .eq('feedback_sent', true)
        .order('feedback_sent_at', { ascending: false });

      if (dbError) throw dbError;
      setLeads(data || []);
    } catch (err: any) {
      console.error('Error fetching surveys:', err);
      setError('No se pudieron cargar los datos de las encuestas.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-altavik-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-2xl flex items-center gap-4">
        <AlertTriangle size={24} />
        <div>
          <h3 className="font-bold">Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalSent = leads.length;
  const totalResponded = leads.filter(l => l.feedback_responded_at).length;
  const responseRate = totalSent > 0 ? Math.round((totalResponded / totalSent) * 100) : 0;

  const responsesByType = {
    mas_info: leads.filter(l => l.feedback_rating === 'mas_info').length,
    pensarlo: leads.filter(l => l.feedback_rating === 'pensarlo').length,
    no_encaja: leads.filter(l => l.feedback_rating === 'no_encaja').length,
    encontrado: leads.filter(l => l.feedback_rating === 'encontrado').length,
  };

  const getPercentage = (count: number) => totalResponded > 0 ? Math.round((count / totalResponded) * 100) : 0;

  const RATING_INFO: Record<string, { label: string, color: string, bg: string }> = {
    mas_info: { label: 'Quieren más info', color: 'text-emerald-600', bg: 'bg-emerald-500' },
    pensarlo: { label: 'Tienen que pensarlo', color: 'text-blue-600', bg: 'bg-blue-500' },
    no_encaja: { label: 'No les encaja', color: 'text-orange-600', bg: 'bg-orange-500' },
    encontrado: { label: 'Ya han comprado', color: 'text-red-600', bg: 'bg-red-500' },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-3">
            <MessageSquareQuote size={14} /> Encuestas
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Estadísticas de Feedback</h1>
          <p className="text-slate-500 mt-1">Análisis de respuestas enviadas por los clientes.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Users size={64} />
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Total Enviadas</p>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-black text-slate-800">{totalSent}</span>
            <span className="text-sm text-slate-400 mb-1">encuestas</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <MessageSquareQuote size={64} />
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Respuestas Recibidas</p>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-black text-slate-800">{totalResponded}</span>
            <span className="text-sm text-slate-400 mb-1">encuestas</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-[24px] shadow-lg shadow-indigo-900/20 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <BarChart3 size={64} />
          </div>
          <p className="text-sm font-bold text-indigo-200 uppercase tracking-wider mb-2">Tasa de Respuesta</p>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-black text-white">{responseRate}%</span>
          </div>
        </div>
      </div>

      {/* Distribution Section */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-800 mb-6">Distribución de Respuestas</h3>
        
        {totalResponded === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <MessageSquareQuote size={48} className="mx-auto mb-4 opacity-20" />
            <p>Todavía no hay respuestas para mostrar.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(responsesByType).map(([key, count]) => {
              const info = RATING_INFO[key];
              if (!info) return null;
              const pct = getPercentage(count);
              
              return (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-700">{info.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">{count} respuestas</span>
                      <span className={`font-black ${info.color}`}>{pct}%</span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${info.bg} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Responses List */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100">
          <h3 className="text-lg font-black text-slate-800">Envíos Recientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
              <tr>
                <th className="px-8 py-4">Cliente</th>
                <th className="px-8 py-4">Fecha Envío</th>
                <th className="px-8 py-4">Estado</th>
                <th className="px-8 py-4">Respuesta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.slice(0, 20).map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4 font-bold text-slate-800">{lead.name}</td>
                  <td className="px-8 py-4 text-sm text-slate-500">
                    {lead.feedback_sent_at ? new Date(lead.feedback_sent_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-8 py-4">
                    {lead.feedback_responded_at ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Respondida
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
                        <Clock size={12} className="text-amber-500" />
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-4">
                    {lead.feedback_rating && RATING_INFO[lead.feedback_rating] ? (
                      <span className={`text-sm font-bold ${RATING_INFO[lead.feedback_rating].color}`}>
                        {RATING_INFO[lead.feedback_rating].label}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-8 text-center text-slate-400">
                    No hay registros de encuestas enviadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
