// src/pages/Inventory.tsx
import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  Home,
  BedDouble,
  Bath,
  AlertTriangle,
  Filter,
  RotateCcw,
  Copy,
  FileText,
  Upload,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import CreatePropertyModal from '../components/inventory/CreatePropertyModal';
import ImportInventoryModal from '../components/inventory/ImportInventoryModal';
import { AppNotification } from '../components/AppNotification';
import { useDialog } from '../context/DialogContext';

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
  created_at: string;
}

export default function Inventory() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [portalFilter, setPortalFilter] = useState('');
  const [dormitoriosFilter, setDormitoriosFilter] = useState('');
  const [plantaFilter, setPlantaFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [notification, setNotification] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, title: '', message: '', type: 'success' });
  const { showAlert } = useDialog();

  // Estados para el nuevo modal de confirmación de borrado
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('n_orden', { ascending: true });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!propertyToDelete) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', propertyToDelete.id);

      if (error) throw error;

      setProperties(prev => prev.filter(p => p.id !== propertyToDelete.id));
      setPropertyToDelete(null);
    } catch (error) {
      console.error('Error deleting property:', error);
      await showAlert({ title: 'Error', message: 'Error al intentar eliminar el registro.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStateFilter('');
    setPortalFilter('');
    setDormitoriosFilter('');
    setPlantaFilter('');
    setCurrentPage(1);
  };

  const handleClone = (property: Property) => {
    // Para clonar, pasamos los datos pero SIN el ID
    const { id, created_at, ...cloneData } = property;
    setEditingProperty(cloneData as any);
    setIsModalOpen(true);
  };

  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.n_orden.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.planta.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.letra.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = stateFilter === '' || p.estado_vivienda === stateFilter;
    const matchesPortal = portalFilter === '' || p.portal === portalFilter;
    const matchesDormitorios = dormitoriosFilter === '' || p.dormitorios.toString() === dormitoriosFilter;
    const matchesPlanta = plantaFilter === '' || p.planta.toLowerCase().includes(plantaFilter.toLowerCase());
    
    return matchesSearch && matchesState && matchesPortal && matchesDormitorios && matchesPlanta;
  });

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, stateFilter, portalFilter, dormitoriosFilter, plantaFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredProperties.slice(startIndex, startIndex + itemsPerPage);

  // Extraer valores únicos para los selectores de filtros
  const uniquePortals = Array.from(new Set(properties.map(p => p.portal).filter(Boolean))).sort();
  const uniqueDormitorios = Array.from(new Set(properties.map(p => p.dormitorios.toString()).filter(Boolean))).sort();

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
      `${p.sup_util} m²`,
      `${p.sup_construida} m²`,
      `${p.sup_terrazas} m²`,
      `${p.sup_porche} m²`,
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
        fontSize: 11,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: { 
        fontSize: 10,
        cellPadding: 4,
        valign: 'middle'
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'center', cellWidth: 15 },
        1: { fontStyle: 'bold', cellWidth: 35 },
        7: { fontStyle: 'bold', halign: 'right', textColor: [15, 23, 42] },
        8: { halign: 'center' }
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
    <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Inventario de Viviendas</h1>
          <p className="text-slate-500 mt-1 font-medium">Gestión profesional del catálogo de activos.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
          <button
            onClick={handleExportPDF}
            disabled={loading || isExporting || filteredProperties.length === 0}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-3 rounded-2xl font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 min-w-[150px]"
            title="Descargar Listado PDF"
          >
            {isExporting ? <Loader2 className="animate-spin text-altavik-600" size={20} /> : <FileText size={20} className="text-red-500" />}
            {isExporting ? 'Generando...' : 'Exportar PDF'}
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-3 rounded-2xl font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title="Importar Excel/CSV"
          >
            <Upload size={18} className="text-emerald-500" />
            Importar
          </button>
          <button
            onClick={() => {
              setEditingProperty(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-altavik-600 hover:bg-altavik-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg transition-all active:scale-95"
          >
            <Plus size={20} />
            Añadir Propiedad
          </button>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-altavik-600 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Buscar por Nº orden, planta o letra..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-altavik-500/20 outline-none transition-all font-medium text-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="relative w-full md:w-48">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="w-full pl-12 pr-8 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-altavik-500/20 outline-none appearance-none cursor-pointer text-slate-700 font-medium font-bold text-sm"
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

        <div className="relative w-full md:w-32">
          <select
            value={portalFilter}
            onChange={(e) => setPortalFilter(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-altavik-500/20 outline-none appearance-none cursor-pointer text-slate-700 font-medium font-bold text-sm text-center"
          >
            <option value="">Portal</option>
            {uniquePortals.map(p => <option key={p} value={p}>Portal {p}</option>)}
          </select>
        </div>

        <div className="relative w-full md:w-32">
          <select
            value={dormitoriosFilter}
            onChange={(e) => setDormitoriosFilter(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-altavik-500/20 outline-none appearance-none cursor-pointer text-slate-700 font-medium font-bold text-sm text-center"
          >
            <option value="">Dorm.</option>
            {uniqueDormitorios.map(d => <option key={d} value={d}>{d} Dorm.</option>)}
          </select>
        </div>

        <div className="relative w-full md:w-32">
          <input
            type="text"
            placeholder="Altura..."
            value={plantaFilter}
            onChange={(e) => setPlantaFilter(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-altavik-500/20 outline-none text-slate-700 font-medium font-bold text-sm text-center"
          />
        </div>

        <button
          onClick={resetFilters}
          className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
          title="Limpiar Filtros"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-altavik-600" size={40} />
            <p className="text-slate-400 font-medium">Cargando inventario...</p>
          </div>
        ) : filteredProperties.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Nº Orden</th>
                  <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Ubicación</th>
                  <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Dorm/Baños</th>
                  <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Superficies</th>
                  <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Precio</th>
                  <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentItems.map((property) => (
                  <tr key={property.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-altavik-50 text-altavik-600 flex items-center justify-center font-bold">
                          {property.n_orden}
                        </div>
                        <span className="font-bold text-slate-900">Urb. Altavik</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-center">
                        <span className="block font-bold text-slate-700">Pl. {property.planta}</span>
                        <span className="text-xs text-slate-400 font-medium">Por: {property.portal} | Let: {property.letra}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-4 text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <BedDouble size={16} />
                          <span className="font-bold">{property.dormitorios}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Bath size={16} />
                          <span className="font-bold">{property.banos}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="font-bold text-slate-600">{property.sup_util} m²</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex px-3 py-1 rounded-lg bg-slate-900 text-white font-bold text-sm">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(property.precio)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleClone(property)}
                          className="p-2 text-slate-400 hover:text-altavik-600 hover:bg-altavik-50 rounded-lg transition-all"
                          title="Clonar Vivienda"
                        >
                          <Copy size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingProperty(property);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => setPropertyToDelete(property)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Borrar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center flex flex-col items-center">
            <Home size={40} className="text-slate-200 mb-4" />
            <p className="text-slate-500 font-bold">No se encontraron propiedades</p>
          </div>
        )}

        {/* Paginación */}
        {filteredProperties.length > itemsPerPage && (
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <div className="text-sm text-slate-500 font-medium">
              Mostrando <span className="text-slate-900 font-bold">{startIndex + 1}</span> a <span className="text-slate-900 font-bold">{Math.min(startIndex + itemsPerPage, filteredProperties.length)}</span> de <span className="text-slate-900 font-bold">{filteredProperties.length}</span> viviendas
            </div>
            <div className="flex items-center gap-2">
              <button
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
                      <button
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

              <button
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

      {/* Modal de Confirmación de Borrado Profesional */}
      {propertyToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">¿Eliminar vivienda?</h3>
              <p className="text-slate-500 font-medium mb-8">
                Estás a punto de borrar la vivienda <span className="text-slate-900 font-bold">{propertyToDelete.n_orden}</span> (Planta {propertyToDelete.planta}). Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPropertyToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-4 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-100 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="animate-spin" size={20} /> : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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