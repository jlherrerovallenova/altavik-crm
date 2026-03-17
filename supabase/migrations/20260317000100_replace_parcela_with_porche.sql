-- 20260317000100_replace_parcela_with_porche.sql

-- 1. Eliminar Sup. Parcela y Añadir Sup. Porche
ALTER TABLE inventory DROP COLUMN IF EXISTS sup_parcela;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sup_porche NUMERIC DEFAULT 0;

-- 2. Asegurar que estado_vivienda existe (por el error de cache que mencionas)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS estado_vivienda TEXT DEFAULT 'DISPONIBLE';

-- 3. Forzar recarga del esquema
NOTIFY pgrst, 'reload schema';
