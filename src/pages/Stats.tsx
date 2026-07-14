// src/pages/Stats.tsx
import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
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

// Paleta corporativa Altavik
const COLORS = ['#6b94b9', '#466383', '#88aec9', '#3a516b', '#abc6d9', '#2d3f54', '#adb5bd'];
const BRAND_BLUE = '#6b94b9';

export default function Stats() {
  const [loading, setLoading] = useState(true);
  type TimeRange = '1w' | '1m' | '3m' | '6m' | '12m' | 'all';
  const [timeRange, setTimeRange] = useState<TimeRange>('1m');
  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalLeads: 0,
    conversionRate: 0,
    activeLeads: 0,
    growth: 0
  });
  const [statusData, setStatusData] = useState<any[]>([]);
  const [rawLeads, setRawLeads] = useState<any[]>([]);
  const [statusMonth, setStatusMonth] = useState<string>('all');

  const availableMonths = useMemo(() => {
    const monthsMap = new Map<string, string>();
    rawLeads.forEach(l => {
      const d = new Date(l.created_at);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
      if (!monthsMap.has(value)) {
        monthsMap.set(value, label.charAt(0).toUpperCase() + label.slice(1));
      }
    });
    return Array.from(monthsMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => b.value.localeCompare(a.value));
  }, [rawLeads]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (rawLeads.length > 0) {
      processLeadsData(rawLeads, timeRange);
    }
  }, [timeRange, rawLeads, statusMonth]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('name, email, phone, created_at, source, status')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (leads) {
        setRawLeads(leads);
        processLeadsData(leads, timeRange);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const processLeadsData = (leads: any[], range: TimeRange) => {
    const now = new Date();
    let startDate = new Date(0); // For 'all'
    
    if (range === '1w') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    } else if (range === '1m') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    } else if (range === '3m') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    } else if (range === '6m') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    } else if (range === '12m') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    }

    // Filtrar los leads según el rango
    const currentLeads = leads.filter(l => new Date(l.created_at) >= startDate);

    // 1. Resumen general
    const total = currentLeads.length;
    const closed = currentLeads.filter(l => l.status === 'closed').length;
    const conversion = total > 0 ? (closed / total * 100).toFixed(1) : 0;
    
    setSummaryStats({
      totalLeads: total,
      conversionRate: Number(conversion),
      activeLeads: currentLeads.filter(l => !['closed', 'lost'].includes(l.status)).length,
      growth: 12.5 // Mock value
    });

    // 2. Datos para el gráfico principal
    let chartData: any[] = [];
    
    if (range === '1w') {
      const days: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const key = d.toLocaleDateString('es-ES', { weekday: 'short' });
        days[key] = 0;
      }
      currentLeads.forEach(l => {
        const date = new Date(l.created_at);
        const key = date.toLocaleDateString('es-ES', { weekday: 'short' });
        if (days[key] !== undefined) days[key]++;
      });
      chartData = Object.entries(days).map(([name, total]) => ({ name, total }));
    } else if (range === '1m') {
      const weeks: Record<string, number> = { 'S4': 0, 'S3': 0, 'S2': 0, 'S1': 0 };
      currentLeads.forEach(l => {
        const date = new Date(l.created_at);
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 7) weeks['S1']++;
        else if (diffDays <= 14) weeks['S2']++;
        else if (diffDays <= 21) weeks['S3']++;
        else weeks['S4']++;
      });
      chartData = Object.entries(weeks).map(([name, total]) => ({ name, total })).reverse(); // Orden cronológico
    } else {
      let numMonths = 6;
      if (range === '3m') numMonths = 3;
      else if (range === '12m') numMonths = 12;
      else if (range === 'all') numMonths = 12; // Máximo 12 meses en el gráfico para que se lea bien

      const months: Record<string, number> = {};
      for (let i = numMonths - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString('es-ES', { month: 'short' });
        months[key] = 0;
      }

      currentLeads.forEach(l => {
        const date = new Date(l.created_at);
        const key = date.toLocaleString('es-ES', { month: 'short' });
        if (months[key] !== undefined) months[key]++;
      });
      chartData = Object.entries(months).map(([name, total]) => ({ name, total }));
    }
    
    setLeadsData(chartData);

    // 3. Datos por origen
    const sources: Record<string, number> = {};
    currentLeads.forEach(l => {
      const s = l.source || 'Desconocido';
      sources[s] = (sources[s] || 0) + 1;
    });

    setSourceData(
      Object.entries(sources)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    );

    // 4. Datos por estado (afectado por statusMonth)
    let statusTargetLeads = currentLeads;
    if (statusMonth !== 'all') {
      const [year, m] = statusMonth.split('-');
      statusTargetLeads = leads.filter(l => {
        const d = new Date(l.created_at);
        return d.getMonth() === parseInt(m) - 1 && d.getFullYear() === parseInt(year);
      });
    }

    const statuses: Record<string, number> = {};
    statusTargetLeads.forEach(l => {
      const s = STATUS_MAP[l.status] || l.status;
      statuses[s] = (statuses[s] || 0) + 1;
    });

    setStatusData(
      Object.entries(statuses)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    );
  };

  const STATUS_MAP: Record<string, string> = {
    new: 'Nuevo',
    contacted: 'Contactado',
    qualified: 'Cualificado',
    visiting: 'Visitando',
    closed: 'Venta Cerrada',
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

    // Añadir logo si existe (posicionamiento arriba a la derecha)
    try {
      doc.addImage('/logo-altavik.png', 'PNG', 245, 10, 35, 15);
    } catch (e) {
      console.warn('Logo not found for PDF');
    }

    // Añadir título y fecha
    doc.setFontSize(18);
    doc.setTextColor(107, 148, 185); // Altavik Blue
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
        fillColor: [107, 148, 185], 
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

  const handleDownloadStatusPDF = () => {
    if (rawLeads.length === 0) return;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Añadir logo (posicionamiento arriba a la derecha)
    try {
      doc.addImage('/logo-altavik.png', 'PNG', 245, 10, 35, 15);
    } catch (e) {
      console.warn('Logo not found for PDF');
    }

    // Obtener leads del mes seleccionado o el actual si es 'all'
    const now = new Date();
    let targetMonth = now.getMonth();
    let targetYear = now.getFullYear();
    let displayMonthName = now.toLocaleString('es-ES', { month: 'long' });

    if (statusMonth !== 'all') {
      const [year, m] = statusMonth.split('-');
      targetYear = parseInt(year);
      targetMonth = parseInt(m) - 1;
      const targetDate = new Date(targetYear, targetMonth, 1);
      displayMonthName = targetDate.toLocaleString('es-ES', { month: 'long' });
    }

    // Título elegante
    doc.setFontSize(22);
    doc.setTextColor(107, 148, 185); // Altavik Blue
    doc.text('Resumen Estadístico: Estados por Semana', 14, 25);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Análisis correspondiente al mes de ${displayMonthName.toUpperCase()} ${targetYear}`, 14, 33);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 38);

    // Línea separadora
    doc.setDrawColor(241, 245, 249);
    doc.line(14, 45, 283, 45);

    const monthLeads = rawLeads.filter(l => {
      const d = new Date(l.created_at);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    const weeks = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
    const statuses = ['new', 'contacted', 'qualified', 'visiting', 'closed', 'lost'];
    
    const matrix: Record<string, Record<string, number>> = {};
    statuses.forEach(s => {
      matrix[s] = { 'Semana 1': 0, 'Semana 2': 0, 'Semana 3': 0, 'Semana 4': 0 };
    });

    monthLeads.forEach(l => {
      const date = new Date(l.created_at);
      const day = date.getDate();
      let week = 'Semana 4';
      if (day <= 7) week = 'Semana 1';
      else if (day <= 14) week = 'Semana 2';
      else if (day <= 21) week = 'Semana 3';
      
      if (matrix[l.status]) {
        matrix[l.status][week]++;
      }
    });

    // Preparar filas para la tabla
    const tableColumn = ["ESTADO DEL CLIENTE", "S1 (1-7)", "S2 (8-14)", "S3 (15-21)", "S4 (+22)", "TOTAL MES"];
    const tableRows = statuses.map(s => {
      const row = [(STATUS_MAP[s] || s).toUpperCase()];
      let total = 0;
      weeks.forEach(w => {
        const count = matrix[s][w];
        row.push(count === 0 ? '-' : count.toString());
        total += count;
      });
      row.push(total.toString());
      return row;
    });

    // Añadir fila de totales por semana
    const footerRow = ["TOTAL GENERAL"];
    let grandTotal = 0;
    weeks.forEach(w => {
      let weekTotal = 0;
      statuses.forEach(s => weekTotal += matrix[s][w]);
      footerRow.push(weekTotal.toString());
      grandTotal += weekTotal;
    });
    footerRow.push(grandTotal.toString());
    tableRows.push(footerRow);

    // Generar tabla
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 55,
      theme: 'grid',
      headStyles: { 
        fillColor: [107, 148, 185], 
        textColor: 255, 
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [248, 250, 252] },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249] }
      },
      styles: { 
        fontSize: 11,
        cellPadding: 6
      },
      didParseCell: (data) => {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [231, 238, 243]; // Altavik-100
        }
      }
    });

    // Resumen final
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('* Este informe es de carácter cuantitativo y no contiene datos personales identificativos.', 14, finalY);

    // Guardar PDF
    doc.save(`estadisticas_estados_semanal_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <PageHeader 
        title="Estadísticas y Análisis"
        icon={<PieIcon className="text-white" strokeWidth={3} size={24} />}
        subtitle={
          <p className="text-slate-500 text-sm font-medium flex items-center gap-2 mt-1">
            <span className="tabular-nums font-bold text-altavik-600 bg-altavik-50 px-2 py-0.5 rounded-lg border border-altavik-100">
              {summaryStats.totalLeads}
            </span> 
            clientes analizados
          </p>
        }
        actions={
          <div className="flex items-center gap-3">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="bg-white/50 backdrop-blur border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-altavik-500/20 shadow-sm cursor-pointer transition-all"
            >
              <option value="1w">Semanal</option>
              <option value="1m">Mensual</option>
              <option value="3m">Trimestral</option>
              <option value="6m">Semestral</option>
              <option value="12m">Anual</option>
              <option value="all">Histórico total</option>
            </select>
            <Button 
              variant="secondary"
              onClick={handleDownloadPDF}
              disabled={loading || rawLeads.length === 0}
              title="Descargar Informe PDF"
            >
              <FileText size={18} className="text-red-500" />
              PDF
            </Button>
            <Button 
              variant="secondary"
              onClick={handleDownload}
              disabled={loading || rawLeads.length === 0}
              title="Descargar CSV"
            >
              <Download size={18} className="text-altavik-500" />
              CSV
            </Button>
          </div>
        }
      />

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Principal (2/3 del ancho) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Calendar size={18} className="text-altavik-500" />
                Flujo de Entradas
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Captación por periodo</p>
            </div>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={leadsData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BRAND_BLUE} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={BRAND_BLUE} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11}} 
                />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}}
                  cursor={{stroke: BRAND_BLUE, strokeWidth: 2}}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke={BRAND_BLUE} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                  name="Nuevos Clientes"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mini Widget Informativo (1/3 del ancho) */}
        <div className="bg-gradient-to-br from-altavik-600 to-altavik-800 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between overflow-hidden relative group">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
          <div className="relative z-10">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/70 mb-1">Métrica Destacada</h3>
            <h2 className="text-2xl font-black mb-4">Rendimiento Mensual</h2>
            
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
                <p className="text-[10px] font-bold text-white/60 uppercase">Canal Principal</p>
                <p className="text-lg font-black">{sourceData[0]?.name || '---'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
                <p className="text-[10px] font-bold text-white/60 uppercase">Estado Mayoritario</p>
                <p className="text-lg font-black">{statusData[0]?.name || '---'}</p>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-white/60">CONVERSIÓN</span>
              <span className="text-xl font-black">{summaryStats.conversionRate}%</span>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Tarta: Origen de Clientes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <PieIcon size={18} className="text-altavik-500" />
                Distribución por Origen
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Procedencia de los leads</p>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
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
                  formatter={(value) => <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Tarta: Estado de Clientes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Target size={18} className="text-altavik-500" />
                Estado Actual
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Ubicación en el funnel</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusMonth}
                onChange={(e) => setStatusMonth(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-altavik-500/20 cursor-pointer"
              >
                <option value="all">Global</option>
                {availableMonths.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <Button 
                variant="secondary" 
                size="sm" 
                className="h-8 text-[10px] font-black tracking-widest gap-1.5 border-slate-200"
                onClick={handleDownloadStatusPDF}
              >
                <Download size={14} />
                PDF ESTADOS
              </Button>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
        {/* Tabla Detalle Orígenes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-white">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <PieIcon size={18} className="text-altavik-500" />
              Ranking de Canales
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Medio</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Leads</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Cuota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sourceData.map((source, index, arr) => {
                  const total = Math.max(1, arr.reduce((acc, curr) => acc + curr.value, 0));
                  return (
                  <tr key={source.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                        <span className="text-sm font-bold text-slate-700">{source.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-900">{source.value}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000" 
                            style={{
                              width: `${(source.value / total * 100)}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 min-w-[30px]">
                          {Math.round(source.value / total * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla Detalle Estados */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-white">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Target size={18} className="text-altavik-500" />
              Desglose por Estado
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Leads</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Cuota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {statusData.map((status, index, arr) => {
                  const total = Math.max(1, arr.reduce((acc, curr) => acc + curr.value, 0));
                  return (
                  <tr key={status.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[(index + 2) % COLORS.length]}}></div>
                        <span className="text-sm font-bold text-slate-700">{status.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-900">{status.value}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000" 
                            style={{
                              width: `${(status.value / total * 100)}%`,
                              backgroundColor: COLORS[(index + 2) % COLORS.length]
                            }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 min-w-[30px]">
                          {Math.round(status.value / total * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
