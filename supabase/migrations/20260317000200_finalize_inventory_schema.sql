-- 20260317000200_finalize_inventory_schema.sql

-- 1. Eliminar columnas que ya no se usan
ALTER TABLE inventory DROP COLUMN IF EXISTS modelo;
ALTER TABLE inventory DROP COLUMN IF EXISTS numero_vivienda;

-- 2. Asegurar que todas las columnas nuevas existen (unificación rápida)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS n_orden TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS planta TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS portal TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS letra TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS orientacion TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sup_util NUMERIC DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sup_construida NUMERIC DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sup_terrazas NUMERIC DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sup_porche NUMERIC DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS garaje TEXT DEFAULT 'SÍ';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS trastero TEXT DEFAULT 'SÍ';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS estado_vivienda TEXT DEFAULT 'DISPONIBLE';

-- 3. Forzar REFRESH total del cache de Supabase
NOTIFY pgrst, 'reload schema';
