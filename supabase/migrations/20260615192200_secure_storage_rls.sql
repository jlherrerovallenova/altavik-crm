-- MIGRACIÓN: Securizar Storage y Metadatos de Documentos de Venta (Fix IDOR)
-- Fecha: 2026-06-15

-- 1. Securizar la tabla `sale_documents` (Metadatos)
-- Solo permitimos UPDATE y DELETE al usuario que subió el documento (`uploaded_by`).

DROP POLICY IF EXISTS "Authenticated users can update sale_documents" ON public.sale_documents;
CREATE POLICY "Authenticated users can update sale_documents"
  ON public.sale_documents FOR UPDATE USING (auth.role() = 'authenticated' AND uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can delete sale_documents" ON public.sale_documents;
CREATE POLICY "Authenticated users can delete sale_documents"
  ON public.sale_documents FOR DELETE USING (auth.role() = 'authenticated' AND uploaded_by = auth.uid());


-- 2. Securizar el bucket de Storage (storage.objects)
-- Solo permitimos UPDATE y DELETE al dueño del archivo (`owner`).
-- Nota: En Supabase Storage, el campo `owner` se rellena automáticamente con el UUID del usuario autenticado al subir.

DROP POLICY IF EXISTS "Authenticated update sale-documents" ON storage.objects;
CREATE POLICY "Authenticated update sale-documents" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'sale-documents' AND owner = auth.uid());

DROP POLICY IF EXISTS "Authenticated delete sale-documents" ON storage.objects;
CREATE POLICY "Authenticated delete sale-documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'sale-documents' AND owner = auth.uid());
