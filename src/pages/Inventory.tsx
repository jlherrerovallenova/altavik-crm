// src/pages/Inventory.tsx
import React, { useState, useEffect } from 'react';
import {
  Search,
  Edit2,
  Loader2,
  Home,
  BedDouble,
  Bath,
  Filter,
  RotateCcw,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Euro,
  PencilRuler,
  Plus,
  Download,
  FileDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import CreatePropertyModal from '../components/inventory/CreatePropertyModal';
import ImportInventoryModal from '../components/inventory/ImportInventoryModal';
import UploadFichasModal from '../components/inventory/UploadFichasModal';
import { AppNotification } from '../components/AppNotification';
import { useDialog } from '../context/DialogContext';
import PaymentFormModal from '../components/inventory/PaymentFormModal';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useSettings } from '../hooks/useSettings';

interface Property {
  id: string;
  n_orden: string;
  planta: string;
  portal: string;
  letra: string;
  orientacion: string;
  dormitorios: number;
  banos: number;
  sup_util: number;
  sup_construida: number;
  sup_terrazas: number;
  sup_porche: number;
  garaje: string;
  trastero: string;
  precio: number;
  estado_vivienda?: string;
  ficha_url?: string;
  created_at: string;
}

export default function Inventory() {
  const { data: settings } = useSettings();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('DISPONIBLE');
  const [portalFilter, setPortalFilter] = useState('');
  const [dormitoriosFilter, setDormitoriosFilter] = useState('');
  const [plantaFilter, setPlantaFilter] = useState('');
  const [orientacionFilter, setOrientacionFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFichasModalOpen, setIsFichasModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [notification, setNotification] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, title: '', message: '', type: 'success' });
  const { showAlert } = useDialog();

  const [isExporting, setIsExporting] = useState(false);
  
  // Nuevo estado para el modal de forma de pago premium
  const [selectedPropertyForPayment, setSelectedPropertyForPayment] = useState<Property | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Estado para ordenación
  const [sortConfig, setSortConfig] = useState<{ key: keyof Property | ''; direction: 'asc' | 'desc' | '' }>({
    key: '',
    direction: ''
  });

  useEffect(() => {
    fetchProperties();
  }, []);



  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory')
        .select('*');

      if (error) throw error;

      // Ordenar numéricamente por n_orden (1, 2, 3... en lugar de 1, 10, 11...)
      const sortedData = ((data as Property[]) || []).sort((a, b) => {
        const valA = a.n_orden || '';
        const valB = b.n_orden || '';
        const numA = parseInt(valA) || 0;
        const numB = parseInt(valB) || 0;
        if (numA !== numB) return numA - numB;
        // Si los números son iguales (o ambos 0), comparamos como string por si acaso (natural sort)
        return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      });

      setProperties(sortedData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: keyof Property) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStateFilter('DISPONIBLE');
    setPortalFilter('');
    setDormitoriosFilter('');
    setPlantaFilter('');
    setOrientacionFilter('');
    setCurrentPage(1);
  };



  const filteredProperties = properties.filter(p => {
    const nOrden = p.n_orden || '';
    const planta = p.planta || '';
    const letra = p.letra || '';

    const matchesSearch = nOrden.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          planta.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          letra.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = stateFilter === '' || p.estado_vivienda === stateFilter;
    const matchesPortal = portalFilter === '' || p.portal === portalFilter;
    const matchesDormitorios = dormitoriosFilter === '' || p.dormitorios?.toString() === dormitoriosFilter;
    const matchesPlanta = plantaFilter === '' || planta.toLowerCase().includes(plantaFilter.toLowerCase());
    const matchesOrientacion = orientacionFilter === '' || p.orientacion === orientacionFilter;
    
    return matchesSearch && matchesState && matchesPortal && matchesDormitorios && matchesPlanta && matchesOrientacion;
  }).sort((a, b) => {
    if (sortConfig.key === 'precio') {
      const valA = a.precio || 0;
      const valB = b.precio || 0;
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    }
    // Si no hay ordenación por precio, mantenemos el orden por n_orden (comportamiento original)
    const valA = a.n_orden || '';
    const valB = b.n_orden || '';
    const numA = parseInt(valA) || 0;
    const numB = parseInt(valB) || 0;
    if (numA !== numB) return numA - numB;
    return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
  });

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, stateFilter, portalFilter, dormitoriosFilter, plantaFilter, orientacionFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredProperties.slice(startIndex, startIndex + itemsPerPage);

  // Extraer valores únicos para los selectores de filtros
  const uniquePortals = Array.from(new Set(properties.map(p => p.portal).filter(Boolean))).sort();
  const uniqueDormitorios = Array.from(new Set(properties.map(p => p.dormitorios?.toString()).filter(Boolean))).sort();
  const uniquePlantas = Array.from(new Set(properties.map(p => p.planta).filter(Boolean))).sort();
  const orientationOrder = ['N', 'N/S', 'S', 'S/E', 'E', 'E/O', 'O'];
  const uniqueOrientations = Array.from(new Set(properties.map(p => p.orientacion).filter(Boolean)))
    .sort((a, b) => {
      const ai = orientationOrder.indexOf(a);
      const bi = orientationOrder.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  // La función handleGeneratePaymentForm ha sido movida al componente especializado PaymentFormModal

  const handleExportPDF = async () => {
    if (filteredProperties.length === 0) return;

    try {
      setIsExporting(true);
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Función para cargar imagen de forma asíncrona y convertirla a base64 preservando calidad y fondo
      const getBase64Image = (url: string): Promise<{ data: string, width: number, height: number } | null> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // 1. Rellenar con blanco (para PNGs transparentes)
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              // 2. Dibujar imagen
              ctx.drawImage(img, 0, 0);
              // 3. Exportar como JPEG (máxima compatibilidad)
              const dataURL = canvas.toDataURL('image/jpeg', 0.95);
              resolve({ data: dataURL, width: img.width, height: img.height });
            } else {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = url;
        });
      };

      const logoInfo = await getBase64Image('/logo-altavik.png');
      
      // Función para añadir cabecera premium
      const addHeader = () => {
        // Franja superior blanca para el logotipo
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 297, 20, 'F');
        
        // Líneas decorativas inferiores
        doc.setFillColor(15, 23, 42); // Slate-900
        doc.rect(0, 20, 297, 0.5, 'F');
        
        doc.setFillColor(107, 148, 185); // Altavik-500
        doc.rect(0, 20.5, 297, 1.5, 'F');

        // Logo si existe
        if (logoInfo) {
          const targetHeight = 10; // Altura fija deseada en mm
          const aspectRatio = logoInfo.width / logoInfo.height;
          const targetWidth = targetHeight * aspectRatio;
          
          // Centrado vertical en la franja de 20mm
          doc.addImage(logoInfo.data, 'JPEG', 14, (20 - targetHeight) / 2, targetWidth, targetHeight);
        } else {
          doc.setTextColor(15, 23, 42);
          doc.setFontSize(10);
          doc.text('ALTAVIK', 14, 12);
        }

        // Título y Subtítulo
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('CATÁLOGO DE VIVIENDAS', 14, 30);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        const statusText = stateFilter === '' ? 'TODOS LOS ESTADOS' : stateFilter.toUpperCase();
        doc.text(`INVENTARIO ACTUAL - MODO: ${statusText}`, 14, 37);

        // Fecha y página (derecha)
        doc.setFontSize(9);
        doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 240, 30);
        doc.text(`Total registros: ${filteredProperties.length}`, 240, 35);
      };

      addHeader();

    // Preparar datos
    const tableColumn = ["№", "PLANTA/PORTAL", "DORM/BAÑOS", "SUP. ÚTIL", "S. CONST.", "S. TERRAZA", "S. PORCHE", "PRECIO", "ESTADO"];
    const tableRows = filteredProperties.map(p => [
      p.n_orden,
      `${p.planta} - ${p.portal} ${p.letra}`,
      `${p.dormitorios} / ${p.banos}`,
      `${p.sup_util?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`,
      `${p.sup_construida?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`,
      `${p.sup_terrazas?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`,
      `${p.sup_porche?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`,
      new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(p.precio),
      (p.estado_vivienda || 'DISPONIBLE').toUpperCase()
    ]);

    // Generar tabla con estilo corporativo
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      headStyles: { 
        fillColor: [107, 148, 185], // Altavik-500
        textColor: 255, 
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: { 
        fontSize: 10,
        cellPadding: 4,
        valign: 'middle',
        halign: 'center'
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 12 },
        1: { fontStyle: 'bold', cellWidth: 35 },
        7: { fontStyle: 'bold', textColor: [15, 23, 42] },
        8: { cellWidth: 30 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didParseCell: (data) => {
        // Colorear celda de estado
        if (data.section === 'body' && data.column.index === 8) {
          const status = data.cell.raw as string;
          if (status === 'DISPONIBLE') data.cell.styles.textColor = [107, 148, 185];
          if (status === 'RESERVADA') data.cell.styles.textColor = [245, 158, 11];
          if (['BLOQUEADA', 'NO DISPONIBLE'].includes(status)) data.cell.styles.textColor = [239, 68, 68];
        }
      }
    });

    // Pie de página
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount}`, 270, 200);
    }

    // Generar el PDF y abrirlo en una nueva pestaña (más fiable para depuración y visualización)
    const pdfOutput = doc.output('bloburl');
    window.open(pdfOutput, '_blank');
    
    // También guardarlo por si el usuario lo prefiere
    doc.save(`listado_viviendas_${stateFilter || 'todas'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      await showAlert({ 
        title: 'Error de Exportación', 
        message: 'No se pudo generar el documento PDF correctamente.' 
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <PageHeader 
        title="Inventario de Viviendas"
        icon={<Home size={24} strokeWidth={3} />}
        subtitle={
          <p className="text-slate-500 text-sm font-medium flex items-center gap-2 mt-1">
            <span className="tabular-nums font-bold text-altavik-600 bg-altavik-50 px-2 py-0.5 rounded-lg border border-altavik-100">
              {filteredProperties.length}
            </span> 
            unidades encontradas
          </p>
        }
        actions={
          <Button type="button"
            onClick={handleExportPDF}
            disabled={loading || isExporting || filteredProperties.length === 0}
            isLoading={isExporting}
          >
            <FileText size={18} /> Exportar PDF
          </Button>
        }
      />

      <Card variant="glass" noPadding className="mb-6">
        <div className="flex flex-col lg:flex-row gap-3 items-center p-3">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-altavik-600 transition-colors" size={18} />
            <input
              type="text"
              autoComplete="off"
              id="main-inventory-search"
              spellCheck="false"
              placeholder="Buscar por Nº orden, planta o letra..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-slate-200/50 rounded-xl text-sm focus:ring-4 focus:ring-altavik-500/10 focus:border-altavik-500 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex w-full lg:w-auto gap-3 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:w-40 lg:w-48 min-w-[160px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full pl-9 pr-6 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none appearance-none shadow-sm cursor-pointer text-slate-700"
              >
                <option value="">Estado</option>
                <option value="DISPONIBLE">DISPONIBLE</option>
                <option value="NO DISPONIBLE">NO DISPONIBLE</option>
                <option value="BLOQUEADA">BLOQUEADA</option>
                <option value="RESERVADA">RESERVADA</option>
                <option value="CONTRATO CV">CONTRATO CV</option>
                <option value="ESCRITURADA">ESCRITURADA</option>
              </select>
            </div>

            <div className="relative flex-1 sm:w-24 lg:w-28 min-w-[90px]">
              <select
                value={portalFilter}
                onChange={(e) => setPortalFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none appearance-none shadow-sm cursor-pointer text-slate-700 font-medium text-center"
              >
                <option value="">Portal</option>
                {uniquePortals.map(p => <option key={p} value={p}>Portal {p}</option>)}
              </select>
            </div>

            <div className="relative flex-1 sm:w-24 lg:w-28 min-w-[90px]">
              <select
                value={dormitoriosFilter}
                onChange={(e) => setDormitoriosFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none appearance-none shadow-sm cursor-pointer text-slate-700 font-medium text-center"
              >
                <option value="">Dorm.</option>
                {uniqueDormitorios.map(d => <option key={d} value={d}>{d} Dorm.</option>)}
              </select>
            </div>

            <div className="relative flex-1 sm:w-24 lg:w-28 min-w-[90px]">
              <select
                value={plantaFilter}
                onChange={(e) => setPlantaFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none appearance-none shadow-sm cursor-pointer text-slate-700 font-medium text-center"
              >
                <option value="">Altura</option>
                {uniquePlantas.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="relative flex-1 sm:w-28 lg:w-32 min-w-[100px]">
              <select
                value={orientacionFilter}
                onChange={(e) => setOrientacionFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-altavik-500/20 focus:border-altavik-500 outline-none appearance-none shadow-sm cursor-pointer text-slate-700 font-medium text-center"
              >
                <option value="">Orient.</option>
                {uniqueOrientations.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <button type="button"
              onClick={resetFilters}
              className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors shadow-sm flex items-center justify-center shrink-0"
              title="Limpiar Filtros"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </Card>

      {/* Tabla */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-altavik-600" size={40} />
            <p className="text-slate-400 font-medium">Cargando inventario...</p>
          </div>
        ) : filteredProperties.length > 0 ? (
          <>
            {/* MOBILE VIEW */}
            <div className="md:hidden flex flex-col gap-4 p-4 bg-slate-50/50">
              {currentItems.map((property) => (
                <div key={property.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 relative overflow-hidden flex flex-col gap-3">
                  {property.estado_vivienda && property.estado_vivienda !== 'DISPONIBLE' && (
                    <div className={`absolute top-0 left-0 right-0 py-1 text-center text-[10px] font-black uppercase tracking-widest ${
                      property.estado_vivienda === 'RESERVADA' ? 'bg-indigo-500 text-white' : 
                      property.estado_vivienda === 'BLOQUEADA' || property.estado_vivienda === 'NO DISPONIBLE' ? 'bg-red-500 text-white' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {property.estado_vivienda}
                    </div>
                  )}
                  
                  <div className={`flex items-start justify-between ${property.estado_vivienda && property.estado_vivienda !== 'DISPONIBLE' ? 'mt-4' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-inner shrink-0 ${
                          property.estado_vivienda === 'RESERVADA' 
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                            : 'bg-altavik-50 text-altavik-600 border border-altavik-200'
                        }`}>
                        {property.n_orden}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Portal {property.portal}</p>
                        <p className="text-lg font-black text-slate-800 leading-tight">Planta {property.planta} - {property.letra}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="inline-block px-3 py-1.5 rounded-lg bg-altavik-600 text-white font-black text-sm shadow-sm">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(property.precio)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                       <BedDouble size={16} className="text-slate-400" />
                       <span className="font-bold text-slate-700 text-sm">{property.dormitorios} Dorms</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                       <Bath size={16} className="text-slate-400" />
                       <span className="font-bold text-slate-700 text-sm">{property.banos} Baños</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-1 border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Superficie</p>
                      <p className="font-bold text-slate-700 text-sm">{property.sup_util?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m² <span className="font-normal text-xs text-slate-400">útiles</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exterior</p>
                      <p className="font-bold text-slate-700 text-sm">{((property.sup_terrazas || 0) + (property.sup_porche || 0)).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 mt-1">
                    {property.ficha_url && (
                      <a href={property.ficha_url} target="_blank" rel="noopener noreferrer" className="p-2 text-altavik-600 hover:bg-altavik-50 rounded-lg transition-all bg-white border border-slate-200">
                        <PencilRuler size={18} />
                      </a>
                    )}
                    <button type="button" onClick={() => { setSelectedPropertyForPayment(property); setIsPaymentModalOpen(true); }} className="p-2 text-altavik-600 hover:bg-altavik-50 rounded-lg transition-all bg-white border border-slate-200">
                      <Euro size={18} />
                    </button>
                    <button type="button" onClick={() => { setEditingProperty(property); setIsModalOpen(true); }} className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors flex items-center gap-2">
                      <Edit2 size={16} /> Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP VIEW (Table) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  <th className="px-4 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Nº Orden</th>
                  <th className="px-4 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Portal</th>
                  <th className="px-4 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Planta/Letra</th>
                  <th className="px-4 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Dorm/Baños</th>
                  <th className="px-4 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Útil/Const.</th>
                  <th className="px-4 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Terrazas/Porches</th>
                  <th className="px-4 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Orientación</th>
                  <th 
                    className="px-4 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => handleSort('precio')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Precio
                      {sortConfig.key === 'precio' ? (
                        sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-altavik-600" /> : <ChevronDown size={14} className="text-altavik-600" />
                      ) : (
                        <div className="flex flex-col opacity-20">
                          <ChevronUp size={10} />
                          <ChevronDown size={10} className="-mt-1" />
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentItems.map((property) => (
                  <tr 
                    key={property.id} 
                    className={`hover:bg-slate-50/50 transition-colors group relative ${
                      property.estado_vivienda === 'RESERVADA' 
                        ? 'bg-indigo-50/40' 
                        : property.estado_vivienda === 'BLOQUEADA' || property.estado_vivienda === 'NO DISPONIBLE'
                        ? 'opacity-75 grayscale-[0.5]'
                        : ''
                    }`}
                  >
                    <td className="px-4 py-5">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base shadow-sm shrink-0 ${
                          property.estado_vivienda === 'RESERVADA' 
                            ? 'bg-indigo-600 text-white shadow-indigo-200' 
                            : 'bg-altavik-50 text-altavik-600'
                        }`}>
                          {property.n_orden}
                        </div>
                        {property.estado_vivienda && property.estado_vivienda !== 'DISPONIBLE' && (
                          <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md border ${
                            property.estado_vivienda === 'RESERVADA' 
                              ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                              : property.estado_vivienda === 'BLOQUEADA' || property.estado_vivienda === 'NO DISPONIBLE'
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {property.estado_vivienda}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <div className="text-center font-bold text-slate-700 text-base">
                        {property.portal}
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <div className="text-center font-bold text-slate-700 text-base whitespace-nowrap">
                        {property.planta} - {property.letra}
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex items-center justify-center gap-3 text-slate-500">
                        <div className="flex items-center gap-1">
                          <BedDouble size={18} className="text-slate-400" />
                          <span className="font-bold text-sm">{property.dormitorios}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Bath size={18} className="text-slate-400" />
                          <span className="font-bold text-sm">{property.banos}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-700 text-sm">{property.sup_util?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²</span>
                        <span className="text-[11px] text-slate-400 font-medium">Const: {property.sup_construida?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²</span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-700 text-sm">
                          {((property.sup_terrazas || 0) + (property.sup_porche || 0)).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium leading-tight">Terraza: {property.sup_terrazas?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²</span>
                        <span className="text-[10px] text-slate-400 font-medium leading-tight">Porche: {property.sup_porche?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²</span>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <div className="text-center text-sm font-medium text-slate-600">
                        {property.orientacion || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <span className="inline-flex px-3.5 py-2 rounded-lg bg-altavik-600 text-white font-bold text-sm whitespace-nowrap shadow-sm">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(property.precio)}
                      </span>
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex justify-center items-center gap-1">
                        {property.ficha_url && (
                          <a
                            href={property.ficha_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-altavik-600 hover:bg-altavik-50 rounded-lg transition-all"
                            title="Ver Ficha PDF"
                          >
                            <PencilRuler size={18} />
                          </a>
                        )}
                        <button type="button"
                          onClick={() => {
                            setSelectedPropertyForPayment(property);
                            setIsPaymentModalOpen(true);
                          }}
                          className="p-2 text-altavik-600 hover:bg-altavik-50 rounded-lg transition-all"
                          title="Forma de Pago Premium"
                        >
                          <Euro size={18} />
                        </button>

                        <button type="button"
                          onClick={() => {
                            setEditingProperty(property);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <div className="py-20 text-center flex flex-col items-center">
            <Home size={40} className="text-slate-200 mb-4" />
            <p className="text-slate-500 font-bold">No se encontraron propiedades</p>
          </div>
        )}

        {/* Paginación */}
        {filteredProperties.length > itemsPerPage && (
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-500 font-medium">
              Mostrando <span className="text-slate-900 font-bold">{startIndex + 1}</span> a <span className="text-slate-900 font-bold">{Math.min(startIndex + itemsPerPage, filteredProperties.length)}</span> de <span className="text-slate-900 font-bold">{filteredProperties.length}</span> viviendas
            </div>
            <div className="flex items-center gap-2">
              <button type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && <span className="px-2 text-slate-400">...</span>}
                      <button type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-xl font-bold transition-all ${
                          currentPage === page 
                            ? 'bg-altavik-600 text-white shadow-lg' 
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>

              <button type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals Viviendas */}
      {isModalOpen && (
        <CreatePropertyModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProperty(null);
          }}
          onSuccess={() => {
            fetchProperties();
            setIsModalOpen(false);
            setNotification({ show: true, type: 'success', title: 'Completado', message: 'Vivienda guardada con éxito.' });
          }}
          initialData={editingProperty}
        />
      )}

      {isImportModalOpen && (
        <ImportInventoryModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            fetchProperties();
            setNotification({ show: true, type: 'success', title: 'Importación Finalizada', message: 'El catálogo se ha actualizado correctamente.' });
          }}
        />
      )}

      {isFichasModalOpen && (
        <UploadFichasModal
          isOpen={isFichasModalOpen}
          onClose={() => setIsFichasModalOpen(false)}
          onSuccess={() => {
            fetchProperties();
          }}
        />
      )}

      {isPaymentModalOpen && selectedPropertyForPayment && (
        <PaymentFormModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedPropertyForPayment(null);
          }}
          property={selectedPropertyForPayment}
        />
      )}

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