-- =====================================================
-- MIGRACIÓN: Módulo de Compra-Venta
-- Fecha: 2026-03-27
-- =====================================================

-- 1. Nuevos campos en la tabla leads (datos personales para contrato)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS dni TEXT,
  ADD COLUMN IF NOT EXISTS civil_status TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Española',
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS joint_buyer_name TEXT,
  ADD COLUMN IF NOT EXISTS joint_buyer_dni TEXT,
  ADD COLUMN IF NOT EXISTS joint_buyer_email TEXT,
  ADD COLUMN IF NOT EXISTS joint_buyer_phone TEXT,
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sale_status TEXT DEFAULT NULL;

-- 2. Tabla de ventas (expediente por operación)
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES inventory(id) ON DELETE RESTRICT,
  sale_status TEXT NOT NULL DEFAULT 'reserva'
    CHECK (sale_status IN ('reserva','contrato','mensualidades','escrituracion','completada')),
  sale_price NUMERIC(12,2) NOT NULL,
  iva_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  reservation_amount NUMERIC(12,2) NOT NULL DEFAULT 6000.00,
  reservation_date DATE,
  contract_date DATE,
  escritura_date DATE,
  notes TEXT
);

-- 3. Tabla de recibos mensuales (24 cuotas por venta)
CREATE TABLE IF NOT EXISTS installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL CHECK (installment_number BETWEEN 1 AND 24),
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_date DATE,
  UNIQUE (sale_id, installment_number)
);

-- 4. Habilitar RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS (acceso para usuarios autenticados)
CREATE POLICY "Authenticated users can read sales"
  ON sales FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert sales"
  ON sales FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update sales"
  ON sales FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read installments"
  ON installments FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert installments"
  ON installments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update installments"
  ON installments FOR UPDATE USING (auth.role() = 'authenticated');
