import React, { useState } from 'react';
import { Calendar, FileText, Download, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: any[];
  statusLabels: Record<string, string>;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function MonthlyReportModal({ isOpen, onClose, leads, statusLabels }: MonthlyReportModalProps) {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  if (!isOpen) return null;

  const handleGenerate = () => {
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

    // Título elegante
    doc.setFontSize(24);
    doc.setTextColor(107, 148, 185); // Altavik Blue
    doc.text('Análisis de Estados por Semana', 14, 25);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    const monthName = MONTHS[month];
    doc.text(`Periodo: ${monthName.toUpperCase()} ${year}`, 14, 34);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 40);

    // Línea decorativa
    doc.setDrawColor(107, 148, 185);
    doc.setLineWidth(0.5);
    doc.line(14, 45, 60, 45);

    // Filtrar leads por el mes y año seleccionados
    const monthLeads = leads.filter(l => {
      const d = new Date(l.created_at);
      return d.getMonth() === month && d.getFullYear() === year;
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
      const row = [(statusLabels[s] || s).toUpperCase()];
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

    // Generar tabla con estilo premium
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
        halign: 'center',
        cellPadding: 5
      },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 50 },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249] }
      },
      styles: { 
        fontSize: 11,
        cellPadding: 6,
        lineColor: [226, 232, 240],
        lineWidth: 0.1
      },
      didParseCell: (data) => {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [231, 238, 243];
        }
      }
    });

    // Añadir resumen visual si hay datos
    if (grandTotal > 0) {
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.setTextColor(50);
      doc.text('Resumen del Mes', 14, finalY);
      
      doc.setFontSize(10);
      doc.text(`Total de leads captados: ${grandTotal}`, 14, finalY + 7);
      doc.text(`Promedio semanal: ${(grandTotal / 4).toFixed(1)} leads`, 14, finalY + 12);
    }

    doc.save(`informe_estados_${monthName.toLowerCase()}_${year}.pdf`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#f8fafc] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
        
        {/* Header */}
        <div className="px-8 py-5 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-altavik-50 text-altavik-600 flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Generar Informe Mensual</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-altavik-50/50 p-4 rounded-xl border border-altavik-100/50 flex items-start gap-3">
            <FileText className="text-altavik-600 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-bold text-altavik-900">Desglose Semanal</p>
              <p className="text-xs text-altavik-600 font-medium">Selecciona el periodo para generar el reporte de estados.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Mes</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-altavik-500/20 shadow-sm transition-all cursor-pointer"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Año</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-altavik-500/20 shadow-sm transition-all cursor-pointer"
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button type="button"
              onClick={handleGenerate}
              className="flex-1 px-4 py-3 bg-[#334155] text-white font-bold rounded-xl shadow-lg hover:bg-[#1e293b] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Download size={18} />
              Generar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
