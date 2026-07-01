-- supabase/migrations/20260701191500_add_survey_history.sql

CREATE OR REPLACE FUNCTION public.submit_lead_survey(
    p_lead_id UUID,
    p_survey_data JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rating_label TEXT;
    v_description TEXT;
BEGIN
    -- Verificar que la solicitud existe y se envió la encuesta
    IF NOT EXISTS (
        SELECT 1 FROM public.leads 
        WHERE id = p_lead_id 
        AND feedback_sent = true 
    ) THEN
        RAISE EXCEPTION 'Feedback inválido o lead inexistente.';
    END IF;

    -- Actualizar el lead con la respuesta
    UPDATE public.leads
    SET 
        survey_data = p_survey_data,
        feedback_responded_at = NOW(),
        feedback_rating = p_survey_data->>'pregunta_1'
    WHERE id = p_lead_id;

    -- Traducir el código de respuesta para la primera pregunta a una descripción amigable
    v_rating_label := CASE p_survey_data->>'pregunta_1'
        WHEN 'mas_info' THEN 'Me interesa, quiero más información.'
        WHEN 'pensarlo' THEN 'Me interesa, pero necesito tiempo para pensarlo.'
        WHEN 'no_encaja' THEN 'No encaja con lo que estoy buscando actualmente.'
        WHEN 'encontrado' THEN 'Ya he encontrado otra vivienda.'
        ELSE COALESCE(p_survey_data->>'pregunta_1', '')
    END;

    v_description := 'Encuesta de opinión respondida por el cliente. Valoración: ' || v_rating_label;

    -- Insertar el evento en el historial del lead (lead_history)
    INSERT INTO public.lead_history (lead_id, event_type, description, metadata)
    VALUES (
        p_lead_id,
        'feedback',
        v_description,
        p_survey_data
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_lead_survey(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_lead_survey(UUID, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_lead_survey(UUID, JSONB) TO authenticated;
