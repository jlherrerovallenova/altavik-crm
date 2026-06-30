import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { extractLeadDataFromEmail } from '../services/geminiService';
import type { Session } from '@supabase/supabase-js';

export interface AutoImportResult {
  isImporting: boolean;
  importCount: number;
  error: string | null;
}

export function useAutoLeadImporter(session: Session | null): AutoImportResult {
  const [isImporting, setIsImporting] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Solo ejecutar si hay sesión y no se ha ejecutado ya en esta sesión del navegador
    if (!session || sessionStorage.getItem('auto_import_executed') === 'true') {
      return;
    }

    const runAutoImport = async () => {
      setIsImporting(true);
      setError(null);
      let importedCount = 0;

      try {
        // 1. Obtener correos pendientes que son scaneables por IA
        const { data: emails, error: emailError } = await (supabase as any)
          .from('incoming_emails')
          .select('*')
          .not('tags', 'cs', '{"Descartado"}')
          .contains('tags', ['Escaneable IA'])
          .eq('is_processed', false)
          .order('date_received', { ascending: true });

        if (emailError) throw emailError;

        if (emails && emails.length > 0) {
          console.log(`🪄 [Auto IA] Se detectaron ${emails.length} correos pendientes de importar. Iniciando proceso...`);

          const formatName = (name: string) => {
            if (!name || name === 'Desconocido') return name;
            return name
              .toLowerCase()
              .split(' ')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          };

          for (const email of emails) {
            try {
              // Llamar a Gemini para extraer los datos del correo
              const extracted = await extractLeadDataFromEmail(email.body, email.sender_name);

              const emailToCheck =
                extracted.email === 'No proporcionado' || !extracted.email
                  ? null
                  : extracted.email.trim();
              const phoneToCheck =
                extracted.phone === 'No proporcionado' || !extracted.phone
                  ? null
                  : extracted.phone.replace(/\s+/g, '');

              // Verificar si ya existe en la base de datos (evitar duplicados)
              let duplicateLead: { id: string; name: string } | null = null;
              const duplicateQueries: string[] = [];
              if (emailToCheck) duplicateQueries.push(`email.eq.${emailToCheck}`);
              if (phoneToCheck) duplicateQueries.push(`phone.eq.${phoneToCheck}`);

              if (duplicateQueries.length > 0) {
                const { data: duplicates } = await (supabase as any)
                  .from('leads')
                  .select('id, name')
                  .or(duplicateQueries.join(','));

                if (duplicates && duplicates.length > 0) {
                  duplicateLead = duplicates[0];
                }
              }

              if (duplicateLead) {
                console.log(`⚠️ [Auto IA] El contacto ya existe (${duplicateLead.name}). Vinculando correo...`);
                // Marcar como procesado y vincular al lead existente
                await (supabase as any)
                  .from('incoming_emails')
                  .update({
                    is_processed: true,
                    lead_id: duplicateLead.id,
                    tags: Array.from(new Set([...(email.tags || []), 'Procesado']))
                  })
                  .eq('id', email.id);
              } else {
                // Crear el lead
                const formattedName = formatName(extracted.name);
                const { data: newLead, error: insertError } = await (supabase as any)
                  .from('leads')
                  .insert([
                    {
                      name: formattedName,
                      email: emailToCheck,
                      phone: phoneToCheck,
                      source: extracted.source ? `${extracted.source} (Auto IA)` : 'Directo (Auto IA)',
                      notes: `[Importado Automáticamente al arrancar]\n\n${extracted.notes}`,
                      status: 'new',
                      created_at: email.date_received
                    }
                  ])
                  .select('id')
                  .single();

                if (insertError) throw insertError;

                if (newLead) {
                  console.log(`✅ [Auto IA] Lead creado con éxito: ${formattedName}`);
                  // Vincular correo y marcar como procesado
                  await (supabase as any)
                    .from('incoming_emails')
                    .update({
                      is_processed: true,
                      lead_id: newLead.id,
                      tags: Array.from(new Set([...(email.tags || []), 'Procesado']))
                    })
                    .eq('id', email.id);

                  importedCount++;
                }
              }
            } catch (err) {
              console.error(`❌ [Auto IA] Error procesando correo ${email.id}:`, err);
            }
          }
        }
      } catch (err) {
        console.error('❌ [Auto IA] Error crítico en el escaneo automático:', err);
        const errMsg = err instanceof Error ? err.message : 'Error en importación automática';
        setError(errMsg);
      } finally {
        setIsImporting(false);
        setImportCount(importedCount);
        // Registrar que ya se ha ejecutado el escaneo en esta sesión del navegador
        sessionStorage.setItem('auto_import_executed', 'true');
      }
    };

    runAutoImport();
  }, [session]);

  return { isImporting, importCount, error };
}
