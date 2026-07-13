CREATE TABLE IF NOT EXISTS email_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'sent', -- sent, opened, clicked
    opens_count INTEGER DEFAULT 0,
    first_opened_at TIMESTAMPTZ,
    last_opened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage email tracking"
    ON email_tracking
    FOR ALL
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Habilitar Supabase Realtime para esta tabla
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- En caso de que ya estuviera en la publicación, capturar el error potencial
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.email_tracking;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Crear funcion RPC para incrementar el open
CREATE OR REPLACE FUNCTION increment_email_open(tracking_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE email_tracking
    SET 
        opens_count = opens_count + 1,
        status = 'opened',
        first_opened_at = COALESCE(first_opened_at, NOW()),
        last_opened_at = NOW()
    WHERE id = tracking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Añadir columna tracking_id a la tabla agenda para enlazar con email_tracking
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS tracking_id UUID REFERENCES email_tracking(id) ON DELETE SET NULL;
