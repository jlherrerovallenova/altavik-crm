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
  const trackingId = url.searchParams.get('tracking_id') || url.searchParams.get('id');

  // Devolver el pixel inmediatamente para no bloquear el cliente de correo
  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': 'image/gif',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  if (!trackingId) {
    return new Response(pixelBytes, { headers: responseHeaders, status: 200 });
  }

  // Ejecutamos la lógica de actualización en segundo plano de manera asíncrona
  // para responder inmediatamente al cliente de correo
  (async () => {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');

      if (!supabaseUrl || !supabaseKey) {
        console.error("Faltan variables de entorno SUPABASE_URL o claves de API");
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // 1. Llamar al RPC para incrementar el contador de aperturas en la tabla email_tracking
      const { error: rpcError } = await supabase.rpc('increment_email_open', { tracking_id: trackingId });
      if (rpcError) {
        console.error("Error al llamar a increment_email_open RPC:", rpcError);
      } else {
        console.log(`RPC increment_email_open ejecutado para trackingId: ${trackingId}`);
      }

      // 2. Mantener sincronizado lead_history para el Timeline
      const { data, error } = await supabase
        .from('lead_history')
        .select('id, metadata')
        .contains('metadata', { tracking_id: trackingId });

      if (error) {
        console.error("Error al buscar el log de correo en lead_history:", error);
        return;
      }

      if (data && data.length > 0) {
        const record = data[0];
        const metadata = record.metadata || {};

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
          console.error("Error al actualizar lead_history metadata:", updateError);
        } else {
          console.log(`lead_history con tracking_id ${trackingId} actualizado exitosamente.`);
        }
      }
    } catch (err) {
      console.error("Error en el proceso de tracking:", err);
    }
  })();

  return new Response(pixelBytes, { headers: responseHeaders, status: 200 });
})
