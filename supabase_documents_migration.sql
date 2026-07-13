-- 1. Create a new Storage Bucket for documents
-- Note: If this fails because the bucket already exists, that is fine.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read files in the documents bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'documents');

-- Allow authenticated users to insert files into the documents bucket
CREATE POLICY "Authenticated Users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- 2. Create lead_documents tracking table
CREATE TABLE IF NOT EXISTS public.lead_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on lead_documents
ALTER TABLE public.lead_documents ENABLE ROW LEVEL SECURITY;

-- Policies for lead_documents
CREATE POLICY "Admins have full access to lead_documents" 
ON public.lead_documents FOR ALL 
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "Users can insert lead_documents" 
ON public.lead_documents FOR INSERT 
WITH CHECK ( auth.uid() = uploaded_by );

CREATE POLICY "Users can view lead_documents for their leads" 
ON public.lead_documents FOR SELECT 
USING ( 
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE leads.id = lead_documents.lead_id 
        AND (leads.assigned_to = auth.uid() OR leads.created_by = auth.uid())
    )
);
