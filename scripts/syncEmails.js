
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

async function syncEmails() {
    console.log('🔄 Iniciando sincronización de correos...');
    
    // Validar variables de entorno obligatorias
    const requiredEnv = [
        'EMAIL_USER', 
        'EMAIL_PASS', 
        'EMAIL_HOST', 
        'VITE_SUPABASE_URL'
    ];
    
    const missing = requiredEnv.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Faltan variables de entorno obligatorias: ${missing.join(', ')}`);
    }

    const config = {
        imap: {
            user: process.env.EMAIL_USER,
            password: process.env.EMAIL_PASS,
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT) || 993,
            tls: true,
            authTimeout: 10000,
            tlsOptions: { rejectUnauthorized: false }
        }
    };

    // Usar SERVICE_ROLE_KEY si existe, si no, fallback a ANON_KEY
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseKey) {
        throw new Error('No se ha proporcionado ninguna clave de Supabase (SUPABASE_SERVICE_ROLE_KEY o VITE_SUPABASE_ANON_KEY)');
    }

    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        supabaseKey
    );

    let connection;
    try {
        console.log(`📡 Conectando a ${config.imap.host}...`);
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        // Buscar correos de los últimos 30 días
        const delay = 30 * 24 * 3600 * 1000;
        const limitDate = new Date();
        limitDate.setTime(Date.now() - delay);
        
        const searchCriteria = [
            'ALL',
            ['SINCE', limitDate.toISOString()]
        ];

        const fetchOptions = {
            bodies: ['HEADER', 'TEXT', ''],
            markSeen: false
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        console.log(`📬 Se han encontrado ${messages.length} correos en el periodo seleccionado.`);

        let syncedCount = 0;
        let skipCount = 0;

        for (const item of messages) {
            try {
                const all = item.parts.find(p => p.which === '');
                const mail = await simpleParser(all.body);
                
                // --- LIMPIEZA DEL CUERPO ---
                let textBody = mail.text || mail.html || '';
                textBody = textBody.replace(/\[https?:\/\/[^\]]+\]/g, ''); 
                textBody = textBody.replace(/\n\s*\n/g, '\n\n');
                textBody = textBody.split('Este mensaje ha sido enviado desde')[0];
                textBody = textBody.split('Aviso Legal:')[0];
                textBody = textBody.split('---')[0];

                const emailData = {
                    subject: mail.subject || '(Sin Asunto)',
                    sender_name: mail.from?.value[0]?.name || mail.from?.value[0]?.address || 'Desconocido',
                    sender_email: mail.from?.value[0]?.address || '',
                    body: textBody.trim(),
                    date_received: mail.date?.toISOString() || new Date().toISOString(),
                    is_read: false,
                    is_processed: false,
                    tags: []
                };

                const bodyLower = emailData.body.toLowerCase();
                const subjectLower = emailData.subject.toLowerCase();
                const senderEmail = emailData.sender_email.toLowerCase();

                // Identificación de portales
                if (bodyLower.includes('idealista') || subjectLower.includes('idealista')) emailData.tags.push('Idealista');
                if (bodyLower.includes('habitaclia') || subjectLower.includes('habitaclia')) emailData.tags.push('Habitaclia');
                if (bodyLower.includes('fotocasa') || subjectLower.includes('fotocasa')) emailData.tags.push('Fotocasa');
                if (bodyLower.includes('contacto') || subjectLower.includes('contacto')) emailData.tags.push('Web');

                const isLeadSubject = (
                    subjectLower.includes('interés') || 
                    subjectLower.includes('mensaje') || 
                    subjectLower.includes('contacto') || 
                    subjectLower.includes('solicitud') ||
                    subjectLower.includes('llamada atendida')
                );

                const isMarketingOrNews = (
                    subjectLower.includes('está pasando') || 
                    subjectLower.includes('boletín') || 
                    subjectLower.includes('novedades') ||
                    subjectLower.includes('noticias') ||
                    subjectLower.includes('newsletter') ||
                    subjectLower.includes('campaña') ||
                    subjectLower.includes('inquilino necesitan saber') ||
                    subjectLower.includes('áticos con terraza') ||
                    bodyLower.includes('suscríbete') ||
                    senderEmail.includes('news@') ||
                    senderEmail.includes('mailing@') ||
                    senderEmail.includes('semanal@') ||
                    senderEmail.includes('no-reply') ||
                    senderEmail.includes('publicidad')
                );
                
                if (isLeadSubject && !isMarketingOrNews) {
                    emailData.tags.push('Escaneable IA');
                }

                if (senderEmail.includes('altavik') || bodyLower.includes('formulario web')) {
                    emailData.tags.push('Web', 'Escaneable IA');
                }

                // Verificar si ya existe en emails
                const { data: existing } = await supabase
                    .from('incoming_emails')
                    .select('id')
                    .eq('sender_email', emailData.sender_email)
                    .eq('date_received', emailData.date_received)
                    .limit(1);

                if (!existing || existing.length === 0) {
                    const { error: insertError, data: insertedEmailData } = await supabase
                        .from('incoming_emails')
                        .insert([emailData])
                        .select('id')
                        .single();
                    
                    if (insertError) {
                        console.error(`❌ Error al insertar email de ${emailData.sender_email}:`, insertError.message);
                    } else {
                        syncedCount++;

                        // --- AUTOMATIZACIÓN IA: CONVERTIR EN LEAD AUTOMÁTICAMENTE ---
                        if (emailData.tags.includes('Escaneable IA') && process.env.VITE_GEMINI_API_KEY) {
                            try {
                                console.log(`🪄 Procesando email con Gemini para autogenerar Lead...`);
                                const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
                                
                                const prompt = \`
Eres un asistente comercial inmobiliario de Altavik CRM. Extrae los datos del lead potencial de este correo.
Devuelve EXCLUSIVAMENTE UN JSON, sin formato markdown.
FORMATO PERFECTO:
{ "name": "Nombre extraído (o 'Desconocido')", "phone": "Teléfono (o 'No proporcionado')", "email": "Email (o 'No proporcionado')", "source": "Idealista / Web / ...", "notes": "- Notas..." }
--- CORREO ---
Remitente: \${emailData.sender_name} <\${emailData.sender_email}>
\${emailData.body}
\`;

                                const response = await ai.models.generateContent({
                                    model: 'gemini-2.5-flash',
                                    contents: prompt,
                                    config: { temperature: 0.1, responseMimeType: "application/json" }
                                });

                                const textOutput = response.text;
                                if (textOutput) {
                                    const extracted = JSON.parse(textOutput);
                                    
                                    // Verificamos si el lead ya existe por email o telefono (si los hay)
                                    let leadExists = false;
                                    if (extracted.email !== 'No proporcionado') {
                                        const { data: exEmail } = await supabase.from('leads').select('id').eq('email', extracted.email).limit(1);
                                        if (exEmail && exEmail.length > 0) leadExists = true;
                                    }
                                    if (!leadExists && extracted.phone !== 'No proporcionado') {
                                        const { data: exPhone } = await supabase.from('leads').select('id').eq('phone', extracted.phone).limit(1);
                                        if (exPhone && exPhone.length > 0) leadExists = true;
                                    }

                                    if (!leadExists && extracted.name !== 'Desconocido') {
                                        console.log(`✅ Lead extraído exitosamente: ${extracted.name} (${extracted.source}). Insertando en CRM...`);
                                        await supabase.from('leads').insert([{
                                            name: extracted.name,
                                            email: extracted.email !== 'No proporcionado' ? extracted.email : null,
                                            phone: extracted.phone !== 'No proporcionado' ? extracted.phone : null,
                                            source: extracted.source + ' (Auto IA)',
                                            status: 'new',
                                            notes: \`[Importado Automáticamente vía Smart Inbox]\n\n\${extracted.notes}\`
                                        }]);
                                        
                                        // Marcamos el email original como procesado
                                        if (insertedEmailData?.id) {
                                            await supabase.from('incoming_emails').update({ is_processed: true }).eq('id', insertedEmailData.id);
                                        }
                                    } else {
                                        console.log(`⚠️ El lead ya existía en la base de datos o carecía de datos suficientes, omitiendo auto-inserción.`);
                                    }
                                }
                            } catch (aiErr) {
                                console.error('⚠️ Error en la auto-extracción de IA:', aiErr.message);
                            }
                        }
                    }
                } else {
                    skipCount++;
                }
            } catch (msgError) {
                console.error('⚠️ Error procesando un mensaje individual:', msgError.message);
            }
        }

        console.log(`✨ Sincronización finalizada. Nuevos: ${syncedCount}, Duplicados: ${skipCount}`);
        
    } catch (error) {
        console.error('💥 Error crítico en la sincronización:', error.message);
        throw error; // Relanzar para que el proceso salga con error
    } finally {
        if (connection) connection.end();
    }
}

// Ejecutar y manejar el cierre del proceso
syncEmails()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('FATAL:', err.message);
        process.exit(1);
    });
