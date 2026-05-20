import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const SUPABASE_URL       = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_KEY       = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

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

    // ── REGISTRAR EN LA BASE DE DATOS ──
    try {
      if (SUPABASE_URL && SUPABASE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
        const last9 = cleanPhone.slice(-9)

        // 1. Buscar si existe el lead por teléfono
        const { data: leads } = await supabase
          .from('leads')
          .select('id, name')
          .ilike('phone', `%${last9}%`)
          .limit(1)
        const lead = leads?.[0]

        // 2. Buscar o crear la conversación
        let conversation: any = null
        const { data: existing } = await supabase
          .from('wa_conversations')
          .select('*')
          .ilike('phone', `%${last9}%`)
          .limit(1)
          .maybeSingle()

        const previewText = `Tú: [Plantilla: ${templateName}]`
        const now = new Date().toISOString()

        if (existing) {
          conversation = existing
          await supabase
            .from('wa_conversations')
            .update({
              last_message_at: now,
              last_message_preview: previewText,
              status: 'open'
            })
            .eq('id', existing.id)
        } else {
          const { data: newConv, error: errNewConv } = await supabase
            .from('wa_conversations')
            .insert([{
              phone: cleanPhone,
              lead_id: lead?.id ?? null,
              lead_name: lead?.name ?? `+${cleanPhone}`,
              last_message_at: now,
              last_message_preview: previewText,
              unread_count: 0,
              status: 'open'
            }])
            .select()
            .single()
          
          if (errNewConv) {
            console.error('Error creando conversacion:', errNewConv)
          } else {
            conversation = newConv
          }
        }

        // 3. Buscar cuerpo de la plantilla o usar fallback
        let templateBody = ''
        try {
          const { data: tmpl } = await supabase
            .from('whatsapp_templates')
            .select('body')
            .ilike('name', `%${templateName}%`)
            .limit(1)
            .maybeSingle()
          templateBody = tmpl?.body ?? ''
        } catch (errTmpl) {
          console.error('Error cargando plantilla desde DB:', errTmpl)
        }

        if (!templateBody) {
          if (templateName === 'plantilla_mensaje_inicial' || templateName === 'hello_world') {
            templateBody = `Mi nombre es Juan Herrero, de inmobiliaria TERRAVALL. Le escribo porque hemos recibido su solicitud de información sobre la promoción ALTAVIK (C/ Isaac Peral 20, Arroyo de la Encomienda).

Para enviarle las opciones que mejor se ajusten a lo que busca, coménteme brevemente:

1️⃣ ¿Qué tipo de vivienda prefiere? (Bajo, planta intermedia o ático).
2️⃣ ¿Cuántos dormitorios necesita?
3️⃣ ¿Desea concertar una visita en nuestras oficinas para que le ampliemos la información con todo detalle?

Quedo a la espera de sus comentarios. ¡Muchas gracias y un saludo!`
          } else {
            templateBody = `[Plantilla: ${templateName}]`
          }
        }

        let finalContent = templateBody
        if (lead?.name) {
          const firstName = lead.name.split(' ')[0]
          finalContent = finalContent
            .replace(/{nombre}/g, firstName)
            .replace(/{{1}}/g, firstName)
        } else {
          finalContent = finalContent
            .replace(/{nombre}/g, '')
            .replace(/{{1}}/g, '')
        }

        // 4. Guardar el mensaje outbound en wa_messages
        if (conversation) {
          const waMsgId = data.messages?.[0]?.id ?? null
          const { error: errInsertMsg } = await supabase
            .from('wa_messages')
            .insert([{
              conversation_id: conversation.id,
              wa_message_id: waMsgId,
              direction: 'outbound',
              content: finalContent,
              type: 'template',
              template_name: templateName,
              status: 'sent',
              sent_at: now
            }])
          
          if (errInsertMsg) {
            console.error('Error insertando mensaje outbound:', errInsertMsg)
          }

          // 5. Registrar en el historial del lead si existe
          if (lead?.id) {
            await supabase
              .from('lead_history' as any)
              .insert([{
                lead_id: lead.id,
                event_type: 'contact',
                description: `WhatsApp enviado (plantilla: ${templateName})`,
                metadata: { source: 'crm_send_whatsapp', templateName, to: cleanPhone }
              }])
          }
        }
      }
    } catch (dbError) {
      console.error('Error al registrar WhatsApp en base de datos:', dbError)
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
