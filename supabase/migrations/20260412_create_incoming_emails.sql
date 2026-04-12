
-- Create incoming_emails table for the Smart Inbox
CREATE TABLE IF NOT EXISTS public.incoming_emails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    subject TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    body TEXT NOT NULL,
    date_received TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    is_processed BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL
);

-- Add sample data to start with (Real-looking data)
INSERT INTO public.incoming_emails (subject, sender_name, sender_email, body, date_received, tags)
VALUES 
(
    'Ref: 948271 - Interés en Ático de 3 habitaciones', 
    'Idealista.com', 
    'leads@idealista.com', 
    'Hola Altavik Residencial, hay un nuevo usuario interesado en su propiedad "Ático de lujo con vistas al mar (Ref: 948271)".\n\nDatos de contacto suministrados por el usuario:\nNombre: Rosina Martínez\nTeléfono: 600 123 456\nEmail: ro.martinez88@gmail.com\n\nMensaje adicional: "Hola, quería saber si este ático tiene plaza de garaje grande, mi coche es un SUV amplio. Me gustaría hacer una visita el viernes por la tarde si fuese posible. Cuento con capital ahorrado y me urge."',
    '2026-04-12T10:45:00Z',
    ARRAY['Idealista', 'Escaneable IA']
),
(
    'Nuevo contacto desde formulario Web', 
    'Web Corporativa', 
    'no-reply@altavik.com', 
    'Detalles del formulario:\n\nNombre: Francisco Javier\nTeléfono: 655998877\nConsulta: Quería información sobre las condiciones de financiación y si quedan bajos con jardín disponibles. Gracias.',
    '2026-04-12T09:15:00Z',
    ARRAY['Web', 'Escaneable IA']
);

-- Enable RLS
ALTER TABLE public.incoming_emails ENABLE ROW LEVEL SECURITY;

-- Create policy for all users (or authenticated)
CREATE POLICY "Allow all access to authenticated users" ON public.incoming_emails
    FOR ALL USING (auth.role() = 'authenticated');
