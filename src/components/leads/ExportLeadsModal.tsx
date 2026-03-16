// src/components/leads/ExportLeadsModal.tsx
import { useState } from 'react';
import { X, FileText, Loader2, Calendar } from 'lucide-react'; // Cambiado icono a FileText
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useDialog } from '../../context/DialogContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportLeadsModal({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const { showAlert } = useDialog();
  const [filterType, setFilterType] = useState<'all' | 'month'>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  if (!isOpen) return null;

  const handleExport = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select('*')
        // Ordenamos por 'source' para mantener la clasificación solicitada
        .order('source', { ascending: true })
        .order('created_at', { ascending: false });

      // Aplicar filtro de mes si es necesario
      if (filterType === 'month' && selectedMonth) {
        const [year, month] = selectedMonth.split('-');
        const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString();
        const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59).toISOString();

        query = query.gte('created_at', startDate).lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data || data.length === 0) {
        await showAlert({ title: 'Aviso', message: 'No hay datos para exportar en el periodo seleccionado.' });
        setLoading(false);
        return;
      }

      // Generar PDF
      generatePDF(data);
      onClose();

    } catch (error) {
      console.error('Error exportando:', error);
      await showAlert({ title: 'Error', message: 'Hubo un error al exportar los datos.' });
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = (data: any[]) => {
    // 1. Inicializar documento PDF (Orientación horizontal para que quepan las columnas)
    const doc = new jsPDF({ orientation: 'landscape' });

    // 2. Título y Metadatos del documento
    const title = 'Listado de Clientes - ALTAVIK';
    const subtitle = filterType === 'month'
      ? `Filtrado por mes: ${selectedMonth}`
      : 'Histórico completo';

    doc.setFontSize(18);
    doc.text(title, 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 30);
    doc.text(`Fecha de exportación: ${new Date().toLocaleDateString('es-ES')}`, 14, 36);

    // 3. Definir columnas
    const tableColumn = ["Nombre", "Email", "Teléfono", "Origen", "Estado", "Fecha Alta"];

    // 4. Mapear datos a filas
    const tableRows: any[] = [];

    data.forEach(lead => {
      const leadData = [
        lead.name || 'Sin nombre',
        lead.email || '',
        lead.phone || '',

        lead.source || 'Desconocido', // Importante: Clasificación visible
        lead.status?.toUpperCase() || 'NUEVO',
        new Date(lead.created_at).toLocaleDateString('es-ES'),
      ];
      tableRows.push(leadData);
    });

    // 5. Generar tabla con autoTable
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45, // Empezar debajo del título
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [16, 185, 129], // Color Emerald-500 para la cabecera
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { fontStyle: 'bold' }, // Nombre en negrita
        4: { fontStyle: 'bold', textColor: [80, 80, 80] } // Origen destacado
      },
      // Agrupar visualmente o colorear filas alternas es automático
    });

    // 6. Guardar archivo
    const fileName = `leads_mirapinos_${filterType === 'month' ? selectedMonth : 'todos'}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="text-red-600" size={20} /> {/* Icono rojo para PDF */}
            Exportar PDF
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-slate-500">
            Selecciona el rango de fechas. Se generará un documento <strong>PDF</strong> clasificado por Origen.
          </p>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="filter"
                checked={filterType === 'all'}
                onChange={() => setFilterType('all')}
                className="text-altavik-600 focus:ring-altavik-500"
              />
              <span className="text-sm font-bold text-slate-700">Exportar todo el histórico</span>
            </label>

            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="filter"
                checked={filterType === 'month'}
                onChange={() => setFilterType('month')}
                className="text-altavik-600 focus:ring-altavik-500"
              />
              <div className="flex-1">
                <span className="text-sm font-bold text-slate-700 block mb-1">Filtrar por mes</span>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  <input
                    type="month"
                    value={selectedMonth}
                    disabled={filterType !== 'month'}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="text-xs bg-transparent border-none p-0 focus:ring-0 text-slate-600 font-medium disabled:opacity-50"
                  />
                </div>
              </div>
            </label>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors text-xs"
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
              Descargar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}