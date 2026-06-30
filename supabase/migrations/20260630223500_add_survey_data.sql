ALTER TABLE public.leads ADD COLUMN survey_data JSONB DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.submit_lead_survey(
    p_lead_id UUID,
    p_survey_data JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.leads 
        WHERE id = p_lead_id 
        AND feedback_sent = true 
    ) THEN
        RAISE EXCEPTION 'Feedback inválido o lead inexistente.';
    END IF;

    UPDATE public.leads
    SET 
        survey_data = p_survey_data,
        feedback_responded_at = NOW(),
        feedback_rating = p_survey_data->>'pregunta_1'
    WHERE id = p_lead_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_lead_survey(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_lead_survey(UUID, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_lead_survey(UUID, JSONB) TO authenticated;
