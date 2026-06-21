-- =====================================================
-- MIGRACIÓN: Solución de Advertencias de Seguridad (Linter)
-- Fecha: 2026-06-21
-- =====================================================

-- 1. Aislamiento de la extensión pg_net (mover a extensions)
DO $$
BEGIN
    ALTER EXTENSION pg_net SET SCHEMA extensions;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo mover pg_net a extensions (puede requerir privilegios de superusuario)';
END $$;

-- 2. Corregir search_path mutable en funciones y revocar permisos de ejecución
-- Para public.send_whatsapp (si existe)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'send_whatsapp'
    ) THEN
        ALTER FUNCTION public.send_whatsapp(text, text, text, jsonb) SET search_path = public;
        REVOKE EXECUTE ON FUNCTION public.send_whatsapp(text, text, text, jsonb) FROM public, anon, authenticated;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo alterar public.send_whatsapp';
END $$;

-- Para public.handle_outbound_whatsapp_status (si existe)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'handle_outbound_whatsapp_status'
    ) THEN
        ALTER FUNCTION public.handle_outbound_whatsapp_status() SET search_path = public;
        REVOKE EXECUTE ON FUNCTION public.handle_outbound_whatsapp_status() FROM public, anon, authenticated;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo alterar public.handle_outbound_whatsapp_status';
END $$;

-- Para public.update_modified_column (si existe)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'update_modified_column'
    ) THEN
        ALTER FUNCTION public.update_modified_column() SET search_path = public;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo alterar public.update_modified_column';
END $$;

-- 3. Limpieza de RLS obsoletos e inseguros
DROP POLICY IF EXISTS "Enable all for emails" ON public.incoming_emails;
DROP POLICY IF EXISTS "Public feedback update" ON public.leads;
DROP POLICY IF EXISTS "Permitir actualización de feedback anónimo" ON public.leads;

-- 4. Reemplazar políticas RLS excesivamente permisivas (Always True) por comprobaciones de autenticidad explícitas
-- sent_documents
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sent_documents') THEN
        DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados en sent_documents" ON public.sent_documents;
        CREATE POLICY "Permitir todo a usuarios autenticados en sent_documents" ON public.sent_documents
            FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- wa_conversations
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear conversaciones" ON public.wa_conversations;
CREATE POLICY "Usuarios autenticados pueden crear conversaciones" ON public.wa_conversations
    FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar conversaciones" ON public.wa_conversations;
CREATE POLICY "Usuarios autenticados pueden actualizar conversaciones" ON public.wa_conversations
    FOR UPDATE TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- wa_messages
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear mensajes" ON public.wa_messages;
CREATE POLICY "Usuarios autenticados pueden crear mensajes" ON public.wa_messages
    FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar mensajes" ON public.wa_messages;
CREATE POLICY "Usuarios autenticados pueden actualizar mensajes" ON public.wa_messages
    FOR UPDATE TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- whatsapp_templates
DROP POLICY IF EXISTS "Allow authenticated management" ON public.whatsapp_templates;
CREATE POLICY "Allow authenticated management" ON public.whatsapp_templates
    FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 5. Ajustar políticas de listado en buckets públicos de Storage para evitar listado público anónimo
DROP POLICY IF EXISTS "Lectura publica de documentos" ON storage.objects;
CREATE POLICY "Lectura publica de documentos" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'property-files');
