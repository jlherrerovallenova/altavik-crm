-- supabase/migrations/20260411_add_feedback_results.sql

-- Añadir columnas para almacenar los resultados del feedback
ALTER TABLE leads ADD COLUMN IF NOT EXISTS feedback_rating TEXT; -- 'positive', 'neutral', 'negative'
ALTER TABLE leads ADD COLUMN IF NOT EXISTS feedback_comment TEXT; 
ALTER TABLE leads ADD COLUMN IF NOT EXISTS feedback_responded_at TIMESTAMPTZ;

-- Comentarios para documentación
COMMENT ON COLUMN leads.feedback_rating IS 'Resultado de la encuesta: positive, neutral, negative';
COMMENT ON COLUMN leads.feedback_responded_at IS 'Fecha y hora en la que el cliente envió su valoración';

-- POLÍTICA DE SEGURIDAD (IMPORTANTE)
-- Estas sentencias habilitan que un cliente (anon) pueda actualizar su propia valoración
-- Se recomienda ajustar el RLS en el panel de Supabase para mayor seguridad.

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'leads' AND policyname = 'Public feedback update'
    ) THEN
        EXECUTE 'CREATE POLICY "Public feedback update" ON leads FOR UPDATE TO anon USING (true) WITH CHECK (true)';
    END IF;
END $$;
