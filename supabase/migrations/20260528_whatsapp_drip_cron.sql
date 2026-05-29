-- Habilitar las extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Asegurar que los grants de cron estén configurados (puede variar según versión de Supabase)
-- GRANT USAGE ON SCHEMA cron TO postgres;

-- Programar la ejecución diaria a las 11:00 AM (hora del servidor/UTC)
SELECT cron.schedule(
  'whatsapp-drip-campaign',
  '0 11 * * *',
  $$
    SELECT net.http_post(
        url:='https://' || current_setting('request.jwt.aud') || '.supabase.co/functions/v1/wa-drip-campaign',
        headers:=jsonb_build_object('Authorization', 'Bearer ' || current_setting('request.jwt.secret')),
        body:='{}'::jsonb
    );
  $$
);
