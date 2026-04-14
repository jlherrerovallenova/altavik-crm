// src/services/geminiService.ts
import { GoogleGenAI } from '@google/genai';

export interface GeminiExtractedLead {
  name: string;
  phone: string;
  email: string;
  source: string;
  notes: string;
}

export const extractLeadDataFromEmail = async (emailBody: string, sender: string): Promise<GeminiExtractedLead> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("No se ha encontrado la clave VITE_GEMINI_API_KEY en tu archivo .env. Asegúrate de añadirla y reiniciar el servidor.");
  }

  // Inicializamos el SDK oficial de Google que se encarga de sortear todos los errores de versiones de API
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
Eres un asistente comercial inmobiliario de Altavik CRM con precisión absoluta.
Debes leer el siguiente texto de un correo entrante y extraer los datos del lead potencial (el cliente interesado).
- Si el cliente falta y no hay datos, pero es spam, pon todo como Desconocido.
- Si el origen parece de un portal (ej. Idealista, Fotocasa) o un Formulario Web, ponlo en 'source'.

Devuelve EXCLUSIVAMENTE UN JSON, sin formato markdown, sin saludos, sin explicaciones. Solo el objeto JSON puro.

FORMATO PERFECTO:
{
  "name": "Nombre extraído (o 'Desconocido')",
  "phone": "Teléfono (o 'No proporcionado')",
  "email": "Email del cliente explícito en el cuerpo (o 'No proporcionado')",
  "source": "Idealista / Web / Directo / Otro...",
  "notes": "- Primer punto importante\\n- Segundo punto relevante"
}

--- INICIO DEL CORREO ---
Remitente: ${sender}

${emailBody}
--- FIN DEL CORREO ---
`;

  try {
    const modelId = 'gemini-pro-latest';
    console.log(`🤖 Gemini Service: Generando contenido con modelo ${modelId}...`);
    
    // El SDK @google/genai con este patrón para evitar hangs
    const result = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    });

    console.log("📡 Gemini Service: Respuesta recibida del SDK.");
    
    // Verificamos si la respuesta tiene el formato esperado
    const textOutput = result.text;
    
    if (!textOutput) {
       console.error("❌ Gemini Service: La respuesta no contiene texto:", result);
       throw new Error("Gemini no ha devuelto información legible.");
    }
    
    console.log("📄 Gemini Service: Raw Output:", textOutput);

    // Limpiamos la respuesta en caso de que la IA envuelva el resultado en ```json ... ```
    const cleanOutput = textOutput.replace(/```json\n?|```/gi, '').trim();
    
    try {
      return JSON.parse(cleanOutput) as GeminiExtractedLead;
    } catch (parseError) {
      console.error("❌ Gemini Service: Error parseando JSON:", cleanOutput);
      throw new Error("La respuesta de la IA no es un JSON válido.");
    }

  } catch (error: any) {
    console.error("Fallo durante la extracción del SDK de IA:", error);
    throw new Error(`Error técnico del SDK AI: ${error.message}`);
  }
}
