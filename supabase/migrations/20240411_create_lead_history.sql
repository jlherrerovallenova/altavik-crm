CREATE TABLE IF NOT EXISTS public.lead_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL, -- 'status_change', 'call', 'email', 'whatsapp', 'document', 'note', 'creation'
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Habilitar RLS
ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (lectura para autenticados)
CREATE POLICY \
Permitir
lectura
a
autenticados\ ON public.lead_history FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY \Permitir
inserción
a
autenticados\ ON public.lead_history FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

