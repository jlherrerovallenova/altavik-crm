import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    supabaseKey
);

async function run() {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASS
    });
    if (authError) {
        console.error("No se pudo iniciar sesión en Supabase:", authError.message);
        return;
    }
    console.log("Autenticado en Supabase como:", authData.user.email);

    const fileContent = fs.readFileSync('leads_to_import.json', 'utf8').replace(/^\uFEFF/, '');
    const data = JSON.parse(fileContent);
    
    let count = 0;
    for (const item of data) {
        let name = item.NOMBRE ? item.NOMBRE.trim() : '';
        if (!name && item.USUARIO) name = item.USUARIO.trim();
        
        let email = item.EMAIL ? item.EMAIL.trim() : null;
        
        const phoneKey = Object.keys(item).find(k => k.startsWith('TEL'));
        let phone = phoneKey && item[phoneKey] ? item[phoneKey].trim().replace(/\s+/g, '') : null;
        
        let sourceKey = Object.keys(item).find(k => k.startsWith('ORIGEN'));
        let source = sourceKey && item[sourceKey] ? item[sourceKey].trim() : 'Idealista';
        
        let notes = item['NOTAS INTERNAS'] ? item['NOTAS INTERNAS'].trim() : '';
        
        // Skip empty rows completely
        if (!name && !email && !phone) continue;
        if (!name) name = 'Desconocido';
        
        // Skip duplicates where name is Desconocido but phone is the same as previous (handled by DB check mostly, but Idealista CSV sometimes has empty rows before real row)
        // Actually, the CSV has rows like `;;;600 72 20 01;;;...` followed by `Carolo;Carolo;carolo1992@gmail.com;600 72 20 01;...`
        // If we process the empty row first, it will insert "Desconocido" with phone 600 72 20 01.
        // Then Carolo will be skipped because phone already exists!
        // So let's skip rows where name is empty AND notes are empty (they are just placeholder rows).
        if (name === 'Desconocido' && !email && !notes) {
            continue;
        }

        // Parse date
        let created_at = new Date().toISOString();
        if (item.ALTA) {
            const parts = item.ALTA.trim().split('/');
            if (parts.length === 3) {
                // dd/mm/yyyy
                created_at = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`).toISOString();
            }
        }

        // Check if exists
        let existing = [];
        if (email && email !== '') {
            const res = await supabase.from('leads').select('id').eq('email', email).limit(1);
            if (res.data) existing = res.data;
        }
        if (existing.length === 0 && phone && phone !== '') {
            const res = await supabase.from('leads').select('id').eq('phone', phone).limit(1);
            if (res.data) existing = res.data;
        }
        if (existing.length === 0 && name !== 'Desconocido') {
            const res = await supabase.from('leads').select('id').eq('name', name).limit(1);
            if (res.data) existing = res.data;
        }
        
        if (existing && existing.length > 0) {
            console.log(`Lead ya existe (saltando): ${name}`);
            continue;
        }

        const { error } = await supabase.from('leads').insert([{
            name,
            email: email || null,
            phone: phone || null,
            source,
            notes,
            status: 'new',
            created_at
        }]);

        if (error) {
            console.error(`Error insertando ${name}:`, error.message);
        } else {
            console.log(`✅ Lead insertado: ${name}`);
            count++;
        }
    }
    
    console.log(`Se insertaron ${count} nuevos leads.`);
}

run();
