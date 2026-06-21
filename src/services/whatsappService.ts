
import { supabase } from '../lib/supabase';

export interface WhatsAppTemplate {
  id?: string;
  name: string;
  body: string;
  category: 'system' | 'marketing';
}

// Nombre exacto de las plantillas aprobadas en Meta Business
export const META_PRIMER_CONTACTO_TEMPLATE = 'plantilla_mensaje_inicial';
export const META_SEGUIMIENTO_TEMPLATE     = 'seguimiento_sin_respuesta';
export const META_CIERRE_TEMPLATE          = 'cierre_solicitud';

// Texto real de la plantilla aprobada (sin variables, estático)
export const META_PRIMER_CONTACTO_BODY = `Mi nombre es Juan Herrero, de inmobiliaria TERRAVALL. Le escribo porque hemos recibido su solicitud de información sobre la promoción ALTAVIK (C/ Isaac Peral 20, Arroyo de la Encomienda).

Para enviarle las opciones que mejor se ajusten a lo que busca, coménteme brevemente:

1️⃣ ¿Qué tipo de vivienda prefiere? (Bajo, planta intermedia o ático).
2️⃣ ¿Cuántos dormitorios necesita?
3️⃣ ¿Desea concertar una visita en nuestras oficinas para que le ampliemos la información con todo detalle?

Quedo a la espera de sus comentarios. ¡Muchas gracias y un saludo!`;

export const detectGender = (name: string): 'interesado' | 'interesada' => {
  if (!name) return 'interesado';
  const firstName = name.split(' ')[0].toLowerCase().trim();
  const femaleExceptions = ['pilar', 'carmen', 'isabel', 'mar', 'belen', 'belén', 'raquel', 'ines', 'inés', 'beatriz', 'consuelo', 'lourdes', 'mercedes', 'dolores', 'concepcion', 'concepción', 'asuncion', 'asunción', 'rosario', 'virtudes', 'amparo', 'remedios'];
  const maleExceptions = ['borja', 'luca', 'bautista'];
  if (femaleExceptions.includes(firstName)) return 'interesada';
  if (maleExceptions.includes(firstName)) return 'interesado';
  if (firstName.endsWith('a')) return 'interesada';
  return 'interesado';
};

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return 'Buenos días';
  if (hour >= 14 && hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
};

export const parseTemplate = (
  body: string,
  lead: { name: string },
  metadata?: { property?: string; fecha_visita?: string; hora_visita?: string }
) => {
  const firstName = lead.name.split(' ')[0];
  const greeting = getGreeting();
  const interested = detectGender(lead.name);
  
  return body
    .replace(/{nombre}/g, firstName)
    .replace(/{saludo}/g, greeting)
    .replace(/{interesado}/g, interested)
    .replace(/{propiedad}/g, metadata?.property || 'nuestra promoción')
    .replace(/{fecha_visita}/g, metadata?.fecha_visita || '[fecha]')
    .replace(/{hora_visita}/g, metadata?.hora_visita || '[hora]');
};

export const getSystemTemplates = (): WhatsAppTemplate[] => [
  {
    name: 'Primer Contacto (Altavik)',
    category: 'system',
    body: '¡{saludo}, {nombre}! Mi nombre es Juan Herrero, de inmobiliaria TERRAVALL. Le escribo porque hemos recibido su solicitud de información sobre la promoción ALTAVIK. ¿Desea concertar una visita?'
  },
  {
    name: 'Confirmación de Visita',
    category: 'system',
    body: 'Hola {nombre}, le confirmo su visita para conocer {propiedad}. Estaremos encantados de atenderle. ¡Un saludo!'
  },
  {
    name: 'Recordatorio de Visita',
    category: 'system',
    body: '{saludo}, {nombre}.\nLe recuerdo la cita que tenemos programada para hoy {fecha_visita} a las {hora_visita} para informarle de la promoción ALTAVIK RESIDENCIAL de Arroyo.\nNuestras oficinas están en Plaza Mayor 8 1ºA. TERRAVALL.\nAtentamente'
  }
];

export const getWhatsAppUrl = (phone: string, message: string) => {
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 9) cleanPhone = '34' + cleanPhone;
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
};

/**
 * Envia un mensaje usando la WhatsApp Cloud API a través de la Edge Function
 * (evita el bloqueo CORS del navegador al llamar a Meta directamente)
 */
export const sendWhatsAppCloudAPI = async (
  to: string,
  templateName: string = META_PRIMER_CONTACTO_TEMPLATE,
  languageCode: string = 'es_ES',
  components: any[] = []
) => {
  let cleanPhone = to.replace(/\D/g, '');
  if (cleanPhone.length === 9) cleanPhone = '34' + cleanPhone;

  const { data, error } = await supabase.functions.invoke('send-whatsapp', {
    body: { to: cleanPhone, templateName, languageCode, components }
  });

  if (error) {
    throw new Error(error.message || 'Error al enviar mensaje por WhatsApp');
  }

  return data;
};


