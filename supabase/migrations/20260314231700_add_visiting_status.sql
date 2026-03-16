-- Add 'visiting' status to leads table check constraint
ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE public.leads 
ADD CONSTRAINT leads_status_check 
CHECK (status IN ('new', 'contacted', 'qualified', 'visiting', 'proposal', 'negotiation', 'closed', 'lost'));

COMMENT ON COLUMN public.leads.status IS 'Flujo: new, contacted, qualified, visiting, proposal, negotiation, closed, lost';
