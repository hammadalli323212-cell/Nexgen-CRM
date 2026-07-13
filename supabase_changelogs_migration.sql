-- Create change_logs table
CREATE TABLE IF NOT EXISTS public.change_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    operation TEXT NOT NULL,
    details TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.change_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins have full access to change logs" 
ON public.change_logs FOR ALL 
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "Users can insert change logs" 
ON public.change_logs FOR INSERT 
WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can view change logs for their leads" 
ON public.change_logs FOR SELECT 
USING ( 
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE leads.id = change_logs.lead_id 
        AND (leads.assigned_to = auth.uid() OR leads.created_by = auth.uid())
    )
);
