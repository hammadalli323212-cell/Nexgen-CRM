-- Supabase RLS Policies Setup for NexGen Auto Transport CRM

-- 1. Enable Row Level Security (RLS) on all core tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create policies to allow authenticated users to perform all CRUD operations
-- (We assume that anyone logged into the CRM via Supabase Auth has full internal access)

CREATE POLICY "Allow authenticated full access on leads" ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on lead_vehicles" ON public.lead_vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on tasks" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on carriers" ON public.carriers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on profiles" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Storage Buckets RLS Policies (For the 'documents' bucket)

-- Drop existing public policy if it exists to replace with strict ones
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Allow public read access strictly to the /logos folder (so email clients can render the logo)
CREATE POLICY "Allow public read access to logos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'documents' AND position('logos/' in name) = 1);

-- Allow authenticated users full access to everything in the documents bucket (like BOLs, PDFs, etc.)
CREATE POLICY "Allow authenticated users full access to documents bucket" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');
