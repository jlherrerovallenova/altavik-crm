import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const resendApiKey = Deno.env.get('RESEND_API_KEY')
        if (!resendApiKey) {
            throw new Error("Missing RESEND_API_KEY")
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { newsletterId, audience, phase, leadIds } = await req.json()
        if (!newsletterId) throw new Error("Missing newsletterId");

        // 1. Get the newsletter HTML content
        const { data: newsletter, error: nlError } = await supabaseClient
            .from('newsletters')
            .select('*')
            .eq('id', newsletterId)
            .single()

        if (nlError || !newsletter) throw new Error("Newsletter not found")
        if (newsletter.status === 'sent') throw new Error("Newsletter already sent")

        // 2. Proceso de envío escalable (Paginación de DB + Lotes de Resend)
        let totalSent = 0;
        let hasMoreLeads = true;
        let lastId = null; // Usamos cursor-based pagination si es posible o offset
        const DB_BATCH_SIZE = 500; // Cuántos leads traemos de la DB cada vez

        console.log(`Iniciando envío masivo para newsletter: ${newsletterId}`);

        while (hasMoreLeads) {
            let leadsQuery = supabaseClient
                .from('leads')
                .select('id, email, name')
                .eq('is_subscribed', true)
                .not('email', 'is', null)
                .not('email', 'eq', '')
                .order('id', { ascending: true })
                .range(totalSent, totalSent + DB_BATCH_SIZE - 1);

            if (audience === 'phase' && phase) {
                leadsQuery = leadsQuery.eq('status', phase);
            } else if (audience === 'manual' && Array.isArray(leadIds) && leadIds.length > 0) {
                leadsQuery = leadsQuery.in('id', leadIds);
                // Si es manual, no necesitamos paginar de la DB si la lista es pequeña, 
                // pero si leadIds tiene miles, la lógica de arriba ya lo maneja por range.
            }

            const { data: leads, error: leadsError } = await leadsQuery;

            if (leadsError) throw leadsError;
            
            if (!leads || leads.length === 0) {
                hasMoreLeads = false;
                break;
            }

            // Enviar este lote de la DB a Resend (en sub-lotes de 100)
            const resendBatch = leads.map(lead => ({
                from: 'Mirapinos CRM <info@terravallpromociones.com>',
                to: [lead.email],
                subject: newsletter.subject,
                html: newsletter.html_content.replace('{{name}}', lead.name || 'Cliente'),
            }));

            const RESEND_CHUNK_SIZE = 100;
            for (let i = 0; i < resendBatch.length; i += RESEND_CHUNK_SIZE) {
                const chunk = resendBatch.slice(i, i + RESEND_CHUNK_SIZE);
                
                const res = await fetch('https://api.resend.com/emails/batch', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(chunk)
                });

                if (!res.ok) {
                    const errBody = await res.json();
                    console.error("Error en Resend Batch API:", errBody);
                    // Podríamos decidir continuar o parar. Aquí paramos por seguridad.
                    throw new Error(errBody.message || `Resend Error: ${res.statusText}`);
                }
            }

            totalSent += leads.length;
            console.log(`Progreso: ${totalSent} emails procesados...`);

            // Si hemos traído menos de lo pedido, es que no hay más
            if (leads.length < DB_BATCH_SIZE) {
                hasMoreLeads = false;
            }
        }

        if (totalSent === 0) {
            return new Response(JSON.stringify({ message: "No se encontraron suscriptores para los filtros seleccionados" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // 3. Marcar como enviada al finalizar todo el proceso exitosamente
        await supabaseClient
            .from('newsletters')
            .update({ 
                status: 'sent', 
                sent_at: new Date().toISOString(),
                // Guardamos el conteo final para registro
                updated_at: new Date().toISOString() 
            })
            .eq('id', newsletterId);

        return new Response(JSON.stringify({ success: true, count: totalSent }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error(error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
