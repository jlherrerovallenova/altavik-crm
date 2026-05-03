// src/services/geminiService.ts

export interface GeminiExtractedLead {
  name: string;
  phone: string;
  email: string;
  source: string;
  notes: string;
}

export const extractLeadDataFromEmail = async (emailBody: string, sender: string): Promise<GeminiExtractedLead> => {
  let apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("No se ha encontrado la clave VITE_GEMINI_API_KEY en tu archivo .env.");
  }
  apiKey = apiKey.trim(); // Limpiar posibles espacios accidentales

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

  let attempt = 0;
  const maxRetries = 3;
  // Probamos modelos ultra-compatibles si los nuevos dan 404
  const fallbackModels = ['gemini-flash-latest', 'gemini-pro-latest', 'gemini-2.0-flash'];
  
  while (attempt < maxRetries) {
    const modelId = fallbackModels[attempt % fallbackModels.length];
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404 && attempt < fallbackModels.length - 1) {
          attempt++;
          continue;
        }
        throw new Error(errorData.error?.message || `Error API: ${response.status}`);
      }

      const result = await response.json();
      let textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textOutput) throw new Error("Respuesta de IA vacía");

      // Limpieza robusta de JSON (quitar bloques markdown si existen)
      const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        textOutput = jsonMatch[0];
      }

      return JSON.parse(textOutput) as GeminiExtractedLead;

    } catch (error: any) {
      if (error.message.includes("429") && attempt < maxRetries - 1) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      throw new Error(`Error en IA: ${error.message}`);
    }
  }
  throw new Error("No se pudo procesar tras varios intentos.");
};

