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
  ChevronRight,
  Calculator
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
  const handleGeneratePaymentForm = async (property: Property) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

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
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              resolve({
                data: canvas.toDataURL('image/jpeg', 0.95),
                width: img.width,
                height: img.height
              });
            } else resolve(null);
          };
          img.onerror = () => resolve(null);
          img.src = url;
        });
      };

      const logoAltavik = await getBase64Image('/logo-altavik.png');
      const logoTerravall = await getBase64Image('/logo-terravall.png');
      const logoHabitarum = await getBase64Image('/logo_habitarum.png');

      const margin = 12;
      const pageWidth = 210;
      const contentWidth = pageWidth - (margin * 2);
      const blueColor = [107, 148, 185]; // Altavik Blue
      
      const formatCurrency = (num: number) => {
        const parts = num.toFixed(2).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        if (parts[1] === '00') {
          return parts[0] + ' \u20AC';
        }
        return parts.join(',') + ' \u20AC';
      };

      // --- CONFIGURACIÓN DE COLUMNAS PARA EVITAR SOLAPE Y ALINEAR A LA DERECHA ---
      const colL = margin + 10;     // Etiquetas izquierda
      const colVR1 = margin + 69;   // Valores 1 (Derecha) - (+4mm / 15px)
      const colM = margin + 87;     // Etiquetas centro (IVA) - Ajustada
      const colVR2 = margin + 127;  // Valores 2 (Derecha) - (+4mm / 15px)
      const colR = margin + 137;    // Etiquetas TOTAL - Ajustada
      const colQ = margin + 43.5;    // Columna para cantidades (24, 0, etc) - (+4mm / 15px)
      const rightBorder = margin + contentWidth - 8; // Valores TOTAL (Derecha) - (Revertido a original)

      // --- ESTRUCTURA GENERAL ---
      doc.setDrawColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, margin, contentWidth, 272, 3, 3, 'D');

      // Logo Altavik Central Superior (Ajustado proporcionalmente)
      if (logoAltavik) {
        const maxWidth = 50;
        const ratio = logoAltavik.height / logoAltavik.width;
        const finalHeight = maxWidth * ratio;
        doc.addImage(logoAltavik.data, 'JPEG', (pageWidth / 2) - (maxWidth/2), margin + 4.5, maxWidth, finalHeight);
      }

      // --- SECCIÓN CLIENTE / VIVIENDA ---
      doc.setDrawColor(blueColor[0], blueColor[1], blueColor[2]);
      // Bajado de margin+28 a margin+38
      doc.roundedRect(margin + 5, margin + 38, contentWidth - 10, 9, 3, 3, 'D');
      
      // Cabecera de bloque Vivienda Invertida
      doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.roundedRect(margin + 5, margin + 38, contentWidth - 10, 15, 3, 3, 'F');
      
      doc.setFontSize(11);
      doc.setTextColor(255);
      doc.setFont('helvetica', 'bold');
      const headerText = `FORMA DE PAGO DE LA VIVIENDA ${property.planta} ${property.letra} PORTAL ${property.portal}`.toUpperCase();
      // Centrado horizontal y vertical en el banner azul
      doc.text(headerText, pageWidth / 2, margin + 47.5, { align: 'center' });


      // --- IMPORTES PRINCIPALES ---
      doc.setDrawColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.roundedRect(margin + 5, margin + 58, contentWidth - 10, 16, 3, 3, 'D');
      const basePrice = property.precio;
      const iva = basePrice * 0.1;
      const totalIVAIncluded = basePrice + iva;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
      
      // Ajuste de Y para centrado vertical en la caja de 16mm (58 a 74). Medio visual: 67
      const labelY = margin + 67;
      
      doc.text('IMPORTE', colL, labelY);
      doc.text(formatCurrency(basePrice), colVR1, labelY, { align: 'right' });

      doc.text('IVA 10%', colM, labelY);
      doc.text(formatCurrency(iva), colVR2, labelY, { align: 'right' });

      doc.setFontSize(9);
      // Centramos el bloque de 2 líneas respecto al eje Y = 67
      doc.text('TOTAL IVA\nINCLUIDO', colR, margin + 65.2);
      
      doc.setFontSize(12);
      // El valor del total se alinea con el mismo eje horizontal que los otros valores
      doc.text(formatCurrency(totalIVAIncluded), rightBorder, labelY, { align: 'right' });

      // --- RESERVA ---
      // Bloque RESERVA Invertido
      doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.rect(margin + 5, margin + 78, contentWidth - 10, 10, 'F');
      doc.setTextColor(255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      // Numeración 1
      doc.text('1.', margin + 10, margin + 84.5);
      const reservaText = `RESERVA: ${formatCurrency(6000)}`;
      doc.text(reservaText, pageWidth / 2, margin + 84.5, { align: 'center' });

      // --- 10% FIRMA CONTRATO ---
      const total10Percent = totalIVAIncluded * 0.1;
      const firmaContrato = total10Percent - 6000;

      doc.setDrawColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.rect(margin + 5, margin + 94, contentWidth - 10, 22, 'D');
      
      // Cabecera invertida
      doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.rect(margin + 5, margin + 94, contentWidth - 10, 9, 'F');
      doc.setFontSize(11);
      doc.setTextColor(255);
      // Numeración 2
      doc.text('2.', margin + 10, margin + 99.5);
      doc.text('10% A LA FIRMA DE CONTRATO DE COMPRAVENTA - 6000\u20AC RESERVA', pageWidth / 2, margin + 99.5, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text('IMPORTE', colL, margin + 110.5);
      doc.text(formatCurrency(total10Percent / 1.1), colVR1, margin + 110.5, { align: 'right' });
      doc.text('IVA 10%', colM, margin + 110.5);
      doc.text(formatCurrency(total10Percent - (total10Percent / 1.1)), colVR2, margin + 110.5, { align: 'right' });
      doc.text('TOTAL', colR, margin + 110.5);
      doc.text(formatCurrency(firmaContrato), rightBorder, margin + 110.5, { align: 'right' });
      doc.setFontSize(9);
      doc.text('(1)', margin + contentWidth - 2.7, margin + 110.5, { align: 'center' });
      doc.setFontSize(10);

      // --- 10% CUOTAS ---
      doc.setDrawColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.rect(margin + 5, margin + 122, contentWidth - 10, 32, 'D');
      // Cabecera invertida
      doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.rect(margin + 5, margin + 122, contentWidth - 10, 9, 'F');
      doc.setFontSize(11);
      doc.setTextColor(255);
      // Numeración 3
      doc.text('3.', margin + 10, margin + 127.5);
      doc.text('10% EN CUOTAS MENSUALES', pageWidth / 2, margin + 127.5, { align: 'center' });

      doc.setFontSize(10);
      const cuotaMensual = total10Percent / 24;
      
      doc.setTextColor(0);
      doc.text('CUOTA MENSUAL', colL, margin + 138);
      doc.text('24', colQ, margin + 138);
      doc.text(formatCurrency(cuotaMensual / 1.1), colVR1, margin + 138, { align: 'right' });
      doc.text('IVA 10%', colM, margin + 138);
      doc.text(formatCurrency(cuotaMensual - (cuotaMensual / 1.1)), colVR2, margin + 138, { align: 'right' });
      doc.text('TOTAL', colR, margin + 138);
      doc.text(formatCurrency(cuotaMensual), rightBorder, margin + 138, { align: 'right' });

      doc.text('VENCIDAS', colL, margin + 144);
      doc.text('0', colQ, margin + 144);
      doc.text(formatCurrency(0), colVR1, margin + 144, { align: 'right' });
      doc.text('IVA 10%', colM, margin + 144);
      doc.text(formatCurrency(0), colVR2, margin + 144, { align: 'right' });
      doc.text('TOTAL', colR, margin + 144);
      doc.text(formatCurrency(0), rightBorder, margin + 144, { align: 'right' });
      doc.setFontSize(9);
      doc.text('(2)', margin + contentWidth - 2.7, margin + 144, { align: 'center' });
      doc.setFontSize(10);

      doc.text('PENDIENTES', colL, margin + 150);
      doc.text('24', colQ, margin + 150);
      doc.text(formatCurrency(total10Percent / 1.1), colVR1, margin + 150, { align: 'right' });
      doc.text('IVA 10%', colM, margin + 150);
      doc.text(formatCurrency(total10Percent - (total10Percent / 1.1)), colVR2, margin + 150, { align: 'right' });
      doc.text('TOTAL', colR, margin + 150);
      doc.text(formatCurrency(total10Percent), rightBorder, margin + 150, { align: 'right' });

      // --- 80% ESCRITURA ---
      const total80Percent = totalIVAIncluded * 0.8;
      doc.setDrawColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.rect(margin + 5, margin + 160, contentWidth - 10, 18, 'D');
      // Cabecera invertida
      doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.rect(margin + 5, margin + 160, contentWidth - 10, 9, 'F');
      doc.setFontSize(11);
      doc.setTextColor(255);
      // Numeración 4
      doc.text('4.', margin + 10, margin + 165.5);
      doc.text('80% EN ESCRITURA DE COMPRAVENTA', pageWidth / 2, margin + 165.5, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text('IMPORTE', colL, margin + 174.5);
      doc.text(formatCurrency(total80Percent / 1.1), colVR1, margin + 174.5, { align: 'right' });
      doc.text('IVA 10%', colM, margin + 174.5);
      doc.text(formatCurrency(total80Percent - (total80Percent / 1.1)), colVR2, margin + 174.5, { align: 'right' });
      doc.text('TOTAL', colR, margin + 174.5);
      doc.text(formatCurrency(total80Percent), rightBorder, margin + 174.4, { align: 'right' });

      // --- PAGO A LA FIRMA DEL CONTRATO (RESUMEN) ---
      doc.setDrawColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.rect(margin + 5, margin + 184, contentWidth - 10, 42, 'D');
      // Cabecera invertida
      doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.rect(margin + 5, margin + 184, contentWidth - 10, 13, 'F');
      doc.setFontSize(12);
      doc.setTextColor(255);
      doc.text('PAGO A LA FIRMA DEL CONTRATO', pageWidth / 2, margin + 191.5, { align: 'center' });
      doc.setFontSize(8);
      doc.text('(10%)+CUOTAS VENCIDAS+MEJORAS', pageWidth / 2, margin + 195.5, { align: 'center' });

      doc.setDrawColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.setLineWidth(0.3);
      doc.line(margin + 5 + (contentWidth - 10) / 3, margin + 197, margin + 5 + (contentWidth - 10) / 3, margin + 215);
      doc.line(margin + 5 + 2 * (contentWidth - 10) / 3, margin + 197, margin + 5 + 2 * (contentWidth - 10) / 3, margin + 215);

      doc.setFontSize(9);
      doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.text('10% COMPRAVENTA (1)', margin + 5 + (contentWidth - 10) / 6, margin + 202.5, { align: 'center' });
      doc.text('CUOTAS VENCIDAS (2)', margin + 5 + (contentWidth - 10) / 2, margin + 202.5, { align: 'center' });
      doc.text('MEJORAS', margin + 5 + 5 * (contentWidth - 10) / 6, margin + 202.5, { align: 'center' });

      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(firmaContrato), margin + 5 + (contentWidth - 10) / 6, margin + 209.5, { align: 'center' });
      doc.text(formatCurrency(0), margin + 5 + (contentWidth - 10) / 2, margin + 209.5, { align: 'center' });
      doc.text('-', margin + 5 + 5 * (contentWidth - 10) / 6, margin + 209.5, { align: 'center' });

      doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.rect(margin + 5, margin + 215, contentWidth - 10, 10, 'F');
      doc.setTextColor(255);
      doc.setFontSize(13);
      doc.text('TOTAL A INGRESAR', margin + 50, margin + 221, { align: 'center' });
      doc.text(formatCurrency(firmaContrato), margin + 5 + (contentWidth - 10) / 2, margin + 221, { align: 'center' });
      doc.text('-', margin + 5 + 5 * (contentWidth - 10) / 6, margin + 221, { align: 'center' });

      doc.setTextColor(120);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('CONTRATO + CUOTAS', margin + 5 + (contentWidth - 10) / 2, margin + 230, { align: 'center' });
      doc.text('MEJORAS', margin + 5 + 5 * (contentWidth - 10) / 6, margin + 230, { align: 'center' });

      // --- LOGOS FINALES Y FECHA ---
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text('PROMUEVE:', margin + 15, 258);
      doc.text('COMERCIALIZA:', margin + 90, 258);

      // Logo Habitarum en zona inferior izquierda (PROMUEVE) (Ajustado proporcionalmente)
      if (logoHabitarum) {
        const maxWidth = 35;
        const ratio = logoHabitarum.height / logoHabitarum.width;
        const finalHeight = maxWidth * ratio;
        doc.addImage(logoHabitarum.data, 'JPEG', margin + 40, 252, maxWidth, finalHeight);
      }

      // Logo Terravall en zona inferior derecha (COMERCIALIZA) (Ajustado proporcionalmente)
      if (logoTerravall) {
        const maxWidth = 45;
        const ratio = logoTerravall.height / logoTerravall.width;
        const finalHeight = maxWidth * ratio;
        doc.addImage(logoTerravall.data, 'JPEG', margin + 120, 252, maxWidth, finalHeight);
      }

      doc.setTextColor(140);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('Este documento es meramente informativo y no reviste carácter contractual.', margin + 10, 276.5);
      doc.text('Desde la firma del contrato de compraventa las cantidades entregadas serán avaladas hasta la entrega de la vivienda.', margin + 10, 279.5);

      // Fecha en el pie, alineada a la derecha y a la altura de la última línea del disclaimer
      doc.setFontSize(9);
      doc.setTextColor(140);
      doc.setFont('helvetica', 'normal');
      const dateText = `FECHA: ${new Date().toLocaleDateString('es-ES')}`;
      doc.text(dateText, rightBorder, 279.5, { align: 'right' });

      const pdfUrl = doc.output('bloburl');
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error('Error generating payment form:', error);
      await showAlert({ title: 'Error', message: 'No se pudo generar la forma de pago.' });
    }
  };

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
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => handleGeneratePaymentForm(property)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-altavik-50 text-altavik-700 hover:bg-altavik-100 rounded-lg transition-all border border-altavik-100 whitespace-nowrap"
                          title="Generar Forma de Pago"
                        >
                          <Calculator size={16} />
                          <span className="text-xs font-bold">FORMA DE PAGO</span>
                        </button>
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