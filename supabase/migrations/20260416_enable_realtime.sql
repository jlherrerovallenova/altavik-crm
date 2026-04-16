
-- Habilitar el envío de cambios en tiempo real para las tablas principales
-- Esto permite que el frontend reciba notificaciones instantáneas

-- 1. Asegurarnos de que existe la publicación 'supabase_realtime'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- 2. Añadir las tablas a la publicación
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agenda;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incoming_emails;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
