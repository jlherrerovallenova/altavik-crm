import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WA_ACCESS_TOKEN    = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? ''
const WA_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? ''
const SUPABASE_URL       = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_KEY       = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const META_API_URL = `https://graph.facebook.com/v17.0/${WA_PHONE_NUMBER_ID}/messages`

// Nombres de plantillas
const TPL_PRIMER_CONTACTO = 'plantilla_mensaje_inicial'
const TPL_SEGUIMIENTO     = 'seguimiento_sin_respuesta'
const TPL_CIERRE          = 'cierre_solicitud'

async function sendWhatsAppTemplate(to: string, templateName: string, languageCode: string = 'es_ES', variables: string[] = []) {
  const payload: any = {
    messaging_product: 'whatsapp',
    to: to.replace('+', ''),
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: variables.length > 0 ? [
        {
          type: 'body',
          parameters: variables.map(v => ({ type: 'text', text: v }))
        }
      ] : []
    }
  }

  const res = await fetch(META_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WA_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error(`Error enviando ${templateName} a ${to}:`, errText)
    throw new Error(`Meta API Error: ${res.status} ${errText}`)
  }

  const data = await res.json()
  return data
}

serve(async (req) => {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // Autorizar opcionalmente (por simplicidad, asumimos que viene del pg_cron local que es seguro o usa un header)
  // Pero lo ideal es verificar una clave secreta.
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${SUPABASE_KEY}` && authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    console.warn('Unauthorized request to wa-drip-campaign')
    // return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  
  try {
    // 1. Obtener leads activos que podríamos necesitar seguir
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, phone, status')
      .in('status', ['new', 'contacted'])
      .not('phone', 'is', null)
      
    if (leadsError) throw leadsError
    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ message: 'No leads to process' }), { headers: { 'Content-Type': 'application/json' } })
    }

    let processedCount = 0
    const results = []

    for (const lead of leads) {
      // 2. Buscar su última conversación
      const { data: convs, error: convsError } = await supabase
        .from('wa_conversations')
        .select('id')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (convsError || !convs || convs.length === 0) continue
      const conversationId = convs[0].id

      // 3. Obtener el último mensaje de esa conversación
      const { data: msgs, error: msgsError } = await supabase
        .from('wa_messages')
        .select('direction, sent_at, template_name')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: false })
        .limit(1)

      if (msgsError || !msgs || msgs.length === 0) continue
      
      const lastMsg = msgs[0]

      // Si el último mensaje es del cliente, no hacemos drip campaign
      if (lastMsg.direction === 'inbound') continue
      
      const sentAtDate = new Date(lastMsg.sent_at)
      const now = new Date()
      // Skip weekends for calculation? For now we just use absolute days.
      const diffMs = now.getTime() - sentAtDate.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)

      let actionTaken = null

      if (lastMsg.template_name === TPL_PRIMER_CONTACTO) {
        if (diffDays >= 10) {
          // Ya pasaron 10 días desde el primer contacto sin respuesta (caso extremo)
          await sendWhatsAppTemplate(lead.phone, TPL_CIERRE, 'es_ES')
          actionTaken = 'cierre'
        } else if (diffDays >= 3) {
          // Pasaron 3 días, enviamos seguimiento
          await sendWhatsAppTemplate(lead.phone, TPL_SEGUIMIENTO, 'es_ES')
          actionTaken = 'seguimiento'
        }
      } 
      else if (lastMsg.template_name === TPL_SEGUIMIENTO) {
        // El último mensaje fue el seguimiento. Si pasaron 7 días (total 10), cerramos.
        if (diffDays >= 7) {
          await sendWhatsAppTemplate(lead.phone, TPL_CIERRE, 'es_ES')
          actionTaken = 'cierre'
        }
      }
      // Si fue cierre, no hacemos nada más.

      // Procesar la acción
      if (actionTaken) {
        // Insertar en historial de mensajes
        await supabase.from('wa_messages').insert({
          conversation_id: conversationId,
          direction: 'outbound',
          content: actionTaken === 'cierre' ? '[Plantilla de Cierre Enviada]' : '[Plantilla de Seguimiento Enviada]',
          type: 'template',
          template_name: actionTaken === 'cierre' ? TPL_CIERRE : TPL_SEGUIMIENTO,
          status: 'sent'
        })

        // Guardar en lead_history
        await supabase.from('lead_history').insert({
          lead_id: lead.id,
          action: actionTaken === 'cierre' ? 'WhatsApp de cierre enviado automáticamente (Drip Campaign)' : 'WhatsApp de seguimiento enviado automáticamente (Drip Campaign)'
        })

        // Si es cierre, marcar lead como lost
        if (actionTaken === 'cierre') {
          await supabase.from('leads').update({ status: 'lost' }).eq('id', lead.id)
        }
        
        processedCount++
        results.push({ leadId: lead.id, action: actionTaken })
      }
    }

    return new Response(JSON.stringify({ success: true, processed: processedCount, results }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    console.error('Error in wa-drip-campaign:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
