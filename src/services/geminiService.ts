import { supabase } from '../lib/supabase';

export interface GeminiExtractedLead {
  name: string;
  phone: string;
  email: string;
  source: string;
  notes: string;
}

export const extractLeadDataFromEmail = async (emailBody: string, sender: string): Promise<GeminiExtractedLead> => {
  const prompt = `
Eres un asistente comercial inmobiliario de Altavik CRM con precisión absoluta.
Debes leer el siguiente texto de un correo entrante y extraer los datos del lead potencial.

Devuelve EXCLUSIVAMENTE UN JSON, sin formato markdown.

FORMATO:
{
  "name": "Nombre (o 'Desconocido')",
  "phone": "Teléfono (o 'No proporcionado')",
  "email": "Email (o 'No proporcionado')",
  "source": "Idealista / Web / Directo / Otro...",
  "notes": "Notas breves"
}

--- CORREO ---
Remitente: ${sender}
${emailBody}
`;

  try {
    const { data, error } = await supabase.functions.invoke('generate-ai-content', {
      body: { prompt }
    });

    if (error) {
      throw new Error(error.message || 'Error en Edge Function');
    }

    let textOutput = data?.text;
    if (!textOutput) throw new Error("Respuesta de IA vacía");

    // Limpieza robusta de JSON (quitar bloques markdown si existen)
    const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      textOutput = jsonMatch[0];
    }

    return JSON.parse(textOutput) as GeminiExtractedLead;

  } catch (error: any) {
    throw new Error(`Error procesando IA: ${error.message}`);
  }
};
