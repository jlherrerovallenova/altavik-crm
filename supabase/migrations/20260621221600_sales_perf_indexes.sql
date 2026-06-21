-- =====================================================
-- MIGRACIÓN: Índices de rendimiento para Módulo de Compra-Venta
-- Fecha: 2026-06-21
-- =====================================================

-- 1. Índices para mejorar velocidad de JOINs y cascadas de borrado
CREATE INDEX IF NOT EXISTS idx_sales_lead_id ON public.sales(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_property_id ON public.sales(property_id);
CREATE INDEX IF NOT EXISTS idx_installments_sale_id ON public.installments(sale_id);
CREATE INDEX IF NOT EXISTS idx_promoter_invoices_sale_id ON public.promoter_invoices(sale_id);
