-- =====================================================
-- MIGRACIÓN: Facturación al Promotor (Comisión de Venta)
-- Fecha: 2026-06-20
-- =====================================================

-- 1. Añadir columna commission_percentage a la tabla sales
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 3.00;

-- 2. Crear tabla promoter_invoices
CREATE TABLE IF NOT EXISTS promoter_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  milestone TEXT NOT NULL CHECK (milestone IN ('reserva', 'contrato', 'escrituracion')),
  amount NUMERIC(12,2) NOT NULL,
  invoice_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'cancelled')),
  issued_date DATE,
  paid_date DATE,
  notes TEXT,
  UNIQUE (sale_id, milestone)
);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE promoter_invoices ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas de RLS para usuarios autenticados
CREATE POLICY "Authenticated users can read promoter_invoices"
  ON promoter_invoices FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert promoter_invoices"
  ON promoter_invoices FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update promoter_invoices"
  ON promoter_invoices FOR UPDATE USING (auth.role() = 'authenticated');
