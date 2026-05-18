import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const WA_ACCESS_TOKEN    = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? ''
    const WA_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? ''
    const SUPABASE_URL       = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_KEY       = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const { conversation_id, to, text } = await req.json()

    if (!to || !text || !conversation_id) {
      throw new Error('Faltan campos: conversation_id, to, text')
    }

    let cleanPhone = to.replace(/\D/g, '')
    if (cleanPhone.length === 9) cleanPhone = '34' + cleanPhone

    // Enviar el mensaje a Meta
    const metaRes = await fetch(`https://graph.facebook.com/v18.0/${WA_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WA_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { body: text }
      })
    })

    const metaData = await metaRes.json()

    if (!metaRes.ok) {
      throw new Error(metaData.error?.message ?? `Meta error ${metaRes.status}`)
    }

    // Guardar en wa_messages
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    await supabase.from('wa_messages').insert([{
      conversation_id,
      wa_message_id: metaData.messages?.[0]?.id,
      direction: 'outbound',
      content: text,
      type: 'text',
      status: 'sent',
      sent_at: new Date().toISOString()
    }])

    await supabase.from('wa_conversations').update({
      last_message_preview: `Tú: ${text.substring(0, 70)}`,
      last_message_at: new Date().toISOString()
    }).eq('id', conversation_id)

    return new Response(JSON.stringify({ success: true, ...metaData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: any) {
    console.error('send-whatsapp-reply error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
