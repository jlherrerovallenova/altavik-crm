-- Habilitar extensiones necesarias si no lo están
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Programar la ejecución diaria a las 10:00 AM UTC
-- IMPORTANTE: Debes asegurarte de que la URL de la Edge Function es la correcta para tu proyecto en producción.
SELECT cron.schedule(
  'whatsapp-followup-daily-job', -- Nombre único de la tarea
  '0 10 * * *', -- Expresión Cron: Todos los días a las 10:00 AM
  $$
    SELECT net.http_post(
      url := 'https://oenaworwtrblkmjvwjfs.supabase.co/functions/v1/whatsapp-followup-cron',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);
