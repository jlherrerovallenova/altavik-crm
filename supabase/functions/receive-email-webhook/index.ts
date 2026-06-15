import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Solo permitimos POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Validar token de seguridad
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET_TOKEN')
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!webhookSecret || token !== webhookSecret) {
      return new Response('Unauthorized: Invalid or missing token', { status: 401 })
    }

    // Parsear el payload JSON (asumimos formato estándar enviado por el webhook)
    const body = await req.json()
    const { subject, sender_name, sender_email, text_body, html_body } = body

    if (!sender_email) {
      return new Response('Missing sender_email', { status: 400 })
    }

    // Crear cliente de Supabase usando SERVICE_ROLE para bypass de RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
       throw new Error('Server configuration error: missing Supabase credentials.')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Insertar el correo en la base de datos
    const emailBody = text_body || html_body || '';
    
    const { data, error } = await supabase
      .from('incoming_emails')
      .insert([
        {
          subject: subject || 'Sin Asunto',
          sender_name: sender_name || 'Desconocido',
          sender_email: sender_email,
          body: emailBody
        }
      ])

    if (error) {
      throw error
    }

    return new Response(JSON.stringify({ success: true, message: 'Email received' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Error processing webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
