import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const WA_ACCESS_TOKEN    = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? ''
    const WA_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? ''

    if (!WA_ACCESS_TOKEN || !WA_PHONE_NUMBER_ID) {
      throw new Error('Credenciales de WhatsApp no configuradas en el servidor.')
    }

    const { to, templateName, languageCode, components } = await req.json()

    if (!to || !templateName) {
      throw new Error('Faltan campos obligatorios: to, templateName')
    }

    // Limpiar el número — aseguramos prefijo 34 para España
    let cleanPhone = to.replace(/\D/g, '')
    if (cleanPhone.length === 9) cleanPhone = '34' + cleanPhone

    // Construir payload para Meta
    const templatePayload: any = {
      name: templateName,
      language: { code: languageCode ?? 'es_ES' }
    }
    if (components && components.length > 0) {
      templatePayload.components = components
    }

    const metaRes = await fetch(
      `https://graph.facebook.com/v18.0/${WA_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WA_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'template',
          template: templatePayload
        })
      }
    )

    const data = await metaRes.json()

    if (!metaRes.ok) {
      throw new Error(data.error?.message ?? `Error Meta API: ${metaRes.status}`)
    }

    return new Response(JSON.stringify({ success: true, ...data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: any) {
    console.error('send-whatsapp error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
