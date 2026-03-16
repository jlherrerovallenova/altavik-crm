// src/pages/Stats.tsx
import { useState, useEffect } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  PieChart as PieIcon, 
  Calendar, 
  Download,
  ArrowUpRight,
  Target,
  FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import { StatCard } from '../components/Shared';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

export default function Stats() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'6m' | '12m' | 'all'>('6m');
  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalLeads: 0,
    conversionRate: 0,
    activeLeads: 0,
    growth: 0
  });
  const [rawLeads, setRawLeads] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('created_at, source, status');

      if (error) throw error;

      if (leads) {
        setRawLeads(leads);
        processLeadsData(leads);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const processLeadsData = (leads: any[]) => {
    // 1. Resumen general
    const total = leads.length;
    const closed = leads.filter(l => l.status === 'closed').length;
    const conversion = total > 0 ? (closed / total * 100).toFixed(1) : 0;
    
    setSummaryStats({
      totalLeads: total,
      conversionRate: Number(conversion),
      activeLeads: leads.filter(l => !['closed', 'lost'].includes(l.status)).length,
      growth: 12.5 // Mock value for now
    });

    // 2. Datos por mes
    const months: Record<string, number> = {};
    const now = new Date();
    
    // Inicializar últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('es-ES', { month: 'short' });
      months[key] = 0;
    }

    leads.forEach(l => {
      const date = new Date(l.created_at);
      const isRecent = date > new Date(now.getFullYear(), now.getMonth() - 5, 1);
      if (isRecent) {
        const key = date.toLocaleString('es-ES', { month: 'short' });
        if (months[key] !== undefined) months[key]++;
      }
    });

    setLeadsData(Object.entries(months).map(([name, total]) => ({ name, total })));

    // 3. Datos por origen
    const sources: Record<string, number> = {};
    leads.forEach(l => {
      const s = l.source || 'Desconocido';
      sources[s] = (sources[s] || 0) + 1;
    });

    setSourceData(
      Object.entries(sources)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    );
  };

  const STATUS_MAP: Record<string, string> = {
    new: 'Nuevo',
    contacted: 'Contactado',
    qualified: 'Cualificado',
    visiting: 'Visitando',
    proposal: 'Propuesta',
    negotiation: 'Negociación',
    closed: 'Ganado',
    lost: 'Perdido'
  };

  const handleDownload = () => {
    if (rawLeads.length === 0) return;

    // Crear cabeceras
    const headers = ['Nombre', 'Email', 'Telefono', 'Origen', 'Estado', 'Fecha de Creacion'];
    
    // Formatear filas
    const rows = rawLeads.map(l => [
      l.name,
      l.email || '',
      l.phone || '',
      l.source || 'Sin origen',
      STATUS_MAP[l.status] || l.status,
      new Date(l.created_at).toLocaleDateString()
    ]);

    // Unir todo en CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historico_clientes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    if (rawLeads.length === 0) return;

    // Crear documento en horizontal (landscape)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Añadir título y fecha
    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129); // Emerald-500
    doc.text('Informe Histórico de Clientes - Altavik CRM', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Total de registros: ${rawLeads.length}`, 14, 33);

    // Preparar datos para la tabla
    const tableColumn = ["Nombre", "Email", "Teléfono", "Origen", "Estado", "Fecha"];
    const tableRows = rawLeads.map(l => [
      l.name,
      l.email || 'N/A',
      l.phone || 'N/A',
      l.source || 'Directo',
      (STATUS_MAP[l.status] || l.status).toUpperCase(),
      new Date(l.created_at).toLocaleDateString()
    ]);

    // Generar tabla
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { 
        fillColor: [16, 185, 129], 
        textColor: 255, 
        fontSize: 10,
        fontStyle: 'bold' 
      },
      styles: { 
        fontSize: 9,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    // Guardar PDF
    doc.save(`informe_clientes_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Estadísticas y Análisis</h1>
          <p className="text-slate-500 text-sm font-medium">Análisis de rendimiento y adquisición de clientes.</p>
        </div>
        
        <div className="flex gap-2">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-altavik-500/20"
          >
            <option value="6m">Últimos 6 meses</option>
            <option value="12m">Últimos 12 meses</option>
            <option value="all">Histórico total</option>
          </select>
          <button 
            onClick={handleDownloadPDF}
            disabled={loading || rawLeads.length === 0}
            className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-xs font-bold"
            title="Descargar Informe PDF (Horizontal)"
          >
            <FileText size={18} className="text-red-500" />
            PDF
          </button>
          <button 
            onClick={handleDownload}
            disabled={loading || rawLeads.length === 0}
            className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-xs font-bold"
            title="Descargar CSV"
          >
            <Download size={18} className="text-altavik-500" />
            CSV
          </button>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Clientes" 
          value={summaryStats.totalLeads.toString()} 
          subtext="Base histórica completa"
          icon={<Users size={20} />}
          type="primary"
        />
        <StatCard 
          title="Tasa de Cierre" 
          value={`${summaryStats.conversionRate}%`} 
          subtext="Eficiencia en ventas"
          icon={<TrendingUp size={20} />}
          type="success"
        />
        <StatCard 
          title="Pipeline Activo" 
          value={summaryStats.activeLeads.toString()} 
          subtext="Clientes en proceso"
          icon={<Target size={20} />}
          type="warning"
        />
        <StatCard 
          title="Crecimiento" 
          value="+12.5%" 
          subtext="Vs mes anterior"
          icon={<TrendingUp size={20} />}
          type="primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Gráfico de Barras: Entradas Mensuales */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={18} className="text-altavik-500" />
              Entradas Mensuales
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={leadsData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12}} 
                />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}}
                  cursor={{stroke: '#10b981', strokeWidth: 2}}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                  name="Nuevos Clientes"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Tarta: Origen de Clientes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <PieIcon size={18} className="text-blue-500" />
              Distribución por Origen
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sourceData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Tabla Detalle Orígenes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-white">
          <h3 className="font-bold text-slate-800">Ranking de Canales de Adquisición</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Medio</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contactos</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Participación</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tendencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sourceData.map((source, index) => (
                <tr key={source.name} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                      <span className="text-sm font-bold text-slate-700">{source.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-600">{source.value}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden w-24">
                        <div 
                          className="h-full rounded-full" 
                          style={{
                            width: `${(source.value / summaryStats.totalLeads * 100)}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {Math.round(source.value / summaryStats.totalLeads * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center text-altavik-600 bg-altavik-50 px-2 py-1 rounded-full text-[10px] font-bold">
                      <ArrowUpRight size={12} className="mr-1" />
                      SUBIENDO
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
