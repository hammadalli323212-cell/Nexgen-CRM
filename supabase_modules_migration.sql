-- 1. Create carriers table
create table if not exists public.carriers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  mc_number text,
  insurance_status text default 'Pending',
  rating numeric(3,2),
  available_trucks integer,
  preferred_routes text,
  created_at timestamp with time zone default now()
);

alter table public.carriers enable row level security;
create policy "Users manage carriers" on public.carriers for all using (true); 

-- 2. Modify leads table to add new tracking columns
alter table public.leads add column if not exists carrier_id uuid references public.carriers(id);
alter table public.leads add column if not exists delivery_date date;

-- 3. Create tasks table for calendar reminders
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  title text not null,
  description text,
  due_date date,
  status text default 'Pending',
  lead_id uuid references public.leads(id),
  created_at timestamp with time zone default now()
);

alter table public.tasks enable row level security;
create policy "Users manage their own tasks" on public.tasks for all using (user_id = auth.uid());
