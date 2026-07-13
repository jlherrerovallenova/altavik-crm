
-- Fix RLS for incoming_emails to allow the sync script (using anon key) to insert
-- and allow reading/updating for the UI
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.incoming_emails;

CREATE POLICY "Enable insert for all" ON public.incoming_emails
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable select for all" ON public.incoming_emails
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for all" ON public.incoming_emails
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable delete for all" ON public.incoming_emails
    FOR DELETE USING (auth.uid() IS NOT NULL);
