import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const WA_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? ''
const WA_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? ''

// El nombre de la plantilla aprobada en Meta para seguimientos.
const FOLLOWUP_TEMPLATE_NAME = 'seguimiento_contacto' 

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    
    // Calculamos la fecha de hace 3 días
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const thresholdDate = threeDaysAgo.toISOString()

    // 1. Obtener leads en estado "contacted" creados hace más de 3 días
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, phone, created_at')
      .eq('status', 'contacted')
      .lt('created_at', thresholdDate)
      .not('phone', 'is', null)

    if (leadsError) throw leadsError
    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ message: "No leads require follow-up." }), { status: 200 })
    }

    let sentCount = 0;

    for (const lead of leads) {
      if (!lead.phone) continue;

      // 2. Comprobar si ya le hemos enviado el seguimiento
      const { data: history } = await supabase
        .from('lead_history')
        .select('id')
        .eq('lead_id', lead.id)
        .eq('event_type', 'system')
        .ilike('description', '%Seguimiento Automático WhatsApp%')
        .limit(1)
        .maybeSingle()

      if (history) {
        // Ya se le envió el seguimiento, saltamos.
        continue;
      }

      // 3. Comprobar si el cliente ya nos ha respondido alguna vez por WhatsApp
      // Si nos respondió, su estado debería haber pasado a "qualified", pero por si acaso, 
      // verificamos que no tenga mensajes entrantes en wa_conversations
      const cleanPhone = lead.phone.replace(/\D/g, '').slice(-9)
      const { data: conv } = await supabase
        .from('wa_conversations')
        .select('id, status')
        .ilike('phone', `%${cleanPhone}%`)
        .limit(1)
        .maybeSingle()

      if (conv) {
        // Si hay conversación abierta, significa que ha habido interacción. No mandamos el bot.
        continue;
      }

      // 4. Enviar el WhatsApp (Plantilla oficial)
      const toPhone = lead.phone.replace(/\D/g, '')
      const payload = {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'template',
        template: {
          name: FOLLOWUP_TEMPLATE_NAME,
          language: { code: 'es' }
        }
      }

      const res = await fetch(`https://graph.facebook.com/v18.0/${WA_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WA_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await res.json()

      if (res.ok) {
        // 5. Registrar en el historial que se ha enviado el seguimiento
        await supabase.from('lead_history').insert([{
          lead_id: lead.id,
          event_type: 'system',
          description: 'Seguimiento Automático WhatsApp enviado',
          metadata: { template: FOLLOWUP_TEMPLATE_NAME, wa_message_id: result.messages?.[0]?.id }
        }])
        sentCount++;
      } else {
        console.error(`Error sending follow-up to ${lead.phone}:`, result)
      }
    }

    return new Response(JSON.stringify({ message: "Follow-up cron executed.", sent: sentCount }), { status: 200, headers: { 'Content-Type': 'application/json' } })

  } catch (err: any) {
    console.error("Cron Error:", err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
