import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VERIFY_TOKEN       = Deno.env.get('WHATSAPP_VERIFY_TOKEN') ?? 'altavik_webhook_2024'
const WA_ACCESS_TOKEN    = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? ''
const WA_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? ''
const GEMINI_API_KEY     = Deno.env.get('GEMINI_API_KEY') ?? ''
const SUPABASE_URL       = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_KEY       = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req) => {
  // ── Verificación GET de Meta ────────────────────────────────────────────
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode      = url.searchParams.get('hub.mode')
    const token     = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  // ── Mensajes entrantes POST ─────────────────────────────────────────────
  if (req.method === 'POST') {
    const bodyText = await req.text()
    let errorOccurred: any = null
    let debugInfo: any = {}

    const process = (async () => {
      try {
        const body = JSON.parse(bodyText)
        const change = body.entry?.[0]?.changes?.[0]
        const value = change?.value
        const field = change?.field

        debugInfo = {
          hasBody: !!body,
          changeField: change?.field,
          hasValue: !!value,
          hasMessages: !!value?.messages,
          messagesLength: value?.messages?.length,
          hasEchoes: !!value?.message_echoes || !!value?.smb_message_echoes,
          supabaseUrl: SUPABASE_URL,
          hasSupabaseKey: !!SUPABASE_KEY,
        }

        if (!SUPABASE_URL || !SUPABASE_KEY) {
          throw new Error(`Variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY ausentes. URL: "${SUPABASE_URL}", KEY_LEN: ${SUPABASE_KEY?.length ?? 0}`);
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

        // 1. Caso A: Mensaje entrante (Inbound de cliente)
        if (value?.messages?.[0]) {
          const msg = value.messages[0]
          if (msg.type !== 'text') return

          const fromPhone  = msg.from as string
          const msgText    = (msg.text?.body ?? '').trim()
          const waMessageId = msg.id as string
          if (!msgText) return

          console.log(`📩 Mensaje inbound de ${fromPhone}: "${msgText}"`)
          const last9 = fromPhone.replace(/\D/g, '').slice(-9)

          // ── DETECTAR DUPLICADOS DE METADATA (RETRIES) ──
          const { data: existingMsg } = await supabase
            .from('wa_messages')
            .select('id')
            .eq('wa_message_id', waMessageId)
            .limit(1)
            .maybeSingle()

          if (existingMsg) {
            console.log(`⚠️ Mensaje con ID ${waMessageId} ya existe en DB. Posible reintento de Meta. Omitiendo procesamiento y respuesta.`)
            return
          }

          // Buscar o crear conversación
          let conversation: any = null

          const { data: existing, error: errExisting } = await supabase
            .from('wa_conversations')
            .select('*')
            .ilike('phone', `%${last9}%`)
            .limit(1)
            .maybeSingle()
          if (errExisting) throw new Error(`Error buscando conversacion existente: ${errExisting.message}`)

          if (existing) {
            conversation = existing
            // Actualizar última actividad
            const { error: errUpdate } = await supabase
              .from('wa_conversations')
              .update({
                last_message_at: new Date().toISOString(),
                last_message_preview: msgText.substring(0, 80),
                unread_count: (existing.unread_count ?? 0) + 1,
                status: 'open'
              })
              .eq('id', existing.id)
            if (errUpdate) throw new Error(`Error actualizando conversacion existente: ${errUpdate.message}`)
          } else {
            // Buscar lead por teléfono para obtener su nombre
            const { data: leads, error: errLeads } = await supabase
              .from('leads')
              .select('id, name')
              .ilike('phone', `%${last9}%`)
              .limit(1)
            if (errLeads) throw new Error(`Error buscando lead para conversacion: ${errLeads.message}`)

            const lead = leads?.[0]

            const { data: newConv, error: errNewConv } = await supabase
              .from('wa_conversations')
              .insert([{
                phone: fromPhone,
                lead_id: lead?.id ?? null,
                lead_name: lead?.name ?? `+${fromPhone}`,
                last_message_at: new Date().toISOString(),
                last_message_preview: msgText.substring(0, 80),
                unread_count: 1,
                status: 'open'
              }])
              .select()
              .single()
            if (errNewConv) throw new Error(`Error creando nueva conversacion: ${errNewConv.message}`)

            conversation = newConv
          }

          if (!conversation) {
            console.error('No se pudo crear/encontrar conversación')
            return
          }

          // Guardar mensaje en wa_messages (evita duplicados por wa_message_id)
          const { error: errUpsertMsg } = await supabase
            .from('wa_messages')
            .upsert([{
              conversation_id: conversation.id,
              wa_message_id: waMessageId,
              direction: 'inbound',
              content: msgText,
              type: 'text',
              status: 'delivered',
              sent_at: new Date(parseInt(msg.timestamp) * 1000).toISOString()
            }], { onConflict: 'wa_message_id', ignoreDuplicates: true })
          if (errUpsertMsg) throw new Error(`Error al insertar/actualizar mensaje inbound: ${errUpsertMsg.message}`)

          // Actualizar lead si existe (extracción IA + historial)
          if (conversation.lead_id) {
            const extracted = await extractWithGemini(msgText)

            const fecha = new Date().toLocaleDateString('es-ES')
            let notaWA = ''
            if (extracted.contiene_preferencias) {
              notaWA = [
                `━━━ Preferencias WhatsApp (${fecha}) ━━━`,
                extracted.tipo_vivienda !== 'no_especificado' ? `Tipo vivienda: ${extracted.tipo_vivienda}` : null,
                extracted.dormitorios ? `Dormitorios: ${extracted.dormitorios}` : null,
                extracted.quiere_visita === true  ? '✅ Quiere concertar visita' : null,
                extracted.quiere_visita === false ? '❌ No quiere visita de momento' : null,
                `Resumen: ${extracted.summary}`,
              ].filter(Boolean).join('\n')
            } else {
              notaWA = `━━━ Mensaje WhatsApp (${fecha}) ━━━\nMensaje: ${msgText}\nResumen: ${extracted.summary}`
            }

            const { data: lead } = await supabase.from('leads').select('notes, status').eq('id', conversation.lead_id).single()
            const newNotes = lead?.notes ? `${notaWA}\n\n${lead.notes}` : notaWA
            
            // Solo marcar como qualified si aportó preferencias
            const newStatus = (extracted.contiene_preferencias && ['new', 'contacted'].includes(lead?.status ?? '')) 
              ? 'qualified' 
              : lead?.status

            await supabase.from('leads').update({ notes: newNotes, status: newStatus }).eq('id', conversation.lead_id)

            await supabase.from('lead_history' as any).insert([{
              lead_id: conversation.lead_id,
              event_type: 'contact',
              description: `Respuesta WhatsApp: ${extracted.summary}`,
              metadata: { source: 'whatsapp_webhook', from: fromPhone, extracted, raw_message: msgText }
            }])

            // Auto-respuesta inteligente al cliente
            let replyText = ''
            if (extracted.es_saludo && !extracted.contiene_preferencias) {
              replyText = `¡Hola! Bienvenido a Inmobiliaria TERRAVALL. ¿En qué podemos ayudarle hoy? Si está interesado en la promoción ALTAVIK, coméntenos brevemente qué tipo de vivienda prefiere (bajo, planta intermedia o ático) y cuántos dormitorios necesita para ofrecerle las mejores opciones.`
            } else if (extracted.contiene_preferencias) {
              replyText = extracted.quiere_visita
                ? `¡Muchas gracias por su respuesta! Hemos anotado sus preferencias. Le llamaremos pronto para concertar la visita. ¡Un cordial saludo! — Terravall`
                : `¡Muchas gracias por su respuesta! Hemos anotado sus preferencias y le prepararemos las mejores opciones. ¡Un cordial saludo! — Terravall`
            } else {
              replyText = `¡Muchas gracias por su mensaje! En breve un asesor de Inmobiliaria TERRAVALL se pondrá en contacto con usted para facilitarle toda la información sobre la promoción ALTAVIK.`
            }

            const sent = await sendWhatsAppReply(fromPhone, replyText)

            // Guardar la respuesta automática también en wa_messages
            if (sent) {
              await supabase.from('wa_messages').insert([{
                conversation_id: conversation.id,
                direction: 'outbound',
                content: replyText,
                type: 'text',
                status: 'sent',
              }])
              await supabase.from('wa_conversations').update({
                last_message_preview: `Tú: ${replyText.substring(0, 60)}...`,
              }).eq('id', conversation.id)
            }
          }

          console.log('✅ Mensaje inbound procesado correctamente')
        }
        // 2. Caso B: Eco de mensaje saliente (Outbound enviado por el negocio desde otro dispositivo)
        else if (value?.message_echoes?.[0] || (field === 'smb_message_echoes' && value?.smb_message_echoes)) {
          const echo = value.message_echoes?.[0] || value.smb_message_echoes
          const type = echo.type
          if (type !== 'text') return

          const msgText = (echo.text?.body ?? '').trim()
          const waMessageId = echo.id || echo.message_id
          if (!msgText || !waMessageId) return

          // Identificar número del cliente
          const businessPhone = value.metadata?.display_phone_number?.replace(/\D/g, '')
          let customerPhone = ''

          if (echo.to) {
            const cleanTo = echo.to.replace(/\D/g, '')
            if (cleanTo !== businessPhone) {
              customerPhone = echo.to
            }
          }
          if (!customerPhone && echo.from) {
            const cleanFrom = echo.from.replace(/\D/g, '')
            if (cleanFrom !== businessPhone) {
              customerPhone = echo.from
            }
          }
          if (!customerPhone) {
            customerPhone = echo.to || echo.from
          }

          if (!customerPhone) {
            console.log('⚠️ No se pudo determinar el teléfono del cliente para el eco')
            return
          }

          console.log(`📩 Eco outbound para ${customerPhone}: "${msgText}"`)
          const last9 = customerPhone.replace(/\D/g, '').slice(-9)

          // Buscar o crear conversación
          let conversation: any = null

          const { data: existing, error: errExisting } = await supabase
            .from('wa_conversations')
            .select('*')
            .ilike('phone', `%${last9}%`)
            .limit(1)
            .maybeSingle()
          if (errExisting) throw new Error(`Error buscando conversacion existente para eco: ${errExisting.message}`)

          if (existing) {
            conversation = existing
            // Actualizar última actividad y resetear contador de no leídos
            const { error: errUpdate } = await supabase
              .from('wa_conversations')
              .update({
                last_message_at: new Date().toISOString(),
                last_message_preview: `Tú: ${msgText.substring(0, 70)}`,
                unread_count: 0, // Al responder nosotros, leemos los mensajes
                status: 'open'
              })
              .eq('id', existing.id)
            if (errUpdate) throw new Error(`Error actualizando conversacion para eco: ${errUpdate.message}`)
          } else {
            // Buscar lead por teléfono
            const { data: leads, error: errLeads } = await supabase
              .from('leads')
              .select('id, name')
              .ilike('phone', `%${last9}%`)
              .limit(1)
            if (errLeads) throw new Error(`Error buscando lead para eco: ${errLeads.message}`)

            const lead = leads?.[0]

            const { data: newConv, error: errNewConv } = await supabase
              .from('wa_conversations')
              .insert([{
                phone: customerPhone,
                lead_id: lead?.id ?? null,
                lead_name: lead?.name ?? `+${customerPhone}`,
                last_message_at: new Date().toISOString(),
                last_message_preview: `Tú: ${msgText.substring(0, 70)}`,
                unread_count: 0,
                status: 'open'
              }])
              .select()
              .single()
            if (errNewConv) throw new Error(`Error creando nueva conversacion para eco: ${errNewConv.message}`)

            conversation = newConv
          }

          if (!conversation) {
            console.error('No se pudo crear/encontrar conversación para eco')
            return
          }

          // Guardar mensaje outbound en wa_messages
          const sentAt = echo.timestamp ? new Date(parseInt(echo.timestamp) * 1000).toISOString() : new Date().toISOString()
          const { error: errUpsertMsg } = await supabase
            .from('wa_messages')
            .upsert([{
              conversation_id: conversation.id,
              wa_message_id: waMessageId,
              direction: 'outbound',
              content: msgText,
              type: 'text',
              status: 'sent',
              sent_at: sentAt
            }], { onConflict: 'wa_message_id', ignoreDuplicates: true })
          if (errUpsertMsg) throw new Error(`Error insertando mensaje de eco: ${errUpsertMsg.message}`)

          console.log('✅ Eco outbound procesado correctamente')
        }

      } catch (err) {
        console.error('❌ Error webhook:', err)
        errorOccurred = err
      }
    })()

    await process
    if (errorOccurred) {
      return new Response(JSON.stringify({ error: errorOccurred.message || String(errorOccurred), stack: errorOccurred.stack, debugInfo }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    return new Response(JSON.stringify({ status: 'OK', debugInfo }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response('Method Not Allowed', { status: 405 })
})

async function extractWithGemini(messageText: string) {
  const prompt = `Eres el CRM inmobiliario ALTAVIK. Analiza el mensaje del cliente de WhatsApp y extrae cualquier preferencia de vivienda o intención de visita.
Devuelve SOLO un objeto JSON estructurado sin formato markdown ni código:
{
  "es_saludo": <true|false (si el mensaje es solo un saludo como Hola, Buenas, etc. sin aportar información)>,
  "contiene_preferencias": <true|false (si el mensaje contiene información sobre dormitorios, tipo de vivienda o deseos de visita)>,
  "tipo_vivienda": "bajo|planta_intermedia|atico|no_especificado",
  "dormitorios": <número o null>,
  "quiere_visita": <true|false|null>,
  "summary": "<resumen de 1-2 frases>"
}
Mensaje a analizar: "${messageText.replace(/"/g, "'")}"`

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1 } })
    })
    const result = await res.json()
    let raw = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) raw = match[0]
    return JSON.parse(raw)
  } catch {
    return { es_saludo: false, contiene_preferencias: false, tipo_vivienda: 'no_especificado', dormitorios: null, quiere_visita: null, summary: messageText }
  }
}

async function sendWhatsAppReply(to: string, text: string): Promise<boolean> {
  if (!WA_ACCESS_TOKEN || !WA_PHONE_NUMBER_ID) return false
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${WA_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${WA_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body: text } })
    })
    return res.ok
  } catch {
    return false
  }
}
