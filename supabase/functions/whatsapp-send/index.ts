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
    const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
    const ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')

    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      throw new Error("Configuración de WhatsApp incompleta en Supabase (Secrets).")
    }

    const { to, templateName, languageCode = 'es', components = [] } = await req.json()

    if (!to || !templateName) {
      throw new Error("Faltan campos obligatorios: to, templateName")
    }

    const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`
    
    const body = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components: components
      }
    }

    console.log(`Enviando WhatsApp a ${to} con plantilla ${templateName}...`)

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error("Meta API error:", data)
      throw new Error(data?.error?.message || `Error Meta API: ${res.statusText}`)
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
