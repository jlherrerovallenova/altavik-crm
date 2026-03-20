ALTER TABLE inventory ADD COLUMN IF NOT EXISTS ficha_url TEXT;

-- Create storage bucket for property files (fichas)
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-files', 'property-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the bucket
-- 1. Public read
INSERT INTO storage.policies (name, bucket_id, definition, action)
VALUES ('Public access to property files', 'property-files', '{"public":true}', 'SELECT')
ON CONFLICT DO NOTHING;

-- 2. Authenticated insert (Upload)
INSERT INTO storage.policies (name, bucket_id, definition, action)
VALUES ('Authenticated upload', 'property-files', '{"role":"authenticated"}', 'INSERT')
ON CONFLICT DO NOTHING;

-- 3. Authenticated update
INSERT INTO storage.policies (name, bucket_id, definition, action)
VALUES ('Authenticated update', 'property-files', '{"role":"authenticated"}', 'UPDATE')
ON CONFLICT DO NOTHING;
