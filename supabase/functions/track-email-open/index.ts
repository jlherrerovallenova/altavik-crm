import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 1x1 transparent GIF tracking pixel
const pixelBase64 = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const pixelBytes = Uint8Array.from(atob(pixelBase64), c => c.charCodeAt(0));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  // Devolver el pixel inmediatamente para no bloquear el cliente de correo
  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': 'image/gif',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  if (!id) {
    return new Response(pixelBytes, { headers: responseHeaders, status: 200 });
  }

  // Ejecutamos la lógica de actualización en segundo plano de manera asíncrona
  // para responder inmediatamente al cliente de correo
  (async () => {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!supabaseUrl || !supabaseKey) {
        console.error("Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Buscar el registro con el tracking_id en metadata
      const { data, error } = await supabase
        .from('lead_history')
        .select('id, metadata')
        .contains('metadata', { tracking_id: id });

      if (error) {
        console.error("Error al buscar el log de correo:", error);
        return;
      }

      if (data && data.length > 0) {
        const record = data[0];
        const metadata = record.metadata || {};

        // Si ya está marcado como abierto, no hacemos nada
        if (metadata.opened) {
          return;
        }

        const updatedMetadata = {
          ...metadata,
          opened: true,
          opened_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase
          .from('lead_history')
          .update({ metadata: updatedMetadata })
          .eq('id', record.id);

        if (updateError) {
          console.error("Error al actualizar estado a abierto:", updateError);
        } else {
          console.log(`Correo con tracking_id ${id} marcado como abierto exitosamente.`);
        }
      } else {
        console.warn(`No se encontró ningún registro con tracking_id ${id} en lead_history`);
      }
    } catch (err) {
      console.error("Error en el proceso de tracking:", err);
    }
  })();

  return new Response(pixelBytes, { headers: responseHeaders, status: 200 });
})
