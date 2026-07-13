-- 1. Add the is_archived column to leads
alter table public.leads add column if not exists is_archived boolean default false;

-- 2. Drop the old delete policy for sub-users if it existed, and recreate it
drop policy if exists "Users delete assigned leads" on public.leads;

-- 3. Allow standard users to completely delete leads that they either created or are assigned to
create policy "Users delete assigned leads" on public.leads for delete 
using (assigned_to = auth.uid() or created_by = auth.uid());
