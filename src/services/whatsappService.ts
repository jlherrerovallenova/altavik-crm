export interface WhatsAppTemplate {
  id?: string;
  name: string;
  body: string;
  category: 'system' | 'marketing';
}

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
 * Envia un mensaje usando la WhatsApp Cloud API (Oficial/Pago)
 * Nota: Requiere que la plantilla esté aprobada en Meta.
 */
export const sendWhatsAppCloudAPI = async (
  to: string, 
  templateName: string, 
  languageCode: string = 'es',
  components: any[] = []
) => {
  const PHONE_NUMBER_ID = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID;
  const ACCESS_TOKEN = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN;

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error('Configuración de WhatsApp Cloud API incompleta (ID o Token faltante)');
  }

  let cleanPhone = to.replace(/\D/g, '');
  if (cleanPhone.length === 9) cleanPhone = '34' + cleanPhone;

  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
  
  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode
      },
      components: components
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Error al enviar mensaje por WhatsApp API');
  }

  return data;
};
