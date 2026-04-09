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

const formatCurrency = (num: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num).replace('€', '€').trim();
};

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

export async function generatePropertyPDFBlob(property: Property): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const blueColor = [107, 148, 185]; // Altavik Blue
  const deepBlue = [15, 23, 42];    // Slate 900
  const darkGray = [51, 65, 85];    // Slate 700
  const softGray = [148, 163, 184]; // Slate 400
  const borderGray = [226, 232, 240];
  const lightBlue = [241, 248, 255]; 

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

  const logoAltavik = await getBase64Image('/logo-altavik.png');
  const logoHabitarum = await getBase64Image('/logo_habitarum.png');
  const logoTerravall = await getBase64Image('/logo-terravall.png');

  const drawHeader = (isFichaPage = false) => {
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
    
    if (isFichaPage) {
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

  // --- GENERACIÓN DE PÁGINAS ---
  
  // 1. Generar la página de Forma de Pago (pero no guardarla aún)
  const generatePaymentFormPage = () => {
    drawHeader();
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 45, 180, 45, 4, 4, 'F');
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.line(105, 52, 105, 83);
    doc.setFontSize(9);
    doc.setTextColor(softGray[0], softGray[1], softGray[2]);
    doc.text('INMUEBLE SELECCIONADO', 25, 55);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(deepBlue[0], deepBlue[1], deepBlue[2]);
    doc.text(`P${property.portal} · ${property.planta} - ${property.letra}`, 25, 68);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('RESIDENCIAL ALTAVIK', 25, 76);
    doc.setFontSize(9);
    doc.setTextColor(softGray[0], softGray[1], softGray[2]);
    doc.text('SUPERFICIES Y DISTRIBUCIÓN', 115, 55);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(deepBlue[0], deepBlue[1], deepBlue[2]);
    const centerX = 112.5;
    doc.setLineWidth(0.2);
    doc.setDrawColor(blueColor[0], blueColor[1], blueColor[2]);
    doc.roundedRect(centerX - 2, 60.5, 4, 4, 0.5, 0.5);
    doc.line(centerX, 60.5, centerX, 64.5);
    doc.line(centerX - 2, 62.5, centerX + 2, 62.5);
    doc.text(`${property.sup_util.toFixed(2)} m² Útiles`, 118, 64);
    doc.roundedRect(centerX - 1.5, 68, 3, 4.5, 0.4, 0.4);
    doc.line(centerX - 1.5, 69.2, centerX + 1.5, 69.2);
    doc.roundedRect(centerX - 1.1, 68.3, 2.2, 0.6, 0.2, 0.2);
    doc.text(`${property.dormitorios} Dormitorios`, 118, 72);
    doc.line(centerX - 2.5, 78.5, centerX - 2.5, 77.5);
    doc.line(centerX - 2.5, 77.5, centerX + 0.5, 77.5);
    doc.roundedRect(centerX, 77.5, 2.5, 0.8, 0.2, 0.2);
    doc.text(`${property.banos} Baños`, 118, 80);
    doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
    doc.roundedRect(15, 95, 180, 25, 4, 4, 'F');
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('PRECIO BASE', 25, 106);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(property.precio), 185, 106, { align: 'right' });
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.1);
    doc.line(25, 109.5, 185, 109.5);
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
    
    // Logos Habitarum y Terravall
    if (logoHabitarum) doc.addImage(logoHabitarum.data, 'PNG', 69, currentY, 25, 8);
    if (logoTerravall) doc.addImage(logoTerravall.data, 'PNG', 109, currentY, 32, 8);
    
    drawFooter();
  };

  // --- LÓGICA DE UNIÓN ---
  try {
    if (property.ficha_url) {
      // Detección más robusta de PDF (ignorando parámetros de consulta)
      const urlWithoutParams = property.ficha_url.split('?')[0].toLowerCase();
      const isPdf = urlWithoutParams.endsWith('.pdf');
      
      console.log(`Generando ficha para ${property.portal}-${property.planta}-${property.letra}. Ficha URL: ${property.ficha_url}, es PDF: ${isPdf}`);

      if (isPdf) {
        // CASO PDF: Ficha (Pág 1+) -> Forma de Pago (Última Pág)
        const fichaResponse = await fetch(property.ficha_url, { mode: 'cors' });
        if (!fichaResponse.ok) throw new Error(`Error al descargar PDF: ${fichaResponse.statusText}`);
        
        const fichaBytes = await fichaResponse.arrayBuffer();
        const fichaPdf = await PDFDocument.load(fichaBytes);
        
        // Generar la página de forma de pago en un doc temporal para obtener sus bytes
        generatePaymentFormPage();
        const paymentFormBytes = doc.output('arraybuffer');
        const paymentFormPdf = await PDFDocument.load(paymentFormBytes);

        const mergedPdf = await PDFDocument.create();
        
        // 1. Añadir páginas de la ficha PRIMERO
        const fichaPages = await mergedPdf.copyPages(fichaPdf, fichaPdf.getPageIndices());
        fichaPages.forEach((page) => mergedPdf.addPage(page));
        
        // 2. Añadir página de forma de pago DESPUÉS
        const [paymentPage] = await mergedPdf.copyPages(paymentFormPdf, [0]);
        mergedPdf.addPage(paymentPage);
        
        const mergedPdfBytes = await mergedPdf.save();
        return new Blob([mergedPdfBytes], { type: 'application/pdf' });
      } else {
        // CASO IMAGEN: Imagen (Pág 1) -> Forma de Pago (Pág 2)
        const fichaImg = await getBase64Image(property.ficha_url);
        if (fichaImg) {
          // Página 1: Imagen
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

          // Página 2: Forma de Pago
          doc.addPage();
        }
        generatePaymentFormPage();
      }
    } else {
      // SIN FICHA
      generatePaymentFormPage();
    }
  } catch (e) {
    console.error("Error al generar PDF completo, generando solo forma de pago:", e);
    // Si hubo un error en medio, intentamos asegurar que al menos la forma de pago se genere sola
    generatePaymentFormPage();
  }

  const finalPdfOutput = doc.output('blob');
  return finalPdfOutput;
}
