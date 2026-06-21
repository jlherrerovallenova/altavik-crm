import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

    if (!GEMINI_API_KEY) {
      throw new Error("API Key de Gemini no configurada en el servidor.")
    }

    const { prompt } = await req.json()

    if (!prompt) {
      throw new Error("Falta el campo obligatorio: prompt")
    }

    const maxRetries = 3;
    const fallbackModels = ['gemini-2.5-flash', 'gemini-pro-latest'];
    
    let attempt = 0;
    while (attempt < maxRetries) {
      const modelId = fallbackModels[attempt % fallbackModels.length];
      console.log(`🤖 Attempt ${attempt + 1}: calling Gemini model ${modelId}...`);
      
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1
            }
          })
        });

        console.log(`Status for ${modelId}: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Error response for ${modelId}:`, JSON.stringify(errorData));
          if (response.status === 404 && attempt < maxRetries - 1) {
            attempt++;
            continue;
          }
          throw new Error(errorData.error?.message || `Error API: ${response.status}`);
        }

        const result = await response.json();
        console.log(`Raw result from ${modelId}:`, JSON.stringify(result));
        
        let textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!textOutput) {
          const finishReason = result.candidates?.[0]?.finishReason;
          console.warn(`No text output. Finish reason: ${finishReason}`);
          throw new Error(`Respuesta de IA vacía (finishReason: ${finishReason})`);
        }

        return new Response(JSON.stringify({ text: textOutput }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      } catch (error: any) {
        if (error.message.includes("429") && attempt < maxRetries - 1) {
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        throw error;
      }
    }
    
    throw new Error("No se pudo procesar tras varios intentos.");
  } catch (error: any) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
