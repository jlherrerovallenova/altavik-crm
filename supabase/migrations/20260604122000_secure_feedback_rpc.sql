-- Eliminar la política insegura
DROP POLICY IF EXISTS "Restricted public feedback update" ON public.leads;

-- Crear el procedimiento almacenado (RPC) seguro
CREATE OR REPLACE FUNCTION public.submit_lead_feedback(
    p_lead_id UUID,
    p_rating TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecutar con los privilegios del creador de la función (bypass RLS)
SET search_path = public
AS $$
BEGIN
    -- 1. Validar que el lead existe y cumple las condiciones (Feedback enviado, y no respondido aún)
    IF NOT EXISTS (
        SELECT 1 FROM public.leads 
        WHERE id = p_lead_id 
        AND feedback_sent = true 
        AND feedback_responded_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Feedback inválido, ya respondido o lead inexistente.';
    END IF;

    -- 2. Actualizar estrictamente solo las columnas permitidas
    UPDATE public.leads
    SET 
        feedback_rating = p_rating,
        feedback_responded_at = NOW()
    WHERE id = p_lead_id;
END;
$$;

-- Otorgar permisos de ejecución al rol anónimo (público)
REVOKE EXECUTE ON FUNCTION public.submit_lead_feedback(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_lead_feedback(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_lead_feedback(UUID, TEXT) TO authenticated;
