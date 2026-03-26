import { 
  X, 
  Download, 
  Info, 
  Home, 
  Calendar, 
  TrendingUp, 
  FileText,
  BadgeCheck,
  Building2,
  CheckCircle2
} from 'lucide-react';
import jsPDF from 'jspdf';
import { PDFDocument } from 'pdf-lib';

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
}

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
}

export default function PaymentFormModal({ isOpen, onClose, property }: PaymentFormModalProps) {
  if (!isOpen) return null;

  const basePrice = property.precio;
  const iva = basePrice * 0.1;
  const ajd = basePrice * 0.015;
  const totalWithIVA = basePrice + iva;
  const reserva = 6000;
  const tenPercent = totalWithIVA * 0.1;
  const firmaContrato = tenPercent - reserva;
  const monthlyQuotaTotal = totalWithIVA * 0.1;
  const monthlyAmount = monthlyQuotaTotal / 24;
  const eightyPercent = totalWithIVA * 0.8;

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num).replace('€', '€').trim();
  };

    const handleGeneratePDF = async () => {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const blueColor = [107, 148, 185]; // Altavik Blue
      const deepBlue = [15, 23, 42];    // Slate 900
      const lightBlue = [241, 248, 255]; // Soft selection blue
      const darkGray = [51, 65, 85];    // Slate 700
      const softGray = [148, 163, 184]; // Slate 400
      const borderGray = [226, 232, 240];

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
              ctx.drawImage(img, 0, 0);
              resolve({
                data: canvas.toDataURL('image/png', 1.0),
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

      const drawHeader = (isSecondPage = false) => {
        // Fondo blanco
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 210, 45, 'F');

        if (logoAltavik) {
          const maxWidth = 45;
          const ratio = logoAltavik.height / logoAltavik.width;
          const finalHeight = maxWidth * ratio;
          doc.addImage(logoAltavik.data, 'PNG', 15, 10, maxWidth, finalHeight);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
        doc.text('FORMA DE PAGO', 195, 30, { align: 'right' });
        
        if (isSecondPage) {
          doc.setFontSize(10);
          doc.setTextColor(softGray[0], softGray[1], softGray[2]);
          doc.text('PLANO DE VIVIENDA SELECCIONADA', 195, 36, { align: 'right' });
        }
      };

      const drawFooter = () => {
        doc.setFontSize(7);
        doc.setTextColor(softGray[0], softGray[1], softGray[2]);
        doc.text('Este documento tiene carácter meramente informativo y podrá ser modificado según condiciones comerciales. Altavik Residencial.', 15, 290);
        doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, 195, 290, { align: 'right' });
      };

      // --- PÁGINA 1: DETALLE ECONÓMICO ---
      drawHeader();

      // --- HERO SECTION: PROPIEDAD ---
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, 45, 180, 45, 4, 4, 'F');
      
      // Divider sutil vertical
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.line(105, 52, 105, 83);

      // Info Inmueble
      doc.setFontSize(9);
      doc.setTextColor(softGray[0], softGray[1], softGray[2]);
      doc.text('INMUEBLE SELECCIONADO', 25, 55);
      
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(deepBlue[0], deepBlue[1], deepBlue[2]);
      doc.text(`P${property.portal} \u00B7 ${property.planta} - ${property.letra}`, 25, 68);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.text('RESIDENCIAL ALTAVIK', 25, 76);

      // Info Superficies
      doc.setFontSize(9);
      doc.setTextColor(softGray[0], softGray[1], softGray[2]);
      doc.text('SUPERFICIES Y DISTRIBUCIÓN', 115, 55);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(deepBlue[0], deepBlue[1], deepBlue[2]);
      const centerX = 112.5;
      doc.setLineWidth(0.2);
      doc.setDrawColor(blueColor[0], blueColor[1], blueColor[2]);

      // ICONO m2
      doc.roundedRect(centerX - 2, 60.5, 4, 4, 0.5, 0.5);
      doc.line(centerX, 60.5, centerX, 64.5);
      doc.line(centerX - 2, 62.5, centerX + 2, 62.5);
      doc.text(`${property.sup_util.toFixed(2)} m\u00B2 \u00DAtiles`, 118, 64);

      // ICONO Dormitorios
      doc.roundedRect(centerX - 1.5, 68, 3, 4.5, 0.4, 0.4);
      doc.line(centerX - 1.5, 69.2, centerX + 1.5, 69.2);
      doc.roundedRect(centerX - 1.1, 68.3, 2.2, 0.6, 0.2, 0.2);
      doc.text(`${property.dormitorios} Dormitorios`, 118, 72);

      // ICONO Baños
      doc.line(centerX - 2.5, 78.5, centerX - 2.5, 77.5);
      doc.line(centerX - 2.5, 77.5, centerX + 0.5, 77.5);
      doc.roundedRect(centerX, 77.5, 2.5, 0.8, 0.2, 0.2);
      doc.text(`${property.banos} Baños`, 118, 80);

      // --- SECCIÓN DE PRECIO ---
      doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.roundedRect(15, 95, 180, 25, 4, 4, 'F');
      
      doc.setTextColor(255);
      
      // PRECIO BASE (Prioridad Alta)
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('PRECIO BASE', 25, 106);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(property.precio), 185, 106, { align: 'right' });
      
      // LÍNEA DIVISORA SUTIL
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.1);
      doc.line(25, 109.5, 185, 109.5);
      
      // TOTAL (Prioridad Baja)
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('IMPORTE TOTAL (10% IVA INCLUIDO)', 25, 116);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(totalWithIVA), 185, 116, { align: 'right' });

      let currentY = 125;

      const drawStep = (idx: number, title: string, subtitle: string, date: string, amount: number, showBreakdown = true) => {
        const stepBase = amount / 1.1;
        const stepIva = amount - stepBase;

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(15, currentY, 180, 22, 3, 3, 'F');
        
        doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2]);
        doc.circle(26, currentY + 11, 4.5, 'F');
        doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(idx.toString(), 26, currentY + 14, { align: 'center' });

        doc.setTextColor(deepBlue[0], deepBlue[1], deepBlue[2]);
        doc.setFontSize(10);
        doc.text(title, 35, currentY + 8);
        
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(softGray[0], softGray[1], softGray[2]);
        doc.text(subtitle, 35, currentY + 13);
        if (date) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
          doc.text(date.toUpperCase(), 35, currentY + 17.5);
        }

        doc.setFont('helvetica', 'bold');
        if (showBreakdown) {
          doc.setFontSize(9);
          doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
          doc.text(formatCurrency(stepBase), 135, currentY + 12, { align: 'right' });
          doc.text(formatCurrency(stepIva), 155, currentY + 12, { align: 'right' });
        }
        
        doc.setTextColor(deepBlue[0], deepBlue[1], deepBlue[2]);
        doc.setFontSize(10);
        doc.text(formatCurrency(amount), 185, currentY + 12, { align: 'right' });

        currentY += 24; 
      };

      drawStep(1, 'Reserva de Vivienda', 'Bloqueo inmediato de la unidad', 'INMEDIATO', reserva, false);

      currentY += 4; 
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(softGray[0], softGray[1], softGray[2]);
      doc.text('BASE IMPONIBLE', 135, currentY, { align: 'right' });
      doc.text('IVA (10%)', 155, currentY, { align: 'right' });
      doc.text('TOTAL A PAGAR', 185, currentY, { align: 'right' });

      currentY += 4; 
      drawStep(2, 'Firma de Contrato', 'Firma de la Compraventa (10% - reserva)', '', firmaContrato);
      drawStep(3, 'Aplazamiento 10%', `24 cuotas mensuales de ${formatCurrency(monthlyAmount)}`, '24 MESES', monthlyQuotaTotal);
      drawStep(4, 'Entrega de Llaves', 'Desembolso final y escrituración', 'ENTREGA', eightyPercent);

      currentY += 4; 
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.line(15, currentY, 195, currentY);
      
      currentY += 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(deepBlue[0], deepBlue[1], deepBlue[2]);
      doc.text('RESUMEN DE CONCEPTOS', 15, currentY);

      currentY += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.text('Base Imponible Inmueble', 15, currentY);
      doc.text(formatCurrency(basePrice), 195, currentY, { align: 'right' });

      currentY += 6;
      doc.text('IVA Aplicable (10%)', 15, currentY);
      doc.text(formatCurrency(iva), 195, currentY, { align: 'right' });

      currentY += 6;
      doc.text('IAJD (Tipo General 1,5%)', 15, currentY);
      doc.text(formatCurrency(ajd), 195, currentY, { align: 'right' });

      currentY += 10;
      try {
        const logoHabitarum = await getBase64Image('/logo_habitarum.png');
        const logoTerravall = await getBase64Image('/logo-terravall.png');
        
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(softGray[0], softGray[1], softGray[2]);

        if (logoHabitarum) {
          doc.addImage(logoHabitarum.data, 'PNG', 69, currentY, 25, 8);
          doc.text('PROMUEVE', 81.5, currentY + 12, { align: 'center' });
        }
        if (logoTerravall) {
          doc.addImage(logoTerravall.data, 'PNG', 109, currentY, 32, 8);
          doc.text('COMERCIALIZA', 125, currentY + 12, { align: 'center' });
        }
      } catch (e) {}

      drawFooter();

      const fileName = `Portal ${property.portal}_Planta ${property.planta}_Letra ${property.letra}_fecha ${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.pdf`;

      // --- GENERAR PDF FINAL (CON O SIN FICHA) ---
      try {
        const firstPageBytes = doc.output('arraybuffer');
        
        if (property.ficha_url) {
          const isPdf = property.ficha_url.toLowerCase().endsWith('.pdf');
          
          if (isPdf) {
            // Caso PDF: Fusionamos páginas con pdf-lib
            const mergedPdf = await PDFDocument.create();
            
            // 1. Añadir primera página de jsPDF
            const firstPdf = await PDFDocument.load(firstPageBytes);
            const [firstPage] = await mergedPdf.copyPages(firstPdf, [0]);
            mergedPdf.addPage(firstPage);
            
            // 2. Cargar y añadir páginas de la ficha
            const fichaResponse = await fetch(property.ficha_url);
            const fichaBytes = await fichaResponse.arrayBuffer();
            const fichaPdf = await PDFDocument.load(fichaBytes);
            const fichaPages = await mergedPdf.copyPages(fichaPdf, fichaPdf.getPageIndices());
            fichaPages.forEach((page) => mergedPdf.addPage(page));
            
            // 3. Guardar final
            const mergedPdfBytes = await mergedPdf.save();
            const blob = new Blob([mergedPdfBytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(url);
          } else {
            // Caso Imagen: Usamos la lógica anterior de jsPDF (más simple)
            const fichaImg = await getBase64Image(property.ficha_url);
            if (fichaImg) {
              doc.addPage();
              drawHeader(true);
              
              const margin = 15;
              const availableWidth = 210 - (margin * 2);
              const availableHeight = 297 - 45 - 20;
              const imgRatio = fichaImg.width / fichaImg.height;
              const containerRatio = availableWidth / availableHeight;
              
              let finalW, finalH;
              if (imgRatio > containerRatio) {
                finalW = availableWidth;
                finalH = availableWidth / imgRatio;
              } else {
                finalH = availableHeight;
                finalW = availableHeight * imgRatio;
              }
              
              const xPos = margin + (availableWidth - finalW) / 2;
              const yPos = 45 + (availableHeight - finalH) / 2;
              
              doc.addImage(fichaImg.data, 'PNG', xPos, yPos, finalW, finalH);
              drawFooter();
            }
            doc.save(fileName);
          }
        } else {
          // Sin ficha: Guardamos el documento original
          doc.save(fileName);
        }
      } catch (e) {
        console.error("Error fusionando PDFs:", e);
        // Fallback: al menos guardamos la primera página
        doc.save(fileName);
      }
    };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-500">
        
        {/* Header - Premium Apple Style */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <img src="/logo-altavik.png" alt="Altavik Logo" className="h-10 w-auto" />
            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">FORMA DE PAGO</h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 text-slate-400 hover:text-slate-900 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content - Two Columns */}
        <div className="flex-1 p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left Column: Property Summary */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 text-slate-900 shadow-sm relative overflow-hidden group">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-altavik-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-altavik-500/10 transition-all duration-700"></div>
                
                <h3 className="text-altavik-600 font-bold uppercase tracking-widest text-[10px] mb-4">Activo Seleccionado</h3>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="text-3xl font-bold mb-1 text-slate-900">P{property.portal} · {property.planta} - {property.letra}</div>
                    <div className="text-slate-500 font-medium text-lg flex items-center gap-2">
                      <Building2 size={18} className="text-altavik-500" />
                      Residencial Altavik
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-slate-400 text-sm font-medium">Sup. útil</span>
                    <div className="text-base font-bold text-slate-800">{property.sup_util.toFixed(2)} m²</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 text-sm font-medium">Habitaciones</span>
                    <div className="text-base font-bold text-slate-800">{property.dormitorios} Dorm.</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 text-sm font-medium">Nº Baños</span>
                    <div className="text-base font-bold text-slate-800">{property.banos} Baños</div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="flex justify-between items-end mb-4">
                    <span className="text-slate-400 text-sm font-black uppercase">Precio Base</span>
                    <div className="text-3xl font-black text-altavik-600">
                      {formatCurrency(property.precio)}
                    </div>
                  </div>
                  <div className="flex justify-between items-end p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-500 text-xs font-bold uppercase">Importe Total</span>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block leading-none mb-1">10% IVA INCLUIDO</span>
                      <div className="text-lg font-bold text-slate-700">
                        {formatCurrency(totalWithIVA)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fila AJD */}
                <div className="mt-4 p-4 rounded-2xl bg-white/50 border border-altavik-100 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-lg bg-altavik-100 text-altavik-600 flex items-center justify-center font-bold text-[10px]">AJD</div>
                     <span className="text-xs font-bold text-slate-700">Impuesto AJD (1,5%)</span>
                   </div>
                   <div className="text-sm font-black text-slate-800">{formatCurrency(ajd)}</div>
                </div>

              </div>

              <div className="space-y-3">
                <h3 className="text-slate-900 font-bold flex items-center gap-2 text-sm">
                  <Info size={16} className="text-altavik-600" />
                  Notas Importantes
                </h3>
                <div className="space-y-2">
                  {[
                    "Cantidades avaladas por entidad bancaria.",
                    "Personalización de acabados disponible."
                  ].map((text, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 text-xs font-medium">
                      <CheckCircle2 size={16} className="text-altavik-500 mt-0.5" />
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Payment Breakdown */}
            <div className="lg:col-span-7">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                <TrendingUp size={22} className="text-altavik-600" />
                Planificación de Pagos
              </h3>

              <div className="space-y-4">
                {[
                  { icon: Home, title: "1. Reserva", date: "Inmediato", amount: reserva, desc: "Bloqueo de la unidad" },
                  { icon: FileText, title: "2. Firma Contrato", date: "-", amount: firmaContrato, desc: "A la firma de la compraventa" },
                  { icon: Calendar, title: "3. Cuotas Mensuales", date: "24 mensualidades", amount: monthlyQuotaTotal, desc: `24 cuotas de ${formatCurrency(monthlyAmount)}` },
                  { icon: BadgeCheck, title: "4. Escrituración", date: "Entrega de llaves", amount: eightyPercent, desc: "Mediante préstamo hipotecario" }
                ].map((step, idx) => (
                  <div key={idx} className="flex items-center gap-4 group hover:translate-x-1 transition-transform duration-300">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-altavik-200 group-hover:text-altavik-600 transition-colors shadow-sm">
                      <step.icon size={20} />
                    </div>
                    <div className="flex-1 flex items-center justify-between py-1 border-b border-slate-100">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{step.title}</h4>
                        <p className="text-[11px] text-slate-400 font-medium">{step.desc}</p>
                      </div>
                      <div className="text-right">
                        {idx !== 0 && (
                          <>
                            <div className="text-[10px] text-slate-400 font-medium">B: {formatCurrency(step.amount / 1.1)}</div>
                            <div className="text-[10px] text-slate-400 font-medium">I: {formatCurrency(step.amount - (step.amount / 1.1))}</div>
                          </>
                        )}
                        <div className="font-black text-slate-900 text-sm mt-0.5">{formatCurrency(step.amount)}</div>
                        <div className="text-[8px] text-altavik-500 uppercase font-black tracking-widest mt-1">{step.date}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total Footer */}
                <div className="mt-6 p-5 rounded-2xl bg-altavik-50/50 border border-altavik-100 flex items-center justify-between">
                  <div>
                    <span className="text-altavik-600 font-black uppercase tracking-tighter text-xs">Inversión Final</span>
                    <p className="text-slate-500 text-[10px] font-medium">Incluye impuestos vigentes</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-altavik-700">{formatCurrency(totalWithIVA)}</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 border-t border-slate-100 bg-white flex items-center justify-end gap-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all text-sm"
            >
              Cerrar Preview
            </button>
            <button 
              onClick={handleGeneratePDF}
              className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-xl shadow-slate-200 hover:bg-slate-800 hover:shadow-altavik-100 active:scale-95 transition-all flex items-center gap-2 text-sm"
            >
              <Download size={18} />
              <span>Generar Documento PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
