
-- 1. Eliminar las políticas ultra-permisivas que permitían acceso público (anon)
DROP POLICY IF EXISTS "Enable insert for all" ON public.incoming_emails;
DROP POLICY IF EXISTS "Enable select for all" ON public.incoming_emails;
DROP POLICY IF EXISTS "Enable update for all" ON public.incoming_emails;
DROP POLICY IF EXISTS "Enable delete for all" ON public.incoming_emails;
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.incoming_emails;

-- 2. Asegurarse de que RLS está activo
ALTER TABLE public.incoming_emails ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas restrictivas solo para usuarios AUTENTICADOS (el personal del CRM)
-- Nota: El script de sincronización usará la SERVICE_ROLE_KEY, por lo que saltará estas reglas automáticamente.

CREATE POLICY "Authenticated users can read emails" 
    ON public.incoming_emails 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update emails" 
    ON public.incoming_emails 
    FOR UPDATE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete emails" 
    ON public.incoming_emails 
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- No permitimos inserción desde el frontend para esta tabla, solo desde el script de sync (Service Role)
-- o si en el futuro se quiere permitir, se añadiría con check (auth.role() = 'authenticated')
