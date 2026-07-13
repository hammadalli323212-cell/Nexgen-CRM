-- Profiles table (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users(id) primary key,
  full_name text,
  email text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamp default now()
);

-- Enable RLS on profiles table
alter table profiles enable row level security;

-- Allow all authenticated users to read profiles (needed for AuthContext and Admin dropdowns)
create policy "Authenticated users can read profiles"
on profiles for select
using (auth.uid() is not null);

-- Add assignment columns to leads table
alter table leads add column assigned_to uuid references profiles(id);
alter table leads add column created_by uuid references profiles(id);

-- Enable RLS
alter table leads enable row level security;

-- SELECT: Admins see everything
create policy "Admins view all leads"
on leads for select
using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- SELECT: Users see only what's assigned to them
create policy "Users view assigned leads"
on leads for select
using (assigned_to = auth.uid());

-- INSERT: Any logged-in user can create a lead
create policy "Users can create leads"
on leads for insert
with check (auth.uid() is not null);

-- UPDATE: Admins can update anything
create policy "Admins update all leads"
on leads for update
using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- UPDATE: Users can update only leads assigned to them
create policy "Users update assigned leads"
on leads for update
using (assigned_to = auth.uid());
