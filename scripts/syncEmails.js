
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const config = {
    imap: {
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASS,
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 993,
        tls: true,
        authTimeout: 3000,
        tlsOptions: { rejectUnauthorized: false }
    }
};

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function syncEmails() {
    console.log('🔄 Iniciando sincronización de correos desde OVH...');
    
    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        // Buscar correos no leídos de los últimos 15 días
        const delay = 15 * 24 * 3600 * 1000;
        const limitDate = new Date();
        limitDate.setTime(Date.now() - delay);
        
        const searchCriteria = [
            'UNSEEN',
            ['SINCE', limitDate.toISOString()]
        ];

        const fetchOptions = {
            bodies: ['HEADER', 'TEXT', ''],
            markSeen: false
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        console.log(`📬 Se han encontrado ${messages.length} correos nuevos sin procesar.`);

        for (const item of messages) {
            const all = item.parts.find(p => p.which === '');
            const mail = await simpleParser(all.body);
            
            // --- LIMPIEZA DEL CUERPO ---
            let textBody = mail.text || mail.html || '';
            
            // 1. Eliminar bloques de URLs de trackers (común en Idealista)
            // Esto quita cosas como [https://email.return.idealista.com/...]
            textBody = textBody.replace(/\[https?:\/\/[^\]]+\]/g, ''); 
            
            // 2. Eliminar saltos de línea excesivos
            textBody = textBody.replace(/\n\s*\n/g, '\n\n');
            
            // 3. Recortar firmas y avisos legales comunes
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

            // --- LÓGICA DE DETECCIÓN MEJORADA ---
            if (
                bodyLower.includes('idealista') || 
                bodyLower.includes('nuevo mensaje') ||
                bodyLower.includes('espera tu respuesta') ||
                bodyLower.includes('interesa este piso') ||
                subjectLower.includes('interés') ||
                subjectLower.includes('contacto') ||
                subjectLower.includes('vivienda') ||
                senderEmail.includes('idealista')
            ) {
                emailData.tags.push('Escaneable IA');
                if (bodyLower.includes('idealista') || senderEmail.includes('idealista')) {
                    emailData.tags.push('Idealista');
                }
            }

            if (senderEmail.includes('altavik') || bodyLower.includes('formulario web')) {
                emailData.tags.push('Web', 'Escaneable IA');
            }

            // Verificar si ya existe
            const { data: existing } = await supabase
                .from('incoming_emails')
                .select('id')
                .eq('sender_email', emailData.sender_email)
                .eq('date_received', emailData.date_received)
                .limit(1);

            if (!existing || existing.length === 0) {
                const { error: insertError } = await supabase
                    .from('incoming_emails')
                    .insert([emailData]);
                
                if (insertError) {
                    console.error(`❌ Error al insertar email de ${emailData.sender_email}:`, insertError.message);
                } else {
                    console.log(`✅ Lead de "${emailData.sender_name}" sincronizado y limpio.`);
                }
            }
        }

        connection.end();
        console.log('✨ Sincronización finalizada.');
        
    } catch (error) {
        console.error('💥 Error crítico en la sincronización:', error);
    }
}

syncEmails();
