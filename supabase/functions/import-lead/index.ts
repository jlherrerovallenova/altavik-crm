import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de CORS (Preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Configuración del cliente Supabase con Service Role para saltar RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Configuración del servidor incompleta (URL/Key)");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Extraer datos del cuerpo de la petición
    const payload = await req.json();
    const { name, email, phone, source, notes, company, value } = payload;

    // Validación mínima
    if (!name) {
      throw new Error("El campo 'name' es obligatorio.");
    }

    // Inserción en la tabla de leads
    const { data, error } = await supabaseClient
      .from('leads')
      .insert([
        { 
          name, 
          email: email || null, 
          phone: phone || null, 
          source: source || 'Web', 
          notes: notes || null,
          company: company || null,
          value: value || 0,
          status: 'new'
        }
      ])
      .select();

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    return new Response(JSON.stringify({ success: true, message: "Lead importado correctamente", data: data[0] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Import error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
