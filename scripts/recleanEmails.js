
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function recleanExistingEmails() {
    console.log('🧹 Iniciando limpieza masiva de correos existentes en la base de datos...');
    
    try {
        const { data: emails, error } = await supabase
            .from('incoming_emails')
            .select('id, body, subject, sender_email, tags');

        if (error) throw error;

        console.log(`🔍 Encontrados ${emails.length} correos para revisar.`);

        for (const email of emails) {
            let originalBody = email.body;
            
            // 1. Limpieza de URLs entre corchetes
            let cleanBody = originalBody.replace(/\[https?:\/\/[^\]]+\]/g, ''); 
            
            // 2. Limpieza de saltos de línea excesivos
            cleanBody = cleanBody.replace(/\n\s*\n/g, '\n\n');
            
            // 3. Recortar firmas pesadas de Idealista
            cleanBody = cleanBody.split('Este mensaje ha sido enviado desde')[0];
            cleanBody = cleanBody.split('Responder desde idealista/tools')[0];

            const bodyLower = cleanBody.toLowerCase();
            const subjectLower = email.subject.toLowerCase();
            const senderLower = email.sender_email.toLowerCase();

            // Sincronizar etiquetas de paso
            let newTags = [...(email.tags || [])];
            if (!newTags.includes('Escaneable IA')) {
                if (bodyLower.includes('idealista') || bodyLower.includes('nuevo mensaje') || senderLower.includes('idealista')) {
                    newTags.push('Escaneable IA');
                    if (!newTags.includes('Idealista')) newTags.push('Idealista');
                }
            }

            if (cleanBody !== originalBody || newTags.length !== email.tags?.length) {
                const { error: updateError } = await supabase
                    .from('incoming_emails')
                    .update({ 
                        body: cleanBody.trim(),
                        tags: newTags
                    })
                    .eq('id', email.id);

                if (updateError) {
                    console.error(`❌ Error al limpiar email ${email.id}:`, updateError.message);
                } else {
                    console.log(`✅ Email ${email.id} limpiado y etiquetado.`);
                }
            }
        }

        console.log('✨ Limpieza masiva completada.');
        
    } catch (error) {
        console.error('💥 Error crítico:', error);
    }
}

recleanExistingEmails();
