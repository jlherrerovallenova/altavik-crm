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

    const process = (async () => {
      try {
        const body = JSON.parse(bodyText)
        const value = body.entry?.[0]?.changes?.[0]?.value

        // Ignorar actualizaciones de estado (delivered, read, etc.)
        if (!value?.messages?.[0]) return

        const msg = value.messages[0]
        if (msg.type !== 'text') return

        const fromPhone  = msg.from as string
        const msgText    = (msg.text?.body ?? '').trim()
        const waMessageId = msg.id as string
        if (!msgText) return

        console.log(`📩 Mensaje de ${fromPhone}: "${msgText}"`)

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
        const last9 = fromPhone.replace(/\D/g, '').slice(-9)

        // 1. Buscar o crear conversación
        let conversation: any = null

        const { data: existing } = await supabase
          .from('wa_conversations')
          .select('*')
          .ilike('phone', `%${last9}%`)
          .limit(1)
          .maybeSingle()

        if (existing) {
          conversation = existing
          // Actualizar última actividad
          await supabase
            .from('wa_conversations')
            .update({
              last_message_at: new Date().toISOString(),
              last_message_preview: msgText.substring(0, 80),
              unread_count: (existing.unread_count ?? 0) + 1,
              status: 'open'
            })
            .eq('id', existing.id)
        } else {
          // Buscar lead por teléfono para obtener su nombre
          const { data: leads } = await supabase
            .from('leads')
            .select('id, name')
            .ilike('phone', `%${last9}%`)
            .limit(1)

          const lead = leads?.[0]

          const { data: newConv } = await supabase
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

          conversation = newConv
        }

        if (!conversation) {
          console.error('No se pudo crear/encontrar conversación')
          return
        }

        // 2. Guardar mensaje en wa_messages (evita duplicados por wa_message_id)
        await supabase
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

        // 3. Actualizar lead si existe (extracción IA + historial)
        if (conversation.lead_id) {
          const extracted = await extractWithGemini(msgText)

          const fecha = new Date().toLocaleDateString('es-ES')
          const notaWA = [
            `━━━ Respuesta WhatsApp (${fecha}) ━━━`,
            extracted.tipo_vivienda !== 'no_especificado' ? `Tipo vivienda: ${extracted.tipo_vivienda}` : null,
            extracted.dormitorios ? `Dormitorios: ${extracted.dormitorios}` : null,
            extracted.quiere_visita === true  ? '✅ Quiere concertar visita' : null,
            extracted.quiere_visita === false ? '❌ No quiere visita de momento' : null,
            `Resumen: ${extracted.summary}`,
          ].filter(Boolean).join('\n')

          const { data: lead } = await supabase.from('leads').select('notes, status').eq('id', conversation.lead_id).single()
          const newNotes = lead?.notes ? `${notaWA}\n\n${lead.notes}` : notaWA
          const newStatus = ['new', 'contacted'].includes(lead?.status ?? '') ? 'qualified' : lead?.status

          await supabase.from('leads').update({ notes: newNotes, status: newStatus }).eq('id', conversation.lead_id)

          await supabase.from('lead_history' as any).insert([{
            lead_id: conversation.lead_id,
            event_type: 'contact',
            description: `Respuesta WhatsApp: ${extracted.summary}`,
            metadata: { source: 'whatsapp_webhook', from: fromPhone, extracted, raw_message: msgText }
          }])

          // 4. Auto-respuesta al cliente
          const replyText = extracted.quiere_visita
            ? `¡Muchas gracias por su respuesta! Hemos anotado sus preferencias. Le llamaremos pronto para concertar la visita. ¡Un cordial saludo! — Terravall`
            : `¡Muchas gracias por su respuesta! Hemos anotado sus preferencias y le prepararemos las mejores opciones. ¡Un cordial saludo! — Terravall`

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

        console.log('✅ Mensaje procesado correctamente')

      } catch (err) {
        console.error('❌ Error webhook:', err)
      }
    })()

    void process
    return new Response('OK', { status: 200 })
  }

  return new Response('Method Not Allowed', { status: 405 })
})

async function extractWithGemini(messageText: string) {
  const prompt = `Eres el CRM inmobiliario ALTAVIK. Analiza la respuesta del cliente a preguntas sobre vivienda.
Devuelve SOLO JSON sin markdown:
{"tipo_vivienda":"bajo|planta_intermedia|atico|no_especificado","dormitorios":<número o null>,"quiere_visita":<true|false|null>,"summary":"<1-2 frases>"}
Mensaje: "${messageText.replace(/"/g, "'")}"`

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
    return { tipo_vivienda: 'no_especificado', dormitorios: null, quiere_visita: null, summary: messageText }
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
