import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validar autenticación del usuario
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No se ha proporcionado cabecera de autorización' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Falta configuración en las variables de entorno de Supabase' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Usuario no autenticado o token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

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
