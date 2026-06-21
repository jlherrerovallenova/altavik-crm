-- =====================================================
-- MIGRACIÓN: Solución de Advertencias de Seguridad (Linter)
-- Fecha: 2026-06-21
-- =====================================================

-- 1. Aislamiento de la extensión pg_net
CREATE SCHEMA IF NOT EXISTS net;
DO $$
BEGIN
    ALTER EXTENSION pg_net SET SCHEMA net;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo mover pg_net (puede requerir privilegios de superusuario o no estar instalada)';
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

-- 4. Ajustar políticas de listado en buckets públicos de Storage para evitar listado público anónimo
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
