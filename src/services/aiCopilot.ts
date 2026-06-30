import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini client. It expects the API key to be available.
// In Vite, we use import.meta.env to access environment variables.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Create the client instance. If no key is provided, the SDK might fail or throw an error, 
// so we'll handle this gracefully in our functions.
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface CopilotSummaryResponse {
  summary: string;
  nextSteps: string[];
}

export const summarizeLeadWithCopilot = async (
  leadData: any,
  tasks: any[]
): Promise<CopilotSummaryResponse | null> => {
  if (!ai) {
    throw new Error('Gemini API key is missing. Please add VITE_GEMINI_API_KEY to your .env file.');
  }

  try {
    const prompt = `
      Eres un asistente de ventas (Copilot CRM) altamente profesional y estratégico.
      Analiza la siguiente información de un cliente (Lead) y su historial de interacciones.

      Datos del Cliente:
      - Nombre: ${leadData.name || 'Desconocido'}
      - Email: ${leadData.email || 'Desconocido'}
      - Teléfono: ${leadData.phone || 'Desconocido'}
      - Origen del contacto: ${leadData.source || 'Desconocido'}
      - Estado actual en el embudo: ${leadData.status || 'Desconocido'}

      Historial de Interacciones y Tareas (Agenda):
      ${tasks.length === 0 ? 'No hay interacciones previas.' : tasks.map((t, i) => `${i + 1}. [${t.type}] ${t.title} - Estado: ${t.completed ? 'Completado' : 'Pendiente'} (Fecha: ${new Date(t.due_date).toLocaleDateString()})`).join('\n')}

      Por favor, proporciona:
      1. Un "Resumen Ejecutivo" en un solo párrafo, identificando el nivel de urgencia o interés del cliente basándote en su estado y origen, y evaluando el progreso según las tareas.
      2. Una lista de "Próximos Pasos Recomendados" (máximo 3 bullets precisos y orientados a la acción para cerrar la venta o avanzar la negociación).

      Format tu respuesta estrictamente en JSON válido con esta estructura:
      {
        "summary": "texto del resumen",
        "nextSteps": ["paso 1", "paso 2"]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const textResult = response.text;
    if (!textResult) return null;

    const parsed = JSON.parse(textResult);
    return {
      summary: parsed.summary,
      nextSteps: parsed.nextSteps
    };
  } catch (error) {
    console.error('Error in AI Copilot:', error);
    throw error;
  }
};
