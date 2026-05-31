// src/utils/generarReserva.ts
// Genera el documento de reserva en DOCX y PDF usando la plantilla del repositorio

import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

export interface DatosReserva {
  // Comprador principal
  nombre: string;
  dni: string;
  estadoCivil: string;
  domicilio: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  nacionalidad: string;
  email: string;
  telefono: string;
  // Cotitular (opcional)
  nombreCotitular?: string;
  dniCotitular?: string;
  // Vivienda
  nOrden: string;
  portal: string;
  planta: string;
  letra: string;
  dormitorios: number;
  banos: number;
  supUtil: number;
  supConst: number;
  supTerrazas: number;
  supPorche: number;
  garaje: string;
  trastero: string;
  precio: number;
  // Operación
  fechaReserva: string; // dd/MM/yyyy
  importeReserva: number;
}

function formatEur(n: number) {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
}

function numeroALetras(n: number): string {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const especiales: Record<number, string> = {
    11: 'ONCE', 12: 'DOCE', 13: 'TRECE', 14: 'CATORCE', 15: 'QUINCE',
    16: 'DIECISÉIS', 17: 'DIECISIETE', 18: 'DIECIOCHO', 19: 'DIECINUEVE',
    21: 'VEINTIÚN', 22: 'VEINTIDÓS', 23: 'VEINTITRÉS', 24: 'VEINTICUATRO',
    25: 'VEINTICINCO', 26: 'VEINTISÉIS', 27: 'VEINTISIETE', 28: 'VEINTIOCHO', 29: 'VEINTINUEVE',
    10: 'DIEZ', 20: 'VEINTE', 30: 'TREINTA', 40: 'CUARENTA', 50: 'CINCUENTA', 60: 'SESENTA', 70: 'SETENTA', 80: 'OCHENTA', 90: 'NOVENTA'
  };
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  const convertir = (num: number): string => {
    if (num === 0) return '';
    if (num === 100) return 'CIEN';
    if (num in especiales) return especiales[num];
    if (num < 10) return unidades[num];
    
    if (num < 100) {
      const d = Math.floor(num / 10);
      const u = num % 10;
      return `${especiales[d * 10]} Y ${unidades[u]}`;
    }
    
    if (num < 1000) {
      const c = Math.floor(num / 100);
      const resto = num % 100;
      return `${centenas[c]} ${convertir(resto)}`.trim();
    }
    
    if (num < 1000000) {
      const m = Math.floor(num / 1000);
      const resto = num % 1000;
      const milPrefix = m === 1 ? 'MIL' : `${convertir(m)} MIL`;
      return `${milPrefix} ${convertir(resto)}`.trim();
    }
    
    return String(num); // Fallback
  };

  return (convertir(Math.floor(n)) || 'CERO').toUpperCase();
}

/**
 * Genera el DOCX de reserva usando la plantilla del repositorio (con marcadores {campo})
 * y lo descarga automáticamente.
 */
export async function generarReservaDocx(datos: DatosReserva): Promise<void> {
  // Cargar la plantilla desde public/ con un parámetro para evitar caché
  const response = await fetch(`/plantilla_reserva.docx?t=${Date.now()}`);
  const arrayBuffer = await response.arrayBuffer();
  const zip = new PizZip(arrayBuffer);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const compradorLinea = datos.nombreCotitular
    ? `D/Dª. ${datos.nombre}, con DNI ${datos.dni}, y D/Dª. ${datos.nombreCotitular}, con DNI ${datos.dniCotitular || '_______'}, ambos en estado civil ${datos.estadoCivil}, nacionalidad ${datos.nacionalidad}, y con domicilio a efectos de notificaciones en ${datos.domicilio}, ${datos.codigoPostal} ${datos.localidad} (${datos.provincia})`
    : `D/Dª. ${datos.nombre}, con DNI ${datos.dni}, estado civil ${datos.estadoCivil}, nacionalidad ${datos.nacionalidad}, y con domicilio a efectos de notificaciones en ${datos.domicilio}, ${datos.codigoPostal} ${datos.localidad} (${datos.provincia})`;

  try {
    doc.setData({
      FECHA_RESERVA: datos.fechaReserva,
      NOMBRE_COMPRADOR: datos.nombre,
      DNI_COMPRADOR: datos.dni,
      ESTADO_CIVIL: datos.estadoCivil,
      DOMICILIO: datos.domicilio,
      LOCALIDAD: datos.localidad,
      PROVINCIA: datos.provincia,
      CP: datos.codigoPostal,
      NACIONALIDAD: datos.nacionalidad,
      EMAIL: datos.email,
      TELEFONO: datos.telefono,
      NOMBRE_COTITULAR: datos.nombreCotitular || '',
      DNI_COTITULAR: datos.dniCotitular || '',
      COMPRADOR_LINEA: compradorLinea,
      N_ORDEN: datos.nOrden,
      PORTAL: datos.portal,
      PLANTA: datos.planta,
      LETRA: datos.letra,
      DORMITORIOS: datos.dormitorios,
      BANOS: datos.banos,
      SUP_UTIL: datos.supUtil.toFixed(2),
      SUP_CONST: datos.supConst.toFixed(2),
      SUP_TERRAZAS: datos.supTerrazas.toFixed(2),
      SUP_PORCHE: datos.supPorche.toFixed(2),
      GARAJE: datos.garaje,
      TRASTERO: datos.trastero,
      PRECIO: formatEur(datos.precio),
      PRECIO_LETRAS: numeroALetras(datos.precio),
      IMPORTE_RESERVA: formatEur(datos.importeReserva),
      IMPORTE_RESERVA_LETRAS: numeroALetras(datos.importeReserva),
      // Nuevas marcas solicitadas
      IVA_10: formatEur(datos.precio * 0.10),
      TOTAL_CON_IVA: formatEur(datos.precio * 1.10),
      TOTAL_CON_IVA_LETRAS: numeroALetras(datos.precio * 1.10),
      PAGO_CONTRATO: formatEur((datos.precio * 1.10 * 0.10) - datos.importeReserva),
      PAGO_MENSUALIDADES: formatEur(datos.precio * 1.10 * 0.10),
      CUOTA_MENSUAL: formatEur((datos.precio * 1.10 * 0.10) / 24),
      PAGO_ESCRITURA: formatEur(datos.precio * 1.10 * 0.80),
    });

    doc.render();

    const blob = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    saveAs(blob, `Reserva_${datos.nombre.replace(/\s+/g, '_')}_${datos.nOrden}.docx`);
  } catch (error: any) {
    console.error('Error generating DOCX:', error);
    const errorMsg = error.properties?.explanation || error.message || 'Error desconocido';
    alert(`Error al generar el documento: ${errorMsg}. Revisa que las etiquetas en el Word estén bien escritas (ej: {NOMBRE_COMPRADOR}).`);
  }
}

/**
 * Genera el PDF de reserva con jsPDF replicando el contenido del contrato.
 */
export async function generarReservaPdf(datos: DatosReserva, download: boolean = true): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 20;

  const addText = (text: string, size = 10, bold = false, color: [number, number, number] = [30, 30, 30]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentW);
    lines.forEach((line: string) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += size * 0.45;
    });
    y += 2;
  };

  const addSection = (title: string) => {
    y += 3;
    doc.setFillColor(15, 52, 96);
    doc.rect(margin, y - 4, contentW, 7, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 3, y);
    y += 6;
    doc.setTextColor(30, 30, 30);
  };

  const addLine = (label: string, value: string) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(label + ':', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(value, contentW - 50);
    doc.text(lines, margin + 50, y);
    y += Math.max(lines.length * 4.5, 5);
  };

  const iva = datos.precio * 0.10;
  const totalConIva = datos.precio + iva;
  const compraContrato = iva + iva * 0.10 - datos.importeReserva;
  const mensualidadTotal = iva * 1.10;
  const mensualidad = mensualidadTotal / 24;
  const escritura = datos.precio * 0.80 * 1.10;

  // ─── CABECERA ───────────────────────────────────────────────────
  doc.setFillColor(15, 52, 96);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('RESIDENCIAL ALTAVIK, S.L.', margin, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Paseo de Zorrilla 98, 1º B — Valladolid', margin, 19);
  doc.text('administracion@residencialaltavik.es', margin, 24);

  y = 36;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 52, 96);
  doc.text('CONTRATO DE RESERVA', pageW / 2, y, { align: 'center' });
  y += 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${datos.fechaReserva}`, pageW / 2, y, { align: 'center' });
  y += 8;

  // ─── PARTES ─────────────────────────────────────────────────────
  addSection('PARTE VENDEDORA');
  addLine('Entidad', 'RESIDENCIAL ALTAVIK, S.L.');
  addLine('CIF', 'B-00000000');
  addLine('Domicilio', 'Paseo de Zorrilla 98, 1º B, Valladolid');
  addLine('Representante', 'D. ANTONIO ROBERTO PASTRANA GONZÁLEZ');

  addSection('PARTE COMPRADORA');
  if (datos.nombreCotitular) {
    addLine('Comprador 1', `${datos.nombre} (DNI ${datos.dni})`);
    addLine('Comprador 2', `${datos.nombreCotitular} (DNI ${datos.dniCotitular || '_______'})`);
    addLine('Estado Civil', datos.estadoCivil);
    addLine('Nacionalidad', datos.nacionalidad);
    addLine('Domicilio común', `${datos.domicilio}, ${datos.codigoPostal} ${datos.localidad} (${datos.provincia})`);
  } else {
    addLine('Nombre', datos.nombre);
    addLine('DNI / NIE', datos.dni);
    addLine('Estado civil', datos.estadoCivil);
    addLine('Nacionalidad', datos.nacionalidad);
    addLine('Domicilio', `${datos.domicilio}, ${datos.codigoPostal} ${datos.localidad} (${datos.provincia})`);
  }

  // ─── VIVIENDA ───────────────────────────────────────────────────
  addSection('DESCRIPCIÓN DE LA VIVIENDA');
  addLine('Referencia', `Nº ${datos.nOrden} — Portal ${datos.portal} — Planta ${datos.planta}${datos.letra}`);
  addLine('Dormitorios', String(datos.dormitorios));
  addLine('Baños', String(datos.banos));
  addLine('Superficie útil', `${datos.supUtil.toFixed(2)} m²`);
  addLine('Garaje', datos.garaje);
  addLine('Trastero', datos.trastero);

  // ─── CONDICIONES ECONÓMICAS ────────────────────────────────────
  addSection('CONDICIONES ECONÓMICAS');
  addLine('Precio de venta (sin IVA)', formatEur(datos.precio));
  addLine('IVA (10%)', formatEur(iva));
  addLine('Precio total (IVA incluido)', formatEur(totalConIva));
  y += 2;
  addLine('1. Reserva (hoy)', formatEur(datos.importeReserva));
  addLine('2. Contrato de compraventa', formatEur(compraContrato));
  addLine('3. Mensualidades (24 × ...)', `${formatEur(mensualidadTotal)} total — ${formatEur(mensualidad)}/mes`);
  addLine('4. Escrituración (80% + IVA)', formatEur(escritura));

  // ─── TEXTO DEL CONTRATO ─────────────────────────────────────────
  addSection('PRIMERA. — OBJETO');
  addText(
    `RESIDENCIAL ALTAVIK, S.L. reserva a favor de ${datos.nombre}${datos.nombreCotitular ? ` y ${datos.nombreCotitular}` : ''} la vivienda descrita en el apartado anterior, con una señal de reserva de ${formatEur(datos.importeReserva)} (${numeroALetras(datos.importeReserva)} EUROS), que se entrega en este acto.`, 9
  );

  addSection('SEGUNDA. — PRECIO Y FORMA DE PAGO');
  addText(
    `El precio total de la compraventa, IVA incluido, asciende a ${formatEur(totalConIva)}. El COMPRADOR abonará dicho precio de la siguiente forma:\n` +
    `a) ${formatEur(datos.importeReserva)} en concepto de reserva, abonados en este acto.\n` +
    `b) ${formatEur(compraContrato)} a la firma del contrato de compraventa.\n` +
    `c) ${formatEur(mensualidadTotal)} mediante 24 mensualidades de ${formatEur(mensualidad)} cada una.\n` +
    `d) ${formatEur(escritura)} restantes a la firma de la escritura pública de compraventa.`, 9
  );

  addSection('TERCERA. — PROTECCIÓN DE DATOS');
  addText(
    'En cumplimiento del Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica 3/2018, los datos personales del COMPRADOR serán tratados por RESIDENCIAL ALTAVIK, S.L., responsable del tratamiento, con la finalidad de gestionar la relación contractual. Para más información y ejercicio de derechos: administracion@residencialaltavik.es o www.aepd.es.',
    9
  );

  addSection('CUARTA. — PREVENCIÓN DEL BLANQUEO DE CAPITALES');
  addText(
    'De conformidad con la Ley 10/2010 de 28 de Abril, la parte compradora manifiesta que actúa en su propio nombre y derecho, y se obliga a facilitar cuantos documentos le sean requeridos para verificar el origen de los fondos.',
    9
  );

  addSection('QUINTA. — FUERO');
  addText('Las partes se someten expresamente a los Juzgados y Tribunales de Madrid para cuantas controversias traigan causa del presente contrato.', 9);

  // ─── FIRMAS ─────────────────────────────────────────────────────
  y += 10;
  if (y > 240) { doc.addPage(); y = 20; }

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, margin + 75, y);
  doc.line(pageW - margin - 75, y, pageW - margin, y);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('LA PARTE VENDEDORA', margin + 37, y + 5, { align: 'center' });
  doc.text('D. ANTONIO ROBERTO PASTRANA GONZÁLEZ', margin + 37, y + 9, { align: 'center' });
  doc.text('RESIDENCIAL ALTAVIK, S.L.', margin + 37, y + 13, { align: 'center' });

  const compradorLabel = datos.nombreCotitular
    ? `${datos.nombre}\ny ${datos.nombreCotitular}`
    : datos.nombre;
  doc.text('LA PARTE COMPRADORA', pageW - margin - 37, y + 5, { align: 'center' });
  doc.text(compradorLabel, pageW - margin - 37, y + 9, { align: 'center' });

  if (download) {
    doc.save(`Reserva_${datos.nombre.replace(/\s+/g, '_')}_${datos.nOrden}.pdf`);
  }
  return doc.output('blob');
}
