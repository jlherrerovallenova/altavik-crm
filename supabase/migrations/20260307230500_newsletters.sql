-- Create the newsletters table
CREATE TABLE IF NOT EXISTS public.newsletters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    subject TEXT NOT NULL,
    design JSONB,
    html_content TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
    sent_at TIMESTAMP WITH TIME ZONE
);

-- RLS for newsletters
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their newsletters" ON public.newsletters
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert newsletters" ON public.newsletters
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their newsletters" ON public.newsletters
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete their newsletters" ON public.newsletters
    FOR DELETE USING (auth.role() = 'authenticated');

-- Add is_subscribed to leads if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='leads' AND column_name='is_subscribed') THEN
        ALTER TABLE public.leads ADD COLUMN is_subscribed BOOLEAN DEFAULT true;
    END IF;
END
$$;
