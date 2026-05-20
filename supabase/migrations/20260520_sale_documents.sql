-- MIGRACIÓN: Gestión de Documentos de Venta
-- Fecha: 2026-05-20

-- 1. Tabla de metadatos de documentos asociados a la venta
CREATE TABLE IF NOT EXISTS public.sale_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Ruta en el bucket de storage
  document_type TEXT NOT NULL CHECK (document_type IN ('reserva', 'contrato', 'banco', 'dni_comprador', 'dni_cotitular', 'otros')),
  file_size INT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 2. Habilitar RLS en la tabla de metadatos
ALTER TABLE public.sale_documents ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso para usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can read sale_documents" ON public.sale_documents;
CREATE POLICY "Authenticated users can read sale_documents"
  ON public.sale_documents FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert sale_documents" ON public.sale_documents;
CREATE POLICY "Authenticated users can insert sale_documents"
  ON public.sale_documents FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update sale_documents" ON public.sale_documents;
CREATE POLICY "Authenticated users can update sale_documents"
  ON public.sale_documents FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete sale_documents" ON public.sale_documents;
CREATE POLICY "Authenticated users can delete sale_documents"
  ON public.sale_documents FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Crear el bucket de almacenamiento de Supabase (Privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('sale-documents', 'sale-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Políticas de almacenamiento en el bucket para usuarios autenticados (directamente en storage.objects)
-- 5.1 SELECT (Lectura)
DROP POLICY IF EXISTS "Authenticated read sale-documents" ON storage.objects;
CREATE POLICY "Authenticated read sale-documents" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'sale-documents');

-- 5.2 INSERT (Subida)
DROP POLICY IF EXISTS "Authenticated upload sale-documents" ON storage.objects;
CREATE POLICY "Authenticated upload sale-documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sale-documents');

-- 5.3 UPDATE (Actualización/Sobrescritura)
DROP POLICY IF EXISTS "Authenticated update sale-documents" ON storage.objects;
CREATE POLICY "Authenticated update sale-documents" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'sale-documents');

-- 5.4 DELETE (Borrado)
DROP POLICY IF EXISTS "Authenticated delete sale-documents" ON storage.objects;
CREATE POLICY "Authenticated delete sale-documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'sale-documents');
