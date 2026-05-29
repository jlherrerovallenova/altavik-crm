-- Migration to add Interest and Client Quality sections to leads table

ALTER TABLE public.leads
ADD COLUMN interest_bedrooms text[] DEFAULT '{}'::text[],
ADD COLUMN interest_floor text[] DEFAULT '{}'::text[],
ADD COLUMN client_quality_rating integer CHECK (client_quality_rating >= 1 AND client_quality_rating <= 5);
