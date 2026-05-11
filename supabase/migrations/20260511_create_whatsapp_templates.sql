CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('system', 'marketing')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Policy for all authenticated users to read templates
CREATE POLICY "Allow authenticated read access" ON whatsapp_templates
  FOR SELECT TO authenticated USING (true);

-- Policy for authenticated users to manage templates
CREATE POLICY "Allow authenticated management" ON whatsapp_templates
  FOR ALL TO authenticated USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_templates;
