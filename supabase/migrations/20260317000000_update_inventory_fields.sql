-- Migration: Update inventory schema to match new housing promotion requirements
-- Date: 2026-03-17

-- 1. Create temporary columns to avoid data loss during rename/migration if needed
ALTER TABLE inventory 
  ADD COLUMN IF NOT EXISTS n_orden TEXT,
  ADD COLUMN IF NOT EXISTS planta TEXT,
  ADD COLUMN IF NOT EXISTS portal TEXT,
  ADD COLUMN IF NOT EXISTS letra TEXT,
  ADD COLUMN IF NOT EXISTS orientacion TEXT,
  ADD COLUMN IF NOT EXISTS sup_terrazas NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS garaje TEXT,
  ADD COLUMN IF NOT EXISTS trastero TEXT;

-- 2. Migrate data from old columns to new columns if they have content
-- We assume numero_vivienda contains something like the order number or reference
UPDATE inventory SET n_orden = numero_vivienda WHERE n_orden IS NULL;

-- 3. Rename existing columns for consistency with the new requirements
-- Sup. Útil -> sup_util
-- Sup. Construida -> sup_construida
-- superficie_parcela -> sup_parcela
-- habitaciones -> dormitorios

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'habitaciones') THEN
    ALTER TABLE inventory RENAME COLUMN habitaciones TO dormitorios;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'superficie_util') THEN
    ALTER TABLE inventory RENAME COLUMN superficie_util TO sup_util;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'superficie_construida') THEN
    ALTER TABLE inventory RENAME COLUMN superficie_construida TO sup_construida;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'superficie_parcela') THEN
    ALTER TABLE inventory RENAME COLUMN superficie_parcela TO sup_parcela;
  END IF;
END $$;

-- 4. Delete columns that no longer correspond
ALTER TABLE inventory DROP COLUMN IF EXISTS modelo;
ALTER TABLE inventory DROP COLUMN IF EXISTS numero_vivienda;
